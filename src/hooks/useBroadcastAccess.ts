import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getSupabaseClient } from '../services/data/supabaseClient';
import type { BroadcastSession, BroadcastViewer } from '../types/broadcast';

type BroadcastAccessStatus = 'idle' | 'loading' | 'connected' | 'error';

interface BroadcastAccessSession extends BroadcastSession {
  status?: 'pending' | 'live' | 'paused' | 'ended';
  current_viewer_count?: number;
  session_title?: string;
  started_at?: string;
}

interface CanJoinPayload {
  allowed: boolean;
  reason?: string;
  broadcast?: BroadcastAccessSession;
  max_viewers?: number;
}

interface UseBroadcastAccessResult {
  status: BroadcastAccessStatus;
  error?: string;
  reason?: string;
  session?: BroadcastAccessSession;
  viewer?: BroadcastViewer;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'djxu-anon-viewer-id';

const getOrCreateAnonId = (): string => {
  const makeId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  if (typeof window === 'undefined') {
    return makeId();
  }
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const generated = makeId();
  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
};

const reasonMap: Record<string, string> = {
  broadcast_not_found: 'Broadcast not found or private',
  broadcast_not_live: 'Broadcast is not live',
  viewer_limit_reached: 'Viewer limit reached',
};

export function useBroadcastAccess(token: string, translationLanguage?: string): UseBroadcastAccessResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const workerUrl = useMemo(() => (import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8787').replace(/\/$/, ''), []);
  const [status, setStatus] = useState<BroadcastAccessStatus>('idle');
  const [error, setError] = useState<string>();
  const [reason, setReason] = useState<string>();
  const [session, setSession] = useState<BroadcastAccessSession>();
  const [viewer, setViewer] = useState<BroadcastViewer>();
  const [viewerId, setViewerId] = useState<string | null>(null);

  const currentViewerId = useRef<string | null>(null);
  const viewerStartRef = useRef<number | null>(null);

  const cleanupViewer = useCallback(async () => {
    if (!currentViewerId.current) {
      return;
    }

    const duration =
      viewerStartRef.current != null ? Date.now() - viewerStartRef.current : 0;

    await supabase
      .from('broadcast_viewers')
      .update({
        left_at: new Date().toISOString(),
        total_duration_ms: duration,
      })
      .eq('id', currentViewerId.current);

    currentViewerId.current = null;
    viewerStartRef.current = null;
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus('idle');
      setError(undefined);
      setReason(undefined);
      setSession(undefined);
      setViewer(undefined);
      return;
    }

    await cleanupViewer();
    setViewer(undefined);
    setViewerId(null);

    setStatus('loading');
    setError(undefined);
    setReason(undefined);

    const anonId = getOrCreateAnonId();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;

    const { data, error: rpcError } = await supabase.rpc<CanJoinPayload>('can_join_broadcast', {
      token,
      viewer_user_id: userId,
      viewer_anon_id: anonId,
    });

    let broadcast = data?.broadcast;
    const shouldFallback = rpcError || !data || (data && !data.allowed && (data.reason === 'broadcast_not_found' || data.reason === 'broadcast_not_live'));
    if (shouldFallback) {
      // Fallback to worker status endpoint (uses service role)
      try {
        const resp = await fetch(`${workerUrl}/api/broadcast/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broadcastToken: token }),
        });
        if (resp.ok) {
          const workerBroadcast = await resp.json();
          if (workerBroadcast && (workerBroadcast.status === 'live' || workerBroadcast.status === 'paused')) {
            broadcast = workerBroadcast as unknown as BroadcastAccessSession;
          }
        }
      } catch {
        // ignore and fall through to error handling
      }
    }

    if (!broadcast) {
      setStatus('error');
      setError(rpcError ? 'Unable to validate broadcast token.' : undefined);
      setReason(!rpcError && data ? reasonMap[data?.reason ?? ''] ?? data?.reason : undefined);
      return;
    }

    if (!broadcast) {
      setStatus('error');
      setError('Broadcast metadata missing.');
      return;
    }

    // Normalize shape for viewer components: ensure `id` and `broadcast_token` fields exist
    const normalized = {
      ...broadcast,
      id: (broadcast as any).broadcast_id ?? (broadcast as any).id,
      broadcast_token: token,
    } as BroadcastAccessSession;

    setSession(normalized);

    const insertPayload = {
      broadcast_session_id: (normalized as any).broadcast_id ?? normalized.id,
      user_id: userId ?? undefined,
      anonymous_id: userId ? undefined : anonId,
      translation_language: translationLanguage,
    };

    const { data: viewerRecord, error: viewerError } = await supabase
      .from('broadcast_viewers')
      .insert(insertPayload)
      .select('*')
      .single();

    if (viewerError || !viewerRecord) {
      setStatus('error');
      setError('Unable to join broadcast');
      return;
    }

    currentViewerId.current = viewerRecord.id;
    viewerStartRef.current = Date.now();
    setViewerId(viewerRecord.id);
    setViewer(viewerRecord);

    setStatus('connected');
  }, [cleanupViewer, supabase, token, translationLanguage]);

  useEffect(() => {
    if (!viewerId) {
      return undefined;
    }

    const updateLastSeen = async () => {
      await supabase
        .from('broadcast_viewers')
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', viewerId);
    };

    void updateLastSeen();
    const interval = setInterval(() => {
      void updateLastSeen();
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [supabase, viewerId]);

  useEffect(() => {
    void refresh();

    return () => {
      void cleanupViewer();
    };
  }, [refresh, cleanupViewer]);

  return {
    status,
    error,
    reason,
    session,
    viewer,
    refresh,
  };
}

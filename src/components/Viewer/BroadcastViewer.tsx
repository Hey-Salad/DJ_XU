import { useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '../../services/data/supabaseClient';
import { translations, type SupportedLanguage } from '../../config/translations';
import { useLanguage } from '../../contexts/LanguageContext';
import CaptionDisplay from './CaptionDisplay';
import type {
  BroadcastViewer as ViewerRecord,
  LiveCaption,
  NowPlayingBroadcast,
} from '../../types/broadcast';

type SessionSnapshot = {
  id: string;
  broadcast_token: string;
  started_at?: string;
  status?: string;
  current_viewer_count?: number;
  viewer_count?: number;
};

interface BroadcastViewerBaseProps {
  session: SessionSnapshot;
  viewer?: ViewerRecord;
  status?: 'idle' | 'loading' | 'connected' | 'error';
  refresh?: () => Promise<void>;
}

const SUPPORTED_LANGUAGES = Object.keys(translations) as SupportedLanguage[];

const STATUS_BADGE: Record<string, string> = {
  connected: 'bg-red-600 text-white',
  loading: 'bg-yellow-400 text-black',
  error: 'bg-rose-500 text-white',
  idle: 'bg-gray-500 text-white',
};

export default function BroadcastViewer({
  session,
  viewer,
  status = 'idle',
  refresh,
}: BroadcastViewerBaseProps): JSX.Element {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [captions, setCaptions] = useState<LiveCaption[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingBroadcast | null>(null);
  const [viewerCount, setViewerCount] = useState(session.current_viewer_count ?? session.viewer_count ?? 0);
  const [copyFeedback, setCopyFeedback] = useState<string>();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (!session.id) {
      return undefined;
    }

    let isMounted = true;
    const loadCaptions = async () => {
      const { data } = await supabase
        .from('live_captions')
        .select('*')
        .eq('broadcast_session_id', session.id)
        .order('sequence_number', { ascending: true })
        .limit(90);
      if (!isMounted) return;
      if (data) {
        setCaptions(data as LiveCaption[]);
      }
    };
    void loadCaptions();
    return () => {
      isMounted = false;
    };
  }, [session.id, supabase]);

  useEffect(() => {
    if (!session.id) {
      return undefined;
    }

    const captionsChannel = supabase
      .channel(`live-captions-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_captions',
          filter: `broadcast_session_id=eq.${session.id}`,
        },
        (payload) => {
          const record = payload.new as LiveCaption;
          setCaptions((current) => [...current.slice(-80), record]);
        }
      )
      .subscribe();

    return () => {
      captionsChannel.unsubscribe();
      supabase.removeChannel(captionsChannel);
    };
  }, [session.id, supabase]);

  useEffect(() => {
    if (!session.id) {
      return undefined;
    }

    const viewerChannel = supabase
      .channel(`viewer-count-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcast_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setViewerCount((previous) => payload.new?.viewer_count ?? previous);
        }
      )
      .subscribe();

    return () => {
      viewerChannel.unsubscribe();
      supabase.removeChannel(viewerChannel);
    };
  }, [session.id, supabase]);

  useEffect(() => {
    if (!session.id) {
      return undefined;
    }

    const fetchNowPlaying = async () => {
      const { data } = await supabase
        .from('broadcast_tracks')
        .select('*')
        .eq('broadcast_session_id', session.id)
        .order('started_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const track = data[0];
        setNowPlaying({
          track_name: track.track_name,
          artist: track.artist,
          album: track.album ?? '',
          album_art_url: track.album_art_url ?? '',
          started_at: track.started_at,
        });
      }
    };
    void fetchNowPlaying();

    const trackChannel = supabase
      .channel(`broadcast-tracks-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcast_tracks',
          filter: `broadcast_session_id=eq.${session.id}`,
        },
        (payload) => {
          const track = payload.new as NowPlayingBroadcast;
          setNowPlaying({
            track_name: track.track_name,
            artist: track.artist,
            album: track.album,
            album_art_url: track.album_art_url,
            started_at: track.started_at,
          });
        }
      )
      .subscribe();

    return () => {
      trackChannel.unsubscribe();
      supabase.removeChannel(trackChannel);
    };
  }, [session.id, supabase]);

  const copyLink = async () => {
    if (!session.broadcast_token || typeof navigator === 'undefined') {
      return;
    }
    if (!navigator.clipboard) {
      setCopyFeedback('Clipboard unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(undefined), 2500);
    } catch {
      setCopyFeedback('Copy failed');
    }
  };

  const connectionLabel = useMemo(() => {
    switch (status) {
      case 'connected':
        return 'Live';
      case 'loading':
        return 'Connecting';
      case 'error':
        return 'Disconnected';
      default:
        return 'Idle';
    }
  }, [status]);

  const badgeClass = STATUS_BADGE[status] ?? STATUS_BADGE.idle;

  return (
    <section className="relative flex min-h-screen flex-col gap-6 overflow-hidden bg-white px-4 py-6 text-slate-900 md:px-10">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{(session as any).session_title ?? 'DJ XU Live'}</h1>
          <p className="text-sm text-slate-500">
            Live broadcast token <span className="font-mono text-slate-900">{session.broadcast_token}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[11px] ${badgeClass}`}>{connectionLabel}</span>
          <button
            type="button"
            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 transition hover:bg-slate-100"
            onClick={copyLink}
          >
            Share broadcast
          </button>
          {copyFeedback && (
            <span className="text-xs text-emerald-400">{copyFeedback}</span>
          )}
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Now playing</p>
              {nowPlaying ? (
                <>
                  <p className="text-lg font-semibold text-slate-900">{nowPlaying.track_name}</p>
                  <p className="text-sm text-slate-500">
                    {nowPlaying.artist} · {nowPlaying.album}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Waiting for track info...</p>
              )}
            </div>
            {nowPlaying?.album_art_url && (
              <img
                src={nowPlaying.album_art_url}
                alt={`Album art for ${nowPlaying.track_name}`}
                className="h-20 w-20 rounded-2xl object-cover"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-slate-500">Viewers</p>
              <span className="text-lg font-semibold text-slate-900">{viewerCount}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Live viewer count updates in real time.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-xs uppercase tracking-widest text-slate-500">
              Translation language (Chrome AI)
            </label>
            <select
              aria-label="Select translation language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Chrome can render translations inline when the browser translation panel is enabled.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-slate-500">Broadcast controls</p>
            <button
              type="button"
              className="text-xs text-slate-600 underline-offset-4 transition hover:text-slate-900"
              onClick={() => {
                refresh && refresh();
              }}
            >
              Refresh stream
            </button>
          </div>
          <p className="text-sm text-slate-600">
            Viewer session ID <span className="font-mono text-slate-900">{viewer?.id ?? 'pending'}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Connection quality indicator via Supabase realtime updates.
          </p>
        </div>
      </div>

      <CaptionDisplay
        captions={captions}
        sessionStart={session.started_at}
        translationLanguage={language}
      />
    </section>
  );
}

// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: broadcast
// Routes:
//  - POST   /start
//  - POST   /caption
//  - POST   /end
//  - POST   /status
//  - POST   /track

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

interface BroadcastStartRequest {
  performanceSessionId: string;
  maxViewers?: number;
  captionLanguage?: string;
  enableTranslations?: boolean;
  watchBaseUrl?: string;
  title?: string;
}

interface BroadcastCaptionRequest {
  broadcastToken: string;
  text: string;
  speaker?: 'DJ_XU' | 'USER' | 'SYSTEM';
  audioUrl?: string;
  detectedLanguage?: string;
  confidence?: number;
}

interface BroadcastTrackRequest {
  broadcastToken: string;
  track: {
    name: string;
    artist: string;
    album?: string;
    albumArtUrl?: string;
    id?: string;
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,content-type",
};

function json(body: Json, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...(init.headers ?? {}) },
  });
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function handleStart(payload: BroadcastStartRequest) {
  const supabase = getAdminClient();
  const {
    performanceSessionId,
    maxViewers = 10,
    captionLanguage = 'en',
    enableTranslations = true,
    watchBaseUrl,
    title,
  } = payload;

  const { data, error } = await supabase
    .from("broadcast_sessions")
    .insert({
      id: performanceSessionId,
      max_viewers: maxViewers,
      caption_language: captionLanguage,
      enable_translations: enableTranslations,
      status: 'live',
      started_at: new Date().toISOString(),
      metadata: title ? { title } : undefined,
    })
    .select("id,broadcast_token")
    .limit(1);

  if (error || !data || !data.length) {
    throw new Error(`Failed to create broadcast session: ${error?.message ?? 'no data'}`);
  }

  const broadcastToken = (data as any)[0].broadcast_token as string;
  const base = watchBaseUrl && watchBaseUrl.length
    ? watchBaseUrl
    : (Deno.env.get("WATCH_BASE_URL") ?? "http://localhost:5173");

  return json({
    broadcastId: performanceSessionId,
    broadcastToken,
    shareUrl: `${base.replace(/\/$/, '')}/watch/${broadcastToken}`,
  });
}

async function handleCaption(payload: BroadcastCaptionRequest) {
  const supabase = getAdminClient();
  const { broadcastToken, text, speaker = 'DJ_XU', audioUrl, detectedLanguage, confidence } = payload;

  const { data: sessions, error: sessionErr } = await supabase
    .from("broadcast_sessions")
    .select("id,status")
    .eq("broadcast_token", broadcastToken)
    .limit(1);
  if (sessionErr || !sessions || !sessions.length) throw new Error("Failed to validate broadcast token");
  if (sessions[0].status !== 'live') throw new Error("Broadcast is not active");
  const broadcastId = sessions[0].id as string;

  const { data: last, error: lastErr } = await supabase
    .from("live_captions")
    .select("sequence_number")
    .eq("broadcast_session_id", broadcastId)
    .order("sequence_number", { ascending: false })
    .limit(1);
  if (lastErr) throw new Error("Failed to fetch last caption");
  const sequenceNumber = last && last.length ? (last[0] as any).sequence_number + 1 : 1;

  const { data: inserted, error } = await supabase
    .from("live_captions")
    .insert({
      broadcast_session_id: broadcastId,
      sequence_number: sequenceNumber,
      speaker,
      original_text: text,
      detected_language: detectedLanguage,
      confidence,
      timestamp_ms: Date.now(),
      audio_url: audioUrl,
    })
    .select("id")
    .limit(1);

  if (error || !inserted || !inserted.length) throw new Error(`Failed to send caption: ${error?.message ?? 'no data'}`);
  return json({ success: true, captionId: (inserted as any)[0].id });
}

async function handleEnd(broadcastToken: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("broadcast_sessions")
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq("broadcast_token", broadcastToken);
  if (error) throw new Error("Failed to end broadcast");
  return json({ success: true });
}

async function handleStatus(broadcastToken: string) {
  const supabase = getAdminClient();
  const { data: rows, error } = await supabase
    .from("broadcast_sessions")
    .select("id,performance_session_id,is_private,max_viewers,viewer_count,caption_language,enable_translations,status,started_at,metadata")
    .eq("broadcast_token", broadcastToken)
    .limit(1);
  if (error) throw new Error("Failed to get broadcast status");
  if (!rows || !rows.length) return json({ error: 'Broadcast not found' }, { status: 404 });
  const bs: any = rows[0];
  return json({
    broadcast_id: bs.id,
    performance_session_id: bs.performance_session_id ?? bs.id,
    is_private: bs.is_private,
    max_viewers: bs.max_viewers,
    current_viewer_count: bs.viewer_count,
    caption_language: bs.caption_language,
    enable_translations: bs.enable_translations,
    status: bs.status,
    started_at: bs.started_at,
    session_title: bs.metadata?.title ?? null,
  });
}

async function handleTrack(payload: BroadcastTrackRequest) {
  const supabase = getAdminClient();
  const { broadcastToken, track } = payload;
  const { data: sessions, error: sessionErr } = await supabase
    .from("broadcast_sessions")
    .select("id,status")
    .eq("broadcast_token", broadcastToken)
    .limit(1);
  if (sessionErr || !sessions || !sessions.length) throw new Error("Failed to validate broadcast token");
  if (sessions[0].status !== 'live') throw new Error("Broadcast is not active");
  const broadcastId = sessions[0].id as string;

  const { data, error } = await supabase
    .from("broadcast_tracks")
    .insert({
      broadcast_session_id: broadcastId,
      track_name: track.name,
      artist: track.artist,
      album: track.album,
      album_art_url: track.albumArtUrl,
      source: 'spotify',
      source_track_id: track.id,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .limit(1);
  if (error || !data || !data.length) throw new Error("Failed to broadcast track");
  return json({ success: true, trackId: (data as any)[0].id });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/.*\/broadcast/, "");

    if (req.method === 'POST' && path === '/start') {
      const payload = (await req.json()) as BroadcastStartRequest;
      return await handleStart(payload);
    }
    if (req.method === 'POST' && path === '/caption') {
      const payload = (await req.json()) as BroadcastCaptionRequest;
      return await handleCaption(payload);
    }
    if (req.method === 'POST' && path === '/end') {
      const { broadcastToken } = (await req.json()) as { broadcastToken: string };
      return await handleEnd(broadcastToken);
    }
    if (req.method === 'POST' && path === '/status') {
      const { broadcastToken } = (await req.json()) as { broadcastToken: string };
      return await handleStatus(broadcastToken);
    }
    if (req.method === 'POST' && path === '/track') {
      const payload = (await req.json()) as BroadcastTrackRequest;
      return await handleTrack(payload);
    }

    return json({ error: 'Not Found' }, { status: 404 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: msg }, { status: 500 });
  }
}

serve(handler);

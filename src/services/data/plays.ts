import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

const TABLES = {
  sessions: 'performance_sessions',
  trackPlays: 'track_plays',
  crowdEvents: 'crowd_events',
  aiMessages: 'ai_messages',
} as const;

export interface PerformanceSession {
  id: string;
  title: string;
  status: 'draft' | 'live' | 'closed';
  venue_id: string | null;
  playlist_id: string | null;
  started_at: string;
  ended_at: string | null;
  context: Record<string, unknown>;
  summary: string | null;
}

export interface TrackPlayPayload {
  sessionId: string;
  playlistTrackId?: number;
  source: string;
  sourceTrackId: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  durationMs?: number;
  bpm?: number;
  energy?: number;
  crowdEnergy?: number;
  crowdSentiment?: string;
  requestedBy?: string;
  requestedVia?: string;
  metadata?: Record<string, unknown>;
  aiNotes?: string;
}

export interface CrowdEventPayload {
  sessionId: string;
  listenerDeviceId?: string;
  eventType: 'voice_command' | 'gesture' | 'chat' | 'reaction' | 'system';
  transcript?: string;
  sentiment?: string;
  payload?: Record<string, unknown>;
  createdBy?: string;
}

export interface AiMessagePayload {
  sessionId?: string;
  crowdEventId?: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: Record<string, unknown>;
  responseMs?: number;
}

export interface RagMatch {
  record_type: string;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

const formatError = (error: PostgrestSingleResponse<unknown>['error']) =>
  error ? `${error.message} – ${error.details ?? 'no details provided'}` : 'Unknown Supabase error';

export const fetchRecentSessions = async (limit = 5): Promise<PerformanceSession[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from<PerformanceSession>(TABLES.sessions)
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load sessions: ${formatError(error)}`);
  }

  return data ?? [];
};

export const logTrackPlay = async (payload: TrackPlayPayload) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLES.trackPlays)
    .insert({
      session_id: payload.sessionId,
      playlist_track_id: payload.playlistTrackId,
      source: payload.source,
      source_track_id: payload.sourceTrackId,
      title: payload.title,
      artist: payload.artist,
      album: payload.album,
      genre: payload.genre,
      duration_ms: payload.durationMs,
      bpm: payload.bpm,
      energy: payload.energy,
      crowd_energy: payload.crowdEnergy,
      crowd_sentiment: payload.crowdSentiment,
      requested_by: payload.requestedBy,
      requested_via: payload.requestedVia,
      metadata: payload.metadata ?? {},
      ai_notes: payload.aiNotes,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to log track play: ${formatError(error)}`);
  }

  return data;
};

export const recordCrowdEvent = async (payload: CrowdEventPayload) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLES.crowdEvents)
    .insert({
      session_id: payload.sessionId,
      listener_device_id: payload.listenerDeviceId,
      event_type: payload.eventType,
      transcript: payload.transcript,
      sentiment: payload.sentiment,
      payload: payload.payload ?? {},
      created_by: payload.createdBy,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to store crowd event: ${formatError(error)}`);
  }

  return data;
};

export const logAiMessage = async (payload: AiMessagePayload) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLES.aiMessages)
    .insert({
      session_id: payload.sessionId,
      crowd_event_id: payload.crowdEventId,
      role: payload.role,
      content: payload.content,
      metadata: payload.metadata ?? {},
      response_ms: payload.responseMs,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to log AI message: ${formatError(error)}`);
  }

  return data;
};

export interface RagSearchOptions {
  topK?: number;
  minScore?: number;
}

export const searchRagIndex = async (
  queryEmbedding: number[],
  { topK = 8, minScore = 0.5 }: RagSearchOptions = {}
): Promise<RagMatch[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc<RagMatch>('match_rag_index', {
    query_embedding: queryEmbedding,
    match_count: topK,
    match_threshold: minScore,
  });

  if (error) {
    throw new Error(`RAG search failed: ${formatError(error)}`);
  }

  return data ?? [];
};

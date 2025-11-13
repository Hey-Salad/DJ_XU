/**
 * Broadcast-related data contracts.
 */

export interface BroadcastSession {
  id: string;
  performance_session_id: string;
  broadcast_token: string;
  is_private: boolean;
  max_viewers: number;
  caption_language: string;
  enable_translations: boolean;
  created_at: string;
  viewer_count?: number;
  status?: 'pending' | 'live' | 'paused' | 'ended';
}

export interface LiveCaption {
  id: number;
  broadcast_session_id: string;
  sequence_number: number;
  speaker: 'DJ_XU' | 'USER';
  original_text: string;
  detected_language: string;
  confidence: number;
  timestamp_ms: number;
  created_at: string;
}

export interface BroadcastViewer {
  id: string;
  broadcast_session_id: string;
  user_id?: string;
  anonymous_id?: string;
  translation_language?: string;
  joined_at: string;
  last_seen_at: string;
}

export interface NowPlayingBroadcast {
  track_name: string;
  artist: string;
  album: string;
  album_art_url: string;
  started_at: string;
}

export interface StartBroadcastRequest {
  performanceSessionId: string;
  maxViewers?: number;
  captionLanguage?: string;
  enableTranslations?: boolean;
  /** Optional viewer base URL to construct share links (e.g. https://djxu.live). */
  watchBaseUrl?: string;
  /** Optional title/name for the broadcast to display to viewers. */
  title?: string;
}

export interface StartBroadcastResponse {
  broadcastId: string;
  broadcastToken: string;
  shareUrl: string;
}

export interface SendCaptionRequest {
  broadcastToken: string;
  text: string;
  speaker?: 'DJ_XU' | 'USER' | 'SYSTEM';
  audioUrl?: string;
  detectedLanguage?: string;
  confidence?: number;
}

export interface BroadcastInfo extends BroadcastSession {
  viewer_count?: number;
  started_at?: string;
  ended_at?: string;
}

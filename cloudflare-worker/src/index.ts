/**
 * Cloudflare Worker proxy for DeepSeek chat completions.
 * Accepts the front-end AIRequest shape and returns AIResponse.
 */

interface AIRequest {
  input: string;
  context?: {
    currentTrack?: string;
    conversationHistory?: string[];
    userPreferences?: Record<string, unknown>;
  };
}

interface AIResponse {
  content: string;
  metadata: {
    confidence?: number;
    source: 'deepseek';
    timestamp: number;
  };
}

interface Env {
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_API_BASE?: string;
  DEEPSEEK_MODEL?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  ELEVENLABS_MODEL?: string;
  ELEVENLABS_API_BASE?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  WATCH_BASE_URL?: string;
}

const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_BASE = 'https://api.deepseek.com';

const personaPrimer = `You are DJ XU, a charismatic British-Hong Kong AI DJ who keeps
the energy high, mixes Cantonese cultural references with global club
vibes, and offers concise but animated guidance to listeners. Lean into
music knowledge, highlight track transitions when the context provides a
current song, and keep things friendly and hype.`;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,authorization',
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

interface ChainedAIRequest extends AIRequest {
  voiceId?: string;
  voiceModel?: string;
  voiceSettings?: Record<string, unknown>;
}

interface ElevenLabsResponse {
  audioBase64: string;
  contentType: string;
}

interface BroadcastStartRequest {
  performanceSessionId: string;
  maxViewers?: number;
  captionLanguage?: string;
  enableTranslations?: boolean;
  watchBaseUrl?: string;
  title?: string;
}

interface BroadcastStartResponse {
  broadcastId: string;
  broadcastToken: string;
  shareUrl: string;
}

interface BroadcastCaptionRequest {
  broadcastToken: string;
  text: string;
  speaker?: 'DJ_XU' | 'USER' | 'SYSTEM';
  audioUrl?: string;
  detectedLanguage?: string;
  confidence?: number;
}

interface BroadcastStatusRequest {
  broadcastToken: string;
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

function buildMessages(request: AIRequest): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: personaPrimer },
    { role: 'user', content: request.input },
  ];

  if (request.context) {
    const contextParts: string[] = [];

    if (request.context.currentTrack) {
      contextParts.push(`Currently playing: ${request.context.currentTrack}`);
    }

    if (request.context.conversationHistory?.length) {
      contextParts.push(
        `Conversation history:\n${request.context.conversationHistory.join('\n')}`
      );
    }

    if (request.context.userPreferences) {
      contextParts.push(
        `User preferences: ${JSON.stringify(request.context.userPreferences)}`
      );
    }

    if (contextParts.length) {
      messages.push({
        role: 'system',
        content: contextParts.join('\n'),
      });
    }
  }

  return messages;
}

async function callDeepSeek(env: Env, request: AIRequest): Promise<AIResponse> {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const baseUrl = env.DEEPSEEK_API_BASE ?? DEFAULT_BASE;
  const model = env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      max_tokens: 800,
      messages: buildMessages(request),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `DeepSeek request failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    'I could not retrieve a response from DeepSeek.';

  return {
    content,
    metadata: {
      source: 'deepseek',
      timestamp: Date.now(),
      confidence: data?.choices?.[0]?.confidence,
    },
  };
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function callElevenLabs(
  env: Env,
  text: string,
  voiceId?: string,
  voiceModel?: string,
  voiceSettings?: Record<string, unknown>
): Promise<ElevenLabsResponse> {
  const baseUrl = env.ELEVENLABS_API_BASE ?? 'https://api.elevenlabs.io/v1';
  const apiKey = env.ELEVENLABS_API_KEY;
  const resolvedVoiceId = voiceId ?? env.ELEVENLABS_VOICE_ID;
  const resolvedModel = voiceModel ?? env.ELEVENLABS_MODEL ?? 'eleven_v3';

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required for text-to-speech.');
  }
  if (!resolvedVoiceId) {
    throw new Error('ELEVENLABS_VOICE_ID is required for text-to-speech.');
  }

  const response = await fetch(
    `${baseUrl}/text-to-speech/${resolvedVoiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model: resolvedModel,
        voice_settings: voiceSettings ?? {},
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ElevenLabs request failed (${response.status}): ${body.slice(0, 1024)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('Content-Type') ?? 'audio/mpeg';
  return {
    audioBase64: arrayBufferToBase64(arrayBuffer),
    contentType,
  };
}

async function startBroadcast(
  env: Env,
  request: BroadcastStartRequest
): Promise<BroadcastStartResponse> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase configuration is missing');
  }

  const { performanceSessionId, maxViewers = 10, captionLanguage = 'en', enableTranslations = true, watchBaseUrl, title } = request;

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/broadcast_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: performanceSessionId,
      max_viewers: maxViewers,
      caption_language: captionLanguage,
      enable_translations: enableTranslations,
      status: 'live',
      started_at: new Date().toISOString(),
      metadata: title ? { title } : undefined,
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create broadcast session: ${error}`);
  }

  const [data] = await response.json();
  const broadcastToken = data.broadcast_token;
  const base = (watchBaseUrl && watchBaseUrl.length > 0)
    ? watchBaseUrl
    : (env.WATCH_BASE_URL ?? 'http://localhost:5173');

  return {
    broadcastId: performanceSessionId,
    broadcastToken,
    shareUrl: `${base.replace(/\/$/, '')}/watch/${broadcastToken}`
  };
}

async function sendCaption(
  env: Env,
  request: BroadcastCaptionRequest
): Promise<{ success: boolean; captionId?: number }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase configuration is missing');
  }

  const { broadcastToken, text, speaker = 'DJ_XU', audioUrl, detectedLanguage, confidence } = request;

  const sessionResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_sessions?broadcast_token=eq.${broadcastToken}&select=id,status`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  if (!sessionResponse.ok) {
    throw new Error('Failed to validate broadcast token');
  }

  const sessions = await sessionResponse.json();
  if (!sessions.length || sessions[0].status !== 'live') {
    throw new Error('Broadcast is not active');
  }

  const broadcastId = sessions[0].id;

  const countResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/live_captions?broadcast_session_id=eq.${broadcastId}&select=sequence_number&order=sequence_number.desc&limit=1`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  const lastCaptions = await countResponse.json();
  const sequenceNumber = lastCaptions.length ? lastCaptions[0].sequence_number + 1 : 1;

  const captionResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/live_captions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      broadcast_session_id: broadcastId,
      sequence_number: sequenceNumber,
      speaker,
      original_text: text,
      detected_language: detectedLanguage,
      confidence,
      timestamp_ms: Date.now(),
      audio_url: audioUrl
    })
  });

  if (!captionResponse.ok) {
    const error = await captionResponse.text();
    throw new Error(`Failed to send caption: ${error}`);
  }

  const [caption] = await captionResponse.json();

  return {
    success: true,
    captionId: caption.id
  };
}

async function endBroadcast(
  env: Env,
  broadcastToken: string
): Promise<{ success: boolean }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase configuration is missing');
  }

  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_sessions?broadcast_token=eq.${broadcastToken}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to end broadcast');
  }

  return { success: true };
}

async function getBroadcastStatus(
  env: Env,
  broadcastToken: string
): Promise<any> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase configuration is missing');
  }

  // Query broadcast_sessions directly to avoid dependency on SQL functions
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_sessions?broadcast_token=eq.${broadcastToken}&select=id,performance_session_id,is_private,max_viewers,viewer_count,caption_language,enable_translations,status,started_at,metadata&limit=1`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get broadcast status');
  }

  const rows = await response.json();
  if (!rows.length) return null;
  const bs = rows[0];

  return {
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
  };
}

async function broadcastTrack(
  env: Env,
  request: BroadcastTrackRequest
): Promise<{ success: boolean; trackId?: number }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase configuration is missing');
  }

  const { broadcastToken, track } = request;

  // Get broadcast session
  const sessionResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_sessions?broadcast_token=eq.${broadcastToken}&select=id,status`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  if (!sessionResponse.ok) {
    throw new Error('Failed to validate broadcast token');
  }

  const sessions = await sessionResponse.json();
  if (!sessions.length || sessions[0].status !== 'live') {
    throw new Error('Broadcast is not active');
  }

  const broadcastId = sessions[0].id;

  // End previous track if exists
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_tracks?broadcast_session_id=eq.${broadcastId}&ended_at=is.null`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        ended_at: new Date().toISOString()
      })
    }
  );

  // Insert new track
  const trackResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/broadcast_tracks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      broadcast_session_id: broadcastId,
      track_name: track.name,
      artist: track.artist,
      album: track.album,
      album_art_url: track.albumArtUrl,
      source: 'spotify',
      source_track_id: track.id
    })
  });

  if (!trackResponse.ok) {
    const error = await trackResponse.text();
    throw new Error(`Failed to broadcast track: ${error}`);
  }

  const [trackData] = await trackResponse.json();

  return {
    success: true,
    trackId: trackData.id
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/deepseek') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        const payload = (await request.json()) as AIRequest;
        const aiResponse = await callDeepSeek(env, payload);
        return jsonResponse(aiResponse);
      } catch (error) {
        console.error('DeepSeek worker error:', error);
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === '/api/ai') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        const payload = (await request.json()) as ChainedAIRequest;
        const aiResponse = await callDeepSeek(env, payload);
        const ttsResponse = await callElevenLabs(
          env,
          aiResponse.content,
          payload.voiceId,
          payload.voiceModel,
          payload.voiceSettings
        );

        return jsonResponse({
          deepseek: aiResponse,
          audio: {
            base64: ttsResponse.audioBase64,
            contentType: ttsResponse.contentType,
          },
        });
      } catch (error) {
        console.error('Chained AI worker error:', error);
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === '/api/broadcast/start') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        const payload = (await request.json()) as BroadcastStartRequest;
        const result = await startBroadcast(env, payload);
        return jsonResponse(result);
      } catch (error) {
        console.error('Start broadcast error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === '/api/broadcast/caption') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        const payload = (await request.json()) as BroadcastCaptionRequest;
        const result = await sendCaption(env, payload);
        return jsonResponse(result);
      } catch (error) {
        console.error('Send caption error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === '/api/broadcast/end') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        const { broadcastToken } = (await request.json()) as { broadcastToken: string };
        const result = await endBroadcast(env, broadcastToken);
        return jsonResponse(result);
      } catch (error) {
        console.error('End broadcast error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === '/api/broadcast/status') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        const { broadcastToken } = (await request.json()) as BroadcastStatusRequest;
        const result = await getBroadcastStatus(env, broadcastToken);
        if (!result) {
          return jsonResponse({ error: 'Broadcast not found' }, { status: 404 });
        }
        return jsonResponse(result);
      } catch (error) {
        console.error('Get broadcast status error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === '/api/broadcast/track') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        const payload = (await request.json()) as BroadcastTrackRequest;
        const result = await broadcastTrack(env, payload);
        return jsonResponse(result);
      } catch (error) {
        console.error('Broadcast track error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: message }, { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};

# DJ Xu Broadcast Integration Guide

## Overview

This guide covers the newly integrated live broadcasting feature that allows DJs/creators to stream their sessions with real-time AI captions to unlimited viewers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ DJ Xu Broadcaster (React/Vite SPA)                          │
│ - Spotify playback                                           │
│ - AI commentary (DeepSeek + ElevenLabs)                     │
│ - Broadcast controls                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──► Cloudflare Worker (Proxy)
                 │    ├── /api/broadcast/start
                 │    ├── /api/broadcast/caption
                 │    ├── /api/broadcast/end
                 │    ├── /api/broadcast/status
                 │    └── /api/ai (existing)
                 │
                 └──► Supabase
                      ├── Database (broadcast sessions, captions, viewers)
                      └── Realtime (WebSocket pub/sub)

┌─────────────────────────────────────────────────────────────┐
│ Viewer Interface (To be implemented by OpenAI Codex)        │
│ - Watch at: /watch/{broadcast_token}                        │
│ - Live captions display                                     │
│ - Current track info                                        │
│ - Translation support                                       │
└─────────────────────────────────────────────────────────────┘
```

## What's Been Implemented

### 1. Database Schema (`supabase/migrations/20241112170000_add_broadcast_system.sql`)

**Tables:**
- `broadcast_sessions` - Tracks live broadcast sessions
- `live_captions` - Stores real-time captions with sequence numbers
- `broadcast_viewers` - Tracks who's watching
- `broadcast_tracks` - Tracks "Now Playing" info
- `broadcast_reactions` - Optional viewer engagement (emoji reactions)
- `broadcast_analytics` - Telemetry for each broadcast

**Key Features:**
- Automatic viewer count tracking via triggers
- RLS policies for secure access control
- Helper functions: `get_broadcast_by_token()`, `can_join_broadcast()`

### 2. Cloudflare Worker Endpoints (`cloudflare-worker/src/index.ts`)

**New Routes:**

#### `POST /api/broadcast/start`
Start a new broadcast session.

**Request:**
```json
{
  "performanceSessionId": "uuid",
  "maxViewers": 100,
  "captionLanguage": "en",
  "enableTranslations": true
}
```

**Response:**
```json
{
  "broadcastId": "uuid",
  "broadcastToken": "random-hex-token",
  "shareUrl": "https://your-domain.com/watch/token"
}
```

#### `POST /api/broadcast/caption`
Send a caption to the broadcast.

**Request:**
```json
{
  "broadcastToken": "token",
  "text": "Welcome to the show!",
  "speaker": "DJ_XU",
  "audioUrl": "https://...",
  "detectedLanguage": "en",
  "confidence": 0.95
}
```

#### `POST /api/broadcast/end`
End the broadcast session.

**Request:**
```json
{
  "broadcastToken": "token"
}
```

#### `POST /api/broadcast/status`
Get broadcast info by token (used by viewers).

**Request:**
```json
{
  "broadcastToken": "token"
}
```

### 3. Frontend Components

#### `src/services/broadcast/broadcastService.ts`
Client-side service for interacting with broadcast endpoints.

#### `src/hooks/useBroadcast.ts`
React hook for managing broadcast state and auto-caption sending.

#### `src/components/Broadcast/BroadcasterControls.tsx`
UI component with:
- "Go Live" button
- Share link with copy functionality
- QR code display for easy mobile sharing
- Viewer count
- "End Broadcast" button

#### `src/types/broadcast.d.ts`
TypeScript definitions for all broadcast-related types.

### 4. Integration into DJ Xu Component

The main `DjXu` component now:
- Initializes a `BroadcastService` instance
- Uses `useBroadcast` hook to manage broadcast state
- Automatically sends captions when AI responds during live broadcasts
- Displays broadcast controls when user is authorized

## What OpenAI Codex Should Implement

Based on the prompt provided at the start, OpenAI Codex should handle:

1. **ElevenLabs Scribe Integration** (`src/services/captions/scribeService.ts`)
   - Real-time speech-to-text for capturing DJ voice
   - WebSocket connection management
   - Transcription with timestamps

2. **Viewer Interface** (`src/components/Viewer/BroadcastViewer.tsx`)
   - Subscribe to Supabase realtime for captions
   - Display captions with animations
   - Show "Now Playing" track info
   - Viewer count display
   - Mobile-responsive design

3. **Broadcast Access Hook** (`src/hooks/useBroadcastAccess.ts`)
   - Token validation
   - Viewer limit checking
   - Heartbeat for active viewer tracking

4. **Caption Display Component** (`src/components/Viewer/CaptionDisplay.tsx`)
   - Scrolling captions with fade effects
   - Speaker identification
   - Translation overlay
   - Adjustable size/position

5. **Viewer Page** (`src/pages/WatchBroadcast.tsx`)
   - Route: `/watch/:token`
   - Error states (invalid token, ended, full)
   - Loading states

6. **Router Setup**
   - Add `/watch/:token` route to the app router

## Environment Variables

### Frontend (.env)
```bash
# Cloudflare Worker URL
VITE_WORKER_URL=http://localhost:8787  # or https://your-worker.workers.dev

# Supabase (for realtime subscriptions)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Cloudflare Worker (wrangler.toml secrets)
```bash
# Add these to your worker
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put ELEVENLABS_VOICE_ID
```

Or in `.dev.vars` for local development:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
DEEPSEEK_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

## Deployment Steps

### 1. Deploy Database Migration

```bash
# Apply migration to Supabase
npx supabase db push

# Or if using direct SQL
psql $DATABASE_URL -f supabase/migrations/20241112170000_add_broadcast_system.sql
```

### 2. Deploy Cloudflare Worker

```bash
cd cloudflare-worker

# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY

# Deploy
wrangler deploy
```

### 3. Update Frontend Environment

```bash
# Update .env with worker URL
echo "VITE_WORKER_URL=https://your-worker.workers.dev" >> .env

# Build and deploy
npm run build
firebase deploy  # or your hosting provider
```

### 4. Enable Supabase Realtime

In Supabase dashboard:
1. Go to Database → Replication
2. Enable realtime for these tables:
   - `broadcast_sessions`
   - `live_captions`
   - `broadcast_tracks`
   - `broadcast_viewers`

## Testing Locally

### Terminal 1: Cloudflare Worker
```bash
cd cloudflare-worker
wrangler dev --port 8787
```

### Terminal 2: Vite Dev Server
```bash
npm run dev
```

### Terminal 3: Test the Flow
```bash
# 1. Start a broadcast (via UI or curl)
curl -X POST http://localhost:8787/api/broadcast/start \
  -H "Content-Type: application/json" \
  -d '{
    "performanceSessionId": "test-session-123",
    "maxViewers": 10
  }'

# Response includes shareUrl like: http://localhost:5173/watch/abc123def456

# 2. Send a test caption
curl -X POST http://localhost:8787/api/broadcast/caption \
  -H "Content-Type: application/json" \
  -d '{
    "broadcastToken": "abc123def456",
    "text": "Testing captions!",
    "speaker": "DJ_XU"
  }'

# 3. Check status
curl -X POST http://localhost:8787/api/broadcast/status \
  -H "Content-Type: application/json" \
  -d '{"broadcastToken": "abc123def456"}'
```

## Usage Flow

### For Broadcasters (DJ/Creator)

1. **Start DJ Session**
   - Log in with Spotify
   - Spotify playback starts

2. **Go Live**
   - Click "Go Live" button in broadcast controls
   - System creates broadcast session
   - Share link and QR code appear

3. **Share with Audience**
   - Copy share link
   - Post on social media
   - Display QR code at venue

4. **AI Captions Auto-Send**
   - When DJ XU speaks (AI commentary), captions automatically broadcast
   - Voice commands also captured (if enabled)

5. **End Broadcast**
   - Click "End Broadcast" when done
   - Session marked as ended
   - Viewers disconnected gracefully

### For Viewers (Audience)

1. **Access Broadcast**
   - Click share link or scan QR code
   - Lands on `/watch/{token}`

2. **View Live**
   - See live captions scrolling
   - Current track info with album art
   - Optional: select translation language

3. **Optional Interaction**
   - Send emoji reactions
   - See viewer count

## Monetization Integration

The schema is ready for subscription tiers:

```sql
-- Link broadcasts to subscriptions
ALTER TABLE broadcast_sessions
ADD COLUMN subscription_tier text DEFAULT 'free';

-- Enforce limits via RLS or application logic
CREATE POLICY "Free tier max 10 viewers"
ON broadcast_sessions
FOR INSERT
WITH CHECK (
  subscription_tier = 'free' AND max_viewers <= 10
);
```

Tiers could be:
- **Free**: 10 viewers, 60min sessions
- **Creator**: 100 viewers, unlimited time
- **Business**: 500 viewers, white-label, analytics

## Troubleshooting

### "Broadcast not found" error
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in worker
- Verify migration was applied
- Check RLS policies allow anonymous reads on `broadcast_sessions`

### Captions not appearing
- Verify Supabase realtime is enabled for `live_captions`
- Check browser console for WebSocket errors
- Ensure viewer page subscribes to correct channel

### Worker 500 errors
- Check worker logs: `wrangler tail`
- Verify all secrets are set
- Check CORS headers allow your frontend origin

## Next Steps

1. **Implement Viewer Interface** (OpenAI Codex task)
2. **Add ElevenLabs Scribe Integration** (optional, for capturing DJ voice)
3. **Subscription System** (Stripe integration)
4. **Analytics Dashboard** (view broadcast stats)
5. **Recording/VOD** (save broadcasts for replay)
6. **Advanced Features:**
   - Multi-camera support
   - Collaborative DJing
   - Crowd requests via viewer interface
   - Sentiment analysis of reactions

## API Reference

See `src/types/broadcast.d.ts` for complete TypeScript definitions.

## Support

For issues or questions:
- Check Supabase logs: Dashboard → Logs
- Check worker logs: `wrangler tail`
- Frontend errors: Browser console

---

Generated for DJ Xu broadcast integration - November 2024

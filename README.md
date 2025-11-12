# DJ XU – AI DJ with Live Broadcasting

DJ XU is an AI-assisted DJ experience that blends Spotify playback, ElevenLabs
voice, bilingual UI, and **live broadcasting with real-time captions**. This repository
includes a Cloudflare Worker that proxies DeepSeek and manages broadcast sessions,
keeping everything secure and low-latency at the edge.

## ✨ NEW: Live Broadcasting Feature

DJ XU now supports **live streaming** with:
- 🎙️ Real-time AI-generated captions
- 📱 Shareable links + QR codes
- 👥 Live viewer count
- 🎵 "Now Playing" track broadcasting
- 🌍 Multi-language translation support
- 📊 Viewer analytics & tracking

**Perfect for:** Restaurants, clubs, content creators, live events

See [BROADCAST_INTEGRATION.md](./BROADCAST_INTEGRATION.md) for full setup guide.

## Project Layout

```
├── src/                        # React + Vite front-end
│   ├── components/
│   │   ├── DjXu/              # Core DJ UI (player, voice, AI)
│   │   ├── Broadcast/         # 🆕 Broadcaster controls, error handling
│   │   └── Viewer/            # 🆕 Live viewer interface
│   ├── services/
│   │   ├── ai/                # DeepSeek client
│   │   ├── broadcast/         # 🆕 Broadcast API client
│   │   └── captions/          # 🆕 ElevenLabs Scribe integration
│   ├── hooks/
│   │   ├── useVertexAI.ts     # AI hook using DeepSeek
│   │   ├── useBroadcast.ts    # 🆕 Broadcaster state management
│   │   └── useBroadcastAccess.ts # 🆕 Viewer access & heartbeat
│   ├── pages/
│   │   └── WatchBroadcast.tsx # 🆕 Viewer page (/watch/:token)
│   └── types/
│       └── broadcast.d.ts     # 🆕 TypeScript broadcast types
├── cloudflare-worker/          # Cloudflare Worker (edge proxy)
│   ├── src/index.ts           # DeepSeek + Broadcast API routes
│   └── wrangler.toml          # Worker deployment config
├── supabase/
│   ├── migrations/            # Database schema
│   │   ├── 20241109190000_create_music_schema.sql
│   │   ├── 20241112160000_add_play_telemetry_rag.sql
│   │   ├── 20241112170000_add_broadcast_system.sql      # 🆕
│   │   └── 20241112180000_enable_broadcast_realtime.sql # 🆕
│   └── seed/                  # Seed data
└── scripts/
    ├── test-broadcast-flow.sh # 🆕 E2E broadcast test
    └── test-broadcast-flow.ts # 🆕 TypeScript test script
```

## Environment Variables

The front-end expects the usual Spotify/ElevenLabs/Firebase variables plus the
new AI proxy endpoint:

```
VITE_AI_PROXY_URL=/api/deepseek          # default path served by the Worker
```

Copy `.env.example` to `.env`, fill in your real secrets, and never commit the
live `.env` file — we keep `.env.example` in the repo so contributors can see
which variables are required.

The Worker itself needs the DeepSeek credentials (configure with `wrangler
secret put`):

```
DEEPSEEK_API_KEY=<secret>
DEEPSEEK_MODEL=deepseek-chat             # optional override
DEEPSEEK_API_BASE=https://api.deepseek.com
```

## Running Locally

1. **Install root dependencies**
   ```bash
   npm install
   ```

2. **Install Worker dependencies**
   ```bash
   cd cloudflare-worker
   npm install
   ```

3. **Start the Worker**
   ```bash
   npm run dev
   ```
   Wrangler will serve the proxy at `http://127.0.0.1:8787/api/deepseek`.
   Update `VITE_AI_PROXY_URL` (or `.env`) to point to that URL for local dev.

4. **Start Vite**
   ```bash
   npm run dev
   ```

## Deployment

1. **Deploy the Worker**
   ```bash
   cd cloudflare-worker
   npm run deploy
   ```
   Configure a route such as `djxu.yourdomain.com/api/deepseek` so the SPA can
   make same-origin requests in production.

2. **Deploy the front-end**
- Build: `npm run build`
- Upload `dist/` to your hosting provider (Firebase Hosting, Cloudflare
  Pages, etc.)
- Ensure `VITE_AI_PROXY_URL` points at the Worker route in production.

## Cloudflare Worker + Pages hosting

1. **Prepare the Worker**
   - Set the DeepSeek secrets so the edge proxy can call the API:
     ```bash
     cd cloudflare-worker
     npx wrangler secret put DEEPSEEK_API_KEY
     npx wrangler secret put DEEPSEEK_API_BASE     # if you need a non-default URL
     npx wrangler secret put DEEPSEEK_MODEL        # optional override, e.g. `deepseek-chat`
     ```
   - Set the ElevenLabs secrets so the worker can generate voice from DeepSeek output:
     ```bash
     npx wrangler secret put ELEVENLABS_API_KEY
     npx wrangler secret put ELEVENLABS_VOICE_ID
     npx wrangler secret put ELEVENLABS_MODEL      # optional, defaults to `eleven_v3`
     npx wrangler secret put ELEVENLABS_API_BASE   # optional (useful for private endpoints)
     ```
   - Leave `[workers.dev` or your custom domain route ready in `wrangler.toml`.

2. **Deploy the Worker**
   ```bash
   cd cloudflare-worker
   npm run deploy
   ```
   - Configure a worker route like `https://djxu.yourdomain.com/api/deepseek`.
   - Add an additional route for the new AI flow, e.g. `https://djxu.yourdomain.com/api/ai`, which returns both DeepSeek text and ElevenLabs base64 audio.
   - Make sure CORS is open for the SPA host by keeping the `/api/deepseek`
     path on the same origin as your Pages build.

3. **Deploy to Cloudflare Pages**
   ```bash
   npx wrangler pages project create dj-xu --production-branch main
   npx wrangler pages deploy dist --project-name dj-xu
   ```
   - Add a Pages environment variable `VITE_AI_PROXY_URL=https://djxu.yourdomain.com/api/deepseek`.
   - Also set `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (or the `.env` values)
     inside Pages for both preview and production.
   - Configure a Worker route or Pages Worker route so `/api/deepseek/*` goes to the
     DeepSeek worker.

4. **Verify**
   - Hit `POST https://<your-pages-host>/api/ai` with `{ input: 'DJ warmup...' }` to ensure the worker returns the DeepSeek reply plus base64 ElevenLabs audio.
   - Use the Supabase SQL editor via the dashboard to confirm the schema exists,
     then re-run `node scripts/test-supabase-connection.js` to ensure the hosted
     DB responds as expected.

## Supabase Dataset & CLI

We ship a local-first Supabase setup that models accounts, venues, devices,
playlists, and richly tagged “musical value” profiles so DJs can blend cultural
context (e.g., `dim-sum-disco`, `skyline-amapiano`, `bass-rituals`) with device
automation.

- Schema lives in `supabase/migrations/20241109190000_create_music_schema.sql`
  (users, venues, devices, playlists, tracks, attribute profiles, preferences).
- Sample data is under `supabase/seed/seed_data.sql` and includes curated genres,
  venues in Hong Kong/London, device capabilities, and cross-cultural playlists.

### Running Supabase locally

The Supabase CLI is already part of the dev dependencies, so you can run it via
`npx`:

```bash
# Start the Supabase stack (Postgres, Studio, etc.)
npx supabase start

# Reset the database, run migrations, and seed sample data
npx supabase db reset --seed
```

To push schema changes directly to your hosted Supabase project without using
the browser, authenticate once and then run push commands:

```bash
npx supabase login                      # opens a browser to grab an access token
npx supabase link --project-ref <ref>   # e.g. ybecdgbzgldafwvzwkpd
npx supabase db push                    # executes migrations on the remote db
```

You can inspect or edit the data locally via Supabase Studio at
`http://localhost:54323` after running `npx supabase start`.

### Telemetry + RAG schema

Migration `20241112160000_add_play_telemetry_rag.sql` layers a telemetry and RAG
capability on top of the base music schema:

- `performance_sessions` – captures every set with contextual JSON (weather,
  theme, livestream info) plus an optional summary embedding.
- `track_plays` – immutable log of what actually played, who/what requested it,
  crowd response, transition techniques, and a `rag_embedding` column ready for
  pgvector search.
- `crowd_events` – voice commands, gestures, chat reactions, and device-level
  telemetry tied to each session.
- `ai_messages` – every AI instruction/response stored with latency metrics so
  you can replay decisions.
- `rag_documents` + `rag_chunks` – authored guides or cultural notes that you
  want to mix into retrieval alongside live telemetry.
- `rag_unified_index` view + `match_rag_index(query_embedding, match_count,
  match_threshold)` RPC – a single endpoint the app can hit to grab the most
  relevant snippets across plays, crowd events, AI messages, and curated docs.

The seed file now creates two example sessions, track plays, crowd events, AI
messages, and document chunks so Studio has realistic data to explore.

### Using Supabase from the app

`src/services/data/supabaseClient.ts` instantiates the browser client (requires
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`). Helpers in
`src/services/data/plays.ts` show how to:

1. Fetch recent sessions: `fetchRecentSessions()`
2. Log a track play: `logTrackPlay(payload)`
3. Store crowd/voice events and AI messages for observability
4. Run RAG lookups by calling the `match_rag_index` RPC with a query embedding

You can reuse these utilities inside hooks/components to keep telemetry flowing
to Supabase whenever Spotify or the AI agent acts.

### Hydrating embeddings for RAG

1. Generate embeddings for text you care about (track notes, transcripts,
   `rag_chunks`, etc.) via your preferred provider (DeepSeek, Gemini, OpenAI,
   Hugging Face) and keep the raw float array.
2. Upsert that embedding back into Supabase:
   ```bash
   npx supabase db remote commit  # optional, ensures schema is current
   ```
   ```sql
   update public.track_plays
     set rag_embedding = '[0.12, 0.03, ...]'::vector(1536)
   where id = <play_id>;
   ```
   or call the REST endpoint:
   ```bash
   curl -X PATCH "$SUPABASE_URL/rest/v1/track_plays?id=eq.<id>" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"rag_embedding":[0.12,0.03,...]}'
   ```
3. Query the retriever from the app:
   ```ts
   const matches = await searchRagIndex(embedding, { topK: 5, minScore: 0.55 });
   ```
4. Use the resulting snippets (`record_type`, `metadata`, `content`) as context
   when you call DeepSeek/Gemini via the Worker.

### Direct Supabase sign-up/login

If you’d prefer email/password accounts in addition to Spotify, visit `/auth`
after starting the SPA. That route uses the Supabase browser client to sign users
up or in, stores an optional `display_name` in the Auth metadata, and keeps the
door open for connecting Spotify later. It’s a quick way to populate
`public.app_users`/`public.user_profiles` before you add subscription, billing, or
organizational rules.

Once embeddings exist, the `rag_unified_index` view powers vector search purely
inside Postgres so you do not need an external vector store.

## Deploying to Cloudflare Pages

1. **Build the SPA**
   ```bash
   npm run build
   ```
   The output lands in `dist/`.

2. **Create a Pages project (one-time)**
   ```bash
   npx wrangler pages project create dj-xu --production-branch main
   ```
   Answer the prompts, then map your custom domain if desired.

3. **Deploy the latest build**
   ```bash
   npx wrangler pages deploy dist --project-name dj-xu
   ```

4. **Configure environment variables in Pages**
   - `VITE_SPOTIFY_*`, `VITE_11LABS_*`, `VITE_AI_PROXY_URL`, Firebase config,
     and the new `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
   - For preview environments you can set lightweight keys or point to a staging
     Supabase project.

5. **Wire the DeepSeek Worker**
   - Deploy the Worker with `npm run deploy` inside `cloudflare-worker/`.
   - In Pages, add a “Worker Route” (e.g. `/api/deepseek/*`) that forwards to the
     deployed Worker so the SPA keeps using `/api/deepseek`.

6. **Verify end-to-end**
   - Visit the preview URL, finish Spotify auth, and trigger a few commands.
   - Check Supabase Studio to confirm `track_plays`, `crowd_events`, and
     `ai_messages` are filling and that `match_rag_index` returns matches.

## How the Proxy Works

1. The browser invokes `useVertexAI().processInput()` with the user transcript.
2. The hook uses `DeepSeekService` (`src/services/ai/deepseek.ts`) to POST the
   payload to the Worker endpoint instead of directly to DeepSeek.
3. The Worker (`cloudflare-worker/src/index.ts`) injects the DJ persona prompt,
   forwards the call to DeepSeek’s `/v1/chat/completions`, and returns a clean
   `AIResponse` object.
4. Components such as `AIResponseHandler` can use that response to narrate
   playback or feed ElevenLabs for synthesized speech.

This shape keeps the DeepSeek API key off the client, allows future retrieval or
tooling inside the Worker, and sets us up to integrate Supabase/Cloudflare
Vectorize for RAG without changing the browser contract.

# DJ XU Cloudflare Deployment Guide

## Quick Summary

Your code is now on GitHub at: https://github.com/Hey-Salad/DJ_XU/tree/djxu-setup

You need to deploy TWO things:
1. **Frontend (Cloudflare Pages)** - Your React app
2. **Backend (Cloudflare Worker)** - Your DeepSeek/ElevenLabs proxy

---

## Part 1: Deploy Frontend to Cloudflare Pages

### Step 1: Connect GitHub Repository

1. Go to https://dash.cloudflare.com
2. Navigate to **Workers & Pages**
3. Click on your existing **dj-xu** project (or create new)
4. Go to **Settings** > **Builds & deployments**
5. Connect to Git: Select `Hey-Salad/DJ_XU` repository
6. Choose branch: `djxu-setup`

### Step 2: Configure Build Settings

```
Framework preset: None (or Vite)
Build command: npm run build
Build output directory: dist
Root directory: (leave empty)
Node version: 18 or higher
```

### Step 3: Add Environment Variables

In **Settings** > **Environment variables**, add these for **Production**:

#### Spotify Configuration
```
VITE_SPOTIFY_CLIENT_ID=<your-spotify-client-id>
VITE_SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
VITE_SPOTIFY_REDIRECT_URI=https://djxu.live/callback
```

#### ElevenLabs Configuration
```
VITE_11LABS_AGENT_ID=<your-11labs-agent-id>
VITE_11LABS_API_KEY=<your-11labs-api-key>
```

#### Firebase Configuration
```
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
VITE_FIREBASE_MEASUREMENT_ID=<your-measurement-id>
```

#### Supabase Configuration
```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

#### Worker Configuration
```
VITE_AI_PROXY_URL=https://dj-xu-deepseek.<your-subdomain>.workers.dev/api/deepseek
VITE_WORKER_URL=https://dj-xu-deepseek.<your-subdomain>.workers.dev
```

---

## Part 2: Deploy Cloudflare Worker (Backend)

### Option A: Deploy via Dashboard

1. Go to **Workers & Pages** > **Create Application** > **Create Worker**
2. Name it: `dj-xu-deepseek`
3. Click **Edit Code**
4. Copy ALL the code from `cloudflare-worker/src/index.ts`
5. Paste it into the worker editor
6. Click **Save and Deploy**

### Option B: Deploy via CLI (if authenticated)

Since you may have accepted the OAuth prompt on your Mac, try:

```bash
cd cloudflare-worker
npx wrangler deploy
```

If it fails with auth errors:
1. Get an API token: https://dash.cloudflare.com/profile/api-tokens
2. Create token using "Edit Cloudflare Workers" template
3. Set it: `export CLOUDFLARE_API_TOKEN=<your-token>`
4. Try deploy again

### Step 4: Set Worker Secrets

**Via CLI:**
```bash
cd cloudflare-worker
npx wrangler secret put DEEPSEEK_API_KEY
# Enter your DeepSeek API key when prompted

npx wrangler secret put ELEVENLABS_API_KEY
# Enter your ElevenLabs API key

npx wrangler secret put ELEVENLABS_VOICE_ID
# Enter your ElevenLabs voice ID

npx wrangler secret put SUPABASE_URL
# Enter your Supabase URL

npx wrangler secret put SUPABASE_SERVICE_KEY
# Enter your Supabase service role key
```

**Via Dashboard:**
1. Go to your `dj-xu-deepseek` worker
2. Click **Settings** > **Variables and Secrets**
3. Add each secret:
   - `DEEPSEEK_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

### Optional Worker Variables (with defaults)

These have defaults but can be overridden:
- `DEEPSEEK_API_BASE` (default: https://api.deepseek.com)
- `DEEPSEEK_MODEL` (default: deepseek-chat)
- `ELEVENLABS_MODEL` (default: eleven_v3)
- `ELEVENLABS_API_BASE` (default: https://api.elevenlabs.io/v1)

---

## Part 3: Connect Worker to Pages Domain

### Option 1: Use Worker URL directly

After deploying the worker, you'll get a URL like:
```
https://dj-xu-deepseek.<your-subdomain>.workers.dev
```

Update your Pages environment variable:
```
VITE_WORKER_URL=https://dj-xu-deepseek.<your-subdomain>.workers.dev
VITE_AI_PROXY_URL=https://dj-xu-deepseek.<your-subdomain>.workers.dev/api/deepseek
```

### Option 2: Use Custom Domain Route (Recommended)

To have `/api/*` routes work on `djxu.live`:

1. In `cloudflare-worker/wrangler.toml`, uncomment and configure routes:
```toml
routes = [
  { pattern = "djxu.live/api/*", zone_name = "djxu.live" }
]
```

2. Redeploy the worker:
```bash
cd cloudflare-worker
npx wrangler deploy
```

3. Update Pages environment variables:
```
VITE_AI_PROXY_URL=/api/deepseek
VITE_WORKER_URL=https://djxu.live
```

---

## Part 4: Deploy Supabase Database

If you haven't set up your Supabase database yet:

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref <your-project-ref>

# Push migrations to production
npx supabase db push
```

Or manually run the SQL migrations in your Supabase dashboard:
1. `supabase/migrations/20241109190000_create_music_schema.sql`
2. `supabase/migrations/20241112160000_add_play_telemetry_rag.sql`
3. `supabase/migrations/20241112170000_add_broadcast_system.sql`
4. `supabase/migrations/20241112180000_enable_broadcast_realtime.sql`
5. `supabase/migrations/20241112190000_fix_broadcast_sessions.sql`

---

## Part 5: Verify Deployment

### Check Frontend
1. Visit https://djxu.live
2. You should see the DJ XU interface
3. Try Spotify authentication

### Check Worker
1. Test the DeepSeek endpoint:
```bash
curl -X POST https://dj-xu-deepseek.<your-subdomain>.workers.dev/api/deepseek \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello DJ XU!"}'
```

2. You should get a JSON response with DJ XU's personality

### Check Broadcast Features
1. Start a broadcast session
2. Check Supabase dashboard for new records in `broadcast_sessions`
3. Test viewer URL with the generated token

---

## Troubleshooting

### Build Fails
- Check that all environment variables are set in Cloudflare Pages
- Verify Node version is 18 or higher
- Check build logs for specific errors

### Worker Deployment Fails
- Ensure you're authenticated: `npx wrangler whoami`
- Check that secrets are set correctly
- Review worker logs in Cloudflare dashboard

### CORS Errors
- Worker already has CORS headers configured
- If using custom domain, ensure worker routes are set up correctly

### API Errors
- Verify all API keys are valid
- Check Worker logs for detailed error messages
- Test each API endpoint individually

---

## Next Steps After Deployment

1. **Test all features:**
   - Spotify playback
   - AI voice commands
   - Broadcasting
   - Viewer interface

2. **Set up monitoring:**
   - Check Cloudflare Analytics
   - Monitor Supabase usage
   - Review API rate limits

3. **Configure custom domain:**
   - Ensure djxu.live points to Cloudflare Pages
   - Set up SSL/TLS (automatic with Cloudflare)

4. **Optional: Set up staging environment:**
   - Create a preview branch
   - Configure separate environment variables
   - Use test API keys for staging

---

## Support

If you encounter issues:
- Check Cloudflare Worker logs in the dashboard
- Review Supabase logs
- Check browser console for frontend errors
- Review the README.md for additional configuration details

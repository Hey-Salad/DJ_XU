# DJ Xu Broadcast - Quick Start Guide

Get broadcasting in 5 minutes! 🚀

## Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- Cloudflare account (free tier works)
- Spotify Developer account
- ElevenLabs API key
- DeepSeek API key

## 🏃‍♂️ Quick Setup

### 1. Clone & Install (1 min)

```bash
git clone <your-repo>
cd dj-xu
npm install
cd cloudflare-worker && npm install && cd ..
```

### 2. Database Setup (2 min)

```bash
# Apply migrations
npx supabase db push

# Or manually:
# psql $DATABASE_URL -f supabase/migrations/20241112170000_add_broadcast_system.sql
# psql $DATABASE_URL -f supabase/migrations/20241112180000_enable_broadcast_realtime.sql
```

**Then in Supabase Dashboard:**
1. Go to Database → Replication
2. Enable realtime for:
   - `broadcast_sessions`
   - `live_captions`
   - `broadcast_tracks`
   - `broadcast_viewers`

### 3. Configure Environment (1 min)

```bash
# Frontend
cp .env.example .env

# Edit .env with your values:
VITE_WORKER_URL=http://localhost:8787
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SPOTIFY_CLIENT_ID=your_spotify_id
# ... etc
```

```bash
# Cloudflare Worker
cd cloudflare-worker
cp .dev.vars.example .dev.vars

# Edit .dev.vars:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
DEEPSEEK_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

### 4. Start Everything (1 min)

```bash
# Terminal 1: Worker
cd cloudflare-worker
wrangler dev --port 8787

# Terminal 2: Frontend
npm run dev
```

### 5. Test It! (<1 min)

```bash
# Terminal 3: Run test
./scripts/test-broadcast-flow.sh
```

**Expected output:**
```
✅ Broadcast started
✅ Status check passed
✅ Caption sent successfully
✅ Track broadcast successfully
✅ Broadcast ended successfully
🎉 All tests passed!
```

## 🎬 Manual Test

1. Open http://localhost:5173
2. Log in with Spotify
3. Click **"Go Live"** button
4. Copy the share link (looks like: `http://localhost:5173/watch/abc123...`)
5. Open link in **incognito/private window**
6. Play a song on main window
7. Watch it appear on viewer window!
8. See viewer count increase to 1
9. Click **"End Broadcast"**

## 🚨 Troubleshooting

### "Broadcast not found"
```bash
# Check worker logs
cd cloudflare-worker && wrangler tail

# Verify secrets
wrangler secret list
```

### Captions not showing
- Check Supabase realtime is enabled (Step 2)
- Open browser console for errors
- Verify viewer page is subscribing to correct channel

### Worker errors
```bash
# Check .dev.vars has all required secrets
cat cloudflare-worker/.dev.vars

# Restart worker
# Ctrl+C, then: wrangler dev --port 8787
```

### Database connection issues
```bash
# Test Supabase connection
node scripts/test-supabase-connection.js
```

## 📚 Next Steps

Once working:

1. **Deploy to Production:**
   - Follow [BROADCAST_INTEGRATION.md](./BROADCAST_INTEGRATION.md) deployment section
   - `wrangler deploy` for worker
   - `npm run build` + deploy to Vercel/Firebase/Cloudflare Pages

2. **Add Features:**
   - Subscription tiers (see Phase 2 in BROADCAST_STATUS.md)
   - Analytics dashboard
   - Recording/VOD
   - Custom branding

3. **Sell It:**
   - Target restaurants, clubs, event venues
   - Price: $29-99/month per tier
   - Focus on live events + content creators

## 🎯 Key Features Working

After setup, you have:
- ✅ Live broadcasting with one click
- ✅ Real-time captions (AI-generated)
- ✅ Track info broadcasting
- ✅ Shareable links + QR codes
- ✅ Live viewer count
- ✅ Viewer heartbeat tracking
- ✅ Multi-language translation support
- ✅ Error handling & graceful degradation

## 🤝 Need Help?

Check these files:
- [BROADCAST_INTEGRATION.md](./BROADCAST_INTEGRATION.md) - Full deployment guide
- [BROADCAST_STATUS.md](./BROADCAST_STATUS.md) - Feature checklist
- [README.md](./README.md) - Project overview

Or debug with:
```bash
# Check all services
npm run dev          # Frontend should be on :5173
wrangler dev         # Worker should be on :8787
wrangler tail        # Worker logs

# Run tests
./scripts/test-broadcast-flow.sh
```

---

**That's it! You're broadcasting! 🎉**

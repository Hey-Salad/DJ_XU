#!/bin/bash
# Simple script to apply broadcast migrations via Supabase SQL editor
# This outputs the SQL you need to paste into Supabase Dashboard

cat << 'EOF'
================================
BROADCAST MIGRATIONS FOR SUPABASE
================================

Go to your Supabase Dashboard:
https://supabase.com/dashboard/project/aqppykuiwaoikgtdquix/sql

Then paste these SQL statements into the SQL Editor:

================================
MIGRATION 1: Broadcast System
================================
EOF

cat supabase/migrations/20241112170000_add_broadcast_system.sql

cat << 'EOF'

================================
MIGRATION 2: Enable Realtime
================================
EOF

cat supabase/migrations/20241112180000_enable_broadcast_realtime.sql

cat << 'EOF'

================================
DONE! Now enable realtime:
================================

1. Go to: Database → Replication
2. Enable realtime for:
   ☐ broadcast_sessions
   ☐ live_captions
   ☐ broadcast_tracks
   ☐ broadcast_viewers
   ☐ broadcast_reactions

3. Test "Go Live" in your app!
EOF

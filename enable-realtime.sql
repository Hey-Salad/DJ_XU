-- Enable realtime for broadcast tables via SQL
-- Run this in Supabase SQL Editor

-- Enable realtime replication for broadcast tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_captions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_reactions;

-- Verify what tables are in the publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

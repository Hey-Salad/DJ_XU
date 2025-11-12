-- Enable realtime for broadcast tables
-- This allows subscribers to receive live updates via WebSocket

-- Enable realtime on broadcast_sessions table
alter publication supabase_realtime add table public.broadcast_sessions;

-- Enable realtime on live_captions table
alter publication supabase_realtime add table public.live_captions;

-- Enable realtime on broadcast_tracks table
alter publication supabase_realtime add table public.broadcast_tracks;

-- Enable realtime on broadcast_viewers table
alter publication supabase_realtime add table public.broadcast_viewers;

-- Enable realtime on broadcast_reactions table (optional, for future)
alter publication supabase_realtime add table public.broadcast_reactions;

-- Create function to notify on new caption
create or replace function public.notify_new_caption()
returns trigger as $$
begin
  perform pg_notify(
    'new_caption',
    json_build_object(
      'broadcast_session_id', NEW.broadcast_session_id,
      'caption_id', NEW.id,
      'text', NEW.original_text,
      'speaker', NEW.speaker
    )::text
  );
  return NEW;
end;
$$ language plpgsql;

-- Trigger to notify on new caption
create trigger on_new_caption
after insert on public.live_captions
for each row
execute procedure public.notify_new_caption();

-- Create function to notify on track change
create or replace function public.notify_track_change()
returns trigger as $$
begin
  perform pg_notify(
    'track_change',
    json_build_object(
      'broadcast_session_id', NEW.broadcast_session_id,
      'track_name', NEW.track_name,
      'artist', NEW.artist,
      'album_art_url', NEW.album_art_url
    )::text
  );
  return NEW;
end;
$$ language plpgsql;

-- Trigger to notify on track change
create trigger on_track_change
after insert on public.broadcast_tracks
for each row
execute procedure public.notify_track_change();

-- Grant realtime access
grant select on public.broadcast_sessions to anon, authenticated;
grant select on public.live_captions to anon, authenticated;
grant select on public.broadcast_tracks to anon, authenticated;
grant select on public.broadcast_viewers to anon, authenticated;
grant select on public.broadcast_reactions to anon, authenticated;

-- Create indexes for realtime queries
create index if not exists live_captions_realtime_idx
  on public.live_captions (broadcast_session_id, created_at desc);

create index if not exists broadcast_tracks_realtime_idx
  on public.broadcast_tracks (broadcast_session_id, started_at desc);

-- Comment for documentation
comment on publication supabase_realtime is 'Real-time publication for broadcast system including sessions, captions, tracks, viewers, and reactions';

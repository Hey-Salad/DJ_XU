================================
BROADCAST MIGRATIONS FOR SUPABASE
================================

Go to your Supabase Dashboard:
https://supabase.com/dashboard/project/aqppykuiwaoikgtdquix/sql

Then paste these SQL statements into the SQL Editor:

================================
MIGRATION 1: Broadcast System
================================
-- Broadcast system for live caption streaming
-- Extends performance_sessions with broadcasting capabilities

-- Broadcast sessions table
create table if not exists public.broadcast_sessions (
  id uuid primary key references public.performance_sessions(id) on delete cascade,
  broadcast_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  is_private boolean not null default true,
  max_viewers integer not null default 10,
  caption_language text not null default 'en',
  enable_translations boolean not null default true,
  scribe_config jsonb not null default '{
    "model": "scribe",
    "language": "auto",
    "confidence_threshold": 0.7
  }'::jsonb,
  status text not null default 'pending' check (status in ('pending','live','paused','ended')),
  started_at timestamptz,
  ended_at timestamptz,
  viewer_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_broadcast_sessions
before update on public.broadcast_sessions
for each row
execute procedure public.handle_updated_at();

alter table public.broadcast_sessions enable row level security;

-- Index for token lookup
create index if not exists broadcast_sessions_token_idx on public.broadcast_sessions (broadcast_token) where status = 'live';

-- Live captions table
create table if not exists public.live_captions (
  id bigserial primary key,
  broadcast_session_id uuid not null references public.broadcast_sessions(id) on delete cascade,
  sequence_number integer not null,
  speaker text not null default 'DJ_XU' check (speaker in ('DJ_XU','USER','SYSTEM')),
  original_text text not null,
  detected_language text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  timestamp_ms integer not null,
  audio_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_captions_broadcast_idx on public.live_captions (broadcast_session_id, sequence_number desc);
create index if not exists live_captions_created_idx on public.live_captions (broadcast_session_id, created_at desc);

alter table public.live_captions enable row level security;

-- Broadcast viewers table
create table if not exists public.broadcast_viewers (
  id uuid primary key default gen_random_uuid(),
  broadcast_session_id uuid not null references public.broadcast_sessions(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  anonymous_id text,
  translation_language text,
  user_agent text,
  ip_address inet,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  total_duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  constraint viewer_identity check (user_id is not null or anonymous_id is not null)
);

create index if not exists broadcast_viewers_session_idx on public.broadcast_viewers (broadcast_session_id, joined_at desc);
create index if not exists broadcast_viewers_active_idx on public.broadcast_viewers (broadcast_session_id) where left_at is null;

alter table public.broadcast_viewers enable row level security;

-- Now playing broadcasts (tracks being played during broadcast)
create table if not exists public.broadcast_tracks (
  id bigserial primary key,
  broadcast_session_id uuid not null references public.broadcast_sessions(id) on delete cascade,
  track_play_id bigint references public.track_plays(id) on delete set null,
  track_name text not null,
  artist text not null,
  album text,
  album_art_url text,
  source text not null default 'spotify',
  source_track_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists broadcast_tracks_session_idx on public.broadcast_tracks (broadcast_session_id, started_at desc);

alter table public.broadcast_tracks enable row level security;

-- Broadcast reactions (optional viewer engagement)
create table if not exists public.broadcast_reactions (
  id bigserial primary key,
  broadcast_session_id uuid not null references public.broadcast_sessions(id) on delete cascade,
  viewer_id uuid references public.broadcast_viewers(id) on delete set null,
  reaction_type text not null check (reaction_type in ('fire','heart','clap','star','wave','dance')),
  caption_id bigint references public.live_captions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists broadcast_reactions_session_idx on public.broadcast_reactions (broadcast_session_id, created_at desc);

alter table public.broadcast_reactions enable row level security;

-- Analytics/telemetry for broadcasts
create table if not exists public.broadcast_analytics (
  id bigserial primary key,
  broadcast_session_id uuid not null references public.broadcast_sessions(id) on delete cascade,
  metric_type text not null check (metric_type in ('viewer_join','viewer_leave','caption_sent','track_change','reaction','error')),
  metric_value numeric,
  details jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists broadcast_analytics_session_idx on public.broadcast_analytics (broadcast_session_id, recorded_at desc);
create index if not exists broadcast_analytics_type_idx on public.broadcast_analytics (metric_type, recorded_at desc);

alter table public.broadcast_analytics enable row level security;

-- Function to update viewer count
create or replace function public.update_broadcast_viewer_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.broadcast_sessions
    set viewer_count = viewer_count + 1
    where id = NEW.broadcast_session_id;
  elsif TG_OP = 'UPDATE' and NEW.left_at is not null and OLD.left_at is null then
    update public.broadcast_sessions
    set viewer_count = greatest(0, viewer_count - 1)
    where id = NEW.broadcast_session_id;
  elsif TG_OP = 'DELETE' and OLD.left_at is null then
    update public.broadcast_sessions
    set viewer_count = greatest(0, viewer_count - 1)
    where id = OLD.broadcast_session_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger update_viewer_count_trigger
after insert or update or delete on public.broadcast_viewers
for each row
execute procedure public.update_broadcast_viewer_count();

-- Function to get active broadcast by token
create or replace function public.get_broadcast_by_token(token text)
returns table (
  broadcast_id uuid,
  performance_session_id uuid,
  venue_id uuid,
  is_private boolean,
  max_viewers integer,
  current_viewer_count integer,
  caption_language text,
  enable_translations boolean,
  status text,
  started_at timestamptz,
  session_title text
) language sql stable as $$
  select
    bs.id as broadcast_id,
    bs.id as performance_session_id,
    ps.venue_id,
    bs.is_private,
    bs.max_viewers,
    bs.viewer_count as current_viewer_count,
    bs.caption_language,
    bs.enable_translations,
    bs.status,
    bs.started_at,
    ps.title as session_title
  from public.broadcast_sessions bs
  join public.performance_sessions ps on ps.id = bs.id
  where bs.broadcast_token = token
    and bs.status in ('live', 'paused');
$$;

-- Function to check if viewer can join
create or replace function public.can_join_broadcast(
  token text,
  viewer_user_id uuid default null,
  viewer_anon_id text default null
)
returns jsonb language plpgsql as $$
declare
  broadcast_record record;
  result jsonb;
begin
  select * from public.get_broadcast_by_token(token) into broadcast_record;

  if broadcast_record is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'broadcast_not_found'
    );
  end if;

  if broadcast_record.status != 'live' then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'broadcast_not_live',
      'status', broadcast_record.status
    );
  end if;

  if broadcast_record.current_viewer_count >= broadcast_record.max_viewers then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'viewer_limit_reached',
      'max_viewers', broadcast_record.max_viewers
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'broadcast', row_to_json(broadcast_record)
  );
end;
$$;

-- RLS Policies

-- Broadcast sessions: creators can manage their own, viewers can read active ones
create policy "Creators can manage their broadcast sessions"
  on public.broadcast_sessions for all
  using (
    id in (
      select ps.id from public.performance_sessions ps
      where ps.created_by = auth.uid()
    )
  );

create policy "Anyone can view active broadcasts with valid token"
  on public.broadcast_sessions for select
  using (status = 'live');

-- Live captions: public read for active broadcasts
create policy "Anyone can view captions for active broadcasts"
  on public.live_captions for select
  using (
    broadcast_session_id in (
      select id from public.broadcast_sessions
      where status = 'live'
    )
  );

create policy "Broadcast owners can insert captions"
  on public.live_captions for insert
  with check (
    broadcast_session_id in (
      select bs.id from public.broadcast_sessions bs
      join public.performance_sessions ps on ps.id = bs.id
      where ps.created_by = auth.uid()
    )
  );

-- Broadcast viewers: users can manage their own viewer sessions
create policy "Users can create their own viewer sessions"
  on public.broadcast_viewers for insert
  with check (
    user_id = auth.uid() or user_id is null
  );

create policy "Users can update their own viewer sessions"
  on public.broadcast_viewers for update
  using (user_id = auth.uid() or user_id is null);

create policy "Broadcast owners can view all viewers"
  on public.broadcast_viewers for select
  using (
    broadcast_session_id in (
      select bs.id from public.broadcast_sessions bs
      join public.performance_sessions ps on ps.id = bs.id
      where ps.created_by = auth.uid()
    )
  );

-- Broadcast tracks: public read for active broadcasts
create policy "Anyone can view tracks for active broadcasts"
  on public.broadcast_tracks for select
  using (
    broadcast_session_id in (
      select id from public.broadcast_sessions
      where status = 'live'
    )
  );

create policy "Broadcast owners can insert tracks"
  on public.broadcast_tracks for insert
  with check (
    broadcast_session_id in (
      select bs.id from public.broadcast_sessions bs
      join public.performance_sessions ps on ps.id = bs.id
      where ps.created_by = auth.uid()
    )
  );

-- Broadcast reactions: viewers can create, all can read
create policy "Anyone can view reactions for active broadcasts"
  on public.broadcast_reactions for select
  using (
    broadcast_session_id in (
      select id from public.broadcast_sessions
      where status = 'live'
    )
  );

create policy "Viewers can create reactions"
  on public.broadcast_reactions for insert
  with check (true);

-- Broadcast analytics: owners only
create policy "Broadcast owners can view analytics"
  on public.broadcast_analytics for select
  using (
    broadcast_session_id in (
      select bs.id from public.broadcast_sessions bs
      join public.performance_sessions ps on ps.id = bs.id
      where ps.created_by = auth.uid()
    )
  );

create policy "System can insert analytics"
  on public.broadcast_analytics for insert
  with check (true);

-- Grant access to service role for realtime
grant usage on schema public to anon, authenticated;
grant select on public.broadcast_sessions to anon, authenticated;
grant select on public.live_captions to anon, authenticated;
grant select on public.broadcast_tracks to anon, authenticated;
grant select on public.broadcast_reactions to anon, authenticated;
grant insert, update on public.broadcast_viewers to anon, authenticated;
grant insert on public.broadcast_reactions to anon, authenticated;

================================
MIGRATION 2: Enable Realtime
================================
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

-- RAG + telemetry schema extensions
create extension if not exists "vector";

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'ai_message_role'
  ) then
    create type public.ai_message_role as enum ('user','assistant','system','tool');
  end if;
end$$;

create table if not exists public.performance_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete set null,
  playlist_id uuid references public.playlists(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  created_by uuid references public.app_users(id) on delete set null,
  title text not null default 'Untitled Session',
  status text not null default 'draft' check (status in ('draft','live','closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  crowd_size integer,
  context jsonb not null default '{}'::jsonb,
  summary text,
  rag_summary_vector vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_performance_sessions
before update on public.performance_sessions
for each row
execute procedure public.handle_updated_at();

alter table public.performance_sessions enable row level security;

create table if not exists public.track_plays (
  id bigserial primary key,
  session_id uuid not null references public.performance_sessions(id) on delete cascade,
  playlist_track_id bigint references public.playlist_tracks(id) on delete set null,
  source text not null default 'spotify',
  source_track_id text not null,
  title text not null,
  artist text not null,
  album text,
  genre text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms integer,
  bpm numeric,
  energy numeric,
  crowd_energy integer,
  crowd_sentiment text,
  requested_by uuid references public.app_users(id) on delete set null,
  requested_via text,
  transition_from bigint references public.track_plays(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ai_notes text,
  rag_embedding vector(1536)
);

create index if not exists track_plays_session_idx on public.track_plays (session_id, started_at desc);
create index if not exists track_plays_transition_idx on public.track_plays (transition_from);
create index if not exists track_plays_embedding_idx on public.track_plays using ivfflat (rag_embedding vector_cosine_ops) with (lists = 100);

alter table public.track_plays enable row level security;

create table if not exists public.crowd_events (
  id bigserial primary key,
  session_id uuid not null references public.performance_sessions(id) on delete cascade,
  listener_device_id uuid references public.listener_devices(id) on delete set null,
  event_type text not null check (event_type in ('voice_command','gesture','chat','reaction','system')),
  transcript text,
  sentiment text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  rag_embedding vector(1536)
);

create index if not exists crowd_events_session_idx on public.crowd_events (session_id, created_at desc);
create index if not exists crowd_events_embedding_idx on public.crowd_events using ivfflat (rag_embedding vector_cosine_ops) with (lists = 100);

alter table public.crowd_events enable row level security;

create table if not exists public.ai_messages (
  id bigserial primary key,
  session_id uuid references public.performance_sessions(id) on delete set null,
  crowd_event_id bigint references public.crowd_events(id) on delete set null,
  role public.ai_message_role not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  response_ms integer,
  created_at timestamptz not null default now(),
  rag_embedding vector(1536)
);

create index if not exists ai_messages_session_idx on public.ai_messages (session_id, created_at desc);
create index if not exists ai_messages_embedding_idx on public.ai_messages using ivfflat (rag_embedding vector_cosine_ops) with (lists = 100);

alter table public.ai_messages enable row level security;

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text,
  title text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_rag_documents
before update on public.rag_documents
for each row
execute procedure public.handle_updated_at();

alter table public.rag_documents enable row level security;

create table if not exists public.rag_chunks (
  id bigserial primary key,
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  tokens integer,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists rag_chunks_document_chunk_idx on public.rag_chunks (document_id, chunk_index);
create index if not exists rag_chunks_embedding_idx on public.rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.rag_chunks enable row level security;

create or replace view public.rag_unified_index as
select
  'track_play'::text as record_type,
  tp.id::text as source_id,
  coalesce(tp.ai_notes, concat(tp.title, ' – ', tp.artist)) as content,
  jsonb_build_object(
    'session_id', tp.session_id,
    'playlist_track_id', tp.playlist_track_id,
    'started_at', tp.started_at,
    'source', tp.source,
    'metadata', tp.metadata
  ) as metadata,
  tp.rag_embedding as embedding
from public.track_plays tp
where tp.rag_embedding is not null
union all
select
  'crowd_event'::text,
  ce.id::text,
  coalesce(ce.transcript, ce.event_type || ' signal'),
  jsonb_build_object(
    'session_id', ce.session_id,
    'event_type', ce.event_type,
    'payload', ce.payload
  ),
  ce.rag_embedding
from public.crowd_events ce
where ce.rag_embedding is not null
union all
select
  'ai_message'::text,
  am.id::text,
  am.content,
  jsonb_build_object(
    'session_id', am.session_id,
    'role', am.role,
    'metadata', am.metadata
  ),
  am.rag_embedding
from public.ai_messages am
where am.rag_embedding is not null
union all
select
  'document_chunk'::text,
  rc.id::text,
  rc.content,
  jsonb_build_object(
    'document_id', rc.document_id,
    'chunk_index', rc.chunk_index,
    'metadata', rc.metadata
  ),
  rc.embedding
from public.rag_chunks rc
where rc.embedding is not null;

create or replace function public.match_rag_index(
  query_embedding vector(1536),
  match_count integer default 8,
  match_threshold double precision default 0.5
)
returns table (
  record_type text,
  source_id text,
  content text,
  metadata jsonb,
  similarity double precision
) language sql stable as $$
  select
    record_type,
    source_id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from public.rag_unified_index
  where embedding is not null
    and 1 - (embedding <=> query_embedding) >= match_threshold
  order by embedding <=> query_embedding
  limit match_count
$$;

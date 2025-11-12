-- Enable helpful extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Utility trigger to maintain updated_at columns
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email citext unique not null,
  display_name text,
  role text not null default 'listener',
  preferred_language text not null default 'en',
  timezone text not null default 'UTC',
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_app_users
before update on public.app_users
for each row
execute procedure public.handle_updated_at();

alter table public.app_users enable row level security;

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.app_users(id) on delete set null,
  name text not null,
  slug text not null unique,
  venue_type text not null default 'club',
  description text,
  timezone text not null default 'UTC',
  capacity integer check (capacity is null or capacity > 0),
  lat double precision,
  lon double precision,
  address jsonb not null default '{}'::jsonb,
  sound_profile jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_venues
before update on public.venues
for each row
execute procedure public.handle_updated_at();

alter table public.venues enable row level security;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  device_name text not null,
  device_type text not null,
  manufacturer text,
  model text,
  firmware_version text,
  supports_voice boolean not null default false,
  supported_integrations text[] not null default '{}',
  status text not null default 'offline' check (status in ('offline','standby','online','error')),
  last_online timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_devices
before update on public.devices
for each row
execute procedure public.handle_updated_at();

alter table public.devices enable row level security;

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  created_by uuid references public.app_users(id) on delete set null,
  title text not null,
  description text,
  mood text,
  energy_level integer check (energy_level between 1 and 10),
  dancefloor_intensity integer check (dancefloor_intensity between 1 and 10),
  bpm_target integer check (bpm_target is null or bpm_target > 0),
  is_public boolean not null default false,
  cover_image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_playlists
before update on public.playlists
for each row
execute procedure public.handle_updated_at();

alter table public.playlists enable row level security;

create table public.song_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  album text,
  genre text,
  bpm numeric,
  duration_ms integer,
  album_art_url text,
  lyrics text,
  producer text,
  writer text,
  label text,
  release_date date,
  language text,
  key_signature text,
  time_signature text,
  instrumentation text[] not null default '{}',
  mood_keywords text[] not null default '{}',
  tags text[] not null default '{}',
  external_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_song_catalog
before update on public.song_catalog
for each row
execute procedure public.handle_updated_at();

alter table public.song_catalog enable row level security;

create table public.playlist_tracks (
  id bigserial primary key,
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid references public.song_catalog(id) on delete set null,
  source text not null default 'spotify',
  source_track_id text not null,
  title text not null,
  artist text not null,
  album text,
  genre text,
  bpm numeric,
  energy numeric,
  danceability numeric,
  valence numeric,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  order_index integer not null,
  unique (playlist_id, source_track_id)
);

create index playlist_tracks_playlist_idx on public.playlist_tracks (playlist_id, order_index);

create table public.music_attribute_profiles (
  slug text primary key,
  display_name text not null,
  description text,
  tempo_min integer,
  tempo_max integer,
  energy integer check (energy between 1 and 10),
  groove integer check (groove between 1 and 10),
  cultural_influences text[] not null default '{}',
  mood_keywords text[] not null default '{}',
  ideal_scenarios text[] not null default '{}',
  instrumentation text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.venue_music_preferences (
  venue_id uuid references public.venues(id) on delete cascade,
  attribute_slug text references public.music_attribute_profiles(slug) on delete cascade,
  priority integer not null default 5 check (priority between 1 and 10),
  notes text,
  primary key (venue_id, attribute_slug)
);

create table public.user_device_preferences (
  user_id uuid references public.app_users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete cascade,
  preferred_volume numeric,
  preferred_eq jsonb not null default '{}'::jsonb,
  auto_duck_music boolean not null default true,
  last_used_at timestamptz,
  primary key (user_id, device_id)
);

create table public.listener_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  device_label text not null,
  platform text not null,
  os_version text,
  capabilities text[] not null default '{}',
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_listener_devices
before update on public.listener_devices
for each row
execute procedure public.handle_updated_at();

alter table public.listener_devices enable row level security;

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete set null,
  organizer_user_id uuid references public.app_users(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  ticket_url text,
  is_public boolean not null default true,
  theme text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_parties
before update on public.parties
for each row
execute procedure public.handle_updated_at();

alter table public.parties enable row level security;

create table public.party_attendees (
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','confirmed','attended','cancelled')),
  checked_in_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create trigger set_timestamp_party_attendees
before update on public.party_attendees
for each row
execute procedure public.handle_updated_at();

alter table public.party_attendees enable row level security;

create table public.link_shares (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties(id) on delete cascade,
  shared_by uuid references public.app_users(id) on delete set null,
  url text not null,
  label text,
  platform text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.link_shares enable row level security;

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  linked_entity text not null,
  linked_id uuid,
  code text not null unique,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.qr_codes enable row level security;

create table public.social_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  provider text not null,
  account_handle text,
  profile_url text,
  access_token text,
  scopes text[] not null default '{}',
  connected_at timestamptz default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.social_integrations enable row level security;

create table public.video_streams (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties(id) on delete cascade,
  label text not null,
  source_url text not null,
  is_live boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  resolution text,
  framerate numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_video_streams
before update on public.video_streams
for each row
execute procedure public.handle_updated_at();

alter table public.video_streams enable row level security;

create table public.vision_ai_observations (
  id uuid primary key default gen_random_uuid(),
  video_stream_id uuid references public.video_streams(id) on delete cascade,
  timestamp timestamptz not null default now(),
  description text,
  confidence numeric,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.vision_ai_observations enable row level security;

create table public.iot_sensors (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  sensor_type text not null check (sensor_type in ('light','led','temp','motion','audio','visual','environment','power')),
  location text,
  capability_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_iot_sensors
before update on public.iot_sensors
for each row
execute procedure public.handle_updated_at();

alter table public.iot_sensors enable row level security;

create table public.sensor_readings (
  id bigserial primary key,
  sensor_id uuid references public.iot_sensors(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  value jsonb not null default '{}'::jsonb,
  status text not null default 'ok' check (status in ('ok','warning','error')),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.sensor_readings enable row level security;

create table public.lighting_scenes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete set null,
  party_id uuid references public.parties(id) on delete set null,
  name text not null,
  intensity integer check (intensity between 0 and 100),
  color_palette text[] not null default '{}',
  led_mode text,
  trigger text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_lighting_scenes
before update on public.lighting_scenes
for each row
execute procedure public.handle_updated_at();

alter table public.lighting_scenes enable row level security;

create table public.light_sequences (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references public.lighting_scenes(id) on delete cascade,
  step_order integer not null,
  duration_ms integer not null default 1000,
  led_pattern jsonb not null default '{}'::jsonb,
  audio_sync boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_light_sequences
before update on public.light_sequences
for each row
execute procedure public.handle_updated_at();

alter table public.light_sequences enable row level security;

create table public.control_panels (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete set null,
  label text not null,
  control_type text not null check (control_type in ('mixer','line-in','line-out','deck','effects','lighting','iot','master')),
  assigned_user_id uuid references public.app_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_control_panels
before update on public.control_panels
for each row
execute procedure public.handle_updated_at();

alter table public.control_panels enable row level security;

create table public.control_actions (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid references public.control_panels(id) on delete cascade,
  action text not null,
  parameters jsonb not null default '{}'::jsonb,
  trigger_type text not null check (trigger_type in ('manual','schedule','voice','ai','sensor')),
  started_at timestamptz,
  completed_at timestamptz,
  response text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.control_actions enable row level security;

create table public.dj_audio_sessions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  user_id uuid references public.app_users(id) on delete set null,
  status text not null default 'idle' check (status in ('active','paused','ended','idle')),
  start_time timestamptz,
  end_time timestamptz,
  audio_routing jsonb not null default '{}'::jsonb,
  video_routing jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_dj_audio_sessions
before update on public.dj_audio_sessions
for each row
execute procedure public.handle_updated_at();

alter table public.dj_audio_sessions enable row level security;

create table public.dj_cues (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.dj_audio_sessions(id) on delete cascade,
  cue_type text not null check (cue_type in ('volume_drop','shoutout','fact','wrap_up','transition','beat_drop','voice_over','manual')),
  trigger_time timestamptz not null default now(),
  duration_ms integer,
  drop_level numeric check (drop_level is null or drop_level >= 0),
  fact_text text,
  shoutout_text text,
  wrapup_text text,
  volume_target_db numeric,
  voice_profile text,
  audio_url text,
  instruction text,
  created_by uuid references public.app_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_dj_cues
before update on public.dj_cues
for each row
execute procedure public.handle_updated_at();

alter table public.dj_cues enable row level security;

create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.dj_audio_sessions(id) on delete set null,
  user_id uuid references public.app_users(id) on delete set null,
  prompt text,
  response text,
  response_format text,
  latency_ms integer,
  confidence numeric,
  channel text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_interactions enable row level security;

create table public.voice_commands (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.dj_audio_sessions(id) on delete set null,
  user_id uuid references public.app_users(id) on delete set null,
  command_text text not null,
  intent text,
  confidence numeric,
  handled boolean not null default false,
  response text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.voice_commands enable row level security;

create table public.ai_voice_prompts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.dj_audio_sessions(id) on delete set null,
  voice_profile text,
  language text,
  script text,
  audio_url text,
  trigger text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_voice_prompts enable row level security;

create table public.song_requests (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references public.playlists(id) on delete set null,
  party_id uuid references public.parties(id) on delete set null,
  song_id uuid references public.song_catalog(id) on delete set null,
  requested_by uuid references public.app_users(id) on delete set null,
  request_source text not null default 'app' check (request_source in ('app','voice','qr','social','schedule')),
  requested_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued','playing','played','skipped','rejected','archived')),
  priority integer not null default 5 check (priority between 1 and 10),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_song_requests
before update on public.song_requests
for each row
execute procedure public.handle_updated_at();

alter table public.song_requests enable row level security;

create table public.dj_queue_entries (
  id bigserial primary key,
  session_id uuid references public.dj_audio_sessions(id) on delete set null,
  song_request_id uuid references public.song_requests(id) on delete set null,
  party_id uuid references public.parties(id) on delete cascade,
  queue_position integer not null,
  status text not null default 'pending' check (status in ('pending','processing','playing','completed','skipped','paused')),
  scheduled_for timestamptz,
  last_state_change timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.dj_queue_entries enable row level security;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.app_users(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  website text,
  industry text,
  contact_email citext,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_organizations
before update on public.organizations
for each row
execute procedure public.handle_updated_at();

alter table public.organizations enable row level security;

create table public.organization_memberships (
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  is_admin boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create trigger set_timestamp_organization_memberships
before update on public.organization_memberships
for each row
execute procedure public.handle_updated_at();

alter table public.organization_memberships enable row level security;

create table public.user_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  personal_links text[] not null default '{}',
  contact_phone text,
  preferred_timezone text not null default 'UTC',
  preferred_language text not null default 'en',
  account_type text not null default 'personal',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_user_profiles
before update on public.user_profiles
for each row
execute procedure public.handle_updated_at();

alter table public.user_profiles enable row level security;

create table public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  billing_email citext,
  currency text not null default 'USD',
  billing_address jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','past_due','canceled','trial')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_billing_accounts
before update on public.billing_accounts
for each row
execute procedure public.handle_updated_at();

alter table public.billing_accounts enable row level security;

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid references public.billing_accounts(id) on delete cascade,
  type text not null check (type in ('card','paypal','wire','crypto','manual')),
  provider text,
  last_four text,
  expiry_month smallint,
  expiry_year smallint,
  metadata jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_payment_methods
before update on public.payment_methods
for each row
execute procedure public.handle_updated_at();

alter table public.payment_methods enable row level security;

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid references public.billing_accounts(id) on delete set null,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  transaction_type text not null check (transaction_type in ('charge','refund','credit','withdrawal')),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_payment_transactions
before update on public.payment_transactions
for each row
execute procedure public.handle_updated_at();

alter table public.payment_transactions enable row level security;

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text not null,
  price numeric not null,
  billing_interval text not null default 'month' check (billing_interval in ('day','week','month','year')),
  features jsonb not null default '{}'::jsonb,
  max_streams integer not null default 1,
  max_ai_requests integer not null default 500,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_subscription_plans
before update on public.subscription_plans
for each row
execute procedure public.handle_updated_at();

alter table public.subscription_plans enable row level security;

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','past_due','canceled','trialing','paused')),
  auto_renew boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_user_subscriptions
before update on public.user_subscriptions
for each row
execute procedure public.handle_updated_at();

alter table public.user_subscriptions enable row level security;

create table public.business_signups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  business_name text not null,
  legal_name text,
  tax_id text,
  industry text,
  contact_email citext,
  contact_phone text,
  address jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp_business_signups
before update on public.business_signups
for each row
execute procedure public.handle_updated_at();

alter table public.business_signups enable row level security;

create table public.api_rate_limits (
  user_id uuid references public.app_users(id) on delete cascade,
  limit_per_minute integer not null default 100,
  limit_per_hour integer not null default 1000,
  limit_per_day integer not null default 5000,
  window_start timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create trigger set_timestamp_api_rate_limits
before update on public.api_rate_limits
for each row
execute procedure public.handle_updated_at();

alter table public.api_rate_limits enable row level security;

create table public.api_usage_logs (
  id bigserial primary key,
  user_id uuid references public.app_users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  endpoint text not null,
  method text not null,
  status integer,
  response_time_ms integer,
  request_payload jsonb,
  response_payload jsonb,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.api_usage_logs enable row level security;

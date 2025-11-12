-- Seed users
insert into public.app_users (id, email, display_name, role, preferred_language, timezone, metadata)
values
  ('11111111-1111-4111-8111-111111111111', 'aurora@djxu.live', 'Aurora Wong', 'owner', 'en', 'Asia/Hong_Kong', jsonb_build_object('interests', array['cantopop','uk-garage'])),
  ('22222222-2222-4222-8222-222222222222', 'lee@djxu.live', 'Lee Saunders', 'resident_dj', 'en', 'Europe/London', jsonb_build_object('interests', array['dub','house'])),
  ('33333333-3333-4333-8333-333333333333', 'sky@djxu.live', 'Sky Mei', 'curator', 'cn', 'Asia/Shanghai', jsonb_build_object('interests', array['mandopop','ambient']));

-- Seed venues
insert into public.venues (id, owner_user_id, name, slug, venue_type, description, timezone, capacity, lat, lon, address, sound_profile, tags)
values
  ('aaaaaaa1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Neon Lotus Club', 'neon-lotus', 'club',
   'Multi-level club blending Cantonese classics with futurist bass.', 'Asia/Hong_Kong', 600, 22.2819, 114.1589,
   jsonb_build_object('city','Hong Kong','country','China','street','88 Queen''s Road'),
   jsonb_build_object('system','Void Acoustics','room_modes','tight_low_end','notes','Prefers warm analog saturation'),
   array['hong-kong','futurist','late-night']),
  ('aaaaaaa2-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Soho Rooftop Social', 'soho-rooftop', 'lounge',
   'Sunset cocktails with nu-disco, amapiano, and neo-soul rotations.', 'Europe/London', 250, 51.5136, -0.1365,
   jsonb_build_object('city','London','country','UK','street','21 Great Marlborough St'),
   jsonb_build_object('system','Funktion-One','notes','Open-air so highs must stay smooth'),
   array['sunset','open-air','nu-disco']);

-- Seed devices
insert into public.devices (id, venue_id, device_name, device_type, manufacturer, model, firmware_version, supports_voice, supported_integrations, status, last_online, settings)
values
  ('ddddddd1-0000-4000-8000-000000000001', 'aaaaaaa1-0000-4000-8000-000000000001', 'Booth Brain', 'controller', 'Pioneer', 'DJM-A9', '1.2.3', true, array['spotify','ableton','serato'], 'online', now(), jsonb_build_object('input_matrix','4ch','ducking','auto')),
  ('ddddddd2-0000-4000-8000-000000000002', 'aaaaaaa1-0000-4000-8000-000000000001', 'Dancefloor Array', 'speaker-array', 'Void', 'Arcline 12', '2.4.0', false, array['aes67'], 'standby', now() - interval '2 hours', jsonb_build_object('crossover','110Hz','eq','smile')),
  ('ddddddd3-0000-4000-8000-000000000003', 'aaaaaaa2-0000-4000-8000-000000000002', 'Skyline Beam', 'lighting', 'Chauvet', 'Rogue Outcast 2X', '5.6.1', false, array['artnet'], 'online', now(), jsonb_build_object('palette','sunset','intensity','medium'));

-- Seed playlists
insert into public.playlists (id, venue_id, created_by, title, description, mood, energy_level, dancefloor_intensity, bpm_target, is_public, tags)
values
  ('bbbbbbb1-0000-4000-8000-000000000001', 'aaaaaaa1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Lotus Voltage', 'High-energy Cantonese-disco & UK bass crossover.', 'electric', 9, 8, 128, true, array['canto','bass','uk-garage']),
  ('bbbbbbb2-0000-4000-8000-000000000002', 'aaaaaaa2-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Golden Hour Pulse', 'Nu-disco, amapiano, soulful edits for rooftop vibes.', 'radiant', 6, 5, 110, true, array['nu-disco','amapiano','sunset']);

-- Seed playlist tracks
insert into public.playlist_tracks (playlist_id, source, source_track_id, title, artist, album, genre, bpm, energy, danceability, valence, duration_ms, metadata, order_index)
values
  ('bbbbbbb1-0000-4000-8000-000000000001', 'spotify', '3LotusBass001', 'Velvet Turbo', 'Faye Wong ft. Conducta', 'Future Lotus', 'canto-ukg', 130, 0.92, 0.87, 0.65, 212000, jsonb_build_object('key','F#m','mood','neon'), 1),
  ('bbbbbbb1-0000-4000-8000-000000000001', 'spotify', '3LotusBass002', 'Aerial Strobe', 'DJ XU All-Stars', 'Voltage Bloom', 'bassline', 128, 0.88, 0.82, 0.55, 198000, jsonb_build_object('key','Em','features',array['live-drums']), 2),
  ('bbbbbbb2-0000-4000-8000-000000000002', 'spotify', '3Rooftop001', 'Amber Mirage', 'Ama K. & Disclosure', 'Skyline Stories', 'nu-disco', 112, 0.7, 0.9, 0.78, 240000, jsonb_build_object('key','Bm','mood','sunset shimmer'), 1),
  ('bbbbbbb2-0000-4000-8000-000000000002', 'spotify', '3Rooftop002', 'Palm Wine Circuit', 'Soweto Keys', 'Electric Breeze', 'amapiano', 109, 0.68, 0.86, 0.72, 256000, jsonb_build_object('key','Gm','perc','log-drum focus'), 2);

-- Seed music attribute profiles
insert into public.music_attribute_profiles (slug, display_name, description, tempo_min, tempo_max, energy, groove, cultural_influences, mood_keywords, ideal_scenarios, instrumentation)
values
  ('heritage-house', 'Heritage House', 'Deep house grooves with Cantonese melodies and vinyl warmth.', 118, 124, 6, 8,
   array['hong-kong','detroit'], array['intimate','nostalgic','buttery'], array['cocktail_hour','gallery-openings'], array['rhodes','analog-bass','percussion-loops']),
  ('skyline-amapiano', 'Skyline Amapiano', 'Airy amapiano patterns tailored for rooftop sunsets.', 104, 114, 5, 9,
   array['south-africa','uk'], array['breezy','uplifting'], array['sunset-session','poolside'], array['log-drum','pads','vocal-chops']),
  ('dim-sum-disco', 'Dim Sum Disco', 'Playful disco & city-pop edits ideal for brunch-to-dance transitions.', 112, 124, 7, 8,
   array['tokyo','hong-kong','nyc'], array['playful','sparkling'], array['daytime-party','brand-launch'], array['guitar-chops','synth-brass','live-perc']),
  ('lowlight-dnb', 'Lowlite DnB', 'Liquid dnb selections for afterhours decompression.', 168, 176, 8, 7,
   array['uk','shenzhen'], array['cathartic','cinematic'], array['afterhours','immersive-visuals'], array['breakbeats','pads','sub-bass']),
  ('jade-breaks', 'Jade Breaks', 'Leftfield breaks with Canton pop vocals chopped in.', 128, 134, 8, 8,
   array['manchester','hong-kong'], array['rebellious','percussive'], array['dancefloor-prime'], array['vocal-chops','fm-bass','fx']),
  ('aqua-ambient', 'Aqua Ambient', 'Hydrated ambient textures for spa pop-ups and mindful listening.', 70, 95, 3, 4,
   array['iceland','guangzhou'], array['soothing','glacial'], array['wellness','immersive-installation'], array['modular','field-recordings','crystal-bowls']),
  ('grime-opera', 'Grime Opera', 'Theatrical grime with orchestral swells for high-drama intros.', 134, 140, 9, 7,
   array['london','beijing'], array['dramatic','ferocious'], array['grand-opening','fashion-runway'], array['strings','808s','choir']),
  ('percussion-feast', 'Percussion Feast', 'High-energy percussive workouts inspired by lion dance crews.', 122, 132, 9, 10,
   array['cantonese','afro-latin'], array['festive','earthy'], array['street-parade','festival'], array['drums','congas','shakers']),
  ('midnight-city-pop', 'Midnight City Pop', 'Glittering mandarin city-pop for late-night singalongs.', 100, 108, 5, 7,
   array['taipei','osaka'], array['romantic','retro'], array['late-night-singalong'], array['synth','guitar','live-bass']),
  ('bass-rituals', 'Bass Rituals', 'Sub-heavy rituals bridging dub, techno, and guzheng textures.', 126, 132, 8, 6,
   array['berlin','chengdu'], array['hypnotic','mystic'], array['warehouse','art-installation'], array['guzheng','sub-bass','drones']);

-- Map venue preferences
insert into public.venue_music_preferences (venue_id, attribute_slug, priority, notes)
values
  ('aaaaaaa1-0000-4000-8000-000000000001', 'jade-breaks', 9, 'Peak hour identity.'),
  ('aaaaaaa1-0000-4000-8000-000000000001', 'grime-opera', 7, 'Used for intros.'),
  ('aaaaaaa2-0000-4000-8000-000000000002', 'skyline-amapiano', 8, 'Sunset prime.'),
  ('aaaaaaa2-0000-4000-8000-000000000002', 'dim-sum-disco', 6, 'Weekend brunch crowd.'),
  ('aaaaaaa2-0000-4000-8000-000000000002', 'aqua-ambient', 4, 'Early arrival beds.');

-- Seed user device preferences
insert into public.user_device_preferences (user_id, device_id, preferred_volume, preferred_eq, auto_duck_music, last_used_at)
values
  ('11111111-1111-4111-8111-111111111111', 'ddddddd1-0000-4000-8000-000000000001', 0.72, jsonb_build_object('low','+1.5dB','high','-1dB'), true, now() - interval '10 minutes'),
  ('22222222-2222-4222-8222-222222222222', 'ddddddd3-0000-4000-8000-000000000003', 0.55, jsonb_build_object('warmth','medium'), false, now() - interval '1 day');

-- Listener devices
insert into public.listener_devices (id, user_id, device_label, platform, os_version, capabilities, last_active_at)
values
  ('eeeeeee1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Aurora iPad Booth', 'iPadOS', '17.0.3', array['touch','midi','ble'], now() - interval '30 minutes'),
  ('eeeeeee2-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Sky Vision Pro', 'visionOS', '1.2', array['spatial','voice','xr'], now() - interval '2 hours');

-- Performance sessions
insert into public.performance_sessions (id, venue_id, playlist_id, device_id, created_by, title, status, started_at, ended_at, crowd_size, context, summary)
values
  ('f0000001-0000-4000-8000-000000000001', 'aaaaaaa1-0000-4000-8000-000000000001', 'bbbbbbb1-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111', 'Lotus Voltage – Friday Prime', 'closed', now() - interval '3 hours', now() - interval '2 hours 12 minutes', 520,
   jsonb_build_object('weather','humid','theme','canto-club-night','notes','Incorporated live percussion loopers.'),
   'High-impact Canton bass run recorded for AI curation.'),
  ('f0000002-0000-4000-8000-000000000002', 'aaaaaaa2-0000-4000-8000-000000000002', 'bbbbbbb2-0000-4000-8000-000000000002', 'ddddddd3-0000-4000-8000-000000000003',
   '22222222-2222-4222-8222-222222222222', 'Golden Hour Broadcast', 'live', now() - interval '90 minutes', null, 210,
   jsonb_build_object('weather','clear','theme','sunset-cocktails','notes','Livestreamed to IG + Douyin.'),
   'Nu-disco into amapiano glide focused on global rooftop energy.');

-- Track plays captured for sessions
insert into public.track_plays (session_id, playlist_track_id, source, source_track_id, title, artist, album, genre, started_at, ended_at, duration_ms, bpm, energy, crowd_energy, crowd_sentiment, metadata, ai_notes)
values
  ('f0000001-0000-4000-8000-000000000001',
   (select id from public.playlist_tracks where source_track_id = '3LotusBass001'),
   'spotify', '3LotusBass001', 'Velvet Turbo', 'Faye Wong ft. Conducta', 'Future Lotus', 'canto-ukg',
   now() - interval '2 hours 55 minutes', now() - interval '2 hours 51 minutes', 212000, 130, 0.92, 9, 'glee + surprise',
   jsonb_build_object('transition','ambient-pad-wash','key_lock',true), 'Opened with velvet pads + guzheng FX discussion.'),
  ('f0000001-0000-4000-8000-000000000001',
   (select id from public.playlist_tracks where source_track_id = '3LotusBass002'),
   'spotify', '3LotusBass002', 'Aerial Strobe', 'DJ XU All-Stars', 'Voltage Bloom', 'bassline',
   now() - interval '2 hours 51 minutes', now() - interval '2 hours 47 minutes', 198000, 128, 0.88, 10, 'floor erupted',
   jsonb_build_object('transition','spinback','fx','dub-delay'), 'Used double drop w/ grime acapella; crowd chant logged.'),
  ('f0000002-0000-4000-8000-000000000002',
   (select id from public.playlist_tracks where source_track_id = '3Rooftop001'),
   'spotify', '3Rooftop001', 'Amber Mirage', 'Ama K. & Disclosure', 'Skyline Stories', 'nu-disco',
   now() - interval '75 minutes', now() - interval '71 minutes', 240000, 112, 0.70, 6, 'hands up',
   jsonb_build_object('sunset','true','camera','sony-a7'), 'Narrated pastel clouds + Canton rooftop anecdotes.'),
  ('f0000002-0000-4000-8000-000000000002',
   (select id from public.playlist_tracks where source_track_id = '3Rooftop002'),
   'spotify', '3Rooftop002', 'Palm Wine Circuit', 'Soweto Keys', 'Electric Breeze', 'amapiano',
   now() - interval '71 minutes', now() - interval '66 minutes', 256000, 109, 0.68, 7, 'cheers + singalong',
   jsonb_build_object('log_drum_focus',true,'camera','drone'), 'Layered Vision Pro crowd prompts + air horn swell.');

-- Crowd events captured from listener devices
insert into public.crowd_events (session_id, listener_device_id, event_type, transcript, sentiment, payload, created_by, rag_embedding)
values
  ('f0000001-0000-4000-8000-000000000001', 'eeeeeee1-0000-4000-8000-000000000001', 'voice_command',
   'Give us a grime opera teaser before midnight!', 'excited',
   jsonb_build_object('language','en','accent','hong-kong'), '11111111-1111-4111-8111-111111111111', null),
  ('f0000002-0000-4000-8000-000000000002', 'eeeeeee2-0000-4000-8000-000000000002', 'reaction',
   'Guests waving sunset fans, BPM ok', 'calm',
   jsonb_build_object('emoji','🪘','platform','visionOS'), '33333333-3333-4333-8333-333333333333', null);

-- AI message log stitched to crowd events
insert into public.ai_messages (session_id, crowd_event_id, role, content, metadata, response_ms, rag_embedding)
values
  ('f0000001-0000-4000-8000-000000000001',
   (select id from public.crowd_events where session_id = 'f0000001-0000-4000-8000-000000000001' limit 1),
   'assistant', 'Deploying grime-opera intro with sub-filter sweep in 16 bars.', jsonb_build_object('voice','11labs','language','en'), 820, null),
  ('f0000002-0000-4000-8000-000000000002',
   (select id from public.crowd_events where session_id = 'f0000002-0000-4000-8000-000000000002' limit 1),
   'assistant', 'Holding BPM at 110 while teasing amapiano log drums for the rooftop livestream.', jsonb_build_object('voice','11labs','language','cn'), 640, null);

-- Curated RAG documents + chunks
insert into public.rag_documents (id, source_type, source_id, title, content, metadata, chunk_count)
values
  ('c0000001-0000-4000-8000-000000000001', 'music_attribute_profile', 'skyline-amapiano', 'Skyline Amapiano Playbook',
   'Guidelines for blending amapiano log drums with neo-soul chords during golden hour sessions.', jsonb_build_object('mood','uplifting','tempo_window','104-114'), 2),
  ('c0000002-0000-4000-8000-000000000002', 'venue_story', 'neon-lotus', 'Neon Lotus Crowd Rituals',
   'Notes describing how locals respond to grime opera intros, lion-dance percussion, and guzheng textures.', jsonb_build_object('city','Hong Kong','room','Lotus Main Floor'), 2);

insert into public.rag_chunks (document_id, chunk_index, content, tokens, metadata, embedding)
values
  ('c0000001-0000-4000-8000-000000000001', 0,
   'Open with Rhodes stabs, keep log drums tucked under -6dB until the first crowd cheer.', 52,
   jsonb_build_object('section','intros','language','en'), null),
  ('c0000001-0000-4000-8000-000000000001', 1,
   'Blend Cantonese vocal chops over amapiano shakers when livestream chat spikes.', 44,
   jsonb_build_object('section','mid-set'), null),
  ('c0000002-0000-4000-8000-000000000002', 0,
   'Grime-opera intros work best when paired with sub-filter sweeps and handheld fans distributed on beat.', 58,
   jsonb_build_object('section','intros'), null),
  ('c0000002-0000-4000-8000-000000000002', 1,
   'Lion dance percussion call-and-response calms the crowd after high-intensity bass drops.', 49,
   jsonb_build_object('section','recovery'), null);

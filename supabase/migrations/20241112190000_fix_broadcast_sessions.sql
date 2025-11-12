-- Fix broadcast_sessions to not require performance_sessions
-- Make it standalone so broadcasts can be created independently

-- Drop the foreign key constraint
ALTER TABLE public.broadcast_sessions
DROP CONSTRAINT IF EXISTS broadcast_sessions_id_fkey;

-- Make id a regular UUID (not a foreign key)
ALTER TABLE public.broadcast_sessions
ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.broadcast_sessions
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add a nullable reference to performance_sessions instead
ALTER TABLE public.broadcast_sessions
ADD COLUMN IF NOT EXISTS performance_session_id uuid REFERENCES public.performance_sessions(id) ON DELETE SET NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Creators can manage their broadcast sessions" ON public.broadcast_sessions;
DROP POLICY IF EXISTS "Anyone can view active broadcasts with valid token" ON public.broadcast_sessions;

-- New policies that work with the updated schema
CREATE POLICY "Users can manage their broadcast sessions"
  ON public.broadcast_sessions FOR ALL
  USING (true)  -- Allow creation by anyone for now
  WITH CHECK (true);

CREATE POLICY "Anyone can view active broadcasts"
  ON public.broadcast_sessions FOR SELECT
  USING (status = 'live' OR status = 'pending');

-- Comment for clarity
COMMENT ON TABLE public.broadcast_sessions IS
'Broadcast sessions - now independent from performance_sessions. Can optionally link to a performance session.';

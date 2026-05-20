-- Create League Profile Icon verification table
-- Tracks active verification sessions for players linking their Riot account

CREATE TABLE IF NOT EXISTS public.riot_verifications (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  game_name text NOT NULL,
  tag_line text NOT NULL,
  region text NOT NULL,
  required_icon_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.riot_verifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to allow clean migrations
DROP POLICY IF EXISTS "Users can view their own verification" ON public.riot_verifications;
DROP POLICY IF EXISTS "Users can manage their own verification" ON public.riot_verifications;

-- Create secure policies
CREATE POLICY "Users can view their own verification" 
  ON public.riot_verifications FOR SELECT 
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own verification" 
  ON public.riot_verifications FOR ALL 
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

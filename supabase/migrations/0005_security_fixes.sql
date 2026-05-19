-- Hardening Row-Level Security Policies, Database Indexes, and Uniqueness Constraints

-- 1. Draft Tournaments Visibility Policy (Finding #3)
DROP POLICY IF EXISTS "Published tournaments are public" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments visibility" ON public.tournaments;
CREATE POLICY "Tournaments visibility" ON public.tournaments
  FOR SELECT
  USING (
    status != 'draft'  -- Anyone can see published tournaments
    OR owner_id = auth.uid()  -- Only owner can see own drafts
  );

-- 2. Match Results RLS Policies (Finding #4)
DROP POLICY IF EXISTS "Results visible" ON public.match_results;
DROP POLICY IF EXISTS "Captains submit results" ON public.match_results;
DROP POLICY IF EXISTS "Tournament owners confirm results" ON public.match_results;
DROP POLICY IF EXISTS "Players can submit results for their matches" ON public.match_results;
DROP POLICY IF EXISTS "Tournament admins can confirm results" ON public.match_results;
DROP POLICY IF EXISTS "Players can view submitted results" ON public.match_results;

CREATE POLICY "Players can submit results for their matches" ON public.match_results
  FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE (t.id = m.team_a_id OR t.id = m.team_b_id)
        AND t.captain_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tournament admins can confirm results" ON public.match_results
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Players can view submitted results" ON public.match_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (
        m.team_a_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        OR m.team_b_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_id
      AND t.owner_id = auth.uid()
    )
  );

-- 3. Friends RLS Visibility Policy (Finding #8)
DROP POLICY IF EXISTS "Users can view their own friends" ON public.friends;
DROP POLICY IF EXISTS "Users view accepted friends" ON public.friends;
DROP POLICY IF EXISTS "Users view their pending friend requests" ON public.friends;

CREATE POLICY "Users view accepted friends" ON public.friends
    FOR SELECT
    USING (
      (auth.uid() = user_id OR auth.uid() = friend_id)
      AND status = 'accepted'
    );

CREATE POLICY "Users view their pending friend requests" ON public.friends
    FOR SELECT
    USING (
      (auth.uid() = friend_id AND status = 'pending')
      OR (auth.uid() = user_id)
    );

-- 4. Database Indexes for Scaling (Finding #12)
CREATE INDEX IF NOT EXISTS idx_teams_captain_id ON public.teams(captain_id);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id 
  ON public.tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_id 
  ON public.tournament_participants(team_id);

CREATE INDEX IF NOT EXISTS idx_queue_entries_user_tournament 
  ON public.queue_entries(user_id, tournament_id);

CREATE INDEX IF NOT EXISTS idx_friends_status 
  ON public.friends(status) WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_match_results_match_status 
  ON public.match_results(match_id, status);

CREATE INDEX IF NOT EXISTS idx_matches_bracket_tournament 
  ON public.matches(bracket_id, tournament_id);

-- 5. Case-Insensitive Team Name Unique Index (Finding #13)
CREATE UNIQUE INDEX IF NOT EXISTS unique_team_name_lower_idx ON public.teams (LOWER(name));

-- 6. Storage Bucket Logo Path Hardening (Finding #11)
DROP POLICY IF EXISTS "Authenticated users upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload team logos to their own folder" ON storage.objects;
CREATE POLICY "Authenticated users upload team logos to their own folder" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'team-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

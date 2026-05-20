-- Add Riot Games Tournament Code integration to Matches schema
-- Idempotent column and index additions

ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_code text;

CREATE INDEX IF NOT EXISTS matches_tournament_code_idx ON matches(tournament_code);

-- Support customizable regions and maps
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS region text DEFAULT 'EUW';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS map_type text DEFAULT 'SUMMONERS_RIFT';

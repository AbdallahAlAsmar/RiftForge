export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: [];
};

export type UserRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  region: string;
  rank: string | null;
  tsr: number;
  preferred_roles: string[];
  created_at: string;
  updated_at: string;
};

export type RiotAccountRow = {
  id: string;
  user_id: string;
  puuid: string;
  game_name: string;
  tag_line: string;
  profile_icon_url: string | null;
  region: string;
  created_at: string;
  updated_at: string;
};

export type TournamentRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "check_in" | "live" | "completed" | "cancelled";
  format: "single_elimination" | "double_elimination";
  max_teams: number;
  team_size: number;
  min_rank: string | null;
  max_rank: string | null;
  starts_at: string | null;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentParticipantRow = {
  id: string;
  tournament_id: string;
  user_id: string;
  team_id: string | null;
  participant_type: "player" | "admin";
  checked_in_at: string | null;
  created_at: string;
};

export type TeamRow = {
  id: string;
  tournament_id: string | null;
  captain_id: string;
  name: string;
  logo_url: string | null;
  average_tsr: number;
  source: "premade" | "solo_duo_generated";
  created_at: string;
  updated_at: string;
};

export type TeamMemberRow = {
  id: string;
  team_id: string;
  user_id: string;
  role: string | null;
  is_captain: boolean;
  joined_at: string;
};

export type InviteRow = {
  id: string;
  team_id: string;
  invited_user_id: string | null;
  invited_by: string;
  email: string | null;
  token: string;
  status: "pending" | "accepted" | "declined" | "expired";
  expires_at: string;
  created_at: string;
};

export type QueueEntryRow = {
  id: string;
  tournament_id: string;
  user_id: string;
  partner_user_id: string | null;
  mode: "solo" | "duo";
  preferred_roles: string[];
  tsr: number;
  status: "queued" | "assigned" | "cancelled";
  created_at: string;
};

export type BracketRow = {
  id: string;
  tournament_id: string;
  type: "single" | "upper" | "lower" | "grand_final";
  created_at: string;
};

export type MatchRow = {
  id: string;
  tournament_id: string;
  bracket_id: string;
  round: number;
  position: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  status: "pending" | "ready" | "reported" | "confirmed";
  next_match_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchResultRow = {
  id: string;
  match_id: string;
  submitted_by: string;
  winner_team_id: string;
  notes: string | null;
  status: "submitted" | "confirmed" | "rejected";
  created_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
};

export type FriendRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      [key: string]: Table<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;
      users: Table<UserRow, Partial<UserRow> & { id: string }>;
      riot_accounts: Table<
        RiotAccountRow,
        Partial<RiotAccountRow> & {
          user_id: string;
          puuid: string;
          game_name: string;
          tag_line: string;
        }
      >;
      tournaments: Table<
        TournamentRow,
        Partial<TournamentRow> & { owner_id: string; name: string; slug: string }
      >;
      tournament_participants: Table<
        TournamentParticipantRow,
        Partial<TournamentParticipantRow> & { tournament_id: string; user_id: string }
      >;
      teams: Table<TeamRow, Partial<TeamRow> & { captain_id: string; name: string }>;
      team_members: Table<
        TeamMemberRow,
        Partial<TeamMemberRow> & { team_id: string; user_id: string }
      >;
      invites: Table<InviteRow, Partial<InviteRow> & { team_id: string; invited_by: string }>;
      queue_entries: Table<
        QueueEntryRow,
        Partial<QueueEntryRow> & { tournament_id: string; user_id: string }
      >;
      brackets: Table<
        BracketRow,
        Partial<BracketRow> & { tournament_id: string; type: BracketRow["type"] }
      >;
      matches: Table<
        MatchRow,
        Partial<MatchRow> & {
          tournament_id: string;
          bracket_id: string;
          round: number;
          position: number;
        }
      >;
      match_results: Table<
        MatchResultRow,
        Partial<MatchResultRow> & {
          match_id: string;
          submitted_by: string;
          winner_team_id: string;
        }
      >;
      friends: Table<
        FriendRow,
        Partial<FriendRow> & { user_id: string; friend_id: string; status: FriendRow["status"] }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tournament_status: TournamentRow["status"];
      tournament_format: TournamentRow["format"];
      team_source: TeamRow["source"];
      queue_mode: QueueEntryRow["mode"];
      queue_status: QueueEntryRow["status"];
      bracket_type: BracketRow["type"];
      match_status: MatchRow["status"];
      result_status: MatchResultRow["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

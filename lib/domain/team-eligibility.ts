import { rankLabel, rankTsr, type Rank } from "@/lib/domain/ranks";

export type TeamEligibilityIssue =
  | {
      type: "incomplete_roster";
      memberCount: number;
    }
  | {
      type: "rank_missing";
      memberIndex: number;
      memberName: string;
    }
  | {
      type: "rank_too_low";
      memberIndex: number;
      memberName: string;
      memberRank: string;
      minRank: string;
    }
  | {
      type: "rank_too_high";
      memberIndex: number;
      memberName: string;
      memberRank: string;
      maxRank: string;
    };

export interface TeamWithMembers {
  id: string;
  name: string;
  logo_url: string | null;
  average_tsr: number;
  captain_id: string;
  team_members: Array<{
    user_id: string;
    users:
      | {
          display_name: string | null;
          rank: string | null;
        }
      | Array<{
          display_name: string | null;
          rank: string | null;
        }>
      | null;
  }>;
}

function rankValue(rank: string | null | undefined) {
  if (!rank) return null;
  const normalized = rank.toLowerCase() as Rank;
  return normalized in rankTsr ? rankTsr[normalized] : null;
}

function firstProfile(
  users: TeamWithMembers["team_members"][number]["users"]
): { display_name: string | null; rank: string | null } | null {
  if (!users) return null;
  return Array.isArray(users) ? (users[0] ?? null) : users;
}

export function checkTeamEligibility(
  team: TeamWithMembers,
  minRank?: string | null,
  maxRank?: string | null
): TeamEligibilityIssue[] {
  const issues: TeamEligibilityIssue[] = [];
  const members = team.team_members ?? [];

  if (members.length !== 5) {
    issues.push({ type: "incomplete_roster", memberCount: members.length });
  }

  const minRankValue = rankValue(minRank);
  const maxRankValue = rankValue(maxRank);

  if (minRankValue === null && maxRankValue === null) {
    return issues;
  }

  for (const [index, member] of members.entries()) {
    const profile = firstProfile(member.users);
    const displayName = profile?.display_name?.trim() || `Player ${index + 1}`;
    const memberRank = profile?.rank ?? null;
    const memberRankValue = rankValue(memberRank);
    if (memberRankValue === null) {
      issues.push({
        type: "rank_missing",
        memberIndex: index + 1,
        memberName: displayName
      });
      continue;
    }
    const eligibleMemberRank = memberRank ?? "Unknown";
    if (minRankValue !== null && memberRankValue < minRankValue) {
      issues.push({
        type: "rank_too_low",
        memberIndex: index + 1,
        memberName: displayName,
        memberRank: eligibleMemberRank,
        minRank: minRank ?? "Unknown"
      });
    }
    if (maxRankValue !== null && memberRankValue > maxRankValue) {
      issues.push({
        type: "rank_too_high",
        memberIndex: index + 1,
        memberName: displayName,
        memberRank: eligibleMemberRank,
        maxRank: maxRank ?? "Unknown"
      });
    }
  }

  return issues;
}

export function formatTeamEligibilityIssue(issue: TeamEligibilityIssue) {
  switch (issue.type) {
    case "incomplete_roster":
      return `Team has ${issue.memberCount}/5 players.`;
    case "rank_missing":
      return `${issue.memberName} (Player ${issue.memberIndex}) has no rank set.`;
    case "rank_too_low":
      return `${issue.memberName} (Player ${issue.memberIndex}) is ${rankLabel(issue.memberRank)} but minimum is ${rankLabel(issue.minRank)}.`;
    case "rank_too_high":
      return `${issue.memberName} (Player ${issue.memberIndex}) is ${rankLabel(issue.memberRank)} but maximum is ${rankLabel(issue.maxRank)}.`;
    default:
      return "Team is not eligible.";
  }
}

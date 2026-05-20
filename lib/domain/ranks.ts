export const rankTsr = {
  iron: 100,
  bronze: 200,
  silver: 300,
  gold: 450,
  platinum: 650,
  emerald: 850,
  diamond: 1100,
  master: 1500,
  grandmaster: 1850,
  challenger: 2200
} as const;

export type Rank = keyof typeof rankTsr;

export const rankOptions = Object.keys(rankTsr) as Rank[];

export function tsrForRank(rank: string | null | undefined) {
  const normalized = rank?.toLowerCase() as Rank | undefined;
  return normalized && normalized in rankTsr ? rankTsr[normalized] : rankTsr.silver;
}

export function normalizeRank(rank: string | null | undefined): Rank | null {
  if (!rank) return null;

  const normalized = rank.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "grand") return "grandmaster";
  if (normalized in rankTsr) return normalized as Rank;

  return null;
}

export function rankLabel(rank: string | null | undefined) {
  if (!rank) return "Unranked";
  return rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
}

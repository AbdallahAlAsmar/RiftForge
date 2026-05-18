export const rankTsr = {
  iron: 100,
  bronze: 200,
  silver: 300,
  gold: 450,
  platinum: 650,
  emerald: 850,
  diamond: 1100,
  master: 1500,
  grandmaster: 1500,
  challenger: 1500
} as const;

export type Rank = keyof typeof rankTsr;

export const rankOptions = Object.keys(rankTsr) as Rank[];

export function tsrForRank(rank: string | null | undefined) {
  const normalized = rank?.toLowerCase() as Rank | undefined;
  return normalized && normalized in rankTsr ? rankTsr[normalized] : rankTsr.silver;
}

export function rankLabel(rank: string | null | undefined) {
  if (!rank) return "Unranked";
  return rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
}

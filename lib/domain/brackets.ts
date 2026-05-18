export type SeedTeam = {
  id: string;
  name: string;
  average_tsr: number;
};

export type GeneratedMatch = {
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  nextRound: number | null;
  nextPosition: number | null;
  status: "pending" | "ready" | "confirmed";
  winnerTeamId?: string | null;
};

export function generateSingleEliminationBracket(teams: SeedTeam[]): GeneratedMatch[] {
  const seeded = seedByStrength(teams);
  const bracketSize = nextPowerOfTwo(Math.max(seeded.length, 2));
  const slots = Array.from({ length: bracketSize }, (_, index) => seeded[index] ?? null);
  const rounds = Math.log2(bracketSize);
  const matches: GeneratedMatch[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = bracketSize / 2 ** round;

    for (let position = 1; position <= matchCount; position += 1) {
      const isFirstRound = round === 1;
      const slotIndex = (position - 1) * 2;
      const teamA = isFirstRound ? slots[slotIndex] : null;
      const teamB = isFirstRound ? slots[slotIndex + 1] : null;
      const byeWinner = teamA && !teamB ? teamA.id : teamB && !teamA ? teamB.id : null;

      matches.push({
        round,
        position,
        teamAId: teamA?.id ?? null,
        teamBId: teamB?.id ?? null,
        nextRound: round < rounds ? round + 1 : null,
        nextPosition: round < rounds ? Math.ceil(position / 2) : null,
        status: byeWinner ? "confirmed" : teamA && teamB ? "ready" : "pending",
        winnerTeamId: byeWinner
      });
    }
  }

  return matches;
}

export function seedByStrength(teams: SeedTeam[]) {
  const sorted = [...teams].sort((a, b) => b.average_tsr - a.average_tsr);
  const bracketSize = nextPowerOfTwo(Math.max(sorted.length, 2));
  const seedOrder = buildSeedOrder(bracketSize);

  return seedOrder.map((seed) => sorted[seed - 1]).filter(Boolean);
}

function buildSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  return order;
}

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(value));
}

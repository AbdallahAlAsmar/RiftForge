export type Role = "top" | "jungle" | "mid" | "bot" | "support" | "fill";

export type QueuePlayer = {
  userId: string;
  displayName: string;
  tsr: number;
  preferredRoles: Role[];
};

export type QueueEntryForBalance = {
  id: string;
  mode: "solo" | "duo";
  user: QueuePlayer;
  partner?: QueuePlayer | null;
};

export type GeneratedTeam = {
  name: string;
  averageTsr: number;
  players: Array<QueuePlayer & { assignedRole: Role }>;
};

type PlayerBlock = {
  players: QueuePlayer[];
  totalTsr: number;
};

const standardRoles: Role[] = ["top", "jungle", "mid", "bot", "support"];

export function buildBalancedTeams(entries: QueueEntryForBalance[], teamSize = 5): GeneratedTeam[] {
  const blocks = entries
    .filter((entry) => entry.user)
    .map<PlayerBlock>((entry) => {
      const players = entry.partner ? [entry.user, entry.partner] : [entry.user];
      return {
        players,
        totalTsr: players.reduce((sum, player) => sum + player.tsr, 0)
      };
    })
    .sort((a, b) => b.totalTsr - a.totalTsr);

  const playerCount = blocks.reduce((sum, block) => sum + block.players.length, 0);
  const teamCount = Math.floor(playerCount / teamSize);
  const teams: PlayerBlock[] = Array.from({ length: teamCount }, () => ({ players: [], totalTsr: 0 }));

  for (const block of blocks) {
    const target = teams
      .filter((team) => team.players.length + block.players.length <= teamSize)
      .sort((a, b) => scoreTeamFit(a, block) - scoreTeamFit(b, block))[0];

    if (!target) continue;

    target.players.push(...block.players);
    target.totalTsr += block.totalTsr;
  }

  return teams
    .filter((team) => team.players.length === teamSize)
    .map((team, index) => {
      const players = assignRoles(team.players);
      return {
        name: `Generated Team ${index + 1}`,
        averageTsr: Math.round(team.totalTsr / team.players.length),
        players
      };
    });
}

function scoreTeamFit(team: PlayerBlock, block: PlayerBlock) {
  const projectedTsr = team.totalTsr + block.totalTsr;
  const projectedSize = team.players.length + block.players.length;
  const rolePenalty = roleOverlapPenalty([...team.players, ...block.players]);

  return projectedTsr / Math.max(projectedSize, 1) + rolePenalty;
}

function roleOverlapPenalty(players: QueuePlayer[]) {
  const counts = new Map<Role, number>();
  for (const player of players) {
    const role = firstRealRole(player.preferredRoles);
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return [...counts.values()].reduce((penalty, count) => penalty + Math.max(0, count - 1) * 80, 0);
}

function firstRealRole(roles: Role[]) {
  return roles.find((role) => role !== "fill") ?? "fill";
}

function assignRoles(players: QueuePlayer[]) {
  const available = new Set<Role>(standardRoles);
  const assignments = new Map<string, Role>();

  const sorted = [...players].sort((a, b) => a.preferredRoles.length - b.preferredRoles.length);

  for (const player of sorted) {
    const role = player.preferredRoles.find((preferred) => available.has(preferred));
    if (role) {
      assignments.set(player.userId, role);
      available.delete(role);
    }
  }

  for (const player of sorted) {
    if (assignments.has(player.userId)) continue;
    const nextRole = available.values().next().value ?? "fill";
    assignments.set(player.userId, nextRole);
    available.delete(nextRole);
  }

  return players.map((player) => ({
    ...player,
    assignedRole: assignments.get(player.userId) ?? "fill"
  }));
}

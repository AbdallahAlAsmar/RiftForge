// Riot Games Tournament API Client (tournament-v5, match-v5, account-v1)
// Implements automated rate-limit backing off and resilient local Mock fallbacks.

const RIOT_API_BASE = "https://europe.api.riotgames.com"; // Regional routing gateway for Europe (change as per preference)
const MOCK_ENABLED = !process.env.RIOT_API_KEY || process.env.RIOT_DEV_MOCK === "true";

type RiotRequestOptions = {
  retries?: number;
  backoffMs?: number;
};

/**
 * Perform a rate-limit safe, authenticated call to Riot API.
 * Automatically parses Retry-After headers on 429 and backs off.
 */
async function riotRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  config: RiotRequestOptions = { retries: 3, backoffMs: 1000 },
  host = RIOT_API_BASE
): Promise<T | null> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    console.warn("[Riot API Client] No API Key set. Running in Mock fallback mode.");
    return null;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${host}${endpoint}`;
  const headers = {
    ...options.headers,
    "X-Riot-Token": apiKey,
    "Content-Type": "application/json"
  };

  try {
    const res = await fetch(url, { ...options, headers, cache: "no-store" });

    // Handle Rate Limiting (HTTP 429)
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2;
      console.warn(`[Riot API 429] Rate Limit Exceeded. Backing off for ${waitSeconds} seconds...`);

      if ((config.retries ?? 0) > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
        return riotRequest<T>(endpoint, options, {
          retries: (config.retries ?? 1) - 1,
          backoffMs: (config.backoffMs ?? 1000) * 2
        });
      }
      throw new Error("Riot API rate limit retries exhausted.");
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Riot API Error] Endpoint ${endpoint} failed (${res.status}):`, errText);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error(`[Riot API Client Exception] Call to ${endpoint} failed:`, err);
    return null;
  }
}

/**
 * 1. Register a Tournament Provider
 * Endpoint: POST /lol/tournament/v5/providers
 */
export async function registerTournamentProvider(callbackUrl: string, region = "EUW"): Promise<number> {
  if (MOCK_ENABLED) {
    console.log("[Riot API Mock] Registered provider for region:", region);
    return 9999; // Mock provider ID
  }

  const res = await riotRequest<{ id: number }>("/lol/tournament/v5/providers", {
    method: "POST",
    body: JSON.stringify({
      url: callbackUrl,
      region: region.toUpperCase()
    })
  });

  return res?.id ?? 9999;
}

/**
 * 2. Register a Tournament
 * Endpoint: POST /lol/tournament/v5/tournaments
 */
export async function registerTournament(providerId: number, tournamentName: string): Promise<number> {
  if (MOCK_ENABLED) {
    console.log("[Riot API Mock] Registered tournament:", tournamentName);
    return 8888; // Mock tournament ID
  }

  const res = await riotRequest<{ id: number }>("/lol/tournament/v5/tournaments", {
    method: "POST",
    body: JSON.stringify({
      name: tournamentName,
      providerId
    })
  });

  return res?.id ?? 8888;
}

/**
 * 3. Generate Tournament Code
 * Endpoint: POST /lol/tournament/v5/codes
 */
export async function generateTournamentCode(
  tournamentId: number,
  matchId: string,
  teamSize = 5,
  region = "EUW",
  mapType = "SUMMONERS_RIFT"
): Promise<string> {
  const normalizedRegion = region.toUpperCase();
  const normalizedMap = mapType === "HOWLING_ABYSS" ? "HOWLING_ABYSS" : "SUMMONERS_RIFT";

  if (MOCK_ENABLED) {
    const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const mockCode = `MOCK-${normalizedRegion}-${normalizedMap === "HOWLING_ABYSS" ? "HA" : "SR"}-${matchId.split("-")[0].toUpperCase()}-${randomHash}`;
    console.log(`[Riot API Mock] Generated tournament code for match ${matchId}:`, mockCode);
    return mockCode;
  }

  const res = await riotRequest<string[]>(`/lol/tournament/v5/codes?tournamentId=${tournamentId}&count=1`, {
    method: "POST",
    body: JSON.stringify({
      mapType: normalizedMap,
      pickType: "TOURNAMENT_DRAFT",
      spectatorType: "ALL",
      teamSize,
      metadata: JSON.stringify({ matchId })
    })
  });

  return res?.[0] ?? `ERR-CODE-FALLBACK-${matchId.slice(0, 6)}`;
}

/**
 * 4. Get Match Stats
 * Endpoint: GET /lol/match/v5/matches/{matchId}
 */
export async function getMatchStats(matchId: string): Promise<any | null> {
  if (MOCK_ENABLED) {
    console.log("[Riot API Mock] Retrieving mock match stats for:", matchId);
    return {
      metadata: { matchId },
      info: {
        gameMode: "CLASSIC",
        gameId: 1234567890,
        participants: []
      }
    };
  }

  return riotRequest<any>(`/lol/match/v5/matches/${matchId}`);
}

/**
 * 5. Get Summoner PUUID and Active Profile Icon ID
 * Calls Riot Account-v1 to fetch PUUID, then Summoner-v4 to get current in-game Profile Icon ID.
 */
export async function getSummonerProfileIconId(
  gameName: string,
  tagLine: string,
  region: string
): Promise<{ puuid: string; profileIconId: number } | null> {
  const normRegion = region.toUpperCase();

  if (MOCK_ENABLED) {
    console.log(`[Riot API Mock] getSummonerProfileIconId for ${gameName}#${tagLine} (${normRegion})`);
    return {
      puuid: `mock-puuid-${gameName.toLowerCase()}-${tagLine.toLowerCase()}`,
      profileIconId: 28 // Emulate correct matching default starter icon
    };
  }

  // 1. Regional Routing for Account-v1
  const regionalRouter = ["NA", "BR", "LAN", "LAS", "OCE"].includes(normRegion)
    ? "americas"
    : ["KR", "JP"].includes(normRegion)
      ? "asia"
      : "europe";

  const accountHost = `https://${regionalRouter}.api.riotgames.com`;
  const accountUrl = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

  console.log(`[Riot Account API] Resolving ${gameName}#${tagLine} on ${regionalRouter}...`);
  const accountRes = await riotRequest<{ puuid: string }>(accountUrl, {}, { retries: 3 }, accountHost);
  if (!accountRes?.puuid) {
    console.warn(`[Riot Account API] Summoner ${gameName}#${tagLine} not found.`);
    return null;
  }

  // 2. Platform Routing for Summoner-v4
  const platformMap: Record<string, string> = {
    EUW: "euw1",
    EUNE: "eun1",
    NA: "na1",
    KR: "kr",
    BR: "br1",
    LAN: "la1",
    LAS: "la2",
    OCE: "oc1",
    TR: "tr1",
    RU: "ru",
    JP: "jp1"
  };
  const platformRouter = platformMap[normRegion] || "euw1";
  const summonerHost = `https://${platformRouter}.api.riotgames.com`;
  const summonerUrl = `/lol/summoner/v4/summoners/by-puuid/${accountRes.puuid}`;

  console.log(`[Riot Summoner API] Fetching Profile Icon for PUUID ${accountRes.puuid} on ${platformRouter}...`);
  const summonerRes = await riotRequest<{ profileIconId: number }>(summonerUrl, {}, { retries: 3 }, summonerHost);
  if (!summonerRes || typeof summonerRes.profileIconId !== "number") {
    console.warn(`[Riot Summoner API] Failed to fetch summoner info for PUUID ${accountRes.puuid}`);
    return null;
  }

  return {
    puuid: accountRes.puuid,
    profileIconId: summonerRes.profileIconId
  };
}

/**
 * 6. Get Summoner League Rank
 * Calls Summoner-v4 and League-v4 to fetch summoner's current solo queue tier rank.
 */
export async function getSummonerLeagueRank(
  puuid: string,
  region: string
): Promise<string | null> {
  const normRegion = region.toUpperCase();

  if (MOCK_ENABLED || puuid.startsWith("mock-")) {
    console.log(`[Riot API Mock] getSummonerLeagueRank for PUUID: ${puuid} (${normRegion})`);
    return "diamond"; // Emulate Diamond rank in mock mode
  }

  const platformMap: Record<string, string> = {
    EUW: "euw1",
    EUNE: "eun1",
    NA: "na1",
    KR: "kr",
    BR: "br1",
    LAN: "la1",
    LAS: "la2",
    OCE: "oc1",
    TR: "tr1",
    RU: "ru",
    JP: "jp1"
  };
  const platformRouter = platformMap[normRegion] || "euw1";
  const platformHost = `https://${platformRouter}.api.riotgames.com`;

  // Step A: Get encryptedSummonerId
  const summonerUrl = `/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const summonerRes = await riotRequest<{ id: string }>(summonerUrl, {}, { retries: 3 }, platformHost);
  if (!summonerRes?.id) {
    console.warn(`[Riot Summoner API] Failed to fetch summoner info for rank verification. Falling back to unranked.`);
    return "unranked";
  }

  // Step B: Query League Entries
  const leagueUrl = `/lol/league/v4/entries/by-summoner/${summonerRes.id}`;
  const leagueEntries = await riotRequest<Array<{ queueType: string; tier: string }>>(
    leagueUrl,
    {},
    { retries: 3 },
    platformHost
  );

  if (!leagueEntries || !Array.isArray(leagueEntries)) {
    console.warn(`[Riot League API] Failed to fetch league entries for Summoner ${summonerRes.id}. Falling back to unranked.`);
    return "unranked";
  }

  // Look for Solo/Duo rank first, fallback to Flex rank, fallback to first entry
  const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5");
  const flexEntry = leagueEntries.find((e) => e.queueType === "RANKED_FLEX_5x5");
  const activeEntry = soloEntry || flexEntry || leagueEntries[0];

  if (!activeEntry?.tier) {
    return "unranked"; // Default rank if unranked or no entries found
  }

  return activeEntry.tier.toLowerCase();
}

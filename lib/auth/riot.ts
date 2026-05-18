import crypto from "node:crypto";

export type RiotIdentity = {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconUrl: string | null;
  region: string;
};

const riotAuthorizeUrl = "https://auth.riotgames.com/authorize";
const riotTokenUrl = "https://auth.riotgames.com/token";
const riotUserInfoUrl = "https://auth.riotgames.com/userinfo";

function getRequiredRiotEnv(
  key: "RIOT_CLIENT_ID" | "RIOT_CLIENT_SECRET" | "RIOT_REDIRECT_URI"
) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
}

export function isRiotMockEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.RIOT_DEV_MOCK === "true";
}

export function getMockRiotIdentity(): RiotIdentity {
  const gameName = process.env.RIOT_DEV_MOCK_GAME_NAME?.trim() || "DevSummoner";
  const tagLine = (process.env.RIOT_DEV_MOCK_TAG_LINE?.trim() || "EUW").toUpperCase();
  const puuid = crypto
    .createHash("sha256")
    .update(`mock-riot:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`)
    .digest("hex");

  return {
    puuid,
    gameName,
    tagLine,
    profileIconUrl: null,
    region: tagLine
  };
}

export function getRiotAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getRequiredRiotEnv("RIOT_CLIENT_ID"),
    redirect_uri: getRequiredRiotEnv("RIOT_REDIRECT_URI"),
    response_type: "code",
    scope: "openid",
    state
  });

  return `${riotAuthorizeUrl}?${params.toString()}`;
}

export async function exchangeRiotCode(code: string): Promise<RiotIdentity> {
  const clientId = getRequiredRiotEnv("RIOT_CLIENT_ID");
  const clientSecret = getRequiredRiotEnv("RIOT_CLIENT_SECRET");
  const redirectUri = getRequiredRiotEnv("RIOT_REDIRECT_URI");
  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const tokenResponse = await fetch(riotTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    throw new Error("Riot OAuth token exchange failed.");
  }

  const token = (await tokenResponse.json()) as { access_token: string };
  const userInfoResponse = await fetch(riotUserInfoUrl, {
    headers: {
      Authorization: `Bearer ${token.access_token}`
    }
  });

  if (!userInfoResponse.ok) {
    throw new Error("Riot user profile request failed.");
  }

  const userInfo = (await userInfoResponse.json()) as {
    sub: string;
    acct?: { game_name?: string; tag_line?: string };
  };

  return {
    puuid: userInfo.sub,
    gameName: userInfo.acct?.game_name ?? "Summoner",
    tagLine: userInfo.acct?.tag_line ?? "EUW",
    profileIconUrl: null,
    region: userInfo.acct?.tag_line?.toUpperCase() ?? "EUW"
  };
}

export function riotBridgeEmail(puuid: string) {
  return `${puuid.toLowerCase()}@riot.local`;
}

export function riotBridgePassword(puuid: string) {
  const secret = process.env.APP_AUTH_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("APP_AUTH_SECRET must be configured with a strong random value.");
  }

  return crypto.createHmac("sha256", secret).update(`riot:${puuid}`).digest("hex");
}

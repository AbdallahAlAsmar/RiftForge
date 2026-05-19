import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeRiotCode,
  getMockRiotIdentity,
  isRiotMockEnabled,
  riotBridgeEmail,
  riotBridgePassword
} from "@/lib/auth/riot";
import { tsrForRank } from "@/lib/domain/ranks";
import { rateLimit } from "@/lib/rate-limit";

function sanitizeInternalPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return "/tournaments";
  return pathname;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(ip, 10, 60 * 1000)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("riot_oauth_state")?.value;
  const oauthMode = cookieStore.get("riot_oauth_mode")?.value === "link" ? "link" : "signin";
  const linkUserId = cookieStore.get("riot_oauth_link_user_id")?.value;
  const nextPath = sanitizeInternalPath(cookieStore.get("riot_oauth_next")?.value ?? null);

  const clearOauthCookies = () => {
    cookieStore.delete("riot_oauth_state");
    cookieStore.delete("riot_oauth_mode");
    cookieStore.delete("riot_oauth_link_user_id");
    cookieStore.delete("riot_oauth_next");
  };

  if (!code || !state || state !== expectedState) {
    clearOauthCookies();
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }

  try {
    const riot =
      isRiotMockEnabled() && code === "dev_mock_code"
        ? getMockRiotIdentity()
        : await exchangeRiotCode(code);
    const password = riotBridgePassword(riot.puuid);
    const admin = createAdminClient();
    const supabase = await createClient();

    const { data: existingAccount } = await admin
      .from("riot_accounts")
      .select("user_id")
      .eq("puuid", riot.puuid)
      .maybeSingle();

    if (oauthMode === "link") {
      const {
        data: { user: sessionUser }
      } = await supabase.auth.getUser();
      if (!sessionUser || !linkUserId || sessionUser.id !== linkUserId) {
        clearOauthCookies();
        return NextResponse.redirect(new URL("/profile?riot=link_failed", request.url));
      }
      if (existingAccount?.user_id && existingAccount.user_id !== linkUserId) {
        clearOauthCookies();
        return NextResponse.redirect(new URL("/profile?riot=already_linked", request.url));
      }

      await admin.from("users").upsert(
        {
          id: linkUserId,
          display_name: sessionUser.user_metadata?.full_name ?? sessionUser.email?.split("@")[0] ?? "Player",
          region: riot.region,
          tsr: tsrForRank(null)
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      await admin.from("riot_accounts").upsert(
        {
          user_id: linkUserId,
          puuid: riot.puuid,
          game_name: riot.gameName,
          tag_line: riot.tagLine,
          profile_icon_url: riot.profileIconUrl,
          region: riot.region
        },
        { onConflict: "puuid" }
      );

      clearOauthCookies();
      return NextResponse.redirect(new URL("/profile?riot=linked", request.url));
    }

    const bridgeEmail = riotBridgeEmail(riot.puuid);
    let userId = existingAccount?.user_id;
    let email = bridgeEmail;

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: bridgeEmail,
        password,
        email_confirm: true,
        user_metadata: {
          provider: "riot",
          puuid: riot.puuid,
          riot_name: riot.gameName,
          riot_tagline: riot.tagLine
        }
      });

      if (error) throw error;
      userId = data.user.id;
    } else {
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId);
      if (authUserError) throw authUserError;
      email = authUser.user.email ?? bridgeEmail;
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true
      });
      if (updateAuthError) throw updateAuthError;
    }

    await admin.from("users").upsert(
      {
        id: userId,
        display_name: `${riot.gameName}#${riot.tagLine}`,
        avatar_url: riot.profileIconUrl,
        region: riot.region,
        tsr: tsrForRank(null)
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    await admin.from("riot_accounts").upsert(
      {
        user_id: userId,
        puuid: riot.puuid,
        game_name: riot.gameName,
        tag_line: riot.tagLine,
        profile_icon_url: riot.profileIconUrl,
        region: riot.region
      },
      { onConflict: "puuid" }
    );

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    clearOauthCookies();
    return NextResponse.redirect(new URL(nextPath, request.url));
  } catch (error) {
    console.error(error);
    clearOauthCookies();
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }
}

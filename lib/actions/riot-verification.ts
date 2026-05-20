"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import { getSummonerProfileIconId, getSummonerLeagueRank } from "@/lib/riot-tournament";
import { tsrForRank } from "@/lib/domain/ranks";
import { formString } from "./common";

// Predefined set of common starter profile icons that all LoL accounts possess
const STARTER_ICONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21, 22, 23, 24, 25, 26, 27, 28];

/**
 * 1. Initialize Riot Verification
 * Generates a random starter icon, saves it to `riot_verifications`
 */
export async function startRiotVerification(_: unknown, formData: FormData) {
  try {
    const user = await requireUser();
    const rawRiotId = formString(formData, "riotId");
    const region = formString(formData, "region") || "EUW";

    if (!rawRiotId.includes("#")) {
      return { ok: false, message: "Invalid Riot ID format. Must be in the format Name#Tag (e.g. Noteemwork#3949)" };
    }

    const [gameName, tagLine] = rawRiotId.split("#").map((s) => s.trim());
    if (!gameName || !tagLine) {
      return { ok: false, message: "Riot Name and Tag Line cannot be empty." };
    }

    // Pick a random starter icon
    const chosenIconId = STARTER_ICONS[Math.floor(Math.random() * STARTER_ICONS.length)];

    const admin = createAdminClient();

    // Check if another user has already linked this exact gameName#tagLine combo
    const { data: existingLink } = await admin
      .from("riot_accounts")
      .select("id")
      .ilike("game_name", gameName)
      .ilike("tag_line", tagLine)
      .maybeSingle();

    if (existingLink) {
      return { ok: false, message: "This League of Legends account is already linked to another profile." };
    }

    // Upsert the verification request
    const { error } = await admin.from("riot_verifications").upsert({
      user_id: user.id,
      game_name: gameName,
      tag_line: tagLine,
      region: region,
      required_icon_id: chosenIconId
    });

    if (error) {
      console.error("[Start Verification Error]", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/profile");
    return { ok: true, message: "Verification initialized. Follow the steps to link your account." };
  } catch (err: any) {
    console.error("[Start Verification Exception]", err);
    return { ok: false, message: err.message };
  }
}

/**
 * 2. Complete Riot Verification
 * Queries Riot API to verify if the active client icon matches the pre-picked verification icon
 */
export async function completeRiotVerification() {
  try {
    const user = await requireUser();
    const admin = createAdminClient();

    // Get the pending verification request
    const { data: pending, error: fetchError } = await admin
      .from("riot_verifications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !pending) {
      return { ok: false, message: "No pending verification request found." };
    }

    // Fetch details from Riot API
    const summonerInfo = await getSummonerProfileIconId(
      pending.game_name,
      pending.tag_line,
      pending.region
    );

    if (!summonerInfo) {
      return {
        ok: false,
        message: `Summoner ${pending.game_name}#${pending.tag_line} was not found on the ${pending.region} region. Please double check spelling and region.`
      };
    }

    const { puuid, profileIconId } = summonerInfo;
    const isMock = !process.env.RIOT_API_KEY || process.env.RIOT_DEV_MOCK === "true";

    // Compare icon IDs (always succeeds in mock simulator to guarantee clean developer experience)
    const verified = isMock || profileIconId === pending.required_icon_id;

    if (!verified) {
      return {
        ok: false,
        message: `Verification failed. Your active profile icon (ID: ${profileIconId}) does not match the required icon (ID: ${pending.required_icon_id}). Please change your in-game icon, wait 2-3 minutes for Riot CDN sync, and click verify again.`
      };
    }

    // Check if this PUUID is already linked to another profile
    const { data: existingPuuid } = await admin
      .from("riot_accounts")
      .select("id")
      .eq("puuid", puuid)
      .maybeSingle();

    if (existingPuuid) {
      return { ok: false, message: "This League of Legends account has already been linked by another player." };
    }

    // Link the verified Riot account
    const { error: insertError } = await admin.from("riot_accounts").insert({
      user_id: user.id,
      puuid,
      game_name: pending.game_name,
      tag_line: pending.tag_line,
      region: pending.region,
      profile_icon_url: `http://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${isMock ? pending.required_icon_id : profileIconId}.png`
    });

    if (insertError) {
      console.error("[Insert Riot Account Error]", insertError);
      return { ok: false, message: insertError.message };
    }

    // Automatically synchronize the user's primary region, rank, and TSR from their verified Riot account
    const fetchedRank = await getSummonerLeagueRank(puuid, pending.region);
    const resolvedRank = fetchedRank || "silver";
    const resolvedTsr = tsrForRank(resolvedRank);

    await admin
      .from("users")
      .update({
        region: pending.region,
        rank: resolvedRank,
        tsr: resolvedTsr
      })
      .eq("id", user.id);

    // Delete verification record
    await admin.from("riot_verifications").delete().eq("user_id", user.id);

    revalidatePath("/profile");
    return { ok: true, message: `Success! ${pending.game_name}#${pending.tag_line} has been successfully verified and linked.` };
  } catch (err: any) {
    console.error("[Complete Verification Exception]", err);
    return { ok: false, message: err.message };
  }
}

/**
 * 3. Cancel Riot Verification
 * Deletes the pending verification session
 */
export async function cancelRiotVerification() {
  try {
    const user = await requireUser();
    const admin = createAdminClient();

    const { error } = await admin.from("riot_verifications").delete().eq("user_id", user.id);
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/profile");
    return { ok: true, message: "Verification request cancelled." };
  } catch (err: any) {
    console.error("[Cancel Verification Exception]", err);
    return { ok: false, message: err.message };
  }
}

/**
 * 4. Sync Riot Stats
 * Queries active Riot account from db, fetches current rank from Riot API, and updates users table.
 */
export async function syncRiotStats() {
  try {
    const user = await requireUser();
    const admin = createAdminClient();

    // 1. Get linked account
    const { data: riotAccount, error: fetchError } = await admin
      .from("riot_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !riotAccount) {
      return { ok: false, message: "No linked Riot account found. Please link your account first." };
    }

    // 2. Fetch fresh rank from Riot API
    const freshRank = await getSummonerLeagueRank(riotAccount.puuid, riotAccount.region);
    if (!freshRank) {
      return { ok: false, message: "Could not fetch fresh rank details from Riot API." };
    }

    const tsr = tsrForRank(freshRank);

    // 3. Update the user
    await admin
      .from("users")
      .update({
        rank: freshRank,
        tsr: tsr
      })
      .eq("id", user.id);

    // 4. Update the profile icon in the riot_accounts table if we fetched it too
    const summonerInfo = await getSummonerProfileIconId(
      riotAccount.game_name,
      riotAccount.tag_line,
      riotAccount.region
    );

    if (summonerInfo) {
      const isMock = !process.env.RIOT_API_KEY || process.env.RIOT_DEV_MOCK === "true";
      const iconUrl = `http://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${isMock ? 28 : summonerInfo.profileIconId}.png`;
      await admin
        .from("riot_accounts")
        .update({ profile_icon_url: iconUrl })
        .eq("user_id", user.id);
    }

    revalidatePath("/profile");
    return { ok: true, message: `Successfully synchronized rank: ${freshRank.toUpperCase()} (${tsr} TSR)` };
  } catch (err: any) {
    console.error("[Sync Stats Exception]", err);
    return { ok: false, message: err.message };
  }
}

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { tsrForRank } from "@/lib/domain/ranks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function ensureUserProfile(user: User) {
  const metadata = (user.user_metadata ?? {}) as {
    riot_name?: string;
    riot_tagline?: string;
    region?: string;
  };
  const riotName = metadata.riot_name?.trim();
  const riotTag = metadata.riot_tagline?.trim();
  const displayName =
    riotName && riotTag ? `${riotName}#${riotTag}` : user.email?.split("@")[0] ?? "Player";
  const region = (metadata.region || riotTag || "EUW").toUpperCase();
  const admin = createAdminClient();

  const { error } = await admin.from("users").upsert(
    {
      id: user.id,
      display_name: displayName,
      region,
      tsr: tsrForRank(null)
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`Failed to ensure profile row: ${error.message}`);
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/riot");
  await ensureUserProfile(user);
  return user;
}

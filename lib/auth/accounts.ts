import { createClient } from "@/lib/supabase/server";

export async function getRiotAccountForUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("riot_accounts")
    .select("id, game_name, tag_line, region")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

export async function requireLinkedRiotAccount(userId: string): Promise<{ ok: true; riot: any } | { ok: false; message: string }> {
  const riot = await getRiotAccountForUser(userId);

  if (!riot) {
    return { ok: false as const, message: "Riot account must be linked." };
  }

  return { ok: true as const, riot };
}

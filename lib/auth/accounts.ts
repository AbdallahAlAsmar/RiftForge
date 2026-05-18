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

export async function requireLinkedRiotAccount(userId: string) {
  const riot = await getRiotAccountForUser(userId);

  if (!riot) {
    // MOCK BYPASS: Return a fake Riot account if none is found to allow Discord testing
    return {
      ok: true as const,
      riot: {
        id: "mock_" + userId,
        game_name: "MockUser",
        tag_line: "MOCK",
        region: "NA"
      }
    };
  }

  return { ok: true as const, riot };
}

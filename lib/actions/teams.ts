"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireLinkedRiotAccount } from "@/lib/auth/accounts";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formString } from "./common";

const teamSchema = z.object({
  tournamentId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(60)
});

export async function createTeam(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = teamSchema.safeParse({
    tournamentId: formString(formData, "tournamentId"),
    name: formString(formData, "name")
  });

  if (!parsed.success) return { ok: false, message: "Team name is required." };
  if (parsed.data.tournamentId) {
    const riotCheck = await requireLinkedRiotAccount(user.id);
    if (!riotCheck.ok) return riotCheck;
  }

  const supabase = await createClient();
  let logoUrl: string | null = null;
  const logo = formData.get("logo");

  if (logo instanceof File && logo.size > 0) {
    const extension = logo.name.split(".").pop() ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("team-logos").upload(path, logo, {
      upsert: false,
      contentType: logo.type
    });

    if (uploadError) return { ok: false, message: uploadError.message };
    const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
    logoUrl = data.publicUrl;
  }

  const { data: profile } = await supabase.from("users").select("tsr").eq("id", user.id).single();
  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      tournament_id: parsed.data.tournamentId || null,
      captain_id: user.id,
      name: parsed.data.name,
      logo_url: logoUrl,
      average_tsr: profile?.tsr ?? 300,
      source: "premade"
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    is_captain: true
  });

  if (parsed.data.tournamentId) {
    await supabase.from("tournament_participants").upsert({
      tournament_id: parsed.data.tournamentId,
      user_id: user.id,
      team_id: team.id,
      participant_type: "player"
    });
  }

  revalidatePath("/teams");
  redirect(`/teams/${team.id}`);
}

export async function inviteUserToTeam(teamId: string, invitedUserId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: team } = await supabase.from("teams").select("captain_id").eq("id", teamId).single();
  if (!team || team.captain_id !== user.id) {
    return { ok: false, message: "Only the captain can invite members." };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase.from("invites").insert({
    team_id: teamId,
    invited_user_id: invitedUserId,
    invited_by: user.id,
    token: crypto.randomUUID(),
    status: "pending",
    expires_at: expiresAt.toISOString()
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/teams/${teamId}`);
  return { ok: true, message: "Invite sent." };
}

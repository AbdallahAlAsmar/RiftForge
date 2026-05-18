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
  name: z.string().min(3, "Team name must be at least 3 characters.").max(16, "Team name cannot exceed 16 characters.")
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

  // Check if team name already exists
  const { data: existingTeam } = await supabase
    .from("teams")
    .select("id")
    .ilike("name", parsed.data.name)
    .limit(1)
    .maybeSingle();

  if (existingTeam) {
    return { ok: false, message: "A team with this name already exists." };
  }

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

async function loadCaptainManagedTeam(teamId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, captain_id, tournament_id")
    .eq("id", teamId)
    .single();

  if (error || !team) {
    return { ok: false as const, message: "Team not found." };
  }

  if (team.captain_id !== user.id) {
    return { ok: false as const, message: "Only the captain can manage the roster." };
  }

  return { ok: true as const, user, team };
}

export async function promoteTeamMember(_: unknown, formData: FormData) {
  const teamId = formString(formData, "teamId");
  const memberId = formString(formData, "memberId");

  if (!teamId || !memberId) {
    return { ok: false, message: "Missing team or member details." };
  }

  const access = await loadCaptainManagedTeam(teamId);
  if (!access.ok) return access;

  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from("team_members")
    .select("user_id, is_captain")
    .eq("team_id", teamId)
    .eq("user_id", memberId)
    .maybeSingle();

  if (memberError || !member) {
    return { ok: false, message: "That player is not on this team." };
  }

  if (member.is_captain) {
    return { ok: false, message: "That player is already the captain." };
  }

  const { error: transferError } = await admin.rpc("transfer_team_captaincy", {
    p_team_id: teamId,
    p_new_captain_id: memberId
  });

  if (transferError) {
    return { ok: false, message: transferError.message };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  if (access.team.tournament_id) {
    revalidatePath(`/tournaments/${access.team.tournament_id}`);
  }

  return { ok: true, message: "Captaincy transferred." };
}

export async function removeTeamMember(_: unknown, formData: FormData) {
  const teamId = formString(formData, "teamId");
  const memberId = formString(formData, "memberId");

  if (!teamId || !memberId) {
    return { ok: false, message: "Missing team or member details." };
  }

  const access = await loadCaptainManagedTeam(teamId);
  if (!access.ok) return access;

  const admin = createAdminClient();
  const { error: removeError } = await admin.rpc("remove_team_member", {
    p_team_id: teamId,
    p_member_user_id: memberId
  });

  if (removeError) {
    return { ok: false, message: removeError.message };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  if (access.team.tournament_id) {
    revalidatePath(`/tournaments/${access.team.tournament_id}`);
  }

  return { ok: true, message: "Player removed from the team." };
}

export async function acceptTeamInvite(inviteId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: invite } = await supabase.from("invites").select("*").eq("id", inviteId).single();
  if (!invite) return { ok: false, message: "Invite not found." };
  if (invite.invited_user_id !== user.id) return { ok: false, message: "Unauthorized." };

  const { error: joinError } = await supabase.from("team_members").insert({
    team_id: invite.team_id,
    user_id: user.id
  });
  if (joinError) return { ok: false, message: joinError.message };

  await supabase.from("invites").update({ status: "accepted" }).eq("id", inviteId);
  revalidatePath("/teams");
  revalidatePath("/profile");
  return { ok: true, message: "Invite accepted." };
}

export async function declineTeamInvite(inviteId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: invite } = await supabase.from("invites").select("*").eq("id", inviteId).single();
  if (!invite) return { ok: false, message: "Invite not found." };
  if (invite.invited_user_id !== user.id) return { ok: false, message: "Unauthorized." };

  const { error } = await supabase.from("invites").update({ status: "declined" }).eq("id", inviteId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/teams");
  revalidatePath("/profile");
  return { ok: true, message: "Invite declined." };
}

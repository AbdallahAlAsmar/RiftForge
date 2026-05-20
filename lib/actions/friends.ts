"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export async function searchUsers(query: string) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!query || query.length < 3) return { ok: true, data: [] };

  // Search by display_name in users table
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, avatar_url, region, rank, show_rank_border, tsr")
    .ilike("display_name", `%${query}%`)
    .neq("id", user.id)
    .limit(10);

  if (error) return { ok: false, message: error.message };

  return { ok: true, data: data || [] };
}

export async function sendFriendRequest(targetUserId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  if (user.id === targetUserId) {
    return { ok: false, message: "Cannot add yourself as a friend." };
  }

  // Check if a relationship already exists
  const { data: existing } = await supabase
    .from("friends")
    .select("id, status")
    .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return { ok: false, message: "Already friends." };
    }
    return { ok: false, message: "A pending request already exists." };
  }

  const { error } = await supabase.from("friends").insert({
    user_id: user.id,
    friend_id: targetUserId,
    status: "pending"
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/profile");
  return { ok: true, message: "Friend request sent." };
}

export async function acceptFriendRequest(requestId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  // Make sure the current user is the one receiving the request (friend_id)
  const { data: request } = await supabase
    .from("friends")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { ok: false, message: "Request not found." };
  if (request.friend_id !== user.id) return { ok: false, message: "Unauthorized." };

  const { error } = await supabase
    .from("friends")
    .update({ status: "accepted" })
    .eq("id", requestId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/profile");
  return { ok: true, message: "Friend request accepted." };
}

export async function declineFriendRequest(requestId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("friends")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { ok: false, message: "Request not found." };
  if (request.friend_id !== user.id && request.user_id !== user.id) {
    return { ok: false, message: "Unauthorized." };
  }

  const { error } = await supabase
    .from("friends")
    .delete()
    .eq("id", requestId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/profile");
  return { ok: true, message: "Friend request declined." };
}

export async function removeFriend(friendshipId: string) {
  return declineFriendRequest(friendshipId);
}

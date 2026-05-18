"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { tsrForRank } from "@/lib/domain/ranks";
import { createClient } from "@/lib/supabase/server";
import { formString, formStringArray } from "./common";

const profileSchema = z.object({
  displayName: z.string().min(2).max(60),
  region: z.string().min(2).max(8),
  rank: z.string().min(3).max(16),
  preferredRoles: z.array(z.string()).max(5)
});

export async function updateProfile(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: formString(formData, "displayName"),
    region: formString(formData, "region"),
    rank: formString(formData, "rank"),
    preferredRoles: formStringArray(formData, "preferredRoles")
  });

  if (!parsed.success) {
    return { ok: false, message: "Profile details are incomplete." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({
      display_name: parsed.data.displayName,
      region: parsed.data.region.toUpperCase(),
      rank: parsed.data.rank,
      tsr: tsrForRank(parsed.data.rank),
      preferred_roles: parsed.data.preferredRoles
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export type ActionState = {
  ok: boolean;
  message: string;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function formStringArray(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

export async function requireTournamentOwner(tournamentId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (error || !tournament || tournament.owner_id !== user.id) {
    throw new Error("You do not have permission to manage this tournament.");
  }

  return { user, tournament };
}

export const tournamentSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().max(800).optional(),
  maxTeams: z.coerce.number().int().min(2).max(128),
  format: z.enum(["single_elimination", "double_elimination"]),
  minRank: z.string().optional(),
  maxRank: z.string().optional(),
  startsAt: z.string().optional(),
  checkInStartsAt: z.string().optional(),
  checkInEndsAt: z.string().optional()
});

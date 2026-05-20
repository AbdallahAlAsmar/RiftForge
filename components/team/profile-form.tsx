"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { RankLabel } from "@/components/profile/rank-visuals";

type Profile = {
  display_name: string | null;
  region: string;
  rank: string | null;
  show_rank_border: boolean;
  tsr: number;
  preferred_roles: string[];
};

const roles = ["top", "jungle", "mid", "bot", "support", "fill"];
const initialState = { ok: true, message: "" };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="grid gap-4">
      {/* Read-Only Verified Riot Metadata */}
      <div className="grid gap-4 sm:grid-cols-2 rounded-md border border-white/5 bg-white/[0.01] p-3.5">
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">League Region</Label>
          <p className="text-sm font-bold text-white mt-1">
            {profile.region ? profile.region.toUpperCase() : "Riot Account Not Linked"}
          </p>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">League Rank</Label>
          <p className="mt-1 text-sm font-bold text-white">
            {profile.rank ? <RankLabel rank={profile.rank} /> : "Riot Account Not Linked"}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" defaultValue={profile.display_name ?? ""} required />
      </div>

      <div className="grid gap-2">
        <Label>Preferred roles</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {roles.map((role) => (
            <label
              key={role}
              className="interactive-surface flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
            >
              <input
                type="checkbox"
                name="preferredRoles"
                value={role}
                defaultChecked={profile.preferred_roles.includes(role)}
                className="accent-primary"
              />
              {role}
            </label>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm interactive-surface">
        <input
          type="checkbox"
          name="showRankBorder"
          defaultChecked={profile.show_rank_border}
          className="mt-1 accent-primary"
        />
        <span>
          <span className="block font-medium text-foreground">Show rank border on my avatar</span>
          <span className="block text-xs text-muted-foreground">
            Display the rank wing border everywhere your profile picture appears.
          </span>
        </span>
      </label>

      {state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="reset" variant="ghost">
          Reset
        </Button>
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  );
}

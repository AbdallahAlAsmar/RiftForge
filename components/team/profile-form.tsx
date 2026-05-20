"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

type Profile = {
  display_name: string | null;
  region: string;
  rank: string | null;
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
          <p className="text-sm font-bold text-white mt-1">
            {profile.rank
              ? profile.rank.toUpperCase()
              : "Riot Account Not Linked"}
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

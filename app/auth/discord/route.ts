import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeInternalPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return "/tournaments";
  return pathname;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "link" ? "link" : "signin";
  const nextPath = sanitizeInternalPath(url.searchParams.get("next"));
  const callbackUrl = new URL("/auth/supabase/callback", request.nextUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);
  callbackUrl.searchParams.set("provider", "discord");

  const supabase = await createClient();
  const authCall =
    mode === "link"
      ? supabase.auth.linkIdentity({
          provider: "discord",
          options: { redirectTo: callbackUrl.toString() }
        })
      : supabase.auth.signInWithOAuth({
          provider: "discord",
          options: { redirectTo: callbackUrl.toString() }
        });

  const { data, error } = await authCall;

  if (error || !data.url) {
    const fallback = mode === "link" ? "/profile?discord=link_failed" : "/?auth=failed";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.redirect(data.url);
}

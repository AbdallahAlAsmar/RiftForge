import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRiotAuthorizeUrl, isRiotMockEnabled } from "@/lib/auth/riot";
import { createClient } from "@/lib/supabase/server";

function sanitizeInternalPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return "/tournaments";
  return pathname;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "link" ? "link" : "signin";
  const nextPath = sanitizeInternalPath(url.searchParams.get("next"));
  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set("riot_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/"
  });
  cookieStore.set("riot_oauth_mode", mode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/"
  });
  cookieStore.set("riot_oauth_next", nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/"
  });

  if (mode === "link") {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth?auth=required", request.url));
    }

    cookieStore.set("riot_oauth_link_user_id", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/"
    });
  } else {
    cookieStore.delete("riot_oauth_link_user_id");
  }

  if (isRiotMockEnabled()) {
    const callbackUrl = new URL(
      process.env.RIOT_REDIRECT_URI ?? "http://localhost:3000/auth/callback"
    );
    callbackUrl.searchParams.set("code", "dev_mock_code");
    callbackUrl.searchParams.set("state", state);
    return NextResponse.redirect(callbackUrl);
  }

  return NextResponse.redirect(getRiotAuthorizeUrl(state));
}

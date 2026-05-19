import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { tsrForRank } from "@/lib/domain/ranks";
import { rateLimit } from "@/lib/rate-limit";

function sanitizeInternalPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return "/tournaments";
  return pathname;
}

function redirectWithParam(pathname: string, requestUrl: string, key: string, value: string) {
  const redirectUrl = new URL(pathname, requestUrl);
  redirectUrl.searchParams.set(key, value);
  return redirectUrl;
}

function profileNameFromMetadata(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata ?? {};
  const name =
    metadata.full_name ??
    metadata.name ??
    metadata.global_name ??
    metadata.user_name ??
    metadata.preferred_username;

  return typeof name === "string" && name.trim()
    ? name.trim()
    : user.email?.split("@")[0] ?? "Player";
}

function avatarFromMetadata(user: { user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {};
  const avatar = metadata.avatar_url ?? metadata.picture;
  return typeof avatar === "string" && avatar.trim() ? avatar.trim() : null;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(ip, 10, 60 * 1000)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = sanitizeInternalPath(url.searchParams.get("next"));
  const provider = url.searchParams.get("provider");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }

  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    await admin.from("users").insert({
      id: user.id,
      display_name: profileNameFromMetadata(user),
      avatar_url: avatarFromMetadata(user),
      region: "EUW",
      tsr: tsrForRank(null)
    });
  }

  if (provider === "discord") {
    return NextResponse.redirect(redirectWithParam(nextPath, request.url, "discord", "connected"));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

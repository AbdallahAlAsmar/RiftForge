import Link from "next/link";
import Image from "next/image";
import { Sparkles, UserRound } from "lucide-react";
import { AuthButtons } from "@/components/auth/auth-buttons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/profile";
import logo from "@/components/logo.png";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8">
      <div className="glass-panel mx-auto flex h-16 max-w-7xl items-center justify-between rounded-xl px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-glow transition group-hover:rotate-6 overflow-hidden">
            <Image
              src={logo}
              alt="RiftForge"
              className="h-full w-full object-cover"
              priority
              sizes="36px"
            />
          </span>
          <span className="font-heading text-gradient-primary">RiftForge</span>
          <span className="hidden items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary md:inline-flex">
            <Sparkles className="h-3 w-3" />
            Live
          </span>
        </Link>
        <nav className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          <Link
            className="interactive-surface rounded-md px-3 py-1.5 transition hover:bg-secondary/70 hover:text-foreground"
            href="/tournaments"
          >
            Tournaments
          </Link>
          <Link
            className="interactive-surface rounded-md px-3 py-1.5 transition hover:bg-secondary/70 hover:text-foreground"
            href="/teams"
          >
            Teams
          </Link>
          <Link
            className="interactive-surface rounded-md px-3 py-1.5 transition hover:bg-secondary/70 hover:text-foreground"
            href="/profile"
          >
            Profile
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Profile">
                <Link href="/profile">
                  <UserRound className="h-4 w-4" />
                </Link>
              </Button>
              <form action={signOut}>
                <Button variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <AuthButtons />
          )}
        </div>
      </div>
    </header>
  );
}

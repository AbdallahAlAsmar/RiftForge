import Link from "next/link";
import {
  ArrowRight,
  Brackets,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthButtons } from "@/components/auth/auth-buttons";
import { SiteHeader } from "@/components/layout/site-header";
import { Float, HoverLift, LiveBackdrop, Reveal } from "@/components/motion/reveal";

const features = [
  { icon: UsersRound, title: "Forge your roster", text: "Premades, captains, solos, and duos flow into one clean tournament lobby." },
  { icon: ShieldCheck, title: "Riot-ready identity", text: "Require linked Riot accounts for eligible players, ranks, regions, and TSR." },
  { icon: Brackets, title: "Live bracket engine", text: "Generate seeded brackets, confirm winners, and advance teams automatically." },
  { icon: Swords, title: "Fast admin control", text: "Publish events, build balanced teams, and resolve match results on event day." }
];

const liveStats = [
  { label: "Live events", value: "14" },
  { label: "Players forged", value: "1,280+" },
  { label: "Results locked", value: "99.8%" }
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="grid-mask scanline-overlay relative overflow-hidden border-b">
          <LiveBackdrop />
          <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl content-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <Reveal className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/70 px-4 py-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Competitive Play, Automated.
              </div>
              <h1 className="font-heading text-4xl font-black uppercase tracking-normal sm:text-6xl">
                RiftForge
                <span className="text-gradient-primary block normal-case">
                  Forge your team.
                </span>
                <span className="block normal-case">Enter the bracket.</span>
                <span className="block normal-case">Dominate the tournament.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Automated League of Legends tournaments with balanced matchmaking, live brackets,
                and seamless team management.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="interactive-surface shadow-glow">
                  <Link href="/tournaments">
                    Browse tournaments <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <AuthButtons size="lg" />
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {liveStats.map((stat, index) => (
                  <Reveal
                    key={stat.label}
                    delay={0.1 + index * 0.08}
                    className="glass-panel rounded-lg p-3 text-center"
                  >
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  </Reveal>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.15} className="grid content-center gap-4">
              <Float>
                <div className="glass-panel rounded-xl p-5 shadow-glow">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Finals</p>
                      <h2 className="font-heading text-xl font-bold">RiftForge Invitational</h2>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm text-primary">
                      <span className="live-dot h-2.5 w-2.5 rounded-full bg-primary" />
                      Live
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {["Forgeborn", "Red Side Kings", "Nexus Breakers", "Blue Steel"].map((team, index) => (
                      <HoverLift key={team}>
                        <div className="interactive-surface flex items-center justify-between rounded-lg border bg-secondary/80 p-3">
                          <span>{team}</span>
                          <span className="text-sm text-muted-foreground">Seed {index + 1}</span>
                        </div>
                      </HoverLift>
                    ))}
                  </div>
                </div>
              </Float>
            </Reveal>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={0.06 * index}>
              <HoverLift className="h-full">
                <Card className="interactive-surface h-full bg-card/90">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="font-heading">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{feature.text}</CardContent>
                </Card>
              </HoverLift>
            </Reveal>
          ))}
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <Reveal>
            <Card className="glass-panel overflow-hidden border-primary/25">
              <CardContent className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm text-primary">
                    <Trophy className="h-4 w-4" /> Event-ready toolkit
                  </p>
                  <h2 className="font-heading mt-2 text-2xl font-bold">From queue to champion.</h2>
                </div>
                <Button asChild className="interactive-surface">
                  <Link href="/tournaments">
                    Open tournament browser <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </section>
      </main>
    </>
  );
}

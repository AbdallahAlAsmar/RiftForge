import { SiteHeader } from "@/components/layout/site-header";
import { LiveBackdrop } from "@/components/motion/reveal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <LiveBackdrop className="-z-10 opacity-60" />
        {children}
      </main>
    </>
  );
}

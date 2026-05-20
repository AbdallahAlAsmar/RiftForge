import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingLoading() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-white/10 p-8">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-4 h-14 w-2/3" />
        <Skeleton className="mt-3 h-5 w-5/6" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </section>
    </div>
  );
}

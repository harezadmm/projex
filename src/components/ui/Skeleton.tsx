import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-white/60", className)} />;
}

/** Placeholder seukuran kartu, dipakai saat data awal masih dimuat. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card p-5", className)}>
      <Skeleton className="mb-4 h-6 w-40" />
      <Skeleton className="mb-3 h-24 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

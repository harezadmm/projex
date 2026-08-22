"use client";

import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { ProductivityHeatmap } from "@/components/dashboard/ProductivityHeatmap";
import { TeamPerformanceCard } from "@/components/dashboard/TeamPerformanceCard";
import { MyTasksCard } from "@/components/dashboard/MyTasksCard";
import { ActivityChartCard } from "@/components/dashboard/ActivityChartCard";
import { DeadlinesCard } from "@/components/dashboard/DeadlinesCard";
import { RecentUpdatesCard } from "@/components/dashboard/RecentUpdatesCard";

export default function DashboardPage() {
  const { loading } = useStore();

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Kelola dan pantau proyek kelompokmu" title="Dashboard" />
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <CardSkeleton key={i} className="h-28" />
            ))}
          </div>
          <CardSkeleton className="h-52" />
          <div className="grid gap-4 lg:grid-cols-12">
            <CardSkeleton className="lg:col-span-8" />
            <CardSkeleton className="lg:col-span-4" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Kelola dan pantau proyek kelompokmu" title="Dashboard" />

      <div className="rise-stagger flex flex-col gap-4">
        {/* Baris ringkasan: keadaan seluruh pekerjaan dalam sekali lihat */}
        <StatTiles />

        {/* Ritme kerja tim sepanjang tahun */}
        <ProductivityHeatmap />

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <TeamPerformanceCard />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-4">
            <DeadlinesCard />
            <MyTasksCard />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ActivityChartCard />
          </div>
          <div className="lg:col-span-5">
            <RecentUpdatesCard />
          </div>
        </div>
      </div>
    </>
  );
}

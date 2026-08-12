"use client";

import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { MyTasksCard } from "@/components/dashboard/MyTasksCard";
import { ProjectsOverviewCard } from "@/components/dashboard/ProjectsOverviewCard";
import { ActivityChartCard } from "@/components/dashboard/ActivityChartCard";
import { ProjectProgressCard } from "@/components/dashboard/ProjectProgressCard";
import { DeadlinesCard } from "@/components/dashboard/DeadlinesCard";
import { RecentUpdatesCard } from "@/components/dashboard/RecentUpdatesCard";

export default function DashboardPage() {
  const { loading } = useStore();

  return (
    <>
      <PageHeader eyebrow="Kelola dan pantau proyek kelompokmu" title="Project Dashboard" />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <CardSkeleton className="lg:col-span-3 lg:row-span-2" />
          <CardSkeleton className="lg:col-span-3" />
          <CardSkeleton className="lg:col-span-3" />
          <CardSkeleton className="lg:col-span-3 lg:row-span-2" />
          <CardSkeleton className="lg:col-span-6" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3 lg:row-span-2">
            <MyTasksCard />
          </div>
          <div className="lg:col-span-3">
            <ProjectsOverviewCard />
          </div>
          <div className="lg:col-span-3">
            <ActivityChartCard />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-3 lg:row-span-2">
            <DeadlinesCard />
            <RecentUpdatesCard />
          </div>
          <div className="lg:col-span-6">
            <ProjectProgressCard />
          </div>
        </div>
      )}
    </>
  );
}

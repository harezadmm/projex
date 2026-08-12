"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, CardIconButton } from "@/components/ui/Card";
import { ACCENT, percent } from "@/lib/ui";
import { cn } from "@/lib/cn";

/** Analog kartu "Invoice Overview" pada referensi: satu baris per proyek dengan bar progres. */
export function ProjectProgressCard() {
  const { projects, tasks } = useStore();

  const rows = useMemo(
    () =>
      projects.map((p) => {
        const own = tasks.filter((t) => t.project_id === p.id);
        const done = own.filter((t) => t.status === "done").length;
        return {
          project: p,
          total: own.length,
          done,
          pct: percent(done, own.length),
        };
      }),
    [projects, tasks]
  );

  return (
    <Card>
      <CardHeader
        title="Progres per Proyek"
        action={
          <CardIconButton label="Kelola proyek" href="/projects">
            <SlidersHorizontal className="size-4" />
          </CardIconButton>
        }
      />

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Belum ada proyek.{" "}
          <Link href="/projects" className="font-medium underline">
            Buat proyek pertama
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {rows.map(({ project, total, done, pct }) => (
            <li key={project.id}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <Link
                  href={`/projects/${project.id}`}
                  className="truncate text-sm font-medium text-slate-800 transition hover:text-slate-950 hover:underline"
                >
                  {project.name}
                </Link>
                <span className="shrink-0 text-sm text-slate-500">
                  {done}/{total} tugas
                  <span className="ml-3 font-semibold text-slate-900">{pct}%</span>
                </span>
              </div>

              <div
                className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progres ${project.name}`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    ACCENT[project.color].bar
                  )}
                  style={{ width: `${Math.max(pct, total > 0 ? 3 : 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useStore } from "@/lib/store";
import { Card, CardHeader, CardIconButton } from "@/components/ui/Card";
import { percent } from "@/lib/ui";

/**
 * Donut ringkasan tugas seluruh proyek — meniru kartu "Projects Overview"
 * pada desain referensi, tapi mengukur tugas (bukan proyek) supaya angkanya
 * lebih informatif untuk kelompok kecil.
 */
export function ProjectsOverviewCard() {
  const { tasks } = useStore();

  const slices = useMemo(() => {
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const todo = tasks.filter((t) => t.status === "todo").length;

    return [
      { name: "Dikerjakan", value: inProgress, color: "#f97316" },
      { name: "Selesai", value: done, color: "#3b82f6" },
      { name: "Belum Mulai", value: todo, color: "#e2e8f0" },
    ];
  }, [tasks]);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const donePct = percent(slices[1].value, total);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Ringkasan Proyek"
        action={
          <CardIconButton label="Buka halaman proyek" href="/projects">
            <ArrowUpRight className="size-4" />
          </CardIconButton>
        }
      />

      <div className="relative mx-auto aspect-square w-full max-w-[220px]">
        {total === 0 ? (
          <div className="grid h-full place-items-center rounded-full border-[18px] border-line">
            <span className="text-xs text-faint">Belum ada tugas</span>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  innerRadius="66%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <span className="text-3xl font-bold text-ink">{donePct}%</span>
              <span className="text-xs text-muted">selesai</span>
            </div>
          </>
        )}
      </div>

      <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-ink-2">
              {s.name}: <span className="font-semibold text-ink">{s.value}</span>
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/projects"
        className="mt-auto pt-4 text-sm font-medium text-ink-2 transition hover:text-ink"
      >
        Kelola proyek →
      </Link>
    </Card>
  );
}

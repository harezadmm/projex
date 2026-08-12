"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, CardIconButton } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, relativeDays } from "@/lib/ui";
import { cn } from "@/lib/cn";

/** Analog kartu "My Meetings": tugas terdekat yang harus selesai. */
export function DeadlinesCard() {
  const { tasks, members } = useStore();

  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return tasks
      .filter((t) => t.status !== "done" && t.due_date)
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
      .slice(0, 4)
      .map((t) => ({
        task: t,
        member: members.find((m) => m.id === t.assignee_id) ?? null,
        overdue: new Date(t.due_date!) < startOfToday,
      }));
  }, [tasks, members]);

  return (
    <Card>
      <CardHeader
        title="Deadline Terdekat"
        action={
          <CardIconButton label="Lihat semua tugas" href="/tasks">
            <CalendarDays className="size-4" />
          </CardIconButton>
        }
      />

      {upcoming.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Tidak ada deadline yang tertunda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {upcoming.map(({ task, member, overdue }) => (
            <li
              key={task.id}
              className="rounded-2xl border border-slate-200 p-3.5 transition hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      overdue ? "text-red-600" : "text-slate-500"
                    )}
                  >
                    {overdue ? "Terlambat · " : ""}
                    {relativeDays(task.due_date)}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                    {task.title}
                  </p>
                </div>
                <Link
                  href="/tasks"
                  aria-label={`Buka tugas ${task.title}`}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                {member ? (
                  <>
                    <Avatar name={member.name} color={member.avatar_color} size="sm" />
                    <span className="truncate text-xs text-slate-600">{member.name}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Belum ada penanggung jawab</span>
                )}
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {formatDate(task.due_date)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

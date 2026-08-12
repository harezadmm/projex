"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, CardIconButton } from "@/components/ui/Card";
import { ACCENT, relativeDays } from "@/lib/ui";
import { cn } from "@/lib/cn";

type Tab = "today" | "upcoming";

/** Apakah tanggal jatuh tempo ada di hari ini (atau sudah lewat)? */
function isDueTodayOrOverdue(due: string | null): boolean {
  if (!due) return false;
  const d = new Date(due);
  d.setHours(23, 59, 59, 999);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return d <= endOfToday;
}

export function MyTasksCard() {
  const { tasks, projects, currentMember, updateTask } = useStore();
  const [tab, setTab] = useState<Tab>("today");

  const mine = useMemo(
    () =>
      tasks.filter(
        (t) => t.assignee_id === currentMember?.id && t.status !== "done"
      ),
    [tasks, currentMember]
  );

  const visible = useMemo(() => {
    const filtered =
      tab === "today"
        ? mine.filter((t) => isDueTodayOrOverdue(t.due_date))
        : mine.filter((t) => !isDueTodayOrOverdue(t.due_date));

    return [...filtered].sort((a, b) =>
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")
    );
  }, [mine, tab]);

  const projectColor = (id: string | null) =>
    projects.find((p) => p.id === id)?.color ?? "blue";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Tugas Saya"
        action={
          <CardIconButton label="Tambah tugas" href="/tasks">
            <Plus className="size-4" />
          </CardIconButton>
        }
      />

      <div className="mb-4 flex gap-2">
        {(
          [
            ["today", "Hari Ini"],
            ["upcoming", "Mendatang"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              tab === key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {mine.length}
        </span>
        <span className="text-sm font-medium text-slate-700">Tugas Berjalan</span>
      </div>

      <div className="-mr-1 flex max-h-[26rem] flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {visible.length === 0 && (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {tab === "today"
              ? "Tidak ada tugas yang jatuh tempo hari ini. Aman!"
              : "Belum ada tugas mendatang."}
          </p>
        )}

        {visible.map((task) => {
          const accent = ACCENT[projectColor(task.project_id)];
          return (
            <article
              key={task.id}
              className={cn("rounded-2xl p-3.5 transition", accent.soft)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("size-2.5 rounded-full", accent.dot)} />
                <button
                  type="button"
                  onClick={() => updateTask(task.id, { status: "done" })}
                  aria-label={`Tandai "${task.title}" selesai`}
                  title="Tandai selesai"
                  className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-slate-300 bg-white text-transparent transition hover:border-green-500 hover:text-green-600"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </button>
              </div>

              <h3 className="mt-2 text-sm leading-snug font-semibold text-slate-900">
                {task.title}
              </h3>
              {task.description && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {task.description}
                </p>
              )}
              <p className="mt-2 text-xs font-medium text-slate-400">
                {relativeDays(task.due_date)}
              </p>
            </article>
          );
        })}
      </div>

      <Link
        href="/tasks"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        Lihat semua tugas →
      </Link>
    </Card>
  );
}

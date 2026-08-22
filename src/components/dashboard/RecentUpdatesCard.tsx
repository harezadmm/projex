"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, CardIconButton } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { relativeDays } from "@/lib/ui";

/** Analog kartu "Open Tickets": catatan progres terbaru dari anggota. */
export function RecentUpdatesCard() {
  const { logs, members, tasks } = useStore();

  const recent = useMemo(
    () =>
      [...logs]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 4)
        .map((log) => ({
          log,
          member: members.find((m) => m.id === log.member_id) ?? null,
          task: tasks.find((t) => t.id === log.task_id) ?? null,
        })),
    [logs, members, tasks]
  );

  return (
    <Card>
      <CardHeader
        title="Update Terbaru"
        action={
          <CardIconButton label="Buka catatan progres" href="/progress">
            <SlidersHorizontal className="size-4" />
          </CardIconButton>
        }
      />

      {recent.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">
          Belum ada catatan progres.{" "}
          <Link href="/progress" className="font-medium underline">
            Tulis update pertama
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recent.map(({ log, member, task }) => (
            <li key={log.id} className="rounded-2xl bg-surface-2 p-3.5">
              <div className="flex items-start gap-3">
                {member ? (
                  <Avatar name={member.name} color={member.avatar_color} size="sm" />
                ) : (
                  <span className="size-8 shrink-0 rounded-full bg-line" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {member?.name ?? "Anonim"}
                    </p>
                    <span className="shrink-0 text-xs text-faint">
                      {relativeDays(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">{log.note}</p>
                  {task && (
                    <p className="mt-1 truncate text-xs text-faint">
                      pada: {task.title}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-inverse"
                    style={{ width: `${log.percent}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-semibold text-ink-2">
                  {log.percent}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/progress"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 transition hover:text-ink"
      >
        Lihat semua catatan <ChevronRight className="size-4" />
      </Link>
    </Card>
  );
}

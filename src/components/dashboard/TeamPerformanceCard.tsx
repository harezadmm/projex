"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/types";
import { percent } from "@/lib/ui";
import { cn } from "@/lib/cn";

const STATUS_CHIP: Record<ProjectStatus, string> = {
  not_started: "bg-surface-3 text-ink-2",
  in_progress: "bg-[var(--tone-blue-pastel)] text-[var(--tone-blue-text)]",
  completed: "bg-[var(--tone-green-pastel)] text-[var(--tone-green-text)]",
};

/** Berapa avatar ditampilkan sebelum diringkas jadi "+N". */
const AVATAR_LIMIT = 4;

/**
 * Tabel ringkas beban kerja per proyek: siapa terlibat, sejauh mana progresnya.
 * Menggantikan daftar proyek panjang di dashboard lama.
 */
export function TeamPerformanceCard() {
  const { projects, tasks, members } = useStore();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return projects
      .map((p) => {
        const own = tasks.filter((t) => t.project_id === p.id);
        const done = own.filter((t) => t.status === "done").length;

        // Anggota yang benar-benar punya tugas di proyek ini
        const ids = new Set(
          own.map((t) => t.assignee_id).filter((id): id is string => Boolean(id))
        );
        const team = members.filter((m) => ids.has(m.id));

        return {
          project: p,
          team,
          total: own.length,
          done,
          progress: percent(done, own.length),
        };
      })
      .filter((r) => !q || r.project.name.toLowerCase().includes(q))
      .sort((a, b) => b.total - a.total);
  }, [projects, tasks, members, query]);

  return (
    <Card>
      <CardHeader
        title="Performa Tim per Proyek"
        action={
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari proyek…"
              aria-label="Cari proyek"
              className="w-48 rounded-full border border-line bg-surface py-2 pr-3 pl-9 text-sm text-ink placeholder:text-faint outline-none transition focus:border-line-2 focus:ring-2 focus:ring-ink/15"
            />
          </label>
        }
      />

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-10 text-center text-sm text-muted">
          {query ? `Tidak ada proyek cocok dengan "${query}".` : "Belum ada proyek."}
        </p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="pb-2 font-medium">Proyek</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Progres</th>
                <th className="pb-2 font-medium">Anggota</th>
                <th className="pb-2 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, team, total, done, progress }) => (
                <tr key={project.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {project.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {done}/{total} tugas selesai
                    </p>
                  </td>

                  <td className="py-3 pr-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        STATUS_CHIP[project.status]
                      )}
                    >
                      {PROJECT_STATUS_LABEL[project.status]}
                    </span>
                  </td>

                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-inverse transition-[width] duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-ink-2">{progress}%</span>
                    </div>
                  </td>

                  <td className="py-3 pr-3">
                    {team.length === 0 ? (
                      <span className="text-xs text-faint">—</span>
                    ) : (
                      <div className="flex items-center -space-x-2">
                        {team.slice(0, AVATAR_LIMIT).map((m) => (
                          <Avatar
                            key={m.id}
                            name={m.name}
                            color={m.avatar_color}
                            size="sm"
                            className="ring-2 ring-surface"
                          />
                        ))}
                        {team.length > AVATAR_LIMIT && (
                          <span className="grid size-8 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2 ring-2 ring-surface">
                            +{team.length - AVATAR_LIMIT}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3 text-right">
                    <Link
                      href={`/projects/${project.id}`}
                      aria-label={`Buka ${project.name}`}
                      className="inline-grid size-8 place-items-center rounded-full text-faint transition hover:bg-surface-3 hover:text-ink"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

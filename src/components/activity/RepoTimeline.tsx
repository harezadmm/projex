"use client";

import { useMemo } from "react";
import {
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequestArrow,
  MessageSquare,
  Star,
  Tag,
  Trash2,
  GitFork,
  Rocket,
  Activity,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRepoEvents } from "@/lib/useRepoData";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { formatDate, relativeDays } from "@/lib/ui";
import { cn } from "@/lib/cn";
import { REPO_EVENT_LABEL, type Member, type RepoEventKind } from "@/lib/types";

/** Ikon dan warna per jenis event, supaya baris bisa dibaca sekilas. */
const STYLE: Record<RepoEventKind, { icon: LucideIcon; tone: string }> = {
  push: { icon: GitCommitHorizontal, tone: "text-[var(--tone-blue-text)]" },
  branch_create: { icon: GitBranch, tone: "text-[var(--tone-violet-text)]" },
  branch_delete: { icon: Trash2, tone: "text-muted" },
  tag_create: { icon: Tag, tone: "text-[var(--tone-amber-text)]" },
  pr_open: { icon: GitPullRequestArrow, tone: "text-[var(--tone-amber-text)]" },
  pr_merge: { icon: GitMerge, tone: "text-[var(--tone-green-text)]" },
  pr_close: { icon: GitPullRequestArrow, tone: "text-[var(--tone-red-text)]" },
  review: { icon: MessageSquare, tone: "text-[var(--tone-sky-text)]" },
  issue: { icon: MessageSquare, tone: "text-[var(--tone-amber-text)]" },
  release: { icon: Rocket, tone: "text-[var(--tone-green-text)]" },
  fork: { icon: GitFork, tone: "text-muted" },
  star: { icon: Star, tone: "text-[var(--tone-yellow-text)]" },
  member_add: { icon: Users, tone: "text-[var(--tone-sky-text)]" },
  other: { icon: Activity, tone: "text-muted" },
};

/** Kunci hari lokal, dipakai untuk mengelompokkan baris per tanggal. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Riwayat apa saja yang sudah dikerjakan di repo: push, branch dibuat atau
 * dihapus, PR dibuka dan di-merge, release. Dikelompokkan per hari supaya
 * terbaca sebagai kronologi kerja, bukan daftar panjang tanpa jeda.
 */
export function RepoTimeline({
  repoUrl,
  reloadKey = 0,
}: {
  repoUrl: string | null;
  reloadKey?: number;
}) {
  const { members } = useStore();
  const { events, loading, error, note } = useRepoEvents(repoUrl, reloadKey);

  const byLogin = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) {
      if (m.github_username) map.set(m.github_username.toLowerCase(), m);
    }
    return map;
  }, [members]);

  /** Baris dikelompokkan per hari, urut dari yang terbaru. */
  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; rows: typeof events }> = [];
    for (const e of events) {
      const k = dayKey(e.date);
      const last = out[out.length - 1];
      if (last && last.key === k) last.rows.push(e);
      else out.push({ key: k, label: e.date, rows: [e] });
    }
    return out;
  }, [events]);

  /** Ringkasan per jenis, dipakai sebagai chip di header kartu. */
  const tally = useMemo(() => {
    const c = new Map<RepoEventKind, number>();
    for (const e of events) c.set(e.kind, (c.get(e.kind) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  return (
    <Card>
      <CardHeader
        title="Riwayat Aktivitas"
        action={
          events.length > 0 ? (
            <span className="glass-chip rounded-full px-2.5 py-1 text-xs font-semibold text-ink-2">
              {events.length}
            </span>
          ) : undefined
        }
      />

      {tally.length > 0 && (
        <ul className="-mt-2 mb-4 flex flex-wrap gap-1.5">
          {tally.map(([kind, n]) => {
            const Icon = STYLE[kind].icon;
            return (
              <li
                key={kind}
                className="glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-2"
              >
                <Icon className={cn("size-3.5", STYLE[kind].tone)} />
                {REPO_EVENT_LABEL[kind]} · {n}
              </li>
            );
          })}
        </ul>
      )}

      {loading ? (
        <CardSkeleton />
      ) : error ? (
        <p className="rounded-2xl bg-[var(--tone-amber-soft)] px-4 py-4 text-sm text-[var(--tone-amber-text)]">
          {error}
        </p>
      ) : events.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-10 text-center text-sm text-muted">
          Belum ada aktivitas terekam. GitHub hanya menyimpan riwayat event
          sekitar 90 hari terakhir.
        </p>
      ) : (
        <div className="-mr-1 flex max-h-[34rem] flex-col gap-5 overflow-y-auto pr-1">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="sticky top-0 z-10 -mx-1 mb-2 bg-surface/80 px-1 py-1 text-xs font-semibold text-muted backdrop-blur-sm">
                {formatDate(g.label)} · {relativeDays(g.label)}
              </h3>

              <ul className="flex flex-col gap-2">
                {g.rows.map((e) => {
                  const st = STYLE[e.kind];
                  const Icon = st.icon;
                  const member = e.actor_login
                    ? byLogin.get(e.actor_login.toLowerCase())
                    : undefined;

                  const row = (
                    <>
                      <span
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-3",
                          st.tone
                        )}
                        title={REPO_EVENT_LABEL[e.kind]}
                      >
                        <Icon className="size-3.5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium break-words text-ink">
                          {e.title}
                        </span>
                        {e.detail && (
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {e.detail}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-faint">
                          {member ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Avatar
                                name={member.name}
                                color={member.avatar_color}
                                size="sm"
                                className="size-5 text-[9px]"
                              />
                              {member.name}
                            </span>
                          ) : (
                            e.actor_login && (
                              <span className="inline-flex items-center gap-1">
                                <GithubIcon className="size-3" />
                                {e.actor_login}
                              </span>
                            )
                          )}
                          <span>
                            {new Date(e.date).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={e.id}>
                      {e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3 transition hover:brightness-110"
                        >
                          {row}
                        </a>
                      ) : (
                        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3">
                          {row}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {note && !loading && !error && (
        <p className="mt-3 text-xs text-faint">{note}</p>
      )}
    </Card>
  );
}

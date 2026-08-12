"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCommits } from "@/lib/useCommits";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Field";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ACCENT, formatDate, percent, relativeDays } from "@/lib/ui";
import { cn } from "@/lib/cn";
import type { Commit, Member } from "@/lib/types";

const DAY_OPTIONS = [7, 30, 90, 365];

/** Commit ditampilkan bertahap; sebuah repo aktif bisa punya ratusan commit. */
const COMMIT_PAGE_SIZE = 30;

export default function ActivityPage() {
  const { projects, members, loading } = useStore();

  const reposFromProjects = useMemo(
    () => projects.filter((p) => p.repo_url).map((p) => ({ id: p.id, name: p.name, url: p.repo_url! })),
    [projects]
  );

  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [days, setDays] = useState(30);
  const [reloadKey, setReloadKey] = useState(0);
  const [shownCommits, setShownCommits] = useState(COMMIT_PAGE_SIZE);

  const activeRepo = selectedRepo || reposFromProjects[0]?.url || null;

  const { commits, error, loading: loadingCommits, repo } = useCommits(
    activeRepo,
    days,
    reloadKey
  );

  /** Cocokkan tiap commit ke anggota lewat username GitHub (atau nama author sebagai cadangan). */
  const { byMember, unmatched, memberOfCommit } = useMemo(() => {
    const byLogin = new Map<string, Member>();
    const byName = new Map<string, Member>();

    for (const m of members) {
      if (m.github_username) byLogin.set(m.github_username.toLowerCase(), m);
      byName.set(m.name.toLowerCase(), m);
    }

    const counts = new Map<string, { member: Member; commits: Commit[] }>();
    const strays = new Map<string, number>();
    // Hasil pencocokan disimpan per sha supaya daftar commit tidak perlu
    // mencari ulang untuk setiap baris yang di-render.
    const perCommit = new Map<string, Member>();

    for (const c of commits) {
      const match =
        (c.author_login && byLogin.get(c.author_login.toLowerCase())) ||
        byName.get(c.author_name.toLowerCase());

      if (match) {
        perCommit.set(c.sha, match);
        const entry = counts.get(match.id) ?? { member: match, commits: [] };
        entry.commits.push(c);
        counts.set(match.id, entry);
      } else {
        const key = c.author_login ?? c.author_name;
        strays.set(key, (strays.get(key) ?? 0) + 1);
      }
    }

    return {
      byMember: [...counts.values()].sort((a, b) => b.commits.length - a.commits.length),
      unmatched: [...strays.entries()].sort((a, b) => b[1] - a[1]),
      memberOfCommit: perCommit,
    };
  }, [commits, members]);

  const maxCommits = byMember[0]?.commits.length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Bukti kontribusi yang ditarik langsung dari GitHub"
        title="Aktivitas GitHub"
        showSearch={false}
      />

      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            aria-label="Pilih repo"
          >
            {reposFromProjects.length === 0 ? (
              <option value="">Belum ada repo terhubung</option>
            ) : (
              reposFromProjects.map((r) => (
                <option key={r.id} value={r.url}>
                  {r.name}
                </option>
              ))
            )}
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Rentang waktu"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} hari terakhir
              </option>
            ))}
          </Select>
        </div>

        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className={cn("size-4", loadingCommits && "animate-spin")} />
          Muat ulang
        </button>

        {repo && (
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <GithubIcon className="size-4" /> {repo}
          </a>
        )}
      </div>

      {!activeRepo && !loading && (
        <Card className="py-12 text-center">
          <GithubIcon className="mx-auto size-10 text-slate-300" />
          <p className="mt-3 text-slate-600">Belum ada repo GitHub yang terhubung.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Buka menu Proyek, ubah salah satu proyek, lalu isi kolom{" "}
            <span className="font-medium">URL repo GitHub</span>. Setelah itu commit tiap
            anggota akan otomatis muncul di sini.
          </p>
          <Link
            href="/projects"
            className="mt-4 inline-block text-sm font-medium text-slate-900 underline"
          >
            Buka halaman Proyek
          </Link>
        </Card>
      )}

      {error && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="flex items-start gap-2 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        </Card>
      )}

      {activeRepo && !error && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-1">
            <Card>
              <CardHeader title="Ringkasan" />
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-slate-500">Total commit</dt>
                  <dd className="text-2xl font-bold text-slate-900">{commits.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Anggota aktif</dt>
                  <dd className="text-2xl font-bold text-slate-900">{byMember.length}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                Rentang {days} hari terakhir. Data di-cache 5 menit untuk menghemat kuota
                GitHub API.
              </p>
            </Card>

            <Card>
              <CardHeader title="Commit per Anggota" />
              {loadingCommits ? (
                <p className="text-sm text-slate-400">Memuat…</p>
              ) : byMember.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada commit yang cocok dengan anggota terdaftar.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {byMember.map(({ member, commits: list }) => (
                    <li key={member.id}>
                      <div className="mb-1.5 flex items-center gap-2.5">
                        <Avatar name={member.name} color={member.avatar_color} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                          {member.name}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-slate-900">
                          {list.length}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", ACCENT[member.avatar_color].bar)}
                          style={{ width: `${percent(list.length, maxCommits)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {unmatched.length > 0 && (
                <div className="mt-5 rounded-2xl bg-amber-50 p-3.5">
                  <p className="text-xs font-medium text-amber-800">
                    Commit dari akun yang belum terdaftar
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {unmatched.slice(0, 5).map(([name, count]) => (
                      <li key={name} className="text-xs text-amber-700">
                        {name} — {count} commit
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-700">
                    Isi <span className="font-medium">username GitHub</span> anggota di menu{" "}
                    <Link href="/members" className="underline">
                      Anggota
                    </Link>{" "}
                    agar terhitung.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Riwayat Commit"
              action={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {commits.length}
                </span>
              }
            />

            {loadingCommits ? (
              <CardSkeleton />
            ) : commits.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                Tidak ada commit dalam {days} hari terakhir.
              </p>
            ) : (
              <ul className="-mr-1 flex max-h-[36rem] flex-col gap-2.5 overflow-y-auto pr-1">
                {commits.slice(0, shownCommits).map((c) => {
                  const member = memberOfCommit.get(c.sha);

                  return (
                    <li
                      key={c.sha}
                      className="print-break flex items-start gap-3 rounded-2xl border border-slate-200 p-3.5"
                    >
                      {member ? (
                        <Avatar name={member.name} color={member.avatar_color} size="sm" />
                      ) : (
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100">
                          <GithubIcon className="size-3.5 text-slate-400" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium break-words text-slate-900">
                          {c.message}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {member?.name ?? c.author_login ?? c.author_name} ·{" "}
                          {formatDate(c.date)} · {relativeDays(c.date)}
                        </p>
                      </div>

                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Buka commit ${c.sha.slice(0, 7)} di GitHub`}
                        className="no-print grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                      <code className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                        {c.sha.slice(0, 7)}
                      </code>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loadingCommits && commits.length > shownCommits && (
              <button
                type="button"
                onClick={() => setShownCommits((n) => n + COMMIT_PAGE_SIZE)}
                className="no-print mt-3 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Tampilkan {Math.min(COMMIT_PAGE_SIZE, commits.length - shownCommits)} lagi
                <span className="text-slate-400">
                  {" "}
                  · sisa {commits.length - shownCommits}
                </span>
              </button>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

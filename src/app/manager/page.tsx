"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  GitBranch,
  GitMerge,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useBranches } from "@/lib/useBranches";
import { useBranchSync } from "@/lib/useBranchSync";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Field";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { formatDate, relativeDays } from "@/lib/ui";
import { cn } from "@/lib/cn";
import {
  BRANCH_REVIEW_LABEL,
  type BranchReview,
  type BranchReviewStatus,
  type BranchSummary,
  type Member,
} from "@/lib/types";

const STATUS_CHIP: Record<BranchReviewStatus, string> = {
  pending: "bg-[var(--tone-amber-pastel)] text-[var(--tone-amber-text)]",
  approved: "bg-[var(--tone-green-pastel)] text-[var(--tone-green-text)]",
  rejected: "bg-[var(--tone-red-pastel)] text-[var(--tone-red-text)]",
  merged: "bg-[var(--tone-violet-pastel)] text-[var(--tone-violet-text)]",
};

const SUMMARY: Array<{ key: BranchReviewStatus; label: string }> = [
  { key: "pending", label: "Menunggu Review" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
  { key: "merged", label: "Sudah Di-merge" },
];

/** Keputusan yang sedang dikonfirmasi lewat modal. */
type Pending =
  | { kind: "approve" | "reject"; branch: BranchSummary; review: BranchReview }
  | { kind: "merge"; branch: BranchSummary; review: BranchReview }
  | null;

export default function ManagerPage() {
  const { projects, members, reviews, currentMember, updateReview, loading } = useStore();

  const repoProjects = useMemo(
    () =>
      projects
        .filter((p) => p.repo_url)
        .map((p) => ({ id: p.id, name: p.name, url: p.repo_url! })),
    [projects]
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);

  const activeProject = repoProjects.find((p) => p.id === selectedProjectId) ?? repoProjects[0];

  const { branches, error, warning, loading: loadingBranches, repo, defaultBranch, canMerge } =
    useBranches(activeProject?.url ?? null, reloadKey);

  // Tugas Kanban dibuat otomatis dari branch yang punya commit baru.
  const sync = useBranchSync(repo, activeProject?.id ?? null, branches, !loadingBranches);

  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  /**
   * Buka dialog sekaligus kosongkan catatan. Dijadikan satu fungsi supaya
   * catatan dari keputusan sebelumnya tidak ikut terbawa — dan supaya tidak
   * perlu effect yang memanggil setState hanya untuk mereset field.
   */
  const openDecision = useCallback((next: NonNullable<Pending>) => {
    setNote("");
    setPending(next);
  }, []);

  const reviewFor = useCallback(
    (branch: string): BranchReview | undefined =>
      reviews.find((r) => r.repo === repo && r.branch === branch),
    [reviews, repo]
  );

  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const counts = useMemo(() => {
    const c: Record<BranchReviewStatus, number> = {
      pending: 0, approved: 0, rejected: 0, merged: 0,
    };
    for (const b of branches) {
      const r = reviewFor(b.name);
      c[r?.status ?? "pending"]++;
    }
    return c;
  }, [branches, reviewFor]);

  /** Approve / reject: hanya mencatat keputusan, tidak menyentuh GitHub. */
  async function decide(kind: "approve" | "reject", review: BranchReview) {
    setBusy(true);
    try {
      await updateReview(review.id, {
        status: kind === "approve" ? "approved" : "rejected",
        reviewer_id: currentMember?.id ?? null,
        note: note.trim() || null,
      });
      setFlash({
        kind: "ok",
        text:
          kind === "approve"
            ? `Branch "${review.branch}" disetujui. Sekarang bisa di-merge ke ${defaultBranch}.`
            : `Branch "${review.branch}" ditolak.`,
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  /** Merge sungguhan ke branch default — tidak bisa dibatalkan dari aplikasi. */
  async function doMerge(review: BranchReview) {
    setBusy(true);
    try {
      const res = await fetch("/api/github/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, branch: review.branch, base: defaultBranch }),
      });
      const body = (await res.json()) as {
        merged?: boolean;
        already_merged?: boolean;
        sha?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setFlash({ kind: "bad", text: body.error ?? `Merge gagal (${res.status}).` });
        return;
      }

      await updateReview(review.id, {
        status: "merged",
        reviewer_id: currentMember?.id ?? review.reviewer_id,
        merged_at: new Date().toISOString(),
        merge_sha: body.sha ?? null,
      });
      setFlash({ kind: "ok", text: body.message ?? "Merge berhasil." });
      setReloadKey((k) => k + 1); // ambil ulang ahead/behind setelah repo berubah
    } catch (e: unknown) {
      setFlash({
        kind: "bad",
        text: e instanceof Error ? e.message : "Gagal menghubungi server.",
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Setujui fitur sebelum masuk ke branch utama"
        title="Project Manager"
        showSearch={false}
      />

      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Select
            value={activeProject?.id ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            aria-label="Pilih proyek"
          >
            {repoProjects.length === 0 ? (
              <option value="">Belum ada repo terhubung</option>
            ) : (
              repoProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </Select>
        </div>

        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-2 transition hover:bg-surface-2"
        >
          <RefreshCw className={cn("size-4", loadingBranches && "animate-spin")} />
          Muat ulang
        </button>

        {repo && (
          <a
            href={`https://github.com/${repo}/branches`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-full bg-inverse px-4 py-2.5 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover"
          >
            <GithubIcon className="size-4" /> {repo}
          </a>
        )}
      </div>

      {flash && (
        <Card
          className={cn(
            "mb-4 border",
            flash.kind === "ok"
              ? "border-[var(--tone-green-pastel)] bg-[var(--tone-green-soft)]"
              : "border-[var(--tone-red-pastel)] bg-[var(--tone-red-soft)]"
          )}
        >
          <p
            className={cn(
              "flex items-start justify-between gap-3 text-sm",
              flash.kind === "ok"
                ? "text-[var(--tone-green-text)]"
                : "text-[var(--tone-red-text)]"
            )}
          >
            <span className="flex items-start gap-2">
              {flash.kind === "ok" ? (
                <Check className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              )}
              {flash.text}
            </span>
            <button type="button" onClick={() => setFlash(null)} aria-label="Tutup pesan">
              <X className="size-4" />
            </button>
          </p>
        </Card>
      )}

      {(sync.created > 0 || sync.completed > 0) && (
        <Card className="mb-4 border border-[var(--tone-blue-pastel)] bg-[var(--tone-blue-soft)]">
          <p className="flex items-start gap-2 text-sm text-[var(--tone-blue-text)]">
            <GitBranch className="mt-0.5 size-4 shrink-0" />
            <span>
              {sync.created > 0 && `${sync.created} tugas baru dibuat otomatis dari branch. `}
              {sync.completed > 0 && `${sync.completed} tugas dipindahkan ke Selesai. `}
              <Link href="/tasks" className="font-medium underline">
                Lihat papan Tugas
              </Link>
            </span>
          </p>
        </Card>
      )}

      {!canMerge && repo && (
        <Card className="mb-4 border border-[var(--tone-amber-pastel)] bg-[var(--tone-amber-soft)]">
          <p className="flex items-start gap-2 text-sm text-[var(--tone-amber-text)]">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>
              Tombol merge nonaktif karena <span className="font-mono">GITHUB_TOKEN</span> belum
              diisi. Approve dan reject tetap bisa dipakai — merge-nya dilakukan manual di GitHub.
              Untuk mengaktifkan, isi token dengan izin tulis di{" "}
              <span className="font-mono">.env.local</span> lalu jalankan ulang server.
            </span>
          </p>
        </Card>
      )}

      {error && (
        <Card className="mb-4 border border-[var(--tone-amber-pastel)] bg-[var(--tone-amber-soft)]">
          <p className="flex items-start gap-2 text-sm text-[var(--tone-amber-text)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        </Card>
      )}

      {warning && !error && (
        <Card className="mb-4 border border-[var(--tone-sky-pastel)] bg-[var(--tone-sky-soft)]">
          <p className="flex items-start gap-2 text-sm text-[var(--tone-sky-text)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{warning}</span>
          </p>
        </Card>
      )}

      {!activeProject && !loading && (
        <Card className="py-12 text-center">
          <GitBranch className="mx-auto size-10 text-faint" />
          <p className="mt-3 text-ink-2">Belum ada repo GitHub yang terhubung.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Buka menu Proyek, ubah salah satu proyek, lalu isi kolom{" "}
            <span className="font-medium">URL repo GitHub</span>.
          </p>
          <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-ink underline">
            Buka halaman Proyek
          </Link>
        </Card>
      )}

      {activeProject && !error && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SUMMARY.map((s) => (
              <Card key={s.key} className="p-4">
                <p className="text-xs text-muted">{s.label}</p>
                <p className="mt-1 text-3xl font-bold text-ink">{counts[s.key]}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Branch Fitur"
              action={
                <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-semibold text-ink-2">
                  {branches.length}
                </span>
              }
            />

            {loadingBranches ? (
              <CardSkeleton />
            ) : branches.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 px-4 py-12 text-center text-sm text-muted">
                Belum ada branch selain <span className="font-mono">{defaultBranch}</span>. Begitu
                ada yang membuat branch fitur dan push, branch-nya muncul di sini.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {branches.map((b) => {
                  const review = reviewFor(b.name);
                  const status: BranchReviewStatus = review?.status ?? "pending";
                  const reviewer = review?.reviewer_id
                    ? memberById.get(review.reviewer_id)
                    : undefined;

                  return (
                    <li
                      key={b.name}
                      className="print-break rounded-2xl border border-line bg-surface-2 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <GitBranch className="size-4 shrink-0 text-faint" />
                            <a
                              href={b.compare_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="truncate font-mono text-sm font-semibold text-ink hover:underline"
                            >
                              {b.name}
                            </a>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                STATUS_CHIP[status]
                              )}
                            >
                              {BRANCH_REVIEW_LABEL[status]}
                            </span>
                            {b.protected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                                <Lock className="size-3" /> diproteksi
                              </span>
                            )}
                          </div>

                          {b.last_commit_message && (
                            <p className="mt-1.5 truncate text-sm text-ink-2">
                              {b.last_commit_message}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                            <span className="inline-flex items-center gap-1 text-[var(--tone-green-text)]">
                              <ArrowUp className="size-3.5" />
                              {b.ahead_by} commit baru
                            </span>
                            {b.behind_by > 0 && (
                              <span className="inline-flex items-center gap-1 text-[var(--tone-amber-text)]">
                                <ArrowDown className="size-3.5" />
                                {b.behind_by} di belakang {defaultBranch}
                              </span>
                            )}
                            {b.last_commit_date && (
                              <span>
                                {formatDate(b.last_commit_date)} · {relativeDays(b.last_commit_date)}
                              </span>
                            )}
                          </div>

                          {b.authors.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {b.authors.slice(0, 4).map((a) => {
                                const m = members.find(
                                  (x) =>
                                    x.github_username?.toLowerCase() === a.login?.toLowerCase() ||
                                    x.name.toLowerCase() === a.name.toLowerCase()
                                );
                                return (
                                  <span
                                    key={a.login ?? a.name}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 py-0.5 pr-2.5 pl-0.5"
                                  >
                                    {m ? (
                                      <Avatar name={m.name} color={m.avatar_color} size="sm" />
                                    ) : (
                                      <span className="grid size-8 place-items-center rounded-full bg-line">
                                        <GithubIcon className="size-3.5 text-muted" />
                                      </span>
                                    )}
                                    <span className="text-xs text-ink-2">
                                      {m?.name ?? a.login ?? a.name}
                                      <span className="text-faint"> · {a.count}</span>
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {review?.note && (
                            <p className="mt-2.5 rounded-xl bg-surface-3 px-3 py-2 text-xs text-ink-2">
                              <span className="font-medium">
                                Catatan{reviewer ? ` — ${reviewer.name}` : ""}:
                              </span>{" "}
                              {review.note}
                            </p>
                          )}

                          {b.error && (
                            <p className="mt-2 text-xs text-[var(--tone-red-text)]">{b.error}</p>
                          )}
                        </div>

                        {review && (
                          <div className="no-print flex shrink-0 flex-wrap items-center gap-2">
                            {status !== "merged" && (
                              <>
                                <Button
                                  variant={status === "approved" ? "primary" : "outline"}
                                  onClick={() => openDecision({ kind: "approve", branch: b, review })}
                                  disabled={busy}
                                >
                                  <Check className="size-4" /> Setujui
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => openDecision({ kind: "reject", branch: b, review })}
                                  disabled={busy}
                                >
                                  <X className="size-4" /> Tolak
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => openDecision({ kind: "merge", branch: b, review })}
                                  disabled={busy || !canMerge || status !== "approved" || b.ahead_by === 0}
                                  title={
                                    !canMerge
                                      ? "Butuh GITHUB_TOKEN dengan izin tulis"
                                      : status !== "approved"
                                        ? "Setujui dulu sebelum merge"
                                        : b.ahead_by === 0
                                          ? "Tidak ada commit baru untuk di-merge"
                                          : `Merge ke ${defaultBranch}`
                                  }
                                >
                                  <GitMerge className="size-4" /> Merge
                                </Button>
                              </>
                            )}
                            {status === "merged" && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--tone-violet-text)]">
                                <GitMerge className="size-4" />
                                {review.merged_at ? formatDate(review.merged_at) : "Selesai"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* ---------- Konfirmasi keputusan ---------- */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={
          pending?.kind === "merge"
            ? `Merge "${pending.branch.name}" ke ${defaultBranch}?`
            : pending?.kind === "approve"
              ? `Setujui "${pending?.branch.name}"?`
              : `Tolak "${pending?.branch.name}"?`
        }
      >
        {pending?.kind === "merge" ? (
          <>
            <div className="rounded-2xl border border-[var(--tone-red-pastel)] bg-[var(--tone-red-soft)] p-4">
              <p className="flex items-start gap-2 text-sm text-[var(--tone-red-text)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Ini menulis langsung ke repo GitHub dan{" "}
                  <span className="font-semibold">tidak bisa dibatalkan dari aplikasi ini</span>.{" "}
                  {pending.branch.ahead_by} commit dari{" "}
                  <span className="font-mono">{pending.branch.name}</span> akan masuk ke{" "}
                  <span className="font-mono">{defaultBranch}</span>.
                </span>
              </p>
            </div>
            {pending.branch.behind_by > 0 && (
              <p className="mt-3 text-xs text-muted">
                Catatan: branch ini tertinggal {pending.branch.behind_by} commit dari{" "}
                {defaultBranch}. Kalau ada perubahan di berkas yang sama, GitHub akan menolak
                merge karena konflik — itu harus diselesaikan manual.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                Batal
              </Button>
              <Button onClick={() => doMerge(pending.review)} disabled={busy}>
                <GitMerge className="size-4" />
                {busy ? "Sedang merge…" : `Ya, merge ke ${defaultBranch}`}
              </Button>
            </div>
          </>
        ) : (
          pending && (
            <>
              <label className="block text-sm font-medium text-ink-2" htmlFor="review-note">
                Catatan {pending.kind === "reject" ? "(alasan penolakan)" : "(opsional)"}
              </label>
              <textarea
                id="review-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  pending.kind === "approve"
                    ? "Contoh: sudah dites, aman digabung."
                    : "Contoh: masih ada console.log dan belum ada validasi form."
                }
                className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-faint outline-none transition focus:border-line-2 focus:ring-2 focus:ring-ink/15"
              />
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                  Batal
                </Button>
                <Button
                  variant={pending.kind === "reject" ? "danger" : "primary"}
                  onClick={() => decide(pending.kind, pending.review)}
                  disabled={busy}
                >
                  {pending.kind === "approve" ? "Setujui" : "Tolak"}
                </Button>
              </div>
            </>
          )
        )}
      </Modal>
    </>
  );
}

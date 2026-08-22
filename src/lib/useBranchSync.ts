"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { taskTitleForBranch, branchToPriority } from "./branchTask";
import type { BranchSummary, Member } from "./types";

interface SyncResult {
  /** Berapa tugas baru dibuat pada sinkronisasi terakhir. */
  created: number;
  /** Berapa tugas dipindahkan ke "Selesai" karena branch-nya sudah di-merge. */
  completed: number;
  running: boolean;
}

/**
 * Jaga agar tiap branch fitur punya satu tugas di papan Kanban.
 *
 * Dijalankan otomatis setiap daftar branch dimuat. Aman diulang: kunci
 * anti-duplikatnya adalah pasangan (source_repo, source_branch), yang juga
 * dijaga unique index di Postgres kalau dua anggota membuka halaman ini
 * bersamaan.
 */
export function useBranchSync(
  repo: string | null,
  projectId: string | null,
  branches: BranchSummary[],
  enabled: boolean
): SyncResult {
  const { tasks, members, reviews, addTask, updateTask, ensureReview } = useStore();
  const [result, setResult] = useState<SyncResult>({
    created: 0,
    completed: 0,
    running: false,
  });

  /**
   * Kunci yang sedang diproses. addTask bersifat async, sementara effect bisa
   * jalan lagi sebelum baris barunya masuk state — tanpa penjaga ini satu
   * branch bisa menghasilkan dua tugas.
   */
  const inFlight = useRef<Set<string>>(new Set());

  // Nama & username anggota dipakai untuk mengenali "hariz/…" sebagai nama
  // orang, bukan deskripsi pekerjaan.
  const knownHandles = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      if (m.github_username) set.add(m.github_username.toLowerCase());
      for (const part of m.name.toLowerCase().split(/\s+/)) {
        if (part.length > 2) set.add(part);
      }
    }
    return set;
  }, [members]);

  const memberByLogin = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) {
      if (m.github_username) map.set(m.github_username.toLowerCase(), m);
      map.set(m.name.toLowerCase(), m);
    }
    return map;
  }, [members]);

  useEffect(() => {
    if (!enabled || !repo || branches.length === 0) return;

    let cancelled = false;

    (async () => {
      let created = 0;
      let completed = 0;

      for (const b of branches) {
        // Branch tanpa commit baru terhadap main belum merepresentasikan
        // pekerjaan apa pun — belum layak jadi tugas.
        if (b.is_default || b.error || b.ahead_by <= 0) continue;

        const key = `${repo}::${b.name}`;
        if (inFlight.current.has(key)) continue;

        const existing = tasks.find(
          (t) => t.source_repo === repo && t.source_branch === b.name
        );
        const review = reviews.find((r) => r.repo === repo && r.branch === b.name);

        if (existing) {
          // Branch sudah di-merge → pekerjaannya selesai.
          if (review?.status === "merged" && existing.status !== "done") {
            inFlight.current.add(key);
            try {
              await updateTask(existing.id, { status: "done" });
              completed++;
            } finally {
              inFlight.current.delete(key);
            }
          }
          continue;
        }

        inFlight.current.add(key);
        try {
          await ensureReview(repo, b.name, projectId);

          // Penanggung jawab: penulis commit terakhir, jatuh ke kontributor
          // terbanyak kalau login-nya tidak dikenali.
          const candidates = [
            b.last_author_login,
            b.last_author_name,
            ...b.authors.flatMap((a) => [a.login, a.name]),
          ];
          const assignee =
            candidates
              .filter((c): c is string => Boolean(c))
              .map((c) => memberByLogin.get(c.toLowerCase()))
              .find(Boolean) ?? null;

          await addTask({
            project_id: projectId,
            assignee_id: assignee?.id ?? null,
            title: taskTitleForBranch(b.name, b.last_commit_message, knownHandles),
            description:
              `Dibuat otomatis dari branch \`${b.name}\` (${b.ahead_by} commit di depan main).` +
              (b.last_commit_message ? `\nCommit terakhir: ${b.last_commit_message}` : ""),
            status: "in_progress",
            priority: branchToPriority(b.name),
            due_date: null,
            source_repo: repo,
            source_branch: b.name,
          });
          created++;
        } finally {
          inFlight.current.delete(key);
        }

        if (cancelled) return;
      }

      if (!cancelled && (created > 0 || completed > 0)) {
        setResult({ created, completed, running: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    repo,
    projectId,
    branches,
    tasks,
    reviews,
    memberByLogin,
    knownHandles,
    addTask,
    updateTask,
    ensureReview,
  ]);

  return result;
}

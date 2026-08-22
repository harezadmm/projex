"use client";

import { useEffect, useState } from "react";
import type { Commit } from "./types";

interface CommitsState {
  commits: Commit[];
  loading: boolean;
  /** Pesan error yang layak ditampilkan ke pengguna, atau null kalau aman. */
  error: string | null;
  /** Hasil tetap ada, tapi ada yang perlu diketahui pengguna (mis. branch dilewati). */
  warning: string | null;
  repo: string | null;
  /** Semua branch yang dipindai, branch default di urutan pertama. */
  branches: string[];
  defaultBranch: string | null;
}

const IDLE: CommitsState = {
  commits: [],
  loading: false,
  error: null,
  warning: null,
  repo: null,
  branches: [],
  defaultBranch: null,
};

/**
 * Tarik commit dari repo GitHub lewat route handler `/api/github/commits`.
 * Repo di-fetch dari server (bukan langsung dari browser) supaya token
 * opsional tetap rahasia dan hasilnya bisa di-cache.
 *
 * Secara default semua branch dipindai, bukan hanya branch default — commit
 * di branch fitur yang belum di-merge tetap terhitung.
 */
export function useCommits(
  repoUrl: string | null | undefined,
  days = 30,
  /** Naikkan nilainya untuk memaksa muat ulang tanpa cache. */
  reloadKey = 0,
  /** Nama branch tertentu, atau null/"" untuk semua branch. */
  branch: string | null = null
): CommitsState {
  // Satu kunci mewakili satu permintaan. Hasil disimpan bersama kuncinya
  // supaya status "loading" bisa diturunkan tanpa setState di dalam effect.
  const key = repoUrl ? `${repoUrl}|${days}|${reloadKey}|${branch ?? ""}` : null;
  const [result, setResult] = useState<{ key: string; state: CommitsState } | null>(null);

  useEffect(() => {
    if (!key || !repoUrl) return;

    const controller = new AbortController();

    fetch(
      `/api/github/commits?repo=${encodeURIComponent(repoUrl)}&days=${days}` +
        (branch ? `&branch=${encodeURIComponent(branch)}` : "") +
        (reloadKey > 0 ? `&fresh=${reloadKey}` : ""),
      { signal: controller.signal }
    )
      .then(async (res) => {
        const body = (await res.json()) as {
          commits?: Commit[];
          repo?: string;
          branches?: string[];
          default_branch?: string;
          warning?: string | null;
          error?: string;
        };
        if (controller.signal.aborted) return;

        setResult({
          key,
          state: res.ok
            ? {
                commits: body.commits ?? [],
                loading: false,
                error: null,
                warning: body.warning ?? null,
                repo: body.repo ?? null,
                branches: body.branches ?? [],
                defaultBranch: body.default_branch ?? null,
              }
            : {
                ...IDLE,
                error: body.error ?? `Gagal memuat commit (${res.status}).`,
                repo: body.repo ?? null,
              },
        });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state: {
            ...IDLE,
            error: e instanceof Error ? e.message : "Gagal memuat commit.",
          },
        });
      });

    return () => controller.abort();
  }, [key, repoUrl, days, reloadKey, branch]);

  if (!key) return IDLE;
  if (result?.key !== key) return { ...IDLE, loading: true };
  return result.state;
}

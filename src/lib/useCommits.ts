"use client";

import { useEffect, useState } from "react";
import type { Commit } from "./types";

interface CommitsState {
  commits: Commit[];
  loading: boolean;
  /** Pesan error yang layak ditampilkan ke pengguna, atau null kalau aman. */
  error: string | null;
  repo: string | null;
}

const IDLE: CommitsState = { commits: [], loading: false, error: null, repo: null };

/**
 * Tarik commit dari repo GitHub lewat route handler `/api/github/commits`.
 * Repo di-fetch dari server (bukan langsung dari browser) supaya token
 * opsional tetap rahasia dan hasilnya bisa di-cache.
 */
export function useCommits(
  repoUrl: string | null | undefined,
  days = 30,
  /** Naikkan nilainya untuk memaksa muat ulang tanpa cache. */
  reloadKey = 0
): CommitsState {
  // Satu kunci mewakili satu permintaan. Hasil disimpan bersama kuncinya
  // supaya status "loading" bisa diturunkan tanpa setState di dalam effect.
  const key = repoUrl ? `${repoUrl}|${days}|${reloadKey}` : null;
  const [result, setResult] = useState<{ key: string; state: CommitsState } | null>(null);

  useEffect(() => {
    if (!key || !repoUrl) return;

    const controller = new AbortController();

    fetch(
      `/api/github/commits?repo=${encodeURIComponent(repoUrl)}&days=${days}` +
        (reloadKey > 0 ? `&fresh=${reloadKey}` : ""),
      { signal: controller.signal }
    )
      .then(async (res) => {
        const body = (await res.json()) as {
          commits?: Commit[];
          repo?: string;
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
                repo: body.repo ?? null,
              }
            : {
                commits: [],
                loading: false,
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
            commits: [],
            loading: false,
            error: e instanceof Error ? e.message : "Gagal memuat commit.",
            repo: null,
          },
        });
      });

    return () => controller.abort();
  }, [key, repoUrl, days, reloadKey]);

  if (!key) return IDLE;
  if (result?.key !== key) return { ...IDLE, loading: true };
  return result.state;
}

"use client";

import { useEffect, useState } from "react";
import type { BranchSummary } from "./types";

/**
 * `absent`   — GITHUB_TOKEN belum diisi
 * `invalid`  — token ada tapi ditolak GitHub (salah / dicabut / kedaluwarsa)
 * `no_write` — token sah tapi tidak punya izin tulis ke repo ini
 * `ok`       — GitHub mengonfirmasi izin push
 */
export type TokenStatus = "absent" | "invalid" | "no_write" | "ok";

interface BranchesState {
  branches: BranchSummary[];
  loading: boolean;
  error: string | null;
  warning: string | null;
  repo: string | null;
  defaultBranch: string | null;
  /** True hanya kalau GitHub sendiri mengonfirmasi izin tulis. */
  canMerge: boolean;
  tokenStatus: TokenStatus;
}

const IDLE: BranchesState = {
  branches: [],
  loading: false,
  error: null,
  warning: null,
  repo: null,
  defaultBranch: null,
  canMerge: false,
  tokenStatus: "absent",
};

/**
 * Tarik ringkasan tiap branch fitur (ahead/behind terhadap main, siapa yang
 * mengerjakan) lewat route handler `/api/github/branches`.
 */
export function useBranches(
  repoUrl: string | null | undefined,
  /** Naikkan nilainya untuk memaksa muat ulang tanpa cache. */
  reloadKey = 0
): BranchesState {
  const key = repoUrl ? `${repoUrl}|${reloadKey}` : null;
  const [result, setResult] = useState<{ key: string; state: BranchesState } | null>(null);

  useEffect(() => {
    if (!key || !repoUrl) return;

    const controller = new AbortController();

    fetch(
      `/api/github/branches?repo=${encodeURIComponent(repoUrl)}` +
        (reloadKey > 0 ? `&fresh=${reloadKey}` : ""),
      { signal: controller.signal }
    )
      .then(async (res) => {
        const body = (await res.json()) as {
          branches?: BranchSummary[];
          repo?: string;
          default_branch?: string;
          can_merge?: boolean;
          token_status?: TokenStatus;
          warning?: string | null;
          error?: string;
        };
        if (controller.signal.aborted) return;

        setResult({
          key,
          state: res.ok
            ? {
                branches: body.branches ?? [],
                loading: false,
                error: null,
                warning: body.warning ?? null,
                repo: body.repo ?? null,
                defaultBranch: body.default_branch ?? null,
                canMerge: Boolean(body.can_merge),
                tokenStatus: body.token_status ?? "absent",
              }
            : {
                ...IDLE,
                error: body.error ?? `Gagal memuat daftar branch (${res.status}).`,
                repo: body.repo ?? null,
                tokenStatus: body.token_status ?? "absent",
              },
        });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state: {
            ...IDLE,
            error: e instanceof Error ? e.message : "Gagal memuat daftar branch.",
          },
        });
      });

    return () => controller.abort();
  }, [key, repoUrl, reloadKey]);

  if (!key) return IDLE;
  if (result?.key !== key) return { ...IDLE, loading: true };
  return result.state;
}

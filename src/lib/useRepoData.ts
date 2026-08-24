"use client";

import { useEffect, useState } from "react";
import type { Contributor, RepoEvent } from "./types";

/**
 * Pola bersama untuk semua data yang ditarik dari route handler GitHub.
 *
 * Hasil disimpan bersama kuncinya, bukan di state terpisah, supaya status
 * "loading" bisa diturunkan saat render tanpa setState di dalam effect —
 * pola yang sama dipakai useCommits dan useBranches.
 */
function useRepoResource<T>(
  path: string,
  repoUrl: string | null | undefined,
  reloadKey: number,
  pick: (body: Record<string, unknown>) => T,
  empty: T
): { data: T; loading: boolean; error: string | null; note: string | null } {
  const key = repoUrl ? `${path}|${repoUrl}|${reloadKey}` : null;
  const [result, setResult] = useState<{
    key: string;
    data: T;
    error: string | null;
    note: string | null;
  } | null>(null);

  useEffect(() => {
    if (!key || !repoUrl) return;
    const controller = new AbortController();

    fetch(
      `${path}?repo=${encodeURIComponent(repoUrl)}` +
        (reloadKey > 0 ? `&fresh=${reloadKey}` : ""),
      { signal: controller.signal }
    )
      .then(async (res) => {
        const body = (await res.json()) as Record<string, unknown>;
        if (controller.signal.aborted) return;
        setResult({
          key,
          data: res.ok ? pick(body) : empty,
          error: res.ok
            ? null
            : ((body.error as string) ?? `Gagal memuat data (${res.status}).`),
          note: (body.note as string) ?? (body.warning as string) ?? null,
        });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          data: empty,
          error: e instanceof Error ? e.message : "Gagal memuat data.",
          note: null,
        });
      });

    return () => controller.abort();
    // `pick` dan `empty` sengaja tidak masuk daftar: keduanya literal baru
    // setiap render, dan memasukkannya akan memicu fetch tanpa henti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, repoUrl, reloadKey, path]);

  if (!key) return { data: empty, loading: false, error: null, note: null };
  if (result?.key !== key)
    return { data: empty, loading: true, error: null, note: null };
  return {
    data: result.data,
    loading: false,
    error: result.error,
    note: result.note,
  };
}

const NO_CONTRIBUTORS: Contributor[] = [];
const NO_EVENTS: RepoEvent[] = [];

/** Kontributor repo menurut GitHub, terurut dari commit terbanyak. */
export function useContributors(repoUrl: string | null | undefined, reloadKey = 0) {
  const { data, loading, error, note } = useRepoResource<Contributor[]>(
    "/api/github/contributors",
    repoUrl,
    reloadKey,
    (b) => (b.contributors as Contributor[]) ?? NO_CONTRIBUTORS,
    NO_CONTRIBUTORS
  );
  return { contributors: data, loading, error, warning: note };
}

/** Riwayat aktivitas repo: push, branch, PR, merge, release. */
export function useRepoEvents(repoUrl: string | null | undefined, reloadKey = 0) {
  const { data, loading, error, note } = useRepoResource<RepoEvent[]>(
    "/api/github/events",
    repoUrl,
    reloadKey,
    (b) => (b.events as RepoEvent[]) ?? NO_EVENTS,
    NO_EVENTS
  );
  return { events: data, loading, error, note };
}

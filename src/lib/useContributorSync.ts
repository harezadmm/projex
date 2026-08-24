"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { accentForIndex } from "./ui";
import type { Contributor, Member } from "./types";

export interface ContributorSyncResult {
  /** Anggota lama yang username GitHub-nya baru terisi otomatis. */
  linked: number;
  /** Kontributor yang belum ada di tim dan baru dibuat sebagai anggota. */
  created: number;
  /** Kontributor yang belum bisa diputuskan otomatis — perlu keputusan manual. */
  ambiguous: Contributor[];
}

const EMPTY: ContributorSyncResult = { linked: 0, created: 0, ambiguous: [] };

/** Normalisasi untuk perbandingan nama: buang non-alfanumerik dan huruf besar. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Selaraskan daftar anggota dengan kontributor repo.
 *
 * Dua langkah, dan urutannya penting:
 *
 * 1. TAUTKAN dulu. Anggota yang sudah ada tapi `github_username`-nya kosong
 *    dicocokkan ke kontributor lewat nama. Tanpa langkah ini, anggota yang
 *    sudah diketik manual ("Abin") akan dibuat ulang sebagai kontributor
 *    ("abin-dev") dan tim jadi punya dua baris untuk orang yang sama.
 *
 * 2. BUAT sisanya. Kontributor yang tidak cocok ke anggota mana pun
 *    ditambahkan sebagai anggota baru.
 *
 * Aman dijalankan berulang: kuncinya `github_username`, jadi begitu tertaut
 * atau terbuat, kontributor itu tidak akan diproses lagi.
 */
export function useContributorSync(
  contributors: Contributor[],
  enabled: boolean
): ContributorSyncResult {
  const { members, addMember, updateMember } = useStore();
  const [result, setResult] = useState<ContributorSyncResult>(EMPTY);

  /** addMember/updateMember async; tanpa penjaga ini satu login bisa dobel. */
  const inFlight = useRef<Set<string>>(new Set());

  const byLogin = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) {
      if (m.github_username) map.set(m.github_username.toLowerCase(), m);
    }
    return map;
  }, [members]);

  useEffect(() => {
    if (!enabled || contributors.length === 0) return;
    let cancelled = false;

    (async () => {
      let linked = 0;
      let created = 0;
      const ambiguous: Contributor[] = [];

      for (const c of contributors) {
        const login = c.login.toLowerCase();
        if (byLogin.has(login) || inFlight.current.has(login)) continue;

        // ---- Langkah 1: coba tautkan ke anggota yang sudah ada ----
        const kandidat = members.filter((m) => {
          if (m.github_username) return false; // sudah tertaut ke login lain
          const nm = norm(m.name);
          return (
            nm === norm(c.login) ||
            (c.name ? nm === norm(c.name) : false) ||
            // Nama depan saja: "Abin" vs "Abin Faishal"
            (c.name ? norm(c.name).startsWith(nm) && nm.length >= 4 : false)
          );
        });

        if (kandidat.length === 1) {
          inFlight.current.add(login);
          try {
            await updateMember(kandidat[0].id, { github_username: c.login });
            linked++;
          } finally {
            inFlight.current.delete(login);
          }
          if (cancelled) return;
          continue;
        }

        // Lebih dari satu anggota cocok — menebak di sini berisiko menautkan
        // ke orang yang salah, jadi diserahkan ke pengguna.
        if (kandidat.length > 1) {
          ambiguous.push(c);
          continue;
        }

        // ---- Langkah 2: benar-benar orang baru ----
        inFlight.current.add(login);
        try {
          await addMember({
            name: c.name?.trim() || c.login,
            email: null,
            role: "Anggota",
            github_username: c.login,
            avatar_color: accentForIndex(members.length + created),
            is_lead: false,
          });
          created++;
        } finally {
          inFlight.current.delete(login);
        }
        if (cancelled) return;
      }

      if (!cancelled && (linked > 0 || created > 0 || ambiguous.length > 0)) {
        setResult({ linked, created, ambiguous });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, contributors, members, byLogin, addMember, updateMember]);

  return result;
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "projex-app-settings";

export interface AppSettings {
  /** Identitas untuk kop laporan yang dikumpulkan ke dosen. */
  groupName: string;
  courseName: string;
  lecturerName: string;
  institution: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  groupName: "Kelompok 1",
  courseName: "Rekayasa Perangkat Lunak",
  lecturerName: "",
  institution: "",
};

/**
 * localStorage diperlakukan sebagai external store lewat useSyncExternalStore.
 * `cached` menjaga referensi snapshot tetap stabil — kalau setiap panggilan
 * mengembalikan objek baru, React akan me-render tanpa henti.
 */
let cached: AppSettings | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): AppSettings {
  if (cached === null) {
    try {
      const raw = localStorage.getItem(KEY);
      cached = raw
        ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
        : DEFAULT_SETTINGS;
    } catch {
      cached = DEFAULT_SETTINGS;
    }
  }
  return cached;
}

/** Saat render di server localStorage belum ada, jadi pakai nilai bawaan. */
function getServerSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

export function useAppSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const save = useCallback((next: AppSettings) => {
    cached = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage diblokir — perubahan tetap berlaku sampai halaman ditutup */
    }
    for (const listener of listeners) listener();
  }, []);

  return { settings, save };
}

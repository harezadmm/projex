"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "projex-theme";

/**
 * Skrip yang disisipkan ke <head> dan berjalan SEBELUM React hydrate.
 * Tanpa ini, halaman sempat berkedip terang dulu di tema gelap.
 *
 * Sengaja tidak membaca prefers-color-scheme: aplikasi ini default gelap,
 * dan pilihan pengguna yang tersimpan selalu menang.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = saved === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

/* --------------------------------------------------------------------------
 * Tema tinggal di DOM (kelas pada <html>) dan localStorage — keduanya sistem
 * di luar React. Jadi dibaca lewat useSyncExternalStore, bukan useState +
 * useEffect: tidak ada setState di dalam effect, tidak ada render berantai
 * saat mount, dan nilai yang dipakai React selalu sama dengan yang terlihat
 * di layar. Pola ini sama dengan "sedang masuk sebagai siapa" di store.tsx.
 * ----------------------------------------------------------------------- */
const listeners = new Set<() => void>();

/**
 * Snapshot harus stabil antar panggilan selama tidak ada perubahan, kalau
 * tidak React akan menganggapnya loop tak berujung. Karena itu hasil
 * pembacaan DOM di-cache dan hanya diperbarui oleh applyTheme.
 */
let cache: Theme | null = null;

function getSnapshot(): Theme {
  if (cache === null) {
    cache = document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
  return cache;
}

/** Server merender kelas `dark`; THEME_INIT_SCRIPT yang mengoreksinya di client. */
function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function applyTheme(next: Theme) {
  cache = next;
  document.documentElement.classList.toggle("dark", next === "dark");
  document.documentElement.style.colorScheme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Mode privat/penyimpanan penuh: tema tetap berlaku untuk sesi ini.
  }
  for (const listener of listeners) listener();
}

export function useTheme(): {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (next: Theme) => void;
} {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(
    () => applyTheme(theme === "dark" ? "light" : "dark"),
    [theme]
  );

  return { theme, toggleTheme, setTheme: applyTheme };
}

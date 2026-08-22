"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

/**
 * Jam dinding adalah sistem di luar React, jadi dibaca lewat
 * useSyncExternalStore — bukan Date.now() di badan render, yang membuat hasil
 * render tidak deterministik (dan ditolak React Compiler).
 *
 * Nilainya dibulatkan ke menit supaya snapshot-nya stabil: kalau setiap
 * pembacaan mengembalikan angka baru, React akan menganggapnya perubahan
 * tanpa henti dan render berulang selamanya.
 */
function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, MINUTE);
  return () => clearInterval(id);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

/**
 * Di server tidak ada waktu yang bisa disepakati dengan client tanpa memicu
 * hydration mismatch. Pemakai hook ini (baris statistik dashboard) hanya
 * dirender setelah data selesai dimuat di client, jadi nilai ini tidak
 * pernah sampai ke HTML.
 */
function getServerSnapshot(): number {
  return 0;
}

/** Waktu sekarang dalam milidetik, diperbarui tiap menit. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

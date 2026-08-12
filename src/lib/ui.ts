import type { AccentColor, Priority, TaskStatus } from "./types";

/**
 * Palet warna aksen. Kelas Tailwind ditulis lengkap (bukan hasil template
 * string) supaya ikut ter-generate saat build — Tailwind memindai kode
 * secara statis dan tidak mengenali kelas yang dirakit saat runtime.
 */
export const ACCENT: Record<
  AccentColor,
  { soft: string; text: string; dot: string; bar: string; hex: string }
> = {
  blue:   { soft: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500",   bar: "bg-blue-500",   hex: "#3b82f6" },
  orange: { soft: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", bar: "bg-orange-500", hex: "#f97316" },
  green:  { soft: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  bar: "bg-green-500",  hex: "#22c55e" },
  pink:   { soft: "bg-pink-50",   text: "text-pink-700",   dot: "bg-pink-500",   bar: "bg-pink-500",   hex: "#ec4899" },
  purple: { soft: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", bar: "bg-purple-500", hex: "#a855f7" },
  red:    { soft: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    bar: "bg-red-500",    hex: "#ef4444" },
  yellow: { soft: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500", bar: "bg-yellow-500", hex: "#eab308" },
};

export const ACCENT_KEYS = Object.keys(ACCENT) as AccentColor[];

/** Warna avatar berdasarkan urutan anggota, dipakai kalau belum diset manual. */
export function accentForIndex(i: number): AccentColor {
  return ACCENT_KEYS[i % ACCENT_KEYS.length];
}

export const STATUS_STYLE: Record<TaskStatus, { label: string; chip: string; dot: string }> = {
  todo:        { label: "Belum Mulai", chip: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
  in_progress: { label: "Dikerjakan",  chip: "bg-blue-100 text-blue-700",     dot: "bg-blue-500" },
  done:        { label: "Selesai",     chip: "bg-green-100 text-green-700",   dot: "bg-green-500" },
};

export const PRIORITY_STYLE: Record<Priority, { label: string; chip: string }> = {
  low:    { label: "Rendah", chip: "bg-slate-100 text-slate-600" },
  medium: { label: "Sedang", chip: "bg-amber-100 text-amber-700" },
  high:   { label: "Tinggi", chip: "bg-red-100 text-red-700" },
};

/** Inisial nama, maksimal 2 huruf. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** "12 Agu 2026" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** "3 hari lagi" / "2 hari lalu" / "Hari ini" */
export function relativeDays(value: string | null | undefined): string {
  if (!value) return "—";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "—";

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(target) - startOfDay(new Date())) / 86_400_000
  );

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Besok";
  if (diffDays === -1) return "Kemarin";
  if (diffDays > 0) return `${diffDays} hari lagi`;
  return `${Math.abs(diffDays)} hari lalu`;
}

/** Persentase aman dari pembagian nol. */
export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

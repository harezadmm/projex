import type { AccentColor, Priority, TaskStatus } from "./types";

/**
 * Palet warna aksen. Kelas Tailwind ditulis lengkap (bukan hasil template
 * string) supaya ikut ter-generate saat build — Tailwind memindai kode
 * secara statis dan tidak mengenali kelas yang dirakit saat runtime.
 */
export const ACCENT: Record<
  AccentColor,
  {
    soft: string;
    pastel: string;
    text: string;
    dot: string;
    bar: string;
    /** Warna solid untuk grafik dan indikator — cerah supaya terbaca di kedua tema. */
    hex: string;
    /**
     * Latar avatar. Sengaja lebih gelap dari `hex`: inisial ditulis putih,
     * dan di atas warna -500 kontrasnya cuma ~2.3:1 (gagal WCAG AA).
     * Shade -700 menaikkannya ke >4.5:1 tanpa mengubah identitas warnanya.
     */
    avatar: string;
  }
> = {
  blue:   { soft: "bg-[var(--tone-blue-soft)]",   pastel: "bg-[var(--tone-blue-pastel)]",   text: "text-[var(--tone-blue-text)]",   dot: "bg-blue-500",   bar: "bg-blue-500",   hex: "#3b82f6", avatar: "#1d4ed8" },
  orange: { soft: "bg-[var(--tone-orange-soft)]", pastel: "bg-[var(--tone-orange-pastel)]", text: "text-[var(--tone-orange-text)]", dot: "bg-orange-500", bar: "bg-orange-500", hex: "#f97316", avatar: "#c2410c" },
  green:  { soft: "bg-[var(--tone-green-soft)]",  pastel: "bg-[var(--tone-green-pastel)]",  text: "text-[var(--tone-green-text)]",  dot: "bg-green-500",  bar: "bg-green-500",  hex: "#22c55e", avatar: "#15803d" },
  pink:   { soft: "bg-[var(--tone-pink-soft)]",   pastel: "bg-[var(--tone-pink-pastel)]",   text: "text-[var(--tone-pink-text)]",   dot: "bg-pink-500",   bar: "bg-pink-500",   hex: "#ec4899", avatar: "#be185d" },
  purple: { soft: "bg-[var(--tone-purple-soft)]", pastel: "bg-[var(--tone-purple-pastel)]", text: "text-[var(--tone-purple-text)]", dot: "bg-purple-500", bar: "bg-purple-500", hex: "#a855f7", avatar: "#7e22ce" },
  red:    { soft: "bg-[var(--tone-red-soft)]",    pastel: "bg-[var(--tone-red-pastel)]",    text: "text-[var(--tone-red-text)]",    dot: "bg-red-500",    bar: "bg-red-500",    hex: "#ef4444", avatar: "#b91c1c" },
  yellow: { soft: "bg-[var(--tone-yellow-soft)]", pastel: "bg-[var(--tone-yellow-pastel)]", text: "text-[var(--tone-yellow-text)]", dot: "bg-yellow-500", bar: "bg-yellow-500", hex: "#eab308", avatar: "#a16207" },
};

export const ACCENT_KEYS = Object.keys(ACCENT) as AccentColor[];

/** Warna avatar berdasarkan urutan anggota, dipakai kalau belum diset manual. */
export function accentForIndex(i: number): AccentColor {
  return ACCENT_KEYS[i % ACCENT_KEYS.length];
}

export const STATUS_STYLE: Record<TaskStatus, { label: string; chip: string; dot: string }> = {
  todo:        { label: "Belum Mulai", chip: "bg-surface-3 text-ink-2",   dot: "bg-faint" },
  in_progress: { label: "Dikerjakan",  chip: "bg-[var(--tone-blue-pastel)] text-[var(--tone-blue-text)]",     dot: "bg-blue-500" },
  done:        { label: "Selesai",     chip: "bg-[var(--tone-green-pastel)] text-[var(--tone-green-text)]",   dot: "bg-green-500" },
};

export const PRIORITY_STYLE: Record<Priority, { label: string; chip: string }> = {
  low:    { label: "Rendah", chip: "bg-surface-3 text-ink-2" },
  medium: { label: "Sedang", chip: "bg-[var(--tone-amber-pastel)] text-[var(--tone-amber-text)]" },
  high:   { label: "Tinggi", chip: "bg-[var(--tone-red-pastel)] text-[var(--tone-red-text)]" },
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

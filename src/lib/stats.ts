import type { BranchReview, Task } from "./types";

/** Panjang jendela perbandingan untuk angka delta, dalam hari. */
export const STAT_WINDOW_DAYS = 30;

export interface StatBucket {
  todo: number;
  doing: number;
  review: number;
  done: number;
  overdue: number;
}

export interface StatSummary {
  counts: StatBucket;
  /**
   * Persentase perubahan dibanding jendela sebelumnya. null berarti tidak ada
   * dasar pembanding (jendela sebelumnya kosong) — lebih baik tidak
   * menampilkan apa pun daripada mengarang "+100%".
   */
  deltas: Record<keyof StatBucket, number | null>;
}

function deltaPercent(now: number, before: number): number | null {
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/**
 * Hitung ringkasan untuk baris stat di dashboard.
 *
 * Waktu acuan dikirim sebagai argumen, bukan dibaca di dalam fungsi ini,
 * supaya hasilnya deterministik untuk input yang sama — memudahkan pengujian
 * dan aman dipanggil dari useMemo.
 */
export function summarizeWork(
  tasks: Task[],
  reviews: BranchReview[],
  nowMs: number
): StatSummary {
  const day = 86_400_000;
  const recentFrom = nowMs - STAT_WINDOW_DAYS * day;
  const priorFrom = nowMs - 2 * STAT_WINDOW_DAYS * day;

  const inWindow = (iso: string | null, from: number, to: number) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return !Number.isNaN(t) && t >= from && t < to;
  };

  const createdDelta = (list: Array<{ created_at: string }>) =>
    deltaPercent(
      list.filter((x) => inWindow(x.created_at, recentFrom, nowMs)).length,
      list.filter((x) => inWindow(x.created_at, priorFrom, recentFrom)).length
    );

  const todo = tasks.filter((t) => t.status === "todo");
  const doing = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");
  const review = reviews.filter((r) => r.status === "pending");

  // Terlambat dihitung terhadap awal hari ini: tugas yang jatuh tempo hari
  // ini belum terlambat sampai harinya berganti.
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const overdue = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.due_date &&
      Date.parse(t.due_date) < startOfToday.getTime()
  );

  return {
    counts: {
      todo: todo.length,
      doing: doing.length,
      review: review.length,
      done: done.length,
      overdue: overdue.length,
    },
    deltas: {
      todo: createdDelta(todo),
      doing: createdDelta(doing),
      review: createdDelta(review),
      // Untuk "selesai", yang bermakna adalah kapan rampungnya, bukan dibuatnya.
      done: deltaPercent(
        done.filter((t) => inWindow(t.completed_at, recentFrom, nowMs)).length,
        done.filter((t) => inWindow(t.completed_at, priorFrom, recentFrom)).length
      ),
      // Tidak ada riwayat kapan sebuah tugas mulai terlambat, jadi tidak ada
      // delta yang bisa dihitung jujur di sini.
      overdue: null,
    },
  };
}

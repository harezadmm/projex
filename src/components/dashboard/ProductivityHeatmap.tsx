"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useCommits } from "@/lib/useCommits";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/** Berapa minggu ditampilkan — setahun penuh plus minggu berjalan. */
const WEEKS = 53;

const WEEKDAY_LABEL = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Kunci harian yang stabil di zona waktu lokal (bukan UTC seperti toISOString). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Senin sebagai awal minggu, mengikuti kebiasaan kalender di Indonesia. */
function startOfWeekMonday(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (out.getDay() + 6) % 7; // Minggu(0) -> 6, Senin(1) -> 0
  out.setDate(out.getDate() - shift);
  return out;
}

/**
 * Peta kontribusi setahun ala GitHub: kolom = minggu, baris = hari.
 * Menggabungkan commit GitHub dengan catatan progres, karena tidak semua
 * pekerjaan kelompok berakhir jadi commit (riset, laporan, desain).
 */
export function ProductivityHeatmap() {
  const { projects, logs } = useStore();
  const repoUrl = projects.find((p) => p.repo_url)?.repo_url ?? null;
  const { commits, loading } = useCommits(repoUrl, 365);

  const { weeks, monthMarks, total, best } = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (iso: string | null | undefined) => {
      if (!iso) return;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      const k = dayKey(d);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    };

    for (const c of commits) bump(c.date);
    for (const l of logs) bump(l.created_at);

    // Grid dibangun mundur dari minggu berjalan supaya kolom terakhir
    // selalu berisi hari ini.
    const thisWeek = startOfWeekMonday(new Date());
    const first = new Date(thisWeek);
    first.setDate(first.getDate() - (WEEKS - 1) * 7);

    const today = dayKey(new Date());
    const grid: Array<Array<{ key: string; count: number; future: boolean; label: string }>> = [];
    const marks: Array<{ index: number; label: string }> = [];
    let seenMonth = -1;
    let sum = 0;
    let max = 0;

    for (let w = 0; w < WEEKS; w++) {
      const col: Array<{ key: string; count: number; future: boolean; label: string }> = [];

      for (let d = 0; d < 7; d++) {
        const date = new Date(first);
        date.setDate(first.getDate() + w * 7 + d);
        const key = dayKey(date);
        const count = counts.get(key) ?? 0;
        sum += count;
        if (count > max) max = count;

        col.push({
          key,
          count,
          future: key > today,
          label: `${date.getDate()} ${MONTH_LABEL[date.getMonth()]} ${date.getFullYear()}`,
        });
      }

      // Label bulan ditaruh di kolom pertama yang menyentuh bulan baru
      const monthOfCol = new Date(first);
      monthOfCol.setDate(first.getDate() + w * 7);
      if (monthOfCol.getMonth() !== seenMonth) {
        seenMonth = monthOfCol.getMonth();
        marks.push({ index: w, label: MONTH_LABEL[seenMonth] });
      }

      grid.push(col);
    }

    return { weeks: grid, monthMarks: marks, total: sum, best: max };
  }, [commits, logs]);

  /** 0–4; skala relatif terhadap hari tersibuk supaya tetap terbaca di repo sepi. */
  const level = (count: number): number => {
    if (count === 0) return 0;
    if (best <= 1) return 4;
    return Math.min(4, Math.ceil((count / best) * 4));
  };

  const LEVEL_CLASS = [
    "bg-surface-3",
    "bg-blue-500/25",
    "bg-blue-500/45",
    "bg-blue-500/70",
    "bg-blue-500",
  ];

  return (
    <Card>
      <CardHeader
        title="Peta Produktivitas"
        action={
          <span className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-ink-2">
            {total} aktivitas · 12 bulan
          </span>
        }
      />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Gabungan commit GitHub dan catatan progres tiap hari.
      </p>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-surface-3" />
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="inline-block min-w-full">
            {/* Label bulan sejajar dengan kolom minggunya */}
            <div className="mb-1 flex gap-[3px] pl-9">
              {weeks.map((_, i) => {
                const mark = monthMarks.find((m) => m.index === i);
                return (
                  <span
                    key={i}
                    className="w-[11px] shrink-0 text-[10px] leading-none text-faint"
                  >
                    {mark?.label ?? ""}
                  </span>
                );
              })}
            </div>

            <div className="flex gap-[3px]">
              {/* Label hari: hanya Sen/Rab/Jum supaya tidak berdesakan */}
              <div className="mr-1 flex w-8 shrink-0 flex-col gap-[3px]">
                {WEEKDAY_LABEL.map((d, i) => (
                  <span
                    key={d}
                    className="h-[11px] text-[10px] leading-[11px] text-faint"
                  >
                    {i % 2 === 0 ? d : ""}
                  </span>
                ))}
              </div>

              {weeks.map((col, wi) => (
                <div key={wi} className="flex shrink-0 flex-col gap-[3px]">
                  {col.map((cell) => (
                    <span
                      key={cell.key}
                      title={
                        cell.future
                          ? cell.label
                          : `${cell.label}: ${cell.count} aktivitas`
                      }
                      className={cn(
                        "size-[11px] rounded-[3px]",
                        cell.future ? "bg-transparent" : LEVEL_CLASS[level(cell.count)]
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-faint">
              <span>Sedikit</span>
              {LEVEL_CLASS.map((c) => (
                <span key={c} className={cn("size-[11px] rounded-[3px]", c)} />
              ))}
              <span>Banyak</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

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

/** Lebar kolom label hari; dipakai juga sebagai offset baris label bulan. */
const LABEL_COL = "1.75rem"; // w-7
const COL_GAP = "3px";

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
 * Ramp diambil dari token --heat-*, bukan alpha dari --accent.
 *
 * Alpha tidak bisa dipakai untuk dua tema sekaligus: lime 20% di atas latar
 * terang hampir tidak terbedakan dari petak kosong, sehingga level terendah
 * hilang. Token eksplisit membuat ramp bergerak makin gelap di tema terang
 * dan makin terang di tema gelap.
 */
const LEVEL_CLASS = [
  "bg-[var(--heat-0)]",
  "bg-[var(--heat-1)]",
  "bg-[var(--heat-2)]",
  "bg-[var(--heat-3)]",
  "bg-[var(--heat-4)]",
];

/**
 * Peta kontribusi setahun ala GitHub: kolom = minggu, baris = hari.
 * Menggabungkan commit GitHub dengan catatan progres, karena tidak semua
 * pekerjaan kelompok berakhir jadi commit (riset, laporan, desain).
 *
 * Petaknya memakai lebar 1fr + aspect-square, bukan ukuran piksel tetap,
 * supaya grid mengisi penuh lebar kartu di layar selebar apa pun.
 */
export function ProductivityHeatmap() {
  const { projects, logs } = useStore();
  const repoUrl = projects.find((p) => p.repo_url)?.repo_url ?? null;
  const { commits, loading } = useCommits(repoUrl, 365);

  const { cells, monthMarks, total, best, activeDays } = useMemo(() => {
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
    // Urutan kolom-major: satu minggu penuh dulu, baru minggu berikutnya —
    // cocok dengan grid-flow-col + grid-rows-7.
    const flat: Array<{ key: string; count: number; future: boolean; label: string }> = [];
    const marks: Array<{ index: number; label: string }> = [];
    let seenMonth = -1;
    let sum = 0;
    let max = 0;
    let days = 0;

    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(first);
        date.setDate(first.getDate() + w * 7 + d);
        const key = dayKey(date);
        const count = counts.get(key) ?? 0;
        sum += count;
        if (count > 0) days++;
        if (count > max) max = count;

        flat.push({
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
    }

    return { cells: flat, monthMarks: marks, total: sum, best: max, activeDays: days };
  }, [commits, logs]);

  /** 0–4; skala relatif terhadap hari tersibuk supaya tetap terbaca di repo sepi. */
  const level = (count: number): number => {
    if (count === 0) return 0;
    if (best <= 1) return 4;
    return Math.min(4, Math.ceil((count / best) * 4));
  };

  const columns = `repeat(${WEEKS}, minmax(0, 1fr))`;

  return (
    <Card>
      <CardHeader
        title="Peta Produktivitas"
        action={
          <span className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-ink-2">
            {total} aktivitas · {activeDays} hari aktif · 12 bulan
          </span>
        }
      />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Gabungan commit GitHub dan catatan progres tiap hari.
      </p>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-3" />
      ) : (
        // Di layar sempit 53 kolom akan jadi terlalu kecil, jadi diberi lebar
        // minimum lalu dibiarkan menggulir horizontal.
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[40rem]">
            {/* Label bulan: tiap label merentang sampai bulan berikutnya */}
            <div
              className="mb-1.5 grid"
              style={{
                gridTemplateColumns: columns,
                gap: COL_GAP,
                paddingLeft: `calc(${LABEL_COL} + 0.5rem)`,
              }}
            >
              {monthMarks.map((m, i) => (
                <span
                  key={`${m.label}-${m.index}`}
                  className="truncate text-[11px] leading-none text-faint"
                  style={{
                    gridColumn: `${m.index + 1} / span ${
                      (monthMarks[i + 1]?.index ?? WEEKS) - m.index
                    }`,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* items-stretch: kolom label ikut setinggi grid petak, lalu
                dibagi 7 baris sama besar sehingga sejajar sendiri. */}
            <div className="flex items-stretch gap-2">
              <div
                className="grid w-7 shrink-0 grid-rows-7"
                style={{ gap: COL_GAP }}
              >
                {WEEKDAY_LABEL.map((d, i) => (
                  <span
                    key={d}
                    className="flex items-center text-[11px] leading-none text-faint"
                  >
                    {/* Hanya hari ganjil dilabeli supaya tidak berdesakan */}
                    {i % 2 === 0 ? d : ""}
                  </span>
                ))}
              </div>

              <div
                className="grid min-w-0 flex-1 grid-flow-col grid-rows-7"
                style={{ gridTemplateColumns: columns, gap: COL_GAP }}
              >
                {cells.map((cell) => (
                  <span
                    key={cell.key}
                    title={
                      cell.future ? cell.label : `${cell.label}: ${cell.count} aktivitas`
                    }
                    className={cn(
                      "aspect-square rounded-[3px]",
                      cell.future ? "bg-transparent" : LEVEL_CLASS[level(cell.count)]
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-faint">
              <span>Sedikit</span>
              {LEVEL_CLASS.map((c) => (
                <span key={c} className={cn("size-3 rounded-[3px]", c)} />
              ))}
              <span>Banyak</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

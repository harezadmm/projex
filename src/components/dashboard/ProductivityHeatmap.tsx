"use client";

import { useMemo, useState } from "react";
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

type View = "daily" | "weekly" | "monthly";

const VIEWS: Array<{ key: View; label: string }> = [
  { key: "daily", label: "Harian" },
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" },
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

interface Cell {
  key: string;
  /** Aktivitas pada hari itu sendiri. */
  count: number;
  /** Total minggu tempat hari ini berada. */
  weekCount: number;
  /** Total bulan tempat hari ini berada. */
  monthCount: number;
  future: boolean;
  dayLabel: string;
  weekLabel: string;
  monthLabel: string;
}

/**
 * Peta produktivitas setahun: kolom = minggu, baris = hari.
 *
 * Ketiga tampilan memakai grid yang SAMA — 53 x 7 petak, tidak berubah
 * bentuk. Yang berganti hanyalah dasar pewarnaannya:
 *
 *   Harian   : setiap petak diwarnai oleh aktivitas hari itu sendiri
 *   Mingguan : tujuh petak dalam satu kolom berbagi warna dari total minggu
 *   Bulanan  : semua petak dalam satu bulan berbagi warna dari total bulan
 *
 * Efeknya seperti memperbesar-mengecilkan resolusi: makin ringkas, makin
 * terlihat blok periode yang produktif, tanpa kehilangan kerangka kalender.
 *
 * Menggabungkan commit GitHub dengan catatan progres, karena tidak semua
 * pekerjaan kelompok berakhir jadi commit (riset, laporan, desain).
 */
export function ProductivityHeatmap() {
  const { projects, logs } = useStore();
  const repoUrl = projects.find((p) => p.repo_url)?.repo_url ?? null;
  const { commits, loading } = useCommits(repoUrl, 365);

  const [view, setView] = useState<View>("daily");

  const data = useMemo(() => {
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

    /*
      Dua lintasan. Lintasan pertama menjumlahkan per minggu dan per bulan;
      lintasan kedua baru menempelkan total itu ke tiap petak. Sekali jalan
      tidak bisa: warna sebuah petak bergantung pada total periodenya, yang
      belum diketahui sampai seluruh periode itu terbaca.
    */
    const weekTotals = new Array<number>(WEEKS).fill(0);
    const monthTotals = new Map<string, number>();
    const dates: Date[][] = [];

    for (let w = 0; w < WEEKS; w++) {
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(first);
        date.setDate(first.getDate() + w * 7 + d);
        col.push(date);

        const n = counts.get(dayKey(date)) ?? 0;
        weekTotals[w] += n;
        const mk = `${date.getFullYear()}-${date.getMonth()}`;
        monthTotals.set(mk, (monthTotals.get(mk) ?? 0) + n);
      }
      dates.push(col);
    }

    const cells: Cell[] = [];
    const marks: Array<{ index: number; label: string }> = [];
    let seenMonth = -1;
    let total = 0;
    let dayPeak = 0;
    let activeDays = 0;

    for (let w = 0; w < WEEKS; w++) {
      for (const date of dates[w]) {
        const key = dayKey(date);
        const count = counts.get(key) ?? 0;
        const mk = `${date.getFullYear()}-${date.getMonth()}`;

        total += count;
        if (count > 0) activeDays++;
        if (count > dayPeak) dayPeak = count;

        const wStart = dates[w][0];
        const wEnd = dates[w][6];

        cells.push({
          key,
          count,
          weekCount: weekTotals[w],
          monthCount: monthTotals.get(mk) ?? 0,
          future: key > today,
          dayLabel: `${date.getDate()} ${MONTH_LABEL[date.getMonth()]} ${date.getFullYear()}`,
          weekLabel:
            `Minggu ${wStart.getDate()} ${MONTH_LABEL[wStart.getMonth()]}` +
            ` – ${wEnd.getDate()} ${MONTH_LABEL[wEnd.getMonth()]}`,
          monthLabel: `${MONTH_LABEL[date.getMonth()]} ${date.getFullYear()}`,
        });
      }

      const wStart = dates[w][0];
      if (wStart.getMonth() !== seenMonth) {
        seenMonth = wStart.getMonth();
        marks.push({ index: w, label: MONTH_LABEL[seenMonth] });
      }
    }

    return {
      cells,
      monthMarks: marks,
      total,
      dayPeak,
      activeDays,
      weekPeak: Math.max(0, ...weekTotals),
      monthPeak: Math.max(0, ...monthTotals.values()),
      activeWeeks: weekTotals.filter((n) => n > 0).length,
      activeMonths: [...monthTotals.values()].filter((n) => n > 0).length,
    };
  }, [commits, logs]);

  /** 0–4; skala relatif terhadap puncak periode agar tetap terbaca di repo sepi. */
  const level = (count: number, peak: number): number => {
    if (count === 0) return 0;
    if (peak <= 1) return 4;
    return Math.min(4, Math.ceil((count / peak) * 4));
  };

  /** Nilai dan label satu petak, sesuai tingkat perbesaran yang dipilih. */
  const cellView = (c: Cell): { value: number; peak: number; label: string } => {
    if (view === "weekly")
      return { value: c.weekCount, peak: data.weekPeak, label: c.weekLabel };
    if (view === "monthly")
      return { value: c.monthCount, peak: data.monthPeak, label: c.monthLabel };
    return { value: c.count, peak: data.dayPeak, label: c.dayLabel };
  };

  const columns = `repeat(${WEEKS}, minmax(0, 1fr))`;

  const ringkasan =
    view === "daily"
      ? `${data.total} aktivitas · ${data.activeDays} hari aktif`
      : view === "weekly"
        ? `${data.total} aktivitas · ${data.activeWeeks} minggu aktif`
        : `${data.total} aktivitas · ${data.activeMonths} bulan aktif`;

  const skalaKeterangan =
    view === "daily"
      ? `Warna mengikuti aktivitas per hari · tertinggi ${data.dayPeak}`
      : view === "weekly"
        ? `Warna mengikuti total per minggu · tertinggi ${data.weekPeak}`
        : `Warna mengikuti total per bulan · tertinggi ${data.monthPeak}`;

  return (
    <Card>
      <CardHeader
        title="Peta Produktivitas"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="glass-chip flex items-center gap-0.5 rounded-full p-0.5"
              role="group"
              aria-label="Tingkat perbesaran"
            >
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  aria-pressed={view === v.key}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    view === v.key
                      ? "bg-inverse text-on-inverse"
                      : "text-ink-2 hover:brightness-125"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <span className="glass-chip hidden rounded-full px-3 py-1 text-xs font-medium text-ink-2 sm:inline">
              {ringkasan} · 12 bulan
            </span>
          </div>
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
          {/*
            371 petak adalah bagian DOM terberat di dashboard.
            content-visibility menunda layout dan paint-nya sampai benar-benar
            terlihat, dan contain-intrinsic-size memberi tinggi perkiraan
            supaya scrollbar tidak melompat sebelum itu terjadi.
          */}
          <div
            className="min-w-[40rem]"
            style={{ contentVisibility: "auto", containIntrinsicSize: "auto 260px" }}
          >
            {/* Label bulan: tiap label merentang sampai bulan berikutnya */}
            <div
              className="mb-1.5 grid"
              style={{
                gridTemplateColumns: columns,
                gap: COL_GAP,
                paddingLeft: `calc(${LABEL_COL} + 0.5rem)`,
              }}
            >
              {data.monthMarks.map((m, i) => (
                <span
                  key={`${m.label}-${m.index}`}
                  className="truncate text-[11px] leading-none text-faint"
                  style={{
                    gridColumn: `${m.index + 1} / span ${
                      (data.monthMarks[i + 1]?.index ?? WEEKS) - m.index
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
              <div className="grid w-7 shrink-0 grid-rows-7" style={{ gap: COL_GAP }}>
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
                {data.cells.map((cell) => {
                  const { value, peak, label } = cellView(cell);
                  return (
                    <span
                      key={cell.key}
                      title={
                        cell.future
                          ? cell.dayLabel
                          : `${label}: ${value} aktivitas`
                      }
                      className={cn(
                        "aspect-square rounded-[3px] transition-colors duration-300",
                        cell.future
                          ? "bg-transparent"
                          : LEVEL_CLASS[level(value, peak)]
                      )}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-faint">
              <span>{skalaKeterangan}</span>
              <span className="flex items-center gap-1.5">
                <span>Sedikit</span>
                {LEVEL_CLASS.map((c) => (
                  <span key={c} className={cn("size-3 rounded-[3px]", c)} />
                ))}
                <span>Banyak</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

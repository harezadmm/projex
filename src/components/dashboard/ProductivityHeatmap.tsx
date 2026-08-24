"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useCommits } from "@/lib/useCommits";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/** Berapa minggu ditampilkan — setahun penuh plus minggu berjalan. */
const WEEKS = 53;
const MONTHS = 12;

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

interface Bucket {
  key: string;
  label: string;
  count: number;
}

/**
 * Peta produktivitas dengan tiga tingkat perbesaran.
 *
 * Harian memakai grid ala GitHub — satu petak per hari, kolom = minggu.
 * Mingguan dan bulanan memakai bar, bukan grid: setelah data diringkas,
 * yang berguna adalah membandingkan besarannya, dan grid satu baris justru
 * membuang informasi itu.
 *
 * Menggabungkan commit GitHub dengan catatan progres, karena tidak semua
 * pekerjaan kelompok berakhir jadi commit (riset, laporan, desain).
 */
export function ProductivityHeatmap() {
  const { projects, logs } = useStore();
  const repoUrl = projects.find((p) => p.repo_url)?.repo_url ?? null;
  const { commits, loading } = useCommits(repoUrl, 365);

  const [view, setView] = useState<View>("daily");

  const { cells, monthMarks, weekBuckets, monthBuckets, total, best, activeDays } =
    useMemo(() => {
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
      const weeks: Bucket[] = [];
      let seenMonth = -1;
      let sum = 0;
      let max = 0;
      let days = 0;

      for (let w = 0; w < WEEKS; w++) {
        let weekSum = 0;
        const weekStart = new Date(first);
        weekStart.setDate(first.getDate() + w * 7);

        for (let d = 0; d < 7; d++) {
          const date = new Date(first);
          date.setDate(first.getDate() + w * 7 + d);
          const key = dayKey(date);
          const count = counts.get(key) ?? 0;
          sum += count;
          weekSum += count;
          if (count > 0) days++;
          if (count > max) max = count;

          flat.push({
            key,
            count,
            future: key > today,
            label: `${date.getDate()} ${MONTH_LABEL[date.getMonth()]} ${date.getFullYear()}`,
          });
        }

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weeks.push({
          key: dayKey(weekStart),
          label:
            `${weekStart.getDate()} ${MONTH_LABEL[weekStart.getMonth()]}` +
            ` – ${weekEnd.getDate()} ${MONTH_LABEL[weekEnd.getMonth()]}`,
          count: weekSum,
        });

        // Label bulan ditaruh di kolom pertama yang menyentuh bulan baru
        if (weekStart.getMonth() !== seenMonth) {
          seenMonth = weekStart.getMonth();
          marks.push({ index: w, label: MONTH_LABEL[seenMonth] });
        }
      }

      // Bulanan dihitung dari kunci harian, bukan dari minggu: satu minggu
      // bisa memotong dua bulan, jadi menjumlahkan minggu akan salah tempat.
      const months: Bucket[] = [];
      const now = new Date();
      for (let i = MONTHS - 1; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const prefix = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-`;
        let msum = 0;
        for (const [k, v] of counts) if (k.startsWith(prefix)) msum += v;
        months.push({
          key: prefix,
          label: `${MONTH_LABEL[m.getMonth()]} ${m.getFullYear()}`,
          count: msum,
        });
      }

      return {
        cells: flat,
        monthMarks: marks,
        weekBuckets: weeks,
        monthBuckets: months,
        total: sum,
        best: max,
        activeDays: days,
      };
    }, [commits, logs]);

  /** 0–4; skala relatif terhadap nilai tertinggi supaya tetap terbaca di repo sepi. */
  const level = (count: number, peak: number): number => {
    if (count === 0) return 0;
    if (peak <= 1) return 4;
    return Math.min(4, Math.ceil((count / peak) * 4));
  };

  const columns = `repeat(${WEEKS}, minmax(0, 1fr))`;
  const buckets = view === "weekly" ? weekBuckets : monthBuckets;
  const bucketPeak = Math.max(1, ...buckets.map((b) => b.count));
  const aktifBucket = buckets.filter((b) => b.count > 0).length;

  const ringkasan =
    view === "daily"
      ? `${total} aktivitas · ${activeDays} hari aktif · 12 bulan`
      : view === "weekly"
        ? `${total} aktivitas · ${aktifBucket} minggu aktif · 53 minggu`
        : `${total} aktivitas · ${aktifBucket} bulan aktif · 12 bulan`;

  return (
    <Card>
      <CardHeader
        title="Peta Produktivitas"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Pengalih tampilan; gaya pil mengikuti filter rentang di Topbar */}
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
              {ringkasan}
            </span>
          </div>
        }
      />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Gabungan commit GitHub dan catatan progres tiap hari.
      </p>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-3" />
      ) : view === "daily" ? (
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
                {cells.map((cell) => (
                  <span
                    key={cell.key}
                    title={
                      cell.future ? cell.label : `${cell.label}: ${cell.count} aktivitas`
                    }
                    className={cn(
                      "aspect-square rounded-[3px]",
                      cell.future
                        ? "bg-transparent"
                        : LEVEL_CLASS[level(cell.count, best)]
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
      ) : (
        /*
          Tampilan ringkas: bar, bukan grid. Tinggi bar sebanding dengan
          jumlah aktivitas, jadi perbandingan antar periode langsung terbaca —
          sesuatu yang hilang kalau diringkas jadi satu baris petak.
        */
        <div className="overflow-x-auto pb-1">
          <div className={view === "weekly" ? "min-w-[36rem]" : "min-w-0"}>
            <div className="flex h-40 items-end gap-[3px]" style={{ gap: COL_GAP }}>
              {buckets.map((b) => (
                <div
                  key={b.key}
                  className="flex h-full flex-1 items-end"
                  title={`${b.label}: ${b.count} aktivitas`}
                >
                  <span
                    className={cn(
                      "w-full rounded-[3px] transition-[height] duration-500",
                      LEVEL_CLASS[level(b.count, bucketPeak)]
                    )}
                    style={{
                      // Periode kosong tetap diberi garis dasar tipis supaya
                      // terlihat sebagai "nol", bukan sebagai data yang hilang.
                      height: b.count === 0 ? "3px" : `${Math.max(8, (b.count / bucketPeak) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-1.5 flex" style={{ gap: COL_GAP }}>
              {view === "weekly"
                ? // 53 minggu terlalu rapat untuk dilabeli semua, jadi
                  // labelnya mengikuti batas bulan seperti tampilan harian.
                  buckets.map((_, i) => {
                    const mark = monthMarks.find((m) => m.index === i);
                    return (
                      <span
                        key={i}
                        className="min-w-0 flex-1 truncate text-[11px] leading-none text-faint"
                      >
                        {mark?.label ?? ""}
                      </span>
                    );
                  })
                : buckets.map((b) => (
                    <span
                      key={b.key}
                      className="min-w-0 flex-1 truncate text-center text-[11px] leading-none text-faint"
                    >
                      {b.label.split(" ")[0]}
                    </span>
                  ))}
            </div>

            <p className="mt-3 text-right text-[11px] text-faint">
              Tertinggi {bucketPeak} aktivitas per{" "}
              {view === "weekly" ? "minggu" : "bulan"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

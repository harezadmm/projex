"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  GitPullRequestArrow,
  Loader,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { summarizeWork, STAT_WINDOW_DAYS, type StatBucket } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const TILES: Array<{
  key: keyof StatBucket;
  label: string;
  caption: string;
  icon: LucideIcon;
  tone: string;
  /** Untuk "Terlambat", angka naik itu kabar buruk — warna deltanya dibalik. */
  goodWhenUp: boolean;
}> = [
  {
    key: "todo",
    label: "Belum Mulai",
    caption: "Menunggu dikerjakan",
    icon: CircleDashed,
    tone: "text-muted",
    goodWhenUp: true,
  },
  {
    key: "doing",
    label: "Dikerjakan",
    caption: "Sedang berjalan",
    icon: Loader,
    tone: "text-[var(--tone-blue-text)]",
    goodWhenUp: true,
  },
  {
    key: "review",
    label: "Menunggu Review",
    caption: "Branch belum diputuskan",
    icon: GitPullRequestArrow,
    tone: "text-[var(--tone-amber-text)]",
    goodWhenUp: false,
  },
  {
    key: "done",
    label: "Selesai",
    caption: `Rampung ${STAT_WINDOW_DAYS} hari terakhir`,
    icon: CheckCircle2,
    tone: "text-[var(--tone-green-text)]",
    goodWhenUp: true,
  },
  {
    key: "overdue",
    label: "Terlambat",
    caption: "Lewat tenggat",
    icon: Clock,
    tone: "text-[var(--tone-red-text)]",
    goodWhenUp: false,
  },
];

/**
 * Baris ringkasan di puncak dashboard.
 *
 * Angka delta dihitung dari data nyata: item yang masuk ke keadaan itu dalam
 * 30 hari terakhir dibanding 30 hari sebelumnya. Kalau tidak ada pembanding,
 * deltanya tidak ditampilkan.
 */
export function StatTiles() {
  const { tasks, reviews } = useStore();
  const now = useNow();

  const { counts, deltas } = useMemo(
    () => summarizeWork(tasks, reviews, now),
    [tasks, reviews, now]
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TILES.map((t) => {
        const Icon = t.icon;
        const delta = deltas[t.key];
        const up = (delta ?? 0) >= 0;

        return (
          <Card key={t.key} className="p-4">
            <div className="flex items-center gap-2">
              <Icon className={cn("size-4 shrink-0", t.tone)} />
              <span className="min-w-0 truncate text-xs font-medium text-ink-2">
                {t.label}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-ink">{counts[t.key]}</span>
              {delta !== null && delta !== 0 && (
                <span
                  title={`Dibanding ${STAT_WINDOW_DAYS} hari sebelumnya`}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    up === t.goodWhenUp
                      ? "bg-[var(--tone-green-soft)] text-[var(--tone-green-text)]"
                      : "bg-[var(--tone-red-soft)] text-[var(--tone-red-text)]"
                  )}
                >
                  {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {Math.abs(delta)}%
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-xs text-muted">{t.caption}</p>
          </Card>
        );
      })}
    </div>
  );
}

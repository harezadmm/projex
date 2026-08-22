"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, AlertCircle } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { useCommits } from "@/lib/useCommits";
import { Card, CardHeader, CardIconButton } from "@/components/ui/Card";

const DAYS = 30;
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

/** Kunci hari lokal "YYYY-MM-DD" — sengaja tidak pakai toISOString agar tidak bergeser zona waktu. */
function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ActivityChartCard() {
  const { projects, logs } = useStore();

  // Pakai repo dari proyek pertama yang punya repo_url
  const repoUrl = projects.find((p) => p.repo_url)?.repo_url ?? null;
  const { commits, error: commitError, loading } = useCommits(repoUrl, DAYS);

  const data = useMemo(() => {
    // Kerangka 30 hari terakhir, semua nol
    const buckets = new Map<string, { label: string; commit: number; catatan: number }>();
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - (DAYS - 1));

    for (let i = 0; i < DAYS; i++) {
      const key = dayKey(cursor);
      buckets.set(key, {
        label: `${cursor.getDate()} ${MONTHS_ID[cursor.getMonth()]}`,
        commit: 0,
        catatan: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const c of commits) {
      const bucket = buckets.get(dayKey(new Date(c.date)));
      if (bucket) bucket.commit += 1;
    }

    for (const l of logs) {
      const bucket = buckets.get(dayKey(new Date(l.created_at)));
      if (bucket) bucket.catatan += 1;
    }

    return [...buckets.values()];
  }, [commits, logs]);

  const totalCommits = commits.length;
  const totalLogs = data.reduce((sum, d) => sum + d.catatan, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Aktivitas Tim"
        action={
          <CardIconButton label="Buka aktivitas GitHub" href="/activity">
            <ArrowUpRight className="size-4" />
          </CardIconButton>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-blue-500" />
          <span className="text-ink-2">
            Commit: <span className="font-semibold text-ink">{totalCommits}</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-orange-500" />
          <span className="text-ink-2">
            Catatan: <span className="font-semibold text-ink">{totalLogs}</span>
          </span>
        </span>
        <span className="ml-auto text-xs text-faint">{DAYS} hari terakhir</span>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCommit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(DAYS / 6)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                boxShadow: "0 8px 24px -12px rgb(15 23 42 / 0.25)",
              }}
              labelStyle={{ fontWeight: 600, color: "#0f172a" }}
            />
            <Area
              type="monotone"
              dataKey="commit"
              name="Commit"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#gradCommit)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="catatan"
              name="Catatan progres"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#gradLog)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {loading && (
        <p className="mt-3 text-xs text-faint">Memuat commit dari GitHub…</p>
      )}

      {!loading && !repoUrl && (
        <p className="mt-3 text-xs text-muted">
          Belum ada repo terhubung.{" "}
          <Link href="/settings" className="font-medium underline">
            Tambahkan URL repo
          </Link>{" "}
          supaya commit tim ikut terhitung.
        </p>
      )}

      {!loading && commitError && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--tone-amber-text)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{commitError}</span>
        </p>
      )}
    </Card>
  );
}

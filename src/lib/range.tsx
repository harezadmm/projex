"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type RangeKey = "today" | "week" | "month" | "all";

export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  all: "Semua",
};

/** Jumlah hari ke belakang yang dicakup tiap rentang. `null` berarti tanpa batas. */
const RANGE_DAYS: Record<RangeKey, number | null> = {
  today: 1,
  week: 7,
  month: 30,
  all: null,
};

interface RangeValue {
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  /** Batas awal rentang, atau null kalau "Semua". */
  since: Date | null;
  /** True kalau tanggal berada di dalam rentang aktif. */
  inRange: (value: string | null | undefined) => boolean;
}

const RangeContext = createContext<RangeValue | null>(null);

export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<RangeKey>("month");

  const value = useMemo<RangeValue>(() => {
    const days = RANGE_DAYS[range];
    let since: Date | null = null;

    if (days !== null) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (days - 1));
      since = d;
    }

    return {
      range,
      setRange,
      since,
      inRange: (value) => {
        if (!since) return true;
        if (!value) return false;
        const d = new Date(value);
        return !Number.isNaN(d.getTime()) && d >= since;
      },
    };
  }, [range]);

  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRange(): RangeValue {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("useRange harus dipakai di dalam <RangeProvider>");
  return ctx;
}

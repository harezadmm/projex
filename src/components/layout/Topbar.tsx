"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, HelpCircle, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { RANGE_LABEL, useRange, type RangeKey } from "@/lib/range";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";

const RANGES: RangeKey[] = ["today", "week", "month", "all"];

export function Topbar() {
  const { members, currentMember, setCurrentMemberId, mode } = useStore();
  const { range, setRange } = useRange();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar area menu
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    // Satu bar kaca utuh (bukan pill terpisah-pisah) = satu permukaan
    // backdrop-filter, jauh lebih murah untuk GPU. Sticky hanya di layar
    // lebar; di layar kecil bar ini tinggi karena wrap, jadi dibiarkan
    // ikut menggulir supaya tidak memakan layar.
    <header className="no-print glass top-3 z-40 flex flex-wrap items-center justify-between gap-4 rounded-3xl px-4 py-3 lg:sticky">
      <Link href="/" className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-ink">projex</span>
        <span className="text-xs font-medium text-faint">studio</span>
      </Link>

      {/* Filter rentang waktu */}
      <div className="order-3 flex w-full items-center gap-1.5 overflow-x-auto lg:order-none lg:w-auto">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
              range === r
                ? "bg-inverse text-on-inverse shadow-md shadow-black/25"
                : "bg-surface/50 text-ink-2 hover:bg-surface/90"
            )}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
        <Link
          href="/report"
          className="shrink-0 rounded-full bg-surface/50 px-4 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface/90"
        >
          Laporan
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="size-10 border-0 bg-surface/50 hover:bg-surface/90" />
        <Link
          href="/report"
          aria-label="Laporan"
          title="Laporan"
          className="grid size-10 place-items-center rounded-full bg-surface/50 text-muted transition hover:bg-surface/90 hover:text-ink"
        >
          <FileText className="size-[18px]" />
        </Link>
        <Link
          href="/settings"
          aria-label="Bantuan"
          title="Bantuan & panduan"
          className="grid size-10 place-items-center rounded-full bg-surface/50 text-muted transition hover:bg-surface/90 hover:text-ink"
        >
          <HelpCircle className="size-[18px]" />
        </Link>
        <Link
          href="/settings"
          aria-label="Pengaturan"
          title="Pengaturan"
          className="grid size-10 place-items-center rounded-full bg-surface/50 text-muted transition hover:bg-surface/90 hover:text-ink"
        >
          <Settings className="size-[18px]" />
        </Link>

        {/* Pemilih "saya login sebagai siapa" */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-full bg-surface/50 py-1.5 pr-3 pl-1.5 transition hover:bg-surface/90"
          >
            {currentMember ? (
              <Avatar name={currentMember.name} color={currentMember.avatar_color} />
            ) : (
              <span className="size-10 rounded-full bg-line" />
            )}
            <span className="hidden text-left sm:block">
              <span className="block text-sm leading-tight font-semibold text-ink">
                {currentMember?.name ?? "Belum ada anggota"}
              </span>
              <span className="block text-xs leading-tight text-muted">
                {currentMember?.role ?? "Tambahkan anggota dulu"}
              </span>
            </span>
            <ChevronDown className="size-4 text-faint" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="glass-strong absolute right-0 z-40 mt-2 w-64 rounded-2xl p-2"
            >
              <p className="px-3 py-2 text-xs font-medium text-faint">
                Masuk sebagai
              </p>
              {members.length === 0 && (
                <p className="px-3 pb-2 text-sm text-muted">
                  Belum ada anggota. Tambahkan di menu Anggota.
                </p>
              )}
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCurrentMemberId(m.id);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface/80",
                    currentMember?.id === m.id && "bg-surface/80"
                  )}
                >
                  <Avatar name={m.name} color={m.avatar_color} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {m.name}
                    </span>
                    <span className="block truncate text-xs text-muted">{m.role}</span>
                  </span>
                </button>
              ))}

              <div className="mt-2 border-t border-line px-3 pt-2 pb-1">
                <span
                  className={cn(
                    "text-xs font-medium",
                    mode === "supabase" ? "text-[var(--tone-green-text)]" : "text-[var(--tone-amber-text)]"
                  )}
                >
                  {mode === "supabase"
                    ? "● Terhubung ke Supabase"
                    : "● Mode demo (data lokal)"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  ListChecks,
  Users,
  ClipboardList,
  GitCommitHorizontal,
  GitPullRequestArrow,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/projects", label: "Proyek", icon: FolderKanban },
  { href: "/tasks", label: "Tugas", icon: ListChecks },
  { href: "/manager", label: "Project Manager", icon: GitPullRequestArrow },
  { href: "/members", label: "Anggota", icon: Users },
  { href: "/progress", label: "Catatan Progres", icon: ClipboardList },
  { href: "/activity", label: "Aktivitas GitHub", icon: GitCommitHorizontal },
  { href: "/report", label: "Laporan", icon: FileText },
  { href: "/settings", label: "Pengaturan", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    // Rail kaca tunggal membungkus semua ikon = satu permukaan backdrop-filter.
    // z-30: kartu glass di <main> membuat stacking context sendiri dan datang
    // belakangan di DOM, jadi tanpa z-index tooltip menu tertindih kartu.
    // (Tangga z: konten < nav 30 < topbar 40 < modal 50.)
    <nav
      aria-label="Navigasi utama"
      className="no-print glass relative z-30 flex shrink-0 flex-row gap-1.5 rounded-3xl p-2 overflow-x-auto lg:flex-col lg:self-start lg:overflow-visible"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative grid size-11 shrink-0 place-items-center rounded-2xl transition",
              active
                ? "bg-inverse text-on-inverse shadow-lg shadow-black/25"
                : "text-faint hover:bg-surface/80 hover:text-ink-2"
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.2 : 1.9} />

            {/* Tooltip nama menu, muncul saat hover di layar lebar */}
            <span
              role="tooltip"
              // Tooltip pakai permukaan netral, bukan warna aksen: aksen
              // dipakai untuk menandai item aktif, dan dua-duanya lime
              // membuat tooltip terbaca seolah item itu sedang terpilih.
              className="pointer-events-none absolute left-full z-30 ml-3 hidden whitespace-nowrap rounded-lg border border-line bg-surface-3 px-2.5 py-1.5 text-xs font-medium text-ink opacity-0 shadow-lg shadow-black/40 transition-opacity group-hover:opacity-100 lg:block"
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

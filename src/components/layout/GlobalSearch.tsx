"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUS_STYLE } from "@/lib/ui";

interface Hit {
  href: string;
  title: string;
  subtitle: string;
  kind: "Tugas" | "Proyek" | "Anggota";
}

export function GlobalSearch() {
  const { tasks, projects, members } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const projectName = (id: string | null) =>
      projects.find((p) => p.id === id)?.name ?? "Tanpa proyek";

    const taskHits: Hit[] = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        href: "/tasks",
        title: t.title,
        subtitle: `${projectName(t.project_id)} · ${STATUS_STYLE[t.status].label}`,
        kind: "Tugas",
      }));

    const projectHits: Hit[] = projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p) => ({
        href: `/projects/${p.id}`,
        title: p.name,
        subtitle: p.description ?? "—",
        kind: "Proyek",
      }));

    const memberHits: Hit[] = members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.github_username ?? "").toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((m) => ({
        href: "/members",
        title: m.name,
        subtitle: m.role,
        kind: "Anggota",
      }));

    return [...taskHits, ...projectHits, ...memberHits];
  }, [query, tasks, projects, members]);

  return (
    <div ref={boxRef} className="no-print relative w-full lg:max-w-lg">
      <Search className="pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari tugas, proyek, atau anggota..."
        aria-label="Pencarian"
        className="glass w-full rounded-full py-3.5 pr-5 pl-13 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white/85"
      />

      {open && query.trim().length >= 2 && (
        <div className="glass-strong absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-2xl p-2">
          {hits.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">
              Tidak ada hasil untuk “{query}”.
            </p>
          ) : (
            hits.map((hit, i) => (
              <Link
                key={`${hit.kind}-${hit.title}-${i}`}
                href={hit.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/80"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {hit.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {hit.subtitle}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {hit.kind}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ACCENT, PRIORITY_STYLE, relativeDays } from "@/lib/ui";
import type { Member, Project, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

/**
 * Warna pill deadline mengikuti urgensinya, gaya "N Day Left" di referensi:
 * lewat = merah, mepet (≤ 2 hari) = kuning, longgar = hijau. Pill-nya putih
 * translusen supaya tetap kontras di atas kartu pastel warna apa pun.
 */
function dueTone(due: string | null, status: TaskStatus) {
  if (!due) return null;

  const neutral = { text: "text-slate-500", dot: "bg-slate-400" };
  if (status === "done") return neutral;

  const target = new Date(due);
  if (Number.isNaN(target.getTime())) return neutral;

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(target) - startOfDay(new Date())) / 86_400_000
  );

  if (diffDays < 0) return { text: "text-red-600", dot: "bg-red-500" };
  if (diffDays <= 2) return { text: "text-amber-700", dot: "bg-amber-500" };
  return { text: "text-green-700", dot: "bg-green-500" };
}

/**
 * Satu kartu tugas, bentuk "map folder" ala referensi: chip nama proyek
 * menyatu dengan badan kartu sebagai tab di pojok kiri atas (warna sama,
 * sudut kiri-atas badan dibuat siku), badan kartu pastel mengikuti warna
 * aksen proyeknya.
 *
 * Dipisah jadi komponen sendiri supaya React Compiler bisa memoisasi per
 * kartu — saat satu tugas berubah, ratusan kartu lain tidak ikut di-render
 * ulang. Latar pastel solid tanpa backdrop-filter: kartu ini dirender
 * massal, blur per kartu akan membebani GPU.
 */
export function TaskCard({
  task,
  member,
  project,
  onEdit,
  onDelete,
  onMove,
}: {
  task: Task;
  member: Member | undefined;
  project: Project | undefined;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, direction: -1 | 1) => void;
}) {
  const accent = project ? ACCENT[project.color] : null;
  // Tab dan badan HARUS memakai kelas bg yang sama persis supaya menyatu mulus
  const soft = accent?.soft ?? "bg-slate-100";
  const tabText = accent?.text ?? "text-slate-600";
  const idx = COLUMNS.indexOf(task.status);
  const due = dueTone(task.due_date, task.status);

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className="cursor-grab transition hover:-translate-y-0.5 active:cursor-grabbing"
    >
      {/* Tab folder: nama proyek, menyatu dengan badan kartu */}
      <div className="flex items-end">
        <span
          className={cn(
            "inline-flex max-w-[70%] items-center gap-1.5 rounded-t-2xl px-3.5 pt-2 pb-1.5 text-xs font-semibold",
            soft,
            tabText
          )}
        >
          <span className="truncate">{project?.name ?? "Tanpa proyek"}</span>
        </span>
        <Badge className={cn("mb-1 ml-1.5", PRIORITY_STYLE[task.priority].chip)}>
          {PRIORITY_STYLE[task.priority].label}
        </Badge>
      </div>

      {/* Badan kartu: sudut kiri-atas siku supaya menyambung dengan tab */}
      <div className={cn("rounded-2xl rounded-tl-none p-4 shadow-sm", soft)}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug font-semibold text-slate-900">
            {task.title}
          </p>
          <div className="no-print -mt-1 -mr-1 flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Ubah ${task.title}`}
              className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/80 hover:text-slate-700"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label={`Hapus ${task.title}`}
              className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/80 hover:text-red-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {task.description}
          </p>
        )}

        {/* Pill deadline putih dengan dot urgensi, gaya "N Day Left" */}
        {due && (
          <span
            className={cn(
              "mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium",
              due.text
            )}
          >
            <Dot className={due.dot} />
            {relativeDays(task.due_date)}
          </span>
        )}

        {/* Footer: penanggung jawab di kiri, tombol geser kolom di kanan */}
        <div className="mt-3 flex items-center gap-2 border-t border-white/70 pt-2.5">
          {member ? (
            <>
              <Avatar
                name={member.name}
                color={member.avatar_color}
                size="sm"
                className="ring-2 ring-white/80"
              />
              <span className="min-w-0 truncate text-xs text-slate-600">{member.name}</span>
            </>
          ) : (
            <span className="text-xs text-slate-400">Belum ditugaskan</span>
          )}

          {/* Tombol geser kolom, untuk layar sentuh yang tidak mendukung drag */}
          <div className="no-print ml-auto flex shrink-0 gap-1">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => onMove(task, -1)}
              aria-label={`Pindahkan ${task.title} ke kolom sebelumnya`}
              className="grid size-7 place-items-center rounded-full bg-white/70 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={idx === COLUMNS.length - 1}
              onClick={() => onMove(task, 1)}
              aria-label={`Pindahkan ${task.title} ke kolom berikutnya`}
              className="grid size-7 place-items-center rounded-full bg-white/70 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

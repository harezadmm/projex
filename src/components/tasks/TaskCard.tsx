"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ACCENT, PRIORITY_STYLE, relativeDays } from "@/lib/ui";
import type { Member, Project, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

/**
 * Warna pill deadline mengikuti urgensinya, seperti pill "N Day Left" di
 * referensi desain: lewat = merah, mepet (≤ 2 hari) = kuning, longgar = hijau.
 * Tugas selesai selalu netral — deadline-nya sudah tidak relevan.
 */
function dueTone(due: string | null, status: TaskStatus) {
  if (!due) return null;

  const neutral = { chip: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };
  if (status === "done") return neutral;

  const target = new Date(due);
  if (Number.isNaN(target.getTime())) return neutral;

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(target) - startOfDay(new Date())) / 86_400_000
  );

  if (diffDays < 0) return { chip: "bg-red-50 text-red-600", dot: "bg-red-500" };
  if (diffDays <= 2) return { chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  return { chip: "bg-green-50 text-green-700", dot: "bg-green-500" };
}

/**
 * Satu kartu tugas. Dipisah jadi komponen sendiri supaya React Compiler
 * bisa memoisasi per kartu — saat satu tugas berubah, 599 kartu lain
 * tidak ikut di-render ulang.
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
  const accent = ACCENT[project?.color ?? "blue"];
  const idx = COLUMNS.indexOf(task.status);
  const due = dueTone(task.due_date, task.status);

  return (
    // Kartu putih solid (tanpa backdrop-filter!) di atas kolom kaca — kartu
    // ini dirender massal, blur per kartu akan membebani GPU.
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className="cursor-grab rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      {/* Baris chip: proyek (warna aksen proyek) + prioritas, seperti tag di referensi */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {project && (
            <Badge className={cn(accent.soft, accent.text)}>
              <span className="max-w-36 truncate">{project.name}</span>
            </Badge>
          )}
          <Badge className={PRIORITY_STYLE[task.priority].chip}>
            {PRIORITY_STYLE[task.priority].label}
          </Badge>
        </div>
        <div className="no-print flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Ubah ${task.title}`}
            className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            aria-label={`Hapus ${task.title}`}
            className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-2.5 text-sm leading-snug font-semibold text-slate-900">
        {task.title}
      </p>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {task.description}
        </p>
      )}

      {/* Pill deadline dengan dot urgensi, gaya "N Day Left" di referensi */}
      {due && (
        <span
          className={cn(
            "mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            due.chip
          )}
        >
          <Dot className={due.dot} />
          {relativeDays(task.due_date)}
        </span>
      )}

      {/* Footer: penanggung jawab di kiri, tombol geser kolom di kanan */}
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        {member ? (
          <>
            <Avatar name={member.name} color={member.avatar_color} size="sm" />
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
            className="grid size-7 place-items-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            disabled={idx === COLUMNS.length - 1}
            onClick={() => onMove(task, 1)}
            aria-label={`Pindahkan ${task.title} ke kolom berikutnya`}
            className="grid size-7 place-items-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

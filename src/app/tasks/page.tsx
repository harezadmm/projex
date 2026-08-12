"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { COLUMNS, TaskCard } from "@/components/tasks/TaskCard";
import { TaskFormModal, type TaskFormValues } from "@/components/tasks/TaskFormModal";
import { ACCENT, STATUS_STYLE, formatDate, percent } from "@/lib/ui";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Jumlah kartu yang ditampilkan per kolom sebelum tombol "tampilkan lebih".
 * Membatasi jumlah simpul DOM adalah cara paling efektif menjaga papan tetap
 * ringan saat tugas sudah menumpuk ratusan.
 */
const PER_COLUMN = 25;

export default function TasksPage() {
  const { tasks, projects, members, addTask, updateTask, deleteTask, loading } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");

  const [filterProject, setFilterProject] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [shown, setShown] = useState<Record<TaskStatus, number>>({
    todo: PER_COLUMN,
    in_progress: PER_COLUMN,
    done: PER_COLUMN,
  });

  // Kelompokkan sekali per perubahan data, bukan tiga kali filter terpisah
  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) {
      if (filterProject !== "all" && t.project_id !== filterProject) continue;
      if (filterMember !== "all" && t.assignee_id !== filterMember) continue;
      grouped[t.status].push(t);
    }
    return grouped;
  }, [tasks, filterProject, filterMember]);

  // Peta pencarian O(1), menggantikan .find() di dalam setiap kartu
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  // Ringkasan untuk banner: total & selesai dari tugas yang sedang tersaring,
  // plus anggota yang terlibat (untuk tumpukan avatar ala referensi).
  const summary = useMemo(() => {
    const total = columns.todo.length + columns.in_progress.length + columns.done.length;
    const ids = new Set<string>();
    for (const status of COLUMNS) {
      for (const t of columns[status]) if (t.assignee_id) ids.add(t.assignee_id);
    }
    return { total, done: columns.done.length, memberIds: [...ids] };
  }, [columns]);

  const bannerProject =
    filterProject !== "all" ? projectById.get(filterProject) : undefined;
  const bannerAccent = ACCENT[bannerProject?.color ?? "blue"];
  const bannerPct = percent(summary.done, summary.total);
  const stackMembers = summary.memberIds
    .map((id) => memberById.get(id))
    .filter((m) => m !== undefined)
    .slice(0, 5);

  function openCreate(status: TaskStatus = "todo") {
    setEditing(null);
    setDefaultStatus(status);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setModalOpen(true);
  }

  async function handleSubmit(values: TaskFormValues) {
    if (editing) await updateTask(editing.id, values);
    else await addTask(values);
    setModalOpen(false);
  }

  async function handleDelete(task: Task) {
    if (window.confirm(`Hapus tugas "${task.title}"? Tindakan ini tidak bisa dibatalkan.`)) {
      await deleteTask(task.id);
    }
  }

  /** Geser tugas satu kolom ke kiri/kanan — alternatif drag untuk layar sentuh. */
  function move(task: Task, direction: -1 | 1) {
    const next = COLUMNS[COLUMNS.indexOf(task.status) + direction];
    if (next) updateTask(task.id, { status: next });
  }

  return (
    <>
      <PageHeader
        eyebrow="Papan tugas seluruh anggota kelompok"
        title="Tugas"
        action={
          <Button onClick={() => openCreate()} className="shrink-0">
            <Plus className="size-4" /> Tugas Baru
          </Button>
        }
      />

      {/*
        Banner ringkasan ala referensi: nama proyek + deadline + progress bar
        di kiri, tumpukan avatar + counter tugas di kanan. Warna banner
        mengikuti aksen proyek yang dipilih di filter (default biru), dipulas
        tipis di atas kaca supaya senada dengan tema.
      */}
      {!loading && projects.length > 0 && (
        <section className="card relative mb-4 overflow-hidden p-5">
          <div className={cn("absolute inset-0 opacity-60", bannerAccent.soft)} aria-hidden />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 lg:flex-1">
              <div className="flex items-center gap-2.5">
                <span className={cn("size-2.5 shrink-0 rounded-full", bannerAccent.dot)} />
                <h2 className="truncate text-xl font-bold tracking-tight text-slate-900">
                  {bannerProject?.name ?? "Semua Proyek"}
                </h2>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays className="size-4 shrink-0" />
                {bannerProject
                  ? `Deadline: ${formatDate(bannerProject.deadline)}`
                  : `${projects.length} proyek · ${members.length} anggota`}
              </p>

              <div className="mt-4 flex max-w-md items-center gap-3">
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-900/10">
                  <div
                    className={cn("h-full rounded-full transition-all", bannerAccent.bar)}
                    style={{ width: `${bannerPct}%` }}
                  />
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-700">
                  {bannerPct}% selesai
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              {stackMembers.length > 0 && (
                <div className="flex -space-x-2">
                  {stackMembers.map((m) => (
                    <Avatar
                      key={m.id}
                      name={m.name}
                      color={m.avatar_color}
                      size="sm"
                      className="ring-2 ring-white"
                    />
                  ))}
                  {summary.memberIds.length > stackMembers.length && (
                    <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-[11px] font-semibold text-white ring-2 ring-white">
                      +{summary.memberIds.length - stackMembers.length}
                    </span>
                  )}
                </div>
              )}
              <div className="rounded-2xl bg-slate-900 px-4 py-2.5 text-white shadow-md shadow-slate-900/20">
                <p className="text-[11px] font-medium text-slate-300">Tugas selesai</p>
                <p className="text-sm font-bold">
                  {summary.done} <span className="font-medium text-slate-300">dari {summary.total}</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="no-print mb-4 flex flex-wrap gap-3">
        <div className="w-full sm:w-56">
          <Select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            aria-label="Saring berdasarkan proyek"
          >
            <option value="all">Semua proyek</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            aria-label="Saring berdasarkan anggota"
          >
            <option value="all">Semua anggota</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((status) => {
            const list = columns[status];
            const limit = shown[status];
            const visible = list.slice(0, limit);

            return (
              // Kolom terbuka ala referensi: tanpa kotak pembungkus — kartu
              // mengambang langsung di latar. Saat drag melintas, kolom
              // diberi lapisan kaca tipis sebagai penanda drop zone.
              <div
                key={status}
                className={cn(
                  "rounded-3xl p-2 transition",
                  dragOver === status && "bg-white/50 ring-2 ring-slate-900/10"
                )}
                onDragOver={(e: React.DragEvent) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={(e: React.DragEvent) => {
                  e.preventDefault();
                  setDragOver(null);
                  const taskId = e.dataTransfer.getData("text/plain");
                  const task = tasks.find((t) => t.id === taskId);
                  if (task && task.status !== status) updateTask(task.id, { status });
                }}
              >
                {/* Header kolom ringan ala referensi: dot status + nama + jumlah */}
                <header className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn("size-2 shrink-0 rounded-full", STATUS_STYLE[status].dot)}
                    />
                    <h2 className="truncate text-sm font-semibold text-slate-700">
                      {STATUS_STYLE[status].label}
                    </h2>
                    <span className="text-xs font-semibold text-slate-400">
                      ({list.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreate(status)}
                    aria-label={`Tambah tugas ke kolom ${STATUS_STYLE[status].label}`}
                    className="no-print grid size-8 shrink-0 place-items-center rounded-full bg-slate-900/5 text-slate-600 transition hover:bg-slate-900/10 hover:text-slate-900"
                  >
                    <Plus className="size-4" />
                  </button>
                </header>

                {list.length === 0 ? (
                  <p className="rounded-2xl border-2 border-dashed border-slate-200/80 bg-white/30 px-4 py-10 text-center text-sm text-slate-400">
                    Tarik tugas ke sini, atau tambahkan yang baru.
                  </p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-3">
                      {visible.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          member={
                            task.assignee_id
                              ? memberById.get(task.assignee_id)
                              : undefined
                          }
                          project={
                            task.project_id ? projectById.get(task.project_id) : undefined
                          }
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onMove={move}
                        />
                      ))}
                    </ul>

                    {list.length > limit && (
                      <button
                        type="button"
                        onClick={() =>
                          setShown((s) => ({ ...s, [status]: s[status] + PER_COLUMN }))
                        }
                        className="no-print mt-3 w-full rounded-2xl border border-white/70 bg-white/60 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white/90"
                      >
                        Tampilkan {Math.min(PER_COLUMN, list.length - limit)} lagi
                        <span className="text-slate-400"> · sisa {list.length - limit}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        defaultStatus={defaultStatus}
        defaultProjectId={filterProject !== "all" ? filterProject : (projects[0]?.id ?? "")}
        defaultAssigneeId={filterMember !== "all" ? filterMember : ""}
        projects={projects}
        members={members}
        onSubmit={handleSubmit}
      />
    </>
  );
}

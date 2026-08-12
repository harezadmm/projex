"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ProgressForm, type ProgressFormValues } from "@/components/progress/ProgressForm";
import { formatDate, relativeDays, STATUS_STYLE } from "@/lib/ui";

/** Riwayat ditampilkan bertahap agar jumlah simpul DOM tetap terkendali. */
const PAGE_SIZE = 20;

export default function ProgressPage() {
  const {
    logs,
    tasks,
    members,
    projects,
    currentMember,
    addLog,
    deleteLog,
    updateTask,
    loading,
    logsTruncated,
    loadAllLogs,
  } = useStore();

  const [filterMember, setFilterMember] = useState("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  /** Tugas milik anggota yang sedang aktif didahulukan agar cepat dipilih. */
  const taskOptions = useMemo(() => {
    const mine: typeof tasks = [];
    const others: typeof tasks = [];
    for (const t of tasks) {
      (t.assignee_id === currentMember?.id ? mine : others).push(t);
    }
    return [...mine, ...others];
  }, [tasks, currentMember]);

  const visibleLogs = useMemo(
    () =>
      logs
        .filter((l) => filterMember === "all" || l.member_id === filterMember)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [logs, filterMember]
  );

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  async function handleSubmit(values: ProgressFormValues) {
    if (!currentMember) return;

    await addLog({
      task_id: values.taskId || null,
      member_id: currentMember.id,
      note: values.note,
      percent: values.percent,
      hours_spent: values.hours,
    });

    // Kalau dicentang selesai, statusnya sekalian diperbarui
    if (values.markDone && values.taskId) {
      await updateTask(values.taskId, { status: "done" });
    }
  }

  const page = visibleLogs.slice(0, shown);

  return (
    <>
      <PageHeader
        eyebrow="Catat apa yang kamu kerjakan sebelum push ke GitHub"
        title="Catatan Progres"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---------- Form input ---------- */}
        <Card className="no-print lg:col-span-1">
          <CardHeader title="Tulis Update" />

          {!currentMember ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-5 text-sm text-amber-800">
              Belum ada anggota terdaftar. Tambahkan anggota dulu di menu Anggota,
              lalu pilih namamu di pojok kanan atas.
            </p>
          ) : (
            <ProgressForm
              currentMember={currentMember}
              taskOptions={taskOptions}
              onSubmit={handleSubmit}
            />
          )}
        </Card>

        {/* ---------- Riwayat ---------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Riwayat Progres"
            action={
              <div className="no-print w-44 shrink-0">
                <Select
                  value={filterMember}
                  onChange={(e) => {
                    setFilterMember(e.target.value);
                    setShown(PAGE_SIZE);
                  }}
                  aria-label="Saring berdasarkan anggota"
                  className="py-1.5 text-xs"
                >
                  <option value="all">Semua anggota</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            }
          />

          {loading ? (
            <CardSkeleton />
          ) : visibleLogs.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              Belum ada catatan progres. Tulis update pertama di form sebelah.
            </p>
          ) : (
            <>
              <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-5">
                {page.map((log) => {
                  const member = log.member_id ? memberById.get(log.member_id) : undefined;
                  const task = log.task_id ? taskById.get(log.task_id) : undefined;
                  const projectName = task?.project_id
                    ? (projectById.get(task.project_id)?.name ?? "Tanpa proyek")
                    : "Tanpa proyek";

                  return (
                    <li key={log.id} className="print-break relative">
                      <span className="absolute top-4 -left-[27px] size-3 rounded-full border-2 border-white bg-slate-300" />

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {member ? (
                              <Avatar
                                name={member.name}
                                color={member.avatar_color}
                                size="sm"
                              />
                            ) : (
                              <span className="size-8 shrink-0 rounded-full bg-slate-200" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {member?.name ?? "Anonim"}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {formatDate(log.created_at)} · {relativeDays(log.created_at)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Hapus catatan ini?")) deleteLog(log.id);
                            }}
                            aria-label="Hapus catatan"
                            className="no-print grid size-7 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-slate-700">
                          {log.note}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {task && (
                            <>
                              <Badge className="bg-slate-100 text-slate-600">
                                {task.title}
                              </Badge>
                              <Badge className={STATUS_STYLE[task.status].chip}>
                                {STATUS_STYLE[task.status].label}
                              </Badge>
                              <span className="text-xs text-slate-400">{projectName}</span>
                            </>
                          )}
                          <span className="ml-auto text-xs text-slate-500">
                            {Number(log.hours_spent).toFixed(1)} jam
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-900"
                              style={{ width: `${log.percent}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-slate-700">
                            {log.percent}%
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {visibleLogs.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE_SIZE)}
                  className="no-print mt-4 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Tampilkan {Math.min(PAGE_SIZE, visibleLogs.length - shown)} lagi
                  <span className="text-slate-400">
                    {" "}
                    · sisa {visibleLogs.length - shown}
                  </span>
                </button>
              )}

              {visibleLogs.length <= shown && logsTruncated && (
                <button
                  type="button"
                  onClick={() => void loadAllLogs()}
                  className="no-print mt-4 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Muat catatan yang lebih lama dari server
                </button>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}

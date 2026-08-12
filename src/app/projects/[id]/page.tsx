"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ACCENT, STATUS_STYLE, PRIORITY_STYLE, formatDate, percent, relativeDays } from "@/lib/ui";
import { PROJECT_STATUS_LABEL, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

export default function ProjectDetailPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = use(params);
  const { projects, tasks, members, logs, loading } = useStore();

  const project = projects.find((p) => p.id === id) ?? null;

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === id),
    [tasks, id]
  );

  const projectLogs = useMemo(() => {
    const taskIds = new Set(projectTasks.map((t) => t.id));
    return logs
      .filter((l) => l.task_id && taskIds.has(l.task_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [logs, projectTasks]);

  const done = projectTasks.filter((t) => t.status === "done").length;
  const pct = percent(done, projectTasks.length);

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Detail proyek" title="Memuat…" showSearch={false} />
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2" />
          <CardSkeleton />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <PageHeader eyebrow="Detail proyek" title="Proyek tidak ditemukan" showSearch={false} />
        <Card className="py-16 text-center">
          <p className="text-slate-500">
            Proyek dengan ID tersebut tidak ada — mungkin sudah dihapus.
          </p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 underline"
          >
            <ArrowLeft className="size-4" /> Kembali ke daftar proyek
          </Link>
        </Card>
      </>
    );
  }

  const accent = ACCENT[project.color];

  return (
    <>
      <Link
        href="/projects"
        className="no-print mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Semua proyek
      </Link>

      <PageHeader eyebrow="Detail proyek" title={project.name} showSearch={false} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(accent.soft, accent.text)}>
              <span className={cn("size-1.5 rounded-full", accent.dot)} />
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
              >
                <GithubIcon className="size-3.5" /> Repo GitHub
              </a>
            )}
          </div>

          {project.description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {project.description}
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Mulai</dt>
              <dd className="text-sm font-medium text-slate-900">
                {formatDate(project.start_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Deadline</dt>
              <dd className="text-sm font-medium text-slate-900">
                {formatDate(project.deadline)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Sisa waktu</dt>
              <dd className="text-sm font-medium text-slate-900">
                {relativeDays(project.deadline)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Total tugas</dt>
              <dd className="text-sm font-medium text-slate-900">{projectTasks.length}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-slate-500">
                {done}/{projectTasks.length} tugas selesai
              </span>
              <span className="font-semibold text-slate-900">{pct}%</span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progres ${project.name}`}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", accent.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Catatan Terbaru" />
          {projectLogs.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Belum ada catatan progres di proyek ini.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
              {projectLogs.slice(0, 8).map((log) => {
                const member = members.find((m) => m.id === log.member_id);
                return (
                  <li key={log.id} className="flex gap-3">
                    {member ? (
                      <Avatar name={member.name} color={member.avatar_color} size="sm" />
                    ) : (
                      <span className="size-8 shrink-0 rounded-full bg-slate-200" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{log.note}</p>
                      <p className="text-xs text-slate-400">
                        {member?.name ?? "Anonim"} · {relativeDays(log.created_at)} ·{" "}
                        {log.percent}%
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/progress"
            className="mt-4 inline-block text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Lihat semua catatan →
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {COLUMNS.map((status) => {
          const list = projectTasks.filter((t) => t.status === status);
          return (
            <Card key={status}>
              <CardHeader
                title={STATUS_STYLE[status].label}
                action={
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {list.length}
                  </span>
                }
              />
              {list.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-xs text-slate-400">
                  Kosong
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {list.map((task) => {
                    const member = members.find((m) => m.id === task.assignee_id);
                    return (
                      <li
                        key={task.id}
                        className="rounded-2xl border border-slate-200 p-3"
                      >
                        <p className="text-sm font-medium text-slate-900">{task.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge className={PRIORITY_STYLE[task.priority].chip}>
                            {PRIORITY_STYLE[task.priority].label}
                          </Badge>
                          {task.due_date && (
                            <span className="text-xs text-slate-400">
                              {relativeDays(task.due_date)}
                            </span>
                          )}
                        </div>
                        {member && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <Avatar name={member.name} color={member.avatar_color} size="sm" />
                            <span className="truncate text-xs text-slate-500">
                              {member.name}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

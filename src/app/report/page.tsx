"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCommits } from "@/lib/useCommits";
import { useAppSettings } from "@/lib/appSettings";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { STATUS_STYLE, formatDate, percent } from "@/lib/ui";
import { PROJECT_STATUS_LABEL } from "@/lib/types";

const DAY_OPTIONS = [30, 90, 365];

export default function ReportPage() {
  const { members, projects, tasks, logs, loading, loadAllLogs } = useStore();
  const { settings } = useAppSettings();
  const [days, setDays] = useState(90);

  // Halaman lain cukup memuat sebagian catatan terbaru demi kecepatan.
  // Laporan harus utuh, jadi di sini sisanya ditarik semua.
  useEffect(() => {
    void loadAllLogs();
  }, [loadAllLogs]);

  const repoUrl = projects.find((p) => p.repo_url)?.repo_url ?? null;
  const { commits } = useCommits(repoUrl, days);

  const rows = useMemo(() => {
    const byLogin = new Map<string, string>();
    for (const m of members) {
      if (m.github_username) byLogin.set(m.github_username.toLowerCase(), m.id);
    }

    const commitCount = new Map<string, number>();
    for (const c of commits) {
      const id =
        (c.author_login && byLogin.get(c.author_login.toLowerCase())) ??
        members.find((m) => m.name.toLowerCase() === c.author_name.toLowerCase())?.id;
      if (id) commitCount.set(id, (commitCount.get(id) ?? 0) + 1);
    }

    return members.map((m) => {
      const own = tasks.filter((t) => t.assignee_id === m.id);
      const done = own.filter((t) => t.status === "done").length;
      const memberLogs = logs.filter((l) => l.member_id === m.id);

      return {
        member: m,
        total: own.length,
        done,
        pct: percent(done, own.length),
        logs: memberLogs.length,
        hours: memberLogs.reduce((sum, l) => sum + Number(l.hours_spent || 0), 0),
        commits: commitCount.get(m.id) ?? 0,
      };
    });
  }, [members, tasks, logs, commits]);

  const totals = useMemo(
    () => ({
      tasks: tasks.length,
      done: tasks.filter((t) => t.status === "done").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      todo: tasks.filter((t) => t.status === "todo").length,
      hours: logs.reduce((sum, l) => sum + Number(l.hours_spent || 0), 0),
    }),
    [tasks, logs]
  );

  const printedAt = new Date();

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="Rekap lengkap untuk dikumpulkan ke dosen"
          title="Laporan Progres"
          showSearch={false}
          action={
            <div className="flex shrink-0 items-center gap-3">
              <div className="w-40 shrink-0">
                <Select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  aria-label="Rentang commit"
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      Commit {d} hari
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={() => window.print()}>
                <Printer className="size-4" /> Cetak / Simpan PDF
              </Button>
            </div>
          }
        />
      </div>

      {loading ? (
        <Card>
          <p className="py-12 text-center text-sm text-slate-500">Memuat data…</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ---------- Kop laporan ---------- */}
          <Card>
            <div className="border-b border-slate-200 pb-4 text-center">
              <h1 className="text-2xl font-bold text-slate-900">
                Laporan Progres Proyek
              </h1>
              <p className="mt-1 text-sm text-slate-600">{settings.groupName}</p>
              {settings.courseName && (
                <p className="text-sm text-slate-600">{settings.courseName}</p>
              )}
              {settings.lecturerName && (
                <p className="text-sm text-slate-600">
                  Dosen Pengampu: {settings.lecturerName}
                </p>
              )}
              {settings.institution && (
                <p className="text-sm text-slate-600">{settings.institution}</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                Dicetak {formatDate(printedAt.toISOString())} pukul{" "}
                {printedAt.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                ["Total tugas", totals.tasks],
                ["Selesai", totals.done],
                ["Dikerjakan", totals.inProgress],
                ["Belum mulai", totals.todo],
                ["Jam tercatat", totals.hours.toFixed(1)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-slate-50 p-3 text-center">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-xl font-bold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* ---------- Kontribusi per anggota ---------- */}
          <Card className="print-break">
            <CardHeader title="1. Kontribusi per Anggota" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="pb-2 font-medium">Nama</th>
                    <th className="pb-2 font-medium">Peran</th>
                    <th className="pb-2 text-center font-medium">Tugas</th>
                    <th className="pb-2 text-center font-medium">Selesai</th>
                    <th className="pb-2 text-center font-medium">%</th>
                    <th className="pb-2 text-center font-medium">Catatan</th>
                    <th className="pb-2 text-center font-medium">Jam</th>
                    <th className="pb-2 text-center font-medium">Commit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.member.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={r.member.name}
                            color={r.member.avatar_color}
                            size="sm"
                          />
                          <span className="font-medium text-slate-900">
                            {r.member.name}
                            {r.member.is_lead && (
                              <span className="ml-1.5 text-xs text-amber-600">(Ketua)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600">{r.member.role}</td>
                      <td className="py-2.5 text-center text-slate-700">{r.total}</td>
                      <td className="py-2.5 text-center text-slate-700">{r.done}</td>
                      <td className="py-2.5 text-center font-semibold text-slate-900">
                        {r.pct}%
                      </td>
                      <td className="py-2.5 text-center text-slate-700">{r.logs}</td>
                      <td className="py-2.5 text-center text-slate-700">
                        {r.hours.toFixed(1)}
                      </td>
                      <td className="py-2.5 text-center text-slate-700">{r.commits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Kolom Commit diambil langsung dari GitHub ({days} hari terakhir) dan
              dicocokkan lewat username GitHub tiap anggota.
            </p>
          </Card>

          {/* ---------- Rincian proyek ---------- */}
          <Card className="print-break">
            <CardHeader title="2. Rincian Proyek dan Tugas" />
            <div className="flex flex-col gap-6">
              {projects.map((project) => {
                const own = tasks.filter((t) => t.project_id === project.id);
                const doneCount = own.filter((t) => t.status === "done").length;

                return (
                  <section key={project.id} className="print-break">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{project.name}</h3>
                      <span className="text-xs text-slate-500">
                        {PROJECT_STATUS_LABEL[project.status]} · {doneCount}/{own.length}{" "}
                        selesai ({percent(doneCount, own.length)}%) · Deadline{" "}
                        {formatDate(project.deadline)}
                      </span>
                    </div>

                    {own.length === 0 ? (
                      <p className="text-sm text-slate-400">Belum ada tugas.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                              <th className="pb-2 font-medium">Tugas</th>
                              <th className="pb-2 font-medium">Penanggung jawab</th>
                              <th className="pb-2 font-medium">Status</th>
                              <th className="pb-2 font-medium">Deadline</th>
                              <th className="pb-2 font-medium">Selesai pada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {own.map((t) => {
                              const member = members.find((m) => m.id === t.assignee_id);
                              return (
                                <tr
                                  key={t.id}
                                  className="border-b border-slate-100 last:border-0"
                                >
                                  <td className="py-2 text-slate-800">{t.title}</td>
                                  <td className="py-2 text-slate-600">
                                    {member?.name ?? "—"}
                                  </td>
                                  <td className="py-2">
                                    <span className="text-slate-600">
                                      {STATUS_STYLE[t.status].label}
                                    </span>
                                  </td>
                                  <td className="py-2 text-slate-600">
                                    {formatDate(t.due_date)}
                                  </td>
                                  <td className="py-2 text-slate-600">
                                    {formatDate(t.completed_at)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                );
              })}
              {projects.length === 0 && (
                <p className="text-sm text-slate-400">Belum ada proyek.</p>
              )}
            </div>
          </Card>

          {/* ---------- Catatan progres ---------- */}
          <Card className="print-break">
            <CardHeader title="3. Riwayat Catatan Progres" />
            {logs.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada catatan progres.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="pb-2 font-medium">Tanggal</th>
                      <th className="pb-2 font-medium">Anggota</th>
                      <th className="pb-2 font-medium">Tugas</th>
                      <th className="pb-2 font-medium">Catatan</th>
                      <th className="pb-2 text-center font-medium">%</th>
                      <th className="pb-2 text-center font-medium">Jam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...logs]
                      .sort((a, b) => b.created_at.localeCompare(a.created_at))
                      .map((log) => {
                        const member = members.find((m) => m.id === log.member_id);
                        const task = tasks.find((t) => t.id === log.task_id);
                        return (
                          <tr
                            key={log.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-2 whitespace-nowrap text-slate-600">
                              {formatDate(log.created_at)}
                            </td>
                            <td className="py-2 whitespace-nowrap text-slate-800">
                              {member?.name ?? "—"}
                            </td>
                            <td className="py-2 text-slate-600">{task?.title ?? "—"}</td>
                            <td className="py-2 text-slate-700">{log.note}</td>
                            <td className="py-2 text-center text-slate-600">
                              {log.percent}%
                            </td>
                            <td className="py-2 text-center text-slate-600">
                              {Number(log.hours_spent).toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ---------- Commit ---------- */}
          <Card className="print-break">
            <CardHeader title="4. Bukti Commit GitHub" />
            {!repoUrl ? (
              <p className="text-sm text-slate-400">
                Belum ada repo GitHub yang terhubung, jadi bagian ini kosong.
              </p>
            ) : commits.length === 0 ? (
              <p className="text-sm text-slate-400">
                Tidak ada commit dalam {days} hari terakhir (atau repo belum bisa diakses).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="pb-2 font-medium">Tanggal</th>
                      <th className="pb-2 font-medium">Author</th>
                      <th className="pb-2 font-medium">Pesan commit</th>
                      <th className="pb-2 font-medium">SHA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commits.map((c) => (
                      <tr key={c.sha} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 whitespace-nowrap text-slate-600">
                          {formatDate(c.date)}
                        </td>
                        <td className="py-2 whitespace-nowrap text-slate-800">
                          {c.author_login ?? c.author_name}
                        </td>
                        <td className="py-2 text-slate-700">{c.message}</td>
                        <td className="py-2 font-mono text-xs text-slate-500">
                          {c.sha.slice(0, 7)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

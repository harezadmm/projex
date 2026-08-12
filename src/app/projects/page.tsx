"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ACCENT, ACCENT_KEYS, formatDate, percent, relativeDays } from "@/lib/ui";
import { PROJECT_STATUS_LABEL, type AccentColor, type Project, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const COLOR_LABEL: Record<AccentColor, string> = {
  blue: "Biru",
  orange: "Oranye",
  green: "Hijau",
  pink: "Merah muda",
  purple: "Ungu",
  red: "Merah",
  yellow: "Kuning",
};

const STATUS_CHIP: Record<ProjectStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

interface FormState {
  name: string;
  description: string;
  status: ProjectStatus;
  color: AccentColor;
  repo_url: string;
  start_date: string;
  deadline: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  status: "not_started",
  color: "blue",
  repo_url: "",
  start_date: "",
  deadline: "",
};

export default function ProjectsPage() {
  const { projects, tasks, addProject, updateProject, deleteProject, loading } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; done: number; pct: number }>();
    for (const p of projects) {
      const own = tasks.filter((t) => t.project_id === p.id);
      const done = own.filter((t) => t.status === "done").length;
      map.set(p.id, { total: own.length, done, pct: percent(done, own.length) });
    }
    return map;
  }, [projects, tasks]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      color: p.color,
      repo_url: p.repo_url ?? "",
      start_date: p.start_date ?? "",
      deadline: p.deadline ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      color: form.color,
      repo_url: form.repo_url.trim() || null,
      start_date: form.start_date || null,
      deadline: form.deadline || null,
    };

    if (editing) await updateProject(editing.id, payload);
    else await addProject(payload);

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(p: Project) {
    const count = stats.get(p.id)?.total ?? 0;
    const confirmed = window.confirm(
      `Hapus proyek "${p.name}"?\n\n` +
        `${count} tugas di dalamnya beserta catatan progresnya akan ikut terhapus. ` +
        `Tindakan ini tidak bisa dibatalkan.`
    );
    if (confirmed) await deleteProject(p.id);
  }

  return (
    <>
      <PageHeader
        eyebrow="Semua proyek yang sedang dikerjakan kelompok"
        title="Proyek"
        action={
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="size-4" /> Proyek Baru
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : projects.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-slate-500">Belum ada proyek. Buat proyek pertamamu.</p>
          <Button onClick={openCreate} className="mx-auto mt-4">
            <Plus className="size-4" /> Proyek Baru
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const s = stats.get(p.id)!;
            const accent = ACCENT[p.color];

            return (
              <Card key={p.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("size-3 shrink-0 rounded-full", accent.dot)} />
                    <Link
                      href={`/projects/${p.id}`}
                      className="truncate font-semibold text-slate-900 transition hover:underline"
                    >
                      {p.name}
                    </Link>
                  </div>

                  <div className="no-print flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      aria-label={`Ubah proyek ${p.name}`}
                      className="grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      aria-label={`Hapus proyek ${p.name}`}
                      className="grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {p.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{p.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_CHIP[p.status]}>
                    {PROJECT_STATUS_LABEL[p.status]}
                  </Badge>
                  {p.deadline && (
                    <Badge className="bg-slate-100 text-slate-600">
                      Deadline {relativeDays(p.deadline)}
                    </Badge>
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">
                      {s.done}/{s.total} tugas selesai
                    </span>
                    <span className="font-semibold text-slate-700">{s.pct}%</span>
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={s.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progres ${p.name}`}
                  >
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-500", accent.bar)}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                  <span>
                    {formatDate(p.start_date)} → {formatDate(p.deadline)}
                  </span>
                  <div className="flex items-center gap-2">
                    {p.repo_url && (
                      <a
                        href={p.repo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Buka repo ${p.name}`}
                        title="Buka repo GitHub"
                        className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <GithubIcon className="size-4" />
                      </a>
                    )}
                    <Link
                      href={`/projects/${p.id}`}
                      aria-label={`Buka detail ${p.name}`}
                      className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Ubah Proyek" : "Proyek Baru"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nama proyek">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Website Project Management"
              required
              autoFocus
            />
          </Field>

          <Field label="Deskripsi">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ringkasan singkat isi proyek ini."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectStatus })
                }
              >
                {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Warna">
              <Select
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value as AccentColor })}
              >
                {ACCENT_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {COLOR_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal mulai">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>
            <Field label="Deadline">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label="URL repo GitHub"
            hint="Dipakai untuk menarik commit tim sebagai bukti progres. Contoh: https://github.com/nama/repo"
          >
            <Input
              value={form.repo_url}
              onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
              placeholder="https://github.com/nama/repo"
            />
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Buat Proyek"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { STATUS_STYLE } from "@/lib/ui";
import { PRIORITY_LABEL, type Member, type Priority, type Project, type Task, type TaskStatus } from "@/lib/types";
import { COLUMNS } from "./TaskCard";

export interface TaskFormValues {
  title: string;
  description: string | null;
  project_id: string | null;
  assignee_id: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
}

interface FormState {
  title: string;
  description: string;
  project_id: string;
  assignee_id: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string;
}

/**
 * Isi form dipisah dari halaman Tugas dengan sengaja.
 *
 * Sebelumnya state form tinggal di komponen halaman, sehingga setiap huruf
 * yang diketik memicu render ulang seluruh papan Kanban — pada 600 tugas,
 * satu ketikan memblokir main thread ~163 ms. Dengan state-nya berada di
 * sini, mengetik hanya me-render ulang isi modal.
 */
function TaskForm({
  initial,
  projects,
  members,
  onSubmit,
  onCancel,
  isEdit,
}: {
  initial: FormState;
  projects: Project[];
  members: Member[];
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  isEdit: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || saving) return;

    setSaving(true);
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      project_id: form.project_id || null,
      assignee_id: form.assignee_id || null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Judul tugas">
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Contoh: Bikin halaman login"
          required
          autoFocus
        />
      </Field>

      <Field label="Deskripsi">
        <Textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Detail yang perlu dikerjakan."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Proyek">
          <Select
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
          >
            <option value="">— Tanpa proyek —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Penanggung jawab">
          <Select
            value={form.assignee_id}
            onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
          >
            <option value="">— Belum ditugaskan —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
          >
            {COLUMNS.map((s) => (
              <option key={s} value={s}>
                {STATUS_STYLE[s].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Prioritas">
          <Select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
          >
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Deadline">
          <Input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Buat Tugas"}
        </Button>
      </div>
    </form>
  );
}

export function TaskFormModal({
  open,
  onClose,
  editing,
  defaultStatus,
  defaultProjectId,
  defaultAssigneeId,
  projects,
  members,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: Task | null;
  defaultStatus: TaskStatus;
  defaultProjectId: string;
  defaultAssigneeId: string;
  projects: Project[];
  members: Member[];
  onSubmit: (values: TaskFormValues) => Promise<void>;
}) {
  if (!open) return null;

  const initial: FormState = editing
    ? {
        title: editing.title,
        description: editing.description ?? "",
        project_id: editing.project_id ?? "",
        assignee_id: editing.assignee_id ?? "",
        status: editing.status,
        priority: editing.priority,
        due_date: editing.due_date ?? "",
      }
    : {
        title: "",
        description: "",
        project_id: defaultProjectId,
        assignee_id: defaultAssigneeId,
        status: defaultStatus,
        priority: "medium",
        due_date: "",
      };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Ubah Tugas" : "Tugas Baru"}>
      {/* key memaksa form dibuat ulang saat berganti tugas, agar isian tidak tertinggal */}
      <TaskForm
        key={editing?.id ?? "baru"}
        initial={initial}
        projects={projects}
        members={members}
        onSubmit={onSubmit}
        onCancel={onClose}
        isEdit={Boolean(editing)}
      />
    </Modal>
  );
}

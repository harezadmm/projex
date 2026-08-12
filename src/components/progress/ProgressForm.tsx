"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import type { Member, Task } from "@/lib/types";

export interface ProgressFormValues {
  taskId: string;
  note: string;
  percent: number;
  hours: number;
  markDone: boolean;
}

/**
 * Form ditaruh di komponen terpisah dari daftar riwayat.
 *
 * Kalau state-nya menempel di komponen halaman, setiap huruf yang diketik
 * akan me-render ulang seluruh riwayat catatan — yang bisa berjumlah ribuan
 * baris. Dipisah begini, mengetik hanya menyentuh form ini saja.
 */
export function ProgressForm({
  currentMember,
  taskOptions,
  onSubmit,
}: {
  currentMember: Member;
  taskOptions: Task[];
  onSubmit: (values: ProgressFormValues) => Promise<void>;
}) {
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState("");
  const [percent, setPercent] = useState(50);
  const [hours, setHours] = useState("1");
  const [markDone, setMarkDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || saving) return;

    setSaving(true);
    await onSubmit({
      taskId,
      note: note.trim(),
      percent,
      hours: Number(hours) || 0,
      markDone,
    });

    setNote("");
    setPercent(50);
    setHours("1");
    setMarkDone(false);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3">
        <Avatar name={currentMember.name} color={currentMember.avatar_color} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {currentMember.name}
          </p>
          <p className="truncate text-xs text-slate-500">
            Menulis sebagai {currentMember.role}
          </p>
        </div>
      </div>

      <Field label="Tugas yang dikerjakan">
        <Select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">— Tidak terkait tugas tertentu —</option>
          {taskOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.assignee_id === currentMember.id ? "★ " : ""}
              {t.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Apa yang sudah dikerjakan?">
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: Selesai bikin komponen navbar dan sidebar, tinggal responsive di mobile."
          required
        />
      </Field>

      <Field label={`Progres tugas: ${percent}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-full accent-slate-900"
          aria-label="Persentase progres"
        />
      </Field>

      <Field label="Waktu yang dihabiskan (jam)">
        <Input
          type="number"
          min={0}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </Field>

      {taskId && (
        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={markDone}
            onChange={(e) => setMarkDone(e.target.checked)}
            className="size-4 rounded border-slate-300"
          />
          Sekalian tandai tugas ini selesai
        </label>
      )}

      <Button type="submit" disabled={saving || !note.trim()}>
        <Send className="size-4" />
        {saving ? "Menyimpan…" : "Kirim Update"}
      </Button>
    </form>
  );
}

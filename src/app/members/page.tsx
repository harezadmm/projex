"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Pencil, Plus, Trash2, Crown, Users } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { useStore } from "@/lib/store";
import { useContributors } from "@/lib/useRepoData";
import { useContributorSync } from "@/lib/useContributorSync";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ACCENT_KEYS, percent } from "@/lib/ui";
import type { AccentColor, Member } from "@/lib/types";

const ROLES = [
  "Project Manager",
  "Frontend Dev",
  "Backend Dev",
  "Fullstack Dev",
  "UI/UX Designer",
  "QA / Tester",
  "Dokumentasi",
  "Anggota",
];

const COLOR_LABEL: Record<AccentColor, string> = {
  blue: "Biru",
  orange: "Oranye",
  green: "Hijau",
  pink: "Merah muda",
  purple: "Ungu",
  red: "Merah",
  yellow: "Kuning",
};

interface FormState {
  name: string;
  email: string;
  role: string;
  github_username: string;
  avatar_color: AccentColor;
  is_lead: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "Anggota",
  github_username: "",
  avatar_color: "blue",
  is_lead: false,
};

export default function MembersPage() {
  const {
    members,
    tasks,
    logs,
    projects,
    addMember,
    updateMember,
    deleteMember,
    loading,
  } = useStore();

  // Repo pertama yang terhubung dipakai sebagai sumber kontributor.
  const repoUrl = projects.find((p) => p.repo_url)?.repo_url ?? null;
  const { contributors, loading: loadingContributors, error: contributorError } =
    useContributors(repoUrl);

  // Tautkan anggota lama ke kontributor, lalu buat yang belum ada.
  const sync = useContributorSync(contributors, !loadingContributors);

  /** Jumlah commit nyata per anggota, dicocokkan lewat username GitHub. */
  const commitsByMember = useMemo(() => {
    const byLogin = new Map(contributors.map((c) => [c.login.toLowerCase(), c]));
    const map = new Map<string, number>();
    for (const m of members) {
      const c = m.github_username
        ? byLogin.get(m.github_username.toLowerCase())
        : undefined;
      if (c) map.set(m.id, c.commits);
    }
    return map;
  }, [contributors, members]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; done: number; open: number; logs: number; hours: number }
    >();

    for (const m of members) {
      const own = tasks.filter((t) => t.assignee_id === m.id);
      const memberLogs = logs.filter((l) => l.member_id === m.id);
      map.set(m.id, {
        total: own.length,
        done: own.filter((t) => t.status === "done").length,
        open: own.filter((t) => t.status !== "done").length,
        logs: memberLogs.length,
        hours: memberLogs.reduce((sum, l) => sum + Number(l.hours_spent || 0), 0),
      });
    }
    return map;
  }, [members, tasks, logs]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({
      name: m.name,
      email: m.email ?? "",
      role: m.role,
      github_username: m.github_username ?? "",
      avatar_color: m.avatar_color,
      is_lead: m.is_lead,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      role: form.role,
      github_username: form.github_username.trim().replace(/^@/, "") || null,
      avatar_color: form.avatar_color,
      is_lead: form.is_lead,
    };

    if (editing) {
      await updateMember(editing.id, payload);
    } else {
      await addMember(payload);
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(m: Member) {
    const confirmed = window.confirm(
      `Hapus "${m.name}" dari tim?\n\n` +
        `Tugas yang ditugaskan ke ${m.name} akan menjadi tanpa penanggung jawab, ` +
        `dan catatan progresnya akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
    );
    if (confirmed) await deleteMember(m.id);
  }

  return (
    <>
      <PageHeader
        eyebrow="Kelola tim dan pembagian tanggung jawab"
        title="Anggota Kelompok"
        action={
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="size-4" /> Tambah Anggota
          </Button>
        }
      />

      {(sync.linked > 0 || sync.created > 0) && (
        <Card className="mb-4 border border-[var(--tone-green-pastel)] bg-[var(--tone-green-soft)]">
          <p className="flex items-start gap-2 text-sm text-[var(--tone-green-text)]">
            <Users className="mt-0.5 size-4 shrink-0" />
            <span>
              Diselaraskan dengan kontributor repo:{" "}
              {sync.linked > 0 && (
                <>
                  <span className="font-semibold">{sync.linked}</span> anggota
                  ditautkan ke akun GitHub-nya
                </>
              )}
              {sync.linked > 0 && sync.created > 0 && ", "}
              {sync.created > 0 && (
                <>
                  <span className="font-semibold">{sync.created}</span> kontributor
                  ditambahkan sebagai anggota baru
                </>
              )}
              .
            </span>
          </p>
        </Card>
      )}

      {sync.ambiguous.length > 0 && (
        <Card className="mb-4 border border-[var(--tone-amber-pastel)] bg-[var(--tone-amber-soft)]">
          <p className="flex items-start gap-2 text-sm text-[var(--tone-amber-text)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              {sync.ambiguous.length} kontributor cocok dengan lebih dari satu
              anggota, jadi tidak ditautkan otomatis:{" "}
              <span className="font-mono">
                {sync.ambiguous.map((c) => c.login).join(", ")}
              </span>
              . Isi username GitHub-nya manual lewat tombol ubah supaya
              commit-nya terhitung.
            </span>
          </p>
        </Card>
      )}

      {contributorError && (
        <Card className="mb-4 border border-[var(--tone-amber-pastel)] bg-[var(--tone-amber-soft)]">
          <p className="flex items-start gap-2 text-sm text-[var(--tone-amber-text)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Gagal membaca kontributor repo: {contributorError}</span>
          </p>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : members.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-muted">
            Belum ada anggota. Tambahkan anggota kelompokmu untuk mulai membagi tugas.
          </p>
          <Button onClick={openCreate} className="mx-auto mt-4">
            <Plus className="size-4" /> Tambah Anggota
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => {
            const s = stats.get(m.id)!;
            const pct = percent(s.done, s.total);
            const commits = commitsByMember.get(m.id);
            // Dibedakan dari 0: undefined berarti belum tertaut ke akun
            // GitHub mana pun, 0 berarti tertaut tapi belum pernah commit.
            const tertaut = commits !== undefined;

            return (
              <Card key={m.id} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <Avatar name={m.name} color={m.avatar_color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate font-semibold text-ink">{m.name}</h2>
                      {m.is_lead && (
                        <Crown
                          className="size-4 shrink-0 text-[var(--tone-amber-text)]"
                          aria-label="Ketua kelompok"
                        />
                      )}
                    </div>
                    <p className="truncate text-sm text-muted">{m.role}</p>
                    {m.email && (
                      <p className="truncate text-xs text-faint">{m.email}</p>
                    )}
                  </div>

                  <div className="no-print flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      aria-label={`Ubah data ${m.name}`}
                      className="grid size-8 place-items-center rounded-full text-faint transition hover:bg-surface-3 hover:text-ink-2"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      aria-label={`Hapus ${m.name}`}
                      className="grid size-8 place-items-center rounded-full text-faint transition hover:bg-[var(--tone-red-soft)] hover:text-[var(--tone-red-text)]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {m.github_username ? (
                    <a
                      href={`https://github.com/${m.github_username}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="glass-chip inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-ink-2 transition hover:brightness-125"
                    >
                      <GithubIcon className="size-3.5" />@{m.github_username}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tone-amber-soft)] px-2.5 py-1 text-xs font-medium text-[var(--tone-amber-text)]">
                      <AlertCircle className="size-3.5" /> belum tertaut GitHub
                    </span>
                  )}

                  {m.github_username && !tertaut && !loadingContributors && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-xs font-medium text-muted"
                      title="Username terisi, tapi akun ini tidak muncul di daftar kontributor repo"
                    >
                      bukan kontributor repo
                    </span>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
                  <div>
                    <dt className="text-xs text-muted">Commit</dt>
                    <dd
                      className="text-lg font-semibold text-[var(--tone-green-text)]"
                      title={
                        tertaut
                          ? "Jumlah commit di repo menurut GitHub"
                          : "Belum tertaut ke akun GitHub"
                      }
                    >
                      {tertaut ? commits : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Tugas</dt>
                    <dd className="text-lg font-semibold text-ink">{s.total}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Berjalan</dt>
                    <dd className="text-lg font-semibold text-[var(--tone-blue-text)]">{s.open}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Catatan</dt>
                    <dd className="text-lg font-semibold text-ink">{s.logs}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted">Penyelesaian tugas</span>
                    <span className="font-semibold text-ink-2">{pct}%</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-surface-3"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Penyelesaian tugas ${m.name}`}
                  >
                    <div
                      className="h-full rounded-full bg-inverse transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-faint">
                    Total {s.hours.toFixed(1)} jam tercatat
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Ubah Anggota" : "Tambah Anggota"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nama lengkap">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              required
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Peran">
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Warna avatar">
              <Select
                value={form.avatar_color}
                onChange={(e) =>
                  setForm({ ...form, avatar_color: e.target.value as AccentColor })
                }
              >
                {ACCENT_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {COLOR_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Email" hint="Opsional.">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@kampus.ac.id"
            />
          </Field>

          <Field
            label="Username GitHub"
            hint="Wajib benar agar commit-nya terhitung otomatis di halaman Aktivitas GitHub."
          >
            <Input
              value={form.github_username}
              onChange={(e) => setForm({ ...form, github_username: e.target.value })}
              placeholder="budisantoso"
            />
          </Field>

          <label className="flex items-center gap-2.5 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={form.is_lead}
              onChange={(e) => setForm({ ...form, is_lead: e.target.checked })}
              className="size-4 rounded border-line-2"
            />
            Jadikan ketua kelompok / project manager
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah Anggota"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

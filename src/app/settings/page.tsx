"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Database, RotateCcw, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAppSettings, type AppSettings } from "@/lib/appSettings";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { cn } from "@/lib/cn";

export default function SettingsPage() {
  const { mode, projects, updateProject } = useStore();
  const { settings, save } = useAppSettings();

  const [form, setForm] = useState<AppSettings>(settings);
  const [savedFlash, setSavedFlash] = useState(false);

  // useAppSettings mengembalikan nilai bawaan saat render pertama, lalu nilai
  // asli dari localStorage. Sinkronkan form saat sumbernya berubah — ini pola
  // "sesuaikan state saat render" dari dokumentasi React, bukan efek samping.
  const [syncedFrom, setSyncedFrom] = useState<AppSettings>(settings);
  if (syncedFrom !== settings) {
    setSyncedFrom(settings);
    setForm(settings);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    save(form);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2500);
  }

  function resetDemoData() {
    const ok = window.confirm(
      "Kembalikan data demo ke kondisi awal?\n\n" +
        "Semua perubahan yang kamu buat di mode demo akan hilang. " +
        "Tindakan ini tidak bisa dibatalkan."
    );
    if (!ok) return;
    localStorage.removeItem("projex-data-v1");
    window.location.reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Konfigurasi aplikasi dan identitas laporan"
        title="Pengaturan"
        showSearch={false}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------- Status penyimpanan ---------- */}
        <Card>
          <CardHeader title="Penyimpanan Data" />
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl p-4",
              mode === "supabase" ? "bg-[var(--tone-green-soft)]" : "bg-[var(--tone-amber-soft)]"
            )}
          >
            <Database
              className={cn(
                "mt-0.5 size-5 shrink-0",
                mode === "supabase" ? "text-[var(--tone-green-text)]" : "text-[var(--tone-amber-text)]"
              )}
            />
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  mode === "supabase" ? "text-[var(--tone-green-text)]" : "text-[var(--tone-amber-text)]"
                )}
              >
                {mode === "supabase"
                  ? "Terhubung ke Supabase"
                  : "Mode demo — data hanya di browser ini"}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  mode === "supabase" ? "text-[var(--tone-green-text)]" : "text-[var(--tone-amber-text)]"
                )}
              >
                {mode === "supabase"
                  ? "Semua anggota yang membuka aplikasi ini melihat data yang sama."
                  : "Anggota lain yang membuka aplikasi ini tidak akan melihat datamu. Hubungkan Supabase agar data tersimpan bersama."}
              </p>
            </div>
          </div>

          {mode === "demo" && (
            <div className="mt-4 rounded-2xl border border-line p-4">
              <p className="text-sm font-medium text-ink">
                Cara menghubungkan Supabase
              </p>
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-2">
                <li>
                  Buat project gratis di{" "}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-medium underline"
                  >
                    supabase.com
                  </a>
                  , lalu salin <span className="font-medium">Project Ref</span> dari
                  URL dashboard-nya.
                </li>
                <li>
                  Jalankan tiga perintah di bawah. Migration akan membuat semua tabel,
                  index, dan data contoh secara otomatis.
                </li>
                <li>
                  Salin <span className="font-medium">Project URL</span> dan{" "}
                  <span className="font-medium">anon public key</span> dari menu Settings →
                  API ke file{" "}
                  <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs">
                    .env.local
                  </code>
                  , lalu jalankan ulang{" "}
                  <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs">
                    npm run dev
                  </code>
                  .
                </li>
              </ol>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-100">
{`npm run db:login
npm run db:link -- --project-ref ISI_PROJECT_REF
npm run db:push

# lalu isi .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...`}
              </pre>
            </div>
          )}

          {mode === "demo" && (
            <Button variant="outline" onClick={resetDemoData} className="mt-4">
              <RotateCcw className="size-4" /> Kembalikan data demo ke awal
            </Button>
          )}
        </Card>

        {/* ---------- Identitas laporan ---------- */}
        <Card>
          <CardHeader title="Identitas Laporan" />
          <p className="mb-4 text-sm text-muted">
            Data ini muncul sebagai kop di halaman{" "}
            <Link href="/report" className="font-medium underline">
              Laporan
            </Link>{" "}
            saat dicetak atau disimpan sebagai PDF.
          </p>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Field label="Nama kelompok">
              <Input
                value={form.groupName}
                onChange={(e) => setForm({ ...form, groupName: e.target.value })}
                placeholder="Kelompok 1"
              />
            </Field>
            <Field label="Mata kuliah">
              <Input
                value={form.courseName}
                onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                placeholder="Rekayasa Perangkat Lunak"
              />
            </Field>
            <Field label="Nama dosen pengampu">
              <Input
                value={form.lecturerName}
                onChange={(e) => setForm({ ...form, lecturerName: e.target.value })}
                placeholder="Dr. Nama Dosen, M.Kom."
              />
            </Field>
            <Field label="Institusi / Program studi">
              <Input
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                placeholder="Teknik Informatika — Universitas X"
              />
            </Field>

            <div className="flex items-center gap-3">
              <Button type="submit">
                <Save className="size-4" /> Simpan
              </Button>
              {savedFlash && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--tone-green-text)]">
                  <CheckCircle2 className="size-4" /> Tersimpan
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* ---------- Repo GitHub ---------- */}
        <Card className="lg:col-span-2">
          <CardHeader title="Repo GitHub per Proyek" />
          <p className="mb-4 text-sm text-muted">
            Isi URL repo agar commit tiap anggota otomatis muncul di halaman{" "}
            <Link href="/activity" className="font-medium underline">
              Aktivitas GitHub
            </Link>{" "}
            dan ikut masuk ke laporan. Repo publik tidak butuh token. Untuk repo privat,
            tambahkan{" "}
            <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs">
              GITHUB_TOKEN
            </code>{" "}
            di <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs">.env.local</code>.
          </p>
          <p className="mb-4 rounded-2xl bg-[var(--tone-amber-soft)] px-4 py-3 text-sm text-[var(--tone-amber-text)]">
            Tombol <span className="font-medium">Merge</span> di halaman{" "}
            <Link href="/manager" className="font-medium underline">
              Project Manager
            </Link>{" "}
            butuh token dengan <span className="font-medium">izin tulis</span> — scope{" "}
            <code className="font-mono text-xs">repo</code> untuk token klasik, atau{" "}
            <code className="font-mono text-xs">contents: write</code> untuk fine-grained
            token. Tanpa itu, approve dan reject tetap jalan, tapi merge-nya dilakukan
            manual di GitHub.
          </p>

          {projects.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 px-4 py-8 text-center text-sm text-muted">
              Belum ada proyek.{" "}
              <Link href="/projects" className="font-medium underline">
                Buat proyek dulu
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {projects.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3">
                  <span className="min-w-40 flex-1 truncate text-sm font-medium text-ink">
                    {p.name}
                  </span>
                  <div className="relative flex-[2]">
                    <GithubIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
                    <Input
                      defaultValue={p.repo_url ?? ""}
                      onBlur={(e) => {
                        const next = e.target.value.trim() || null;
                        if (next !== (p.repo_url ?? null)) {
                          updateProject(p.id, { repo_url: next });
                        }
                      }}
                      placeholder="https://github.com/nama/repo"
                      aria-label={`URL repo untuk ${p.name}`}
                      className="pl-10"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-faint">
            Perubahan tersimpan otomatis saat kamu klik di luar kolom.
          </p>
        </Card>
      </div>
    </>
  );
}

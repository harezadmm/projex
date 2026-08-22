import type { Member, Project, Task, ProgressLog, BranchReview } from "./types";

/** Tanggal relatif terhadap hari ini, dalam format ISO. */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function dateOnly(n: number): string {
  return daysFromNow(n).slice(0, 10);
}

/**
 * Data contoh untuk mode demo (dipakai saat Supabase belum dikonfigurasi).
 * Isinya sengaja dibuat sama persis dengan seed di supabase/schema.sql
 * supaya tampilan sebelum dan sesudah konek database tidak berubah.
 */
export function buildSeedData(): {
  members: Member[];
  projects: Project[];
  tasks: Task[];
  logs: ProgressLog[];
  reviews: BranchReview[];
} {
  const members: Member[] = [
    {
      id: "m1",
      name: "Muhammad Hariz",
      email: "hariz@kampus.ac.id",
      role: "Project Manager",
      github_username: "harizadhim",
      avatar_color: "blue",
      is_lead: true,
      created_at: daysFromNow(-40),
    },
    {
      id: "m2",
      name: "Anggota Dua",
      email: "dua@kampus.ac.id",
      role: "Frontend Dev",
      github_username: "anggota-dua",
      avatar_color: "orange",
      is_lead: false,
      created_at: daysFromNow(-40),
    },
    {
      id: "m3",
      name: "Anggota Tiga",
      email: "tiga@kampus.ac.id",
      role: "Backend Dev",
      github_username: "anggota-tiga",
      avatar_color: "green",
      is_lead: false,
      created_at: daysFromNow(-40),
    },
    {
      id: "m4",
      name: "Anggota Empat",
      email: "empat@kampus.ac.id",
      role: "UI/UX Designer",
      github_username: "anggota-4",
      avatar_color: "pink",
      is_lead: false,
      created_at: daysFromNow(-40),
    },
  ];

  const projects: Project[] = [
    {
      id: "p1",
      name: "Website Project Management",
      description:
        "Aplikasi web untuk mengelola proyek, tugas, dan progres anggota kelompok.",
      status: "in_progress",
      color: "blue",
      // Ganti dengan repo kelompokmu di halaman Pengaturan / Proyek
      repo_url: "https://github.com/harizadhim/project-manager",
      start_date: dateOnly(-14),
      deadline: dateOnly(30),
      created_at: daysFromNow(-14),
    },
    {
      id: "p2",
      name: "Laporan & Dokumentasi",
      description:
        "Menyusun laporan akhir, diagram UML, dan slide presentasi untuk dosen.",
      status: "in_progress",
      color: "orange",
      repo_url: null,
      start_date: dateOnly(-7),
      deadline: dateOnly(35),
      created_at: daysFromNow(-7),
    },
    {
      id: "p3",
      name: "Riset & Analisis Kebutuhan",
      description:
        "Wawancara pengguna, analisis kebutuhan, dan penyusunan spesifikasi sistem.",
      status: "completed",
      color: "green",
      repo_url: null,
      start_date: dateOnly(-30),
      deadline: dateOnly(-10),
      created_at: daysFromNow(-30),
    },
  ];

  const rawTasks: Array<
    [string, string, string, string, Task["status"], Task["priority"], number]
  > = [
    ["p1", "m1", "Review progres mingguan tim", "Cek update tiap anggota dan susun rencana minggu depan.", "in_progress", "high", 0],
    ["p1", "m1", "Setup repo & struktur project", "Inisialisasi Next.js, Tailwind, dan struktur folder.", "done", "high", -10],
    ["p1", "m2", "Halaman Dashboard", "Bikin kartu statistik, chart, dan daftar tugas.", "in_progress", "high", 3],
    ["p1", "m3", "Koneksi database Supabase", "Bikin skema tabel dan hubungkan ke aplikasi.", "in_progress", "high", 5],
    ["p1", "m4", "Desain UI di Figma", "Mockup semua halaman sebelum dikoding.", "done", "medium", -5],
    ["p1", "m2", "Halaman Kanban Tugas", "Papan To Do / In Progress / Done.", "todo", "medium", 8],
    ["p1", "m3", "Integrasi GitHub API", "Tarik data commit tiap anggota untuk bukti kontribusi.", "todo", "medium", 10],
    ["p2", "m1", "Susun BAB 1 Pendahuluan", "Latar belakang, rumusan masalah, tujuan.", "done", "medium", -3],
    ["p2", "m4", "Buat diagram UML", "Use case diagram, ERD, dan activity diagram.", "in_progress", "medium", 6],
    ["p2", "m1", "Kumpulkan draft laporan ke dosen", "Gabungkan BAB 1–3 dan kirim untuk direview.", "todo", "high", 4],
    ["p2", "m2", "Slide presentasi", "Slide untuk sidang / presentasi akhir.", "todo", "low", 20],
    ["p3", "m3", "Wawancara calon pengguna", "Wawancara 5 orang untuk validasi kebutuhan.", "done", "medium", -20],
    ["p3", "m1", "Dokumen spesifikasi kebutuhan", "SRS ringkas berisi kebutuhan fungsional & non-fungsional.", "done", "high", -12],
  ];

  const tasks: Task[] = rawTasks.map(
    ([project_id, assignee_id, title, description, status, priority, due], i) => ({
      id: `t${i + 1}`,
      project_id,
      assignee_id,
      title,
      description,
      status,
      priority,
      due_date: dateOnly(due),
      created_at: daysFromNow(due - 14),
      completed_at: status === "done" ? daysFromNow(due) : null,
      // Semua tugas contoh dibuat manual, bukan turunan branch GitHub.
      source_repo: null,
      source_branch: null,
    })
  );

  const byTitle = (title: string) => tasks.find((t) => t.title === title);

  const rawLogs: Array<[string, string, number, number, number]> = [
    ["Setup repo & struktur project", "Repo dibuat, Next.js + Tailwind jalan, folder sudah rapi.", 100, 3.5, 10],
    ["Halaman Dashboard", "Layout sidebar dan topbar selesai, tinggal chart.", 55, 4, 4],
    ["Halaman Dashboard", "Donut chart proyek sudah tampil, lanjut area chart commit.", 70, 2.5, 1],
    ["Koneksi database Supabase", "Tabel members, projects, tasks sudah dibuat di Supabase.", 60, 3, 2],
    ["Desain UI di Figma", "Semua mockup halaman kelar dan sudah di-review tim.", 100, 6, 6],
    ["Buat diagram UML", "Use case diagram selesai, ERD masih proses.", 40, 2, 1],
    ["Susun BAB 1 Pendahuluan", "BAB 1 selesai, sudah dicek format sesuai panduan kampus.", 100, 4, 3],
  ];

  const logs: ProgressLog[] = rawLogs.map(
    ([taskTitle, note, percent, hours, daysAgo], i) => {
      const task = byTitle(taskTitle);
      return {
        id: `l${i + 1}`,
        task_id: task?.id ?? null,
        member_id: task?.assignee_id ?? null,
        note,
        percent,
        hours_spent: hours,
        created_at: daysFromNow(-daysAgo),
      };
    }
  );

  // Tinjauan branch selalu mulai kosong: isinya berasal dari repo sungguhan
  // saat halaman Project Manager melakukan sinkronisasi.
  return { members, projects, tasks, logs, reviews: [] };
}

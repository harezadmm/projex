-- ============================================================
--  Projex — data contoh
--
--  Aman dijalankan berulang kali: kalau tabel members sudah berisi
--  data, seluruh blok ini dilewati sehingga data aslimu tidak
--  tertimpa atau terduplikasi.
--
--  Sudah punya data sendiri dan tidak butuh contoh?
--  Hapus saja file migration ini sebelum menjalankan db:push.
-- ============================================================

do $$
declare
  m_hariz uuid;
  m_dua   uuid;
  m_tiga  uuid;
  m_empat uuid;
  p_web   uuid;
  p_doc   uuid;
  p_riset uuid;
begin
  -- Sudah ada isinya? Jangan sentuh apa pun.
  if exists (select 1 from members limit 1) then
    raise notice 'Tabel members sudah berisi data — seed dilewati.';
    return;
  end if;

  -- ---------------- Anggota ----------------
  -- Ganti nama & github_username di bawah dengan anggota kelompokmu.
  -- github_username WAJIB persis benar supaya commit-nya terhitung.
  insert into members (name, email, role, github_username, avatar_color, is_lead)
  values ('Muhammad Hariz', 'hariz@kampus.ac.id', 'Project Manager', 'harizadhim', 'blue', true)
  returning id into m_hariz;

  insert into members (name, email, role, github_username, avatar_color, is_lead)
  values ('Anggota Dua', 'dua@kampus.ac.id', 'Frontend Dev', 'anggota-dua', 'orange', false)
  returning id into m_dua;

  insert into members (name, email, role, github_username, avatar_color, is_lead)
  values ('Anggota Tiga', 'tiga@kampus.ac.id', 'Backend Dev', 'anggota-tiga', 'green', false)
  returning id into m_tiga;

  insert into members (name, email, role, github_username, avatar_color, is_lead)
  values ('Anggota Empat', 'empat@kampus.ac.id', 'UI/UX Designer', 'anggota-4', 'pink', false)
  returning id into m_empat;

  -- ---------------- Proyek ----------------
  insert into projects (name, description, status, color, repo_url, start_date, deadline)
  values (
    'Website Project Management',
    'Aplikasi web untuk mengelola proyek, tugas, dan progres anggota kelompok.',
    'in_progress', 'blue', 'https://github.com/harizadhim/project-manager',
    current_date - 14, current_date + 30
  )
  returning id into p_web;

  insert into projects (name, description, status, color, repo_url, start_date, deadline)
  values (
    'Laporan & Dokumentasi',
    'Menyusun laporan akhir, diagram UML, dan slide presentasi untuk dosen.',
    'in_progress', 'orange', null,
    current_date - 7, current_date + 35
  )
  returning id into p_doc;

  insert into projects (name, description, status, color, repo_url, start_date, deadline)
  values (
    'Riset & Analisis Kebutuhan',
    'Wawancara pengguna, analisis kebutuhan, dan penyusunan spesifikasi sistem.',
    'completed', 'green', null,
    current_date - 30, current_date - 10
  )
  returning id into p_riset;

  -- ---------------- Tugas ----------------
  insert into tasks (project_id, assignee_id, title, description, status, priority, due_date)
  values
    (p_web,   m_hariz, 'Review progres mingguan tim',      'Cek update tiap anggota dan susun rencana minggu depan.',    'in_progress', 'high',   current_date),
    (p_web,   m_hariz, 'Setup repo & struktur project',    'Inisialisasi Next.js, Tailwind, dan struktur folder.',       'done',        'high',   current_date - 10),
    (p_web,   m_dua,   'Halaman Dashboard',                'Bikin kartu statistik, chart, dan daftar tugas.',            'in_progress', 'high',   current_date + 3),
    (p_web,   m_tiga,  'Koneksi database Supabase',        'Bikin skema tabel dan hubungkan ke aplikasi.',               'in_progress', 'high',   current_date + 5),
    (p_web,   m_empat, 'Desain UI di Figma',               'Mockup semua halaman sebelum dikoding.',                     'done',        'medium', current_date - 5),
    (p_web,   m_dua,   'Halaman Kanban Tugas',             'Papan To Do / In Progress / Done.',                          'todo',        'medium', current_date + 8),
    (p_web,   m_tiga,  'Integrasi GitHub API',             'Tarik data commit tiap anggota untuk bukti kontribusi.',     'todo',        'medium', current_date + 10),
    (p_doc,   m_hariz, 'Susun BAB 1 Pendahuluan',          'Latar belakang, rumusan masalah, tujuan.',                   'done',        'medium', current_date - 3),
    (p_doc,   m_hariz, 'Kumpulkan draft laporan ke dosen', 'Gabungkan BAB 1-3 dan kirim untuk direview.',                'todo',        'high',   current_date + 4),
    (p_doc,   m_empat, 'Buat diagram UML',                 'Use case diagram, ERD, dan activity diagram.',               'in_progress', 'medium', current_date + 6),
    (p_doc,   m_dua,   'Slide presentasi',                 'Slide untuk sidang / presentasi akhir.',                     'todo',        'low',    current_date + 20),
    (p_riset, m_tiga,  'Wawancara calon pengguna',         'Wawancara 5 orang untuk validasi kebutuhan.',                'done',        'medium', current_date - 20),
    (p_riset, m_hariz, 'Dokumen spesifikasi kebutuhan',    'SRS ringkas berisi kebutuhan fungsional & non-fungsional.',  'done',        'high',   current_date - 12);

  -- ---------------- Catatan progres ----------------
  insert into progress_logs (task_id, member_id, note, percent, hours_spent, created_at)
  select tk.id, tk.assignee_id, l.note, l.percent, l.hours,
         now() - (l.days_ago || ' days')::interval
  from (values
    ('Setup repo & struktur project', 'Repo dibuat, Next.js + Tailwind jalan, folder sudah rapi.',   100, 3.5, 10),
    ('Halaman Dashboard',             'Layout sidebar dan topbar selesai, tinggal chart.',            55, 4.0,  4),
    ('Halaman Dashboard',             'Donut chart proyek sudah tampil, lanjut area chart commit.',   70, 2.5,  1),
    ('Koneksi database Supabase',     'Tabel members, projects, tasks sudah dibuat di Supabase.',     60, 3.0,  2),
    ('Desain UI di Figma',            'Semua mockup halaman kelar dan sudah di-review tim.',         100, 6.0,  6),
    ('Buat diagram UML',              'Use case diagram selesai, ERD masih proses.',                  40, 2.0,  1),
    ('Susun BAB 1 Pendahuluan',       'BAB 1 selesai, sudah dicek format sesuai panduan kampus.',    100, 4.0,  3)
  ) as l(task_title, note, percent, hours, days_ago)
  join tasks tk on tk.title = l.task_title;

  raise notice 'Data contoh Projex berhasil dimasukkan.';
end
$$;

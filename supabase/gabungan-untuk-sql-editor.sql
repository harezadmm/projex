-- ============================================================
--  Projex — seluruh migration digabung jadi satu file.
--
--  Pakai ini kalau 'supabase db push' tidak bisa jalan.
--  Di jaringan ini port 5432 (yang dipakai CLI) diblokir, jadi
--  jalur SQL Editor dipakai karena hanya butuh HTTPS port 443.
--
--  Cara: buka dashboard Supabase > SQL Editor > New query,
--  tempel SELURUH isi file ini, lalu klik Run.
--  Aman dijalankan berulang kali.
-- ============================================================


-- >>>>>>>>>> 20260812010000_init_schema.sql <<<<<<<<<<

-- ============================================================
--  Projex — skema awal
--  Dijalankan otomatis oleh: npm run db:push
-- ============================================================

-- ------------------------------------------------------------
-- ANGGOTA TIM
-- ------------------------------------------------------------
create table if not exists members (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text,
  role            text not null default 'Anggota',
  github_username text,
  avatar_color    text not null default 'blue',
  is_lead         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PROYEK
-- ------------------------------------------------------------
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'not_started'
              check (status in ('not_started', 'in_progress', 'completed')),
  color       text not null default 'blue',
  repo_url    text,
  start_date  date,
  deadline    date,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TUGAS
-- ------------------------------------------------------------
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  assignee_id  uuid references members(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'todo'
               check (status in ('todo', 'in_progress', 'done')),
  priority     text not null default 'medium'
               check (priority in ('low', 'medium', 'high')),
  due_date     date,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- ------------------------------------------------------------
-- CATATAN PROGRES
-- Diisi anggota SEBELUM push ke GitHub, supaya progres tercatat
-- ------------------------------------------------------------
create table if not exists progress_logs (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references tasks(id) on delete cascade,
  member_id   uuid references members(id) on delete cascade,
  note        text not null,
  percent     int  not null default 0 check (percent between 0 and 100),
  hours_spent numeric(5,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- INDEX
-- Dipasang di kolom yang dipakai untuk filter dan pengurutan,
-- supaya query tetap cepat saat jumlah baris bertambah banyak.
-- ------------------------------------------------------------
create index if not exists tasks_project_id_idx    on tasks (project_id);
create index if not exists tasks_assignee_id_idx   on tasks (assignee_id);
create index if not exists tasks_status_idx        on tasks (status);
create index if not exists tasks_due_date_idx      on tasks (due_date);
create index if not exists tasks_created_at_idx    on tasks (created_at);

create index if not exists logs_member_id_idx      on progress_logs (member_id);
create index if not exists logs_task_id_idx        on progress_logs (task_id);
create index if not exists logs_created_at_idx     on progress_logs (created_at desc);

create index if not exists projects_created_at_idx on projects (created_at);
create index if not exists members_created_at_idx  on members (created_at);

-- ------------------------------------------------------------
-- OTOMATIS: isi completed_at saat task berubah jadi 'done'
-- ------------------------------------------------------------
create or replace function set_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_completed_at on tasks;
create trigger tasks_completed_at
  before update on tasks
  for each row execute function set_task_completed_at();

-- ============================================================
-- ROW LEVEL SECURITY
--
-- CATATAN PENTING: policy di bawah membuka akses baca-tulis untuk
-- siapa pun yang punya anon key, tanpa login. Ini disengaja supaya
-- satu kelompok bisa langsung pakai bareng tanpa membangun sistem
-- autentikasi — wajar untuk tugas kuliah.
--
-- Konsekuensinya: siapa pun yang tahu URL + anon key bisa mengubah
-- data. JANGAN pakai pola ini untuk aplikasi produksi berisi data
-- sungguhan. Lihat README bagian "Catatan keamanan".
-- ============================================================
alter table members       enable row level security;
alter table projects      enable row level security;
alter table tasks         enable row level security;
alter table progress_logs enable row level security;

drop policy if exists "akses terbuka members"       on members;
drop policy if exists "akses terbuka projects"      on projects;
drop policy if exists "akses terbuka tasks"         on tasks;
drop policy if exists "akses terbuka progress_logs" on progress_logs;

create policy "akses terbuka members"       on members       for all using (true) with check (true);
create policy "akses terbuka projects"      on projects      for all using (true) with check (true);
create policy "akses terbuka tasks"         on tasks         for all using (true) with check (true);
create policy "akses terbuka progress_logs" on progress_logs for all using (true) with check (true);

-- ============================================================
-- REALTIME
-- Mendaftarkan tabel ke publication bawaan Supabase supaya semua
-- anggota melihat perubahan secara langsung tanpa perlu refresh.
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- add table akan error kalau tabelnya sudah terdaftar, jadi dicek dulu
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'members'
    ) then
      alter publication supabase_realtime add table members;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'projects'
    ) then
      alter publication supabase_realtime add table projects;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'tasks'
    ) then
      alter publication supabase_realtime add table tasks;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'progress_logs'
    ) then
      alter publication supabase_realtime add table progress_logs;
    end if;
  end if;
end
$$;

-- >>>>>>>>>> 20260812010100_seed_demo_data.sql <<<<<<<<<<

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

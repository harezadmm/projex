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

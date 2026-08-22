-- ============================================================
--  Projex — tinjauan branch & tugas otomatis dari GitHub
--  Dijalankan otomatis oleh: npm run db:push
-- ============================================================

-- ------------------------------------------------------------
-- TUGAS: asal-usul dari branch GitHub
--
-- Dua kolom, bukan satu: nama branch hanya unik DI DALAM sebuah repo.
-- Kalau dua proyek sama-sama punya branch "feat/login", satu kolom saja
-- akan menolak salah satunya sebagai duplikat.
-- ------------------------------------------------------------
alter table tasks add column if not exists source_repo   text;
alter table tasks add column if not exists source_branch text;

-- Kunci anti-duplikat: sinkronisasi berjalan berulang kali, dan tanpa ini
-- setiap kali dijalankan akan membuat tugas baru untuk branch yang sama.
-- Partial index dipakai supaya tugas manual (kedua kolom null) tidak
-- saling bentrok — di Postgres, null tidak dianggap sama dengan null,
-- tapi partial index membuat maksudnya eksplisit dan indeksnya lebih kecil.
create unique index if not exists tasks_source_branch_key
  on tasks (source_repo, source_branch)
  where source_branch is not null;

-- ------------------------------------------------------------
-- TINJAUAN BRANCH
-- Satu baris per branch fitur: catatan apakah boleh masuk ke main.
-- ------------------------------------------------------------
create table if not exists branch_reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  repo        text not null,
  branch      text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected', 'merged')),
  reviewer_id uuid references members(id) on delete set null,
  note        text,
  -- Diisi saat approve/reject, dikosongkan lagi kalau dikembalikan ke pending
  decided_at  timestamptz,
  -- Hanya terisi setelah merge lewat GitHub API benar-benar berhasil
  merged_at   timestamptz,
  merge_sha   text,
  created_at  timestamptz not null default now(),

  unique (repo, branch)
);

create index if not exists branch_reviews_project_id_idx on branch_reviews (project_id);
create index if not exists branch_reviews_status_idx     on branch_reviews (status);
create index if not exists branch_reviews_created_at_idx on branch_reviews (created_at desc);

-- ------------------------------------------------------------
-- OTOMATIS: isi decided_at saat keputusan diambil
-- Pola yang sama dengan trigger completed_at pada tabel tasks.
-- ------------------------------------------------------------
create or replace function set_branch_review_decided_at()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('approved', 'rejected', 'merged')
     and (old.status is distinct from new.status) then
    new.decided_at := coalesce(new.decided_at, now());
  elsif new.status = 'pending' then
    new.decided_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists branch_reviews_decided_at on branch_reviews;
create trigger branch_reviews_decided_at
  before update on branch_reviews
  for each row execute function set_branch_review_decided_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Mengikuti pola tabel lain: terbuka tanpa login, sengaja, supaya satu
-- kelompok bisa langsung pakai bareng. Lihat catatan di migrasi awal.
-- ============================================================
alter table branch_reviews enable row level security;

drop policy if exists "akses terbuka branch_reviews" on branch_reviews;
create policy "akses terbuka branch_reviews" on branch_reviews
  for all using (true) with check (true);

-- ============================================================
-- REALTIME
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'branch_reviews'
    ) then
      alter publication supabase_realtime add table branch_reviews;
    end if;
  end if;
end
$$;

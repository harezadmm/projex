-- ============================================================
--  Projex — kunci search_path pada fungsi trigger
--
--  Tanpa ini, search_path fungsi ikut milik pemanggil, sehingga
--  fungsi bisa diarahkan memakai objek palsu dari skema lain.
--  Terdeteksi oleh database linter Supabase (lint 0011
--  function_search_path_mutable).
--
--  Kedua fungsi di bawah hanya menyentuh NEW/OLD dan now(). now()
--  berada di pg_catalog yang selalu implisit dalam search_path,
--  jadi mengosongkannya tetap aman.
-- ============================================================

create or replace function set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
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

create or replace function set_branch_review_decided_at()
returns trigger
language plpgsql
set search_path = ''
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

#!/usr/bin/env bash
#
# Verifikasi isi database Supabase lewat REST API (HTTPS port 443).
#
# Dipakai karena port 5432 diblokir jaringan ini, sehingga psql dan
# `supabase db push` tidak bisa dipakai. Lihat LANJUTKAN.md.
#
# Jalankan dari folder project:  bash scripts/verifikasi-db.sh

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

if [ ! -f .env.local ]; then
  echo "GAGAL: .env.local tidak ditemukan."
  exit 1
fi

URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "GAGAL: NEXT_PUBLIC_SUPABASE_URL atau ANON_KEY kosong di .env.local."
  exit 1
fi

BASE="$URL/rest/v1"
echo "Memeriksa $URL"
echo

# Jumlah baris yang diharapkan dari data contoh bawaan migration
declare -a TABEL=("members:4" "projects:3" "tasks:13" "progress_logs:7")

gagal=0
for entri in "${TABEL[@]}"; do
  nama="${entri%%:*}"
  harap="${entri##*:}"

  resp=$(curl -s --max-time 20 "$BASE/$nama?select=id" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" 2>/dev/null)

  if printf '%s' "$resp" | grep -q '"code"'; then
    pesan=$(printf '%s' "$resp" | python3 -c "import json,sys; print(json.load(sys.stdin).get('message','?'))" 2>/dev/null)
    printf "  %-15s GAGAL — %s\n" "$nama" "$pesan"
    gagal=1
    continue
  fi

  jumlah=$(printf '%s' "$resp" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null)

  if [ "$jumlah" = "$harap" ]; then
    printf "  %-15s %s baris  (sesuai)\n" "$nama" "$jumlah"
  else
    printf "  %-15s %s baris  (data contoh seharusnya %s — wajar kalau kamu sudah mengubah datanya)\n" \
      "$nama" "$jumlah" "$harap"
  fi
done

echo
if [ "$gagal" = "1" ]; then
  echo "BELUM SIAP."
  echo "Tempel isi supabase/gabungan-untuk-sql-editor.sql ke SQL Editor lalu klik Run:"
  echo "  https://supabase.com/dashboard/project/jvsgyrtgjgtmxrvuwvce/sql/new"
  exit 1
fi

echo "DATABASE SIAP. Jalankan 'npm run dev' lalu buka /settings —"
echo "indikatornya harus hijau 'Terhubung ke Supabase'."

# Projex — Website Project Management Kelompok

Aplikasi web untuk mengelola proyek kuliah: membagi tugas ke anggota, mencatat
progres harian, dan menarik bukti kontribusi langsung dari GitHub — lalu
merangkumnya jadi satu halaman laporan yang siap dicetak untuk dosen.

Dibangun dengan **Next.js 16 + React 19 + Tailwind CSS 4 + Supabase**.

---

## Daftar Isi

1. [Fitur](#fitur)
2. [Menjalankan pertama kali](#menjalankan-pertama-kali)
3. [Menghubungkan Supabase](#menghubungkan-supabase)
4. [Menghubungkan GitHub](#menghubungkan-github)
5. [Alur kerja tim yang disarankan](#alur-kerja-tim-yang-disarankan)
6. [Deploy ke Vercel](#deploy-ke-vercel)
7. [Struktur folder](#struktur-folder)
8. [Performa dan skalabilitas](#performa-dan-skalabilitas)
9. [Catatan keamanan](#catatan-keamanan)

---

## Fitur

| Halaman | Isi |
|---|---|
| **Dashboard** | Tugas saya hari ini, donut ringkasan tugas, grafik aktivitas tim (commit + catatan), progres tiap proyek, deadline terdekat, update terbaru anggota |
| **Proyek** | Daftar proyek dengan bar progres, status, deadline, dan URL repo. Ada halaman detail per proyek |
| **Tugas** | Papan Kanban 3 kolom (Belum Mulai / Dikerjakan / Selesai). Bisa drag-and-drop, atau pakai tombol panah di layar sentuh. Filter per proyek dan per anggota |
| **Anggota** | Tambah/ubah/hapus anggota, atur peran, warna avatar, dan username GitHub. Tiap kartu menampilkan statistik kontribusi |
| **Catatan Progres** | Form untuk anggota menulis update harian, terikat ke tugas tertentu, lengkap dengan persentase dan jam kerja |
| **Aktivitas GitHub** | Commit ditarik langsung dari GitHub API, dicocokkan ke anggota lewat username, ditampilkan sebagai grafik dan timeline |
| **Laporan** | Rekap lengkap semua data di atas dalam format tabel, siap di-print atau disimpan sebagai PDF |
| **Pengaturan** | Status koneksi database, identitas untuk kop laporan, dan URL repo tiap proyek |

---

## Menjalankan pertama kali

Butuh **Node.js 20 atau lebih baru**. Cek dengan `node -v`.

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>.

Aplikasi langsung jalan tanpa konfigurasi apa pun — ia masuk ke **mode demo**
dengan data contoh yang tersimpan di browser. Ini cukup untuk mencoba semua
fitur dan untuk demo di depan kelas.

> **Batasan mode demo:** data hanya ada di browsermu. Anggota lain yang membuka
> aplikasi ini akan melihat data contoh mereka sendiri, bukan datamu. Untuk
> berbagi data satu tim, hubungkan Supabase di langkah berikutnya.

Ingin mengembalikan data contoh ke kondisi awal? Buka **Pengaturan → Kembalikan
data demo ke awal**.

---

## Menghubungkan Supabase

Ini yang membuat seluruh anggota melihat data yang sama, sekaligus mengaktifkan
sinkronisasi realtime. Gratis, sekitar 5 menit.

Database dikelola lewat **Supabase CLI** dengan file migration, bukan dengan
menempel SQL secara manual. Bedanya: migration tercatat di Git, bisa dijalankan
ulang dengan aman, dan anggota lain tinggal menjalankan satu perintah yang sama.

**1. Buat project di Supabase**

Daftar di <https://supabase.com>, buat project baru (pilih region Singapore
supaya cepat dari Indonesia). Simpan **database password** yang kamu buat —
akan diminta saat `db:link`.

Dari URL dashboard `https://supabase.com/dashboard/project/abcdefgh`, bagian
`abcdefgh` itulah **project ref**-mu.

**2. Jalankan migration**

```bash
npm run db:login
```

Perintah ini membuka browser untuk otorisasi, lalu meminta kamu menempelkan
kode verifikasi.

```bash
npm run db:link -- --project-ref ISI_PROJECT_REF_MU
```

```bash
npm run db:push
```

`db:push` menjalankan semua file di `supabase/migrations/` secara berurutan:
membuat 4 tabel, 14 index, trigger, kebijakan akses, mendaftarkan tabel ke
realtime, dan mengisi data contoh.

**3. Isi environment variable**

Buka **Settings → API** di dashboard Supabase, salin **Project URL** dan
**anon public** key:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Hentikan server (Ctrl+C) lalu jalankan `npm run dev` lagi. Cek di halaman
**Pengaturan** — indikatornya harus hijau "Terhubung ke Supabase".

**Perintah database lain yang tersedia**

| Perintah | Fungsi |
|---|---|
| `npm run db:status` | Lihat migration mana yang sudah dan belum jalan |
| `npm run db:diff` | Bandingkan skema lokal dengan yang ada di server |
| `npm run db:push` | Jalankan migration yang belum diterapkan |

**Ganti data contoh dengan data asli:** buka menu **Anggota**, hapus 4 anggota
contoh, lalu tambahkan anggota kelompokmu yang sebenarnya. Lakukan hal yang sama
di menu Proyek. Kalau kamu tidak mau data contoh sama sekali, hapus file
`supabase/migrations/20260812010100_seed_demo_data.sql` **sebelum** menjalankan
`db:push`.

> **Kenapa tidak `supabase start`?** Perintah itu menjalankan seluruh stack
> Supabase secara lokal dan **wajib butuh Docker**. Docker belum terpasang di
> mesin ini, jadi alur di atas memakai project Supabase Cloud — yang justru
> lebih tepat untuk tugas kelompok, karena semua anggota bisa langsung terhubung
> ke database yang sama tanpa perlu instal apa pun.

---

## Menghubungkan GitHub

Supaya commit tiap anggota terhitung otomatis sebagai bukti kontribusi:

1. Buka **Pengaturan → Repo GitHub per Proyek**, isi URL repo kelompok
   (contoh: `https://github.com/namakamu/nama-repo`).
2. Buka **Anggota**, pastikan kolom **Username GitHub** tiap orang terisi
   **persis** sama dengan username GitHub mereka. Ini kuncinya — commit
   dicocokkan lewat username ini.
3. Buka **Aktivitas GitHub**. Commit 30 hari terakhir akan muncul beserta
   grafik jumlah commit per anggota.

Kalau ada commit dari akun yang belum terdaftar, aplikasi menampilkan kotak
peringatan kuning berisi daftar username tersebut — tinggal salin ke data
anggota yang sesuai.

**Repo publik tidak butuh token.** GitHub membatasi 60 permintaan/jam per IP,
dan aplikasi ini menyimpan cache 5 menit, jadi biasanya aman. Kalau repo
kelompokmu **privat** atau kamu sering kena batas kuota, tambahkan
`GITHUB_TOKEN` di `.env.local` (lihat `.env.example` untuk caranya). Token
hanya dibaca di sisi server dan tidak pernah sampai ke browser.

---

## Alur kerja tim yang disarankan

Ini menjawab pertanyaan "bagaimana caranya supaya progres tercatat dan enak
dilaporkan ke dosen". Intinya: **catat dulu di aplikasi, baru push ke GitHub.**

**Sekali di awal — kamu sebagai Project Manager:**

1. Buat proyek di menu **Proyek**, isi deadline dan URL repo.
2. Tambahkan semua anggota di menu **Anggota** beserta username GitHub-nya.
3. Pecah pekerjaan jadi tugas-tugas di menu **Tugas**, tugaskan ke tiap orang,
   beri deadline dan prioritas.

**Rutin tiap anggota selesai satu sesi kerja:**

1. Buka aplikasi, pilih namanya di pojok kanan atas.
2. Masuk ke **Catatan Progres**, pilih tugas yang dikerjakan, tulis apa yang
   sudah selesai, geser slider persentase, isi jam kerja. Kirim.
3. Baru `git push` ke GitHub.

Kenapa urutannya begitu: catatan di aplikasi menjelaskan **apa dan kenapa**
(yang tidak terbaca dari diff), sedangkan commit GitHub adalah **bukti objektif
bertanggal** yang tidak bisa dikarang belakangan. Dua-duanya saling melengkapi
— dan keduanya otomatis masuk ke halaman Laporan.

**Rutin mingguan — kamu sebagai PM:**

1. Cek **Dashboard** untuk melihat siapa yang tertinggal dan tugas mana yang
   sudah lewat deadline (ditandai merah).
2. Geser kartu di **Tugas** sesuai kondisi terkini.
3. Bandingkan dengan **Aktivitas GitHub** — kalau ada anggota yang catatannya
   banyak tapi commit-nya nol (atau sebaliknya), itu sinyal untuk ditanyakan.

**Saat mengumpulkan ke dosen:**

1. Isi **Pengaturan → Identitas Laporan** (nama kelompok, mata kuliah, nama
   dosen, program studi). Ini jadi kop laporan.
2. Buka **Laporan**, pilih rentang commit, klik **Cetak / Simpan PDF**.
3. Di dialog print browser, pilih **Save as PDF**. Menu, sidebar, dan tombol
   otomatis hilang dari hasil cetak — yang tersisa hanya isi laporan.

Hasilnya berisi 4 bagian: tabel kontribusi per anggota (tugas, persentase,
jam, jumlah commit), rincian tugas per proyek, riwayat catatan progres, dan
daftar commit lengkap dengan SHA. Kalau dosen mempertanyakan pembagian kerja,
semua angkanya bisa ditelusuri ke sumbernya.

---

## Deploy ke Vercel

Supaya anggota tim (dan dosen) bisa membuka lewat link, bukan `localhost`:

1. Push project ini ke GitHub.
2. Buka <https://vercel.com>, login pakai akun GitHub, klik **Add New → Project**,
   pilih repo ini.
3. Di bagian **Environment Variables**, tambahkan
   `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (dan `GITHUB_TOKEN` kalau repo kelompokmu privat).
4. Klik **Deploy**.

Selesai — kamu dapat URL publik yang bisa dibagikan.

---

## Struktur folder

```
src/
├── app/
│   ├── page.tsx                    Dashboard
│   ├── projects/                   Daftar proyek + halaman detail [id]
│   ├── tasks/                      Papan Kanban
│   ├── members/                    Kelola anggota
│   ├── progress/                   Catatan progres harian
│   ├── activity/                   Commit dari GitHub
│   ├── report/                     Laporan siap cetak
│   ├── settings/                   Konfigurasi
│   └── api/github/commits/         Route handler ke GitHub REST API
├── components/
│   ├── layout/                     Sidebar, topbar, pencarian, kop halaman
│   ├── dashboard/                  Kartu-kartu dashboard
│   ├── tasks/                      Kartu tugas + form modal (dipisah demi performa)
│   ├── progress/                   Form catatan progres (dipisah demi performa)
│   └── ui/                         Komponen dasar (Card, Modal, Avatar, dll)
└── lib/
    ├── store.tsx                   Lapisan data: Supabase atau localStorage
    ├── supabase.ts                 Klien Supabase
    ├── seed.ts                     Data contoh untuk mode demo
    ├── useCommits.ts               Hook pengambil commit
    ├── types.ts                    Tipe data bersama
    └── ui.ts                       Palet warna dan format tanggal Indonesia

supabase/
├── config.toml                     Konfigurasi Supabase CLI
└── migrations/
    ├── 20260812010000_init_schema.sql      Tabel, index, trigger, RLS, realtime
    └── 20260812010100_seed_demo_data.sql   Data contoh (aman dijalankan ulang)
```

---

## Performa dan skalabilitas

Aplikasi ini sudah diukur dan dioptimasi, bukan sekadar "terasa cepat". Pengujian
dilakukan pada build produksi dengan data yang jauh lebih besar dari kebutuhan
tugas kuliah: **600 tugas, 3.000 catatan progres, 10 proyek, 8 anggota**.

| Aksi | Sebelum | Sesudah |
|---|---|---|
| Mengetik 1 huruf di form tugas | 163 ms | **0,9 ms** (median) |
| Ganti filter di papan Kanban | 553 ms | **58 ms** (terburuk) |
| Mengetik di form catatan progres | — | **0,2 ms** (median) |
| Kartu di DOM (dari 600 tugas) | 600 | **75** |
| Baris di DOM (dari 3.000 catatan) | 3.000 | **20** |

Ambang di mana mata manusia mulai merasakan tersendat adalah sekitar 50 ms, jadi
angka sesudahnya berada jauh di bawah batas itu.

**Empat hal yang membuatnya cepat:**

1. **State form dipisah dari daftar.** Ini penyebab terbesar. Dulu state form
   tinggal di komponen halaman, sehingga satu ketikan me-render ulang seluruh
   papan Kanban. Sekarang form ada di komponennya sendiri
   (`components/tasks/TaskFormModal.tsx`, `components/progress/ProgressForm.tsx`),
   jadi mengetik hanya menyentuh form itu.
2. **React Compiler** (`reactCompiler: true` di `next.config.ts`) memoisasi
   komponen secara otomatis, sehingga bagian yang datanya tidak berubah tidak
   ikut di-render ulang.
3. **Paginasi di semua daftar panjang** — 25 kartu per kolom Kanban, 20 catatan
   progres, 30 commit, masing-masing dengan tombol "tampilkan lebih". Jumlah
   simpul DOM tetap kecil berapa pun data yang tersimpan.
4. **Penulisan localStorage di-debounce.** Menyimpan berarti `JSON.stringify`
   seluruh dataset; kalau dilakukan tiap perubahan, aplikasi tersendat. Sekarang
   ditunda dan digabung, lalu dipaksa tersimpan saat halaman ditutup.

**Sisi database:**

- **14 index** pada kolom yang dipakai untuk filter dan pengurutan.
- **Realtime** — perubahan dari satu anggota langsung muncul di layar anggota
  lain tanpa refresh.
- **Catatan progres dimuat bertahap** (300 terbaru), bukan sekaligus. Halaman
  Laporan menarik sisanya supaya rekapnya tetap utuh.

Migration sudah diuji dengan menjalankannya sungguhan di PostgreSQL: seluruh
tabel, index, policy, dan trigger terbentuk; trigger `completed_at` bekerja dua
arah; cascade delete dan check constraint berfungsi; dan migration aman
dijalankan berulang kali tanpa menduplikasi data.

---

## Catatan keamanan

Migration `supabase/migrations/20260812010000_init_schema.sql` sengaja memakai
kebijakan akses **terbuka**:
siapa pun yang punya URL aplikasi bisa membaca dan mengubah data, tanpa login.
Ini dipilih supaya satu kelompok bisa langsung pakai bersama tanpa perlu
membangun sistem autentikasi — wajar untuk tugas kuliah.

Konsekuensinya: **jangan menyimpan data pribadi atau sensitif di sini**, dan
jangan memakai pola ini untuk aplikasi sungguhan. Kalau nanti kamu ingin
menambahkan login, Supabase Auth sudah tersedia — buat migration baru
(`npx supabase migration new tambah_auth`) yang mengganti policy `using (true)`
menjadi syarat berbasis `auth.uid()`.

Sementara itu, jangan pernah mem-commit file `.env.local` ke GitHub — file itu
sudah masuk `.gitignore`, biarkan begitu.

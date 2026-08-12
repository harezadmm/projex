import { NextResponse } from "next/server";
import type { Commit } from "@/lib/types";

export const revalidate = 300; // cache 5 menit, hemat kuota rate limit GitHub

/**
 * Terima "owner/repo", "github.com/owner/repo", atau URL lengkap
 * (dengan atau tanpa .git di belakang) dan kembalikan "owner/repo".
 */
function parseRepo(input: string): string | null {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const [owner, repo] = parts;
  // Karakter yang sah untuk nama owner/repo di GitHub
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;

  return `${owner}/${repo}`;
}

interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name?: string; date?: string } | null;
  };
  author: { login?: string } | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoParam = searchParams.get("repo");
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? 30), 1), 365);
  // ?fresh=... dikirim tombol "Muat ulang" agar cache 5 menit dilewati
  const fresh = searchParams.has("fresh");

  if (!repoParam) {
    return NextResponse.json(
      { error: "Parameter 'repo' wajib diisi, contoh: ?repo=owner/nama-repo" },
      { status: 400 }
    );
  }

  const repo = parseRepo(repoParam);
  if (!repo) {
    return NextResponse.json(
      { error: `Format repo tidak dikenali: "${repoParam}". Gunakan owner/nama-repo.` },
      { status: 400 }
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Token opsional: hanya dibaca di server, tidak pernah dikirim ke browser.
  // Tanpa token, GitHub membatasi 60 permintaan/jam per IP — cukup untuk repo publik.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Ambil maksimal 3 halaman (300 commit) — lebih dari cukup untuk tugas kuliah.
  const all: Commit[] = [];

  try {
    for (let page = 1; page <= 3; page++) {
      const url =
        `https://api.github.com/repos/${repo}/commits` +
        `?per_page=100&page=${page}&since=${since.toISOString()}`;

      const res = await fetch(
        url,
        fresh
          ? { headers, cache: "no-store" }
          : { headers, next: { revalidate } }
      );

      if (!res.ok) {
        // Halaman pertama gagal = benar-benar error; halaman lanjutan gagal = berhenti saja.
        if (page > 1) break;

        const remaining = res.headers.get("x-ratelimit-remaining");
        let message: string;

        if (res.status === 404) {
          message =
            `Repo "${repo}" tidak ditemukan atau bersifat privat. ` +
            `Periksa URL repo di halaman Pengaturan. Untuk repo privat, isi GITHUB_TOKEN di .env.local.`;
        } else if (res.status === 403 && remaining === "0") {
          message =
            "Kuota GitHub API habis (60 permintaan/jam tanpa token). " +
            "Tunggu sebentar, atau isi GITHUB_TOKEN di .env.local untuk kuota 5.000/jam.";
        } else if (res.status === 409) {
          message = `Repo "${repo}" masih kosong — belum ada commit sama sekali.`;
        } else {
          message = `GitHub membalas ${res.status} ${res.statusText}.`;
        }

        return NextResponse.json({ error: message, repo }, { status: res.status });
      }

      const batch = (await res.json()) as GitHubCommit[];
      if (!Array.isArray(batch) || batch.length === 0) break;

      all.push(
        ...batch.map((c) => ({
          sha: c.sha,
          message: c.commit.message.split("\n")[0],
          author_login: c.author?.login ?? null,
          author_name: c.commit.author?.name ?? "Tidak diketahui",
          date: c.commit.author?.date ?? new Date().toISOString(),
          url: c.html_url,
        }))
      );

      if (batch.length < 100) break;
    }
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error: `Gagal menghubungi GitHub: ${
          e instanceof Error ? e.message : "kesalahan jaringan"
        }`,
        repo,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ repo, commits: all });
}

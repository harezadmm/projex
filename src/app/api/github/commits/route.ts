import { NextResponse } from "next/server";
import {
  parseRepo,
  githubHeaders,
  explainGithubError,
  mapPool,
} from "@/lib/github";
import type { Commit } from "@/lib/types";

export const revalidate = 300; // cache 5 menit, hemat kuota rate limit GitHub

/**
 * Batas aman supaya repo dengan puluhan branch tidak menghabiskan kuota
 * GitHub API (60 permintaan/jam tanpa token). Branch di luar batas dilewati
 * dan dilaporkan lewat field `warning`.
 */
const MAX_BRANCHES = 25;
/** Berapa branch ditarik bersamaan. */
const CONCURRENCY = 6;
/** Branch default biasanya paling panjang riwayatnya, jadi boleh lebih dalam. */
const PAGES_DEFAULT_BRANCH = 3;
const PAGES_OTHER_BRANCH = 1;

interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name?: string; date?: string } | null;
  };
  author: { login?: string } | null;
}

interface GitHubBranch {
  name: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoParam = searchParams.get("repo");
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? 30), 1), 365);
  // ?fresh=... dikirim tombol "Muat ulang" agar cache 5 menit dilewati
  const fresh = searchParams.has("fresh");
  // ?branch=nama membatasi ke satu branch; kosong = semua branch.
  const branchParam = searchParams.get("branch")?.trim() || null;

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

  // Token opsional: hanya dibaca di server, tidak pernah dikirim ke browser.
  const headers = githubHeaders();

  const gh = (path: string) =>
    fetch(
      `https://api.github.com${path}`,
      fresh ? { headers, cache: "no-store" } : { headers, next: { revalidate } }
    );

  const explain = (res: Response) => explainGithubError(res, repo);

  const warnings: string[] = [];

  try {
    // ---- 1. Metadata repo: dipakai untuk tahu branch default & deteksi 404 dini.
    const metaRes = await gh(`/repos/${repo}`);
    if (!metaRes.ok) {
      return NextResponse.json(
        { error: explain(metaRes), repo },
        { status: metaRes.status }
      );
    }
    const defaultBranch = ((await metaRes.json()) as { default_branch?: string })
      .default_branch ?? "main";

    // ---- 2. Daftar branch. Inilah yang bikin commit di branch baru ikut terbaca:
    // endpoint /commits tanpa ?sha hanya mengembalikan branch default saja.
    let branchNames: string[];

    if (branchParam) {
      branchNames = [branchParam];
    } else {
      const branchesRes = await gh(`/repos/${repo}/branches?per_page=100`);
      if (!branchesRes.ok) {
        return NextResponse.json(
          { error: explain(branchesRes), repo },
          { status: branchesRes.status }
        );
      }

      const list = (await branchesRes.json()) as GitHubBranch[];
      const names = Array.isArray(list) ? list.map((b) => b.name) : [];

      // Branch default didahulukan supaya ia tetap terbaca kalau kena batas.
      branchNames = [
        ...(names.includes(defaultBranch) ? [defaultBranch] : []),
        ...names.filter((n) => n !== defaultBranch),
      ];

      if (branchNames.length === 0) branchNames = [defaultBranch];

      if (branchNames.length > MAX_BRANCHES) {
        warnings.push(
          `Repo punya ${branchNames.length} branch; hanya ${MAX_BRANCHES} yang dipindai ` +
            `demi kuota API. Pilih branch tertentu dari dropdown untuk melihat sisanya.`
        );
        branchNames = branchNames.slice(0, MAX_BRANCHES);
      }
    }

    // ---- 3. Tarik commit tiap branch secara paralel (dibatasi CONCURRENCY).
    const perBranch = await mapPool(branchNames, CONCURRENCY, async (branch) => {
      const maxPages = branch === defaultBranch ? PAGES_DEFAULT_BRANCH : PAGES_OTHER_BRANCH;
      const collected: GitHubCommit[] = [];

      for (let page = 1; page <= maxPages; page++) {
        const res = await gh(
          `/repos/${repo}/commits?sha=${encodeURIComponent(branch)}` +
            `&per_page=100&page=${page}&since=${since.toISOString()}`
        );

        if (!res.ok) {
          // Satu branch gagal tidak boleh menjatuhkan seluruh hasil — repo kosong
          // (409) atau branch terhapus (404) cukup dilewati diam-diam.
          if (page === 1 && res.status !== 404 && res.status !== 409) {
            return { branch, commits: collected, error: explain(res) };
          }
          break;
        }

        const batch = (await res.json()) as GitHubCommit[];
        if (!Array.isArray(batch) || batch.length === 0) break;

        collected.push(...batch);
        if (batch.length < 100) break;
      }

      return { branch, commits: collected, error: null as string | null };
    });

    // Kalau semua branch gagal, ini error sungguhan (mis. kuota habis).
    const failed = perBranch.filter((b) => b.error);
    if (failed.length === perBranch.length && failed.length > 0) {
      return NextResponse.json({ error: failed[0].error, repo }, { status: 502 });
    }
    if (failed.length > 0) {
      warnings.push(
        `${failed.length} branch gagal dibaca (${failed
          .slice(0, 3)
          .map((b) => b.branch)
          .join(", ")}). ${failed[0].error}`
      );
    }

    // ---- 4. Gabung & buang duplikat. Commit yang sudah di-merge muncul di
    // branch fitur sekaligus branch default, jadi dedupe berdasarkan sha.
    const bySha = new Map<string, Commit>();

    for (const { branch, commits } of perBranch) {
      for (const c of commits) {
        const existing = bySha.get(c.sha);

        if (existing) {
          if (!existing.branches.includes(branch)) existing.branches.push(branch);
          continue;
        }

        bySha.set(c.sha, {
          sha: c.sha,
          message: c.commit.message.split("\n")[0],
          author_login: c.author?.login ?? null,
          author_name: c.commit.author?.name ?? "Tidak diketahui",
          date: c.commit.author?.date ?? new Date().toISOString(),
          url: c.html_url,
          branches: [branch],
        });
      }
    }

    const all = [...bySha.values()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      repo,
      default_branch: defaultBranch,
      branches: branchNames,
      commits: all,
      warning: warnings.length > 0 ? warnings.join(" ") : null,
    });
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
}

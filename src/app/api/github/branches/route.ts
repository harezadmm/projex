import { NextResponse } from "next/server";
import {
  parseRepo,
  githubHeaders,
  hasGithubToken,
  explainGithubError,
  mapPool,
} from "@/lib/github";
import type { BranchSummary } from "@/lib/types";

export const revalidate = 120; // cache 2 menit — lebih pendek dari commit
                               // karena halaman ini dipakai untuk mengambil keputusan

const MAX_BRANCHES = 30;
const CONCURRENCY = 5;

interface GitHubBranch {
  name: string;
  protected?: boolean;
  commit: { sha: string };
}

interface GitHubCompare {
  status: "diverged" | "ahead" | "behind" | "identical";
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: Array<{
    sha: string;
    html_url: string;
    commit: { message: string; author: { name?: string; date?: string } | null };
    author: { login?: string } | null;
  }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoParam = searchParams.get("repo");
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

  const headers = githubHeaders();
  const gh = (path: string) =>
    fetch(
      `https://api.github.com${path}`,
      fresh ? { headers, cache: "no-store" } : { headers, next: { revalidate } }
    );

  const warnings: string[] = [];

  try {
    // ---- 1. Metadata repo untuk tahu branch default
    const metaRes = await gh(`/repos/${repo}`);
    if (!metaRes.ok) {
      return NextResponse.json(
        { error: explainGithubError(metaRes, repo), repo },
        { status: metaRes.status }
      );
    }
    const defaultBranch =
      ((await metaRes.json()) as { default_branch?: string }).default_branch ?? "main";

    // ---- 2. Daftar branch
    const listRes = await gh(`/repos/${repo}/branches?per_page=100`);
    if (!listRes.ok) {
      return NextResponse.json(
        { error: explainGithubError(listRes, repo), repo },
        { status: listRes.status }
      );
    }

    const raw = (await listRes.json()) as GitHubBranch[];
    let list = Array.isArray(raw) ? raw : [];

    if (list.length > MAX_BRANCHES) {
      warnings.push(
        `Repo punya ${list.length} branch; hanya ${MAX_BRANCHES} pertama yang dianalisis demi kuota API.`
      );
      list = list.slice(0, MAX_BRANCHES);
    }

    // ---- 3. Bandingkan tiap branch fitur dengan branch default.
    // Endpoint compare sekaligus memberi ahead/behind DAN daftar commit-nya,
    // jadi tidak perlu permintaan terpisah untuk keduanya.
    const feature = list.filter((b) => b.name !== defaultBranch);

    const summaries = await mapPool(feature, CONCURRENCY, async (b): Promise<BranchSummary> => {
      const base: BranchSummary = {
        name: b.name,
        is_default: false,
        protected: Boolean(b.protected),
        head_sha: b.commit.sha,
        ahead_by: 0,
        behind_by: 0,
        commit_count: 0,
        last_commit_message: null,
        last_commit_date: null,
        last_author_login: null,
        last_author_name: null,
        authors: [],
        compare_url: `https://github.com/${repo}/compare/${encodeURIComponent(
          defaultBranch
        )}...${encodeURIComponent(b.name)}`,
        error: null,
      };

      const res = await gh(
        `/repos/${repo}/compare/${encodeURIComponent(defaultBranch)}...${encodeURIComponent(b.name)}`
      );

      if (!res.ok) {
        // Satu branch gagal tidak boleh menjatuhkan seluruh daftar.
        return { ...base, error: explainGithubError(res, repo) };
      }

      const cmp = (await res.json()) as GitHubCompare;
      const commits = Array.isArray(cmp.commits) ? cmp.commits : [];
      const last = commits[commits.length - 1];

      // Siapa saja yang menyentuh branch ini — dipakai untuk menebak
      // penanggung jawab tugas otomatisnya.
      const authors = new Map<string, { login: string | null; name: string; count: number }>();
      for (const c of commits) {
        const login = c.author?.login ?? null;
        const name = c.commit.author?.name ?? "Tidak diketahui";
        const key = (login ?? name).toLowerCase();
        const prev = authors.get(key);
        if (prev) prev.count++;
        else authors.set(key, { login, name, count: 1 });
      }

      return {
        ...base,
        ahead_by: cmp.ahead_by ?? 0,
        behind_by: cmp.behind_by ?? 0,
        commit_count: cmp.total_commits ?? commits.length,
        last_commit_message: last ? last.commit.message.split("\n")[0] : null,
        last_commit_date: last?.commit.author?.date ?? null,
        last_author_login: last?.author?.login ?? null,
        last_author_name: last?.commit.author?.name ?? null,
        authors: [...authors.values()].sort((a, z) => z.count - a.count),
      };
    });

    // Branch dengan pekerjaan terbaru ditaruh di atas: itu yang paling
    // mungkin sedang menunggu keputusan.
    summaries.sort((a, z) => {
      const at = a.last_commit_date ? Date.parse(a.last_commit_date) : 0;
      const zt = z.last_commit_date ? Date.parse(z.last_commit_date) : 0;
      return zt - at;
    });

    const failed = summaries.filter((s) => s.error);
    if (failed.length > 0) {
      warnings.push(`${failed.length} branch gagal dianalisis. ${failed[0].error}`);
    }

    return NextResponse.json({
      repo,
      default_branch: defaultBranch,
      can_merge: hasGithubToken(),
      branches: summaries,
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

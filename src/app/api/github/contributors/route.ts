import { NextResponse } from "next/server";
import {
  parseRepo,
  githubHeaders,
  explainGithubError,
  mapPool,
} from "@/lib/github";
import type { Contributor } from "@/lib/types";

export const revalidate = 600; // Daftar kontributor berubah lambat.

/** Batas aman: nama tampilan diambil satu permintaan per kontributor. */
const MAX_CONTRIBUTORS = 30;
const CONCURRENCY = 6;

interface GitHubContributor {
  login?: string;
  type?: string;
  avatar_url?: string;
  html_url?: string;
  contributions?: number;
}

/**
 * Akun otomatis bukan anggota kelompok. GitHub menandainya lewat `type`,
 * tapi sebagian bot lama hanya bisa dikenali dari akhiran `[bot]`.
 */
function isBot(c: GitHubContributor): boolean {
  return c.type === "Bot" || /\[bot\]$/i.test(c.login ?? "");
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

  try {
    const res = await gh(`/repos/${repo}/contributors?per_page=100`);

    // 204 = repo ada tapi belum punya commit sama sekali.
    if (res.status === 204) {
      return NextResponse.json({ repo, contributors: [], bots: 0, warning: null });
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: explainGithubError(res, repo), repo },
        { status: res.status }
      );
    }

    const raw = (await res.json()) as GitHubContributor[];
    const list = Array.isArray(raw) ? raw : [];

    const humans = list.filter((c) => c.login && !isBot(c));
    const bots = list.length - humans.length;

    const warnings: string[] = [];
    let capped = humans;
    if (humans.length > MAX_CONTRIBUTORS) {
      warnings.push(
        `Repo punya ${humans.length} kontributor; hanya ${MAX_CONTRIBUTORS} teratas yang ditampilkan.`
      );
      capped = humans.slice(0, MAX_CONTRIBUTORS);
    }

    /*
      Endpoint contributors tidak memuat nama tampilan, jadi profil tiap
      kontributor diambil terpisah. Kalau gagal, login dipakai sebagai nama —
      satu profil gagal tidak boleh menjatuhkan seluruh daftar.
    */
    const contributors = await mapPool(
      capped,
      CONCURRENCY,
      async (c): Promise<Contributor> => {
        const login = c.login!;
        let name: string | null = null;

        try {
          const userRes = await gh(`/users/${encodeURIComponent(login)}`);
          if (userRes.ok) {
            name = ((await userRes.json()) as { name?: string | null }).name ?? null;
          }
        } catch {
          /* jaringan bermasalah — jatuh ke login */
        }

        return {
          login,
          name,
          avatar_url: c.avatar_url ?? "",
          commits: c.contributions ?? 0,
          profile_url: c.html_url ?? `https://github.com/${login}`,
        };
      }
    );

    contributors.sort((a, b) => b.commits - a.commits);

    return NextResponse.json({
      repo,
      contributors,
      bots,
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

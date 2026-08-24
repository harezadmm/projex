import { NextResponse } from "next/server";
import { parseRepo, githubHeaders, explainGithubError } from "@/lib/github";
import type { RepoEvent, RepoEventKind } from "@/lib/types";

export const revalidate = 120;

/** GitHub hanya menyimpan ~90 hari event, maksimal 300 baris (3 halaman). */
const MAX_PAGES = 3;

interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  actor?: { login?: string };
  payload?: {
    ref?: string;
    ref_type?: string;
    size?: number;
    head?: string;
    member?: { login?: string };
    commits?: Array<{ message?: string; sha?: string }>;
    action?: string;
    number?: number;
    pull_request?: {
      number?: number;
      title?: string;
      html_url?: string;
      merged?: boolean;
      head?: { ref?: string };
      base?: { ref?: string };
    };
    issue?: { number?: number; title?: string; html_url?: string };
    release?: { tag_name?: string; name?: string; html_url?: string };
  };
}

/** "refs/heads/feat/x" -> "feat/x" */
function shortRef(ref: string | undefined): string | null {
  if (!ref) return null;
  return ref.replace(/^refs\/(heads|tags)\//, "");
}

/**
 * Ubah satu event GitHub jadi baris riwayat yang bisa dibaca manusia.
 * Mengembalikan null untuk event yang tidak menggambarkan pekerjaan
 * (mis. anggota di-invite) supaya timeline tidak penuh derau.
 */
function normalize(e: GitHubEvent, repo: string): RepoEvent | null {
  const actor = e.actor?.login ?? null;
  const p = e.payload ?? {};
  const base = {
    id: e.id,
    actor_login: actor,
    date: e.created_at,
    branch: null as string | null,
    count: null as number | null,
    detail: null as string | null,
  };

  const mk = (
    kind: RepoEventKind,
    title: string,
    extra: Partial<RepoEvent> = {}
  ): RepoEvent => ({ ...base, kind, title, url: null, ...extra });

  switch (e.type) {
    case "PushEvent": {
      const branch = shortRef(p.ref);

      /*
        Payload push tidak selalu memuat jumlah commit. Sebagian repo hanya
        mengirim ref/head/before tanpa `size` maupun array `commits`. Kalau
        dipaksa jadi angka, hasilnya "Push 0 commit" — salah dan menyesatkan.
        Jadi jumlah hanya disebut kalau GitHub benar-benar mengirimnya.
      */
      const n =
        typeof p.size === "number"
          ? p.size
          : Array.isArray(p.commits)
            ? p.commits.length
            : null;

      // Pesan commit terakhir jauh lebih informatif daripada jumlahnya.
      const last =
        p.commits?.[p.commits.length - 1]?.message?.split("\n")[0] ?? null;

      return mk(
        "push",
        n === null
          ? `Push ke ${branch ?? "?"}`
          : `Push ${n} commit ke ${branch ?? "?"}`,
        {
          branch,
          count: n,
          // Tanpa pesan commit, SHA masih memberi sesuatu yang bisa dilacak.
          detail: last ?? (p.head ? `commit ${p.head.slice(0, 7)}` : null),
          url: p.head
            ? `https://github.com/${repo}/commit/${p.head}`
            : branch
              ? `https://github.com/${repo}/commits/${encodeURIComponent(branch)}`
              : null,
        }
      );
    }

    case "MemberEvent": {
      // Anggota baru diberi akses ke repo — bagian sah dari riwayat tim.
      const who = p.member?.login ?? "seseorang";
      if (p.action !== "added") return null;
      return mk("member_add", `${who} ditambahkan sebagai kolaborator`, {
        url: `https://github.com/${repo}/settings/access`,
      });
    }

    case "CreateEvent": {
      const ref = shortRef(p.ref);
      if (p.ref_type === "branch") {
        return mk("branch_create", `Branch ${ref} dibuat`, {
          branch: ref,
          url: ref
            ? `https://github.com/${repo}/tree/${encodeURIComponent(ref)}`
            : null,
        });
      }
      if (p.ref_type === "tag") {
        return mk("tag_create", `Tag ${ref} dibuat`, { branch: ref });
      }
      // ref_type "repository" — pembuatan repo itu sendiri
      return mk("other", "Repo dibuat");
    }

    case "DeleteEvent": {
      const ref = shortRef(p.ref);
      if (p.ref_type !== "branch") return null;
      return mk("branch_delete", `Branch ${ref} dihapus`, { branch: ref });
    }

    case "PullRequestEvent": {
      const pr = p.pull_request;
      const num = pr?.number ?? p.number;
      const head = pr?.head?.ref ?? null;
      const label = `PR #${num}: ${pr?.title ?? "tanpa judul"}`;

      if (p.action === "closed" && pr?.merged) {
        return mk("pr_merge", `${label} di-merge ke ${pr?.base?.ref ?? "main"}`, {
          branch: head,
          url: pr?.html_url ?? null,
        });
      }
      if (p.action === "closed") {
        return mk("pr_close", `${label} ditutup tanpa merge`, {
          branch: head,
          url: pr?.html_url ?? null,
        });
      }
      if (p.action === "opened" || p.action === "reopened") {
        return mk("pr_open", `${label} dibuka`, {
          branch: head,
          url: pr?.html_url ?? null,
        });
      }
      return null; // synchronize, labeled, assigned — bukan pekerjaan baru
    }

    case "PullRequestReviewEvent": {
      const pr = p.pull_request;
      return mk("review", `Review PR #${pr?.number ?? "?"}`, {
        detail: pr?.title ?? null,
        url: pr?.html_url ?? null,
      });
    }

    case "IssuesEvent": {
      if (p.action !== "opened" && p.action !== "closed") return null;
      const i = p.issue;
      return mk(
        "issue",
        `Issue #${i?.number ?? "?"} ${p.action === "opened" ? "dibuka" : "ditutup"}`,
        { detail: i?.title ?? null, url: i?.html_url ?? null }
      );
    }

    case "ReleaseEvent": {
      const r = p.release;
      return mk("release", `Release ${r?.tag_name ?? r?.name ?? ""}`.trim(), {
        url: r?.html_url ?? null,
      });
    }

    case "ForkEvent":
      return mk("fork", "Repo di-fork");

    case "WatchEvent":
      return mk("star", "Repo diberi star");

    default:
      return null;
  }
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

  try {
    const events: RepoEvent[] = [];
    let skipped = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/events?per_page=100&page=${page}`,
        fresh ? { headers, cache: "no-store" } : { headers, next: { revalidate } }
      );

      if (!res.ok) {
        // Halaman pertama gagal = error sungguhan; lanjutan gagal = berhenti.
        if (page === 1) {
          return NextResponse.json(
            { error: explainGithubError(res, repo), repo },
            { status: res.status }
          );
        }
        break;
      }

      const batch = (await res.json()) as GitHubEvent[];
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const e of batch) {
        const n = normalize(e, repo);
        if (n) events.push(n);
        else skipped++;
      }

      if (batch.length < 100) break;
    }

    events.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    return NextResponse.json({
      repo,
      events,
      /*
        Dilaporkan apa adanya: GitHub hanya menyimpan sekitar 90 hari event
        publik, jadi timeline ini memang tidak pernah lengkap sejak awal repo.
        Lebih baik disebut daripada pengguna menyimpulkan sendiri.
      */
      note:
        "GitHub hanya menyediakan riwayat event sekitar 90 hari terakhir, " +
        "maksimal 300 baris.",
      skipped,
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

import { NextResponse } from "next/server";
import { parseRepo, githubHeaders, hasGithubToken } from "@/lib/github";

/**
 * Merge sebuah branch fitur ke branch default lewat GitHub API.
 *
 * PERHATIAN: ini menulis ke repo sungguhan dan tidak bisa dibatalkan dari
 * aplikasi. Pemanggilnya (halaman Project Manager) wajib meminta konfirmasi
 * eksplisit ke pengguna sebelum menembak endpoint ini.
 *
 * Sengaja POST dan tanpa cache — bukan operasi yang boleh diulang diam-diam
 * oleh prefetch atau revalidation.
 */
export const dynamic = "force-dynamic";

interface MergeBody {
  repo?: string;
  branch?: string;
  base?: string;
  message?: string;
}

export async function POST(request: Request) {
  if (!hasGithubToken()) {
    return NextResponse.json(
      {
        error:
          "Merge butuh GITHUB_TOKEN dengan izin tulis. Isi GITHUB_TOKEN di .env.local " +
          "(scope `repo` untuk token klasik, atau `contents: write` untuk fine-grained), " +
          "lalu jalankan ulang server.",
      },
      { status: 400 }
    );
  }

  let body: MergeBody;
  try {
    body = (await request.json()) as MergeBody;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const repo = body.repo ? parseRepo(body.repo) : null;
  const branch = body.branch?.trim();

  if (!repo) {
    return NextResponse.json(
      { error: "Field 'repo' wajib diisi dan harus berformat owner/nama-repo." },
      { status: 400 }
    );
  }
  if (!branch) {
    return NextResponse.json({ error: "Field 'branch' wajib diisi." }, { status: 400 });
  }

  const headers = { ...githubHeaders(), "Content-Type": "application/json" };

  try {
    // Base default diambil dari repo, bukan diasumsikan "main" — sebagian
    // repo masih memakai "master" atau nama lain.
    let base = body.base?.trim();
    if (!base) {
      const metaRes = await fetch(`https://api.github.com/repos/${repo}`, {
        headers,
        cache: "no-store",
      });
      if (!metaRes.ok) {
        return NextResponse.json(
          { error: `Gagal membaca info repo "${repo}" (${metaRes.status}).` },
          { status: metaRes.status }
        );
      }
      base =
        ((await metaRes.json()) as { default_branch?: string }).default_branch ?? "main";
    }

    if (base === branch) {
      return NextResponse.json(
        { error: `Branch "${branch}" adalah branch utama — tidak bisa di-merge ke dirinya sendiri.` },
        { status: 400 }
      );
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/merges`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        base,
        head: branch,
        commit_message:
          body.message?.trim() ||
          `Merge branch '${branch}' ke ${base} (disetujui lewat Projex)`,
      }),
    });

    // 204 = base sudah memuat seluruh commit head. Bukan kegagalan:
    // biasanya branch-nya memang sudah di-merge lewat GitHub sebelumnya.
    if (res.status === 204) {
      return NextResponse.json({
        merged: false,
        already_merged: true,
        base,
        branch,
        repo,
        message: `Branch "${branch}" sudah tergabung di ${base}. Tidak ada yang perlu di-merge.`,
      });
    }

    if (res.status === 201) {
      const done = (await res.json()) as { sha: string; html_url: string };
      return NextResponse.json({
        merged: true,
        already_merged: false,
        base,
        branch,
        repo,
        sha: done.sha,
        url: done.html_url,
        message: `Branch "${branch}" berhasil di-merge ke ${base}.`,
      });
    }

    // ---- Jalur gagal: terjemahkan ke pesan yang bisa ditindaklanjuti ----
    let detail = "";
    try {
      detail = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      /* body kosong atau bukan JSON */
    }

    const errorFor = (): string => {
      switch (res.status) {
        case 409:
          return (
            `Merge gagal karena konflik antara "${branch}" dan ${base}. ` +
            `Konflik harus diselesaikan manual di GitHub atau lokal — aplikasi tidak bisa memutuskan mana yang benar.`
          );
        case 404:
          return (
            `Branch "${branch}" atau repo "${repo}" tidak ditemukan. ` +
            `Bisa juga token tidak punya akses ke repo ini.`
          );
        case 403:
          return (
            "GitHub menolak merge (403). Token perlu izin tulis, atau branch " +
            `${base} diproteksi aturan yang mewajibkan pull request.`
          );
        case 401:
          return "GITHUB_TOKEN ditolak (401). Token salah atau sudah kedaluwarsa.";
        case 422:
          return `GitHub menolak permintaan merge: ${detail || "data tidak valid"}.`;
        default:
          return `GitHub membalas ${res.status} ${res.statusText}. ${detail}`.trim();
      }
    };

    return NextResponse.json(
      { error: errorFor(), repo, branch, base },
      { status: res.status }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error: `Gagal menghubungi GitHub: ${
          e instanceof Error ? e.message : "kesalahan jaringan"
        }`,
      },
      { status: 502 }
    );
  }
}

/**
 * Bagian bersama untuk semua route handler GitHub.
 *
 * Hanya dipakai di sisi server: GITHUB_TOKEN dibaca di sini dan tidak pernah
 * ikut terkirim ke browser.
 */

/**
 * Terima "owner/repo", "github.com/owner/repo", atau URL lengkap
 * (dengan atau tanpa .git di belakang) dan kembalikan "owner/repo".
 */
export function parseRepo(input: string): string | null {
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

export function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Tanpa token, GitHub membatasi 60 permintaan/jam per IP.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export const hasGithubToken = () => Boolean(process.env.GITHUB_TOKEN);

/** Ubah respons gagal jadi pesan berbahasa Indonesia yang bisa ditindaklanjuti. */
export function explainGithubError(res: Response, repo: string): string {
  const remaining = res.headers.get("x-ratelimit-remaining");

  if (res.status === 401) {
    return "GITHUB_TOKEN ditolak GitHub (401). Token mungkin salah ketik atau sudah kedaluwarsa.";
  }
  if (res.status === 404) {
    return (
      `Repo "${repo}" tidak ditemukan atau bersifat privat. ` +
      `Periksa URL repo di halaman Pengaturan. Untuk repo privat, isi GITHUB_TOKEN di .env.local.`
    );
  }
  if (res.status === 403 && remaining === "0") {
    return (
      "Kuota GitHub API habis (60 permintaan/jam tanpa token). " +
      "Tunggu sebentar, atau isi GITHUB_TOKEN di .env.local untuk kuota 5.000/jam."
    );
  }
  if (res.status === 403) {
    return (
      "GitHub menolak permintaan (403). Untuk merge, token harus punya izin tulis " +
      "(scope `repo`, atau `contents: write` untuk fine-grained token)."
    );
  }
  if (res.status === 409) {
    return `Repo "${repo}" masih kosong — belum ada commit sama sekali.`;
  }
  return `GitHub membalas ${res.status} ${res.statusText}.`;
}

/**
 * Jalankan `fn` untuk semua item, maksimal `limit` sekaligus.
 * Dipakai supaya repo dengan banyak branch tidak menembak puluhan
 * permintaan sekaligus ke GitHub.
 */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = cursor++; i < items.length; i = cursor++) {
        out[i] = await fn(items[i]);
      }
    })
  );

  return out;
}

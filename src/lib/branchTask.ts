import type { Priority } from "./types";

/**
 * Awalan konvensi penamaan branch (Conventional Branch / Git Flow).
 * Dipakai untuk dua hal: dibuang dari judul tugas, dan ditebak prioritasnya.
 */
const PREFIX_PRIORITY: Record<string, Priority> = {
  hotfix: "high",
  fix: "high",
  bugfix: "high",
  bug: "high",
  feat: "medium",
  feature: "medium",
  refactor: "medium",
  perf: "medium",
  test: "low",
  tests: "low",
  chore: "low",
  docs: "low",
  doc: "low",
  style: "low",
  ci: "low",
  build: "low",
};

/** Kata yang tidak layak jadi judul tugas kalau berdiri sendiri. */
const GENERIC = new Set([
  "patch", "update", "updates", "new", "test", "tmp", "temp",
  "wip", "dev", "develop", "staging", "coba", "revisi",
]);

/**
 * Ubah nama branch jadi judul tugas yang enak dibaca.
 *
 *   "feat/login-page"        -> "Login Page"
 *   "fix/JIRA-42_null-crash" -> "JIRA-42 Null Crash"
 *   "hariz/tambah-dashboard" -> "Tambah Dashboard"
 *   "feature/api"            -> "Api"
 *
 * Mengembalikan null kalau hasilnya tidak bermakna (misal "hariz-patch-1"),
 * supaya pemanggil bisa jatuh ke pesan commit terakhir sebagai gantinya.
 */
export function branchToTitle(
  branch: string,
  /**
   * Username GitHub dan nama depan anggota. Banyak orang mengawali branch
   * dengan namanya sendiri ("hariz/…", "hariz-patch-1"); tanpa daftar ini
   * mustahil membedakan nama orang dari kata deskriptif.
   */
  knownHandles: ReadonlySet<string> = new Set()
): string | null {
  const trimmed = branch.trim();
  if (!trimmed) return null;

  // Ambil segmen terakhir. Semua pola yang lazim menaruh deskripsi di sana:
  // "feat/login-page", "hariz/tambah-dashboard", "origin/feat/api-user".
  const rest = trimmed.slice(trimmed.lastIndexOf("/") + 1);

  // Pisah pada -, _, ., dan camelCase
  const words = rest
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .split(/[-_.\s]+/)
    .filter(Boolean);

  if (words.length === 0) return null;

  // Nama pemilik branch di depan bukan bagian dari deskripsi pekerjaan
  while (words.length > 1 && knownHandles.has(words[0].toLowerCase())) words.shift();

  // Angka urut setelah kata generik ("patch-1", "update-2") tidak bermakna.
  // Angka setelah kata bermakna DIPERTAHANKAN — "bug-123" merujuk nomor isu.
  if (
    words.length > 1 &&
    /^\d+$/.test(words[words.length - 1]) &&
    GENERIC.has(words[words.length - 2].toLowerCase())
  ) {
    words.pop();
  }

  const meaningful = words.filter(
    (w) =>
      !GENERIC.has(w.toLowerCase()) &&
      !/^\d+$/.test(w) &&
      !knownHandles.has(w.toLowerCase())
  );
  if (meaningful.length === 0) return null;

  const title = words
    .map((w) =>
      // Kode tiket seperti "JIRA-42" atau akronim dibiarkan huruf besar
      /^[A-Z0-9]{2,}$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");

  return title.length > 80 ? `${title.slice(0, 77)}…` : title;
}

/** Tebak prioritas dari awalan branch; default "medium". */
export function branchToPriority(branch: string): Priority {
  const head = branch.split("/")[0]?.toLowerCase() ?? "";
  return PREFIX_PRIORITY[head] ?? "medium";
}

/**
 * Judul akhir untuk tugas otomatis: utamakan nama branch, dan kalau nama
 * branch tidak bermakna, pakai pesan commit terakhir — itu biasanya paling
 * jelas menggambarkan "apa yang dikerjakan".
 */
export function taskTitleForBranch(
  branch: string,
  lastCommitMessage: string | null,
  knownHandles: ReadonlySet<string> = new Set()
): string {
  const fromBranch = branchToTitle(branch, knownHandles);
  if (fromBranch) return fromBranch;

  const msg = lastCommitMessage?.trim();
  if (msg) {
    // Buang awalan conventional commit: "feat(auth): tambah login"
    const stripped = msg.replace(/^\w+(\([^)]*\))?!?:\s*/, "");
    const clean = stripped.charAt(0).toUpperCase() + stripped.slice(1);
    return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
  }

  return `Branch ${branch}`;
}

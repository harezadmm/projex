export type TaskStatus = "todo" | "in_progress" | "done";
export type ProjectStatus = "not_started" | "in_progress" | "completed";
export type Priority = "low" | "medium" | "high";

export type AccentColor =
  | "blue"
  | "orange"
  | "green"
  | "pink"
  | "purple"
  | "red"
  | "yellow";

export interface Member {
  id: string;
  name: string;
  email: string | null;
  role: string;
  github_username: string | null;
  avatar_color: AccentColor;
  is_lead: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: AccentColor;
  repo_url: string | null;
  start_date: string | null;
  deadline: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  /**
   * Terisi kalau tugas ini dibuat otomatis dari branch GitHub. Pasangan
   * repo+branch dipakai sebagai kunci anti-duplikat saat sinkronisasi;
   * tugas yang dibuat manual membiarkan keduanya null.
   */
  source_repo: string | null;
  source_branch: string | null;
}

export type BranchReviewStatus = "pending" | "approved" | "rejected" | "merged";

/** Keputusan tim atas sebuah branch fitur: boleh masuk main atau tidak. */
export interface BranchReview {
  id: string;
  project_id: string | null;
  repo: string;
  branch: string;
  status: BranchReviewStatus;
  reviewer_id: string | null;
  note: string | null;
  decided_at: string | null;
  /** Hanya terisi setelah merge lewat GitHub API benar-benar berhasil. */
  merged_at: string | null;
  merge_sha: string | null;
  created_at: string;
}

/** Ringkasan satu branch fitur dibandingkan terhadap branch default. */
export interface BranchSummary {
  name: string;
  is_default: boolean;
  /** Branch yang diproteksi di GitHub tidak bisa di-merge langsung lewat API. */
  protected: boolean;
  head_sha: string;
  /** Berapa commit branch ini di depan main — 0 berarti tidak ada yang baru. */
  ahead_by: number;
  /** Berapa commit main sudah bergerak sejak branch ini dibuat. */
  behind_by: number;
  commit_count: number;
  last_commit_message: string | null;
  last_commit_date: string | null;
  last_author_login: string | null;
  last_author_name: string | null;
  authors: Array<{ login: string | null; name: string; count: number }>;
  compare_url: string;
  /** Terisi kalau branch ini gagal dianalisis; yang lain tetap tampil. */
  error: string | null;
}

export const BRANCH_REVIEW_LABEL: Record<BranchReviewStatus, string> = {
  pending: "Menunggu Review",
  approved: "Disetujui",
  rejected: "Ditolak",
  merged: "Sudah Di-merge",
};

export interface ProgressLog {
  id: string;
  task_id: string | null;
  member_id: string | null;
  note: string;
  percent: number;
  hours_spent: number;
  created_at: string;
}

/** Satu commit yang ditarik dari GitHub REST API. */
export interface Commit {
  sha: string;
  message: string;
  author_login: string | null;
  author_name: string;
  date: string;
  url: string;
  /**
   * Branch tempat commit ini ditemukan. Bisa lebih dari satu: commit yang sudah
   * di-merge muncul di branch fitur asalnya sekaligus di branch default.
   */
  branches: string[];
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Belum Mulai",
  in_progress: "Dikerjakan",
  done: "Selesai",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  not_started: "Belum Mulai",
  in_progress: "Berjalan",
  completed: "Selesai",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

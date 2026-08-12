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
}

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

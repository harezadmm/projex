"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { buildSeedData } from "./seed";
import type { Member, Project, Task, ProgressLog } from "./types";

const STORAGE_KEY = "projex-data-v1";
const CURRENT_MEMBER_KEY = "projex-current-member";

/**
 * Catatan progres adalah tabel yang paling cepat membengkak. Awalnya hanya
 * sekian baris terbaru yang diambil; halaman Laporan memanggil loadAllLogs()
 * supaya rekapnya tetap utuh.
 */
const LOGS_INITIAL_LIMIT = 300;

interface Dataset {
  members: Member[];
  projects: Project[];
  tasks: Task[];
  logs: ProgressLog[];
}

type NewMember = Omit<Member, "id" | "created_at">;
type NewProject = Omit<Project, "id" | "created_at">;
type NewTask = Omit<Task, "id" | "created_at" | "completed_at">;
type NewLog = Omit<ProgressLog, "id" | "created_at">;

interface StoreValue extends Dataset {
  loading: boolean;
  error: string | null;
  /** "supabase" kalau env var terisi, "demo" kalau jalan dari localStorage. */
  mode: "supabase" | "demo";
  /** True kalau daftar catatan progres masih dipotong oleh limit awal. */
  logsTruncated: boolean;
  loadAllLogs: () => Promise<void>;
  currentMember: Member | null;
  setCurrentMemberId: (id: string) => void;

  addMember: (m: NewMember) => Promise<void>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;

  addProject: (p: NewProject) => Promise<void>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addTask: (t: NewTask) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addLog: (l: NewLog) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const emptyData: Dataset = { members: [], projects: [], tasks: [], logs: [] };

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readLocal(): Dataset | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Dataset) : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
 * Penulisan ke localStorage di-debounce.
 *
 * Menyimpan berarti JSON.stringify seluruh dataset — pada data besar bisa
 * ratusan KB dan itu memblokir main thread. Kalau dilakukan setiap kali ada
 * perubahan, mengetik atau menggeser kartu jadi tersendat. Di sini tulisan
 * ditunda sebentar dan digabung, lalu dipaksa keluar saat halaman ditutup
 * supaya tidak ada data yang hilang.
 * ----------------------------------------------------------------------- */
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWrite: Dataset | null = null;

function flushLocal() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  const data = pendingWrite;
  pendingWrite = null;
  if (!data) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* kuota penuh atau storage diblokir — data tetap ada di memori */
  }
}

function scheduleWriteLocal(data: Dataset) {
  pendingWrite = data;
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flushLocal();
  }, 400);
}

if (typeof window !== "undefined") {
  // pagehide lebih andal daripada beforeunload di Safari dan browser mobile
  window.addEventListener("pagehide", flushLocal);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushLocal();
  });
}

/* --------------------------------------------------------------------------
 * "Sedang masuk sebagai siapa" disimpan di localStorage dan dibaca lewat
 * useSyncExternalStore, bukan lewat useEffect + setState. Cara ini menghindari
 * render berantai saat mount dan tetap aman ketika di-render di server.
 * ----------------------------------------------------------------------- */
let currentMemberCache: string | null = null;
let currentMemberRead = false;
const currentMemberListeners = new Set<() => void>();

function subscribeCurrentMember(onChange: () => void): () => void {
  currentMemberListeners.add(onChange);
  return () => currentMemberListeners.delete(onChange);
}

function getCurrentMemberSnapshot(): string | null {
  if (!currentMemberRead) {
    try {
      currentMemberCache = localStorage.getItem(CURRENT_MEMBER_KEY);
    } catch {
      currentMemberCache = null;
    }
    currentMemberRead = true;
  }
  return currentMemberCache;
}

function getCurrentMemberServerSnapshot(): string | null {
  return null;
}

function writeCurrentMember(id: string) {
  currentMemberCache = id;
  currentMemberRead = true;
  try {
    localStorage.setItem(CURRENT_MEMBER_KEY, id);
  } catch {
    /* storage diblokir — pilihan tetap berlaku sampai halaman ditutup */
  }
  for (const listener of currentMemberListeners) listener();
}

/** Nama tabel di Postgres → nama koleksi di dalam Dataset. */
const TABLE_TO_KEY: Record<string, keyof Dataset> = {
  members: "members",
  projects: "projects",
  tasks: "tasks",
  progress_logs: "logs",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logsTruncated, setLogsTruncated] = useState(false);

  const currentMemberId = useSyncExternalStore(
    subscribeCurrentMember,
    getCurrentMemberSnapshot,
    getCurrentMemberServerSnapshot
  );

  const mode: "supabase" | "demo" = isSupabaseConfigured ? "supabase" : "demo";

  // ---- muat data awal (hanya di client, supaya tidak bentrok hydration) ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isSupabaseConfigured && supabase) {
        const [mRes, pRes, tRes, lRes] = await Promise.all([
          supabase.from("members").select("*").order("created_at"),
          supabase.from("projects").select("*").order("created_at"),
          supabase.from("tasks").select("*").order("created_at"),
          supabase
            .from("progress_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(LOGS_INITIAL_LIMIT),
        ]);

        const firstError = mRes.error || pRes.error || tRes.error || lRes.error;
        if (cancelled) return;

        if (firstError) {
          setError(
            `Gagal memuat data dari Supabase: ${firstError.message}. ` +
              `Pastikan migration sudah dijalankan (npm run db:push).`
          );
          setLoading(false);
          return;
        }

        const logs = (lRes.data ?? []) as ProgressLog[];
        setData({
          members: (mRes.data ?? []) as Member[],
          projects: (pRes.data ?? []) as Project[],
          tasks: (tRes.data ?? []) as Task[],
          logs,
        });
        setLogsTruncated(logs.length === LOGS_INITIAL_LIMIT);
        setLoading(false);
        return;
      }

      // Mode demo: pakai localStorage, isi dengan seed kalau masih kosong.
      const stored = readLocal();
      const next = stored ?? buildSeedData();
      if (!stored) scheduleWriteLocal(next);
      if (cancelled) return;
      setData(next);
      setLoading(false);
    }

    load().catch((e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "Terjadi kesalahan tak terduga.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- sinkronisasi realtime antar anggota ----
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const channel = client
      .channel("projex-perubahan")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload: {
          eventType: string;
          table: string;
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        }) => {
          const key = TABLE_TO_KEY[payload.table];
          if (!key) return;

          setData((prev) => {
            const list = prev[key] as Array<{ id: string }>;

            if (payload.eventType === "DELETE") {
              const id = payload.old?.id as string | undefined;
              if (!id) return prev;
              return { ...prev, [key]: list.filter((r) => r.id !== id) } as Dataset;
            }

            const row = payload.new as unknown as { id: string };
            if (!row?.id) return prev;

            const exists = list.some((r) => r.id === row.id);
            const nextList = exists
              ? list.map((r) => (r.id === row.id ? row : r))
              : key === "logs"
                ? [row, ...list] // catatan terbaru tampil paling atas
                : [...list, row];

            return { ...prev, [key]: nextList } as Dataset;
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  /**
   * Terapkan perubahan ke state + localStorage (mode demo),
   * atau ke state saja (mode supabase, karena server sudah jadi sumber kebenaran).
   */
  const applyLocal = useCallback((mutate: (d: Dataset) => Dataset) => {
    setData((prev) => {
      const next = mutate(prev);
      if (!isSupabaseConfigured) scheduleWriteLocal(next);
      return next;
    });
  }, []);

  /** Helper generik: insert satu baris ke tabel. */
  const insertRow = useCallback(
    async <T extends { id: string }>(
      table: string,
      row: T,
      key: keyof Dataset
    ): Promise<void> => {
      if (isSupabaseConfigured && supabase) {
        // biarkan Postgres yang bikin id & created_at
        const { id: _omitId, ...payload } = row as T & Record<string, unknown>;
        void _omitId;
        const { data: inserted, error: err } = await supabase
          .from(table)
          .insert(payload)
          .select()
          .single();
        if (err) {
          setError(`Gagal menyimpan ke ${table}: ${err.message}`);
          return;
        }
        applyLocal((d) => {
          const list = d[key] as Array<{ id: string }>;
          if (list.some((r) => r.id === inserted.id)) return d; // sudah masuk lewat realtime
          return {
            ...d,
            [key]: key === "logs" ? [inserted, ...list] : [...list, inserted],
          } as Dataset;
        });
        return;
      }
      applyLocal((d) => {
        const list = d[key] as Array<{ id: string }>;
        return { ...d, [key]: key === "logs" ? [row, ...list] : [...list, row] } as Dataset;
      });
    },
    [applyLocal]
  );

  /** Helper generik: update satu baris. */
  const updateRow = useCallback(
    async (
      table: string,
      id: string,
      patch: Record<string, unknown>,
      key: keyof Dataset
    ): Promise<void> => {
      // optimistic update dulu supaya UI terasa instan
      applyLocal(
        (d) =>
          ({
            ...d,
            [key]: (d[key] as Array<{ id: string }>).map((row) =>
              row.id === id ? { ...row, ...patch } : row
            ),
          }) as Dataset
      );

      if (isSupabaseConfigured && supabase) {
        const { data: updated, error: err } = await supabase
          .from(table)
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (err) {
          setError(`Gagal memperbarui ${table}: ${err.message}`);
          return;
        }
        // sinkronkan dengan hasil server (misal completed_at yang diisi trigger)
        applyLocal(
          (d) =>
            ({
              ...d,
              [key]: (d[key] as Array<{ id: string }>).map((row) =>
                row.id === id ? updated : row
              ),
            }) as Dataset
        );
      }
    },
    [applyLocal]
  );

  /** Helper generik: hapus satu baris. */
  const deleteRow = useCallback(
    async (table: string, id: string, key: keyof Dataset): Promise<void> => {
      applyLocal(
        (d) =>
          ({
            ...d,
            [key]: (d[key] as Array<{ id: string }>).filter((row) => row.id !== id),
          }) as Dataset
      );

      if (isSupabaseConfigured && supabase) {
        const { error: err } = await supabase.from(table).delete().eq("id", id);
        if (err) setError(`Gagal menghapus dari ${table}: ${err.message}`);
      }
    },
    [applyLocal]
  );

  /** Ambil seluruh catatan progres — dipakai halaman Laporan agar rekapnya utuh. */
  const loadAllLogs = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !logsTruncated) return;
    const { data: rows, error: err } = await supabase
      .from("progress_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      setError(`Gagal memuat seluruh catatan progres: ${err.message}`);
      return;
    }
    setData((d) => ({ ...d, logs: (rows ?? []) as ProgressLog[] }));
    setLogsTruncated(false);
  }, [logsTruncated]);

  // ---------------- Members ----------------
  const addMember = useCallback(
    (m: NewMember) =>
      insertRow("members", { ...m, id: newId(), created_at: new Date().toISOString() }, "members"),
    [insertRow]
  );
  const updateMember = useCallback(
    (id: string, patch: Partial<Member>) => updateRow("members", id, patch, "members"),
    [updateRow]
  );
  const deleteMember = useCallback(
    async (id: string) => {
      // di mode demo, lepaskan tugas yang ter-assign ke anggota ini
      if (!isSupabaseConfigured) {
        applyLocal((d) => ({
          ...d,
          tasks: d.tasks.map((t) =>
            t.assignee_id === id ? { ...t, assignee_id: null } : t
          ),
          logs: d.logs.filter((l) => l.member_id !== id),
        }));
      }
      await deleteRow("members", id, "members");
    },
    [deleteRow, applyLocal]
  );

  // ---------------- Projects ----------------
  const addProject = useCallback(
    (p: NewProject) =>
      insertRow("projects", { ...p, id: newId(), created_at: new Date().toISOString() }, "projects"),
    [insertRow]
  );
  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => updateRow("projects", id, patch, "projects"),
    [updateRow]
  );
  const deleteProject = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured) {
        applyLocal((d) => {
          const removedTaskIds = new Set(
            d.tasks.filter((t) => t.project_id === id).map((t) => t.id)
          );
          return {
            ...d,
            tasks: d.tasks.filter((t) => t.project_id !== id),
            logs: d.logs.filter((l) => !l.task_id || !removedTaskIds.has(l.task_id)),
          };
        });
      }
      await deleteRow("projects", id, "projects");
    },
    [deleteRow, applyLocal]
  );

  // ---------------- Tasks ----------------
  const addTask = useCallback(
    (t: NewTask) =>
      insertRow(
        "tasks",
        {
          ...t,
          id: newId(),
          created_at: new Date().toISOString(),
          completed_at: t.status === "done" ? new Date().toISOString() : null,
        },
        "tasks"
      ),
    [insertRow]
  );
  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      // di mode demo tidak ada trigger Postgres, jadi isi completed_at manual
      const enriched: Partial<Task> =
        !isSupabaseConfigured && patch.status
          ? {
              ...patch,
              completed_at: patch.status === "done" ? new Date().toISOString() : null,
            }
          : patch;
      return updateRow("tasks", id, enriched, "tasks");
    },
    [updateRow]
  );
  const deleteTask = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured) {
        applyLocal((d) => ({ ...d, logs: d.logs.filter((l) => l.task_id !== id) }));
      }
      await deleteRow("tasks", id, "tasks");
    },
    [deleteRow, applyLocal]
  );

  // ---------------- Progress logs ----------------
  const addLog = useCallback(
    (l: NewLog) =>
      insertRow(
        "progress_logs",
        { ...l, id: newId(), created_at: new Date().toISOString() },
        "logs"
      ),
    [insertRow]
  );
  const deleteLog = useCallback(
    (id: string) => deleteRow("progress_logs", id, "logs"),
    [deleteRow]
  );

  const currentMember = useMemo(
    () =>
      data.members.find((m) => m.id === currentMemberId) ??
      data.members.find((m) => m.is_lead) ??
      data.members[0] ??
      null,
    [data.members, currentMemberId]
  );

  /**
   * Nilai context di-memo. Tanpa ini objeknya baru setiap render provider,
   * sehingga seluruh komponen yang memakai useStore ikut render ulang
   * meskipun datanya sama persis.
   */
  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      loading,
      error,
      mode,
      logsTruncated,
      loadAllLogs,
      currentMember,
      setCurrentMemberId: writeCurrentMember,
      addMember,
      updateMember,
      deleteMember,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      deleteTask,
      addLog,
      deleteLog,
    }),
    [
      data,
      loading,
      error,
      mode,
      logsTruncated,
      loadAllLogs,
      currentMember,
      addMember,
      updateMember,
      deleteMember,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      deleteTask,
      addLog,
      deleteLog,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return ctx;
}

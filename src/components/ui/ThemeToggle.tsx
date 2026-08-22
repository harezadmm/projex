"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

/**
 * Tombol ganti tema. Ikonnya menunjukkan tema yang AKAN dipilih, bukan yang
 * sedang aktif — pola yang sama dipakai kebanyakan aplikasi, jadi lebih
 * mudah ditebak pengguna.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "terang" : "gelap";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Ganti ke mode ${next}`}
      aria-label={`Ganti ke mode ${next}`}
      className={cn(
        "no-print grid size-9 shrink-0 place-items-center rounded-full border border-line",
        "bg-surface text-muted transition hover:bg-surface-3 hover:text-ink",
        className
      )}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

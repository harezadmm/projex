"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  // Tutup dengan tombol Escape, dan kunci scroll body selama modal terbuka
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8">
      {/* lapisan penutup: klik di luar kartu untuk menutup */}
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-strong relative z-10 my-auto w-full max-w-lg rounded-3xl p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-8 place-items-center rounded-full text-faint transition hover:bg-surface-3 hover:text-ink-2"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

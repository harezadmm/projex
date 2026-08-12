"use client";

import type { ReactNode } from "react";
import { RangeProvider } from "@/lib/range";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useStore } from "@/lib/store";

function ErrorBanner() {
  const { error } = useStore();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {error}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RangeProvider>
      {/*
        Tampilan penuh selebar dan setinggi layar: tanpa padding luar dan
        tanpa max-width. `flex` membuat panel anak meregang setinggi
        pembungkus, sehingga di halaman yang isinya sedikit tidak ada area
        kosong di bawah. Kontainer sengaja transparan — kartu liquid glass
        butuh lapisan ambient di body untuk terlihat sebagai kaca.
      */}
      <div className="flex min-h-screen print:block">
        {/* Padding hanya di dalam panel supaya konten tidak menempel tepi layar. */}
        <div className="w-full p-4 sm:p-6 print:bg-white print:p-0">
          <Topbar />
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:gap-6 print:mt-0 print:gap-0">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <ErrorBanner />
              {children}
            </main>
          </div>
        </div>
      </div>
    </RangeProvider>
  );
}

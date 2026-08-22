import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Warna chrome browser (address bar di HP) mengikuti latar aplikasi
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080c15" },
    { media: "(prefers-color-scheme: light)", color: "#eef2f9" },
  ],
};

export const metadata: Metadata = {
  title: "Projex — Project Management Kelompok",
  description:
    "Aplikasi manajemen proyek untuk mengelola anggota, tugas, dan progres kelompok, lengkap dengan bukti kontribusi dari GitHub.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      // Server selalu merender kelas `dark`; skrip di <head> mengoreksinya
      // ke pilihan tersimpan sebelum paint pertama.
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      {/*
        next/script dengan beforeInteractive menaruh skrip ini di <head> pada
        HTML awal, jadi ia jalan sebelum hidrasi dan sebelum paint pertama.
        Memakai <script> biasa di dalam komponen memicu peringatan React,
        karena tag script di badan komponen tidak dieksekusi saat render client.
      */}
      <Script
        id="projex-theme-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      />
      <body className="min-h-full">
        {/* Tema tidak butuh provider: useTheme membaca DOM lewat
            useSyncExternalStore, jadi bisa dipanggil dari mana saja. */}
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}

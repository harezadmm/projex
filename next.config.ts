import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * React Compiler melakukan memoisasi otomatis pada komponen dan hook,
   * sehingga bagian yang datanya tidak berubah tidak ikut di-render ulang.
   * Ini menghilangkan sebagian besar sumber lag tanpa perlu menaburkan
   * useMemo/useCallback/React.memo secara manual di seluruh kode.
   */
  reactCompiler: true,
};

export default nextConfig;

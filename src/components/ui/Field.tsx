import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// bg-surface/75 (bukan solid) supaya menyatu dengan permukaan kaca di belakangnya;
// saat fokus dipekatkan ke putih penuh agar teks yang diketik paling terbaca.
const base =
  "w-full rounded-xl border border-white/70 bg-surface/75 px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-faint outline-none transition focus:border-line-2 focus:bg-surface focus:ring-2 focus:ring-ink/15";

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(base, "resize-y", className)} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(base, "cursor-pointer appearance-none", className)}>
      {children}
    </select>
  );
}

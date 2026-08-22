import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-inverse text-on-inverse shadow-md shadow-black/25 hover:bg-inverse-hover",
  outline: "border border-line bg-surface/60 text-ink-2 hover:bg-surface/90",
  ghost: "text-ink-2 hover:bg-surface/70 hover:text-ink",
  danger: "bg-[var(--tone-red-soft)] text-[var(--tone-red-text)] hover:bg-[var(--tone-red-pastel)]",
};

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

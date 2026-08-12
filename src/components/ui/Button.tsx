import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-slate-900 text-white shadow-md shadow-slate-900/20 hover:bg-slate-800",
  outline: "border border-white/70 bg-white/60 text-slate-700 hover:bg-white/90",
  ghost: "text-slate-600 hover:bg-white/70 hover:text-slate-900",
  danger: "bg-red-50/90 text-red-600 hover:bg-red-100",
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

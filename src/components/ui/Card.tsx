import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={cn("card print-plain p-5", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      {action}
    </header>
  );
}

/** Tombol ikon bulat abu-abu yang muncul di pojok kartu (lihat referensi). */
export function CardIconButton({
  children,
  onClick,
  label,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  href?: string;
}) {
  const className =
    "no-print grid size-9 shrink-0 place-items-center rounded-full bg-slate-900/5 text-slate-600 transition hover:bg-slate-900/10 hover:text-slate-900";

  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      {children}
    </button>
  );
}

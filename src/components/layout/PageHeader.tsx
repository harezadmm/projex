import type { ReactNode } from "react";
import { GlobalSearch } from "./GlobalSearch";

export function PageHeader({
  eyebrow,
  title,
  action,
  showSearch = true,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  showSearch?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm text-muted">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
      </div>
      <div className="flex w-full items-center gap-3 lg:w-auto lg:justify-end">
        {showSearch && <GlobalSearch />}
        {action}
      </div>
    </div>
  );
}

import { ACCENT, initials } from "@/lib/ui";
import { cn } from "@/lib/cn";
import type { AccentColor } from "@/lib/types";

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
} as const;

export function Avatar({
  name,
  color = "blue",
  size = "md",
  className,
}: {
  name: string;
  color?: AccentColor;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        SIZES[size],
        className
      )}
      style={{ backgroundColor: ACCENT[color].avatar }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

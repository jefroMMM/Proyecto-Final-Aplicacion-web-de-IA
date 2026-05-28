import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  default: "border-primary/30 bg-primary/10 text-primary",
  secondary: "border-white/10 bg-white/[0.06] text-muted-foreground",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  danger: "border-red-400/30 bg-red-400/10 text-red-300",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

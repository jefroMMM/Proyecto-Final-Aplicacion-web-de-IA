import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  default: "border-primary/30 bg-primary/10 text-primary",
  secondary: "border-border bg-muted text-muted-foreground",
  success: "border-emerald-600/25 bg-emerald-50 text-emerald-700",
  warning: "border-amber-600/25 bg-amber-50 text-amber-700",
  danger: "border-red-600/25 bg-red-50 text-red-700",
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

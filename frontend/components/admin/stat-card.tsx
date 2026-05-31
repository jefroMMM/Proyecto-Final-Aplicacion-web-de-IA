import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  const tones = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    accent: "bg-indigo-50 text-indigo-700",
  };

  return (
    <div className="admin-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        {Icon ? (
          <span className={cn("grid h-9 w-9 place-items-center rounded-md", tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

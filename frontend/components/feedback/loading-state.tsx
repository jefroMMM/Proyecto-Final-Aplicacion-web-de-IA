import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

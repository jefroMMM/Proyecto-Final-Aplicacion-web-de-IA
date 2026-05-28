import { cn } from "@/lib/utils";

export function WaveformVisualizer({
  active,
  bars = 28,
  className,
}: {
  active: boolean;
  bars?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex h-16 items-center justify-center gap-1 rounded-lg bg-white/[0.04] px-4", className)}>
      {Array.from({ length: bars }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-full bg-primary/70",
            active ? "animate-pulse" : "opacity-35",
          )}
          style={{
            height: `${18 + ((index * 17) % 34)}px`,
            animationDelay: `${index * 45}ms`,
          }}
        />
      ))}
    </div>
  );
}

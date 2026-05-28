import { Progress } from "@/components/ui/progress";

export function ScoreCard({
  label,
  score,
  description,
}: {
  label: string;
  score: number;
  description: string;
}) {
  return (
    <div className="glass-panel rounded-lg p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold">{score}</p>
        </div>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      <Progress value={score} className="mt-4" />
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

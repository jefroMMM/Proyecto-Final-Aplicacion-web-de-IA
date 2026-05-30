import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function InterviewProgress({
  statusLabel,
  progress,
  showScore,
  onToggleScore,
  score,
}: {
  statusLabel: string;
  progress: number;
  showScore: boolean;
  onToggleScore: () => void;
  score?: {
    initial_cv_score: number;
    question_score: number;
    bonus_score: number;
    final_score: number;
    max_score: number;
    percentage: number;
  } | null;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Progreso</CardTitle>
        <button type="button" className="text-xs text-slate-300" onClick={onToggleScore}>
          {showScore ? "Ocultar puntaje" : "Mostrar puntaje"}
        </button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Estado: {statusLabel}</p>
        <Progress value={progress} />
        <p>Avance: {progress}%</p>
        {showScore && score ? (
          <div className="space-y-1">
            <p>CV: {score.initial_cv_score}</p>
            <p>Preguntas: {score.question_score}</p>
            <p>Bonus: {score.bonus_score}</p>
            <p>Total: {score.final_score} / {score.max_score}</p>
            <p>Porcentaje: {score.percentage}%</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

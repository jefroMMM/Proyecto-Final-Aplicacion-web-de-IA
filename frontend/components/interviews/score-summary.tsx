import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewScore } from "@/types/api";

export function ScoreSummary({ score }: { score: InterviewScore }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Puntaje actual</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p>CV: <span className="font-medium">{score.initial_cv_score}</span></p>
        <p>Preguntas: <span className="font-medium">{score.question_score}</span></p>
        <p>Bonus: <span className="font-medium">{score.bonus_score}</span></p>
        <p>Final: <span className="font-medium">{score.final_score} / {score.max_score}</span></p>
        <p>Porcentaje: <span className="font-medium">{score.percentage}%</span></p>
      </CardContent>
    </Card>
  );
}

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CandidateReport } from "@/types/api";

const recommendationLabel: Record<CandidateReport["recommendation"], string> = {
  highly_recommended: "Highly Recommended",
  recommended: "Recommended",
  needs_review: "Needs Review",
  not_recommended: "Not Recommended",
};

export function ReportPanel({ report }: { report: CandidateReport }) {
  const scoreData = [
    { name: "CV", value: report.initial_cv_score },
    { name: "Preguntas", value: report.question_score },
    { name: "Bonus", value: report.bonus_score },
    { name: "Final", value: report.final_score },
  ];

  return (
    <div className="grid gap-6">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>{report.candidate_name}</CardTitle>
          <p className="text-sm text-muted-foreground">{report.role_name} · {report.template_title}</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Metric label="Score Final" value={`${report.final_score} / ${report.max_score}`} />
          <Metric label="Porcentaje" value={`${report.percentage}%`} />
          <Metric label="Recomendación" value={recommendationLabel[report.recommendation]} />
          <Metric label="Score CV" value={String(report.initial_cv_score)} />
          <Metric label="Score Preguntas" value={String(report.question_score)} />
          <Metric label="Bonus" value={String(report.bonus_score)} />
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Distribución de puntaje</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreData} margin={{ top: 12, right: 8, left: 0, bottom: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Skills detectadas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.detected_cv_skills.length > 0 ? report.detected_cv_skills.map((skill) => <Badge key={skill}>{skill}</Badge>) : <p className="text-sm text-muted-foreground">Sin skills detectadas.</p>}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader><CardTitle>Skills faltantes</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.missing_cv_skills.length > 0 ? report.missing_cv_skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>) : <p className="text-sm text-muted-foreground">Sin skills faltantes.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Fortalezas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {report.strengths.length > 0 ? report.strengths.map((item) => <p key={item} className="rounded-md bg-muted/25 p-2 text-sm">{item}</p>) : <p className="text-sm text-muted-foreground">Sin fortalezas detectadas.</p>}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>Debilidades</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {report.weaknesses.length > 0 ? report.weaknesses.map((item) => <p key={item} className="rounded-md bg-muted/25 p-2 text-sm">{item}</p>) : <p className="text-sm text-muted-foreground">Sin debilidades detectadas.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader><CardTitle>Preguntas y evaluaciones</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {report.answer_evaluations.length === 0 ? <p className="text-sm text-muted-foreground">No hay respuestas registradas.</p> : null}
          {report.answer_evaluations.map((item, index) => (
            <article key={item.id} className="rounded-md border border-border bg-muted/15 p-3">
              <p className="text-sm font-medium">Respuesta {index + 1} · {item.evaluation_status}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.transcript_text}</p>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
                <p>Base: {item.base_question_score}</p>
                <p>Bonus: {item.bonus_score}</p>
                <p>Final: {item.final_question_score}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.feedback}</p>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader><CardTitle>Resumen final</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{report.final_summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/10 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RecommendationBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CandidateReport } from "@/types/api";

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
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl">{report.candidate_name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{report.role_name} - {report.template_title}</p>
            </div>
            <RecommendationBadge recommendation={report.recommendation} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Score final" value={`${report.final_score} / ${report.max_score}`} progress={report.percentage} />
          <Metric label="Porcentaje" value={`${report.percentage}%`} progress={report.percentage} />
          <Metric label="Preguntas" value={report.questions_answered} detail="Respondidas" />
          <Metric label="Bonus" value={report.bonus_score} detail="Puntos extra" />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="glass-panel">
          <CardHeader className="border-b border-border"><CardTitle>Distribucion de puntaje</CardTitle></CardHeader>
          <CardContent className="h-80 pt-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} margin={{ top: 12, right: 8, left: 0, bottom: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="border-b border-border"><CardTitle>Lectura del perfil</CardTitle></CardHeader>
          <CardContent className="grid gap-5 pt-5 md:grid-cols-2">
            <SkillGroup title="Skills detectadas" items={report.detected_cv_skills} />
            <SkillGroup title="Skills faltantes" items={report.missing_cv_skills} muted />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InsightList title="Fortalezas" items={report.strengths} empty="Sin fortalezas detectadas." />
        <InsightList title="Areas de mejora" items={report.weaknesses} empty="Sin debilidades detectadas." />
      </div>

      <Card className="glass-panel">
        <CardHeader className="border-b border-border"><CardTitle>Preguntas y evaluaciones</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-5">
          {report.answer_evaluations.length === 0 ? <p className="text-sm text-muted-foreground">No hay respuestas registradas.</p> : null}
          {report.answer_evaluations.map((item, index) => (
            <article key={item.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold">Respuesta {index + 1}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.transcript_text}</p>
                </div>
                <Badge variant={item.evaluation_status === "correct" ? "success" : item.evaluation_status === "incorrect" ? "danger" : "warning"}>
                  {item.evaluation_status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <p>Base: {item.base_question_score}</p>
                <p>Bonus: {item.bonus_score}</p>
                <p>Final: {item.final_question_score}</p>
              </div>
              {item.feedback ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.feedback}</p> : null}
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader className="border-b border-border"><CardTitle>Resumen final</CardTitle></CardHeader>
        <CardContent className="pt-5">
          <p className="text-sm leading-6 text-muted-foreground">{report.final_summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  progress,
}: {
  label: string;
  value: string | number;
  detail?: string;
  progress?: number;
}) {
  return (
    <div className="admin-muted-panel p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-3" /> : null}
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function SkillGroup({ title, items, muted = false }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? items.map((skill) => <Badge key={skill} variant={muted ? "secondary" : "default"}>{skill}</Badge>) : <p className="text-sm text-muted-foreground">Sin datos.</p>}
      </div>
    </div>
  );
}

function InsightList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="border-b border-border"><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 pt-5">
        {items.length > 0 ? (
          items.map((item) => <p key={item} className="rounded-md border border-border bg-muted/25 p-3 text-sm leading-6">{item}</p>)
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

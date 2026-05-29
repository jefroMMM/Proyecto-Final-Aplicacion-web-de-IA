"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { RadarChart } from "@/components/reports/radar-chart";
import { ScoreCard } from "@/components/reports/score-card";
import { SkillBadge } from "@/components/reports/skill-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReport } from "@/lib/services/reports";
import type { ReportRead } from "@/types/api";

const seniorityLabel = {
  junior: "Junior",
  mid: "Intermedio",
  senior: "Senior",
} as const;

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id;
  const [report, setReport] = useState<ReportRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReport(interviewId)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Reporte no encontrado"))
      .finally(() => setLoading(false));
  }, [interviewId]);

  const structured = report?.report_json;
  const depthScore = useMemo(() => {
    if (!structured?.answer_evaluations.length) return report?.technical_score ?? 0;
    return Math.round(
      structured.answer_evaluations.reduce((sum, item) => sum + item.technical_score, 0) /
        structured.answer_evaluations.length,
    );
  }, [report?.technical_score, structured?.answer_evaluations]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Cargando reporte" />
      </AppLayout>
    );
  }

  if (error || !report || !structured) {
    return (
      <AppLayout>
        <EmptyState title="Reporte no disponible" description={error ?? "Finaliza la entrevista para generar el reporte estructurado."} actionHref={`/interviews/${interviewId}`} actionLabel="Abrir entrevista" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-3 px-0">
            <Link href={`/interviews/${interviewId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la entrevista
            </Link>
          </Button>
          <p className="text-sm text-primary">Reporte final</p>
          <h1 className="mt-1 text-3xl font-semibold">{structured.candidate_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{structured.final_summary}</p>
        </div>
        <Badge variant="success">{seniorityLabel[structured.seniority_estimation]}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ScoreCard label="Técnico" score={structured.technical_score} description="Exactitud, profundidad, decisiones técnicas y ajuste al puesto." />
        <ScoreCard label="Comunicación" score={structured.communication_score} description="Claridad, estructura y calidad de la explicación oral." />
        <ScoreCard label="Profundidad" score={depthScore} description="Promedio de solidez técnica en las respuestas evaluadas." />
        <ScoreCard label="Recomendación" score={recommendationScore(structured.recommendation)} description={structured.recommendation} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Radar de puntajes</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart
              technicalScore={structured.technical_score}
              communicationScore={structured.communication_score}
              depthScore={depthScore}
              consistencyScore={Math.round((structured.technical_score + structured.communication_score) / 2)}
            />
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Tecnologías detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {structured.detected_skills.map((skill) => <SkillBadge key={skill} skill={skill} />)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FeedbackList title="Fortalezas" icon="success" items={structured.strengths} />
        <FeedbackList title="Áreas de mejora" icon="danger" items={structured.weaknesses} />
      </div>

      <Card className="glass-panel mt-6">
        <CardHeader>
          <CardTitle>Preguntas y respuestas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {structured.answer_evaluations.map((item, index) => (
            <article key={`${item.question}-${index}`} className="rounded-lg border border-border bg-muted/25 p-4">
              <p className="text-sm font-medium">{item.question}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>Técnico {item.technical_score}</Badge>
                <Badge variant="secondary">Comunicación {item.communication_score}</Badge>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function FeedbackList({ title, icon, items }: { title: string; icon: "success" | "danger"; items: string[] }) {
  const Icon = icon === "success" ? CheckCircle2 : XCircle;
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg bg-muted/25 p-3">
            <Icon className={icon === "success" ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-red-600"} />
            <p className="text-sm leading-5 text-muted-foreground">{item}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function recommendationScore(recommendation: string): number {
  const lower = recommendation.toLowerCase();
  if (lower.includes("strong")) return 90;
  if (lower.includes("hire")) return 78;
  if (lower.includes("borderline")) return 55;
  return 40;
}

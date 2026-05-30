"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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

  const structured = report?.report_json as Record<string, unknown> | undefined;
  const isTemplateReport = Boolean(structured && "template_title" in structured && "initial_cv_score" in structured);
  const detectedSkills = useMemo(() => {
    if (!structured) return [] as string[];
    if (isTemplateReport) return (structured.detected_cv_skills as string[]) ?? [];
    return (structured.detected_skills as string[]) ?? [];
  }, [isTemplateReport, structured]);
  const strengths = ((structured?.strengths as string[]) ?? []);
  const weaknesses = ((structured?.weaknesses as string[]) ?? []);
  const technicalScore = isTemplateReport
    ? Number(report?.percentage ?? 0)
    : Number((structured?.technical_score as number | undefined) ?? report?.technical_score ?? 0);
  const communicationScore = Number((structured?.communication_score as number | undefined) ?? report?.communication_score ?? 0);
  const recommendation = String(structured?.recommendation ?? report?.recommendation ?? "needs_review");
  const summary = String(structured?.final_summary ?? "Reporte generado.");

  const depthScore = useMemo(() => {
    const evaluations = (structured?.answer_evaluations as unknown[]) ?? [];
    if (evaluations.length === 0) return technicalScore;
    if (isTemplateReport) {
      const total = evaluations.reduce<number>(
        (sum, item) => sum + Number((item as Record<string, unknown>).final_question_score ?? 0),
        0,
      );
      return Math.round(total / evaluations.length);
    }
    const total = evaluations.reduce<number>(
      (sum, item) => sum + Number((item as Record<string, unknown>).technical_score ?? 0),
      0,
    );
    return Math.round(total / evaluations.length);
  }, [isTemplateReport, structured?.answer_evaluations, technicalScore]);

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
        <EmptyState
          title="Reporte no disponible"
          description={error ?? "Finaliza la entrevista para generar el reporte."}
          actionHref={`/interviews/${interviewId}`}
          actionLabel="Abrir entrevista"
        />
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
              Volver
            </Link>
          </Button>
          <p className="text-sm text-primary">Reporte final</p>
          <h1 className="mt-1 text-3xl font-semibold">{String(structured.candidate_name ?? "Candidato")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
        </div>
        <Badge variant="success">{recommendation}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ScoreCard label="Tecnico" score={technicalScore} description="Desempeno tecnico total." />
        <ScoreCard label="Comunicacion" score={communicationScore} description="Calidad de explicacion de respuestas." />
        <ScoreCard label="Profundidad" score={depthScore} description="Nivel de detalle en respuestas." />
        <ScoreCard label="Porcentaje" score={Number(report.percentage ?? 0)} description={`${report.final_score}/${report.max_score}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart
              technicalScore={technicalScore}
              communicationScore={communicationScore}
              depthScore={depthScore}
              consistencyScore={Math.round((technicalScore + communicationScore) / 2)}
            />
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Skills detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {detectedSkills.map((skill) => <SkillBadge key={skill} skill={skill} />)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Fortalezas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {strengths.map((item) => <p key={item} className="rounded-md bg-muted/25 p-2 text-sm">{item}</p>)}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>Areas de mejora</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {weaknesses.map((item) => <p key={item} className="rounded-md bg-muted/25 p-2 text-sm">{item}</p>)}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

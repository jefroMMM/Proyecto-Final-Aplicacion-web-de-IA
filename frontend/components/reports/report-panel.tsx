"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RecommendationBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { updateInterviewAnswerScore } from "@/lib/services/interviews";
import type { CandidateReport } from "@/types/api";

interface ReportPanelProps {
  report: CandidateReport;
  interviewId?: string;
  onScoreUpdated?: () => Promise<void> | void;
}

export function ReportPanel({ report, interviewId, onScoreUpdated }: ReportPanelProps) {
  const baseQuestionScore = report.base_question_score ?? scoreBySource(report, "template");
  const extraQuestionScore = report.extra_question_score ?? scoreBySource(report, "agent");
  const scoreData = [
    { name: "CV", value: report.initial_cv_score },
    { name: "Base", value: baseQuestionScore },
    { name: "Bonus", value: report.bonus_score },
    { name: "Extras", value: extraQuestionScore },
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
          <Metric label="Bonus" value={report.bonus_score} detail="Bolsa maxima 1.5" />
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
        <CardContent className="pt-5">
          {report.answer_evaluations.length === 0 ? <p className="text-sm text-muted-foreground">No hay respuestas registradas.</p> : null}
          {report.answer_evaluations.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-[1120px] w-full border-collapse text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="w-72 px-4 py-3 text-left font-semibold">Pregunta realizada</th>
                    <th className="min-w-56 px-4 py-3 text-left font-semibold">Respuesta</th>
                    <th className="w-40 px-4 py-3 text-left font-semibold">Estado</th>
                    <th className="w-24 px-4 py-3 text-left font-semibold">Base</th>
                    <th className="w-24 px-4 py-3 text-left font-semibold">Bonus</th>
                    <th className="w-28 px-4 py-3 text-left font-semibold">Nota IA</th>
                    <th className="w-32 px-4 py-3 text-left font-semibold">Nota final</th>
                    <th className="w-64 px-4 py-3 text-left font-semibold">Editar nota</th>
                  </tr>
                </thead>
                <tbody>
                  {report.answer_evaluations.map((item, index) => (
                    <AnswerEvaluationRow
                      key={item.id}
                      item={item}
                      index={index}
                      interviewId={interviewId}
                      onScoreUpdated={onScoreUpdated}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader className="border-b border-border"><CardTitle>Resumen final</CardTitle></CardHeader>
        <CardContent className="space-y-5 pt-5">
          <ScoreSummary report={report} />
          <p className="text-sm leading-6 text-muted-foreground">{report.final_summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreSummary({ report }: { report: CandidateReport }) {
  const cvMatches = report.cv_requirement_matches ?? [];
  const baseQuestionScore = report.base_question_score ?? scoreBySource(report, "template");
  const extraQuestionScore = report.extra_question_score ?? scoreBySource(report, "agent");

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="CV" value={report.initial_cv_score} detail="Requisitos cumplidos" />
        <Metric label="Preguntas base" value={baseQuestionScore} detail="Plantilla" />
        <Metric label="Bonus" value={report.bonus_score} detail="Respuestas correctas" />
        <Metric label="Preguntas extra" value={extraQuestionScore} detail="Agente" />
        <Metric label="Total" value={`${report.final_score} / ${report.max_score}`} detail={`${report.percentage}%`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Puntos del CV</p>
          </div>
          <div className="divide-y divide-border">
            {cvMatches.length > 0 ? cvMatches.map((item) => (
              <div key={item.requirement_id} className="grid gap-2 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.skill_name}</p>
                  <Badge variant={item.matched ? "success" : "secondary"}>
                    {item.matched ? `Cumple +${item.score_awarded}` : "No cumple"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{item.evidence_text || "Sin evidencia encontrada en el CV."}</p>
              </div>
            )) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin desglose de requisitos del CV.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Puntos de respuestas</p>
          </div>
          <div className="divide-y divide-border">
            {report.answer_evaluations.map((item, index) => {
              const aiScore = item.ai_question_score ?? item.final_question_score;
              const finalWasEdited = typeof item.manual_question_score === "number";
              return (
                <div key={item.id} className="grid gap-2 px-4 py-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-medium">
                      Pregunta {index + 1}: {item.question_text || "Sin texto registrado"}
                      {item.question_source === "agent" ? <span className="ml-2 text-xs text-primary">Pregunta Extra</span> : null}
                    </p>
                    <Badge variant={item.evaluation_status === "correct" ? "success" : item.evaluation_status === "incorrect" ? "danger" : "warning"}>
                      {item.final_question_score} pts
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Base {item.base_question_score}, bonus {item.bonus_score}, nota IA {aiScore}, nota final {item.final_question_score}
                    {finalWasEdited ? " editada por admin" : ""}.
                  </p>
                  <p className="text-muted-foreground">
                    {item.bonus_score > 0
                      ? "Bonus aplicado porque la respuesta base fue correcta segun el criterio de evaluacion."
                      : "Sin bonus aplicado."}
                  </p>
                  <p className="text-muted-foreground">{item.reason || item.feedback || "Sin razon registrada."}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerEvaluationRow({
  item,
  index,
  interviewId,
  onScoreUpdated,
}: {
  item: CandidateReport["answer_evaluations"][number];
  index: number;
  interviewId?: string;
  onScoreUpdated?: () => Promise<void> | void;
}) {
  const { showToast } = useToast();
  const [score, setScore] = useState(String(item.final_question_score));
  const [saving, setSaving] = useState(false);
  const aiScore = item.ai_question_score ?? item.final_question_score;
  const questionMax = (item.question_points ?? 0) + item.bonus_score;
  const scoreWasEdited = typeof item.manual_question_score === "number";

  async function handleSave() {
    if (!interviewId) return;
    const numericScore = Number(score.replace(",", "."));
    if (!Number.isFinite(numericScore) || numericScore < 0) {
      showToast({ kind: "error", title: "Nota invalida", description: "Ingresa una nota numerica mayor o igual a 0." });
      return;
    }
    try {
      setSaving(true);
      await updateInterviewAnswerScore(interviewId, item.id, numericScore);
      await onScoreUpdated?.();
      showToast({ kind: "success", title: "Nota actualizada" });
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo actualizar la nota",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr className="border-b border-border bg-card align-top">
        <td className="px-4 py-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Pregunta {index + 1}</p>
          {item.question_source === "agent" ? <Badge className="mb-2 mt-1" variant="default">Pregunta Extra</Badge> : null}
          <p className="mt-1 leading-6 text-foreground">{item.question_text || "Pregunta no registrada"}</p>
        </td>
        <td className="px-4 py-4 leading-6 text-muted-foreground">{item.transcript_text}</td>
        <td className="px-4 py-4">
          <Badge variant={item.evaluation_status === "correct" ? "success" : item.evaluation_status === "incorrect" ? "danger" : "warning"}>
            {item.evaluation_status}
          </Badge>
        </td>
        <td className="px-4 py-4 text-muted-foreground">{item.base_question_score}</td>
        <td className="px-4 py-4 text-muted-foreground">{item.bonus_score}</td>
        <td className="px-4 py-4 text-muted-foreground">{aiScore}</td>
        <td className="px-4 py-4 text-muted-foreground">
          {item.final_question_score}
          {scoreWasEdited ? <span className="ml-1 text-xs text-primary">editada</span> : null}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              aria-label={`Nota final respuesta ${index + 1}`}
              type="number"
              min={0}
              max={questionMax || undefined}
              step="0.1"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              disabled={!interviewId || saving}
              className="h-9"
            />
            <Button type="button" onClick={handleSave} disabled={!interviewId || saving} size="icon" title="Guardar nota">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
      {item.feedback ? (
        <tr className="border-b border-border bg-muted/20">
          <td className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Feedback</td>
          <td colSpan={7} className="px-4 py-3 text-sm leading-6 text-muted-foreground">{item.feedback}</td>
        </tr>
      ) : null}
    </>
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

function scoreBySource(report: CandidateReport, source: "agent" | "template") {
  return report.answer_evaluations.reduce((total, item) => {
    const isAgent = item.question_source === "agent";
    if ((source === "agent" && !isAgent) || (source === "template" && isAgent)) {
      return total;
    }
    return total + Math.max(0, item.final_question_score - item.bonus_score);
  }, 0);
}

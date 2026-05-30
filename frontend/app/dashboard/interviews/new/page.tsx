"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Copy, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { AppLayout } from "@/components/layout/app-layout";
import { ScoreSummary } from "@/components/interviews/score-summary";
import { UploadCard } from "@/components/interviews/upload-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeInterviewCv,
  createInterviewFromTemplate,
  getInterviewScore,
  uploadInterviewCv,
} from "@/lib/services/interviews";
import { listTemplates } from "@/lib/services/templates";
import type { AnalyzeCVResponse, InterviewScore, InterviewTemplate } from "@/types/api";

type UploadStatus = "idle" | "uploading" | "indexed" | "error";

export default function DashboardNewInterviewPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvStatus, setCvStatus] = useState<UploadStatus>("idle");
  const [createdInterviewId, setCreatedInterviewId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeCVResponse | null>(null);
  const [score, setScore] = useState<InterviewScore | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listTemplates()
      .then((items) => {
        setTemplates(items);
        if (items.length > 0) setSelectedTemplateId(items[0].id);
      })
      .catch((error) =>
        showToast({ kind: "error", title: "No se pudieron cargar plantillas", description: error instanceof Error ? error.message : "Error inesperado" }),
      );
  }, [showToast]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );
  const interviewUrl = createdInterviewId ? `${window.location.origin}/candidate/interview/${createdInterviewId}` : "";

  async function handleCreateInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplateId || !cvFile) return;
    setSubmitting(true);
    try {
      const interview = await createInterviewFromTemplate({
        template_id: selectedTemplateId,
        candidate_name: candidateName,
        candidate_email: candidateEmail || null,
      });
      setCreatedInterviewId(interview.id);
      setCvStatus("uploading");
      await uploadInterviewCv(interview.id, cvFile);
      setCvStatus("indexed");
      const analysisResponse = await analyzeInterviewCv(interview.id);
      setAnalysis(analysisResponse);
      setScore(await getInterviewScore(interview.id));
      showToast({ kind: "success", title: "Entrevista creada y CV analizado" });
    } catch (error) {
      setCvStatus("error");
      showToast({ kind: "error", title: "No se pudo crear la entrevista", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-primary">Entrevistas</p>
        <h1 className="mt-1 text-3xl font-semibold">Nueva entrevista</h1>
      </div>

      <form onSubmit={handleCreateInterview} className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plantilla</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nombre candidato</Label>
              <Input required value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email candidato</Label>
              <Input type="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} />
            </div>
            <Button type="submit" disabled={submitting || !cvFile || !selectedTemplateId || !candidateName}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear entrevista
            </Button>
            {createdInterviewId ? (
              <div className="rounded-md border border-border bg-muted/15 p-3 text-sm">
                <p>Enlace entrevistado:</p>
                <p className="mt-1 break-all font-medium">{interviewUrl}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(interviewUrl);
                    showToast({ kind: "success", title: "Link copiado" });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar enlace
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <UploadCard
            title="CV del candidato"
            description="PDF usado para análisis de skills y score inicial."
            accept="application/pdf,.pdf"
            file={cvFile}
            progress={cvStatus === "uploading" ? 60 : cvStatus === "indexed" ? 100 : 0}
            status={cvStatus}
            onFileChange={(file) => { setCvFile(file); setCvStatus("idle"); }}
          />
          {selectedTemplate ? (
            <Card className="glass-panel">
              <CardHeader><CardTitle>{selectedTemplate.role_name}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{selectedTemplate.description}</p>
                <p className="font-medium">Requisitos ({selectedTemplate.requirements.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.requirements.map((item) => <span key={item.id} className="rounded-md border border-border px-2 py-1 text-xs">{item.skill_name}</span>)}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState title="No hay plantillas" description="Crea una plantilla primero." actionHref="/dashboard/templates/new" actionLabel="Crear plantilla" />
          )}
        </div>
      </form>

      {analysis ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader><CardTitle>Skills detectadas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {analysis.matches.filter((item) => item.matched).map((item) => (
                <article key={item.id} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm">
                  <p className="font-medium">{item.skill_name}</p>
                  <p className="text-xs text-muted-foreground">{item.evidence_text}</p>
                </article>
              ))}
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader><CardTitle>Skills faltantes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {analysis.matches.filter((item) => !item.matched).map((item) => (
                <article key={item.id} className="rounded-md border border-border bg-muted/15 p-2 text-sm">
                  <p className="font-medium">{item.skill_name}</p>
                </article>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
      {score ? <div className="mt-6 max-w-md"><ScoreSummary score={score} /></div> : null}
    </AppLayout>
  );
}

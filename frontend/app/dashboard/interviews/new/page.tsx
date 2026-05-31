"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, FileText, Loader2, MailWarning, Send, UploadCloud } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeInterviewCv,
  createInterviewFromTemplate,
  sendCandidateInvite,
  uploadInterviewCv,
} from "@/lib/services/interviews";
import { listTemplates } from "@/lib/services/templates";
import type { InterviewTemplate } from "@/types/api";

export default function DashboardNewInterviewPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [createdInterviewId, setCreatedInterviewId] = useState<string | null>(null);
  const [candidateToken, setCandidateToken] = useState<string | null>(null);
  const [candidateLink, setCandidateLink] = useState("");
  const [candidateEmailSent, setCandidateEmailSent] = useState<boolean | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState("");
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

  const canSubmit = Boolean(selectedTemplateId && candidateName.trim() && candidateEmail.trim() && cvFile);

  async function handleCreateInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setCandidateEmailSent(null);
    setWorkflowStatus("Creando entrevista...");
    try {
      const interview = await createInterviewFromTemplate({
        template_id: selectedTemplateId,
        candidate_name: candidateName,
        candidate_email: candidateEmail || null,
        send_invite: false,
      });
      setCreatedInterviewId(interview.id);
      setWorkflowStatus("Guardando CV...");
      await uploadInterviewCv(interview.id, cvFile as File);
      setWorkflowStatus("Analizando CV...");
      await analyzeInterviewCv(interview.id);
      setWorkflowStatus("Generando enlace...");
      const invitedInterview = await sendCandidateInvite(interview.id);
      setCandidateToken(invitedInterview.candidate_access_token ?? null);
      setCandidateLink(invitedInterview.candidate_interview_url ?? "");
      setCandidateEmailSent(invitedInterview.candidate_email_sent ?? false);
      showToast({
        kind: "success",
        title: "Entrevista creada",
        description: invitedInterview.candidate_email_sent
          ? "El enlace fue enviado al correo del candidato."
          : "La entrevista quedo lista; copia el enlace si el correo no fue enviado.",
      });
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo crear la entrevista", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setWorkflowStatus("");
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Entrevistas"
        title="Nueva entrevista"
        description="Crea el flujo completo: selecciona plantilla, carga CV, analiza compatibilidad y envia el acceso al candidato."
      />

      <form onSubmit={handleCreateInterview} className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.55fr)]">
        <Card className="glass-panel">
          <CardHeader className="border-b border-border">
            <CardTitle>Datos del flujo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5">
            <div className="grid gap-2">
              <Label htmlFor="template">Plantilla</Label>
              <select
                id="template"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                {templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="candidate_name">Nombre del candidato</Label>
                <Input id="candidate_name" required value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="candidate_email">Correo del candidato</Label>
                <Input id="candidate_email" required type="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cv">CV en PDF</Label>
              <label className="grid cursor-pointer place-items-center rounded-lg border border-dashed border-input bg-muted/25 px-4 py-8 text-center transition hover:bg-muted/45">
                <UploadCloud className="h-8 w-8 text-primary" />
                <span className="mt-3 text-sm font-medium">{cvFile ? cvFile.name : "Seleccionar archivo PDF"}</span>
                <span className="mt-1 text-xs text-muted-foreground">Se extrae texto del PDF antes de generar el token.</span>
                <Input
                  id="cv"
                  required
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {submitting ? workflowStatus || "Creando flujo..." : "Crear y enviar acceso"}
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard/interviews">Cancelar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <aside className="grid content-start gap-4">
          {selectedTemplate ? (
            <Card className="glass-panel">
              <CardHeader className="border-b border-border">
                <CardTitle>{selectedTemplate.role_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedTemplate.title}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 text-sm">
                <p className="leading-6 text-muted-foreground">{selectedTemplate.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Requisitos" value={selectedTemplate.requirements.length} />
                  <Metric label="Preguntas" value={selectedTemplate.questions.length} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.requirements.slice(0, 6).map((item) => (
                    <Badge key={item.id} variant="secondary">{item.skill_name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState title="No hay plantillas" description="Crea una plantilla primero." actionHref="/dashboard/templates/new" actionLabel="Crear plantilla" />
          )}

          <Card className="glass-panel">
            <CardHeader className="border-b border-border">
              <CardTitle>Secuencia automatica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {["Crear entrevista", "Subir y analizar CV", "Generar token", "Enviar correo SMTP"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {createdInterviewId ? (
            <Card className="glass-panel">
              <CardHeader className="border-b border-border">
                <div className="flex items-start gap-3">
                  {candidateEmailSent ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <CardTitle>{candidateEmailSent ? "Correo enviado" : "Enlace listo"}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {candidateEmailSent ? `Se envio a ${candidateEmail}.` : "Copia el enlace para compartirlo manualmente."}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5 text-sm">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Enlace candidato</p>
                  <p className="mt-2 break-all font-medium">{candidateLink}</p>
                  {candidateToken ? <p className="mt-2 break-all text-xs text-muted-foreground">Token: {candidateToken}</p> : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(candidateLink);
                    showToast({ kind: "success", title: "Link copiado" });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar enlace
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </form>
    </AppLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-muted-panel p-3">
      <FileText className="mb-2 h-4 w-4 text-primary" />
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, MailWarning } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { AppLayout } from "@/components/layout/app-layout";
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
  async function handleCreateInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplateId || !candidateName || !candidateEmail || !cvFile) return;
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
      setWorkflowStatus("Escaneando PDF y guardando CV...");
      await uploadInterviewCv(interview.id, cvFile);
      setWorkflowStatus("Analizando CV con IA contra la plantilla...");
      await analyzeInterviewCv(interview.id);
      setWorkflowStatus("Generando token y enviando enlace...");
      const invitedInterview = await sendCandidateInvite(interview.id);
      setCandidateToken(invitedInterview.candidate_access_token ?? null);
      setCandidateLink(invitedInterview.candidate_interview_url ?? "");
      setCandidateEmailSent(invitedInterview.candidate_email_sent ?? false);
      showToast({
        kind: "success",
        title: "Flujo automático creado",
        description: invitedInterview.candidate_email_sent
          ? "El enlace fue enviado al correo del candidato."
          : "El CV fue analizado y la entrevista quedó lista; copia el enlace si el correo no fue enviado.",
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
              <Input required type="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CV en PDF</Label>
              <Input
                required
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Se extrae texto del PDF; si es escaneado, se usa OCR con IA antes de enviar el enlace.
              </p>
            </div>
            <Button type="submit" disabled={submitting || !selectedTemplateId || !candidateName || !candidateEmail || !cvFile}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? workflowStatus || "Creando flujo..." : "Crear flujo automático"}
            </Button>
            {createdInterviewId ? (
              <div className="rounded-md border border-border bg-muted/15 p-3 text-sm">
                <div className="mb-3 flex items-start gap-2">
                  {candidateEmailSent ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {candidateEmailSent ? "Correo enviado al candidato" : "Enlace listo para enviar manualmente"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {candidateEmailSent
                        ? `Se envió a ${candidateEmail}.`
                        : "Revisa configuración SMTP o copia el enlace."}
                    </p>
                  </div>
                </div>
                <p>Enlace entrevistado:</p>
                <p className="mt-1 break-all font-medium">{candidateLink}</p>
                {candidateToken ? (
                  <p className="mt-1 break-all text-xs text-muted-foreground">Token: {candidateToken}</p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(candidateLink);
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
          <Card className="glass-panel">
            <CardHeader><CardTitle>Flujo del candidato</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Al crear la entrevista se genera un token seguro y se envía un correo SMTP al candidato con el enlace de acceso a la ruta de voz.
              </p>
              <div className="rounded-md border border-border bg-background/60 p-3 text-foreground">
                <p className="font-medium">PDF, token y entrevista sincronizados</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El CV se escanea, se compara con los requisitos de la plantilla y luego se genera el token para la entrevista por voz.
                </p>
              </div>
            </CardContent>
          </Card>
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
    </AppLayout>
  );
}

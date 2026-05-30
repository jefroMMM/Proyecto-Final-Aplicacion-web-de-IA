"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { AppLayout } from "@/components/layout/app-layout";
import { UploadCard } from "@/components/interviews/upload-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeInterviewCv,
  createInterviewFromTemplate,
  uploadInterviewCv,
} from "@/lib/services/interviews";
import { listTemplates } from "@/lib/services/templates";
import type { InterviewTemplate } from "@/types/api";

type UploadStatus = "idle" | "uploading" | "indexed" | "error";

export default function NewInterviewPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvStatus, setCvStatus] = useState<UploadStatus>("idle");
  const [cvProgress, setCvProgress] = useState(0);
  const [createdInterviewId, setCreatedInterviewId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listTemplates()
      .then((items) => {
        setTemplates(items);
        if (items.length > 0) {
          setSelectedTemplateId(items[0].id);
        }
      })
      .catch((error) => {
        showToast({
          kind: "error",
          title: "No se pudieron cargar plantillas",
          description: error instanceof Error ? error.message : "Error inesperado",
        });
      });
  }, [showToast]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplateId || !cvFile) {
      showToast({
        kind: "error",
        title: "Datos incompletos",
        description: "Selecciona una plantilla y carga el CV del candidato.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const interview = await createInterviewFromTemplate({
        template_id: selectedTemplateId,
        candidate_name: candidateName,
        candidate_email: candidateEmail || null,
      });
      setCreatedInterviewId(interview.id);

      setCvStatus("uploading");
      setCvProgress(45);
      await uploadInterviewCv(interview.id, cvFile);
      setCvProgress(100);
      setCvStatus("indexed");

      await analyzeInterviewCv(interview.id);
      showToast({
        kind: "success",
        title: "Entrevista lista",
        description: "CV analizado y puntaje inicial calculado.",
      });
    } catch (error) {
      setCvStatus((current) => (current === "uploading" ? "error" : current));
      showToast({
        kind: "error",
        title: "No se pudo preparar la entrevista",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-primary">Preparacion</p>
        <h1 className="mt-1 text-3xl font-semibold">Nueva entrevista desde plantilla</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Selecciona una plantilla, registra al candidato y analiza su CV para asignar puntaje inicial automatico.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Datos base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidateName">Nombre del candidato</Label>
              <Input id="candidateName" required value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidateEmail">Correo del candidato (opcional)</Label>
              <Input id="candidateEmail" type="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Plantilla</Label>
              <select
                id="template"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !candidateName || !selectedTemplateId || !cvFile}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear entrevista y analizar CV
            </Button>

            {createdInterviewId ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.push(`/candidate/interview/${createdInterviewId}`)}
              >
                Abrir vista de candidato
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <UploadCard
            title="CV del candidato"
            description="Se evalua texto transcrito del CV para detectar requisitos y sumar 0.5 por cada skill encontrada."
            accept="application/pdf,.pdf"
            file={cvFile}
            progress={cvProgress}
            status={cvStatus}
            onFileChange={(file) => {
              setCvFile(file);
              setCvStatus("idle");
              setCvProgress(0);
            }}
          />

          {selectedTemplate ? (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>{selectedTemplate.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                <p className="text-xs uppercase text-muted-foreground">Puesto</p>
                <p className="text-sm">{selectedTemplate.role_name}</p>
                <p className="text-xs uppercase text-muted-foreground">Requisitos</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.requirements.map((item) => (
                    <span key={item.id} className="rounded-md border border-border bg-muted/20 px-2 py-1 text-xs">
                      {item.skill_name}
                    </span>
                  ))}
                </div>
                <p className="text-xs uppercase text-muted-foreground">Preguntas</p>
                <Textarea
                  readOnly
                  value={selectedTemplate.questions.map((item) => `${item.order_index + 1}. ${item.question_text}`).join("\n")}
                  className="min-h-40"
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No hay plantillas"
              description="Crea una plantilla desde el panel de plantillas para habilitar este flujo."
              actionHref="/dashboard/templates"
              actionLabel="Crear plantilla"
            />
          )}
        </div>
      </form>
    </AppLayout>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { AppLayout } from "@/components/layout/app-layout";
import { UploadCard } from "@/components/interviews/upload-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createInterview } from "@/lib/services/interviews";
import { uploadCv, uploadJobDescription } from "@/lib/services/uploads";

type UploadStatus = "idle" | "uploading" | "indexed" | "error";

export default function NewInterviewPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [cvStatus, setCvStatus] = useState<UploadStatus>("idle");
  const [jobStatus, setJobStatus] = useState<UploadStatus>("idle");
  const [cvProgress, setCvProgress] = useState(0);
  const [jobProgress, setJobProgress] = useState(0);
  const [createdInterviewId, setCreatedInterviewId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cvFile || !jobFile) {
      showToast({ kind: "error", title: "Faltan archivos", description: "Carga el CV y la descripción del puesto." });
      return;
    }

    setSubmitting(true);
    try {
      const interview = await createInterview({
        user: { name: ownerName, email: ownerEmail },
        candidate_name: candidateName,
        job_title: jobTitle,
      });
      setCreatedInterviewId(interview.id);

      setCvStatus("uploading");
      setCvProgress(45);
      await uploadCv(interview.id, cvFile);
      setCvProgress(100);
      setCvStatus("indexed");

      setJobStatus("uploading");
      setJobProgress(45);
      await uploadJobDescription(interview.id, jobFile);
      setJobProgress(100);
      setJobStatus("indexed");

      showToast({ kind: "success", title: "Entrevista lista", description: "Los documentos se cargaron e indexaron correctamente." });
    } catch (error) {
      setCvStatus((current) => (current === "uploading" ? "error" : current));
      setJobStatus((current) => (current === "uploading" ? "error" : current));
      showToast({
        kind: "error",
        title: "No se pudo crear la entrevista",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-primary">Preparación</p>
        <h1 className="mt-1 text-3xl font-semibold">Nueva entrevista</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Crea la entrevista, carga el contexto del candidato y deja que el backend indexe todo antes de iniciar el modo por voz.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Datos de la entrevista</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidate">Nombre del candidato</Label>
              <Input id="candidate" required value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job">Puesto</Label>
              <Input id="job" required value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nombre del entrevistador</Label>
                <Input id="ownerName" required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Correo del entrevistador</Label>
                <Input id="ownerEmail" required type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} />
              </div>
            </div>
            <Button
              type="submit"
              disabled={
                submitting ||
                !candidateName ||
                !jobTitle ||
                !ownerName ||
                !ownerEmail ||
                !cvFile ||
                !jobFile
              }
              className="w-full"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear e indexar
            </Button>
            {createdInterviewId ? (
              <Button type="button" variant="secondary" className="w-full" onClick={() => router.push(`/interviews/${createdInterviewId}`)}>
                Iniciar entrevista
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <UploadCard
            title="CV del candidato"
            description="Archivo PDF. El backend lo procesa, lo divide en fragmentos y lo usa como contexto."
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
          <UploadCard
            title="Descripción del puesto"
            description="Archivo PDF o TXT. La IA lo usa para adaptar la dificultad y los temas."
            accept="application/pdf,text/plain,.pdf,.txt"
            file={jobFile}
            progress={jobProgress}
            status={jobStatus}
            onFileChange={(file) => {
              setJobFile(file);
              setJobStatus("idle");
              setJobProgress(0);
            }}
          />
          {!createdInterviewId ? (
            <EmptyState title="Indexación pendiente" description="Al enviar el formulario, el sistema confirmará que extrajo el texto y preparó el contexto." />
          ) : null}
        </div>
      </form>
    </AppLayout>
  );
}

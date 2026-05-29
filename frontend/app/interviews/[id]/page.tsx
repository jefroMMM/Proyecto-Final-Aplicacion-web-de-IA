"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileText, Loader2, PlayCircle, Square } from "lucide-react";

import { VoiceRecorder } from "@/components/audio/voice-recorder";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { TranscriptTimeline } from "@/components/interviews/transcript-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { sendVoiceAnswer, startVoiceInterview } from "@/lib/services/audio";
import { getInterview } from "@/lib/services/interviews";
import { finalizeInterview } from "@/lib/services/reports";
import { getTranscripts } from "@/lib/services/transcripts";
import { useInterviewStore } from "@/store/interview-store";
import type { InterviewDetail } from "@/types/api";

const statusLabel = {
  created: "Creada",
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
} as const;

export default function VoiceInterviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const interviewId = params.id;
  const { showToast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [interviewerResponse, setInterviewerResponse] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const { timeline, setTimeline, isProcessingTurn, setProcessingTurn } = useInterviewStore();

  useEffect(() => {
    Promise.all([getInterview(interviewId), getTranscripts(interviewId)])
      .then(([detail, transcripts]) => {
        setInterview(detail);
        setTimeline(transcripts);
      })
      .catch((error) =>
        showToast({ kind: "error", title: "No se pudo cargar la entrevista", description: error instanceof Error ? error.message : "Error inesperado" }),
      )
      .finally(() => setLoading(false));
  }, [interviewId, setTimeline, showToast]);

  async function refreshTimeline() {
    const transcripts = await getTranscripts(interviewId);
    setTimeline(transcripts);
  }

  async function handleStart() {
    setStarting(true);
    try {
      const response = await startVoiceInterview(interviewId);
      setCurrentQuestion(response.interviewer_response);
      setInterviewerResponse(response.interviewer_response);
      setAudioUrl(response.audio_url);
      await playAudio(response.audio_url);
      await refreshTimeline();
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo iniciar la entrevista", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setStarting(false);
    }
  }

  async function handleRecordingReady(blob: Blob) {
    setProcessingTurn(true);
    try {
      const response = await sendVoiceAnswer(interviewId, blob);
      setCandidateTranscript(response.candidate_transcript);
      setInterviewerResponse(response.interviewer_response);
      setCurrentQuestion(response.interviewer_response);
      setAudioUrl(response.audio_url);
      await playAudio(response.audio_url);
      await refreshTimeline();
      if (response.interview_status === "finalized") {
        showToast({ kind: "success", title: "Entrevista finalizada", description: "El reporte final está listo." });
      }
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo procesar la respuesta", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setProcessingTurn(false);
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      await finalizeInterview(interviewId);
      showToast({ kind: "success", title: "Reporte generado" });
      router.push(`/reports/${interviewId}`);
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo finalizar", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setFinalizing(false);
    }
  }

  async function playAudio(url: string) {
    if (!audioRef.current) return;
    audioRef.current.src = url;
    await audioRef.current.play().catch(() => undefined);
  }

  if (loading) {
    return (
      <AppLayout>
        <LoadingState label="Cargando entrevista" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <audio ref={audioRef} className="hidden" />
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-primary">Entrevista por voz</p>
          <h1 className="mt-1 text-3xl font-semibold">{interview?.candidate_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{interview?.job_title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={interview?.status === "completed" ? "success" : "default"}>
            {interview?.status ? statusLabel[interview.status] : ""}
          </Badge>
          <Button asChild variant="secondary">
            <Link href={`/reports/${interviewId}`}>
              <FileText className="mr-2 h-4 w-4" />
              Reporte
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <section className="space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Panel de entrevista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/35 p-5">
                <p className="text-xs uppercase text-muted-foreground">Pregunta actual</p>
                <p className="mt-3 text-lg leading-8">{currentQuestion ?? "Inicia la entrevista para generar la primera pregunta."}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleStart} disabled={starting || isProcessingTurn}>
                  {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                  Iniciar entrevista
                </Button>
                <Button variant="secondary" onClick={handleFinalize} disabled={finalizing || isProcessingTurn}>
                  {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                  Finalizar
                </Button>
              </div>

              <VoiceRecorder disabled={isProcessingTurn || !currentQuestion} onRecordingReady={handleRecordingReady} />

              {isProcessingTurn ? <LoadingState label="Transcribiendo, evaluando y generando respuesta por voz" /> : null}

              {candidateTranscript ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Transcripción del candidato</p>
                  <p className="mt-2 text-sm leading-6">{candidateTranscript}</p>
                </div>
              ) : null}

              {interviewerResponse ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Respuesta del entrevistador</p>
                  <p className="mt-2 text-sm leading-6">{interviewerResponse}</p>
                  {audioUrl ? <audio className="mt-3 w-full" src={audioUrl} controls /> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <aside>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Línea de conversación</CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptTimeline items={timeline} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppLayout>
  );
}

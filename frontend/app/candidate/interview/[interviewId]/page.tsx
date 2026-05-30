"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mic, PlayCircle } from "lucide-react";
import { useParams } from "next/navigation";

import { VoiceRecorder } from "@/components/audio/voice-recorder";
import { TranscriptTimeline } from "@/components/interviews/transcript-timeline";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  answerTemplateInterviewAudio,
  getInterview,
  getInterviewScore,
  startTemplateInterview,
} from "@/lib/services/interviews";
import { getTranscripts } from "@/lib/services/transcripts";
import type { InterviewDetail, InterviewScore, Transcript } from "@/types/api";

export default function CandidateInterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const interviewId = params.interviewId;
  const { showToast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [timeline, setTimeline] = useState<Transcript[]>([]);
  const [score, setScore] = useState<InterviewScore | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [candidateTranscript, setCandidateTranscript] = useState<string>("");
  const [statusLabel, setStatusLabel] = useState<"pending" | "in_progress" | "finalized">("pending");
  const [progress, setProgress] = useState(0);
  const [welcomeMode, setWelcomeMode] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showPartialScore, setShowPartialScore] = useState(true);

  useEffect(() => {
    Promise.all([getInterview(interviewId), getTranscripts(interviewId), getInterviewScore(interviewId)])
      .then(([detail, transcripts, scoreData]) => {
        setInterview(detail);
        setTimeline(transcripts);
        setScore(scoreData);
      })
      .catch((error) => {
        showToast({
          kind: "error",
          title: "No se pudo cargar la entrevista",
          description: error instanceof Error ? error.message : "Error inesperado",
        });
      });
  }, [interviewId, showToast]);

  const displayStatus = useMemo(() => {
    if (statusLabel === "finalized") return "Finalizada";
    if (statusLabel === "in_progress") return "En progreso";
    return "Pendiente";
  }, [statusLabel]);

  async function refreshState() {
    const [transcripts, scoreData] = await Promise.all([
      getTranscripts(interviewId),
      getInterviewScore(interviewId),
    ]);
    setTimeline(transcripts);
    setScore(scoreData);
  }

  async function playTtsFromText(text: string) {
    if (!audioRef.current) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function handleStart() {
    setStarting(true);
    try {
      const response = await startTemplateInterview(interviewId);
      setCurrentQuestion(response.current_question);
      setProgress(response.progress_percentage);
      setStatusLabel(response.status);
      setWelcomeMode(false);
      await playTtsFromText(response.current_question);
      await refreshState();
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo iniciar la entrevista",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setStarting(false);
    }
  }

  async function handleAudioAnswer(blob: Blob) {
    setProcessing(true);
    try {
      const response = await answerTemplateInterviewAudio(interviewId, blob);
      setCandidateTranscript(response.candidate_transcript);
      setCurrentQuestion(response.next_question ?? "");
      setProgress(response.progress_percentage);
      setStatusLabel(response.status);
      if (response.next_question) {
        await playTtsFromText(response.next_question);
      }
      await refreshState();
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo evaluar la respuesta",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      <audio ref={audioRef} className="hidden" />
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">AI Technical Interview</p>
          <h1 className="mt-2 text-3xl font-semibold">{interview?.job_title ?? "Cargando..."}</h1>
          <p className="mt-2 text-sm text-slate-300">Candidato: {interview?.candidate_name ?? "-"}</p>
          <p className="mt-1 text-sm text-slate-300">Estado: {displayStatus}</p>
          <div className="mt-4">
            <Progress value={progress} />
          </div>
        </div>

        {welcomeMode ? (
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Bienvenido a tu entrevista tecnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Lee cada pregunta, responde por voz y espera a que el sistema analice tu respuesta.</p>
              <p>La evaluacion principal se realiza sobre la transcripcion en texto de tus respuestas.</p>
              <Button onClick={handleStart} disabled={starting}>
                {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Iniciar entrevista
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-4">
              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <CardTitle>Pregunta actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-8">{currentQuestion || "Entrevista finalizada."}</p>
                  {processing ? (
                    <div className="mt-4 flex items-center gap-2 text-sm text-cyan-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando respuesta...
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
                      <Mic className="h-4 w-4" />
                      Escuchando cuando presiones grabar...
                    </div>
                  )}
                </CardContent>
              </Card>

              {statusLabel !== "finalized" ? (
                <VoiceRecorder disabled={processing || !currentQuestion} onRecordingReady={handleAudioAnswer} />
              ) : (
                <Card className="border-emerald-400/30 bg-emerald-500/10 text-white">
                  <CardContent className="flex items-center gap-2 p-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <p>Gracias por completar la entrevista. Ya puedes cerrar esta ventana.</p>
                  </CardContent>
                </Card>
              )}

              {candidateTranscript ? (
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardHeader>
                    <CardTitle>Tu transcripcion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-200">{candidateTranscript}</p>
                  </CardContent>
                </Card>
              ) : null}
            </section>

            <aside className="space-y-4">
              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Progreso</CardTitle>
                  <button type="button" className="text-xs text-slate-300" onClick={() => setShowPartialScore((prev) => !prev)}>
                    {showPartialScore ? "Ocultar puntaje" : "Mostrar puntaje"}
                  </button>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Estado: {displayStatus}</p>
                  <p>Avance: {progress}%</p>
                  {showPartialScore && score ? (
                    <>
                      <p>CV: {score.initial_cv_score}</p>
                      <p>Preguntas: {score.question_score}</p>
                      <p>Bonus: {score.bonus_score}</p>
                      <p>Total: {score.final_score} / {score.max_score}</p>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <CardTitle>Historial</CardTitle>
                </CardHeader>
                <CardContent>
                  <TranscriptTimeline items={timeline} />
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

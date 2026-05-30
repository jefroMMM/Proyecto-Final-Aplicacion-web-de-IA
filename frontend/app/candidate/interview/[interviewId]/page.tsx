"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

import { CurrentQuestionCard } from "@/components/candidate/current-question-card";
import { InterviewFinished } from "@/components/candidate/interview-finished";
import { InterviewProgress } from "@/components/candidate/interview-progress";
import { InterviewTimeline } from "@/components/candidate/interview-timeline";
import { InterviewWelcome } from "@/components/candidate/interview-welcome";
import { MicPermissionAlert } from "@/components/candidate/mic-permission-alert";
import { RecordingButton } from "@/components/candidate/recording-button";
import { TranscriptPreview } from "@/components/candidate/transcript-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  answerTemplateInterviewAudio,
  getInterview,
  getInterviewScore,
  startTemplateInterview,
} from "@/lib/services/interviews";
import type { InterviewDetail, InterviewScore } from "@/types/api";

type CandidateTimelineItem = {
  role: "interviewer" | "candidate";
  content: string;
  created_at?: string;
};

export default function CandidateInterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const interviewId = params.interviewId;
  const { showToast } = useToast();

  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [score, setScore] = useState<InterviewScore | null>(null);
  const [timeline, setTimeline] = useState<CandidateTimelineItem[]>([]);

  const [welcomeMode, setWelcomeMode] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState("");
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [interviewStatus, setInterviewStatus] = useState<"pending" | "in_progress" | "finalized">("pending");
  const [progress, setProgress] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    Promise.all([getInterview(interviewId), getInterviewScore(interviewId)])
      .then(([detail, scoreData]) => {
        setInterview(detail);
        setScore(scoreData);
        setInterviewStatus(detail.status === "completed" ? "finalized" : "pending");
      })
      .catch((error) => {
        showToast({
          kind: "error",
          title: "No se pudo cargar la entrevista",
          description: error instanceof Error ? error.message : "Error inesperado",
        });
      });
  }, [interviewId, showToast]);

  const statusLabel = useMemo(() => {
    if (interviewStatus === "finalized") return "Finalizada";
    if (interviewStatus === "in_progress") return "En progreso";
    return "Pendiente";
  }, [interviewStatus]);

  async function refreshScore() {
    try {
      setScore(await getInterviewScore(interviewId));
    } catch {
      // keep previous score silently
    }
  }

  async function handleStartInterview() {
    setStarting(true);
    try {
      const response = await startTemplateInterview(interviewId);
      setCurrentQuestion(response.current_question);
      setProgress(response.progress_percentage);
      setInterviewStatus(response.status === "finalized" ? "finalized" : "in_progress");
      setWelcomeMode(false);
      setTimeline((prev) => [...prev, { role: "interviewer", content: response.current_question }]);
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

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = preferredMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await handleAudioUpload(blob);
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      setMicError("El navegador bloqueó el micrófono. Habilita permisos y vuelve a intentar.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  async function handleAudioUpload(blob: Blob) {
    setTranscribing(true);
    try {
      const response = await answerTemplateInterviewAudio(interviewId, blob);
      setTranscribing(false);
      setAnalyzing(true);

      const transcript = response.candidate_transcript;
      const nextQuestionText = response.next_question?.question_text ?? "";
      const status = response.interview_status === "finalized" ? "finalized" : "in_progress";

      setCandidateTranscript(transcript);
      setInterviewStatus(status);
      setTimeline((prev) => [
        ...prev,
        { role: "candidate", content: transcript },
        ...(nextQuestionText ? [{ role: "interviewer" as const, content: nextQuestionText }] : []),
      ]);

      setCurrentQuestion(nextQuestionText);
      setScore((prev) =>
        prev
          ? { ...prev, ...response.current_score, status: status }
          : {
              interview_id: interviewId,
              status: status,
              ...response.current_score,
            },
      );
      setProgress(response.current_score.percentage);
      await refreshScore();
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo procesar el audio",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setTranscribing(false);
      setAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090d18] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">AI Technical Interview</p>
          <h1 className="mt-2 text-3xl font-semibold">{interview?.job_title ?? "Entrevista técnica"}</h1>
          <p className="mt-2 text-sm text-slate-300">Candidato: {interview?.candidate_name ?? "-"}</p>
          <p className="mt-1 text-sm text-slate-300">Estado: {statusLabel}</p>
        </motion.div>

        {welcomeMode ? (
          <InterviewWelcome
            roleName={interview?.job_title ?? "N/A"}
            candidateName={interview?.candidate_name ?? "N/A"}
            interviewName={interview?.job_title ?? "Entrevista"}
            statusLabel={statusLabel}
            starting={starting}
            onStart={handleStartInterview}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-4">
              <CurrentQuestionCard
                question={currentQuestion || "La entrevista ha finalizado."}
                listening={isRecording}
                transcribing={transcribing}
                analyzing={analyzing}
              />

              {micError ? <MicPermissionAlert message={micError} /> : null}

              {interviewStatus !== "finalized" ? (
                <Card className="border-white/10 bg-white/5 text-white">
                  <CardHeader><CardTitle>Responder por voz</CardTitle></CardHeader>
                  <CardContent>
                    <RecordingButton
                      isRecording={isRecording}
                      disabled={transcribing || analyzing || !currentQuestion}
                      onStart={startRecording}
                      onStop={stopRecording}
                    />
                  </CardContent>
                </Card>
              ) : (
                <InterviewFinished />
              )}

              <TranscriptPreview text={candidateTranscript} />
            </section>

            <aside className="space-y-4">
              <InterviewProgress
                statusLabel={statusLabel}
                progress={progress}
                showScore={showScore}
                onToggleScore={() => setShowScore((prev) => !prev)}
                score={score}
              />
              <Card className="border-white/10 bg-white/5 text-white">
                <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
                <CardContent>
                  <InterviewTimeline items={timeline} />
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function preferredMimeType(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

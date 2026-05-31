"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Mic2, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  finalizeCandidateInterview,
  getCandidateQuestions,
  sendCandidateVoiceAnswer,
  validateCandidateToken,
} from "@/lib/services/candidate-interview";
import type {
  CandidateFinalResultResponse,
  CandidateQuestion,
  CandidateTokenValidationResponse,
  CandidateVoiceAnswerResponse,
} from "@/types/api";

type Stage = "token" | "welcome" | "interview" | "result";
type AgentStatus = "idle" | "speaking" | "listening" | "processing";

export default function CandidateVoiceInterviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7fbff]" />}>
      <CandidateVoiceInterviewContent />
    </Suspense>
  );
}

function CandidateVoiceInterviewContent() {
  const params = useSearchParams();
  const { showToast } = useToast();
  const [stage, setStage] = useState<Stage>("token");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [token, setToken] = useState(params.get("token") ?? "");
  const [validation, setValidation] = useState<CandidateTokenValidationResponse | null>(null);
  const [questions, setQuestions] = useState<CandidateQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<CandidateQuestion | null>(null);
  const [answers, setAnswers] = useState<CandidateVoiceAnswerResponse[]>([]);
  const [result, setResult] = useState<CandidateFinalResultResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((answers.length / questions.length) * 100);
  }, [answers.length, questions.length]);

  useEffect(() => {
    const urlToken = params.get("token");
    if (urlToken) setToken(urlToken);
  }, [params]);

  async function handleValidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    try {
      const valid = await validateCandidateToken(token.trim());
      const questionResponse = await getCandidateQuestions(valid.interview_id, token.trim());
      setValidation(valid);
      setQuestions(questionResponse.questions);
      setCurrentQuestion(questionResponse.questions[0] ?? null);
      setStage("welcome");
    } catch (error) {
      showToast({
        title: "Token inválido",
        description: error instanceof Error ? error.message : "No fue posible validar el token.",
        kind: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function startInterview() {
    if (!validation) return;
    setStage("interview");
    speak(
      [validation.greeting, currentQuestion?.question_text].filter(Boolean).join(" "),
      {
        onStart: () => setAgentStatus("speaking"),
        onEnd: () => setAgentStatus("idle"),
      },
    );
  }

  async function startRecording() {
    if (!currentQuestion || agentStatus === "speaking") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = preferredMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setAgentStatus("processing");
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await handleRecordingReady(blob);
      };
      recorder.start();
      setIsRecording(true);
      setAgentStatus("listening");
    } catch (error) {
      showToast({
        title: "Micrófono no disponible",
        description: error instanceof Error ? error.message : "Revisa los permisos del navegador.",
        kind: "error",
      });
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function handleRecordingReady(blob: Blob) {
    if (!validation || !currentQuestion) return;
    try {
      const response = await sendCandidateVoiceAnswer(validation.interview_id, token.trim(), blob);
      setAnswers((items) => [...items, response]);
      if (response.completed) {
        const finalResult = await finalizeCandidateInterview(validation.interview_id, token.trim());
        setResult(finalResult);
        setStage("result");
        speak(finalResult.farewell, {
          onStart: () => setAgentStatus("speaking"),
          onEnd: () => setAgentStatus("idle"),
        });
      } else {
        setCurrentQuestion(response.next_question ?? null);
        speak(response.next_question?.question_text ?? "", {
          onStart: () => setAgentStatus("speaking"),
          onEnd: () => setAgentStatus("idle"),
        });
      }
    } catch (error) {
      setAgentStatus("idle");
      showToast({
        title: "No se pudo procesar el audio",
        description: error instanceof Error ? error.message : "Intenta grabar tu respuesta otra vez.",
        kind: "error",
      });
    }
  }

  if (stage === "result" && result) {
    return <ResultScreen result={result} />;
  }

  return (
    <main className="min-h-screen bg-[#f7fbff] px-4 py-6 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col items-center justify-center">
        {stage === "token" ? (
          <section className="w-full max-w-md text-center">
            <div className="mx-auto mb-8 grid h-16 w-16 place-items-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Mic2 className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Entrevista por voz</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Ingresa el token recibido por correo para comenzar tu entrevista con IA.
            </p>
            <form className="mt-8 grid gap-4 text-left" onSubmit={handleValidate}>
              <div className="grid gap-2">
                <Label htmlFor="token">Token de acceso</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Ingresa tu token"
                  autoComplete="one-time-code"
                  className="h-12 bg-white text-center text-base"
                />
              </div>
              <Button className="h-12" type="submit" disabled={loading || !token.trim()}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Validar token
              </Button>
            </form>
          </section>
        ) : null}

        {stage === "welcome" && validation ? (
          <section className="grid w-full max-w-2xl justify-items-center text-center">
            <VoiceOrb status="idle" size="lg" />
            <h1 className="mt-10 text-3xl font-semibold tracking-normal text-slate-950">
              Hola {validation.candidate_name}, bienvenido a tu entrevista.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">
              Responde únicamente por voz. El agente leerá cada pregunta y escuchará tu respuesta por micrófono.
            </p>
            <Button className="mt-8 h-12 px-7" onClick={startInterview}>
              Iniciar entrevista por voz
            </Button>
          </section>
        ) : null}

        {stage === "interview" && validation ? (
          <section className="grid w-full max-w-3xl justify-items-center text-center">
            <div className="mb-8 w-full max-w-md">
              <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase text-slate-500">
                <span>Progreso</span>
                <span>{answers.length} / {questions.length}</span>
              </div>
              <Progress value={progress} className="h-2 bg-blue-100" />
            </div>

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!currentQuestion || agentStatus === "speaking" || agentStatus === "processing"}
              className="rounded-full focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-80"
              aria-label={isRecording ? "Detener grabación" : "Grabar respuesta"}
            >
              <VoiceOrb status={agentStatus} recording={isRecording} />
            </button>

            <AgentStatusText status={agentStatus} />

            <div className="mt-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Pregunta actual</p>
              <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight text-slate-950">
                {currentQuestion?.question_text ?? "No hay preguntas pendientes."}
              </h2>
              <p className="mt-5 text-base text-slate-500">Candidato, por favor responde...</p>
              {agentStatus === "listening" ? <ListeningDots /> : null}
            </div>

            <Button
              className="mt-8 h-11 px-6"
              variant={isRecording ? "secondary" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!currentQuestion || agentStatus === "speaking" || agentStatus === "processing"}
            >
              {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Mic2 className="mr-2 h-4 w-4" />}
              {isRecording ? "Detener respuesta" : "Responder por voz"}
            </Button>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function VoiceOrb({
  status,
  recording = false,
  size = "md",
}: {
  status: AgentStatus;
  recording?: boolean;
  size?: "md" | "lg";
}) {
  const active = status === "speaking" || status === "listening" || recording;
  const processing = status === "processing";
  const dimensions = size === "lg" ? "h-44 w-44 sm:h-52 sm:w-52" : "h-48 w-48 sm:h-64 sm:w-64";

  return (
    <div className={`relative grid ${dimensions} place-items-center rounded-full bg-blue-600 shadow-2xl shadow-blue-200`}>
      <span className={`absolute inset-0 rounded-full bg-blue-400/40 ${active ? "animate-ping" : ""}`} />
      <span className="absolute inset-4 rounded-full bg-blue-500/70" />
      <div className="relative flex h-24 w-28 items-center justify-center gap-1.5 rounded-full bg-white/10">
        {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
          <span
            key={bar}
            className={`w-2 rounded-full bg-white ${active || processing ? "animate-pulse" : ""}`}
            style={{
              height: `${24 + ((bar % 4) * 12)}px`,
              animationDelay: `${bar * 90}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AgentStatusText({ status }: { status: AgentStatus }) {
  const text = {
    idle: "Listo para escuchar tu respuesta.",
    speaking: "El agente está hablando...",
    listening: "Escuchando tu respuesta...",
    processing: "Procesando respuesta...",
  }[status];

  return (
    <p className="mt-8 min-h-6 text-sm font-medium text-slate-500">
      {status === "processing" ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
      {text}
    </p>
  );
}

function ListeningDots() {
  return (
    <div className="mt-4 flex justify-center gap-2" aria-label="Micrófono activo">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </div>
  );
}

function ResultScreen({ result }: { result: CandidateFinalResultResponse }) {
  return (
    <main className="min-h-screen bg-[#f7fbff] px-4 py-8 text-slate-950">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <section className="grid justify-items-center py-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-100">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold">Entrevista finalizada</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{result.farewell}</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Summary label="Candidato" value={result.candidate_name} />
          <Summary label="Puntaje total" value={`${result.total_score} / ${result.max_score}`} />
          <Summary label="Porcentaje" value={`${result.percentage}%`} />
        </div>

        <Card className="border-blue-100 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>Recomendación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {result.recommendation_lines.map((line) => (
              <p key={line} className="text-sm leading-6 text-slate-600">{line}</p>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {result.questions.map((item) => (
            <article key={item.question} className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">{item.question}</p>
              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="font-medium text-slate-500">Respuesta esperada</p>
                  <p className="mt-1 leading-6 text-slate-700">{item.expected_answer}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-500">Respuesta del candidato</p>
                  <p className="mt-1 leading-6 text-slate-700">{item.candidate_answer}</p>
                </div>
                <p className="font-semibold text-blue-700">
                  Puntaje: {item.score} / {item.max_score}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-4 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function speak(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  },
) {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
    callbacks?.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => callbacks?.onEnd?.();
  window.speechSynthesis.speak(utterance);
}

function preferredMimeType(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

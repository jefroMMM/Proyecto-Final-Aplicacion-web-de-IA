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
        showToast({ kind: "error", title: "Could not load interview", description: error instanceof Error ? error.message : "Unexpected error" }),
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
      showToast({ kind: "error", title: "Could not start voice interview", description: error instanceof Error ? error.message : "Unexpected error" });
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
        showToast({ kind: "success", title: "Interview finalized", description: "The final report is ready." });
      }
    } catch (error) {
      showToast({ kind: "error", title: "Voice turn failed", description: error instanceof Error ? error.message : "Unexpected error" });
    } finally {
      setProcessingTurn(false);
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      await finalizeInterview(interviewId);
      showToast({ kind: "success", title: "Report generated" });
      router.push(`/reports/${interviewId}`);
    } catch (error) {
      showToast({ kind: "error", title: "Could not finalize", description: error instanceof Error ? error.message : "Unexpected error" });
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
        <LoadingState label="Loading interview" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <audio ref={audioRef} className="hidden" />
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-primary">Voice interview</p>
          <h1 className="mt-1 text-3xl font-semibold">{interview?.candidate_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{interview?.job_title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={interview?.status === "completed" ? "success" : "default"}>{interview?.status}</Badge>
          <Button asChild variant="secondary">
            <Link href={`/reports/${interviewId}`}>
              <FileText className="mr-2 h-4 w-4" />
              Report
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <section className="space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Interview panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase text-muted-foreground">Current interviewer prompt</p>
                <p className="mt-3 text-lg leading-8">{currentQuestion ?? "Start the interview to generate the first question."}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleStart} disabled={starting || isProcessingTurn}>
                  {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                  Start interview
                </Button>
                <Button variant="secondary" onClick={handleFinalize} disabled={finalizing || isProcessingTurn}>
                  {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                  Finalize
                </Button>
              </div>

              <VoiceRecorder disabled={isProcessingTurn || !currentQuestion} onRecordingReady={handleRecordingReady} />

              {isProcessingTurn ? <LoadingState label="Transcribing, evaluating, and generating voice response" /> : null}

              {candidateTranscript ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase text-muted-foreground">Candidate transcript</p>
                  <p className="mt-2 text-sm leading-6">{candidateTranscript}</p>
                </div>
              ) : null}

              {interviewerResponse ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase text-muted-foreground">Interviewer response</p>
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
              <CardTitle>Conversation timeline</CardTitle>
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

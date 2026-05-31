import { apiRequest } from "@/lib/api";
import type {
  AudioAnswerResponse,
  AnalyzeCVResponse,
  AnswerTurnResponse,
  CandidateReport,
  Interview,
  InterviewCreate,
  InterviewCreateFromTemplate,
  InterviewDetail,
  InterviewScore,
  StartInterviewResponse,
} from "@/types/api";

export async function createInterview(payload: InterviewCreate): Promise<Interview> {
  return apiRequest<Interview>("/interviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createInterviewFromTemplate(payload: InterviewCreateFromTemplate): Promise<Interview> {
  return apiRequest<Interview>("/interviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listInterviews(): Promise<Interview[]> {
  return apiRequest<Interview[]>("/interviews");
}

export async function getInterview(interviewId: string): Promise<InterviewDetail> {
  return apiRequest<InterviewDetail>(`/interviews/${interviewId}`);
}

export async function uploadInterviewCv(interviewId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest(`/interviews/${interviewId}/upload-cv`, {
    method: "POST",
    body: form,
  });
}

export async function analyzeInterviewCv(interviewId: string) {
  return apiRequest<AnalyzeCVResponse>(`/interviews/${interviewId}/analyze-cv`, {
    method: "POST",
  });
}

export async function sendCandidateInvite(interviewId: string): Promise<Interview> {
  return apiRequest<Interview>(`/interviews/${interviewId}/send-candidate-invite`, {
    method: "POST",
  });
}

export async function startTemplateInterview(interviewId: string): Promise<StartInterviewResponse> {
  return apiRequest<StartInterviewResponse>(`/interviews/${interviewId}/start`, {
    method: "POST",
  });
}

export async function answerTemplateInterview(interviewId: string, answer: string): Promise<AnswerTurnResponse> {
  return apiRequest<AnswerTurnResponse>(`/interviews/${interviewId}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export async function answerTemplateInterviewAudio(interviewId: string, audioBlob: Blob): Promise<AudioAnswerResponse> {
  const extension = mimeToExtension(audioBlob.type);
  const form = new FormData();
  form.append("file", audioBlob, `answer.${extension}`);
  return apiRequest<AudioAnswerResponse>(`/interviews/${interviewId}/audio-answer`, {
    method: "POST",
    body: form,
  });
}

export async function finalizeTemplateInterview(interviewId: string): Promise<CandidateReport> {
  return apiRequest<CandidateReport>(`/interviews/${interviewId}/finalize`, {
    method: "POST",
  });
}

export async function getInterviewScore(interviewId: string): Promise<InterviewScore> {
  return apiRequest<InterviewScore>(`/interviews/${interviewId}/score`);
}

export async function getInterviewReport(interviewId: string): Promise<CandidateReport> {
  return apiRequest<CandidateReport>(`/interviews/${interviewId}/report`);
}

export async function updateInterviewAnswerScore(
  interviewId: string,
  answerId: string,
  finalQuestionScore: number,
): Promise<CandidateReport["answer_evaluations"][number]> {
  return apiRequest<CandidateReport["answer_evaluations"][number]>(
    `/interviews/${interviewId}/answers/${answerId}/score`,
    {
      method: "PATCH",
      body: JSON.stringify({ final_question_score: finalQuestionScore }),
    },
  );
}

function mimeToExtension(mimeType: string): string {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

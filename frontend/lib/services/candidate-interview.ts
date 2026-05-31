import { apiRequest } from "@/lib/api";
import type {
  CandidateFinalResultResponse,
  CandidateQuestionsResponse,
  CandidateTokenValidationResponse,
  CandidateVoiceAnswerResponse,
} from "@/types/api";

export async function validateCandidateToken(
  token: string,
): Promise<CandidateTokenValidationResponse> {
  return apiRequest<CandidateTokenValidationResponse>("/entrevista/validar-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function getCandidateQuestions(
  interviewId: string,
  token: string,
): Promise<CandidateQuestionsResponse> {
  return apiRequest<CandidateQuestionsResponse>(`/entrevista/${interviewId}/preguntas`, {
    headers: authHeaders(token),
  });
}

export async function sendCandidateVoiceAnswer(
  interviewId: string,
  token: string,
  audioBlob: Blob,
): Promise<CandidateVoiceAnswerResponse> {
  const form = new FormData();
  form.append("file", audioBlob, `answer.${mimeToExtension(audioBlob.type)}`);
  return apiRequest<CandidateVoiceAnswerResponse>(`/entrevista/${interviewId}/respuesta-voz`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
}

export async function finalizeCandidateInterview(
  interviewId: string,
  token: string,
): Promise<CandidateFinalResultResponse> {
  return apiRequest<CandidateFinalResultResponse>(`/entrevista/${interviewId}/finalizar`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

function authHeaders(token: string) {
  return { "X-Interview-Token": token };
}

function mimeToExtension(mimeType: string): string {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

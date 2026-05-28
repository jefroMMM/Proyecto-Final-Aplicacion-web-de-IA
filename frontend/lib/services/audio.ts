import { apiRequest } from "@/lib/api";
import type { VoiceStartResponse, VoiceTurnResponse } from "@/types/api";

export async function startVoiceInterview(
  interviewId: string,
): Promise<VoiceStartResponse> {
  return apiRequest<VoiceStartResponse>(`/interview/audio/start/${interviewId}`, {
    method: "POST",
  });
}

export async function sendVoiceAnswer(
  interviewId: string,
  audioBlob: Blob,
): Promise<VoiceTurnResponse> {
  const extension = mimeToExtension(audioBlob.type);
  const form = new FormData();
  form.append("file", audioBlob, `answer.${extension}`);
  return apiRequest<VoiceTurnResponse>(`/interview/audio/${interviewId}`, {
    method: "POST",
    body: form,
  });
}

function mimeToExtension(mimeType: string): string {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

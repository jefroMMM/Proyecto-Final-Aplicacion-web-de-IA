import { apiRequest } from "@/lib/api";
import type { Transcript } from "@/types/api";

export async function getTranscripts(interviewId: string): Promise<Transcript[]> {
  return apiRequest<Transcript[]>(`/transcripts/${interviewId}`);
}

import { apiRequest } from "@/lib/api";
import type { Interview, InterviewCreate, InterviewDetail } from "@/types/api";

export async function createInterview(payload: InterviewCreate): Promise<Interview> {
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

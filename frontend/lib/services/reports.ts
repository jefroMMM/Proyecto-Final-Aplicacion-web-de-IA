import { apiRequest } from "@/lib/api";
import type { ReportRead } from "@/types/api";

export async function getReport(interviewId: string): Promise<ReportRead> {
  return apiRequest<ReportRead>(`/reports/${interviewId}`);
}

export async function finalizeInterview(interviewId: string) {
  return apiRequest(`/interview/finalize/${interviewId}`, {
    method: "POST",
  });
}

import { apiRequest } from "@/lib/api";
import type { UploadDocumentResponse } from "@/types/api";

export async function uploadCv(
  interviewId: string,
  file: File,
): Promise<UploadDocumentResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<UploadDocumentResponse>(`/upload/cv/${interviewId}`, {
    method: "POST",
    body: form,
  });
}

export async function uploadJobDescription(
  interviewId: string,
  file: File,
): Promise<UploadDocumentResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<UploadDocumentResponse>(`/upload/job/${interviewId}`, {
    method: "POST",
    body: form,
  });
}

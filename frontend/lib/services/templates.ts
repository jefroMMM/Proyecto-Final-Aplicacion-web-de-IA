import { apiRequest } from "@/lib/api";
import type { InterviewTemplate, TemplateQuestion, TemplateRequirement } from "@/types/api";

export interface TemplateCreatePayload {
  title: string;
  description: string;
  role_name: string;
}

export interface RequirementCreatePayload {
  skill_name: string;
  description: string;
  weight: number;
}

export interface QuestionCreatePayload {
  requirement_id?: string | null;
  question_text: string;
  expected_answer: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  is_required: boolean;
  order_index: number;
}

export async function listTemplates(): Promise<InterviewTemplate[]> {
  return apiRequest<InterviewTemplate[]>("/templates");
}

export async function getTemplate(templateId: string): Promise<InterviewTemplate> {
  return apiRequest<InterviewTemplate>(`/templates/${templateId}`);
}

export async function createTemplate(payload: TemplateCreatePayload): Promise<InterviewTemplate> {
  return apiRequest<InterviewTemplate>("/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTemplate(templateId: string, payload: Partial<TemplateCreatePayload>): Promise<InterviewTemplate> {
  return apiRequest<InterviewTemplate>(`/templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiRequest<void>(`/templates/${templateId}`, {
    method: "DELETE",
    skipJson: true,
  });
}

export async function addRequirement(templateId: string, payload: RequirementCreatePayload): Promise<TemplateRequirement> {
  return apiRequest<TemplateRequirement>(`/templates/${templateId}/requirements`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRequirement(requirementId: string, payload: Partial<RequirementCreatePayload>): Promise<TemplateRequirement> {
  return apiRequest<TemplateRequirement>(`/templates/requirements/${requirementId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteRequirement(requirementId: string): Promise<void> {
  await apiRequest<void>(`/templates/requirements/${requirementId}`, {
    method: "DELETE",
    skipJson: true,
  });
}

export async function addQuestion(templateId: string, payload: QuestionCreatePayload): Promise<TemplateQuestion> {
  return apiRequest<TemplateQuestion>(`/templates/${templateId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQuestion(questionId: string, payload: Partial<QuestionCreatePayload>): Promise<TemplateQuestion> {
  return apiRequest<TemplateQuestion>(`/templates/questions/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiRequest<void>(`/templates/questions/${questionId}`, {
    method: "DELETE",
    skipJson: true,
  });
}

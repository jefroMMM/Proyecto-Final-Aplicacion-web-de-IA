import type { CandidateReport, Interview, InterviewStatus } from "@/types/api";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

export const interviewStatusLabel: Record<InterviewStatus, string> = {
  created: "Creada",
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const interviewStatusVariant: Record<InterviewStatus, BadgeVariant> = {
  created: "secondary",
  pending: "warning",
  in_progress: "default",
  completed: "success",
  cancelled: "danger",
};

export const recommendationLabel: Record<CandidateReport["recommendation"], string> = {
  highly_recommended: "Muy recomendado",
  recommended: "Recomendado",
  needs_review: "Requiere revision",
  not_recommended: "No recomendado",
};

export const recommendationVariant: Record<CandidateReport["recommendation"], BadgeVariant> = {
  highly_recommended: "success",
  recommended: "success",
  needs_review: "warning",
  not_recommended: "danger",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function interviewPercentage(interview: Interview) {
  if (!interview.max_score) return 0;
  return Math.round((interview.final_score / interview.max_score) * 100);
}

export function averageCompletedScore(interviews: Interview[]) {
  const completed = interviews.filter((item) => item.status === "completed" && item.max_score > 0);
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, item) => sum + interviewPercentage(item), 0);
  return Math.round(total / completed.length);
}

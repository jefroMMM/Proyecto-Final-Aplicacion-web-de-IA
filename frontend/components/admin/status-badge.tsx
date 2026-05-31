import { Badge } from "@/components/ui/badge";
import {
  interviewStatusLabel,
  interviewStatusVariant,
  recommendationLabel,
  recommendationVariant,
} from "@/lib/admin-format";
import type { CandidateReport, InterviewStatus } from "@/types/api";

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <Badge variant={interviewStatusVariant[status] ?? "secondary"}>{interviewStatusLabel[status] ?? status}</Badge>;
}

export function RecommendationBadge({
  recommendation,
}: {
  recommendation: CandidateReport["recommendation"] | string;
}) {
  const known = recommendation as CandidateReport["recommendation"];
  return <Badge variant={recommendationVariant[known] ?? "secondary"}>{recommendationLabel[known] ?? recommendation}</Badge>;
}

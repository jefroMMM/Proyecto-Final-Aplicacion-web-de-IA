import Link from "next/link";
import { CalendarClock, FileText, Mail, Mic2 } from "lucide-react";

import { InterviewStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, interviewPercentage } from "@/lib/admin-format";
import type { Interview } from "@/types/api";

export function InterviewCard({ interview }: { interview: Interview }) {
  const percentage = interviewPercentage(interview);
  const hasCandidateLink = Boolean(interview.candidate_interview_url);

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{interview.candidate_name}</CardTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">{interview.job_title}</p>
          </div>
          <InterviewStatusBadge status={interview.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>{formatDateTime(interview.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>{interview.candidate_email_sent ? "Correo enviado" : "Pendiente de correo"}</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Score final</span>
            <span>{interview.final_score} / {interview.max_score}</span>
          </div>
          <Progress value={percentage} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href={`/dashboard/interviews/${interview.id}/report`}>
              <FileText className="mr-2 h-4 w-4" />
              Reporte
            </Link>
          </Button>
          {hasCandidateLink ? (
            <Button asChild size="sm" variant="outline">
              <Link href={interview.candidate_interview_url ?? "#"} target="_blank">
                <Mic2 className="mr-2 h-4 w-4" />
                Enlace candidato
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

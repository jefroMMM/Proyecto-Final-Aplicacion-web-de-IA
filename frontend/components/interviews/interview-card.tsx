import Link from "next/link";
import { Calendar, FileText, Mic2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Interview } from "@/types/api";

const statusVariant = {
  created: "secondary",
  pending: "warning",
  in_progress: "default",
  completed: "success",
  cancelled: "danger",
} as const;

const statusLabel = {
  created: "Creada",
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
} as const;

export function InterviewCard({ interview }: { interview: Interview }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{interview.candidate_name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{interview.job_title}</p>
          </div>
          <Badge variant={statusVariant[interview.status] ?? "secondary"}>
            {statusLabel[interview.status] ?? interview.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date(interview.created_at).toLocaleDateString()}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/interviews/${interview.id}`}>
              <Mic2 className="mr-2 h-4 w-4" />
              Abrir
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/reports/${interview.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              Reporte
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

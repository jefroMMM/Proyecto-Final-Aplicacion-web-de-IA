"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { ReportPanel } from "@/components/reports/report-panel";
import { Button } from "@/components/ui/button";
import { getInterviewReport } from "@/lib/services/interviews";
import type { CandidateReport } from "@/types/api";

export default function DashboardInterviewReportPage() {
  const params = useParams<{ interviewId: string }>();
  const interviewId = params.interviewId;
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setError(null);
    const nextReport = await getInterviewReport(interviewId);
    setReport(nextReport);
  }, [interviewId]);

  useEffect(() => {
    setLoading(true);
    loadReport()
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar reporte"))
      .finally(() => setLoading(false));
  }, [loadReport]);

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Reportes"
        title="Resultado de entrevista"
        description="Revision estructurada del candidato, puntajes, skills y evidencia de respuestas."
        actions={
          <Button asChild variant="secondary">
            <Link href="/dashboard/reports">Volver a reportes</Link>
          </Button>
        }
      />
      {loading ? <LoadingState label="Cargando reporte" /> : null}
      {!loading && error ? <EmptyState title="Reporte no disponible" description={error} actionHref="/dashboard/interviews" actionLabel="Volver a entrevistas" /> : null}
      {!loading && report ? <ReportPanel report={report} interviewId={interviewId} onScoreUpdated={loadReport} /> : null}
    </AppLayout>
  );
}

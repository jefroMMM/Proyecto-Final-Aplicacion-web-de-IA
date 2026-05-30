"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { ReportPanel } from "@/components/reports/report-panel";
import { getInterviewReport } from "@/lib/services/interviews";
import type { CandidateReport } from "@/types/api";

export default function DashboardInterviewReportPage() {
  const params = useParams<{ interviewId: string }>();
  const interviewId = params.interviewId;
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInterviewReport(interviewId)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar reporte"))
      .finally(() => setLoading(false));
  }, [interviewId]);

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-primary">Reporte</p>
        <h1 className="mt-1 text-3xl font-semibold">Resultado de entrevista</h1>
      </div>
      {loading ? <LoadingState label="Cargando reporte" /> : null}
      {!loading && error ? <EmptyState title="Reporte no disponible" description={error} actionHref="/dashboard/interviews" actionLabel="Volver a entrevistas" /> : null}
      {!loading && report ? <ReportPanel report={report} /> : null}
    </AppLayout>
  );
}

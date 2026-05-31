"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ClipboardList, Radio } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { InterviewCard } from "@/components/interviews/interview-card";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { averageCompletedScore } from "@/lib/admin-format";
import { listInterviews } from "@/lib/services/interviews";
import type { Interview, InterviewStatus } from "@/types/api";

const filters = ["all", "created", "in_progress", "completed"] as const satisfies ReadonlyArray<"all" | InterviewStatus>;

const filterLabels: Record<(typeof filters)[number], string> = {
  all: "Todas",
  created: "Creadas",
  in_progress: "En curso",
  completed: "Completadas",
};

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  useEffect(() => {
    listInterviews()
      .then(setInterviews)
      .catch((error) => {
        setInterviews([]);
        setLoadError(error instanceof Error ? error.message : "El backend no esta disponible");
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    return {
      total: interviews.length,
      inProgress: interviews.filter((item) => item.status === "in_progress").length,
      completed: interviews.filter((item) => item.status === "completed").length,
      average: averageCompletedScore(interviews),
    };
  }, [interviews]);

  const filtered = useMemo(
    () =>
      interviews.filter((interview) => {
        const matchesFilter = filter === "all" || interview.status === filter;
        const query = `${interview.candidate_name} ${interview.job_title}`.toLowerCase();
        return matchesFilter && query.includes(search.toLowerCase());
      }),
    [filter, interviews, search],
  );

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Panel"
        title="Operacion de entrevistas"
        description="Monitorea el estado de candidatos, revisa avances y entra a los reportes finales desde una sola vista."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entrevistas" value={stats.total} detail="Total registrado" icon={ClipboardList} />
        <StatCard label="En curso" value={stats.inProgress} detail="Pendientes de completar" icon={Radio} tone="accent" />
        <StatCard label="Completadas" value={stats.completed} detail="Con reporte disponible" icon={CheckCircle2} tone="success" />
        <StatCard label="Promedio" value={`${stats.average}%`} detail="Score de completadas" icon={BarChart3} tone="warning" />
      </div>

      <section className="admin-panel p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item}
                variant={filter === item ? "default" : "secondary"}
                size="sm"
                onClick={() => setFilter(item)}
              >
                {filterLabels[item]}
              </Button>
            ))}
          </div>
          <SearchBox placeholder="Buscar candidato o puesto" value={search} onChange={setSearch} />
        </div>

        {loading ? <LoadingState label="Cargando entrevistas" /> : null}
        {!loading && loadError ? (
          <EmptyState title="Backend no disponible" description={loadError} actionHref="/" actionLabel="Volver al inicio" />
        ) : null}
        {!loading && !loadError && filtered.length === 0 ? (
          <EmptyState
            title="No hay entrevistas"
            description="Crea una entrevista, carga el CV y envia el acceso al candidato."
            actionHref="/dashboard/interviews/new"
            actionLabel="Nueva entrevista"
          />
        ) : null}
        {!loading && !loadError && filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((interview) => <InterviewCard key={interview.id} interview={interview} />)}
          </div>
        ) : null}
      </section>
    </AppLayout>
  );
}

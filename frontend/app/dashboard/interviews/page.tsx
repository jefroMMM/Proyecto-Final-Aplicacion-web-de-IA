"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Radio } from "lucide-react";

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

export default function DashboardInterviewsPage() {
  const [items, setItems] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  useEffect(() => {
    listInterviews()
      .then(setItems)
      .catch((error) => setLoadError(error instanceof Error ? error.message : "No se pudieron cargar entrevistas"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesFilter = filter === "all" || item.status === filter;
        const query = `${item.candidate_name} ${item.candidate_email ?? ""} ${item.job_title}`.toLowerCase();
        return matchesFilter && query.includes(search.toLowerCase());
      }),
    [items, filter, search],
  );

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => item.status === "in_progress").length,
      completed: items.filter((item) => item.status === "completed").length,
      average: averageCompletedScore(items),
    };
  }, [items]);

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Entrevistas"
        title="Listado de entrevistas"
        description="Consulta candidatos creados, seguimiento por estado y acceso rapido al reporte o enlace del candidato."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={stats.total} detail="Entrevistas registradas" icon={ClipboardList} />
        <StatCard label="En curso" value={stats.active} detail="Aun activas" icon={Radio} tone="accent" />
        <StatCard label="Completadas" value={stats.completed} detail="Reportes disponibles" icon={CheckCircle2} tone="success" />
        <StatCard label="Promedio" value={`${stats.average}%`} detail="Score final" icon={CheckCircle2} tone="warning" />
      </div>

      <section className="admin-panel p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={item === filter ? "default" : "secondary"}
                onClick={() => setFilter(item)}
              >
                {filterLabels[item]}
              </Button>
            ))}
          </div>
          <SearchBox placeholder="Buscar candidato, correo o puesto" value={search} onChange={setSearch} />
        </div>

        {loading ? <LoadingState label="Cargando entrevistas" /> : null}
        {!loading && loadError ? (
          <EmptyState title="No se pudo cargar" description={loadError} />
        ) : null}
        {!loading && !loadError && filtered.length === 0 ? (
          <EmptyState
            title="No hay entrevistas"
            description="Crea una nueva entrevista para comenzar el flujo con CV, plantilla y correo."
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

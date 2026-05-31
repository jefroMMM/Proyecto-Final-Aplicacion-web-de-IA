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
import { Input } from "@/components/ui/input";
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    filter: "all" as (typeof filters)[number],
    dateFrom: "",
    dateTo: "",
    scoreMin: "",
    scoreMax: "",
  });

  useEffect(() => {
    listInterviews()
      .then(setItems)
      .catch((error) => setLoadError(error instanceof Error ? error.message : "No se pudieron cargar entrevistas"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesFilter = appliedFilters.filter === "all" || item.status === appliedFilters.filter;
        const query = `${item.candidate_name} ${item.candidate_email ?? ""} ${item.job_title}`.toLowerCase();
        const minScore = parseOptionalNumber(appliedFilters.scoreMin);
        const maxScore = parseOptionalNumber(appliedFilters.scoreMax);
        const fromTime = appliedFilters.dateFrom ? startOfLocalDay(appliedFilters.dateFrom).getTime() : null;
        const toTime = appliedFilters.dateTo ? endOfLocalDay(appliedFilters.dateTo).getTime() : null;
        const itemTime = new Date(item.created_at).getTime();
        return (
          matchesFilter
          && query.includes(appliedFilters.search.toLowerCase())
          && (fromTime === null || itemTime >= fromTime)
          && (toTime === null || itemTime <= toTime)
          && (minScore === null || item.final_score >= minScore)
          && (maxScore === null || item.final_score <= maxScore)
        );
      }),
    [items, appliedFilters],
  );

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => item.status === "in_progress").length,
      completed: items.filter((item) => item.status === "completed").length,
      average: averageCompletedScore(items),
    };
  }, [items]);

  const hasFilters = Boolean(search || filter !== "all" || dateFrom || dateTo || scoreMin || scoreMax);

  function applyFilters() {
    setAppliedFilters({ search, filter, dateFrom, dateTo, scoreMin, scoreMax });
  }

  function clearFilters() {
    setSearch("");
    setFilter("all");
    setDateFrom("");
    setDateTo("");
    setScoreMin("");
    setScoreMax("");
    setAppliedFilters({ search: "", filter: "all", dateFrom: "", dateTo: "", scoreMin: "", scoreMax: "" });
  }

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
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto_auto] xl:items-end">
          <label className="grid gap-1 text-sm font-medium">
            Desde
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Hasta
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Puntos min
            <Input type="number" min={0} step="0.1" value={scoreMin} onChange={(event) => setScoreMin(event.target.value)} placeholder="0" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Puntos max
            <Input type="number" min={0} step="0.1" value={scoreMax} onChange={(event) => setScoreMax(event.target.value)} placeholder="10" />
          </label>
          <Button type="button" onClick={applyFilters}>Filtrar</Button>
          <Button type="button" variant="secondary" onClick={clearFilters} disabled={!hasFilters}>Limpiar</Button>
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

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function startOfLocalDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function endOfLocalDay(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

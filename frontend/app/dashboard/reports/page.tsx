"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, CheckCircle2, FileText } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { InterviewStatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { averageCompletedScore, formatDateTime, interviewPercentage } from "@/lib/admin-format";
import { listInterviews } from "@/lib/services/interviews";
import type { Interview } from "@/types/api";

export default function DashboardReportsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    roleFilter: "",
    dateFrom: "",
    dateTo: "",
    scoreMin: "",
    scoreMax: "",
  });

  useEffect(() => {
    listInterviews()
      .then(setInterviews)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar reportes"))
      .finally(() => setLoading(false));
  }, []);

  const reportable = useMemo(() => interviews.filter((item) => item.status === "completed" || item.final_score > 0), [interviews]);
  const roleOptions = useMemo(
    () => Array.from(new Set(reportable.map((item) => item.job_title).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [reportable],
  );
  const filtered = useMemo(() => {
    const term = appliedFilters.search.toLowerCase();
    const minScore = parseOptionalNumber(appliedFilters.scoreMin);
    const maxScore = parseOptionalNumber(appliedFilters.scoreMax);
    const fromTime = appliedFilters.dateFrom ? startOfLocalDay(appliedFilters.dateFrom).getTime() : null;
    const toTime = appliedFilters.dateTo ? endOfLocalDay(appliedFilters.dateTo).getTime() : null;

    return reportable.filter((item) => {
      const matchesSearch = `${item.candidate_name} ${item.job_title} ${item.candidate_email ?? ""}`.toLowerCase().includes(term);
      const matchesRole = !appliedFilters.roleFilter || item.job_title === appliedFilters.roleFilter;
      const itemTime = new Date(item.created_at).getTime();
      const matchesFrom = fromTime === null || itemTime >= fromTime;
      const matchesTo = toTime === null || itemTime <= toTime;
      const matchesMinScore = minScore === null || item.final_score >= minScore;
      const matchesMaxScore = maxScore === null || item.final_score <= maxScore;
      return matchesSearch && matchesRole && matchesFrom && matchesTo && matchesMinScore && matchesMaxScore;
    });
  }, [appliedFilters, reportable]);

  const hasFilters = Boolean(search || roleFilter || dateFrom || dateTo || scoreMin || scoreMax);

  function applyFilters() {
    setAppliedFilters({ search, roleFilter, dateFrom, dateTo, scoreMin, scoreMax });
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setDateFrom("");
    setDateTo("");
    setScoreMin("");
    setScoreMax("");
    setAppliedFilters({ search: "", roleFilter: "", dateFrom: "", dateTo: "", scoreMin: "", scoreMax: "" });
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Reportes"
        title="Reportes de candidatos"
        description="Accede a resultados finales, puntajes y evidencia de evaluacion para entrevistas completadas."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Reportes" value={reportable.length} detail="Disponibles" icon={FileText} />
        <StatCard label="Completadas" value={interviews.filter((item) => item.status === "completed").length} detail="Estado finalizado" icon={CheckCircle2} tone="success" />
        <StatCard label="Promedio" value={`${averageCompletedScore(interviews)}%`} detail="Score final" icon={BarChart3} tone="warning" />
      </div>

      <section className="admin-panel p-4">
        <div className="mb-4 grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">{filtered.length} resultados</p>
            <SearchBox placeholder="Buscar candidato, correo o puesto" value={search} onChange={setSearch} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_auto_auto] xl:items-end">
            <label className="grid gap-1 text-sm font-medium">
              Puesto
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-10 rounded-md border border-input bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos los puestos</option>
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
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
            <Button type="button" onClick={applyFilters}>
              Filtrar
            </Button>
            <Button type="button" variant="secondary" onClick={clearFilters} disabled={!hasFilters}>
              Limpiar
            </Button>
          </div>
        </div>

        {loading ? <LoadingState label="Cargando reportes" /> : null}
        {!loading && error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
        {!loading && !error && reportable.length === 0 ? (
          <EmptyState title="Sin reportes" description="Finaliza una entrevista para generar el primer reporte." actionHref="/dashboard/interviews" actionLabel="Ver entrevistas" />
        ) : null}
        {!loading && !error && reportable.length > 0 && filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="No hay reportes que coincidan con la busqueda." />
        ) : null}
        {!loading && !error && filtered.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_9rem] gap-4 bg-muted/60 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground lg:grid">
              <span>Candidato</span>
              <span>Puesto</span>
              <span>Estado</span>
              <span>Score</span>
              <span>Accion</span>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((interview) => (
                <article key={interview.id} className="grid gap-4 bg-card px-4 py-4 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_9rem] lg:items-center">
                  <div>
                    <p className="font-medium">{interview.candidate_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{interview.candidate_email ?? "Sin correo"} - {formatDateTime(interview.created_at)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{interview.job_title}</p>
                  <div><InterviewStatusBadge status={interview.status} /></div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{interview.final_score} / {interview.max_score}</span>
                      <span>{interviewPercentage(interview)}%</span>
                    </div>
                    <Progress value={interviewPercentage(interview)} />
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/dashboard/interviews/${interview.id}/report`}>Ver reporte</Link>
                  </Button>
                </article>
              ))}
            </div>
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

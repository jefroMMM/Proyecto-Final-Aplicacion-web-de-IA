"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArchiveRestore, CheckCircle2, ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import type { SearchSuggestion } from "@/components/admin/search-box";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { InterviewCard } from "@/components/interviews/interview-card";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { averageCompletedScore } from "@/lib/admin-format";
import { listArchivedInterviews, unarchiveInterview } from "@/lib/services/interviews";
import type { Interview } from "@/types/api";

export default function ArchivedInterviewsPage() {
  const [items, setItems] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    scoreMin: "",
    scoreMax: "",
  });
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    listArchivedInterviews()
      .then(setItems)
      .catch((error) => setLoadError(error instanceof Error ? error.message : "No se pudieron cargar entrevistas archivadas"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const query = `${item.candidate_name} ${item.candidate_email ?? ""} ${item.job_title}`.toLowerCase();
        const minScore = parseOptionalNumber(appliedFilters.scoreMin);
        const maxScore = parseOptionalNumber(appliedFilters.scoreMax);
        const fromTime = appliedFilters.dateFrom ? startOfLocalDay(appliedFilters.dateFrom).getTime() : null;
        const toTime = appliedFilters.dateTo ? endOfLocalDay(appliedFilters.dateTo).getTime() : null;
        const itemTime = new Date(item.created_at).getTime();
        return (
          query.includes(search.toLowerCase())
          && (fromTime === null || itemTime >= fromTime)
          && (toTime === null || itemTime <= toTime)
          && (minScore === null || item.final_score >= minScore)
          && (maxScore === null || item.final_score <= maxScore)
        );
      }),
    [items, appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.scoreMin, appliedFilters.scoreMax, search],
  );

  const stats = useMemo(() => {
    return {
      total: items.length,
      completed: items.filter((item) => item.status === "completed").length,
      average: averageCompletedScore(items),
    };
  }, [items]);

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    return items
      .filter((item) => {
        const haystack = `${item.candidate_name} ${item.candidate_email ?? ""} ${item.job_title}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        label: item.candidate_name,
        value: item.candidate_name,
        detail: `${item.candidate_email ?? "sin correo"} · ${item.job_title} · ${formatInterviewDate(item.created_at)}`,
      }));
  }, [items, search]);

  async function handleUnarchive(interviewId: string) {
    try {
      setRestoringId(interviewId);
      await unarchiveInterview(interviewId);
      setItems((current) => current.filter((item) => item.id !== interviewId));
    } finally {
      setRestoringId(null);
    }
  }

  function applyFilters() {
    setAppliedFilters({ dateFrom, dateTo, scoreMin, scoreMax });
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setScoreMin("");
    setScoreMax("");
    setAppliedFilters({ dateFrom: "", dateTo: "", scoreMin: "", scoreMax: "" });
  }

  const hasFilters = Boolean(search || dateFrom || dateTo || scoreMin || scoreMax);

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Entrevistas"
        title="Entrevistas archivadas"
        description="Consulta entrevistas archivadas y restaura las que quieras volver a ver en el listado principal."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Archivadas" value={stats.total} detail="Total actual" icon={ClipboardList} />
        <StatCard label="Completadas" value={stats.completed} detail="Con reporte final" icon={CheckCircle2} tone="success" />
        <StatCard label="Promedio" value={`${stats.average}%`} detail="Score final" icon={ArchiveRestore} tone="warning" />
      </div>

      <section className="admin-panel p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchBox
            placeholder="Buscar candidato, correo o puesto"
            value={search}
            onChange={setSearch}
            suggestions={searchSuggestions}
          />
          <Button asChild type="button" variant="secondary">
            <Link href="/dashboard/interviews">Volver a entrevistas</Link>
          </Button>
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

        {loading ? <LoadingState label="Cargando entrevistas archivadas" /> : null}
        {!loading && loadError ? (
          <EmptyState title="No se pudo cargar" description={loadError} />
        ) : null}
        {!loading && !loadError && filtered.length === 0 ? (
          <EmptyState
            title="No hay entrevistas archivadas"
            description="Cuando archives entrevistas aparecerán aquí."
          />
        ) : null}
        {!loading && !loadError && filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                busy={restoringId === interview.id}
                onUnarchive={handleUnarchive}
              />
            ))}
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

function formatInterviewDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "sin fecha";
  return parsed.toLocaleDateString("es-GT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

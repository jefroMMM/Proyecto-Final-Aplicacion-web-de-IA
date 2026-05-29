"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { InterviewCard } from "@/components/interviews/interview-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
        setLoadError(error instanceof Error ? error.message : "El backend no está disponible");
      })
      .finally(() => setLoading(false));
  }, []);

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
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-primary">Entrevistas</p>
          <h1 className="mt-1 text-3xl font-semibold">Panel de control</h1>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar entrevistas" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button key={item} variant={filter === item ? "default" : "secondary"} size="sm" onClick={() => setFilter(item)}>
            {filterLabels[item]}
          </Button>
        ))}
      </div>

      {loading ? <LoadingState label="Cargando entrevistas" /> : null}
      {!loading && loadError ? (
        <EmptyState title="Backend no disponible" description={loadError} actionHref="/" actionLabel="Volver al inicio" />
      ) : null}
      {!loading && !loadError && filtered.length === 0 ? (
        <EmptyState title="No hay entrevistas" description="Crea una entrevista, carga los documentos y empieza una sesión por voz." actionHref="/interviews/new" actionLabel="Nueva entrevista" />
      ) : null}
      {!loading && !loadError && filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((interview) => <InterviewCard key={interview.id} interview={interview} />)}
        </div>
      ) : null}
    </AppLayout>
  );
}

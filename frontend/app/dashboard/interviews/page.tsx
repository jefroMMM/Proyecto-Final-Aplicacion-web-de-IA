"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listInterviews } from "@/lib/services/interviews";
import type { Interview, InterviewStatus } from "@/types/api";

const filters = ["all", "created", "in_progress", "completed"] as const satisfies ReadonlyArray<"all" | InterviewStatus>;

export default function DashboardInterviewsPage() {
  const [items, setItems] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  useEffect(() => {
    listInterviews().then(setItems).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => items.filter((item) => (filter === "all" || item.status === filter) && `${item.candidate_name} ${item.job_title}`.toLowerCase().includes(search.toLowerCase())),
    [items, filter, search],
  );

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-primary">Entrevistas</p>
          <h1 className="mt-1 text-3xl font-semibold">Listado</h1>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar candidato o puesto" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>
      <div className="mb-4 flex gap-2">
        {filters.map((f) => <Button key={f} size="sm" variant={f === filter ? "default" : "secondary"} onClick={() => setFilter(f)}>{f}</Button>)}
      </div>

      {loading ? <LoadingState label="Cargando entrevistas" /> : null}
      {!loading && filtered.length === 0 ? <EmptyState title="No hay entrevistas" description="Crea una nueva entrevista para comenzar." actionHref="/dashboard/interviews/new" actionLabel="Nueva entrevista" /> : null}
      {!loading && filtered.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((interview) => (
            <Card key={interview.id} className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{interview.candidate_name}</span>
                  <Badge>{interview.status}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{interview.job_title}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Score: {interview.final_score} / {interview.max_score}</p>
                <p>Fecha: {new Date(interview.created_at).toLocaleString()}</p>
                <Button asChild size="sm">
                  <Link href={`/dashboard/interviews/${interview.id}/report`}>Ver reporte</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </AppLayout>
  );
}

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

const filters: Array<"all" | InterviewStatus> = ["all", "created", "in_progress", "completed"];

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
        setLoadError(error instanceof Error ? error.message : "Backend is not available");
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
          <p className="text-sm text-primary">Interviews</p>
          <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search interviews" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button key={item} variant={filter === item ? "default" : "secondary"} size="sm" onClick={() => setFilter(item)}>
            {item}
          </Button>
        ))}
      </div>

      {loading ? <LoadingState label="Loading interviews" /> : null}
      {!loading && loadError ? (
        <EmptyState title="Backend unavailable" description={loadError} actionHref="/" actionLabel="Back home" />
      ) : null}
      {!loading && !loadError && filtered.length === 0 ? (
        <EmptyState title="No interviews found" description="Create a new interview, upload documents, and start a voice session." actionHref="/interviews/new" actionLabel="New interview" />
      ) : null}
      {!loading && !loadError && filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((interview) => <InterviewCard key={interview.id} interview={interview} />)}
        </div>
      ) : null}
    </AppLayout>
  );
}

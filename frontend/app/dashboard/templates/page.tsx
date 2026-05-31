"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ListChecks, PlusCircle, Shapes } from "lucide-react";
import { motion } from "framer-motion";

import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { TemplateCard } from "@/components/templates/template-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteTemplate, listTemplates } from "@/lib/services/templates";
import type { InterviewTemplate } from "@/types/api";

export default function TemplatesListPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async function loadData() {
    setLoading(true);
    try {
      setTemplates(await listTemplates());
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudieron cargar plantillas",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(templateId: string) {
    try {
      await deleteTemplate(templateId);
      showToast({ kind: "success", title: "Plantilla eliminada" });
      await loadData();
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return templates.filter((template) =>
      `${template.title} ${template.role_name} ${template.description}`.toLowerCase().includes(term),
    );
  }, [search, templates]);

  const stats = useMemo(() => {
    const requirements = templates.reduce((sum, item) => sum + item.requirements.length, 0);
    const questions = templates.reduce((sum, item) => sum + item.questions.length, 0);
    return { templates: templates.length, requirements, questions };
  }, [templates]);

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Plantillas"
        title="Plantillas de entrevista"
        description="Administra los perfiles, requisitos y bancos de preguntas que alimentan las entrevistas por voz."
        actions={
          <Button asChild>
            <Link href="/dashboard/templates/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear plantilla
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Plantillas" value={stats.templates} detail="Perfiles activos" icon={Shapes} />
        <StatCard label="Requisitos" value={stats.requirements} detail="Criterios evaluables" icon={ListChecks} tone="accent" />
        <StatCard label="Preguntas" value={stats.questions} detail="Banco disponible" icon={FileText} tone="success" />
      </div>

      <section className="admin-panel p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} resultados</p>
          <SearchBox placeholder="Buscar plantilla o puesto" value={search} onChange={setSearch} />
        </div>

        {loading ? <LoadingState label="Cargando plantillas" /> : null}
        {!loading && templates.length === 0 ? (
          <EmptyState
            title="No hay plantillas"
            description="Crea la primera plantilla para iniciar entrevistas por puesto."
            actionHref="/dashboard/templates/new"
            actionLabel="Crear plantilla"
          />
        ) : null}
        {!loading && templates.length > 0 && filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ajusta la busqueda para ver otras plantillas." />
        ) : null}
        {!loading && filtered.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {filtered.map((template) => (
              <TemplateCard key={template.id} template={template} onDelete={handleDelete} />
            ))}
          </motion.div>
        ) : null}
      </section>
    </AppLayout>
  );
}

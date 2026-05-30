"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

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

  async function loadData() {
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
  }

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <AppLayout>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-primary">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold">Plantillas de entrevista</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/templates/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear plantilla
          </Link>
        </Button>
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
      {!loading && templates.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} onDelete={handleDelete} />
          ))}
        </motion.div>
      ) : null}
    </AppLayout>
  );
}

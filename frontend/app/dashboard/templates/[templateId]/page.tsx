"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { LoadingState } from "@/components/feedback/loading-state";
import { AppLayout } from "@/components/layout/app-layout";
import { QuestionEditor } from "@/components/templates/question-editor";
import { RequirementEditor } from "@/components/templates/requirement-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  addQuestion,
  addRequirement,
  getTemplate,
  updateQuestion,
  updateRequirement,
  updateTemplate,
  deleteQuestion,
  deleteRequirement,
} from "@/lib/services/templates";
import type { InterviewTemplate } from "@/types/api";

export default function TemplateDetailPage() {
  const { showToast } = useToast();
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;
  const [template, setTemplate] = useState<InterviewTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalForm, setGeneralForm] = useState({ title: "", description: "", role_name: "" });

  async function loadTemplate() {
    setLoading(true);
    try {
      const data = await getTemplate(templateId);
      setTemplate(data);
      setGeneralForm({ title: data.title, description: data.description, role_name: data.role_name });
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo cargar plantilla", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  async function handleSaveGeneral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingGeneral(true);
    try {
      await updateTemplate(templateId, generalForm);
      showToast({ kind: "success", title: "Datos generales actualizados" });
      await loadTemplate();
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo actualizar", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setSavingGeneral(false);
    }
  }

  if (loading || !template) {
    return (
      <AppLayout>
        <LoadingState label="Cargando plantilla" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-primary">Plantillas</p>
        <h1 className="mt-1 text-3xl font-semibold">{template.title}</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSaveGeneral} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={generalForm.title} onChange={(event) => setGeneralForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Puesto</Label>
                <Input id="role" value={generalForm.role_name} onChange={(event) => setGeneralForm((prev) => ({ ...prev, role_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" value={generalForm.description} onChange={(event) => setGeneralForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <Button type="submit" disabled={savingGeneral}>
                {savingGeneral ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader><CardTitle>Requisitos</CardTitle></CardHeader>
          <CardContent>
            <RequirementEditor
              requirements={template.requirements}
              onCreate={async (payload) => {
                try {
                  await addRequirement(templateId, payload);
                  showToast({ kind: "success", title: "Requisito agregado" });
                  await loadTemplate();
                } catch (error) {
                  showToast({ kind: "error", title: "No se pudo agregar requisito", description: error instanceof Error ? error.message : "Error inesperado" });
                }
              }}
              onUpdate={async (requirementId, payload) => {
                try {
                  await updateRequirement(requirementId, payload);
                  showToast({ kind: "success", title: "Requisito actualizado" });
                  await loadTemplate();
                } catch (error) {
                  showToast({ kind: "error", title: "No se pudo actualizar requisito", description: error instanceof Error ? error.message : "Error inesperado" });
                }
              }}
              onDelete={async (requirementId) => {
                try {
                  await deleteRequirement(requirementId);
                  showToast({ kind: "success", title: "Requisito eliminado" });
                  await loadTemplate();
                } catch (error) {
                  showToast({ kind: "error", title: "No se pudo eliminar requisito", description: error instanceof Error ? error.message : "Error inesperado" });
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel mt-6">
        <CardHeader><CardTitle>Preguntas</CardTitle></CardHeader>
        <CardContent>
          <QuestionEditor
            questions={template.questions}
            requirements={template.requirements}
            onCreate={async (payload) => {
              try {
                await addQuestion(templateId, payload);
                showToast({ kind: "success", title: "Pregunta agregada" });
                await loadTemplate();
              } catch (error) {
                showToast({ kind: "error", title: "No se pudo agregar pregunta", description: error instanceof Error ? error.message : "Error inesperado" });
              }
            }}
            onUpdate={async (questionId, payload) => {
              try {
                await updateQuestion(questionId, payload);
                showToast({ kind: "success", title: "Pregunta actualizada" });
                await loadTemplate();
              } catch (error) {
                showToast({ kind: "error", title: "No se pudo actualizar pregunta", description: error instanceof Error ? error.message : "Error inesperado" });
              }
            }}
            onDelete={async (questionId) => {
              try {
                await deleteQuestion(questionId);
                showToast({ kind: "success", title: "Pregunta eliminada" });
                await loadTemplate();
              } catch (error) {
                showToast({ kind: "error", title: "No se pudo eliminar pregunta", description: error instanceof Error ? error.message : "Error inesperado" });
              }
            }}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}

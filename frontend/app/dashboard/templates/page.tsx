"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  addQuestion,
  addRequirement,
  createTemplate,
  deleteQuestion,
  deleteRequirement,
  deleteTemplate,
  listTemplates,
} from "@/lib/services/templates";
import type { InterviewTemplate } from "@/types/api";

export default function TemplatesPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: "", description: "", role_name: "" });
  const [requirementForm, setRequirementForm] = useState({ skill_name: "", description: "", weight: "1" });
  const [questionForm, setQuestionForm] = useState({
    requirement_id: "",
    question_text: "",
    expected_answer: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    points: "1",
    is_required: true,
    order_index: "0",
  });

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await listTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id);
      }
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
    loadTemplates();
  }, []);

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTemplate(true);
    try {
      const created = await createTemplate(templateForm);
      setTemplateForm({ title: "", description: "", role_name: "" });
      await loadTemplates();
      setSelectedTemplateId(created.id);
      showToast({ kind: "success", title: "Plantilla creada" });
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo crear",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setSubmittingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplate) return;
    try {
      await deleteTemplate(selectedTemplate.id);
      showToast({ kind: "success", title: "Plantilla eliminada" });
      setSelectedTemplateId("");
      await loadTemplates();
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo eliminar", description: error instanceof Error ? error.message : "Error inesperado" });
    }
  }

  async function handleAddRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplate) return;
    try {
      await addRequirement(selectedTemplate.id, {
        skill_name: requirementForm.skill_name,
        description: requirementForm.description,
        weight: Number(requirementForm.weight || 1),
      });
      setRequirementForm({ skill_name: "", description: "", weight: "1" });
      await loadTemplates();
      showToast({ kind: "success", title: "Requisito agregado" });
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo agregar requisito", description: error instanceof Error ? error.message : "Error inesperado" });
    }
  }

  async function handleAddQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplate) return;
    try {
      await addQuestion(selectedTemplate.id, {
        requirement_id: questionForm.requirement_id || null,
        question_text: questionForm.question_text,
        expected_answer: questionForm.expected_answer,
        difficulty: questionForm.difficulty,
        points: Number(questionForm.points || 1),
        is_required: questionForm.is_required,
        order_index: Number(questionForm.order_index || 0),
      });
      setQuestionForm({
        requirement_id: "",
        question_text: "",
        expected_answer: "",
        difficulty: "medium",
        points: "1",
        is_required: true,
        order_index: "0",
      });
      await loadTemplates();
      showToast({ kind: "success", title: "Pregunta agregada" });
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo agregar pregunta", description: error instanceof Error ? error.message : "Error inesperado" });
    }
  }

  async function handleDeleteRequirement(requirementId: string) {
    try {
      await deleteRequirement(requirementId);
      await loadTemplates();
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo eliminar requisito", description: error instanceof Error ? error.message : "Error inesperado" });
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    try {
      await deleteQuestion(questionId);
      await loadTemplates();
    } catch (error) {
      showToast({ kind: "error", title: "No se pudo eliminar pregunta", description: error instanceof Error ? error.message : "Error inesperado" });
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-primary">Admin</p>
        <h1 className="mt-1 text-3xl font-semibold">Plantillas de entrevista</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Nueva plantilla</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="title">Titulo</Label>
                <Input id="title" required value={templateForm.title} onChange={(event) => setTemplateForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Puesto</Label>
                <Input id="role" required value={templateForm.role_name} onChange={(event) => setTemplateForm((prev) => ({ ...prev, role_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Descripcion</Label>
                <Textarea id="desc" required value={templateForm.description} onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={submittingTemplate}>
                {submittingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Crear plantilla
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Plantillas existentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : null}
            {!loading && templates.length === 0 ? <p className="text-sm text-muted-foreground">Aun no hay plantillas.</p> : null}
            {!loading && templates.length > 0 ? (
              <div className="grid gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`rounded-md border p-3 text-left ${selectedTemplateId === template.id ? "border-primary bg-primary/10" : "border-border bg-muted/10"}`}
                  >
                    <p className="font-medium">{template.title}</p>
                    <p className="text-xs text-muted-foreground">{template.role_name}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {selectedTemplate ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Requisitos</CardTitle>
              <Button size="sm" className="bg-red-600 hover:bg-red-500" onClick={handleDeleteTemplate}>
                Eliminar plantilla
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddRequirement} className="space-y-3">
                <Input placeholder="Skill (ej. PostgreSQL)" required value={requirementForm.skill_name} onChange={(event) => setRequirementForm((prev) => ({ ...prev, skill_name: event.target.value }))} />
                <Input placeholder="Descripcion" value={requirementForm.description} onChange={(event) => setRequirementForm((prev) => ({ ...prev, description: event.target.value }))} />
                <Input type="number" min={0} step={0.1} placeholder="Peso" value={requirementForm.weight} onChange={(event) => setRequirementForm((prev) => ({ ...prev, weight: event.target.value }))} />
                <Button type="submit" className="w-full">Agregar requisito</Button>
              </form>
              <div className="space-y-2">
                {selectedTemplate.requirements.map((requirement) => (
                  <div key={requirement.id} className="flex items-center justify-between rounded-md border border-border p-2">
                    <div>
                      <p className="text-sm font-medium">{requirement.skill_name}</p>
                      <p className="text-xs text-muted-foreground">Peso {requirement.weight}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteRequirement(requirement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Preguntas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddQuestion} className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={questionForm.requirement_id}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, requirement_id: event.target.value }))}
                >
                  <option value="">Sin skill asociada</option>
                  {selectedTemplate.requirements.map((requirement) => (
                    <option key={requirement.id} value={requirement.id}>{requirement.skill_name}</option>
                  ))}
                </select>
                <Textarea placeholder="Pregunta" required value={questionForm.question_text} onChange={(event) => setQuestionForm((prev) => ({ ...prev, question_text: event.target.value }))} />
                <Textarea placeholder="Respuesta esperada" required value={questionForm.expected_answer} onChange={(event) => setQuestionForm((prev) => ({ ...prev, expected_answer: event.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={questionForm.difficulty}
                    onChange={(event) => setQuestionForm((prev) => ({ ...prev, difficulty: event.target.value as "easy" | "medium" | "hard" }))}
                  >
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                  <Input type="number" min={0} step={0.5} value={questionForm.points} onChange={(event) => setQuestionForm((prev) => ({ ...prev, points: event.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={0} value={questionForm.order_index} onChange={(event) => setQuestionForm((prev) => ({ ...prev, order_index: event.target.value }))} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={questionForm.is_required} onChange={(event) => setQuestionForm((prev) => ({ ...prev, is_required: event.target.checked }))} />
                    Obligatoria
                  </label>
                </div>
                <Button type="submit" className="w-full">Agregar pregunta</Button>
              </form>

              <div className="space-y-2">
                {selectedTemplate.questions.map((question) => (
                  <div key={question.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{question.order_index + 1}. {question.question_text}</p>
                        <p className="text-xs text-muted-foreground">{question.difficulty} · {question.points} pts</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteQuestion(question.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AppLayout>
  );
}

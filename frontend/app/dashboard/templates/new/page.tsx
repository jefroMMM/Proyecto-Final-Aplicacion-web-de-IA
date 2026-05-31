"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ListChecks, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createTemplate } from "@/lib/services/templates";
import type { TemplateDifficulty } from "@/types/api";

type DraftRequirement = {
  id: string;
  skill_name: string;
  description: string;
  weight: number;
};

type DraftQuestion = {
  id: string;
  question_text: string;
  expected_answer: string;
  requirement_refs: string[];
  question_type: string;
  difficulty: TemplateDifficulty;
  points: number;
  is_required: boolean;
  order_index: number;
};

export default function NewTemplatePage() {
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({ title: "", description: "", role_name: "" });
  const [requirements, setRequirements] = useState<DraftRequirement[]>([]);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [requirementForm, setRequirementForm] = useState({
    skill_name: "",
    description: "",
    weight: "1",
  });
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    expected_answer: "",
    requirement_refs: [] as string[],
    question_type: "technical",
    difficulty: "medium" as TemplateDifficulty,
    points: "1",
    is_required: true,
    order_index: "0",
  });

  const canSubmit = useMemo(() => {
    return form.title.trim() && form.role_name.trim() && form.description.trim() && questions.some((item) => item.is_required);
  }, [form.description, form.role_name, form.title, questions]);

  function handleAddRequirement() {
    const skill = requirementForm.skill_name.trim();
    if (!skill) return;
    setRequirements((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        skill_name: skill,
        description: requirementForm.description.trim(),
        weight: Number(requirementForm.weight || "1"),
      },
    ]);
    setRequirementForm({ skill_name: "", description: "", weight: "1" });
  }

  function handleAddQuestion() {
    const questionText = questionForm.question_text.trim();
    const expectedAnswer = questionForm.expected_answer.trim();
    if (!questionText || !expectedAnswer) return;

    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question_text: questionText,
        expected_answer: expectedAnswer,
        requirement_refs: questionForm.requirement_refs,
        question_type: questionForm.question_type,
        difficulty: questionForm.difficulty,
        points: Number(questionForm.points || "1"),
        is_required: questionForm.is_required,
        order_index: Number(questionForm.order_index || "0"),
      },
    ]);
    setQuestionForm({
      question_text: "",
      expected_answer: "",
      requirement_refs: [],
      question_type: "technical",
      difficulty: "medium",
      points: "1",
      is_required: true,
      order_index: "0",
    });
  }

  async function handleSubmit() {
    if (!canSubmit) {
      showToast({
        kind: "error",
        title: "Plantilla incompleta",
        description: "Agrega al menos una pregunta marcada como obligatoria.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const template = await createTemplate({
        ...form,
        requirements: requirements.map((item) => ({
          skill_name: item.skill_name,
          description: item.description,
          weight: item.weight,
        })),
        questions: questions.map((item) => ({
          question_text: item.question_text,
          expected_answer: item.expected_answer,
          requirement_indexes: item.requirement_refs
            .map((id) => requirements.findIndex((requirement) => requirement.id === id))
            .filter((index) => index >= 0),
          question_type: item.question_type,
          difficulty: item.difficulty,
          points: item.points,
          is_required: item.is_required,
          order_index: item.order_index,
        })),
      });

      showToast({
        kind: "success",
        title: "Plantilla creada",
        description: `Se guardaron ${requirements.length} requisitos y ${questions.length} preguntas.`,
      });
      router.push(`/dashboard/templates/${template.id}`);
    } catch (error) {
      showToast({
        kind: "error",
        title: "No se pudo crear",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Plantillas"
        title="Nueva plantilla"
        description="Define el perfil del puesto, los requisitos medibles y las preguntas base de evaluacion."
        actions={
          <Button asChild variant="secondary">
            <Link href="/dashboard/templates">Volver a plantillas</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatCard label="Requisitos" value={requirements.length} detail="Pendientes de guardar" icon={ListChecks} />
        <StatCard label="Preguntas" value={questions.length} detail="Pendientes de guardar" icon={FileText} tone="accent" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.55fr)]">
        <div className="grid gap-6">
          <Card className="glass-panel">
            <CardHeader className="border-b border-border"><CardTitle>Datos generales</CardTitle></CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="title">Titulo</Label>
                  <Input id="title" required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role_name">Puesto</Label>
                  <Input id="role_name" required value={form.role_name} onChange={(event) => setForm((prev) => ({ ...prev, role_name: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripcion</Label>
                <Textarea id="description" required value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="border-b border-border"><CardTitle>Requisitos</CardTitle></CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div className="admin-muted-panel grid gap-3 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_7rem]">
                  <Input placeholder="Skill (ej. PostgreSQL)" value={requirementForm.skill_name} onChange={(event) => setRequirementForm((prev) => ({ ...prev, skill_name: event.target.value }))} />
                  <Input type="number" min={0} step={0.1} value={requirementForm.weight} onChange={(event) => setRequirementForm((prev) => ({ ...prev, weight: event.target.value }))} />
                </div>
                <Textarea placeholder="Descripcion del requisito" value={requirementForm.description} onChange={(event) => setRequirementForm((prev) => ({ ...prev, description: event.target.value }))} />
                <Button type="button" variant="secondary" onClick={handleAddRequirement}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar requisito
                </Button>
              </div>

              <DraftList empty="Aun no agregas requisitos.">
                {requirements.map((item) => (
                  <div key={item.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.skill_name}</p>
                        <p className="text-xs text-muted-foreground">Peso {item.weight}</p>
                        {item.description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p> : null}
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setRequirements((prev) => prev.filter((value) => value.id !== item.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </DraftList>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="border-b border-border"><CardTitle>Preguntas</CardTitle></CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div className="admin-muted-panel grid gap-3 p-4">
                <Textarea placeholder="Pregunta tecnica" value={questionForm.question_text} onChange={(event) => setQuestionForm((prev) => ({ ...prev, question_text: event.target.value }))} />
                <Textarea placeholder="Respuesta esperada" value={questionForm.expected_answer} onChange={(event) => setQuestionForm((prev) => ({ ...prev, expected_answer: event.target.value }))} />
                <div className="grid gap-3 md:grid-cols-[1fr_9rem_9rem_8rem]">
                  <select className="h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm" value={questionForm.question_type} onChange={(event) => setQuestionForm((prev) => ({ ...prev, question_type: event.target.value }))}>
                    <option value="technical">Técnica</option>
                    <option value="experience">Experiencia</option>
                    <option value="situational">Situacional</option>
                    <option value="safety">Seguridad</option>
                  </select>
                  <select className="h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm" value={questionForm.difficulty} onChange={(event) => setQuestionForm((prev) => ({ ...prev, difficulty: event.target.value as TemplateDifficulty }))}>
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                  <Input type="number" min={0} step={0.5} value={questionForm.points} onChange={(event) => setQuestionForm((prev) => ({ ...prev, points: event.target.value }))} />
                  <Input type="number" min={0} value={questionForm.order_index} onChange={(event) => setQuestionForm((prev) => ({ ...prev, order_index: event.target.value }))} />
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Requisitos relacionados</p>
                  {requirements.length === 0 ? <p className="text-sm text-muted-foreground">Agrega requisitos para asociarlos.</p> : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {requirements.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={questionForm.requirement_refs.includes(item.id)}
                          onChange={(event) => setQuestionForm((prev) => ({
                            ...prev,
                            requirement_refs: event.target.checked
                              ? [...prev.requirement_refs, item.id]
                              : prev.requirement_refs.filter((id) => id !== item.id),
                          }))}
                        />
                        {item.skill_name}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm">
                  <input type="checkbox" checked={questionForm.is_required} onChange={(event) => setQuestionForm((prev) => ({ ...prev, is_required: event.target.checked }))} />
                  Obligatoria
                </label>
                <Button type="button" variant="secondary" onClick={handleAddQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar pregunta
                </Button>
              </div>

              <DraftList empty="Aun no agregas preguntas.">
                {questions.map((item, index) => (
                  <div key={item.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{index + 1}. {item.question_text}</p>
                          <Badge variant="secondary">{item.difficulty}</Badge>
                          <Badge variant="secondary">{item.question_type}</Badge>
                          <Badge variant="secondary">{item.points} pts</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.expected_answer}</p>
                        <RequirementNames requirementIds={item.requirement_refs} requirements={requirements} />
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setQuestions((prev) => prev.filter((value) => value.id !== item.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </DraftList>
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="glass-panel">
            <CardHeader className="border-b border-border"><CardTitle>Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div>
                <p className="text-sm font-medium">{form.title || "Titulo de plantilla"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{form.role_name || "Puesto asociado"}</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{form.description || "La descripcion aparecera aqui mientras completas la plantilla."}</p>
              <Button type="button" className="w-full" onClick={() => void handleSubmit()} disabled={submitting || !canSubmit}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar plantilla
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppLayout>
  );
}

function DraftList({ children, empty }: { children: React.ReactNode; empty: string }) {
  return (
    <div className="space-y-2">
      {Array.isArray(children) && children.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">{empty}</p>
      ) : children}
    </div>
  );
}

function RequirementNames({
  requirementIds,
  requirements,
}: {
  requirementIds: string[];
  requirements: DraftRequirement[];
}) {
  const names = requirementIds
    .map((id) => requirements.find((item) => item.id === id)?.skill_name)
    .filter(Boolean);
  if (names.length === 0) {
    return <p className="mt-2 text-xs text-muted-foreground">Relacionada con: sin requisitos</p>;
  }
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Relacionada con: {names.join(", ")}
    </p>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addQuestion, addRequirement, createTemplate } from "@/lib/services/templates";
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
  requirement_ref: string;
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
    requirement_ref: "",
    difficulty: "medium" as TemplateDifficulty,
    points: "1",
    is_required: true,
    order_index: "0",
  });

  const canSubmit = useMemo(() => {
    return form.title.trim() && form.role_name.trim() && form.description.trim();
  }, [form.description, form.role_name, form.title]);

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
        requirement_ref: questionForm.requirement_ref,
        difficulty: questionForm.difficulty,
        points: Number(questionForm.points || "1"),
        is_required: questionForm.is_required,
        order_index: Number(questionForm.order_index || "0"),
      },
    ]);
    setQuestionForm({
      question_text: "",
      expected_answer: "",
      requirement_ref: "",
      difficulty: "medium",
      points: "1",
      is_required: true,
      order_index: "0",
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const template = await createTemplate(form);

      const requirementIdByDraftId = new Map<string, string>();
      for (const item of requirements) {
        const created = await addRequirement(template.id, {
          skill_name: item.skill_name,
          description: item.description,
          weight: item.weight,
        });
        requirementIdByDraftId.set(item.id, created.id);
      }

      for (const item of questions) {
        await addQuestion(template.id, {
          question_text: item.question_text,
          expected_answer: item.expected_answer,
          requirement_id: item.requirement_ref ? requirementIdByDraftId.get(item.requirement_ref) ?? null : null,
          difficulty: item.difficulty,
          points: item.points,
          is_required: item.is_required,
          order_index: item.order_index,
        });
      }

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
      <div className="mb-6">
        <p className="text-sm text-primary">Plantillas</p>
        <h1 className="mt-1 text-3xl font-semibold">Nueva plantilla</h1>
      </div>

      <div className="space-y-6">
        <Card className="glass-panel max-w-4xl">
          <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role_name">Puesto</Label>
              <Input id="role_name" required value={form.role_name} onChange={(event) => setForm((prev) => ({ ...prev, role_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" required value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel max-w-4xl">
          <CardHeader><CardTitle>Requisitos de la plantilla</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                required
                placeholder="Skill (ej. PostgreSQL)"
                value={requirementForm.skill_name}
                onChange={(event) => setRequirementForm((prev) => ({ ...prev, skill_name: event.target.value }))}
              />
              <Textarea
                placeholder="Descripción del requisito"
                value={requirementForm.description}
                onChange={(event) => setRequirementForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <Input
                type="number"
                min={0}
                step={0.1}
                value={requirementForm.weight}
                onChange={(event) => setRequirementForm((prev) => ({ ...prev, weight: event.target.value }))}
              />
              <Button type="button" variant="secondary" onClick={handleAddRequirement}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar requisito
              </Button>
            </div>

            <div className="space-y-2">
              {requirements.length === 0 ? <p className="text-sm text-muted-foreground">Aún no agregas requisitos.</p> : null}
              {requirements.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/15 p-3">
                  <div>
                    <p className="font-medium">{item.skill_name}</p>
                    <p className="text-xs text-muted-foreground">Peso {item.weight}</p>
                    {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setRequirements((prev) => prev.filter((value) => value.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel max-w-4xl">
          <CardHeader><CardTitle>Posibles preguntas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                required
                placeholder="Pregunta técnica"
                value={questionForm.question_text}
                onChange={(event) => setQuestionForm((prev) => ({ ...prev, question_text: event.target.value }))}
              />
              <Textarea
                required
                placeholder="Respuesta esperada"
                value={questionForm.expected_answer}
                onChange={(event) => setQuestionForm((prev) => ({ ...prev, expected_answer: event.target.value }))}
              />
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={questionForm.requirement_ref}
                onChange={(event) => setQuestionForm((prev) => ({ ...prev, requirement_ref: event.target.value }))}
              >
                <option value="">Sin skill asociada</option>
                {requirements.map((item) => <option key={item.id} value={item.id}>{item.skill_name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={questionForm.difficulty}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, difficulty: event.target.value as TemplateDifficulty }))}
                >
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={questionForm.points}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, points: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  value={questionForm.order_index}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, order_index: event.target.value }))}
                />
                <label className="flex items-center gap-2 rounded-md border border-border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={questionForm.is_required}
                    onChange={(event) => setQuestionForm((prev) => ({ ...prev, is_required: event.target.checked }))}
                  />
                  Obligatoria
                </label>
              </div>
              <Button type="button" variant="secondary" onClick={handleAddQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar pregunta
              </Button>
            </div>

            <div className="space-y-2">
              {questions.length === 0 ? <p className="text-sm text-muted-foreground">Aún no agregas preguntas.</p> : null}
              {questions.map((item, index) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/15 p-3">
                  <div>
                    <p className="font-medium">{index + 1}. {item.question_text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.difficulty} · {item.points} pts · orden {item.order_index}</p>
                    {item.requirement_ref ? (
                      <Badge variant="secondary" className="mt-2">
                        {requirements.find((value) => value.id === item.requirement_ref)?.skill_name ?? "Skill"}
                      </Badge>
                    ) : null}
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setQuestions((prev) => prev.filter((value) => value.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !canSubmit}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar plantilla completa
        </Button>
      </div>
    </AppLayout>
  );
}

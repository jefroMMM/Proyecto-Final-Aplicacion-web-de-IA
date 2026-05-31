import { FormEvent, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateDifficulty, TemplateQuestion, TemplateRequirement } from "@/types/api";

export function QuestionEditor({
  questions,
  requirements,
  onCreate,
  onUpdate,
  onDelete,
}: {
  questions: TemplateQuestion[];
  requirements: TemplateRequirement[];
  onCreate: (payload: {
    question_text: string;
    expected_answer: string;
    requirement_id?: string | null;
    difficulty: TemplateDifficulty;
    points: number;
    is_required: boolean;
    order_index: number;
  }) => Promise<void>;
  onUpdate: (questionId: string, payload: Partial<{
    question_text: string;
    expected_answer: string;
    requirement_id?: string | null;
    difficulty: TemplateDifficulty;
    points: number;
    is_required: boolean;
    order_index: number;
  }>) => Promise<void>;
  onDelete: (questionId: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    question_text: "",
    expected_answer: "",
    requirement_id: "",
    difficulty: "medium" as TemplateDifficulty,
    points: "1",
    is_required: true,
    order_index: "0",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      question_text: form.question_text,
      expected_answer: form.expected_answer,
      requirement_id: form.requirement_id || null,
      difficulty: form.difficulty,
      points: Number(form.points || 1),
      is_required: form.is_required,
      order_index: Number(form.order_index || 0),
    });
    setForm({
      question_text: "",
      expected_answer: "",
      requirement_id: "",
      difficulty: "medium",
      points: "1",
      is_required: true,
      order_index: "0",
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="admin-muted-panel grid gap-3 p-4">
        <div className="grid gap-2">
          <Label htmlFor="question_text">Pregunta</Label>
          <Textarea
            id="question_text"
            required
            placeholder="Pregunta tecnica"
            value={form.question_text}
            onChange={(event) => setForm((prev) => ({ ...prev, question_text: event.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expected_answer">Respuesta esperada</Label>
          <Textarea
            id="expected_answer"
            required
            placeholder="Criterios de una buena respuesta"
            value={form.expected_answer}
            onChange={(event) => setForm((prev) => ({ ...prev, expected_answer: event.target.value }))}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="requirement_id">Requisito asociado</Label>
            <select
              id="requirement_id"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.requirement_id}
              onChange={(event) => setForm((prev) => ({ ...prev, requirement_id: event.target.value }))}
            >
              <option value="">Sin requisito</option>
              {requirements.map((item) => <option key={item.id} value={item.id}>{item.skill_name}</option>)}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="difficulty">Dificultad</Label>
            <select
              id="difficulty"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.difficulty}
              onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value as TemplateDifficulty }))}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="points">Puntos</Label>
            <Input id="points" type="number" min={0} step={0.5} value={form.points} onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="order_index">Orden</Label>
            <Input id="order_index" type="number" min={0} value={form.order_index} onChange={(event) => setForm((prev) => ({ ...prev, order_index: event.target.value }))} />
          </div>
          <label className="mt-6 flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm">
            <input type="checkbox" checked={form.is_required} onChange={(event) => setForm((prev) => ({ ...prev, is_required: event.target.checked }))} />
            Obligatoria
          </label>
        </div>
        <Button type="submit" variant="secondary">
          <Plus className="mr-2 h-4 w-4" />
          Agregar pregunta
        </Button>
      </form>

      <div className="space-y-2">
        {questions.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Aun no hay preguntas.</p>
        ) : null}
        {questions.map((question) => (
          <QuestionRow
            key={question.id}
            question={question}
            requirements={requirements}
            isEditing={editingId === question.id}
            onStartEditing={() => setEditingId(question.id)}
            onCancelEditing={() => setEditingId(null)}
            onSave={async (payload) => {
              await onUpdate(question.id, payload);
              setEditingId(null);
            }}
            onDelete={() => onDelete(question.id)}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionRow({
  question,
  requirements,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onSave,
  onDelete,
}: {
  question: TemplateQuestion;
  requirements: TemplateRequirement[];
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: (payload: Partial<{
    question_text: string;
    expected_answer: string;
    requirement_id?: string | null;
    difficulty: TemplateDifficulty;
    points: number;
    is_required: boolean;
    order_index: number;
  }>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    question_text: question.question_text,
    expected_answer: question.expected_answer,
    requirement_id: question.requirement_id ?? "",
    difficulty: question.difficulty as TemplateDifficulty,
    points: String(question.points),
    is_required: question.is_required,
    order_index: String(question.order_index),
  });
  const requirement = requirements.find((item) => item.id === question.requirement_id);

  if (!isEditing) {
    return (
      <div className="rounded-md border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{question.order_index + 1}. {question.question_text}</p>
              <Badge variant="secondary">{question.difficulty}</Badge>
              <Badge variant="secondary">{question.points} pts</Badge>
              {requirement ? <Badge>{requirement.skill_name}</Badge> : null}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{question.expected_answer}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" onClick={onStartEditing} aria-label="Editar pregunta"><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Eliminar pregunta"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-3">
      <Textarea value={draft.question_text} onChange={(event) => setDraft((prev) => ({ ...prev, question_text: event.target.value }))} />
      <Textarea value={draft.expected_answer} onChange={(event) => setDraft((prev) => ({ ...prev, expected_answer: event.target.value }))} />
      <select
        className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={draft.requirement_id}
        onChange={(event) => setDraft((prev) => ({ ...prev, requirement_id: event.target.value }))}
      >
        <option value="">Sin requisito</option>
        {requirements.map((item) => <option key={item.id} value={item.id}>{item.skill_name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select
          className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={draft.difficulty}
          onChange={(event) => setDraft((prev) => ({ ...prev, difficulty: event.target.value as TemplateDifficulty }))}
        >
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
        <Input type="number" min={0} step={0.5} value={draft.points} onChange={(event) => setDraft((prev) => ({ ...prev, points: event.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" min={0} value={draft.order_index} onChange={(event) => setDraft((prev) => ({ ...prev, order_index: event.target.value }))} />
        <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 text-sm">
          <input type="checkbox" checked={draft.is_required} onChange={(event) => setDraft((prev) => ({ ...prev, is_required: event.target.checked }))} />
          Obligatoria
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave({
          question_text: draft.question_text,
          expected_answer: draft.expected_answer,
          requirement_id: draft.requirement_id || null,
          difficulty: draft.difficulty,
          points: Number(draft.points || 1),
          is_required: draft.is_required,
          order_index: Number(draft.order_index || 0),
        })}>Guardar</Button>
        <Button size="sm" variant="secondary" onClick={onCancelEditing}>Cancelar</Button>
      </div>
    </div>
  );
}

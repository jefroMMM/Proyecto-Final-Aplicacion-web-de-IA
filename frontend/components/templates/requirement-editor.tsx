import { FormEvent, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateRequirement } from "@/types/api";

export function RequirementEditor({
  requirements,
  onCreate,
  onUpdate,
  onDelete,
}: {
  requirements: TemplateRequirement[];
  onCreate: (payload: { skill_name: string; description: string; weight: number }) => Promise<void>;
  onUpdate: (requirementId: string, payload: { skill_name?: string; description?: string; weight?: number }) => Promise<void>;
  onDelete: (requirementId: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ skill_name: "", description: "", weight: "1" });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      skill_name: form.skill_name,
      description: form.description,
      weight: Number(form.weight || 1),
    });
    setForm({ skill_name: "", description: "", weight: "1" });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="space-y-2">
        <Input
          required
          placeholder="Skill"
          value={form.skill_name}
          onChange={(event) => setForm((prev) => ({ ...prev, skill_name: event.target.value }))}
        />
        <Textarea
          placeholder="Descripcion"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <Input
          type="number"
          min={0}
          step={0.1}
          placeholder="Weight"
          value={form.weight}
          onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
        />
        <Button type="submit" className="w-full">Agregar requisito</Button>
      </form>

      <div className="space-y-2">
        {requirements.map((requirement) => (
          <RequirementRow
            key={requirement.id}
            requirement={requirement}
            isEditing={editingId === requirement.id}
            onStartEditing={() => setEditingId(requirement.id)}
            onCancelEditing={() => setEditingId(null)}
            onSave={async (payload) => {
              await onUpdate(requirement.id, payload);
              setEditingId(null);
            }}
            onDelete={() => onDelete(requirement.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RequirementRow({
  requirement,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onSave,
  onDelete,
}: {
  requirement: TemplateRequirement;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: (payload: { skill_name?: string; description?: string; weight?: number }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    skill_name: requirement.skill_name,
    description: requirement.description,
    weight: String(requirement.weight),
  });

  if (!isEditing) {
    return (
      <div className="rounded-md border border-border bg-muted/15 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{requirement.skill_name}</p>
            <p className="text-xs text-muted-foreground">Peso {requirement.weight}</p>
            {requirement.description ? <p className="mt-1 text-sm text-muted-foreground">{requirement.description}</p> : null}
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onStartEditing}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3">
      <Input value={draft.skill_name} onChange={(event) => setDraft((prev) => ({ ...prev, skill_name: event.target.value }))} />
      <Textarea value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} />
      <Input type="number" min={0} step={0.1} value={draft.weight} onChange={(event) => setDraft((prev) => ({ ...prev, weight: event.target.value }))} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave({ skill_name: draft.skill_name, description: draft.description, weight: Number(draft.weight || 1) })}>Guardar</Button>
        <Button size="sm" variant="secondary" onClick={onCancelEditing}>Cancelar</Button>
      </div>
    </div>
  );
}

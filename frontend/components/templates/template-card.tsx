import Link from "next/link";
import { FileText, ListChecks, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewTemplate } from "@/types/api";

export function TemplateCard({
  template,
  onDelete,
}: {
  template: InterviewTemplate;
  onDelete: (templateId: string) => void;
}) {
  const previewRequirements = template.requirements.slice(0, 3);
  const hiddenRequirements = Math.max(0, template.requirements.length - previewRequirements.length);

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="line-clamp-2 text-lg">{template.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{template.role_name}</p>
          </div>
          <Badge variant="secondary">{template.questions.length} preguntas</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{template.description}</p>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="admin-muted-panel p-3">
            <ListChecks className="mb-2 h-4 w-4 text-primary" />
            <p className="font-semibold">{template.requirements.length}</p>
            <p className="text-xs text-muted-foreground">Requisitos</p>
          </div>
          <div className="admin-muted-panel p-3">
            <FileText className="mb-2 h-4 w-4 text-accent" />
            <p className="font-semibold">{template.questions.length}</p>
            <p className="text-xs text-muted-foreground">Preguntas</p>
          </div>
        </div>

        <div className="flex min-h-7 flex-wrap gap-2">
          {previewRequirements.map((item) => (
            <Badge key={item.id} variant="secondary">{item.skill_name}</Badge>
          ))}
          {hiddenRequirements > 0 ? <Badge variant="secondary">+{hiddenRequirements}</Badge> : null}
        </div>

        <div className="flex gap-2 border-t border-border pt-4">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/dashboard/templates/${template.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(template.id)} aria-label={`Eliminar ${template.title}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

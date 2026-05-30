import Link from "next/link";
import { FileText, ListChecks, Pencil, Trash2 } from "lucide-react";

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
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-lg">{template.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{template.role_name}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <ListChecks className="mb-1 h-4 w-4" />
            {template.requirements.length} requisitos
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <FileText className="mb-1 h-4 w-4" />
            {template.questions.length} preguntas
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/dashboard/templates/${template.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onDelete(template.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

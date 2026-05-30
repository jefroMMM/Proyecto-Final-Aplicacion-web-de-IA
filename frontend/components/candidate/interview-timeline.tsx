import { Badge } from "@/components/ui/badge";

export function InterviewTimeline({
  items,
}: {
  items: Array<{ role: "interviewer" | "candidate"; content: string; created_at?: string }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay historial de conversación.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <article key={`${item.role}-${index}`} className="rounded-md border border-border bg-muted/15 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={item.role === "interviewer" ? "secondary" : "default"}>
              {item.role === "interviewer" ? "Entrevistador" : "Candidato"}
            </Badge>
            {item.created_at ? <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleTimeString()}</span> : null}
          </div>
          <p className="text-sm text-slate-200">{item.content}</p>
        </article>
      ))}
    </div>
  );
}

import { Bot, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Transcript } from "@/types/api";

export function TranscriptTimeline({ items }: { items: Transcript[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-muted-foreground">
        Conversation turns will appear here after the interview starts.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isCandidate = item.role === "candidate";
        const Icon = isCandidate ? User : Bot;
        return (
          <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <Badge variant={isCandidate ? "secondary" : "default"}>{item.role}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm leading-6 text-foreground/90">{item.content}</p>
            {item.audio_url ? (
              <audio className="mt-3 w-full" controls src={item.audio_url} />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

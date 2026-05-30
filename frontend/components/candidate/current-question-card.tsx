import { Mic, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CurrentQuestionCard({
  question,
  listening,
  transcribing,
  analyzing,
}: {
  question: string;
  listening: boolean;
  transcribing: boolean;
  analyzing: boolean;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle>Pregunta actual</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg leading-8">{question || "Esperando siguiente pregunta..."}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {listening ? <span className="inline-flex items-center gap-2 text-emerald-300"><Mic className="h-4 w-4" /> Escuchando...</span> : null}
          {transcribing ? <span className="inline-flex items-center gap-2 text-cyan-300"><Loader2 className="h-4 w-4 animate-spin" /> Transcribiendo...</span> : null}
          {analyzing ? <span className="inline-flex items-center gap-2 text-violet-300"><Loader2 className="h-4 w-4 animate-spin" /> Analizando respuesta...</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

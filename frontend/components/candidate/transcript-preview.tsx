import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TranscriptPreview({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle>Tu transcripción</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-200">{text}</p>
      </CardContent>
    </Card>
  );
}

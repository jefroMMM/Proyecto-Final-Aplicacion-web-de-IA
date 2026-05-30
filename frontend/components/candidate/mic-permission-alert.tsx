import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function MicPermissionAlert({ message }: { message: string }) {
  return (
    <Card className="border-amber-400/30 bg-amber-500/10 text-white">
      <CardContent className="flex items-start gap-3 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
        <p className="text-sm text-amber-100">{message}</p>
      </CardContent>
    </Card>
  );
}

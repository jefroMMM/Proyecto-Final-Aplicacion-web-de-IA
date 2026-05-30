import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RecordingButton({
  isRecording,
  disabled,
  onStart,
  onStop,
}: {
  isRecording: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  if (isRecording) {
    return (
      <Button size="lg" variant="secondary" onClick={onStop} className="h-14 px-8 text-base">
        <Square className="mr-2 h-5 w-5" />
        Detener grabación
      </Button>
    );
  }

  return (
    <Button size="lg" onClick={onStart} disabled={disabled} className="h-14 px-8 text-base">
      <Mic className="mr-2 h-5 w-5" />
      Grabar respuesta
    </Button>
  );
}

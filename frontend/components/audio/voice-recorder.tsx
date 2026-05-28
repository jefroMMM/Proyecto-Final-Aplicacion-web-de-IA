"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import { WaveformVisualizer } from "@/components/audio/waveform-visualizer";
import { Button } from "@/components/ui/button";

export function VoiceRecorder({
  disabled,
  onRecordingReady,
}: {
  disabled?: boolean;
  onRecordingReady: (blob: Blob) => Promise<void> | void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const mimeType = preferredMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      await onRecordingReady(blob);
    };
    recorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <WaveformVisualizer active={isRecording} />
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{isRecording ? "Listening..." : "Ready to record"}</p>
          <p className="text-xs text-muted-foreground">Use your microphone to answer the current question.</p>
        </div>
        {isRecording ? (
          <Button variant="secondary" onClick={stopRecording}>
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        ) : (
          <Button disabled={disabled} onClick={startRecording}>
            <Mic className="mr-2 h-4 w-4" />
            Record
          </Button>
        )}
      </div>
    </div>
  );
}

function preferredMimeType(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

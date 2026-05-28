"use client";

import { CheckCircle2, FileUp, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface UploadCardProps {
  title: string;
  description: string;
  accept: string;
  file: File | null;
  progress: number;
  status: "idle" | "uploading" | "indexed" | "error";
  onFileChange: (file: File | null) => void;
}

export function UploadCard({
  title,
  description,
  accept,
  file,
  progress,
  status,
  onFileChange,
}: UploadCardProps) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <Label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6 text-center transition hover:bg-white/[0.06]">
          {status === "uploading" ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : status === "indexed" ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          ) : (
            <FileUp className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="mt-3 text-sm font-medium">{file?.name ?? "Choose file"}</span>
          <span className="mt-1 text-xs text-muted-foreground">{accept}</span>
          <input
            className="sr-only"
            type="file"
            accept={accept}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </Label>
        <div className="mt-4">
          <Progress value={progress} />
          <p className="mt-2 text-xs text-muted-foreground">
            {status === "indexed" ? "Uploaded and indexed by RAG" : `${progress}%`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

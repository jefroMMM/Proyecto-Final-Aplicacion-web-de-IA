"use client";

import { AlertCircle, CheckCircle2, FileText, FileUp, Loader2 } from "lucide-react";

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
  const selected = Boolean(file) && status === "idle";
  const ready = status === "indexed";
  const error = status === "error";
  const statusText = getStatusText({ status, selected, progress });

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <Label
          className={[
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition",
            ready ? "border-emerald-500/60 bg-emerald-500/10" : "",
            selected ? "border-blue-500/60 bg-blue-500/10" : "",
            error ? "border-destructive/60 bg-destructive/10" : "",
            !ready && !selected && !error ? "border-border bg-muted/30 hover:bg-muted/50" : "",
          ].join(" ")}
        >
          {status === "uploading" ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : status === "indexed" ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          ) : status === "error" ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : file ? (
            <FileText className="h-8 w-8 text-blue-500" />
          ) : (
            <FileUp className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="mt-3 max-w-full truncate text-sm font-medium">
            {file?.name ?? "Elegir archivo"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">{accept}</span>
          {file ? (
            <span className="mt-2 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          ) : null}
          <input
            className="sr-only"
            type="file"
            accept={accept}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </Label>
        <div className="mt-4">
          <Progress value={progress} />
          <p
            className={[
              "mt-2 text-xs",
              ready ? "text-emerald-600" : "",
              selected ? "text-blue-600" : "",
              error ? "text-destructive" : "",
              !ready && !selected && !error ? "text-muted-foreground" : "",
            ].join(" ")}
          >
            {statusText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusText({
  status,
  selected,
  progress,
}: {
  status: "idle" | "uploading" | "indexed" | "error";
  selected: boolean;
  progress: number;
}) {
  if (status === "uploading") return `Subiendo y preparando archivo... ${progress}%`;
  if (status === "indexed") return "PDF cargado, leído e indexado correctamente";
  if (status === "error") return "No se pudo cargar el PDF. Intenta nuevamente.";
  if (selected) return "PDF seleccionado, listo para crear la entrevista";
  return "Aún no has seleccionado un archivo";
}

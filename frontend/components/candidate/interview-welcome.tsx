import { motion } from "framer-motion";
import { PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InterviewWelcome({
  roleName,
  candidateName,
  interviewName,
  statusLabel,
  starting,
  onStart,
}: {
  roleName: string;
  candidateName: string;
  interviewName: string;
  statusLabel: string;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Bienvenido a tu entrevista técnica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <p>Entrevista: {interviewName}</p>
          <p>Puesto: {roleName}</p>
          <p>Candidato: {candidateName}</p>
          <p>Estado: {statusLabel}</p>
          <p>
            Responde por voz de forma clara. El sistema transcribirá tu respuesta y evaluará sobre texto.
          </p>
          <Button onClick={onStart} disabled={starting}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {starting ? "Iniciando..." : "Iniciar entrevista"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

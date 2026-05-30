import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";

export function InterviewFinished() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="border-emerald-400/30 bg-emerald-500/10 text-white">
        <CardContent className="flex items-center gap-3 p-5">
          <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          <div>
            <p className="font-medium">Entrevista finalizada</p>
            <p className="text-sm text-emerald-50/90">
              Gracias por participar. El reclutador revisará tu reporte técnico.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.kind];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              className={cn(
                "glass-panel flex gap-3 rounded-lg p-4",
                toast.kind === "error" && "border-red-400/25",
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{toast.description}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => dismissToast(toast.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

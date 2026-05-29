"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Database, FileSearch, Mic2, Radio, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const steps = [
  { title: "Carga el contexto", description: "El CV y la descripción del puesto se procesan, dividen e indexan para alimentar la entrevista.", icon: FileSearch },
  { title: "Realiza la entrevista", description: "La plataforma transcribe las respuestas y adapta las preguntas según la conversación.", icon: Radio },
  { title: "Genera el reporte", description: "La IA entrega puntajes, retroalimentación, nivel estimado y una recomendación final.", icon: BrainCircuit },
];

const tech = ["Next.js 15", "FastAPI", "LangGraph", "OpenAI", "AssemblyAI", "Cartesia", "PostgreSQL", "pgvector"];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mic2 className="h-5 w-5" />
          </div>
          <span className="font-semibold">Entrevistador Técnico IA</span>
        </Link>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Panel</Link>
        </Button>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-12 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
            Entrevistas por voz con IA y evaluación estructurada
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight md:text-7xl">
            Entrevistas técnicas que escuchan, se adaptan y evalúan con evidencia.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Una plataforma completa para entrevistas técnicas: voz, contexto del candidato, preguntas adaptativas y reportes finales claros.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/interviews/new">
                Iniciar entrevista
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">Ver panel</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12 }}
          className="glass-panel rounded-2xl p-5"
        >
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entrevista en curso</p>
                <p className="mt-1 text-xl font-semibold">Ingeniería Backend</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Volume2 className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-8 space-y-4">
              {["Contexto cargado", "Respuesta transcrita", "Siguiente pregunta lista"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">{index + 1}</span>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-10 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="glass-panel rounded-xl p-5"
            >
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-5 text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-10">
        <div className="glass-panel rounded-xl p-5">
          <p className="text-sm text-muted-foreground">Tecnologías usadas</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tech.map((item) => (
              <span key={item} className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
      <Database className="pointer-events-none absolute bottom-10 right-10 h-28 w-28 text-primary/5" />
    </main>
  );
}

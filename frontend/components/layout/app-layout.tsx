"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Mic2, Plus, X } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Sidebar className="hidden lg:flex" />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-foreground/35 lg:hidden">
          <div className="h-full w-72 bg-card shadow-xl">
            <div className="flex h-14 items-center justify-end border-b border-border px-3">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Cerrar menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar className="flex min-h-[calc(100vh-3.5rem)] border-r-0" onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
              <Link href="/" className="flex items-center gap-2 lg:hidden">
                <Mic2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">Entrevistador IA</span>
              </Link>
              <div className="hidden lg:block">
                <p className="text-sm font-medium">Centro administrativo</p>
                <p className="text-xs text-muted-foreground">Entrevistas tecnicas, plantillas y reportes</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/dashboard/interviews/new">
                <Plus className="mr-2 h-4 w-4" />
                Nueva entrevista
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

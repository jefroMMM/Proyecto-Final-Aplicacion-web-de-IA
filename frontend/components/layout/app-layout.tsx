import Link from "next/link";
import { Menu, Mic2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:px-8">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Mic2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Entrevistador IA</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden text-sm text-muted-foreground lg:block">
            Entrevistas técnicas por voz con evaluación estructurada
          </div>
          <Button asChild>
            <Link href="/dashboard/interviews/new">Nueva entrevista</Link>
          </Button>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

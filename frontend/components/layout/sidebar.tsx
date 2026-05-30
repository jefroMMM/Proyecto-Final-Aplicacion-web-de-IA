"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Mic2, PlusCircle, Sparkles, Shapes, ClipboardList } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/dashboard/templates", label: "Plantillas", icon: Shapes },
  { href: "/dashboard/interviews", label: "Entrevistas", icon: ClipboardList },
  { href: "/dashboard/interviews/new", label: "Nueva entrevista", icon: PlusCircle },
  { href: "/dashboard/interviews", label: "Reportes", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-border bg-card/85 px-4 py-5 backdrop-blur-xl lg:block">
      <Link href="/" className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mic2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Entrevistador IA</p>
          <p className="text-xs text-muted-foreground">Sistema por voz</p>
        </div>
      </Link>

      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                active && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-lg border border-primary/20 bg-primary/10 p-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <p className="mt-3 text-sm font-medium">Entrevistas con contexto</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Las preguntas se adaptan al CV, al puesto y a la conversación.
        </p>
      </div>
    </aside>
  );
}

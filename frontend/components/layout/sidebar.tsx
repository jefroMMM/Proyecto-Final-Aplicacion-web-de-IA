"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BarChart3, ClipboardList, LayoutDashboard, Mic2, PlusCircle, Shapes, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/dashboard/templates", label: "Plantillas", icon: Shapes },
  { href: "/dashboard/interviews", label: "Entrevistas", icon: ClipboardList },
  { href: "/dashboard/interviews/archived", label: "Archivadas", icon: Archive },
  { href: "/dashboard/interviews/new", label: "Nueva entrevista", icon: PlusCircle },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
];

export function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={cn("h-full min-h-screen w-72 shrink-0 flex-col border-r border-border bg-card px-4 py-5", className)}>
      <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-1" onClick={onNavigate}>
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Mic2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Entrevistador IA</p>
          <p className="text-xs text-muted-foreground">Administracion</p>
        </div>
      </Link>

      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.label}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                active && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <div className="rounded-lg border border-border bg-muted/35 p-4">
          <Sparkles className="h-5 w-5 text-accent" />
          <p className="mt-3 text-sm font-semibold">Flujo con contexto</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            CV, plantilla y preguntas se mantienen sincronizados para cada candidato.
          </p>
        </div>
      </div>
    </aside>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/dashboard/interviews") return pathname === href;
  if (href === "/dashboard/interviews/archived") return pathname === href;
  if (href === "/dashboard/interviews/new") return pathname === href;
  if (href === "/dashboard/reports") {
    return (
      pathname.startsWith("/dashboard/reports") ||
      (pathname.startsWith("/dashboard/interviews/") && pathname.endsWith("/report")) ||
      pathname.startsWith("/reports/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

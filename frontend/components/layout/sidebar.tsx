"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Mic2, PlusCircle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interviews/new", label: "New interview", icon: PlusCircle },
  { href: "/dashboard#reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-black/25 px-4 py-5 backdrop-blur-xl lg:block">
      <Link href="/" className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mic2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Interviewer</p>
          <p className="text-xs text-muted-foreground">Voice System</p>
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground",
                active && "bg-white/[0.08] text-foreground",
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
        <p className="mt-3 text-sm font-medium">RAG powered interviews</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Questions adapt to the uploaded CV, job description, and conversation.
        </p>
      </div>
    </aside>
  );
}

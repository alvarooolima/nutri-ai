"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, LineChart, Menu, Plus } from "lucide-react";
import { AREAS } from "./areas";
import { cx } from "@/components/ui";



const ativo = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function Sidebar({ alertas }: { alertas: number }) {
  const path = usePathname();
  return (
    <nav className="space-y-0.5" aria-label="Principal">
      {AREAS.map(({ href, nome, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cx(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
            ativo(path, href) ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-surface hover:text-ink",
          )}
        >
          <Icon size={18} />
          <span className="flex-1">{nome}</span>
          {href === "/alertas" && alertas > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-white">{alertas}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  const itens = [
    { href: "/inicio", nome: "Início", icon: Home },
    { href: "/plano", nome: "Plano", icon: CalendarDays },
    { href: "/registrar", nome: "Registrar", icon: Plus, destaque: true },
    { href: "/evolucao", nome: "Evolução", icon: LineChart },
    { href: "/mais", nome: "Mais", icon: Menu },
  ];
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegação">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {itens.map(({ href, nome, icon: Icon, destaque }) => (
          <li key={href}>
            <Link href={href} className={cx("flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", ativo(path, href) ? "text-brand" : "text-muted")}>
              {destaque ? (
                <span className="-mt-5 flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
                  <Icon size={24} />
                </span>
              ) : (
                <Icon size={22} />
              )}
              {nome}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

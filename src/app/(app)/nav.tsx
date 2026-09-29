"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, LineChart, Menu, Plus } from "lucide-react";
import { GRUPOS } from "./areas";
import { cx } from "@/components/ui";

const ativo = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function Sidebar({ alertas }: { alertas: number }) {
  const path = usePathname();
  return (
    <nav className="space-y-5" aria-label="Principal">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted/80">{g.titulo}</p>
          <ul className="space-y-0.5">
            {g.areas.map(({ href, nome, icon: Icon }) => {
              const sel = ativo(path, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={sel ? "page" : undefined}
                    className={cx(
                      "relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                      sel ? "bg-brand-soft font-semibold text-brand-strong" : "text-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {sel && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand" aria-hidden />}
                    <Icon size={18} />
                    <span className="flex-1">{nome}</span>
                    {href === "/alertas" && alertas > 0 && (
                      <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-white" aria-label={`${alertas} alertas`}>
                        {alertas}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const PRINCIPAIS = ["/inicio", "/plano", "/registrar", "/evolucao"];

export function BottomNav({ alertas = 0 }: { alertas?: number }) {
  const path = usePathname();
  const itens = [
    { href: "/inicio", nome: "Início", icon: Home },
    { href: "/plano", nome: "Cardápio", icon: CalendarDays },
    { href: "/registrar", nome: "Registrar", icon: Plus, destaque: true },
    { href: "/evolucao", nome: "Evolução", icon: LineChart },
    { href: "/mais", nome: "Mais", icon: Menu },
  ];
  // "Mais" fica ativo em qualquer área secundária, para o usuário nunca perder a referência de onde está
  const selecionado = (href: string) => (href === "/mais" ? !PRINCIPAIS.some((p) => ativo(path, p)) : ativo(path, href));
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegação">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {itens.map(({ href, nome, icon: Icon, destaque }) => {
          const sel = selecionado(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={sel ? "page" : undefined}
                className={cx("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", sel ? "text-brand-strong" : "text-muted")}
              >
                {destaque ? (
                  <span className="-mt-6 flex size-13 items-center justify-center rounded-2xl bg-brand text-white shadow-raised ring-4 ring-bg">
                    <Icon size={26} />
                  </span>
                ) : (
                  <span className={cx("flex h-8 w-14 items-center justify-center rounded-full transition", sel && "bg-brand-soft")}>
                    <Icon size={21} />
                    {href === "/mais" && alertas > 0 && <span className="absolute top-2.5 ml-6 size-2 rounded-full bg-accent" aria-hidden />}
                  </span>
                )}
                {nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

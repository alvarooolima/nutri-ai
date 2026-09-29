import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { GRUPOS } from "../areas";
import { SairButton } from "./sair";

export const metadata: Metadata = { title: "Todas as áreas" };

export default function Mais() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Todas as áreas" subtitulo="Organizadas pelo que você quer fazer." />
      <div className="space-y-6">
        {GRUPOS.map((g) => (
          <section key={g.titulo}>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.08em] text-muted">{g.titulo}</h2>
            <ul className="divide-y divide-line/70 overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-card">
              {g.areas.map(({ href, nome, descricao, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-16 items-center gap-3.5 px-4 py-3 transition hover:bg-surface-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{nome}</span>
                      <span className="block truncate text-[13px] text-muted">{descricao}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted/70" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <SairButton />
      </div>
    </div>
  );
}

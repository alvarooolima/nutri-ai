"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ETAPAS } from "@/components/perfil/steps";
import { Progress } from "@/components/ui";
import type { PerfilCompleto } from "@/lib/server/perfil";
import { Resultado } from "./resultado";

const NOMES = [...ETAPAS.map((e) => e.nome), "Resultado"];

export function Wizard({ perfil, etapaInicial }: { perfil: PerfilCompleto; etapaInicial: number }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(Math.max(0, Math.min(8, etapaInicial)));
  const ir = (n: number) => {
    setEtapa(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh();
  };
  const Atual = etapa < ETAPAS.length ? ETAPAS[etapa].C : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-5">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-brand">
          <Logo size={24} /> NUTRI.AI
        </Link>
        {perfil.onboardingCompleto && (
          <Link href="/inicio" className="text-sm font-semibold text-muted hover:text-ink">
            Sair
          </Link>
        )}
      </div>
      {etapa === 0 && <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">Vamos conhecer você antes de montar seu plano.</h1>}
      <div className="sticky top-0 z-10 -mx-4 mb-5 bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold">{NOMES[etapa]}</span>
          <span className="tabular text-muted">
            {etapa + 1} de {NOMES.length}
          </span>
        </div>
        <Progress valor={etapa + 1} max={NOMES.length} />
        <nav className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 text-xs text-muted sm:flex" aria-label="Etapas">
          {NOMES.map((n, i) => (
            <button key={n} type="button" onClick={() => i <= Math.max(perfil.onboardingEtapa, etapa) && ir(i)} className={i === etapa ? "font-bold text-brand" : i <= perfil.onboardingEtapa ? "hover:text-ink" : "opacity-50"}>
              {n}
            </button>
          ))}
        </nav>
      </div>
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        {Atual ? (
          <Atual key={etapa} p={perfil} onSalvo={() => ir(etapa + 1)} voltar={etapa > 0 ? () => ir(etapa - 1) : undefined} />
        ) : (
          <Resultado irPara={ir} />
        )}
      </section>
    </main>
  );
}

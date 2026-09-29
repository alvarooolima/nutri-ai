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
const PORQUE = [
  "Usado nas equações de gasto energético.",
  "Define a direção do plano — sem metas agressivas.",
  "Para as refeições caberem nos seus horários.",
  "Para manter o que já funciona e fazer só as refeições que você quer.",
  "Contexto de segurança: nada aqui vira “dieta para a doença”.",
  "Para estimar o gasto dos treinos e ajustar proteína.",
  "Para o cardápio ter a sua cara.",
  "Para o plano caber no seu bolso.",
  "Confira tudo antes de gerar o primeiro plano.",
];

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
      {etapa === 0 && <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">Vamos conhecer você antes de montar seu plano.</h1>}
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-line/60 bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-lg font-bold tracking-tight">{NOMES[etapa]}</p>
          <p className="tabular text-sm text-muted">
            Etapa {etapa + 1} de {NOMES.length}
          </p>
        </div>
        <p className="mb-3 text-[13px] text-muted">{PORQUE[etapa]}</p>
        {/* barra segmentada: cada etapa é um segmento clicável quando já visitada */}
        <nav className="flex gap-1" aria-label="Etapas do questionário">
          {NOMES.map((n, i) => {
            const liberada = i <= Math.max(perfil.onboardingEtapa, etapa);
            return (
              <button
                key={n}
                type="button"
                title={n}
                aria-label={`${n}${i === etapa ? " (atual)" : ""}`}
                aria-current={i === etapa ? "step" : undefined}
                disabled={!liberada}
                onClick={() => ir(i)}
                className="group flex h-6 flex-1 items-center disabled:cursor-default"
              >
                <span className={`h-1.5 w-full rounded-full transition ${i < etapa ? "bg-brand" : i === etapa ? "bg-brand/60" : "bg-line"} ${liberada ? "group-hover:bg-brand-strong" : ""}`} />
              </button>
            );
          })}
        </nav>
      </div>
      <section className="rounded-3xl border border-line/80 bg-surface p-5 shadow-card sm:p-6">
        {Atual ? (
          <Atual key={etapa} p={perfil} onSalvo={() => ir(etapa + 1)} voltar={etapa > 0 ? () => ir(etapa - 1) : undefined} />
        ) : (
          <Resultado irPara={ir} />
        )}
      </section>
    </main>
  );
}

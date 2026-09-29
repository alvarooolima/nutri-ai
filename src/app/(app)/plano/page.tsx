import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { AlertBox, Card, MetaBar, PageHeader } from "@/components/ui";
import { RefeicaoCard } from "@/components/plano/refeicao-card";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { MODOS } from "@/lib/nutrition/planner";
import { agruparPorDia, hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { AcoesDia, NovoPlano } from "./acoes";

export const metadata: Metadata = { title: "Meu plano" };

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function Plano({ searchParams }: PageProps<"/plano">) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const [{ data: u }, plano] = await Promise.all([supabase.from("users").select("preferencias_app").eq("id", user.id).single(), planoAtivo(supabase, user.id)]);

  if (!plano)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader titulo="Meu plano" />
        <Card>
          <p className="font-semibold">Vamos montar seu plano.</p>
          <p className="mb-4 text-sm text-muted">Escolha o período e o modo de alimentação.</p>
          <NovoPlano aberto />
        </Card>
      </div>
    );

  const refs = await refeicoesDoPlano(supabase, plano.id);
  const dias = agruparPorDia(refs);
  const hoje = hojeSP();
  const diaSel = typeof sp.dia === "string" && dias.some((d) => d.data === sp.dia) ? sp.dia : dias.find((d) => d.data >= hoje)?.data ?? dias[0]?.data;
  const dia = dias.find((d) => d.data === diaSel);
  const prefs = (u?.preferencias_app ?? {}) as { mostrarMacros?: boolean; unidades?: string };
  const cons = plano.consideracoes as { consideradas?: string[]; limitacoes?: string[]; validar?: string[]; esconderCalorias?: boolean; sodioMedio?: number };
  const calc = plano.calculo as { meta?: { kcal: number; faixa: { min: number; max: number } }; proteina?: { g: number }; fibra?: { g: number }; alvoUsado?: { kcal: number } };
  const mostrarMacros = prefs.mostrarMacros !== false && !cons.esconderCalorias;
  const md = dia ? macrosItens(dia.refeicoes.filter((r) => !r.foraDeCasa).flatMap((r) => r.itens)) : null;
  const modo = MODOS.find((m) => m.id === plano.modo)?.nome ?? plano.modo;

  const MODO_NOME = modo;
  const dataCurta = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        sobre={`Plano ${plano.tipo} · ${MODO_NOME}${plano.desafio ? " · Desafio japonês" : ""}`}
        titulo="Meu plano"
        subtitulo={`${dataCurta(plano.data_inicio)} a ${dataCurta(plano.data_fim)} · versão ${plano.versao}`}
        acao={<NovoPlano modoAtual={plano.modo} />}
      />

      {sp.novo === "1" && (
        <AlertBox gravidade="info" titulo="Seu primeiro plano está pronto" className="mb-5">
          Use o ícone <ArrowLeftRight size={14} className="-mt-0.5 inline" aria-label="trocar" /> para trocar um alimento, os três pontinhos para trocar a refeição ou comer fora, e registre com “Comi”. Em{" "}
          <Link href="/evidencias" className="font-semibold underline underline-offset-2">Por que isso?</Link> você vê como cada número foi calculado.
        </AlertBox>
      )}

      {/* Faixa de dias fixa: navegação sempre à mão (Fitts) e contexto visível */}
      <nav className="scroll-x sticky top-[61px] z-10 -mx-4 mb-5 flex gap-2 bg-bg/95 px-4 py-2 backdrop-blur lg:top-0" aria-label="Dias do plano">
        {dias.map((d) => {
          const dt = new Date(d.data + "T12:00:00");
          const sel = d.data === diaSel;
          const eHoje = d.data === hoje;
          return (
            <Link
              key={d.data}
              href={`/plano?dia=${d.data}`}
              scroll={false}
              aria-current={sel ? "date" : undefined}
              className={`flex min-h-14 min-w-[52px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 text-xs transition ${sel ? "border-brand bg-brand text-white shadow-card" : eHoje ? "border-brand/50 bg-surface text-brand-strong" : "border-line/80 bg-surface text-muted hover:border-brand/40"}`}
            >
              <span className="font-semibold uppercase tracking-wide">{eHoje ? "Hoje" : DIAS[dt.getDay()]}</span>
              <span className={`text-base font-bold ${sel ? "text-white" : "text-ink"}`}>{dt.getDate()}</span>
            </Link>
          );
        })}
      </nav>

      {dia && md && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold tracking-tight">Resumo do dia</h2>
              <p className="tabular text-[13px] text-muted">
                {brl(md.custo)} · sódio ~{Math.round(md.na).toLocaleString("pt-BR")} mg
              </p>
            </div>
            {mostrarMacros ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {calc.meta && <MetaBar rotulo="Energia" valor={md.kcal} meta={calc.alvoUsado?.kcal ?? calc.meta.kcal} unidade="kcal" />}
                {calc.proteina && <MetaBar rotulo="Proteína" valor={md.p} meta={calc.proteina.g} unidade="g" />}
                {calc.fibra && <MetaBar rotulo="Fibras" valor={md.f} meta={calc.fibra.g} unidade="g" minimo />}
              </div>
            ) : (
              <p className="text-sm text-muted">Números de calorias ocultos para você, conforme seu perfil. Foque em refeições regulares e na sua saciedade.</p>
            )}
            {md.f > 45 && (
              <p className="rounded-2xl bg-info-soft px-3 py-2 text-xs leading-relaxed text-info">
                Dia com bastante fibra (~{Math.round(md.f)} g). Se não estiver acostumado, aumente aos poucos e beba água ao longo do dia.
              </p>
            )}
            <AcoesDia data={dia.data} />
          </Card>

          <section className="space-y-3" aria-label="Refeições do dia">
            <h2 className="text-lg font-bold tracking-tight">
              Refeições <span className="text-sm font-medium text-muted">· {dia.refeicoes.length}</span>
            </h2>
            {dia.refeicoes.map((r) => (
              <RefeicaoCard key={r.id} r={r} mostrarMacros={mostrarMacros} unidades={prefs.unidades} />
            ))}
          </section>
        </div>
      )}

      <details className="group mt-8 rounded-3xl border border-line/80 bg-surface shadow-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
          <span>
            <span className="block font-bold">O que foi considerado neste plano</span>
            <span className="block text-[13px] text-muted">Dados usados, limitações e pontos para validar com profissional</span>
          </span>
          <ChevronDown size={20} className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-line/70 px-5 py-4 text-sm">
          {[
            ["Informações consideradas", cons.consideradas],
            ["Limitações", cons.limitacoes],
            ["Validar com profissional de saúde", cons.validar],
          ].map(([t, itens]) => (
            <div key={t as string}>
              <h3 className="mb-1 font-semibold">{t as string}</h3>
              <ul className="list-disc space-y-1 pl-5 text-muted">{((itens as string[]) ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          ))}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/70 pt-3">
            <span>Custo estimado do período: <strong>{brl(Number(plano.custo_estimado ?? 0))}</strong></span>
            <Link href="/evidencias" className="font-semibold text-brand">Por que o sistema recomendou isso? →</Link>
          </p>
        </div>
      </details>
    </div>
  );
}

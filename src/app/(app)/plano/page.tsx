import type { Metadata } from "next";
import Link from "next/link";
import { AlertBox, Badge, Card, PageHeader, Stat } from "@/components/ui";
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Meu plano"
        subtitulo={
          <>
            Plano {plano.tipo} · {modo} · versão {plano.versao}
            {plano.desafio && " · Desafio japonês"}
          </>
        }
        acao={<NovoPlano modoAtual={plano.modo} />}
      />

      {sp.novo === "1" && (
        <div className="mb-4">
          <AlertBox gravidade="info" titulo="Seu primeiro plano está pronto">
            Toque em “Trocar” para ajustar alimentos, use os três pontinhos para trocar a refeição ou comer fora, e registre com “Comi”. Veja em <Link href="/evidencias" className="font-semibold underline">Por que isso?</Link> como cada número foi calculado.
          </AlertBox>
        </div>
      )}

      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Dias do plano">
        {dias.map((d) => {
          const dt = new Date(d.data + "T12:00:00");
          const sel = d.data === diaSel;
          return (
            <Link
              key={d.data}
              href={`/plano?dia=${d.data}`}
              scroll={false}
              className={`flex min-w-14 flex-col items-center rounded-2xl border px-2 py-2 text-xs ${sel ? "border-brand bg-brand text-white" : d.data === hoje ? "border-brand/50 bg-surface" : "border-line bg-surface"}`}
            >
              <span className="font-medium uppercase">{DIAS[dt.getDay()]}</span>
              <span className="text-base font-bold">{dt.getDate()}</span>
            </Link>
          );
        })}
      </nav>

      {dia && md && (
        <>
          {mostrarMacros && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat rotulo="Energia" valor={`${Math.round(md.kcal)} kcal`} sub={calc.meta ? `meta ${calc.alvoUsado?.kcal ?? calc.meta.kcal}` : undefined} />
              <Stat rotulo="Proteína" valor={`${Math.round(md.p)} g`} sub={calc.proteina ? `meta ${calc.proteina.g} g` : undefined} />
              <Stat rotulo="Fibras" valor={`${Math.round(md.f)} g`} sub={calc.fibra ? `meta ≥ ${calc.fibra.g} g` : undefined} />
              <Stat rotulo="Custo estimado" valor={brl(md.custo)} sub={`sódio ~${Math.round(md.na)} mg`} />
            </div>
          )}
          {md.f > 45 && (
            <p className="mb-3 rounded-2xl bg-info-soft px-3 py-2 text-xs text-info">
              Este dia tem bastante fibra (~{Math.round(md.f)} g). Se você não está acostumado, aumente aos poucos e beba água ao longo do dia.
            </p>
          )}
          <AcoesDia data={dia.data} />
          <div className="mt-4 space-y-3">
            {dia.refeicoes.map((r) => (
              <RefeicaoCard key={r.id} r={r} mostrarMacros={mostrarMacros} unidades={prefs.unidades} />
            ))}
          </div>
        </>
      )}

      <Card className="mt-6 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">O que foi considerado neste plano</h2>
          <Badge tom="info">Transparência</Badge>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-muted">{(cons.consideradas ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
        <h3 className="font-bold">Limitações</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted">{(cons.limitacoes ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
        <h3 className="font-bold">Validar com profissional de saúde</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted">{(cons.validar ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
        <p className="pt-1">
          Custo estimado do período: <strong>{brl(Number(plano.custo_estimado ?? 0))}</strong> ·{" "}
          <Link href="/evidencias" className="font-semibold text-brand">Por que o sistema recomendou isso?</Link>
        </p>
      </Card>
    </div>
  );
}

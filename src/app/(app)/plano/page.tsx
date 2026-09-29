import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { MetaBar, cx } from "@/components/ui";
import { RefeicaoCard, type Registro } from "@/components/plano/refeicao-card";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { MODOS } from "@/lib/nutrition/planner";
import { agruparPorDia, hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { AcoesDia, Ajuda, NovoPlano, SeguiTudo } from "./acoes";

export const metadata: Metadata = { title: "Seu cardápio" };

const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...o, timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

function Recolhivel({ titulo, apoio, children, aberto = false }: { titulo: string; apoio?: string; children: React.ReactNode; aberto?: boolean }) {
  return (
    <details open={aberto} className="group rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{titulo}</span>
          {apoio && <span className="block truncate text-[13px] text-muted">{apoio}</span>}
        </span>
        <ChevronDown size={18} className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

export default async function Plano({ searchParams }: PageProps<"/plano">) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const [{ data: u }, plano] = await Promise.all([supabase.from("users").select("preferencias_app").eq("id", user.id).single(), planoAtivo(supabase, user.id)]);

  if (!plano)
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[26px] font-bold tracking-tight">Seu cardápio</h1>
        <p className="mb-5 mt-1 text-muted">Você ainda não tem um cardápio. Escolha o período e montamos um para você.</p>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <NovoPlano aberto />
        </div>
      </div>
    );

  const refs = await refeicoesDoPlano(supabase, plano.id);
  const dias = agruparPorDia(refs);
  const hoje = hojeSP();
  const diaSel = typeof sp.dia === "string" && dias.some((d) => d.data === sp.dia) ? sp.dia : dias.find((d) => d.data >= hoje)?.data ?? dias[0]?.data;
  const idx = dias.findIndex((d) => d.data === diaSel);
  const dia = dias[idx];
  const anterior = dias[idx - 1]?.data;
  const proximo = dias[idx + 1]?.data;
  const eHoje = diaSel === hoje;

  const { data: logs } = dia
    ? await supabase.from("food_logs").select("meal_id,seguiu_plano,hora").eq("user_id", user.id).in("meal_id", dia.refeicoes.map((r) => r.id))
    : { data: [] };
  const registros = new Map<string, Registro>((logs ?? []).filter((l) => l.meal_id && l.seguiu_plano).map((l) => [l.meal_id as string, { status: l.seguiu_plano as Registro["status"], hora: l.hora }]));

  const prefs = (u?.preferencias_app ?? {}) as { mostrarMacros?: boolean; unidades?: string };
  const cons = plano.consideracoes as { consideradas?: string[]; limitacoes?: string[]; validar?: string[]; esconderCalorias?: boolean };
  const calc = plano.calculo as { meta?: { kcal: number }; proteina?: { g: number }; fibra?: { g: number }; alvoUsado?: { kcal: number } };
  const mostrarMacros = prefs.mostrarMacros !== false && !cons.esconderCalorias;
  const md = dia ? macrosItens(dia.refeicoes.filter((r) => !r.foraDeCasa).flatMap((r) => r.itens)) : null;
  const modo = MODOS.find((m) => m.id === plano.modo)?.nome ?? plano.modo;
  const respondidas = dia ? dia.refeicoes.filter((r) => registros.has(r.id)).length : 0;
  const primeiraPendente = dia?.refeicoes.find((r) => !registros.has(r.id))?.id;

  const calendario = (
    <div className="grid grid-cols-7 gap-1 text-center">
      {SEMANA.map((s, i) => (
        <span key={i} className="pb-1 text-[11px] font-semibold text-muted">{s}</span>
      ))}
      {Array.from({ length: new Date(dias[0].data + "T12:00:00Z").getUTCDay() }).map((_, i) => (
        <span key={`v${i}`} />
      ))}
      {dias.map((d) => {
        const sel = d.data === diaSel;
        return (
          <Link
            key={d.data}
            href={`/plano?dia=${d.data}`}
            scroll={false}
            aria-label={fmt(d.data, { weekday: "long", day: "numeric", month: "long" })}
            aria-current={sel ? "date" : undefined}
            className={cx("flex aspect-square items-center justify-center rounded-lg text-[13px] font-semibold", sel ? "bg-brand text-white" : d.data === hoje ? "text-brand ring-1 ring-brand" : "text-ink/80 hover:bg-surface-2")}
          >
            {Number(d.data.slice(8, 10))}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Cabeçalho compacto: título, dia e ajuda numa só faixa */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="mr-auto flex w-full items-start justify-between gap-3 sm:w-auto">
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">Seu cardápio</h1>
            <p className="text-sm text-muted">
              {modo} · {fmt(plano.data_inicio, { day: "numeric", month: "short" })} a {fmt(plano.data_fim, { day: "numeric", month: "short" })}
            </p>
          </div>
          <div className="sm:hidden">
            <Ajuda aberta={sp.novo === "1"} />
          </div>
        </div>
        {dia && (
          <nav aria-label="Escolher o dia" className="flex w-full items-center gap-1 rounded-2xl border border-line bg-surface p-1 sm:w-auto">
            <DiaLink data={anterior} rotulo="Dia anterior" icon={ChevronLeft} />
            <div className="min-w-0 flex-1 px-2 text-center sm:min-w-52">
              <p className="text-[15px] font-bold leading-tight">{maiuscula(fmt(diaSel, { weekday: "long", day: "numeric", month: "short" }))}</p>
              <p className={cx("text-xs font-semibold", eHoje ? "text-brand" : "text-muted")}>
                {eHoje ? (
                  "Hoje"
                ) : dias.some((d) => d.data === hoje) ? (
                  <Link href={`/plano?dia=${hoje}`} scroll={false} className="underline underline-offset-2">
                    Voltar para hoje
                  </Link>
                ) : (
                  `Dia ${idx + 1} de ${dias.length}`
                )}
              </p>
            </div>
            <DiaLink data={proximo} rotulo="Próximo dia" icon={ChevronRight} />
          </nav>
        )}
        <div className="hidden sm:block">
          <Ajuda aberta={sp.novo === "1"} />
        </div>
      </div>

      {dia && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          {/* Coluna principal: refeições em linhas compactas */}
          <section aria-labelledby="refeicoes" className="min-w-0 space-y-3">
            <h2 id="refeicoes" className="sr-only">Refeições do dia</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex flex-1 items-center gap-3">
                <div className="flex min-w-24 flex-1 gap-1" aria-hidden>
                  {dia.refeicoes.map((r) => (
                    <span key={r.id} className={cx("h-1.5 flex-1 rounded-full", registros.has(r.id) ? "bg-brand" : "bg-line")} />
                  ))}
                </div>
                <p className="shrink-0 text-sm text-muted">
                  <strong className="text-ink">{respondidas}</strong> de {dia.refeicoes.length} respondidas
                </p>
              </div>
              {respondidas < dia.refeicoes.length && diaSel <= hoje && <SeguiTudo data={dia.data} />}
            </div>
            {dia.refeicoes.map((r) => (
              <RefeicaoCard
                key={r.id}
                r={r}
                registro={registros.get(r.id) ?? null}
                mostrarMacros={mostrarMacros}
                unidades={prefs.unidades}
                abertoInicial={r.id === primeiraPendente}
              />
            ))}
          </section>

          {/* Coluna lateral (desktop) / abaixo (celular): ajustes e detalhes */}
          <aside className="grid gap-3 sm:grid-cols-2 xl:sticky xl:top-6 xl:block xl:space-y-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="mb-2.5 text-sm font-semibold">Ajustar este dia</p>
              <AcoesDia data={dia.data} />
            </div>
            <div className="hidden rounded-2xl border border-line bg-surface p-4 xl:block">
              <p className="mb-2 text-sm font-semibold">Calendário</p>
              {calendario}
            </div>
            <div className="xl:hidden">
              <Recolhivel titulo="Calendário" apoio={`${dias.length} dias neste cardápio`}>
                {calendario}
              </Recolhivel>
            </div>
            {md && (
              <Recolhivel titulo="Números do dia" apoio={mostrarMacros ? "Energia, proteína, fibras e custo" : "Custo e sódio estimados"}>
                <div className="space-y-4">
                  {mostrarMacros && (
                    <>
                      {calc.meta && <MetaBar rotulo="Energia" valor={md.kcal} meta={calc.alvoUsado?.kcal ?? calc.meta.kcal} unidade="kcal" />}
                      {calc.proteina && <MetaBar rotulo="Proteína" valor={md.p} meta={calc.proteina.g} unidade="g" />}
                      {calc.fibra && <MetaBar rotulo="Fibras" valor={md.f} meta={calc.fibra.g} unidade="g" minimo />}
                    </>
                  )}
                  <p className="text-sm">
                    Custo <strong>{brl(md.custo)}</strong> · Sódio <strong>~{Math.round(md.na).toLocaleString("pt-BR")} mg</strong>
                  </p>
                  <p className="text-xs text-muted">Estimativas com base na TACO e no USDA. Pequenas diferenças da meta são normais.</p>
                </div>
              </Recolhivel>
            )}
            <Recolhivel titulo="Sobre este cardápio" apoio={`${plano.tipo} · versão ${plano.versao}${plano.desafio ? " · desafio japonês" : ""}`}>
              <div className="space-y-4 text-sm">
                {[
                  ["O que foi levado em conta", cons.consideradas],
                  ["Limitações", cons.limitacoes],
                  ["Confirme com um profissional", cons.validar],
                ].map(([t, itens]) => (
                  <div key={t as string}>
                    <h3 className="mb-1 font-semibold">{t as string}</h3>
                    <ul className="list-disc space-y-1 pl-5 text-muted">{((itens as string[]) ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
                  </div>
                ))}
                <p>
                  Custo do período: <strong>{brl(Number(plano.custo_estimado ?? 0))}</strong>
                </p>
                <Link href="/evidencias" className="inline-flex min-h-10 items-center font-semibold text-brand">
                  Por que o sistema recomendou isso? →
                </Link>
              </div>
            </Recolhivel>
            <Recolhivel titulo="Fazer um cardápio novo" apoio="Outro período ou estilo">
              <NovoPlano aberto modoAtual={plano.modo} />
            </Recolhivel>
          </aside>
        </div>
      )}
    </div>
  );
}

function DiaLink({ data, rotulo, icon: Icon }: { data?: string; rotulo: string; icon: typeof ChevronLeft }) {
  const cls = "flex size-11 shrink-0 items-center justify-center rounded-xl";
  if (!data)
    return (
      <span className={cx(cls, "text-line")} aria-hidden>
        <Icon size={22} />
      </span>
    );
  return (
    <Link href={`/plano?dia=${data}`} scroll={false} aria-label={rotulo} title={rotulo} className={cx(cls, "text-ink hover:bg-surface-2")}>
      <Icon size={22} />
    </Link>
  );
}

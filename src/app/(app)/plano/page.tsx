import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Card, MetaBar, PageHeader, cx } from "@/components/ui";
import { RefeicaoCard, type Registro } from "@/components/plano/refeicao-card";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { MODOS } from "@/lib/nutrition/planner";
import { agruparPorDia, hojeSP, planoAtivo, refeicoesDoPlano } from "@/lib/server/planos";
import { requireUser } from "@/lib/supabase/server";
import { AcoesDia, NovoPlano } from "./acoes";

export const metadata: Metadata = { title: "Seu cardápio" };

const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const dataLonga = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

/** Bloco recolhível padrão da página (divulgação progressiva) */
function Recolhivel({ titulo, apoio, children, aberto = false }: { titulo: string; apoio?: string; children: React.ReactNode; aberto?: boolean }) {
  return (
    <details open={aberto} className="group rounded-3xl border border-line/80 bg-surface shadow-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
        <span>
          <span className="block text-[16px] font-bold">{titulo}</span>
          {apoio && <span className="block text-[13px] text-muted">{apoio}</span>}
        </span>
        <ChevronDown size={20} className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line/70 px-5 py-4">{children}</div>
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
        <PageHeader titulo="Seu cardápio" subtitulo="Você ainda não tem um cardápio. Escolha o período e montamos um para você." />
        <Card>
          <NovoPlano aberto />
        </Card>
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
  const hojeNoPlano = dias.some((d) => d.data === hoje);

  // respostas já salvas para as refeições deste dia (mantém o estado ao recarregar)
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
  const eHoje = diaSel === hoje;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader titulo="Seu cardápio" subtitulo="O que comer em cada refeição. Depois de comer, responda se comeu — isso ajuda a ajustar o plano." />

      {/* Ajuda curta, sempre disponível; aberta no primeiro acesso */}
      <details open={sp.novo === "1"} className="group rounded-3xl bg-info-soft px-5 py-3 text-info">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 font-semibold">
          <HelpCircle size={18} aria-hidden /> Como usar esta página
          <ChevronDown size={18} className="ml-auto transition group-open:rotate-180" aria-hidden />
        </summary>
        <ol className="mt-2 space-y-1.5 pb-1 text-[15px] leading-relaxed text-ink/85">
          <li><strong>1.</strong> Escolha o dia com as setas.</li>
          <li><strong>2.</strong> Veja o que comer em cada refeição e as quantidades.</li>
          <li><strong>3.</strong> Depois de comer, toque em <strong>“Sim, comi”</strong> (ou nas outras respostas).</li>
          <li><strong>4.</strong> Não tem algum alimento ou quer mudar? Toque em <strong>“Trocar algo nesta refeição”</strong>.</li>
        </ol>
      </details>

      {/* Navegação de dias: uma data por vez, setas grandes */}
      {dia && (
        <section aria-label="Escolher o dia" className="rounded-3xl border border-line/80 bg-surface p-2 shadow-card">
          <div className="flex items-center gap-2">
            <DiaLink data={anterior} rotulo="Dia anterior" icon={ChevronLeft} />
            <div className="min-w-0 flex-1 text-center">
              <p className={cx("text-xs font-bold uppercase tracking-[0.08em]", eHoje ? "text-brand" : "text-muted")}>
                {eHoje ? "Hoje" : diaSel < hoje ? "Dia passado" : "Próximos dias"}
              </p>
              <p className="text-[17px] font-bold leading-snug">{maiuscula(dataLonga(diaSel))}</p>
            </div>
            <DiaLink data={proximo} rotulo="Próximo dia" icon={ChevronRight} />
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 border-t border-line/60 pt-1.5 text-sm">
            {!eHoje && hojeNoPlano && (
              <Link href={`/plano?dia=${hoje}`} scroll={false} className="inline-flex min-h-10 items-center font-semibold text-brand">
                Voltar para hoje
              </Link>
            )}
            <details className="group/cal w-full text-center">
              <summary className="mx-auto inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 font-semibold text-muted hover:text-ink">
                <CalendarDays size={16} aria-hidden /> Ver calendário do cardápio
              </summary>
              <div className="mx-auto mt-2 grid max-w-sm grid-cols-7 gap-1 pb-2 text-center">
                {SEMANA.map((s, i) => (
                  <span key={i} className="text-[11px] font-bold text-muted">{s}</span>
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
                      aria-label={dataLonga(d.data)}
                      aria-current={sel ? "date" : undefined}
                      className={cx(
                        "flex aspect-square items-center justify-center rounded-xl text-sm font-semibold",
                        sel ? "bg-brand text-white" : d.data === hoje ? "border border-brand text-brand-strong" : "hover:bg-surface-2",
                      )}
                    >
                      {Number(d.data.slice(8, 10))}
                    </Link>
                  );
                })}
              </div>
            </details>
          </div>
        </section>
      )}

      {dia && (
        <section className="space-y-4" aria-labelledby="refeicoes">
          <div>
            <h2 id="refeicoes" className="text-xl font-bold tracking-tight">
              {dia.refeicoes.length} {dia.refeicoes.length === 1 ? "refeição" : "refeições"} neste dia
            </h2>
            <p className="mt-0.5 text-[15px] text-muted">
              {respondidas === dia.refeicoes.length ? "Você já respondeu todas. Muito bem! 🌿" : `Você já respondeu ${respondidas} de ${dia.refeicoes.length}.`}
            </p>
            <div className="mt-2 flex gap-1.5" aria-hidden>
              {dia.refeicoes.map((r) => (
                <span key={r.id} className={cx("h-2 flex-1 rounded-full", registros.has(r.id) ? "bg-brand" : "bg-line")} />
              ))}
            </div>
          </div>
          {dia.refeicoes.map((r) => (
            <RefeicaoCard key={r.id} r={r} registro={registros.get(r.id) ?? null} mostrarMacros={mostrarMacros} unidades={prefs.unidades} />
          ))}
        </section>
      )}

      {dia && (
        <section className="space-y-3" aria-labelledby="ajustar">
          <div>
            <h2 id="ajustar" className="text-xl font-bold tracking-tight">Precisa ajustar este dia?</h2>
            <p className="mt-0.5 text-[15px] text-muted">Toque em uma opção e o cardápio deste dia muda na hora.</p>
          </div>
          <AcoesDia data={dia.data} />
        </section>
      )}

      <section className="space-y-3">
        {dia && md && (
          <Recolhivel titulo="Números do dia" apoio={mostrarMacros ? "Calorias, proteína, fibras e custo" : "Custo e sódio estimados"}>
            <div className="space-y-4">
              {mostrarMacros && (
                <div className="grid gap-4">
                  {calc.meta && <MetaBar rotulo="Energia" valor={md.kcal} meta={calc.alvoUsado?.kcal ?? calc.meta.kcal} unidade="kcal" />}
                  {calc.proteina && <MetaBar rotulo="Proteína" valor={md.p} meta={calc.proteina.g} unidade="g" />}
                  {calc.fibra && <MetaBar rotulo="Fibras" valor={md.f} meta={calc.fibra.g} unidade="g" minimo />}
                </div>
              )}
              <p className="text-[15px]">
                Custo estimado do dia: <strong>{brl(md.custo)}</strong> · Sódio: <strong>~{Math.round(md.na).toLocaleString("pt-BR")} mg</strong>
              </p>
              {md.f > 45 && <p className="rounded-2xl bg-info-soft px-3 py-2 text-[13px] leading-relaxed text-info">Dia com bastante fibra. Se não estiver acostumado, aumente aos poucos e beba água ao longo do dia.</p>}
              <p className="text-[13px] text-muted">São estimativas. Pequenas diferenças da meta são normais.</p>
            </div>
          </Recolhivel>
        )}

        <Recolhivel titulo="Sobre este cardápio" apoio={`Cardápio ${plano.tipo} · ${modo}${plano.desafio ? " · Desafio japonês" : ""} · versão ${plano.versao}`}>
          <div className="space-y-4 text-[15px]">
            {[
              ["O que foi levado em conta", cons.consideradas],
              ["Limitações", cons.limitacoes],
              ["Confirme com um profissional de saúde", cons.validar],
            ].map(([t, itens]) => (
              <div key={t as string}>
                <h3 className="mb-1 font-semibold">{t as string}</h3>
                <ul className="list-disc space-y-1 pl-5 text-muted">{((itens as string[]) ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            ))}
            <p>
              Custo estimado de todo o período: <strong>{brl(Number(plano.custo_estimado ?? 0))}</strong>
            </p>
            <Link href="/evidencias" className="inline-flex min-h-10 items-center font-semibold text-brand">
              Por que o sistema recomendou isso? →
            </Link>
          </div>
        </Recolhivel>

        <Recolhivel titulo="Fazer um cardápio novo" apoio="Para mudar o período ou o estilo de alimentação">
          <NovoPlano aberto modoAtual={plano.modo} />
        </Recolhivel>
      </section>
    </div>
  );
}

function DiaLink({ data, rotulo, icon: Icon }: { data?: string; rotulo: string; icon: typeof ChevronLeft }) {
  const cls = "flex size-12 shrink-0 items-center justify-center rounded-2xl";
  if (!data)
    return (
      <span className={cx(cls, "text-line")} aria-hidden>
        <Icon size={24} />
      </span>
    );
  return (
    <Link href={`/plano?dia=${data}`} scroll={false} aria-label={rotulo} title={rotulo} className={cx(cls, "bg-surface-2 text-ink hover:bg-brand-soft hover:text-brand-strong")}>
      <Icon size={24} />
    </Link>
  );
}

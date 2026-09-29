"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowLeftRight, Check, ChefHat, ChevronRight, Clock, Leaf, MoreHorizontal, PiggyBank, Store, Timer, X, Zap } from "lucide-react";
import { FOOD_MAP } from "@/data/foods";
import { RECIPE_MAP } from "@/data/recipes";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { CRITERIOS, LOCAIS_FORA, type CriterioRefeicao, type OpcaoTrocaAlimento, type OpcaoTrocaRefeicao } from "@/lib/nutrition/swaps";
import { aplicarTrocaAlimento, aplicarTrocaRefeicao, comerFora, desfazerComerFora, listarTrocasAlimento, listarTrocasRefeicao } from "@/lib/server/actions-plano";
import { registrarRefeicao } from "@/lib/server/actions-registro";
import type { ItemPlanejado, RefeicaoPlanejada } from "@/lib/types";
import { Badge, IconButton, cx } from "@/components/ui";

export interface RefeicaoView extends RefeicaoPlanejada {
  id: string;
  dia: string;
}

/** Folha inferior (mobile) / diálogo (desktop). Fecha com Esc, toque fora ou botão. */
export function Sheet({ titulo, descricao, onClose, children }: { titulo: string; descricao?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={titulo}>
      <div
        ref={ref}
        tabIndex={-1}
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-raised outline-none sm:rounded-3xl sm:pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold leading-snug">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-[13px] text-muted">{descricao}</p>}
          </div>
          <IconButton label="Fechar" icon={X} onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        {children}
      </div>
    </div>
  );
}

function Quantidade({ i, unidades }: { i: ItemPlanejado; unidades: string }) {
  if (unidades === "gramas") return <>{Math.round(i.g)} g</>;
  if (unidades === "caseiras") return <>{i.medida}</>;
  return (
    <>
      <span className="block">{i.medida}</span>
      <span className="block text-xs text-muted">{Math.round(i.g)} g</span>
    </>
  );
}

const ICONE_CRITERIO: Record<CriterioRefeicao, typeof Zap> = {
  qualquer: ArrowLeftRight,
  barato: PiggyBank,
  rapido: Timer,
  vegetariana: Leaf,
  brasileira: ChefHat,
  japonesa: ChefHat,
  mediterranea: ChefHat,
};

const ROTULO_CRITERIO: Record<CriterioRefeicao, string> = {
  qualquer: "Outra opção",
  barato: "Mais barata",
  rapido: "Mais rápida",
  vegetariana: "Vegetariana",
  brasileira: "Brasileira",
  japonesa: "Japonesa",
  mediterranea: "Mediterrânea",
};

/** Opção selecionável dentro de uma folha: título, apoio e diferenças (mesmo padrão visual em todas as trocas) */
function Opcao({ titulo, apoio, detalhe, onClick, disabled }: { titulo: ReactNode; apoio?: ReactNode; detalhe?: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 rounded-2xl border border-line p-3.5 text-left transition hover:border-brand hover:bg-brand-soft/40 disabled:opacity-60">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{titulo}</span>
        {apoio && <span className="mt-0.5 block text-xs text-muted">{apoio}</span>}
        {detalhe && <span className="mt-1.5 block text-xs font-medium text-brand-strong">{detalhe}</span>}
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted/70" aria-hidden />
    </button>
  );
}

export function RefeicaoCard({ r, mostrarMacros = true, unidades = "ambos", compacto = false }: { r: RefeicaoView; mostrarMacros?: boolean; unidades?: string; compacto?: boolean }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [painel, setPainel] = useState<null | "acoes" | "trocaRefeicao" | "trocaAlimento" | "fora" | "orientacao">(null);
  const [opRef, setOpRef] = useState<OpcaoTrocaRefeicao[] | null>(null);
  const [opAli, setOpAli] = useState<{ indice: number; opcoes: OpcaoTrocaAlimento[] } | null>(null);
  const [orient, setOrient] = useState<string[]>([]);
  const [registrado, setRegistrado] = useState<string | null>(null);
  const [criterio, setCriterio] = useState<CriterioRefeicao>("qualquer");
  const m = macrosItens(r.itens);
  const rec = r.receitaId ? RECIPE_MAP[r.receitaId] : null;
  const fechar = () => setPainel(null);

  const trocarRefeicao = (c: CriterioRefeicao) =>
    start(async () => {
      setCriterio(c);
      setOpRef(null);
      setPainel("trocaRefeicao");
      setOpRef(await listarTrocasRefeicao(r.id, c));
    });
  const trocarAlimento = (indice: number) =>
    start(async () => {
      setOpAli(null);
      setPainel("trocaAlimento");
      setOpAli({ indice, opcoes: await listarTrocasAlimento(r.id, indice) });
    });
  const registrar = (s: "sim" | "parcial" | "nao") =>
    start(async () => {
      await registrarRefeicao({ mealId: r.id, refeicao: r.nome, seguiu_plano: s, data: r.dia });
      setRegistrado(s);
      router.refresh();
    });

  return (
    <article className="overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-card">
      <header className="flex items-start gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        {rec && (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-soft to-accent-soft text-2xl" aria-hidden>
            {rec.ilustracao}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted">
            {r.nome}
            {r.horario && <span className="font-semibold normal-case tracking-normal"> · {r.horario}</span>}
          </p>
          <h3 className="mt-0.5 text-[17px] font-bold leading-snug">{r.foraDeCasa ? "Refeição fora de casa" : rec?.nome ?? "Refeição"}</h3>
          {r.nota && <p className="mt-1 text-xs text-muted">{r.nota}</p>}
        </div>
        <IconButton label={`Mais opções para ${r.nome}`} icon={MoreHorizontal} onClick={() => setPainel("acoes")} className="-mr-1 border border-line" />
      </header>

      {!r.foraDeCasa && (
        <ul className="px-4 sm:px-5" aria-label="Itens da refeição">
          {r.itens.map((i, k) => (
            <li key={k} className="flex min-h-12 items-center gap-2 border-t border-line/60 py-2 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium leading-snug">{FOOD_MAP[i.food]?.nome ?? i.food}</p>
                {i.preparo && <p className="text-xs text-muted">{i.preparo}</p>}
              </div>
              <div className="tabular shrink-0 text-right text-[13px] leading-snug text-ink/80">
                <Quantidade i={i} unidades={unidades} />
              </div>
              {!compacto && <IconButton label={`Trocar ${FOOD_MAP[i.food]?.nome}`} icon={ArrowLeftRight} onClick={() => trocarAlimento(k)} className="size-9 text-brand hover:bg-brand-soft" />}
            </li>
          ))}
        </ul>
      )}

      {r.foraDeCasa && (
        <div className="px-4 pb-2 sm:px-5">
          <button onClick={() => setPainel("fora")} className="min-h-10 text-sm font-semibold text-brand underline underline-offset-2">
            Ver dicas para comer fora
          </button>
        </div>
      )}

      {(mostrarMacros || rec) && !r.foraDeCasa && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-1 pt-2 text-xs text-muted sm:px-5">
          {mostrarMacros && (
            <span className="tabular">
              <strong className="font-semibold text-ink">{Math.round(m.kcal)} kcal</strong> · P {Math.round(m.p)} g · C {Math.round(m.c)} g · G {Math.round(m.g)} g · F {Math.round(m.f)} g
            </span>
          )}
          {rec && (
            <Link href={`/receitas/${rec.id}`} className="ml-auto inline-flex min-h-9 items-center gap-1 font-semibold text-brand hover:underline">
              <ChefHat size={14} /> Receita · {rec.tempo} min
            </Link>
          )}
        </div>
      )}

      <footer className="mt-2 flex gap-2 border-t border-line/60 bg-surface-2/60 p-3 sm:px-5">
        {registrado ? (
          <Badge tom="brand" className="min-h-9 px-3">
            <Check size={14} /> Registrado{registrado === "parcial" ? " — em parte" : registrado === "nao" ? " — comi outra coisa" : ""}
          </Badge>
        ) : (
          <>
            <button onClick={() => registrar("sim")} disabled={pendente} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-card hover:bg-brand-strong disabled:opacity-60">
              <Check size={16} /> Comi
            </button>
            <button onClick={() => registrar("parcial")} disabled={pendente} className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60">
              Em parte
            </button>
            <button onClick={() => registrar("nao")} disabled={pendente} className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60">
              Outra coisa
            </button>
          </>
        )}
      </footer>

      {painel === "acoes" && (
        <Sheet titulo={r.nome} descricao={rec?.nome} onClose={fechar}>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">Trocar a refeição</p>
          <div className="grid grid-cols-2 gap-2">
            {CRITERIOS.map((c) => {
              const Icon = ICONE_CRITERIO[c.id];
              return (
                <button key={c.id} onClick={() => trocarRefeicao(c.id)} className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line px-3 text-left text-sm font-semibold hover:border-brand hover:bg-brand-soft/40">
                  <Icon size={18} className="shrink-0 text-brand" /> {ROTULO_CRITERIO[c.id]}
                </button>
              );
            })}
          </div>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.06em] text-muted">Imprevistos</p>
          {r.foraDeCasa ? (
            <Opcao titulo="Voltar para a refeição planejada" apoio="Desfaz a marcação de refeição fora de casa" onClick={() => start(async () => { await desfazerComerFora(r.id); fechar(); router.refresh(); })} />
          ) : (
            <Opcao titulo={<span className="inline-flex items-center gap-2"><Store size={16} className="text-brand" /> Vou comer fora</span>} apoio="Receba uma referência de prato para o lugar escolhido" onClick={() => setPainel("fora")} />
          )}
        </Sheet>
      )}

      {painel === "fora" && (
        <Sheet titulo="Onde você vai comer?" descricao="Vamos sugerir uma referência de prato — sem regras rígidas." onClose={fechar}>
          <div className="grid gap-2">
            {LOCAIS_FORA.map((l) => (
              <Opcao
                key={l.id}
                titulo={l.nome}
                disabled={pendente}
                onClick={() =>
                  start(async () => {
                    setOrient(await comerFora(r.id, l.id));
                    setPainel("orientacao");
                    router.refresh();
                  })
                }
              />
            ))}
          </div>
        </Sheet>
      )}

      {painel === "orientacao" && (
        <Sheet titulo="Dicas para comer fora" onClose={fechar}>
          <ol className="space-y-2 text-sm">
            {orient.map((o, i) => (
              <li key={o} className="flex gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">{i + 1}</span>
                <span className="leading-relaxed">{o}</span>
              </li>
            ))}
          </ol>
        </Sheet>
      )}

      {painel === "trocaRefeicao" && (
        <Sheet titulo={CRITERIOS.find((c) => c.id === criterio)?.nome ?? "Trocar refeição"} descricao="Opções com energia e proteína parecidas, já ajustadas à sua meta." onClose={fechar}>
          {!opRef ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />)}
            </div>
          ) : opRef.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">Não encontramos opções {criterio === "barato" ? "mais baratas" : criterio === "rapido" ? "mais rápidas" : ""} equivalentes e compatíveis com suas preferências e restrições.</p>
          ) : (
            <ul className="space-y-2">
              {opRef.map((o) => {
                const mo = macrosItens(o.refeicao.itens);
                return (
                  <li key={o.refeicao.receitaId}>
                    <Opcao
                      disabled={pendente}
                      titulo={<>{RECIPE_MAP[o.refeicao.receitaId!]?.ilustracao} {o.nomeReceita}</>}
                      apoio={<><Clock size={12} className="-mt-0.5 inline" /> {o.tempo} min · {brl(mo.custo)}{mostrarMacros && ` · ${Math.round(mo.kcal)} kcal · P ${Math.round(mo.p)} g`}</>}
                      detalhe={o.diferencas.join(" · ")}
                      onClick={() => start(async () => { await aplicarTrocaRefeicao(r.id, o.refeicao); fechar(); router.refresh(); })}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Sheet>
      )}

      {painel === "trocaAlimento" && (
        <Sheet
          titulo={`Trocar ${opAli ? FOOD_MAP[r.itens[opAli.indice].food]?.nome.toLowerCase() : "alimento"}`}
          descricao={opAli ? `Quantidades equivalentes ${FOOD_MAP[r.itens[opAli.indice].food]?.grupo === "proteina" ? "em proteína" : "em energia"}, dentro de porções práticas.` : undefined}
          onClose={fechar}
        >
          {!opAli ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />)}
            </div>
          ) : opAli.opcoes.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">Não há substitutos compatíveis com suas restrições.</p>
          ) : (
            <ul className="space-y-2">
              {opAli.opcoes.map((o) => (
                <li key={o.item.food}>
                  <Opcao
                    disabled={pendente}
                    titulo={o.nome}
                    apoio={`${o.item.medida} · ${Math.round(o.item.g)} g`}
                    detalhe={o.diferencas.join(" · ")}
                    onClick={() => start(async () => { await aplicarTrocaAlimento(r.id, opAli.indice, o.item); fechar(); router.refresh(); })}
                  />
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}
    </article>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ArrowLeftRight, Check, ChefHat, Clock, MoreHorizontal, Store, X } from "lucide-react";
import { FOOD_MAP } from "@/data/foods";
import { RECIPE_MAP } from "@/data/recipes";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { CRITERIOS, LOCAIS_FORA, type CriterioRefeicao, type OpcaoTrocaAlimento, type OpcaoTrocaRefeicao } from "@/lib/nutrition/swaps";
import { aplicarTrocaAlimento, aplicarTrocaRefeicao, comerFora, desfazerComerFora, listarTrocasAlimento, listarTrocasRefeicao } from "@/lib/server/actions-plano";
import { registrarRefeicao } from "@/lib/server/actions-registro";
import type { ItemPlanejado, RefeicaoPlanejada } from "@/lib/types";
import { Badge, Button, cx } from "@/components/ui";

export interface RefeicaoView extends RefeicaoPlanejada {
  id: string;
  dia: string;
}

export function Sheet({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={onClose} className="flex size-10 items-center justify-center rounded-full hover:bg-surface-2" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function quantidade(i: ItemPlanejado, unidades: string) {
  if (unidades === "gramas") return `${Math.round(i.g)} g`;
  if (unidades === "caseiras") return i.medida;
  return (
    <>
      {i.medida} <span className="text-muted">· {Math.round(i.g)} g</span>
    </>
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
    <article className={cx("rounded-3xl border border-line bg-surface", compacto ? "p-4" : "p-5")}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {r.nome}
            {r.horario && ` · ${r.horario}`}
          </p>
          <h3 className="mt-0.5 font-bold leading-snug">
            {rec?.ilustracao && <span className="mr-1.5" aria-hidden>{rec.ilustracao}</span>}
            {r.foraDeCasa ? "Refeição fora de casa" : rec?.nome ?? "Refeição"}
          </h3>
          {r.nota && <p className="mt-0.5 text-xs text-muted">{r.nota}</p>}
        </div>
        <button onClick={() => setPainel("acoes")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line hover:bg-surface-2" aria-label={`Opções para ${r.nome}`}>
          <MoreHorizontal size={18} />
        </button>
      </header>

      {!r.foraDeCasa && (
        <ul className="mt-3 divide-y divide-line/70">
          {r.itens.map((i, k) => (
            <li key={k} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{FOOD_MAP[i.food]?.nome ?? i.food}</p>
                <p className="text-xs text-muted">
                  {quantidade(i, unidades)}
                  {i.preparo && ` · ${i.preparo}`}
                </p>
              </div>
              {!compacto && (
                <button onClick={() => trocarAlimento(k)} className="flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-brand hover:bg-brand-soft" aria-label={`Trocar ${FOOD_MAP[i.food]?.nome}`}>
                  <ArrowLeftRight size={14} /> Trocar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {mostrarMacros && !r.foraDeCasa && (
          <p className="tabular mr-auto text-xs text-muted">
            {Math.round(m.kcal)} kcal · P {Math.round(m.p)} g · C {Math.round(m.c)} g · G {Math.round(m.g)} g · F {Math.round(m.f)} g
          </p>
        )}
        {!mostrarMacros && <span className="mr-auto" />}
        {rec && !r.foraDeCasa && (
          <Link href={`/receitas/${rec.id}`} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
            <ChefHat size={14} /> {rec.tempo} min
          </Link>
        )}
      </footer>

      <div className="mt-3 flex gap-2">
        {registrado ? (
          <Badge tom="brand">
            <Check size={12} /> Registrado{registrado === "parcial" ? " (em parte)" : registrado === "nao" ? " (não segui)" : ""}
          </Badge>
        ) : (
          <>
            <Button variante="suave" className="min-h-9 flex-1 text-xs" onClick={() => registrar("sim")} disabled={pendente}>
              <Check size={14} /> Comi
            </Button>
            <Button variante="secundario" className="min-h-9 text-xs" onClick={() => registrar("parcial")} disabled={pendente}>
              Em parte
            </Button>
            <Button variante="secundario" className="min-h-9 text-xs" onClick={() => registrar("nao")} disabled={pendente}>
              Outra coisa
            </Button>
          </>
        )}
      </div>

      {painel === "acoes" && (
        <Sheet titulo={r.nome} onClose={() => setPainel(null)}>
          <div className="grid gap-2">
            {CRITERIOS.map((c) => (
              <Button key={c.id} variante="secundario" className="justify-start" onClick={() => trocarRefeicao(c.id)}>
                <ArrowLeftRight size={16} /> {c.nome}
              </Button>
            ))}
            {r.foraDeCasa ? (
              <Button variante="secundario" className="justify-start" onClick={() => start(async () => { await desfazerComerFora(r.id); setPainel(null); router.refresh(); })}>
                <Clock size={16} /> Voltar para a refeição planejada
              </Button>
            ) : (
              <Button variante="secundario" className="justify-start" onClick={() => setPainel("fora")}>
                <Store size={16} /> Vou comer fora
              </Button>
            )}
          </div>
        </Sheet>
      )}

      {painel === "fora" && (
        <Sheet titulo="Onde você vai comer?" onClose={() => setPainel(null)}>
          <div className="grid gap-2">
            {LOCAIS_FORA.map((l) => (
              <Button
                key={l.id}
                variante="secundario"
                className="justify-start"
                disabled={pendente}
                onClick={() =>
                  start(async () => {
                    setOrient(await comerFora(r.id, l.id));
                    setPainel("orientacao");
                    router.refresh();
                  })
                }
              >
                {l.nome}
              </Button>
            ))}
          </div>
        </Sheet>
      )}

      {painel === "orientacao" && (
        <Sheet titulo="Dicas para comer fora" onClose={() => setPainel(null)}>
          <ul className="space-y-2 text-sm">
            {orient.map((o) => (
              <li key={o} className="rounded-2xl bg-surface-2 px-3 py-2">{o}</li>
            ))}
          </ul>
        </Sheet>
      )}

      {painel === "trocaRefeicao" && (
        <Sheet titulo={CRITERIOS.find((c) => c.id === criterio)?.nome ?? "Trocar refeição"} onClose={() => setPainel(null)}>
          {!opRef ? (
            <p className="text-sm text-muted">Buscando opções equivalentes…</p>
          ) : opRef.length === 0 ? (
            <p className="text-sm text-muted">Não encontramos opções {criterio === "barato" ? "mais baratas" : criterio === "rapido" ? "mais rápidas" : ""} compatíveis com suas preferências e restrições.</p>
          ) : (
            <ul className="space-y-2">
              {opRef.map((o) => {
                const mo = macrosItens(o.refeicao.itens);
                return (
                  <li key={o.refeicao.receitaId}>
                    <button
                      className="w-full rounded-2xl border border-line p-3 text-left hover:border-brand"
                      disabled={pendente}
                      onClick={() => start(async () => { await aplicarTrocaRefeicao(r.id, o.refeicao); setPainel(null); router.refresh(); })}
                    >
                      <p className="font-semibold">{RECIPE_MAP[o.refeicao.receitaId!]?.ilustracao} {o.nomeReceita}</p>
                      <p className="text-xs text-muted">
                        {o.tempo} min · {brl(mo.custo)} {mostrarMacros && `· ${Math.round(mo.kcal)} kcal · P ${Math.round(mo.p)} g`}
                      </p>
                      <p className="mt-1 text-xs text-brand-strong">{o.diferencas.join(" · ")}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Sheet>
      )}

      {painel === "trocaAlimento" && (
        <Sheet titulo={`Trocar ${opAli ? FOOD_MAP[r.itens[opAli.indice].food]?.nome : "alimento"}`} onClose={() => setPainel(null)}>
          {!opAli ? (
            <p className="text-sm text-muted">Calculando equivalências…</p>
          ) : opAli.opcoes.length === 0 ? (
            <p className="text-sm text-muted">Não há substitutos compatíveis com suas restrições.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted">Quantidades ajustadas para equivalência aproximada {FOOD_MAP[r.itens[opAli.indice].food]?.grupo === "proteina" ? "em proteína" : "em energia"}.</p>
              <ul className="space-y-2">
                {opAli.opcoes.map((o) => (
                  <li key={o.item.food}>
                    <button
                      className="w-full rounded-2xl border border-line p-3 text-left hover:border-brand"
                      disabled={pendente}
                      onClick={() => start(async () => { await aplicarTrocaAlimento(r.id, opAli.indice, o.item); setPainel(null); router.refresh(); })}
                    >
                      <p className="font-semibold">{o.nome}</p>
                      <p className="text-xs text-muted">{o.item.medida} · {Math.round(o.item.g)} g</p>
                      <p className="mt-1 text-xs text-brand-strong">{o.diferencas.join(" · ")}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Sheet>
      )}
    </article>
  );
}

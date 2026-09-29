"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowLeftRight, Check, ChefHat, ChevronDown, ChevronRight, Clock, Leaf, PiggyBank, Store, Timer, X, Zap } from "lucide-react";
import { FOOD_MAP } from "@/data/foods";
import { RECIPE_MAP } from "@/data/recipes";
import { brl, formatMedida, macrosItens } from "@/lib/nutrition/foodmath";
import { CRITERIOS, LOCAIS_FORA, type CriterioRefeicao, type OpcaoTrocaAlimento, type OpcaoTrocaRefeicao } from "@/lib/nutrition/swaps";
import { aplicarTrocaAlimento, aplicarTrocaRefeicao, comerFora, desfazerComerFora, listarTrocasAlimento, listarTrocasRefeicao } from "@/lib/server/actions-plano";
import { desfazerRegistroRefeicao, registrarRefeicao } from "@/lib/server/actions-registro";
import type { ItemPlanejado, RefeicaoPlanejada } from "@/lib/types";
import { IconButton, cx } from "@/components/ui";

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
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-raised outline-none sm:rounded-2xl sm:pt-5"
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

/** Quantidade sempre recalculada a partir dos gramas (texto natural e consistente) */
function Quantidade({ i, unidades }: { i: ItemPlanejado; unidades: string }) {
  const g = `${Math.round(i.g)} g`;
  if (unidades === "gramas") return <>{g}</>;
  const caseira = formatMedida(i.food, i.g);
  if (unidades === "caseiras") return <>{caseira}</>;
  return (
    <>
      {caseira} <span className="text-muted">· {g}</span>
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
  qualquer: "Qualquer outra",
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

export type StatusRegistro = "sim" | "parcial" | "nao";
export interface Registro {
  status: StatusRegistro;
  hora?: string | null;
}

const TEXTO_REGISTRO: Record<StatusRegistro, string> = {
  sim: "Você comeu esta refeição",
  parcial: "Você comeu parte desta refeição",
  nao: "Você comeu outra coisa no lugar",
};

export function RefeicaoCard({
  r,
  registro = null,
  mostrarMacros = true,
  unidades = "ambos",
  compacto = false,
  abertoInicial = true,
}: {
  r: RefeicaoView;
  registro?: Registro | null;
  mostrarMacros?: boolean;
  unidades?: string;
  compacto?: boolean;
  abertoInicial?: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [painel, setPainel] = useState<null | "acoes" | "trocaRefeicao" | "trocaAlimento" | "fora" | "orientacao">(null);
  const [opRef, setOpRef] = useState<OpcaoTrocaRefeicao[] | null>(null);
  const [opAli, setOpAli] = useState<{ indice: number; opcoes: OpcaoTrocaAlimento[] } | null>(null);
  const [orient, setOrient] = useState<string[]>([]);
  // estado local espelha o que está salvo no servidor (e é atualizado na hora ao responder)
  const [reg, setReg] = useState<Registro | null>(registro);
  const chaveSalva = registro ? `${registro.status}|${registro.hora ?? ""}` : "";
  const [chaveAnterior, setChaveAnterior] = useState(chaveSalva);
  if (chaveSalva !== chaveAnterior) {
    setChaveAnterior(chaveSalva);
    setReg(registro);
  }
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
  const registrar = (s: StatusRegistro) =>
    start(async () => {
      setReg({ status: s });
      const res = await registrarRefeicao({ mealId: r.id, refeicao: r.nome, seguiu_plano: s, data: r.dia });
      if (res.ok) setReg({ status: s, hora: "hora" in res ? res.hora : undefined });
      router.refresh();
    });
  const desfazer = () =>
    start(async () => {
      setReg(null);
      await desfazerRegistroRefeicao(r.id);
      router.refresh();
    });

  const TEXTO_CURTO: Record<StatusRegistro, string> = { sim: "Comi", parcial: "Comi parte", nao: "Comi outra coisa" };

  return (
    <article className={cx("overflow-hidden rounded-2xl border bg-surface transition", aberto ? "border-line shadow-card" : "border-line")}>
      {/* Linha-resumo: tudo o que importa numa linha; toque para ver detalhes (divulgação progressiva) */}
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/60 sm:px-5"
      >
        {rec && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl" aria-hidden>
            {rec.ilustracao}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-tight">
            {r.nome}
            {r.horario && <span className="font-medium text-muted"> · {r.horario}</span>}
          </span>
          <span className="block truncate text-[14px] text-ink/75">{r.foraDeCasa ? "Fora de casa" : rec?.nome ?? "Refeição"}</span>
        </span>
        {reg ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
            <Check size={13} /> {TEXTO_CURTO[reg.status]}
          </span>
        ) : (
          <span className="hidden shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted sm:inline">Falta responder</span>
        )}
        <ChevronDown size={18} className={cx("shrink-0 text-muted transition", aberto && "rotate-180")} aria-hidden />
      </button>

      {aberto && (
        <div className="border-t border-line px-4 pb-4 pt-3 sm:px-5">
          {!r.foraDeCasa ? (
            <>
              <ul className="grid gap-x-6 2xl:grid-cols-2" aria-label={`Itens do ${r.nome.toLowerCase()}`}>
                {r.itens.map((i, k) => (
                  <li key={k} className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2 text-[15px]">
                    <span className="min-w-0 font-medium leading-snug">{FOOD_MAP[i.food]?.nome ?? i.food}</span>
                    <span className="tabular max-w-[58%] shrink-0 text-right text-[13px] leading-snug text-muted">
                      <Quantidade i={i} unidades={unidades} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                {mostrarMacros && <>≈ {Math.round(m.kcal)} kcal · {Math.round(m.p)} g de proteína · </>}
                Valores: {[...new Set(r.itens.map((i) => (FOOD_MAP[i.food]?.fonte ?? "").split(" ")[0]))].filter(Boolean).join(" / ")}
              </p>
            </>
          ) : (
            <button onClick={() => setPainel("fora")} className="min-h-10 text-sm font-semibold text-brand underline underline-offset-2">
              Ver dicas para comer fora
            </button>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {!compacto && (
              <button onClick={() => setPainel("acoes")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-2 text-sm font-semibold hover:border-brand/50 hover:bg-brand-soft/40">
                <ArrowLeftRight size={15} className="text-brand" /> Trocar algo
              </button>
            )}
            {rec && !r.foraDeCasa && (
              <Link href={`/receitas/${rec.id}`} className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-line px-2 text-sm font-semibold hover:border-brand/50 hover:bg-brand-soft/40">
                <ChefHat size={15} className="text-brand" /> Receita · {rec.tempo} min
              </Link>
            )}
          </div>

          {/* Registro: uma pergunta, três respostas numa linha; a resposta fica salva */}
          <div className="mt-4 rounded-xl bg-surface-2 p-3" aria-live="polite">
            {reg ? (
              <div className="flex items-center gap-3">
                <Check size={18} className="shrink-0 text-brand" aria-hidden />
                <p className="min-w-0 flex-1 text-sm font-semibold text-brand-strong">
                  {TEXTO_REGISTRO[reg.status]}
                  {reg.hora && <span className="font-normal text-muted"> · às {reg.hora.slice(0, 5)}</span>}
                </p>
                <button onClick={desfazer} disabled={pendente} className="min-h-9 shrink-0 px-2 text-sm font-semibold text-muted underline underline-offset-2 hover:text-ink disabled:opacity-60">
                  Desfazer
                </button>
              </div>
            ) : (
              <>
                <p className="mb-2 text-sm font-semibold">Você já comeu esta refeição?</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => registrar("sim")} disabled={pendente} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-brand px-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
                    <Check size={16} /> Sim
                  </button>
                  <button onClick={() => registrar("parcial")} disabled={pendente} className="min-h-11 rounded-xl border border-line bg-surface px-2 text-sm font-semibold hover:border-ink/20 disabled:opacity-60">
                    Só parte
                  </button>
                  <button onClick={() => registrar("nao")} disabled={pendente} className="min-h-11 whitespace-nowrap rounded-xl border border-line bg-surface px-1 text-[13px] font-semibold hover:border-ink/20 disabled:opacity-60 sm:text-sm">
                    Outra coisa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {painel === "acoes" && (
        <Sheet titulo="O que você quer trocar?" descricao={`${r.nome}${rec ? ` · ${rec.nome}` : ""}`} onClose={fechar}>
          {!r.foraDeCasa && (
            <>
              <p className="mb-2 text-sm font-bold">Só um alimento</p>
              <p className="mb-2 text-[13px] text-muted">Toque no alimento que você não tem ou não quer comer.</p>
              <ul className="mb-5 space-y-2">
                {r.itens.map((i, k) => (
                  <li key={k}>
                    <Opcao titulo={FOOD_MAP[i.food]?.nome ?? i.food} apoio={`${formatMedida(i.food, i.g)} · ${Math.round(i.g)} g`} onClick={() => trocarAlimento(k)} />
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mb-2 text-sm font-bold">A refeição inteira</p>
          <p className="mb-2 text-[13px] text-muted">Escolha o tipo de refeição que prefere no lugar desta.</p>
          <div className="grid grid-cols-2 gap-2">
            {CRITERIOS.map((c) => {
              const Icon = ICONE_CRITERIO[c.id];
              return (
                <button key={c.id} onClick={() => trocarRefeicao(c.id)} className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line px-3 text-left text-[15px] font-semibold hover:border-brand hover:bg-brand-soft/40">
                  <Icon size={18} className="shrink-0 text-brand" /> {ROTULO_CRITERIO[c.id]}
                </button>
              );
            })}
          </div>
          <p className="mb-2 mt-5 text-sm font-bold">Imprevisto</p>
          {r.foraDeCasa ? (
            <Opcao titulo="Voltar para a refeição planejada" apoio="Desfaz a marcação de refeição fora de casa" onClick={() => start(async () => { await desfazerComerFora(r.id); fechar(); router.refresh(); })} />
          ) : (
            <Opcao titulo={<span className="inline-flex items-center gap-2"><Store size={16} className="text-brand" /> Vou comer fora de casa</span>} apoio="Receba uma sugestão de prato para o lugar escolhido" onClick={() => setPainel("fora")} />
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
                    apoio={`${formatMedida(o.item.food, o.item.g)} · ${Math.round(o.item.g)} g`}
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

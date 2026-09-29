import { FOODS, getFood } from "@/data/foods";
import type { ItemPlanejado, Modo, RefeicaoPlanejada, TipoRefeicao } from "@/lib/types";
import { brl, item, macrosDe, macrosItens } from "./foodmath";
import { alimentoPermitido, custoPor500kcal, type ContextoPlano, montarRefeicao, receitasPermitidas, reescalarItens, TETO } from "./planner";

export interface OpcaoTrocaAlimento {
  item: ItemPlanejado;
  nome: string;
  diferencas: string[];
  custoDelta: number;
}

function diferencas(a: { kcal: number; p: number; f: number; na: number; custo: number }, b: typeof a): string[] {
  const out: string[] = [];
  const dk = b.kcal - a.kcal;
  const dp = b.p - a.p;
  const df = b.f - a.f;
  const dna = b.na - a.na;
  const dc = b.custo - a.custo;
  if (Math.abs(dk) >= 30) out.push(`${dk > 0 ? "+" : "−"}${Math.abs(Math.round(dk))} kcal`);
  if (Math.abs(dp) >= 3) out.push(`${dp > 0 ? "mais" : "menos"} proteína (${dp > 0 ? "+" : "−"}${Math.abs(Math.round(dp))} g)`);
  if (Math.abs(df) >= 2) out.push(`${df > 0 ? "mais" : "menos"} fibras (${df > 0 ? "+" : "−"}${Math.abs(Math.round(df))} g)`);
  if (Math.abs(dna) >= 150) out.push(`${dna > 0 ? "mais" : "menos"} sódio (${dna > 0 ? "+" : "−"}${Math.abs(Math.round(dna))} mg)`);
  if (Math.abs(dc) >= 0.5) out.push(`${dc > 0 ? "mais caro" : "mais barato"} (${dc > 0 ? "+" : "−"}${brl(Math.abs(dc))})`);
  if (!out.length) out.push("nutricionalmente muito parecido");
  return out;
}

/** Opções de troca de alimento com equivalência aproximada (proteína para itens proteicos, energia para os demais) */
export function opcoesTrocaAlimento(it: ItemPlanejado, ctx: ContextoPlano, limite = 6): OpcaoTrocaAlimento[] {
  const orig = getFood(it.food);
  const mOrig = macrosDe(it.food, it.g);
  const proteico = orig.grupo === "proteina" || (it.papel === "proteina" && orig.p >= 4);
  const grupos =
    orig.grupo === "proteina" || orig.grupo === "leguminosa"
      ? ["proteina", "leguminosa"]
      : orig.grupo === "laticinio"
        ? ["laticinio", "proteina"]
        : orig.grupo === "gordura" || orig.grupo === "oleaginosa"
          ? ["gordura", "oleaginosa"]
          : [orig.grupo];
  const cands = FOODS.filter((f) => f.id !== orig.id && grupos.includes(f.grupo) && alimentoPermitido(f, ctx));
  const opcoes = cands
    .map((f) => {
      let g = proteico && f.p >= 3 ? (mOrig.p / f.p) * 100 : (mOrig.kcal / Math.max(f.kcal, 1)) * 100;
      // porção prática: respeita o teto do grupo e evita quantidades desproporcionais
      g = Math.min(g, TETO[f.grupo] ?? 250, Math.max(it.g * 2.5, f.gMedida));
      const novo = item(f.id, g, undefined, it.papel);
      const m = macrosDe(f.id, novo.g);
      const score = Math.abs(m.kcal - mOrig.kcal) / 50 + Math.abs(m.p - mOrig.p) / 4 + Math.abs(m.f - mOrig.f) / 6 + (m.na > mOrig.na + 300 ? 2 : 0);
      return { novo, m, f, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limite);
  return opcoes.map(({ novo, m, f }) => ({
    item: novo,
    nome: f.nome,
    diferencas: diferencas(mOrig, m),
    custoDelta: m.custo - mOrig.custo,
  }));
}

export type CriterioRefeicao = "qualquer" | "barato" | "rapido" | "vegetariana" | "brasileira" | "japonesa" | "mediterranea";

export const CRITERIOS: { id: CriterioRefeicao; nome: string }[] = [
  { id: "qualquer", nome: "Trocar refeição" },
  { id: "barato", nome: "Quero algo mais barato" },
  { id: "rapido", nome: "Quero algo mais rápido" },
  { id: "vegetariana", nome: "Opção vegetariana" },
  { id: "brasileira", nome: "Opção brasileira" },
  { id: "japonesa", nome: "Opção japonesa" },
  { id: "mediterranea", nome: "Opção mediterrânea" },
];

export interface OpcaoTrocaRefeicao {
  refeicao: RefeicaoPlanejada;
  nomeReceita: string;
  tempo: number;
  diferencas: string[];
}

export function opcoesTrocaRefeicao(
  atual: RefeicaoPlanejada,
  ctx: ContextoPlano,
  criterio: CriterioRefeicao = "qualquer",
  receitaNome: (id: string) => { nome: string; tempo: number },
  limite = 5,
): OpcaoTrocaRefeicao[] {
  const mAtual = macrosItens(atual.itens);
  const ctxC: ContextoPlano = criterio === "vegetariana" ? { ...ctx, restricoes: [...ctx.restricoes, "vegetariano"] } : ctx;
  let pool = receitasPermitidas(atual.tipo, ctxC).filter((a) => a.receita.id !== atual.receitaId);
  if (["brasileira", "japonesa", "mediterranea"].includes(criterio)) pool = pool.filter((a) => a.receita.modos.includes(criterio as Modo));
  const atualTempo = atual.receitaId ? receitaNome(atual.receitaId).tempo : 30;
  if (criterio === "rapido") pool = pool.filter((a) => a.receita.tempo < atualTempo || a.receita.tempo <= 10);

  const opcoes = pool.map((a) => {
    const ref = montarRefeicao(a, atual.tipo, { kcal: mAtual.kcal, p: mAtual.p }, atual.horario, ctxC);
    return { ref, a, m: macrosItens(ref.itens) };
  });
  // Custo e praticidade nunca passam na frente da qualidade nutricional:
  // para "mais barato" e "mais rápido", só entram opções equivalentes em proteína e energia.
  if (criterio === "barato" || criterio === "rapido") {
    const equivalentes = opcoes.filter((o) => o.m.p >= mAtual.p * 0.85 && Math.abs(o.m.kcal - mAtual.kcal) <= mAtual.kcal * 0.12);
    opcoes.splice(0, opcoes.length, ...equivalentes);
  }
  if (criterio === "barato") {
    opcoes.sort((x, y) => x.m.custo - y.m.custo);
    const filtradas = opcoes.filter((o) => o.m.custo < mAtual.custo - 0.01);
    opcoes.splice(0, opcoes.length, ...filtradas);
  } else if (criterio === "rapido") {
    opcoes.sort((x, y) => x.a.receita.tempo - y.a.receita.tempo);
  } else {
    opcoes.sort((x, y) => Math.abs(x.m.kcal - mAtual.kcal) + Math.abs(x.m.p - mAtual.p) * 10 - (Math.abs(y.m.kcal - mAtual.kcal) + Math.abs(y.m.p - mAtual.p) * 10));
  }
  return opcoes.slice(0, limite).map((o) => ({
    refeicao: o.ref,
    nomeReceita: o.a.trocas.length ? `${o.a.receita.nome} (adaptada: ${o.a.trocas.join("; ")})` : o.a.receita.nome,
    tempo: o.a.receita.tempo,
    diferencas: diferencas(mAtual, o.m),
  }));
}

/** "Estou com mais/menos fome hoje": ajusta ~10% priorizando volume (vegetais) e proteína */
export function ajustarFomeRefeicao(r: RefeicaoPlanejada, direcao: "mais" | "menos"): RefeicaoPlanejada {
  const m = macrosItens(r.itens);
  const fator = direcao === "mais" ? 1.12 : 0.9;
  const pAlvo = direcao === "mais" ? m.p * 1.15 : m.p; // manter proteína ao reduzir
  let itens = reescalarItens(r.itens, m.kcal * fator, pAlvo);
  if (direcao === "mais") itens = itens.map((i) => (i.papel === "vegetal" ? item(i.food, i.g * 1.5, i.preparo, i.papel) : i));
  return { ...r, itens };
}

export const LOCAIS_FORA = [
  { id: "self_service", nome: "Self-service / por quilo" },
  { id: "japones", nome: "Restaurante japonês" },
  { id: "prato_feito", nome: "PF / restaurante executivo" },
  { id: "lanchonete", nome: "Lanchonete / padaria" },
  { id: "pizzaria", nome: "Pizzaria" },
  { id: "churrascaria", nome: "Churrascaria" },
  { id: "fast_food", nome: "Fast-food" },
] as const;

export function orientacaoComerFora(local: string, kcal: number, p: number, tipo: TipoRefeicao): string[] {
  const base = [
    `Referência para esta refeição: ~${Math.round(kcal / 10) * 10} kcal e ~${Math.round(p)} g de proteína. É uma referência, não uma regra.`,
    "Monte o prato: metade com vegetais, um quarto com proteína (≈ palma da mão), um quarto com carboidrato.",
    "Coma com calma e observe a saciedade. Se exagerar, siga o plano normalmente na próxima refeição — sem compensações.",
  ];
  const especificas: Record<string, string[]> = {
    self_service: ["Comece pela salada e legumes.", "Escolha uma proteína grelhada ou assada e uma porção de arroz com feijão.", "Frituras e molhos cremosos são possíveis, mas em porção menor."],
    japones: ["Prefira sashimi, peixes grelhados, missoshiru, sunomono e edamame.", "Temaki e hot roll são mais calóricos — escolha um se quiser.", "Use pouco shoyu (molhe só a ponta) para controlar o sódio."],
    prato_feito: ["Peça grelhado no lugar de frito, se possível.", "Arroz e feijão em porção habitual e salada à vontade."],
    lanchonete: ["Sanduíche natural, misto no pão integral ou tapioca com recheio proteico são boas opções.", "Um suco natural ou café acompanha bem; salgados fritos podem ser ocasionais."],
    pizzaria: ["2 fatias com uma salada antes costumam ser suficientes para muitas pessoas.", "Recheios com vegetais e proteína saciam mais."],
    churrascaria: ["Comece pelo buffet de saladas.", "Prefira cortes magros (maminha, patinho, frango) e controle o ritmo."],
    fast_food: ["Um sanduíche simples com salada e água ou refrigerante zero.", "Evite combos grandes; batata pequena se quiser."],
  };
  return [...(especificas[local] ?? []), ...base];
}

export { custoPor500kcal };

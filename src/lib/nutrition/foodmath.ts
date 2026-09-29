import { FOOD_MAP, getFood } from "@/data/foods";
import type { Food, ItemPlanejado, Macros } from "@/lib/types";

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, g: 0, f: 0, na: 0, custo: 0 };

export function macrosDe(foodId: string, gramas: number): Macros {
  const f = getFood(foodId);
  const k = gramas / 100;
  return {
    kcal: f.kcal * k,
    p: f.p * k,
    c: f.c * k,
    g: f.g * k,
    f: f.f * k,
    na: f.na * k,
    custo: custoDe(f, gramas),
  };
}

export function custoDe(f: Food, gramasProntos: number): number {
  return ((gramasProntos / f.rendimento) / 1000) * f.precoKg;
}

export function somar(lista: Macros[]): Macros {
  return lista.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, g: a.g + m.g, f: a.f + m.f, na: a.na + m.na, custo: a.custo + m.custo }),
    { ...ZERO },
  );
}

export function macrosItens(itens: { food: string; g: number }[]): Macros {
  return somar(itens.map((i) => macrosDe(i.food, i.g)));
}

export function arredondarMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    p: Math.round(m.p),
    c: Math.round(m.c),
    g: Math.round(m.g),
    f: Math.round(m.f),
    na: Math.round(m.na),
    custo: Math.round(m.custo * 100) / 100,
  };
}

function fracao(n: number): string {
  const inteiro = Math.floor(n);
  const resto = n - inteiro;
  const r = resto >= 0.75 ? "¾" : resto >= 0.5 ? "½" : resto >= 0.25 ? "¼" : "";
  if (inteiro === 0) return r || "¼";
  return `${inteiro}${r}`;
}

/** Converte gramas em medida caseira aproximada, ex.: "2 × concha média" */
export function formatMedida(foodId: string, gramas: number): string {
  const f = FOOD_MAP[foodId];
  if (!f) return `${Math.round(gramas)} g`;
  const q = gramas / f.gMedida;
  const arred = f.contavel ? Math.max(1, Math.round(q)) : Math.round(q * 4) / 4;
  const qtd = f.contavel ? String(arred) : fracao(arred);
  return arred === 1 ? `1 ${f.medida}` : `${qtd} × ${f.medida}`;
}

/** Arredonda gramas para valores práticos (unidades inteiras para alimentos contáveis) */
export function arredondarGramas(foodId: string, gramas: number): number {
  const f = getFood(foodId);
  if (f.contavel) return Math.max(1, Math.round(gramas / f.gMedida)) * f.gMedida;
  if (gramas < 20) return Math.max(1, Math.round(gramas));
  return Math.max(5, Math.round(gramas / 5) * 5);
}

export function item(foodId: string, g: number, preparo?: string, papel?: ItemPlanejado["papel"]): ItemPlanejado {
  const gr = arredondarGramas(foodId, g);
  return { food: foodId, g: gr, medida: formatMedida(foodId, gr), preparo, papel };
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

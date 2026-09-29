import { getFood } from "@/data/foods";
import { custoDe } from "./foodmath";

export interface ItemCompra {
  food_id: string;
  nome: string;
  categoria: string;
  quantidade_g: number; // na forma de compra
  quantidade_texto: string;
  custo: number;
  comprado: boolean;
  manual?: boolean;
}

const ORDEM_CATEGORIAS = [
  "Hortifrúti",
  "Proteínas animais",
  "Peixes e frutos do mar",
  "Ovos e laticínios",
  "Grãos e cereais",
  "Leguminosas",
  "Pães e massas",
  "Japoneses e orientais",
  "Oleaginosas e sementes",
  "Óleos e temperos",
  "Mercearia",
];

function textoQuantidade(foodId: string, g: number): string {
  const f = getFood(foodId);
  if (f.contavel && f.gMedida >= 20) {
    const un = Math.ceil(g / f.gMedida);
    return `${un} ${un === 1 ? "unidade" : "unidades"} (~${Math.round(g)} g)`;
  }
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace(".", ",")} kg`;
  return `${Math.round(g)} g`;
}

/** Soma ingredientes prontos e converte para quantidade de compra (considerando rendimento na cocção) */
export function montarLista(itens: { food: string; g: number }[], anterior: ItemCompra[] = []): ItemCompra[] {
  const soma = new Map<string, number>();
  for (const i of itens) soma.set(i.food, (soma.get(i.food) ?? 0) + i.g);
  const comprados = new Map(anterior.map((a) => [a.food_id, a.comprado]));
  const lista: ItemCompra[] = [];
  for (const [id, gPronto] of soma) {
    const f = getFood(id);
    const gCompra = Math.max(f.contavel ? f.gMedida : 50, Math.ceil(gPronto / f.rendimento / 10) * 10);
    lista.push({
      food_id: id,
      nome: f.nomeCompra ?? f.nome,
      categoria: f.categoria,
      quantidade_g: gCompra,
      quantidade_texto: textoQuantidade(id, gCompra),
      custo: Math.round(custoDe(f, gPronto) * 100) / 100,
      comprado: comprados.get(id) ?? false,
    });
  }
  for (const a of anterior.filter((x) => x.manual)) if (!soma.has(a.food_id)) lista.push(a);
  return ordenar(lista);
}

export function ordenar(lista: ItemCompra[]): ItemCompra[] {
  return [...lista].sort((a, b) => {
    const ca = ORDEM_CATEGORIAS.indexOf(a.categoria);
    const cb = ORDEM_CATEGORIAS.indexOf(b.categoria);
    return ca - cb || a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function agrupar(lista: ItemCompra[]): { categoria: string; itens: ItemCompra[] }[] {
  const m = new Map<string, ItemCompra[]>();
  for (const i of ordenar(lista)) m.set(i.categoria, [...(m.get(i.categoria) ?? []), i]);
  return [...m.entries()].map(([categoria, itens]) => ({ categoria, itens }));
}

/** Adiciona ingredientes (ex.: de uma receita) somando às quantidades existentes */
export function adicionarItens(lista: ItemCompra[], novos: { food: string; g: number }[]): ItemCompra[] {
  const out = lista.map((x) => ({ ...x }));
  for (const n of novos) {
    const f = getFood(n.food);
    const gCompra = Math.ceil(n.g / f.rendimento / 10) * 10;
    const custo = custoDe(f, n.g);
    const ex = out.find((x) => x.food_id === n.food);
    if (ex) {
      ex.quantidade_g += gCompra;
      ex.quantidade_texto = textoQuantidade(n.food, ex.quantidade_g);
      ex.custo = Math.round((ex.custo + custo) * 100) / 100;
      ex.comprado = false;
    } else {
      out.push({
        food_id: n.food,
        nome: f.nomeCompra ?? f.nome,
        categoria: f.categoria,
        quantidade_g: Math.max(gCompra, f.contavel ? f.gMedida : 10),
        quantidade_texto: textoQuantidade(n.food, Math.max(gCompra, 10)),
        custo: Math.round(custo * 100) / 100,
        comprado: false,
        manual: true,
      });
    }
  }
  return ordenar(out);
}

export function totalLista(lista: ItemCompra[]): number {
  return Math.round(lista.reduce((a, i) => a + i.custo, 0) * 100) / 100;
}

import { getFood } from "@/data/foods";
import { RECIPE_MAP } from "@/data/recipes";
import type { DiaPlanejado } from "@/lib/types";

export interface PassoPreparo {
  titulo: string;
  detalhes: string[];
}

const BASES_LOTE = ["arroz-branco", "arroz-integral", "feijao-carioca", "feijao-preto", "lentilha", "grao-de-bico", "quinoa"];
const PROTEINAS_LOTE = ["frango", "patinho", "lombo-porco", "tilapia", "sardinha-fresca", "ovo", "tofu"];
const HORTALICAS_LAVAR = ["alface", "tomate", "pepino", "cenoura", "repolho", "brocolis", "couve", "espinafre", "abobrinha", "abobora", "chuchu"];

/** Gera o roteiro de preparação antecipada da semana a partir dos dias do plano */
export function preparoSemanal(dias: DiaPlanejado[]): { passos: PassoPreparo[]; reaproveitamento: string[]; marmitas: number } {
  const total = new Map<string, number>();
  let marmitas = 0;
  for (const d of dias)
    for (const r of d.refeicoes) {
      if (r.receitaId && RECIPE_MAP[r.receitaId]?.tags.includes("marmita") && (r.tipo === "almoco" || r.tipo === "jantar")) marmitas++;
      for (const i of r.itens) total.set(i.food, (total.get(i.food) ?? 0) + i.g);
    }
  const g = (id: string) => total.get(id) ?? 0;
  const passos: PassoPreparo[] = [];

  const bases = BASES_LOTE.filter((id) => g(id) > 0).map((id) => {
    const f = getFood(id);
    return `${f.nome}: ~${Math.round(g(id))} g pronto (≈ ${Math.round(g(id) / f.rendimento)} g cru)`;
  });
  if (bases.length)
    passos.push({
      titulo: "1. Cozinhe as bases em lote",
      detalhes: [...bases, "Porcione em potes: o que for usado em até 3 dias vai à geladeira; o restante, ao congelador.", "Feijão e leguminosas congelam muito bem em porções de uma concha."],
    });

  const prots = PROTEINAS_LOTE.filter((id) => g(id) > 0).map((id) => {
    const f = getFood(id);
    return `${f.nome}: ~${Math.round(g(id))} g pronto${f.rendimento < 1 ? ` (≈ ${Math.round(g(id) / f.rendimento)} g cru)` : ""}`;
  });
  if (prots.length)
    passos.push({
      titulo: "2. Adiante as proteínas",
      detalhes: [...prots, "Tempere carnes e peixes com alho, limão e ervas e guarde em potes separados (até 2 dias na geladeira crus; congele o restante).", "Ovos podem ser cozidos de uma vez e guardados com casca por até 5 dias."],
    });

  const hort = HORTALICAS_LAVAR.filter((id) => g(id) > 0).map((id) => getFood(id).nome);
  if (hort.length)
    passos.push({
      titulo: "3. Higienize e corte vegetais",
      detalhes: [`Lave e seque: ${hort.join(", ")}.`, "Folhas: guarde secas em pote com papel-toalha.", "Cenoura e repolho podem ser ralados/fatiados com antecedência; brócolis e abóbora podem ser pré-cozidos."],
    });

  if (g("misso") > 0 || g("wakame") > 0)
    passos.push({
      titulo: "4. Base para missoshiru",
      detalhes: ["Hidrate a wakame e deixe tofu em cubos pronto.", "Faça um dashi caseiro (água + alga kombu e/ou shiitake seco) e guarde por até 3 dias.", "Dissolva o missô só na hora de servir, sem ferver."],
    });

  if (marmitas)
    passos.push({
      titulo: `${passos.length + 1}. Monte as marmitas`,
      detalhes: [`O plano da semana tem ${marmitas} refeições que funcionam como marmita.`, "Monte até 3 dias na geladeira e congele as demais.", "Descongele na geladeira na noite anterior."],
    });

  const reaproveitamento: string[] = [];
  if (g("arroz-branco") > 0) reaproveitamento.push("Sobrou arroz? Vira onigiri, arroz de forno com legumes ou bolinho assado.");
  if (g("frango") > 0) reaproveitamento.push("Frango grelhado desfiado rende recheio de tapioca, salada ou sanduíche.");
  if (g("feijao-carioca") + g("feijao-preto") > 0) reaproveitamento.push("Feijão que sobrou pode virar caldo ou tutu com farinha de mandioca.");
  if (g("abobora") > 0) reaproveitamento.push("Cascas e sementes de abóbora podem ser assadas; o miolo vira purê ou sopa.");
  if (g("brocolis") > 0) reaproveitamento.push("Talos de brócolis picados entram em refogados e omeletes.");
  if (g("banana") > 0) reaproveitamento.push("Bananas muito maduras: congele em rodelas para vitaminas.");
  reaproveitamento.push("Planeje as compras pela lista para evitar desperdício; confira a geladeira antes de sair.");

  return { passos, reaproveitamento, marmitas };
}

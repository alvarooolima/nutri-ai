import type { ResultadoCalculo } from "./calc";
import type { AvaliacaoSeguranca } from "./safety";

export type TipoRecomendacao = "estimativa" | "evidencia" | "hipotese" | "orientacao_profissional";

export interface Recomendacao {
  categoria: string;
  tipo: TipoRecomendacao;
  recommendation: string;
  rationale: string;
  dados_usuario: Record<string, unknown>;
  scientific_source_ids: string[];
  evidence_level: string;
  limitations: string;
}

export const ROTULO_TIPO: Record<TipoRecomendacao, string> = {
  estimativa: "Estimativa",
  evidencia: "Baseado em evidência",
  hipotese: "Hipótese de trabalho",
  orientacao_profissional: "Validar com profissional",
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function gerarRecomendacoes(
  calc: ResultadoCalculo,
  dados: { peso: number; altura: number; idade: number; sexo: string; objetivo: string; modo: string; nivelAtividade: string; exercicios: number },
  seg: AvaliacaoSeguranca,
  mediaPlano: { kcal: number; p: number; f: number; na: number; custo: number },
): Recomendacao[] {
  const recs: Recomendacao[] = [];

  recs.push({
    categoria: "Energia",
    tipo: "estimativa",
    recommendation: `Meta de energia de ~${fmt(calc.meta.kcal)} kcal/dia (faixa ${fmt(calc.meta.faixa.min)}–${fmt(calc.meta.faixa.max)} kcal).`,
    rationale: `Taxa metabólica basal estimada em ${fmt(calc.tmb.mifflin)} kcal (Mifflin-St Jeor) e ${fmt(calc.tmb.harrisBenedict)} kcal (Harris-Benedict). Gasto diário estimado ${fmt(calc.get.faixa.min)}–${fmt(calc.get.faixa.max)} kcal (${calc.pal.categoria}) e ~${fmt(calc.gastoExercicio)} kcal/dia de exercícios. ${calc.meta.descricao}.`,
    dados_usuario: { peso: dados.peso, altura: dados.altura, idade: dados.idade, sexo: dados.sexo, nivelAtividade: dados.nivelAtividade, exerciciosPorSemana: dados.exercicios },
    scientific_source_ids: ["mifflin-1990", "frankenfield-2005", "roza-1984", "fao-2004", ...(dados.objetivo === "perda_peso" ? ["jensen-2014", "hall-2011"] : [])],
    evidence_level: "Equações validadas em estudos; revisão sistemática",
    limitations: "Equações preditivas têm erro individual de cerca de ±10% ou mais. Por isso trabalhamos com faixa e ajustamos pelos seus registros a cada 1–2 semanas.",
  });

  const protFontes = dados.objetivo === "ganho_massa" ? ["morton-2018", "jager-2017"] : dados.objetivo === "performance" ? ["jager-2017", "acsm-2016"] : dados.objetivo === "perda_peso" ? ["jager-2017", "helms-2014", "iom-2005"] : ["iom-2005"];
  if (dados.idade >= 65) protFontes.push("bauer-2013");
  recs.push({
    categoria: "Proteína",
    tipo: seg.restricoesCalculo.proteinaMaxGkg !== undefined ? "orientacao_profissional" : "evidencia",
    recommendation: `~${calc.proteina.g} g de proteína por dia (${calc.proteina.gPorKg.toString().replace(".", ",")} g/kg), distribuídos nas refeições.`,
    rationale: `Faixa adotada para o objetivo "${dados.objetivo.replace("_", " ")}": ${calc.proteina.faixaGkg.min}–${calc.proteina.faixaGkg.max} g/kg${calc.pesoReferenciaAjustado ? `, sobre peso de referência ajustado de ${calc.pesoReferencia} kg` : ""}.`,
    dados_usuario: { pesoReferencia: calc.pesoReferencia, objetivo: dados.objetivo, idade: dados.idade },
    scientific_source_ids: protFontes,
    evidence_level: "Meta-análise e posicionamentos de sociedades científicas",
    limitations: calc.pesoReferenciaAjustado
      ? "O uso de peso ajustado em pessoas com IMC ≥ 30 é uma hipótese de trabalho comum na prática clínica, sem consenso único."
      : "Benefícios adicionais acima de ~1,6 g/kg são pequenos para a maioria das pessoas.",
  });

  recs.push({
    categoria: "Fibras e grãos integrais",
    tipo: "evidencia",
    recommendation: `Pelo menos ${calc.fibra.g} g de fibras por dia (plano atual: ~${Math.round(mediaPlano.f)} g).`,
    rationale: "Fibras vêm de feijões, legumes, frutas, verduras e grãos integrais, que também aumentam a saciedade.",
    dados_usuario: { metaKcal: calc.meta.kcal },
    scientific_source_ids: ["reynolds-2019", "aune-2016", "iom-2005"],
    evidence_level: "Revisões sistemáticas e meta-análises (predominantemente estudos observacionais)",
    limitations: "Grande parte da evidência é observacional. Aumente fibras aos poucos se tiver sintomas intestinais.",
  });

  recs.push({
    categoria: "Grau de processamento",
    tipo: "evidencia",
    recommendation: "O plano é baseado em alimentos in natura e minimamente processados, com ultraprocessados em segundo plano.",
    rationale: "Diretriz brasileira oficial e ensaio clínico controlado indicam que dietas ultraprocessadas favorecem maior ingestão calórica.",
    dados_usuario: {},
    scientific_source_ids: ["guia-alimentar-2014", "hall-2019"],
    evidence_level: "Diretriz oficial + ensaio clínico randomizado",
    limitations: "O ensaio de Hall et al. foi pequeno e de curta duração. Não é preciso eliminar totalmente — ocasionais cabem no plano.",
  });

  recs.push({
    categoria: "Sódio",
    tipo: "evidencia",
    recommendation: `Manter o sódio abaixo de 2.000 mg/dia (plano atual: ~${fmt(Math.round(mediaPlano.na))} mg de sódio dos ingredientes, sem contar sal de cozinha).`,
    rationale: dados.modo === "japonesa" ? "Na culinária japonesa, shoyu e missô concentram sódio; por isso o plano usa pequenas quantidades." : "Menos sódio contribui para o controle da pressão arterial.",
    dados_usuario: { modo: dados.modo },
    scientific_source_ids: ["who-sodium-2012"],
    evidence_level: "Diretriz oficial",
    limitations: "O sal adicionado no preparo não é totalmente estimado. Algumas condições exigem metas individuais.",
  });

  if (calc.agua.ml)
    recs.push({
      categoria: "Hidratação",
      tipo: "estimativa",
      recommendation: `Cerca de ${fmt(calc.agua.ml)} ml de líquidos por dia (faixa ${fmt(calc.agua.faixa!.min)}–${fmt(calc.agua.faixa!.max)} ml).`,
      rationale: "Estimativa por peso corporal e tempo de exercício; em dias quentes ou de treino mais longo a necessidade aumenta.",
      dados_usuario: { peso: dados.peso },
      scientific_source_ids: ["efsa-water-2010"],
      evidence_level: "Parecer científico de referência",
      limitations: "A sede e a cor da urina são bons guias para pessoas saudáveis.",
    });

  if (dados.modo === "japonesa")
    recs.push({
      categoria: "Padrão alimentar japonês",
      tipo: "evidencia",
      recommendation: "Usar princípios da alimentação japonesa: arroz, peixes, soja, vegetais, algas, sopas e preparações cozidas/grelhadas.",
      rationale: "Maior aderência ao guia alimentar japonês associou-se a menor mortalidade em coorte com ~79 mil pessoas.",
      dados_usuario: { modo: dados.modo },
      scientific_source_ids: ["kurotani-2016"],
      evidence_level: "Estudo de coorte prospectivo",
      limitations: "Associação observacional em população japonesa; não prova que o padrão cause os benefícios em brasileiros.",
    });

  if (dados.modo === "mediterranea")
    recs.push({
      categoria: "Padrão mediterrâneo",
      tipo: "evidencia",
      recommendation: "Azeite de oliva, leguminosas, peixes, oleaginosas e vegetais como base.",
      rationale: "Ensaio randomizado mostrou menos eventos cardiovasculares com dieta mediterrânea suplementada com azeite ou oleaginosas.",
      dados_usuario: { modo: dados.modo },
      scientific_source_ids: ["estruch-2018"],
      evidence_level: "Ensaio clínico randomizado",
      limitations: "População espanhola de alto risco; o estudo foi republicado após problemas de randomização em alguns centros.",
    });

  recs.push({
    categoria: "Composição dos alimentos",
    tipo: "estimativa",
    recommendation: "Valores nutricionais do plano calculados a partir da TACO e do USDA FoodData Central.",
    rationale: "Cada alimento indica a fonte dos dados. Custos são estimativas de varejo para planejamento.",
    dados_usuario: {},
    scientific_source_ids: ["taco-2011", "usda-fdc"],
    evidence_level: "Base de dados de referência",
    limitations: "Valores médios; variam por marca, safra e forma de preparo. Preços variam por região e época.",
  });

  for (const v of seg.validarComProfissional)
    recs.push({
      categoria: "Validação profissional",
      tipo: "orientacao_profissional",
      recommendation: v,
      rationale: "Pontos em que seu contexto de saúde pode exigir ajustes que o sistema não deve fazer sozinho.",
      dados_usuario: { consideradas: seg.consideradas },
      scientific_source_ids: [],
      evidence_level: "—",
      limitations: "O NUTRI.AI não substitui médico ou nutricionista.",
    });

  return recs;
}

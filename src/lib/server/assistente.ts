import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FOOD_MAP, FOODS } from "@/data/foods";
import { RECIPE_MAP } from "@/data/recipes";
import { brl, macrosItens } from "@/lib/nutrition/foodmath";
import { addDias, montarRefeicao, receitasPermitidas, type ContextoPlano } from "@/lib/nutrition/planner";
import { normalizar } from "@/lib/nutrition/safety";
import { ajustarFomeRefeicao, CRITERIOS, LOCAIS_FORA, opcoesTrocaAlimento, opcoesTrocaRefeicao, orientacaoComerFora, type CriterioRefeicao } from "@/lib/nutrition/swaps";
import type { ItemPlanejado, RefeicaoPlanejada } from "@/lib/types";
import { carregarPerfil, contextoCompleto, type PerfilCompleto } from "./perfil";
import { hojeSP, planoAtivo, refeicoesDoPlano, substituirItensRefeicao, type RefeicaoDB } from "./planos";

export type AcaoSugerida =
  | { tipo: "troca_refeicao"; rotulo: string; mealId: string; refeicao: RefeicaoPlanejada }
  | { tipo: "troca_alimento"; rotulo: string; mealId: string; indice: number; item: ItemPlanejado }
  | { tipo: "comer_fora"; rotulo: string; mealId: string; local: string }
  | { tipo: "fome"; rotulo: string; data: string; direcao: "mais" | "menos" }
  | { tipo: "link"; rotulo: string; href: string };

export interface RespostaAssistente {
  texto: string;
  acoes: AcaoSugerida[];
  fonte: "claude" | "regras";
}

interface Ctx {
  supabase: SupabaseClient;
  userId: string;
  perfil: PerfilCompleto;
  ctx: ContextoPlano;
  hoje: RefeicaoDB[];
  amanha: RefeicaoDB[];
  esconderCalorias: boolean;
}

const receitaInfo = (id: string) => ({ nome: RECIPE_MAP[id]?.nome ?? id, tempo: RECIPE_MAP[id]?.tempo ?? 30 });

function agoraHHMM() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function proximaRefeicao(c: Ctx, tipoPreferido?: string): RefeicaoDB | undefined {
  if (tipoPreferido) {
    const r = c.hoje.find((x) => x.tipo === tipoPreferido) ?? c.amanha.find((x) => x.tipo === tipoPreferido);
    if (r) return r;
  }
  const h = agoraHHMM();
  return c.hoje.find((r) => (r.horario ?? "23:59") >= h) ?? c.amanha[0] ?? c.hoje[c.hoje.length - 1];
}

function resumoRefeicao(r: RefeicaoDB, esconder: boolean) {
  const m = macrosItens(r.itens);
  const itens = r.itens.map((i) => `${FOOD_MAP[i.food]?.nome} (${i.medida})`).join(", ");
  return `${r.nome}${r.horario ? ` ${r.horario}` : ""}: ${RECIPE_MAP[r.receitaId ?? ""]?.nome ?? "refeição"} — ${itens}${esconder ? "" : ` [~${Math.round(m.kcal)} kcal, P ${Math.round(m.p)} g]`}, custo ~${brl(m.custo)}`;
}

function detectarTipo(t: string): string | undefined {
  if (/almoc/.test(t)) return "almoco";
  if (/jant/.test(t)) return "jantar";
  if (/cafe da manha|cafe-da-manha|desjejum/.test(t)) return "cafe";
  if (/ceia/.test(t)) return "ceia";
  if (/lanche/.test(t)) return "lanche";
  return undefined;
}

/** Sugestões de refeição que cabem em um valor para N pessoas */
export function opcoesOrcamento(c: Ctx, valor: number, pessoas: number, tipo: string, alvo: { kcal: number; p: number }) {
  return receitasPermitidas(tipo as RefeicaoPlanejada["tipo"], c.ctx)
    .filter((a) => !a.trocas.length)
    .map((a) => {
      const r = montarRefeicao(a, tipo as RefeicaoPlanejada["tipo"], alvo, undefined, c.ctx);
      const custo = macrosItens(r.itens).custo * pessoas;
      return { r, custo, nome: a.receita.nome, tempo: a.receita.tempo };
    })
    .filter((x) => x.custo <= valor)
    .sort((x, y) => x.custo - y.custo)
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Motor de regras (funciona sem chave de API)
// ---------------------------------------------------------------------------

export function responderPorRegras(c: Ctx, msg: string): RespostaAssistente {
  const t = normalizar(msg);
  const nome = c.perfil.nome.split(" ")[0] || "";
  const acoes: AcaoSugerida[] = [];
  const tipo = detectarTipo(t);
  const prox = proximaRefeicao(c, tipo);

  // Tenho R$ X para ... N pessoas
  const valorM = t.match(/r\$\s*(\d+(?:[.,]\d+)?)/) ?? t.match(/(\d+(?:[.,]\d+)?)\s*(?:reais|conto)/);
  if (valorM) {
    const valor = Number(valorM[1].replace(",", "."));
    const pessoasM = t.match(/(\d+)\s*pessoas?/) ?? (/duas pessoas|dois|casal|a dois/.test(t) ? ["", "2"] : /tres pessoas/.test(t) ? ["", "3"] : null);
    const pessoas = pessoasM ? Number(pessoasM[1]) : 1;
    const tipoRef = tipo ?? prox?.tipo ?? "jantar";
    const alvo = prox ? { kcal: macrosItens(prox.itens).kcal, p: macrosItens(prox.itens).p } : { kcal: 600, p: 35 };
    const ops = opcoesOrcamento(c, valor, pessoas, tipoRef, alvo);
    if (!ops.length)
      return { fonte: "regras", acoes: [{ tipo: "link", rotulo: "Ver receitas de baixo custo", href: "/receitas?modo=baixo_custo" }], texto: `Com ${brl(valor)} para ${pessoas} pessoa(s) ficou apertado para as receitas compatíveis com suas preferências. Uma saída é arroz, feijão e ovos com legumes da estação — costuma ficar abaixo de R$ 6 por pessoa.` };
    const alvoRef = prox && prox.tipo === tipoRef ? prox : c.hoje.find((r) => r.tipo === tipoRef);
    for (const o of ops) if (alvoRef) acoes.push({ tipo: "troca_refeicao", rotulo: `Usar “${o.nome}” no ${alvoRef.nome.toLowerCase()}`, mealId: alvoRef.id, refeicao: o.r });
    return {
      fonte: "regras",
      acoes,
      texto:
        `Com ${brl(valor)} para ${pessoas} pessoa${pessoas > 1 ? "s" : ""}, estas opções cabem no orçamento e respeitam suas restrições:\n` +
        ops.map((o) => `• ${o.nome} — ~${brl(o.custo)} no total (${o.tempo} min)`).join("\n") +
        `\nAs porções da outra pessoa podem ser ajustadas à fome dela. Custos são estimativas.`,
    };
  }

  if (/nao consegui (almocar|jantar|comer|tomar cafe|lanchar)|pulei (o|a)? ?(almoco|jantar|refeicao|cafe)|fiquei sem comer/.test(t)) {
    // sugestões rápidas sem adaptação (o nome da receita corresponde exatamente ao que será comido)
    const rapidas = receitasPermitidas("lanche", c.ctx).filter((a) => a.receita.tempo <= 5 && !a.trocas.length).slice(0, 3).map((a) => a.receita.nome.toLowerCase());
    const seguinte = [...c.hoje, ...c.amanha].find((r) => r.tipo !== tipo && (r.dia !== hojeSP() || (r.horario ?? "") > agoraHHMM()));
    return {
      fonte: "regras",
      acoes: seguinte ? [{ tipo: "link", rotulo: `Ver ${seguinte.nome.toLowerCase()}`, href: `/plano?dia=${seguinte.dia}` }] : [],
      texto: `Acontece${nome ? `, ${nome}` : ""} — não precisa compensar nem pular a próxima refeição. Se ainda falta muito para ${seguinte ? `o ${seguinte.nome.toLowerCase()} (${seguinte.horario ?? "mais tarde"})` : "a próxima refeição"}, faça algo rápido agora${rapidas.length ? `, como ${rapidas.join(", ")}` : ""}. Depois, coma normalmente e com calma, observando a fome — se estiver maior, aumente um pouco vegetais e proteína.`,
    };
  }

  if (/(muita|mais|bastante) fome|fome demais|morrendo de fome|faminto|faminta/.test(t)) {
    acoes.push({ tipo: "fome", rotulo: "Aumentar as porções de hoje", data: hojeSP(), direcao: "mais" });
    const sono = c.perfil.rotina.horasSono && c.perfil.rotina.horasSono < 7 ? " Você dorme menos de 7 h — sono curto costuma aumentar a fome." : "";
    return { fonte: "regras", acoes, texto: `Fome é um sinal a respeitar, não a vencer. Posso aumentar as porções de hoje priorizando vegetais e proteína, que dão mais saciedade. Também ajuda: beber água, comer mais devagar e não ficar muitas horas sem comer.${sono}` };
  }
  if (/(pouca|menos|sem) fome|nao estou com fome|enjoad/.test(t)) {
    acoes.push({ tipo: "fome", rotulo: "Reduzir as porções de hoje", data: hojeSP(), direcao: "menos" });
    return { fonte: "regras", acoes, texto: "Tudo bem ter menos fome em alguns dias. Posso reduzir um pouco as porções mantendo a proteína. Se a falta de apetite durar vários dias ou vier com enjoo ou perda de peso sem intenção, vale conversar com um médico." };
  }

  const semM = t.match(/(?:nao tenho|acabou|sem|faltou|nao achei|nao encontrei)\s+(?:o |a |os |as )?([a-z\s-]+)/);
  if (semM) {
    const termo = semM[1].trim().split(/\s+/).slice(0, 2).join(" ");
    const food = FOODS.find((f) => normalizar(f.nome).startsWith(termo)) ?? FOODS.find((f) => normalizar(f.nome).includes(termo.split(" ")[0]));
    if (food && !/tempo/.test(termo)) {
      const refs = [...c.hoje, ...c.amanha].filter((r) => r.itens.some((i) => i.food === food.id));
      if (!refs.length) return { fonte: "regras", acoes: [], texto: `Boa notícia: ${food.nome.toLowerCase()} não aparece nas suas refeições de hoje e amanhã.` };
      const r = refs[0];
      const indice = r.itens.findIndex((i) => i.food === food.id);
      const ops = opcoesTrocaAlimento(r.itens[indice], c.ctx, 3);
      for (const o of ops) acoes.push({ tipo: "troca_alimento", rotulo: `Trocar por ${o.nome} (${o.item.medida})`, mealId: r.id, indice, item: o.item });
      return { fonte: "regras", acoes, texto: `Sem problema. No seu ${r.nome.toLowerCase()} ${r.dia === hojeSP() ? "de hoje" : "de amanhã"}, dá para substituir ${food.nome.toLowerCase()} por:\n${ops.map((o) => `• ${o.nome}: ${o.item.medida} — ${o.diferencas.join(", ")}`).join("\n")}` };
    }
  }

  if (/japon|sushi|temaki|oriental/.test(t)) {
    if (/restaurante|fora|pedir|delivery|rodizio/.test(t)) {
      const m = prox ? macrosItens(prox.itens) : { kcal: 600, p: 35 };
      if (prox) acoes.push({ tipo: "comer_fora", rotulo: `Marcar ${prox.nome.toLowerCase()} como fora de casa`, mealId: prox.id, local: "japones" });
      return { fonte: "regras", acoes, texto: orientacaoComerFora("japones", m.kcal, m.p, prox?.tipo ?? "jantar").map((x) => `• ${x}`).join("\n") };
    }
    if (prox) {
      const ops = opcoesTrocaRefeicao(prox, c.ctx, "japonesa", receitaInfo, 3);
      for (const o of ops) acoes.push({ tipo: "troca_refeicao", rotulo: `${o.nomeReceita} (${o.tempo} min)`, mealId: prox.id, refeicao: o.refeicao });
      return { fonte: "regras", acoes, texto: ops.length ? `Ótima ideia! Para o ${prox.nome.toLowerCase()}, estas opções japonesas têm energia e proteína parecidas com o planejado. Use shoyu com moderação (1 colher de chá).` : "Não encontrei opções japonesas compatíveis com suas restrições para essa refeição." };
    }
  }

  if (/sem tempo|pressa|corrid|rapido|rapida|atrasad/.test(t) && prox) {
    const ops = opcoesTrocaRefeicao(prox, c.ctx, "rapido", receitaInfo, 3);
    for (const o of ops) acoes.push({ tipo: "troca_refeicao", rotulo: `${o.nomeReceita} (${o.tempo} min)`, mealId: prox.id, refeicao: o.refeicao });
    return { fonte: "regras", acoes, texto: `Vamos simplificar o ${prox.nome.toLowerCase()}. Estas opções ficam prontas rápido e mantêm o equilíbrio. Dica: cozinhar arroz, feijão e proteína em lote no fim de semana deixa os dias corridos mais fáceis (veja Preparação semanal).` };
  }

  if (/comer fora|restaurante|vou sair|almocar fora|jantar fora|delivery|ifood|marmitex/.test(t) && prox) {
    for (const l of LOCAIS_FORA) acoes.push({ tipo: "comer_fora", rotulo: l.nome, mealId: prox.id, local: l.id });
    return { fonte: "regras", acoes, texto: `Sem problema! Onde vai ser o ${prox.nome.toLowerCase()}? Escolha abaixo que eu te passo uma referência de prato — sem regras rígidas.` };
  }

  if (/nao gostei|nao curti|ruim|enjoei|cansei d/.test(t) && prox) {
    const alvo = tipo ? prox : c.hoje.filter((r) => (r.horario ?? "") <= agoraHHMM()).pop() ?? prox;
    const ops = opcoesTrocaRefeicao(alvo, c.ctx, "qualquer", receitaInfo, 3);
    for (const o of ops) acoes.push({ tipo: "troca_refeicao", rotulo: o.nomeReceita, mealId: alvo.id, refeicao: o.refeicao });
    acoes.push({ tipo: "link", rotulo: "Marcar alimentos que não gosto", href: "/perfil?aba=6" });
    return { fonte: "regras", acoes, texto: `Obrigado por avisar — gosto conta muito para o plano funcionar. Posso trocar “${RECIPE_MAP[alvo.receitaId ?? ""]?.nome ?? alvo.nome}” por uma destas opções equivalentes. Se algum ingrediente específico não te agrada, marque em Preferências para ele não voltar.` };
  }

  const p = prox ? `Sua próxima refeição: ${resumoRefeicao(prox, c.esconderCalorias)}.` : "Você ainda não tem refeições planejadas para hoje.";
  return {
    fonte: "regras",
    acoes: CRITERIOS.slice(1, 4).flatMap((cr) => (prox ? [{ tipo: "link" as const, rotulo: cr.nome, href: `/plano?dia=${prox.dia}` }] : [])),
    texto: `${p}\n\nPosso ajudar com situações como: “não consegui almoçar”, “estou com muita fome”, “não tenho frango”, “quero fazer japonês”, “estou sem tempo”, “vou comer fora”, “tenho R$ 30 para o jantar de duas pessoas” ou “não gostei dessa refeição”.`,
  };
}

// ---------------------------------------------------------------------------
// Claude (quando ANTHROPIC_API_KEY está configurada)
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "ver_refeicoes",
    description: "Lista as refeições planejadas de hoje e de amanhã, com id, itens, quantidades, energia, proteína e custo estimado.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "opcoes_troca_refeicao",
    description: "Busca alternativas equivalentes para uma refeição do plano. Critérios: qualquer, barato, rapido, vegetariana, brasileira, japonesa, mediterranea.",
    input_schema: { type: "object", properties: { meal_id: { type: "string" }, criterio: { type: "string", enum: CRITERIOS.map((c) => c.id) } }, required: ["meal_id", "criterio"], additionalProperties: false },
  },
  {
    name: "opcoes_troca_alimento",
    description: "Lista substitutos com equivalência nutricional aproximada para um item (índice começando em 0) de uma refeição.",
    input_schema: { type: "object", properties: { meal_id: { type: "string" }, indice: { type: "integer" } }, required: ["meal_id", "indice"], additionalProperties: false },
  },
  {
    name: "opcoes_por_orcamento",
    description: "Sugere refeições que cabem em um valor (R$) para um número de pessoas, respeitando restrições do usuário.",
    input_schema: { type: "object", properties: { valor: { type: "number" }, pessoas: { type: "integer" }, tipo_refeicao: { type: "string", enum: ["cafe", "almoco", "lanche", "jantar", "ceia"] } }, required: ["valor", "pessoas", "tipo_refeicao"], additionalProperties: false },
  },
  {
    name: "orientacao_comer_fora",
    description: "Orientações práticas para comer fora, considerando a meta da refeição. Locais: " + LOCAIS_FORA.map((l) => l.id).join(", "),
    input_schema: { type: "object", properties: { meal_id: { type: "string" }, local: { type: "string", enum: LOCAIS_FORA.map((l) => l.id) } }, required: ["meal_id", "local"], additionalProperties: false },
  },
];

const SISTEMA = `Você é o assistente do NUTRI.AI, um app brasileiro de planejamento alimentar baseado em evidências.
Responda em português do Brasil, de forma acolhedora, prática e breve (até ~120 palavras, listas curtas quando ajudar).
Use o perfil e o plano do usuário para responder de forma específica — evite respostas genéricas quando houver dados.
Regras obrigatórias:
- Você não é médico nem nutricionista. Não diagnostica, não prescreve tratamento, não sugere iniciar/suspender/alterar medicamentos e não afirma que alimento cura doença.
- Diante de sintomas de alerta (dor no peito, sangue nas fezes, desmaio, vômitos persistentes, perda de peso sem intenção, dificuldade para engolir), oriente procurar atendimento médico.
- Não moralize alimentos como "bons" ou "ruins" e não trate desvios do plano como fracasso. Não sugira compensações ou jejum após exageros.
- Respeite alergias, intolerâncias, restrições e alimentos rejeitados do perfil. Considere o contexto de saúde como segurança, sem transformar diagnóstico em "dieta para a doença".
- Associação não é causalidade: se falar de sintomas e alimentos, deixe isso claro.
- Diferencie estimativa de evidência. Não invente referências científicas.
- Para trocar refeições/alimentos use as ferramentas de opções; as opções encontradas viram botões que o usuário toca para aplicar — então diga que ele pode escolher uma delas abaixo. Nunca afirme que aplicou uma mudança.
- Se o perfil indicar ocultar calorias, não cite números de calorias.`;

export async function responderComClaude(c: Ctx, historico: { role: "user" | "assistant"; content: string }[], msg: string): Promise<RespostaAssistente> {
  const client = new Anthropic();
  const acoes: AcaoSugerida[] = [];
  const perfil = c.perfil;
  const contexto = [
    `Nome: ${perfil.nome}. Objetivo: ${perfil.objetivo.principal}. Modo alimentar: ${perfil.alimentacao.modo}.`,
    `Restrições: ${perfil.saude.restricoes.join(", ") || "nenhuma"}. Alergias/intolerâncias: ${[...perfil.saude.alergias, ...perfil.saude.intolerancias].join(", ") || "nenhuma"}.`,
    `Não come: ${perfil.alimentacao.rejeitados.map((id) => FOOD_MAP[id]?.nome ?? id).join(", ") || "—"}. Favoritos: ${perfil.alimentacao.preferidos.map((id) => FOOD_MAP[id]?.nome ?? id).join(", ") || "—"}.`,
    `Rotina: tempo para cozinhar ${perfil.rotina.tempoCozinhar ?? "?"} min/dia; refeições fora: ${perfil.rotina.refeicoesFora ?? "?"}; sono ${perfil.rotina.horasSono ?? "?"} h.`,
    `Orçamento: ${perfil.orcamento.diario ? `R$ ${perfil.orcamento.diario}/dia` : perfil.orcamento.semanal ? `R$ ${perfil.orcamento.semanal}/semana` : perfil.orcamento.mensal ? `R$ ${perfil.orcamento.mensal}/mês` : "não definido"}.`,
    `Condições de saúde (contexto de segurança): ${perfil.saude.condicoes.join(", ") || "nenhuma"}. Usa medicamentos: ${perfil.medicamentos.length ? "sim" : "não"}.`,
    `Ocultar calorias: ${c.esconderCalorias ? "sim" : "não"}.`,
    `Agora: ${hojeSP()} ${agoraHHMM()} (horário de Brasília).`,
    `Refeições de hoje:\n${c.hoje.map((r) => `- [${r.id}] ${resumoRefeicao(r, c.esconderCalorias)}`).join("\n") || "- nenhuma"}`,
  ].join("\n");

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historico.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: `<perfil_e_plano>\n${contexto}\n</perfil_e_plano>\n\n${msg}` },
  ];

  const executar = (nome: string, input: Record<string, unknown>): string => {
    const todas = [...c.hoje, ...c.amanha];
    const achar = (id: unknown) => todas.find((r) => r.id === id);
    switch (nome) {
      case "ver_refeicoes":
        return [...c.hoje.map((r) => `HOJE [${r.id}] ${resumoRefeicao(r, c.esconderCalorias)}`), ...c.amanha.map((r) => `AMANHÃ [${r.id}] ${resumoRefeicao(r, c.esconderCalorias)}`)].join("\n") || "Sem refeições planejadas.";
      case "opcoes_troca_refeicao": {
        const r = achar(input.meal_id);
        if (!r) return "Refeição não encontrada.";
        const ops = opcoesTrocaRefeicao(r, c.ctx, (input.criterio as CriterioRefeicao) ?? "qualquer", receitaInfo, 3);
        for (const o of ops) acoes.push({ tipo: "troca_refeicao", rotulo: `${o.nomeReceita} (${o.tempo} min)`, mealId: r.id, refeicao: o.refeicao });
        return ops.length ? ops.map((o) => `${o.nomeReceita} — ${o.tempo} min — ${o.diferencas.join(", ")}`).join("\n") : "Nenhuma opção compatível.";
      }
      case "opcoes_troca_alimento": {
        const r = achar(input.meal_id);
        const idx = Number(input.indice);
        if (!r || !r.itens[idx]) return "Item não encontrado.";
        const ops = opcoesTrocaAlimento(r.itens[idx], c.ctx, 4);
        for (const o of ops) acoes.push({ tipo: "troca_alimento", rotulo: `${o.nome} (${o.item.medida})`, mealId: r.id, indice: idx, item: o.item });
        return ops.map((o) => `${o.nome}: ${o.item.medida} (${o.item.g} g) — ${o.diferencas.join(", ")}`).join("\n") || "Nenhum substituto compatível.";
      }
      case "opcoes_por_orcamento": {
        const tipo = String(input.tipo_refeicao);
        const ref = c.hoje.find((r) => r.tipo === tipo) ?? c.amanha.find((r) => r.tipo === tipo);
        const alvo = ref ? { kcal: macrosItens(ref.itens).kcal, p: macrosItens(ref.itens).p } : { kcal: 600, p: 35 };
        const ops = opcoesOrcamento(c, Number(input.valor), Number(input.pessoas) || 1, tipo, alvo);
        if (ref) for (const o of ops) acoes.push({ tipo: "troca_refeicao", rotulo: `Usar “${o.nome}” (${brl(o.custo)})`, mealId: ref.id, refeicao: o.r });
        return ops.map((o) => `${o.nome} — total ~${brl(o.custo)} para ${input.pessoas} pessoa(s), ${o.tempo} min`).join("\n") || "Nenhuma opção dentro do valor.";
      }
      case "orientacao_comer_fora": {
        const r = achar(input.meal_id);
        const m = r ? macrosItens(r.itens) : { kcal: 600, p: 35 };
        if (r) acoes.push({ tipo: "comer_fora", rotulo: `Marcar ${r.nome.toLowerCase()} como fora de casa`, mealId: r.id, local: String(input.local) });
        return orientacaoComerFora(String(input.local), m.kcal, m.p, r?.tipo ?? "jantar").join("\n");
      }
    }
    return "Ferramenta desconhecida.";
  };

  for (let passo = 0; passo < 5; passo++) {
    const resp = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
      max_tokens: 16000,
      system: SISTEMA,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      tools: TOOLS,
      messages,
    });
    if (resp.stop_reason === "refusal") return { fonte: "claude", acoes: [], texto: "Não consigo ajudar com isso por aqui. Se for uma questão de saúde, procure um profissional." };
    messages.push({ role: "assistant", content: resp.content });
    if (resp.stop_reason !== "tool_use") {
      const texto = resp.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
      return { fonte: "claude", acoes: dedup(acoes), texto: texto || "Pode me contar um pouco mais?" };
    }
    const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = resp.content
      .filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use")
      .map((b) => {
        try {
          return { type: "tool_result", tool_use_id: b.id, content: executar(b.name, (b.input ?? {}) as Record<string, unknown>) };
        } catch (e) {
          return { type: "tool_result", tool_use_id: b.id, content: `Erro: ${(e as Error).message}`, is_error: true };
        }
      });
    messages.push({ role: "user", content: resultados });
  }
  return { fonte: "claude", acoes: dedup(acoes), texto: "Separei algumas opções abaixo." };
}

function dedup(a: AcaoSugerida[]) {
  const vistos = new Set<string>();
  return a.filter((x) => (vistos.has(x.rotulo) ? false : (vistos.add(x.rotulo), true))).slice(0, 6);
}

// ---------------------------------------------------------------------------

export async function contextoAssistente(supabase: SupabaseClient, userId: string): Promise<Ctx> {
  const perfil = await carregarPerfil(supabase, userId);
  const { ctx, seguranca } = contextoCompleto(perfil);
  const plano = await planoAtivo(supabase, userId);
  const hoje = hojeSP();
  const refs = plano ? await refeicoesDoPlano(supabase, plano.id, hoje, addDias(hoje, 1)) : [];
  return {
    supabase,
    userId,
    perfil,
    ctx,
    hoje: refs.filter((r) => r.dia === hoje),
    amanha: refs.filter((r) => r.dia !== hoje),
    esconderCalorias: seguranca.esconderCalorias || perfil.prefs.mostrarMacros === false,
  };
}

export async function aplicarAcao(supabase: SupabaseClient, userId: string, a: AcaoSugerida) {
  const { data: m } = await supabase.from("meals").select("id").eq("id", "mealId" in a ? a.mealId : "").eq("user_id", userId).maybeSingle();
  if (a.tipo === "troca_refeicao" && m) {
    if (a.refeicao.receitaId && !RECIPE_MAP[a.refeicao.receitaId]) throw new Error("receita inválida");
    await substituirItensRefeicao(supabase, userId, a.mealId, { ...a.refeicao, foraDeCasa: false });
  }
  if (a.tipo === "troca_alimento" && m) {
    const { data: itens } = await supabase.from("meal_items").select("id,ordem,observacoes").eq("meal_id", a.mealId).order("ordem");
    const alvo = itens?.[a.indice];
    if (alvo && FOOD_MAP[a.item.food] && a.item.g > 0 && a.item.g <= 2000) await supabase.from("meal_items").update({ food_id: a.item.food, quantidade: a.item.g, unidade: a.item.medida }).eq("id", alvo.id).eq("user_id", userId);
  }
  if (a.tipo === "comer_fora" && m) {
    await supabase.from("meals").update({ fora_de_casa: true, nota: `Fora de casa: ${LOCAIS_FORA.find((l) => l.id === a.local)?.nome ?? a.local}` }).eq("id", a.mealId);
  }
  if (a.tipo === "fome") {
    const plano = await planoAtivo(supabase, userId);
    if (plano) for (const r of await refeicoesDoPlano(supabase, plano.id, a.data, a.data)) if (!r.foraDeCasa) await substituirItensRefeicao(supabase, userId, r.id, ajustarFomeRefeicao(r, a.direcao));
  }
  await supabase.from("audit_log").insert({ user_id: userId, acao: "assistente_acao", detalhes: { tipo: a.tipo, rotulo: a.rotulo } });
}

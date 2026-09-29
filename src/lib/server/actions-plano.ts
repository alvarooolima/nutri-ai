"use server";

import { revalidatePath } from "next/cache";
import { RECIPE_MAP } from "@/data/recipes";
import { macrosItens } from "@/lib/nutrition/foodmath";
import { montarLista, adicionarItens, totalLista, type ItemCompra } from "@/lib/nutrition/shopping";
import { ajustarFomeRefeicao, opcoesTrocaAlimento, opcoesTrocaRefeicao, orientacaoComerFora, type CriterioRefeicao, LOCAIS_FORA } from "@/lib/nutrition/swaps";
import type { ItemPlanejado, Modo, RefeicaoPlanejada } from "@/lib/types";
import { requireUser } from "@/lib/supabase/server";
import { carregarPerfil, contextoCompleto } from "./perfil";
import { criarPlano, fmtData, hojeSP, planoAtivo, refeicoesDoPlano, substituirItensRefeicao, type TipoPlano } from "./planos";

async function ctxUsuario() {
  const { supabase, user } = await requireUser();
  const perfil = await carregarPerfil(supabase, user.id);
  const { ctx } = contextoCompleto(perfil);
  return { supabase, user, ctx, perfil };
}

async function refeicao(mealId: string) {
  const { supabase, user, ctx, perfil } = await ctxUsuario();
  const { data: m } = await supabase.from("meals").select("meal_plan_id").eq("id", mealId).eq("user_id", user.id).single();
  if (!m) throw new Error("Refeição não encontrada");
  const refs = await refeicoesDoPlano(supabase, m.meal_plan_id);
  const r = refs.find((x) => x.id === mealId)!;
  return { supabase, user, ctx, perfil, r };
}

const receitaInfo = (id: string) => ({ nome: RECIPE_MAP[id]?.nome ?? id, tempo: RECIPE_MAP[id]?.tempo ?? 30 });

async function auditar(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, acao: string, detalhes: Record<string, unknown>) {
  await supabase.from("audit_log").insert({ user_id: userId, acao, detalhes });
}

export async function gerarNovoPlano(tipo: TipoPlano, modo?: Modo, dataInicio?: string, desafio?: string | null) {
  const { supabase, user } = await requireUser();
  const r = await criarPlano(supabase, user.id, { tipo, modo, dataInicio, desafio, dias: desafio ? 31 : undefined });
  revalidatePath("/", "layout");
  return r;
}

export async function listarTrocasAlimento(mealId: string, indice: number) {
  const { ctx, r } = await refeicao(mealId);
  const it = r.itens[indice];
  if (!it) return [];
  return opcoesTrocaAlimento(it, ctx);
}

export async function aplicarTrocaAlimento(mealId: string, indice: number, novo: ItemPlanejado) {
  const { supabase, user, r } = await refeicao(mealId);
  const antigo = r.itens[indice];
  const itens = r.itens.map((x, i) => (i === indice ? { ...novo, papel: antigo.papel } : x));
  await substituirItensRefeicao(supabase, user.id, mealId, { ...r, itens });
  await auditar(supabase, user.id, "troca_alimento", { mealId, de: antigo.food, para: novo.food });
  revalidatePath("/plano");
  return { ok: true };
}

export async function listarTrocasRefeicao(mealId: string, criterio: CriterioRefeicao) {
  const { ctx, r } = await refeicao(mealId);
  return opcoesTrocaRefeicao(r, ctx, criterio, receitaInfo);
}

export async function aplicarTrocaRefeicao(mealId: string, nova: RefeicaoPlanejada) {
  const { supabase, user, r } = await refeicao(mealId);
  if (nova.receitaId && !RECIPE_MAP[nova.receitaId]) throw new Error("Receita inválida");
  await substituirItensRefeicao(supabase, user.id, mealId, { ...nova, tipo: r.tipo, foraDeCasa: false });
  await auditar(supabase, user.id, "troca_refeicao", { mealId, de: r.receitaId, para: nova.receitaId });
  revalidatePath("/plano");
  return { ok: true };
}

export async function ajustarFomeDia(data: string, direcao: "mais" | "menos") {
  const { supabase, user } = await requireUser();
  const plano = await planoAtivo(supabase, user.id);
  if (!plano) return { ok: false };
  const refs = await refeicoesDoPlano(supabase, plano.id, data, data);
  const antes = macrosItens(refs.flatMap((r) => r.itens)).kcal;
  for (const r of refs.filter((x) => !x.foraDeCasa)) await substituirItensRefeicao(supabase, user.id, r.id, ajustarFomeRefeicao(r, direcao));
  const depois = macrosItens((await refeicoesDoPlano(supabase, plano.id, data, data)).flatMap((r) => r.itens)).kcal;
  await auditar(supabase, user.id, "ajuste_fome", { data, direcao, antes: Math.round(antes), depois: Math.round(depois) });
  revalidatePath("/plano");
  return {
    ok: true,
    mensagem:
      direcao === "mais"
        ? `Aumentamos as porções de hoje (~${Math.round(depois - antes)} kcal), com mais vegetais e proteína para dar saciedade. Fome varia de um dia para o outro — tudo bem.`
        : `Reduzimos um pouco as porções de hoje (~${Math.round(antes - depois)} kcal), mantendo a proteína. Se a fome voltar, coma — o plano se adapta.`,
  };
}

export async function comerFora(mealId: string, local: string) {
  const { supabase, user, r } = await refeicao(mealId);
  const m = macrosItens(r.itens);
  const nomeLocal = LOCAIS_FORA.find((l) => l.id === local)?.nome ?? "Fora de casa";
  await supabase.from("meals").update({ fora_de_casa: true, nota: `Fora de casa: ${nomeLocal}` }).eq("id", mealId).eq("user_id", user.id);
  await auditar(supabase, user.id, "comer_fora", { mealId, local });
  revalidatePath("/plano");
  return orientacaoComerFora(local, m.kcal, m.p, r.tipo);
}

export async function desfazerComerFora(mealId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("meals").update({ fora_de_casa: false, nota: null }).eq("id", mealId).eq("user_id", user.id);
  revalidatePath("/plano");
}

/** "Reduzir custo": troca refeições futuras por alternativas mais baratas com energia/proteína equivalentes */
export async function reduzirCusto() {
  const { supabase, user, ctx } = await ctxUsuario();
  const plano = await planoAtivo(supabase, user.id);
  if (!plano) return { ok: false, mensagem: "Você ainda não tem um plano ativo." };
  const refs = await refeicoesDoPlano(supabase, plano.id, hojeSP());
  let economia = 0;
  let trocas = 0;
  for (const r of refs) {
    if (r.foraDeCasa) continue;
    const atual = macrosItens(r.itens).custo;
    const [melhor] = opcoesTrocaRefeicao(r, ctx, "barato", receitaInfo, 1);
    if (!melhor) continue;
    const novo = macrosItens(melhor.refeicao.itens).custo;
    if (novo < atual * 0.9) {
      await substituirItensRefeicao(supabase, user.id, r.id, melhor.refeicao);
      economia += atual - novo;
      trocas++;
    }
  }
  await atualizarCustoPlano(plano.id);
  await auditar(supabase, user.id, "reduzir_custo", { trocas, economia: Math.round(economia * 100) / 100 });
  revalidatePath("/", "layout");
  return {
    ok: true,
    mensagem: trocas
      ? `Trocamos ${trocas} refeições por opções equivalentes mais baratas. Economia estimada: ${economia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} no período. Atualize a lista de compras.`
      : "Seu plano já está entre as opções mais econômicas compatíveis com suas preferências.",
  };
}

async function atualizarCustoPlano(planoId: string) {
  const { supabase } = await requireUser();
  const refs = await refeicoesDoPlano(supabase, planoId);
  const m = macrosItens(refs.flatMap((r) => r.itens));
  await supabase.from("meal_plans").update({ custo_estimado: Math.round(m.custo * 100) / 100 }).eq("id", planoId);
}

// ---------------------------------------------------------------- compras

export async function gerarListaCompras(de: string, ate: string) {
  const { supabase, user } = await requireUser();
  const plano = await planoAtivo(supabase, user.id);
  if (!plano) return { ok: false };
  const refs = await refeicoesDoPlano(supabase, plano.id, de, ate);
  const { data: existente } = await supabase.from("shopping_lists").select("id,itens").eq("user_id", user.id).eq("meal_plan_id", plano.id).eq("data_inicio", de).maybeSingle();
  const itens = montarLista(
    refs.filter((r) => !r.foraDeCasa).flatMap((r) => r.itens),
    (existente?.itens as ItemCompra[]) ?? [],
  );
  const row = { user_id: user.id, meal_plan_id: plano.id, periodo: `Semana de ${fmtData(de)} a ${fmtData(ate)}`, data_inicio: de, data_fim: ate, itens, custo_estimado: totalLista(itens) };
  if (existente) await supabase.from("shopping_lists").update(row).eq("id", existente.id);
  else await supabase.from("shopping_lists").insert(row);
  revalidatePath("/compras");
  return { ok: true };
}

export async function marcarItemCompra(listaId: string, foodId: string, comprado: boolean) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("shopping_lists").select("itens").eq("id", listaId).eq("user_id", user.id).single();
  if (!data) return;
  const itens = (data.itens as ItemCompra[]).map((i) => (i.food_id === foodId ? { ...i, comprado } : i));
  await supabase.from("shopping_lists").update({ itens }).eq("id", listaId);
  revalidatePath("/compras");
}

export async function adicionarReceitaNaLista(receitaId: string, porcoes = 1) {
  const { supabase, user } = await requireUser();
  const rec = RECIPE_MAP[receitaId];
  if (!rec) return { ok: false, mensagem: "Receita não encontrada" };
  const { data: lista } = await supabase.from("shopping_lists").select("id,itens").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const novos = rec.itens.map((i) => ({ food: i.food, g: i.g * porcoes }));
  if (lista) {
    const itens = adicionarItens(lista.itens as ItemCompra[], novos);
    await supabase.from("shopping_lists").update({ itens, custo_estimado: totalLista(itens) }).eq("id", lista.id);
  } else {
    const itens = adicionarItens([], novos);
    await supabase.from("shopping_lists").insert({ user_id: user.id, periodo: "Lista avulsa", itens, custo_estimado: totalLista(itens) });
  }
  revalidatePath("/compras");
  return { ok: true, mensagem: `Ingredientes de “${rec.nome}” adicionados à lista de compras.` };
}

export async function limparComprados(listaId: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("shopping_lists").select("itens").eq("id", listaId).eq("user_id", user.id).single();
  if (!data) return;
  const itens = (data.itens as ItemCompra[]).filter((i) => !i.comprado);
  await supabase.from("shopping_lists").update({ itens, custo_estimado: totalLista(itens) }).eq("id", listaId);
  revalidatePath("/compras");
}

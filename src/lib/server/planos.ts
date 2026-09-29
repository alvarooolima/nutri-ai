import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FOOD_MAP } from "@/data/foods";
import { RECIPE_MAP } from "@/data/recipes";
import { gerarRecomendacoes } from "@/lib/nutrition/evidence";
import { addDias, gerarPlano, macrosDia, NOME_REFEICAO } from "@/lib/nutrition/planner";
import type { Alerta } from "@/lib/nutrition/safety";
import { montarLista, totalLista } from "@/lib/nutrition/shopping";
import { tendencia } from "@/lib/nutrition/review";
import type { DiaPlanejado, ItemPlanejado, Modo, RefeicaoPlanejada, TipoRefeicao } from "@/lib/types";
import { camposFaltando, carregarPerfil, contextoCompleto, refeicoesConfig, type PerfilCompleto } from "./perfil";

export type TipoPlano = "diario" | "semanal" | "mensal";

export function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function sincronizarAlertas(supabase: SupabaseClient, userId: string, alertas: Alerta[]) {
  const { data: existentes } = await supabase.from("alerts").select("regra,status").eq("user_id", userId);
  const atuais = new Set(alertas.map((a) => a.regra));
  const ja = new Map((existentes ?? []).map((e) => [e.regra as string, e.status as string]));
  const novos = alertas.filter((a) => !ja.has(a.regra) || ja.get(a.regra) === "resolvido");
  if (novos.length)
    await supabase.from("alerts").upsert(
      novos.map((a) => ({ user_id: userId, ...a, status: "ativo" })),
      { onConflict: "user_id,regra" },
    );
  // atualiza texto dos que continuam valendo
  for (const a of alertas.filter((x) => ja.has(x.regra) && ja.get(x.regra) !== "resolvido"))
    await supabase.from("alerts").update({ mensagem: a.mensagem, acao_recomendada: a.acao_recomendada, gravidade: a.gravidade }).eq("user_id", userId).eq("regra", a.regra);
  const resolver = [...ja.keys()].filter((r) => !atuais.has(r));
  if (resolver.length) await supabase.from("alerts").update({ status: "resolvido" }).eq("user_id", userId).in("regra", resolver);
}

/** Dados do acompanhamento usados pela segurança (perda de peso rápida, sintomas de alarme) */
export async function extrasAcompanhamento(supabase: SupabaseClient, userId: string) {
  const desde = addDias(hojeSP(), -21);
  const [{ data: t }, { data: s }] = await Promise.all([
    supabase.from("tracking").select("data,peso").eq("user_id", userId).gte("data", desde).not("peso", "is", null).order("data"),
    supabase.from("symptoms").select("sintoma").eq("user_id", userId).gte("data", desde),
  ]);
  const pts = (t ?? []).map((x) => ({ data: x.data as string, peso: Number(x.peso) }));
  let pct: number | null = null;
  if (pts.length >= 3) {
    const span = (new Date(pts[pts.length - 1].data).getTime() - new Date(pts[0].data).getTime()) / 864e5;
    const inc = tendencia(pts);
    if (span >= 10 && inc !== undefined) pct = (-inc * 7 * 100) / pts[pts.length - 1].peso;
  }
  return { perdaPesoSemanalPct: pct, sintomasRegistrados: (s ?? []).map((x) => x.sintoma as string) };
}

export type ResultadoCriacao =
  | { ok: true; planoId: string }
  | { ok: false; faltando?: string[]; bloqueios?: string[]; erro?: string };

export async function criarPlano(
  supabase: SupabaseClient,
  userId: string,
  opcoes: { tipo: TipoPlano; dataInicio?: string; modo?: Modo; desafio?: string | null; dias?: number },
): Promise<ResultadoCriacao> {
  const perfil = await carregarPerfil(supabase, userId);
  const faltando = camposFaltando(perfil);
  if (faltando.length) return { ok: false, faltando };
  const extras = await extrasAcompanhamento(supabase, userId);
  const { calc, seguranca, ctx, idade, modo } = contextoCompleto(perfil, { ...extras, modo: opcoes.modo });
  await sincronizarAlertas(supabase, userId, seguranca.alertas);
  if (seguranca.bloqueios.length) return { ok: false, bloqueios: seguranca.bloqueios };

  const ajusteKcal = Number((perfil.prefs as { ajusteKcal?: number }).ajusteKcal ?? 0);
  const kcalAlvo = Math.max(calc.meta.piso, calc.meta.kcal + ajusteKcal);
  const dias = opcoes.dias ?? (opcoes.tipo === "diario" ? 1 : opcoes.tipo === "semanal" ? 7 : 30);
  const dataInicio = opcoes.dataInicio ?? hojeSP();
  const refeicoes = refeicoesConfig(perfil);
  const plano = gerarPlano({ dataInicio, dias, alvo: { kcal: kcalAlvo, p: calc.proteina.g }, refeicoes, ctx, seed: Date.now() % 2147483647 });

  const { data: anteriores } = await supabase.from("meal_plans").select("id,versao").eq("user_id", userId).order("versao", { ascending: false }).limit(1);
  const versao = (anteriores?.[0]?.versao ?? 0) + 1;
  await supabase.from("meal_plans").update({ status: "substituido" }).eq("user_id", userId).eq("status", "ativo");

  const media = plano.media;
  const limitacoes = [
    "Valores de energia e nutrientes são estimativas a partir de equações e tabelas de composição.",
    "O sal e o óleo usados no preparo além do indicado não entram no cálculo.",
    "Custos são aproximados e variam por região, marca e época.",
    ...calc.observacoes,
    ...plano.notas,
  ];
  const { data: mp, error } = await supabase
    .from("meal_plans")
    .insert({
      user_id: userId,
      data_inicio: dataInicio,
      data_fim: addDias(dataInicio, dias - 1),
      tipo: opcoes.tipo,
      modo,
      objetivo: perfil.objetivo.principal,
      calorias_estimadas: Math.round(media.kcal),
      proteina_estimada: Math.round(media.p),
      carboidrato_estimado: Math.round(media.c),
      gordura_estimada: Math.round(media.g),
      fibras_estimadas: Math.round(media.f),
      custo_estimado: Math.round(media.custo * dias * 100) / 100,
      calculo: { ...calc, ajusteRevisoes: ajusteKcal, alvoUsado: { kcal: kcalAlvo, p: calc.proteina.g } },
      consideracoes: {
        consideradas: seguranca.consideradas,
        validar: seguranca.validarComProfissional,
        limitacoes,
        alertas: seguranca.alertas.map((a) => ({ gravidade: a.gravidade, mensagem: a.mensagem })),
        esconderCalorias: seguranca.esconderCalorias,
        sodioMedio: Math.round(media.na),
      },
      desafio: opcoes.desafio ?? null,
      status: "ativo",
      versao,
    })
    .select("id")
    .single();
  if (error || !mp) return { ok: false, erro: error?.message ?? "Falha ao salvar o plano" };

  await persistirDias(supabase, userId, mp.id, plano.dias);

  const calcAplicado = ajusteKcal
    ? {
        ...calc,
        meta: {
          ...calc.meta,
          kcal: kcalAlvo,
          faixa: { min: Math.round((kcalAlvo * 0.95) / 10) * 10, max: Math.round((kcalAlvo * 1.05) / 10) * 10 },
          descricao: `${calc.meta.descricao}; ajuste confirmado nas revisões: ${ajusteKcal > 0 ? "+" : ""}${ajusteKcal} kcal/dia`,
        },
      }
    : calc;
  const recs = gerarRecomendacoes(
    calcAplicado,
    { peso: perfil.peso!, altura: perfil.altura!, idade, sexo: perfil.sexo!, objetivo: perfil.objetivo.principal!, modo, nivelAtividade: perfil.rotina.nivelAtividade!, exercicios: perfil.exercicios.length },
    seguranca,
    media,
  );
  await supabase.from("recommendations").insert(recs.map((r) => ({ ...r, user_id: userId, meal_plan_id: mp.id })));

  // lista de compras da primeira semana
  const semana = plano.dias.slice(0, 7);
  const itens = montarLista(semana.flatMap((d) => d.refeicoes.flatMap((r) => r.itens)));
  await supabase.from("shopping_lists").insert({
    user_id: userId,
    meal_plan_id: mp.id,
    periodo: `Semana de ${fmtData(semana[0].data)} a ${fmtData(semana[semana.length - 1].data)}`,
    data_inicio: semana[0].data,
    data_fim: semana[semana.length - 1].data,
    itens,
    custo_estimado: totalLista(itens),
  });

  await supabase.from("audit_log").insert({ user_id: userId, acao: "plano_criado", detalhes: { planoId: mp.id, tipo: opcoes.tipo, modo, versao, kcalAlvo } });
  return { ok: true, planoId: mp.id };
}

export function fmtData(d: string) {
  const [, m, dd] = d.split("-");
  return `${dd}/${m}`;
}

export async function persistirDias(supabase: SupabaseClient, userId: string, planoId: string, dias: DiaPlanejado[]) {
  const meals: Record<string, unknown>[] = [];
  const items: Record<string, unknown>[] = [];
  for (const d of dias)
    d.refeicoes.forEach((r, ordem) => {
      const id = crypto.randomUUID();
      meals.push({ id, meal_plan_id: planoId, user_id: userId, dia: d.data, ordem, nome: r.nome, horario: r.horario ?? null, tipo: r.tipo, recipe_id: r.receitaId, fora_de_casa: !!r.foraDeCasa, nota: r.nota ?? null });
      r.itens.forEach((i, k) => items.push({ meal_id: id, user_id: userId, food_id: i.food, quantidade: i.g, unidade: i.medida, preparacao: i.preparo ?? null, ordem: k, observacoes: i.papel ?? null }));
    });
  for (let i = 0; i < meals.length; i += 500) {
    const { error } = await supabase.from("meals").insert(meals.slice(i, i + 500));
    if (error) throw error;
  }
  for (let i = 0; i < items.length; i += 1000) {
    const { error } = await supabase.from("meal_items").insert(items.slice(i, i + 1000));
    if (error) throw error;
  }
}

export interface RefeicaoDB extends RefeicaoPlanejada {
  id: string;
  dia: string;
  ordem: number;
}

interface MealRow {
  id: string;
  dia: string;
  ordem: number;
  nome: string;
  horario: string | null;
  tipo: TipoRefeicao;
  recipe_id: string | null;
  fora_de_casa: boolean;
  nota: string | null;
  meal_items: { id: string; food_id: string; quantidade: number; unidade: string | null; preparacao: string | null; observacoes: string | null; ordem: number }[];
}

export function linhaParaRefeicao(m: MealRow): RefeicaoDB {
  return {
    id: m.id,
    dia: m.dia,
    ordem: m.ordem,
    tipo: m.tipo,
    nome: m.nome ?? NOME_REFEICAO[m.tipo],
    horario: m.horario?.slice(0, 5),
    receitaId: m.recipe_id,
    foraDeCasa: m.fora_de_casa,
    nota: m.nota ?? undefined,
    itens: [...m.meal_items]
      .sort((a, b) => a.ordem - b.ordem)
      .map((i): ItemPlanejado => ({ food: i.food_id, g: Number(i.quantidade), medida: i.unidade ?? "", preparo: i.preparacao ?? undefined, papel: (i.observacoes as ItemPlanejado["papel"]) ?? undefined })),
  };
}

export async function planoAtivo(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("meal_plans").select("*").eq("user_id", userId).eq("status", "ativo").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function refeicoesDoPlano(supabase: SupabaseClient, planoId: string, de?: string, ate?: string): Promise<RefeicaoDB[]> {
  let q = supabase.from("meals").select("id,dia,ordem,nome,horario,tipo,recipe_id,fora_de_casa,nota,meal_items(id,food_id,quantidade,unidade,preparacao,observacoes,ordem)").eq("meal_plan_id", planoId);
  if (de) q = q.gte("dia", de);
  if (ate) q = q.lte("dia", ate);
  const { data, error } = await q.order("dia").order("ordem");
  if (error) throw error;
  return (data as unknown as MealRow[]).map(linhaParaRefeicao);
}

export function agruparPorDia(refs: RefeicaoDB[]): { data: string; refeicoes: RefeicaoDB[] }[] {
  const m = new Map<string, RefeicaoDB[]>();
  for (const r of refs) m.set(r.dia, [...(m.get(r.dia) ?? []), r]);
  return [...m.entries()].map(([data, refeicoes]) => ({ data, refeicoes }));
}

export async function substituirItensRefeicao(supabase: SupabaseClient, userId: string, mealId: string, r: RefeicaoPlanejada) {
  if (r.receitaId && !RECIPE_MAP[r.receitaId]) throw new Error("Receita desconhecida");
  if (!r.itens.length || r.itens.some((i) => !FOOD_MAP[i.food] || !(i.g > 0 && i.g <= 2000))) throw new Error("Itens inválidos");
  await supabase.from("meal_items").delete().eq("meal_id", mealId).eq("user_id", userId);
  await supabase.from("meal_items").insert(
    r.itens.map((i, k) => ({ meal_id: mealId, user_id: userId, food_id: i.food, quantidade: i.g, unidade: i.medida, preparacao: i.preparo ?? null, ordem: k, observacoes: i.papel ?? null })),
  );
  await supabase.from("meals").update({ recipe_id: r.receitaId, nota: r.nota ?? null, fora_de_casa: !!r.foraDeCasa }).eq("id", mealId).eq("user_id", userId);
}

export { macrosDia, RECIPE_MAP };
export type { PerfilCompleto };

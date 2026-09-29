"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revisar } from "@/lib/nutrition/review";
import { requireUser } from "@/lib/supabase/server";
import { cifrar } from "./crypto";
import { addDias } from "@/lib/nutrition/planner";
import { carregarPerfil, contextoCompleto } from "./perfil";
import { criarPlano, extrasAcompanhamento, hojeSP, planoAtivo, sincronizarAlertas } from "./planos";

const escala = z.coerce.number().int().min(1).max(5).nullable().optional();

export async function registrarRefeicao(input: {
  data?: string;
  hora?: string;
  refeicao?: string;
  mealId?: string | null;
  descricao?: string;
  seguiu_plano?: "sim" | "parcial" | "nao";
  fome_antes?: number | null;
  saciedade_depois?: number | null;
}) {
  const v = z
    .object({
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      refeicao: z.string().max(40).optional(),
      mealId: z.string().uuid().nullable().optional(),
      descricao: z.string().max(1000).optional(),
      seguiu_plano: z.enum(["sim", "parcial", "nao"]).optional(),
      fome_antes: escala,
      saciedade_depois: escala,
    })
    .parse(input);
  const { supabase, user } = await requireUser();
  let descricao = v.descricao;
  if (v.mealId && !descricao) {
    const { data: m } = await supabase.from("meals").select("nome,recipe_id,meal_items(food_id)").eq("id", v.mealId).eq("user_id", user.id).single();
    if (m) {
      const { FOOD_MAP } = await import("@/data/foods");
      descricao = `${m.nome}: ${(m.meal_items as { food_id: string }[]).map((i) => FOOD_MAP[i.food_id]?.nome ?? i.food_id).join(", ")}`;
    }
  }
  const agora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date());
  // uma refeição do plano tem no máximo um registro: responder de novo substitui a resposta anterior
  if (v.mealId) await supabase.from("food_logs").delete().eq("user_id", user.id).eq("meal_id", v.mealId);
  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    data: v.data ?? hojeSP(),
    hora: v.hora ?? agora,
    refeicao: v.refeicao ?? null,
    meal_id: v.mealId ?? null,
    descricao: descricao ?? null,
    seguiu_plano: v.seguiu_plano ?? null,
    fome_antes: v.fome_antes ?? null,
    saciedade_depois: v.saciedade_depois ?? null,
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/", "layout");
  return { ok: true, hora: v.hora ?? agora };
}

/** Desfaz o registro de uma refeição do plano */
export async function desfazerRegistroRefeicao(mealId: string) {
  z.string().uuid().parse(mealId);
  const { supabase, user } = await requireUser();
  await supabase.from("food_logs").delete().eq("user_id", user.id).eq("meal_id", mealId);
  revalidatePath("/", "layout");
  return { ok: true };
}

const trackingSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  peso: z.coerce.number().min(20).max(400).nullable().optional(),
  cintura: z.coerce.number().min(30).max(300).nullable().optional(),
  quadril: z.coerce.number().min(30).max(300).nullable().optional(),
  fome: escala,
  saciedade: escala,
  energia: escala,
  sono: escala,
  horas_sono: z.coerce.number().min(0).max(24).nullable().optional(),
  digestao: escala,
  adesao: z.coerce.number().int().min(0).max(100).nullable().optional(),
  exercicio_min: z.coerce.number().int().min(0).max(1440).nullable().optional(),
});

/** Registra/atualiza dados do dia (apenas os campos enviados) */
export async function registrarDia(input: z.input<typeof trackingSchema>) {
  const v = trackingSchema.parse(input);
  const { supabase, user } = await requireUser();
  const data = v.data ?? hojeSP();
  const campos = Object.fromEntries(Object.entries(v).filter(([k, x]) => k !== "data" && x !== undefined && x !== null));
  const { error } = await supabase.from("tracking").upsert({ user_id: user.id, data, ...campos }, { onConflict: "user_id,data" });
  if (error) return { ok: false, erro: error.message };
  if (v.peso && data === hojeSP()) {
    await supabase.from("users").update({ peso_atual: v.peso }).eq("id", user.id);
    // reavalia segurança (ex.: perda de peso rápida)
    const perfil = await carregarPerfil(supabase, user.id);
    const { seguranca } = contextoCompleto(perfil, await extrasAcompanhamento(supabase, user.id));
    await sincronizarAlertas(supabase, user.id, seguranca.alertas);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adicionarAgua(ml: number) {
  const { supabase, user } = await requireUser();
  const data = hojeSP();
  const { data: t } = await supabase.from("tracking").select("agua_ml").eq("user_id", user.id).eq("data", data).maybeSingle();
  const total = Math.max(0, (t?.agua_ml ?? 0) + Math.round(ml));
  await supabase.from("tracking").upsert({ user_id: user.id, data, agua_ml: total }, { onConflict: "user_id,data" });
  revalidatePath("/", "layout");
  return total;
}

export async function registrarSintoma(input: { sintoma: string; intensidade: number; duracao?: string; relacao_com_alimento?: string; observacoes?: string; data?: string; hora?: string }) {
  const v = z
    .object({
      sintoma: z.string().trim().min(1).max(60),
      intensidade: z.coerce.number().int().min(0).max(10),
      duracao: z.string().max(60).optional(),
      relacao_com_alimento: z.string().max(200).optional(),
      observacoes: z.string().max(1000).optional(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    })
    .parse(input);
  const { supabase, user } = await requireUser();
  const agora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const { error } = await supabase.from("symptoms").insert({
    user_id: user.id,
    data: v.data ?? hojeSP(),
    hora: v.hora ?? agora,
    sintoma: v.sintoma,
    intensidade: v.intensidade,
    duracao: v.duracao || null,
    relacao_com_alimento: v.relacao_com_alimento || null,
    observacoes: cifrar(v.observacoes),
  });
  if (error) return { ok: false, erro: error.message };
  // sintomas de alerta disparam avaliação de segurança
  const perfil = await carregarPerfil(supabase, user.id);
  const { seguranca } = contextoCompleto(perfil, await extrasAcompanhamento(supabase, user.id));
  await sincronizarAlertas(supabase, user.id, seguranca.alertas);
  revalidatePath("/", "layout");
  const alerta = seguranca.alertas.find((a) => a.regra === "sintomas_alerta");
  return { ok: true, alerta: alerta ? `${alerta.mensagem} ${alerta.acao_recomendada}` : null };
}

export async function excluirRegistro(tabela: "food_logs" | "symptoms" | "tracking", id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from(tabela).delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

export async function atualizarAlerta(id: string, status: "lido" | "ativo") {
  const { supabase, user } = await requireUser();
  await supabase.from("alerts").update({ status }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- revisão

export async function gerarRevisao() {
  const { supabase, user } = await requireUser();
  const plano = await planoAtivo(supabase, user.id);
  const fim = hojeSP();
  const inicio = addDias(fim, -14);
  const [{ data: t }, { data: s }, { data: f }, perfil] = await Promise.all([
    supabase.from("tracking").select("*").eq("user_id", user.id).gte("data", inicio).order("data"),
    supabase.from("symptoms").select("data,hora,sintoma,intensidade").eq("user_id", user.id).gte("data", inicio),
    supabase.from("food_logs").select("data,hora,descricao,seguiu_plano").eq("user_id", user.id).gte("data", inicio),
    carregarPerfil(supabase, user.id),
  ]);
  const r = revisar(perfil.objetivo.principal ?? "saude_geral", t ?? [], s ?? [], f ?? []);
  const { data } = await supabase
    .from("plan_reviews")
    .insert({ user_id: user.id, meal_plan_id: plano?.id ?? null, periodo_inicio: inicio, periodo_fim: fim, resumo: r, ajustes_propostos: r.ajustes })
    .select("id")
    .single();
  revalidatePath("/revisao");
  return data?.id;
}

export async function responderRevisao(id: string, aceitar: boolean) {
  const { supabase, user } = await requireUser();
  const { data: rev } = await supabase.from("plan_reviews").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!rev || rev.status !== "pendente") return { ok: false, mensagem: "Revisão não encontrada." };
  await supabase.from("plan_reviews").update({ status: aceitar ? "aceita" : "recusada" }).eq("id", id);
  if (!aceitar) {
    revalidatePath("/revisao");
    return { ok: true, mensagem: "Tudo bem — mantivemos o plano atual." };
  }
  const ajustes = rev.ajustes_propostos as { id: string; tipo: string; deltaKcal?: number }[];
  const delta = ajustes.reduce((a, x) => a + (x.deltaKcal ?? 0), 0);
  if (!delta && !ajustes.some((a) => a.id === "simplificar")) {
    await supabase.from("audit_log").insert({ user_id: user.id, acao: "revisao_aceita", detalhes: { revisao: id, deltaKcal: 0, ajustes: ajustes.map((a) => a.id) } });
    revalidatePath("/revisao");
    return { ok: true, mensagem: "Combinado — seguimos com o plano atual." };
  }
  const { data: u } = await supabase.from("users").select("preferencias_app").eq("id", user.id).single();
  const prefs = { ...(u?.preferencias_app ?? {}) } as Record<string, unknown>;
  if (delta) prefs.ajusteKcal = Math.max(-400, Math.min(400, Number(prefs.ajusteKcal ?? 0) + delta));
  if (ajustes.some((a) => a.id === "simplificar")) {
    prefs.repeticao = "alta";
    prefs.marmitas = true;
  }
  await supabase.from("users").update({ preferencias_app: prefs }).eq("id", user.id);
  const plano = await planoAtivo(supabase, user.id);
  const r = await criarPlano(supabase, user.id, { tipo: (plano?.tipo as "diario" | "semanal" | "mensal") ?? "semanal" });
  await supabase.from("audit_log").insert({ user_id: user.id, acao: "revisao_aceita", detalhes: { revisao: id, deltaKcal: delta, ajustes: ajustes.map((a) => a.id) } });
  revalidatePath("/", "layout");
  return { ok: r.ok, mensagem: r.ok ? "Ajustes aplicados. Geramos uma nova versão do seu plano." : "Não foi possível gerar o novo plano." };
}

// ---------------------------------------------------------------- desafio

export async function marcarDiaDesafio(dia: number, concluido: boolean) {
  const { supabase, user } = await requireUser();
  await supabase.from("challenge_progress").upsert({ user_id: user.id, desafio: "japones-31", dia, concluido }, { onConflict: "user_id,desafio,dia" });
  revalidatePath("/desafio");
}

// ---------------------------------------------------------------- LGPD

export async function excluirConta(confirmacao: string) {
  if (confirmacao.trim().toUpperCase() !== "EXCLUIR") return { ok: false, erro: "Digite EXCLUIR para confirmar." };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, erro: error.message };
  await supabase.auth.signOut();
  redirect("/?conta=excluida");
}

export async function revogarConsentimentoSaude() {
  const { supabase, user } = await requireUser();
  await supabase.from("consents").update({ revogado_em: new Date().toISOString() }).eq("user_id", user.id).eq("tipo", "dados_saude").is("revogado_em", null);
  await Promise.all([
    supabase.from("health_profile").delete().eq("user_id", user.id),
    supabase.from("medications").delete().eq("user_id", user.id),
    supabase.from("supplements").delete().eq("user_id", user.id),
    supabase.from("symptoms").delete().eq("user_id", user.id),
  ]);
  await supabase.from("audit_log").insert({ user_id: user.id, acao: "consentimento_saude_revogado", detalhes: {} });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function concederConsentimentoSaude() {
  const { supabase, user } = await requireUser();
  await supabase.from("consents").insert({ user_id: user.id, tipo: "dados_saude", versao: "v1-2026-09" });
  revalidatePath("/", "layout");
}

export async function alterarSenha(senha: string) {
  if (senha.length < 8) return { ok: false, erro: "A senha precisa ter ao menos 8 caracteres." };
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password: senha });
  return error ? { ok: false, erro: error.message } : { ok: true };
}

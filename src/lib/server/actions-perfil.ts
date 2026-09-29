"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { schemas } from "./schemas";
import { requireUser } from "@/lib/supabase/server";
import { cifrar, cifrarJson } from "./crypto";
import { camposFaltando, carregarPerfil, contextoCompleto } from "./perfil";
import { criarPlano, extrasAcompanhamento, hojeSP, sincronizarAlertas, type TipoPlano } from "./planos";

export type Etapa = keyof typeof schemas;
export type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarEtapa(etapa: number, dados: unknown): Promise<Resultado> {
  const { supabase, user } = await requireUser();
  const schema = schemas[etapa as Etapa];
  if (!schema) return { ok: false, erro: "Etapa inválida" };
  const parsed = schema.safeParse(dados);
  if (!parsed.success) return { ok: false, erro: "Confira os campos: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const d = parsed.data as Record<string, unknown>;
  const uid = user.id;
  const up = <T extends object>(tabela: string, v: T) => supabase.from(tabela).upsert({ user_id: uid, ...v }, { onConflict: "user_id" });

  let err: { message: string } | null = null;
  const { data: atual } = await supabase.from("users").select("onboarding_etapa,habitos,preferencias_app,peso_inicial").eq("id", uid).single();
  const proxima = Math.max(atual?.onboarding_etapa ?? 0, etapa + 1);

  switch (etapa) {
    case 0: {
      const v = parsed.data as z.infer<(typeof schemas)[0]>;
      const r = await supabase
        .from("users")
        .update({
          nome: v.nome,
          data_nascimento: v.data_nascimento,
          sexo: v.sexo,
          altura: v.altura,
          peso_atual: v.peso,
          peso_inicial: atual?.peso_inicial ?? v.peso,
          habitos: { ...(atual?.habitos ?? {}), cintura: v.cintura, quadril: v.quadril },
          onboarding_etapa: proxima,
        })
        .eq("id", uid);
      err = r.error;
      await supabase.from("tracking").upsert({ user_id: uid, data: hojeSP(), peso: v.peso, cintura: v.cintura, quadril: v.quadril }, { onConflict: "user_id,data" });
      break;
    }
    case 1: {
      const v = parsed.data as z.infer<(typeof schemas)[1]>;
      const { data: g } = await supabase.from("goals").select("id").eq("user_id", uid).eq("status", "ativo").limit(1).maybeSingle();
      const row = { objetivo_principal: v.objetivo_principal, objetivos_secundarios: v.objetivos_secundarios, meta_peso: v.meta_peso, prazo: v.prazo, motivacao: v.motivacao };
      err = (g ? await supabase.from("goals").update(row).eq("id", g.id) : await supabase.from("goals").insert({ user_id: uid, ...row })).error;
      break;
    }
    case 2: {
      err = (await up("lifestyle", d)).error;
      break;
    }
    case 3: {
      const v = parsed.data as z.infer<(typeof schemas)[3]>;
      const { refeicoes_preferidas, ...hab } = v;
      err = (await up("food_preferences", { refeicoes_preferidas, numero_de_refeicoes: refeicoes_preferidas.length })).error;
      if (!err) err = (await supabase.from("users").update({ habitos: { ...(atual?.habitos ?? {}), ...hab } }).eq("id", uid)).error;
      break;
    }
    case 4: {
      const v = parsed.data as z.infer<(typeof schemas)[4]>;
      const { data: cons } = await supabase.from("consents").select("id").eq("user_id", uid).eq("tipo", "dados_saude").is("revogado_em", null).limit(1);
      if (!cons?.length) return { ok: false, erro: "Para registrar dados de saúde é preciso consentimento. Ative-o em Configurações." };
      const { data: hp } = await supabase.from("health_profile").select("restricoes").eq("user_id", uid).maybeSingle();
      const { decifrarJson } = await import("./crypto");
      const restrAtual = decifrarJson<{ lista: string[] }>(hp?.restricoes, { lista: [] });
      err = (
        await up("health_profile", {
          condicoes_de_saude: cifrarJson(v.condicoes),
          observacoes: cifrar(v.condicoesTexto),
          sintomas: cifrarJson(v.sintomas),
          cirurgias: cifrar(v.cirurgias),
          internacoes: cifrar(v.internacoes),
          exames_relevantes: cifrar(v.exames),
          orientacoes_profissionais: cifrar(v.orientacoes),
          alergias: cifrarJson(v.alergias),
          intolerancias: cifrarJson(v.intolerancias),
          restricoes: cifrarJson({ lista: restrAtual.lista, anafilaxia: v.anafilaxia, alergiasTexto: v.alergiasTexto }),
        })
      ).error;
      if (!err) {
        await supabase.from("medications").delete().eq("user_id", uid);
        if (v.medicamentos.length)
          err = (await supabase.from("medications").insert(v.medicamentos.map((m) => ({ user_id: uid, nome: cifrar(m.nome), dose_informada: cifrar(m.dose), frequencia: m.frequencia || null, horario: m.horario || null })))).error;
        await supabase.from("supplements").delete().eq("user_id", uid);
        if (!err && v.suplementos.length)
          err = (await supabase.from("supplements").insert(v.suplementos.map((m) => ({ user_id: uid, nome: cifrar(m.nome), dose: cifrar(m.dose), frequencia: m.frequencia || null })))).error;
      }
      await supabase.from("audit_log").insert({ user_id: uid, acao: "perfil_saude_atualizado", detalhes: { condicoes: v.condicoes.length, medicamentos: v.medicamentos.length } });
      break;
    }
    case 5: {
      const v = parsed.data as z.infer<(typeof schemas)[5]>;
      await supabase.from("exercises").delete().eq("user_id", uid);
      if (v.exercicios.length) err = (await supabase.from("exercises").insert(v.exercicios.map((e) => ({ user_id: uid, ...e })))).error;
      break;
    }
    case 6: {
      const v = parsed.data as z.infer<(typeof schemas)[6]>;
      err = (
        await up("food_preferences", {
          alimentos_preferidos: v.alimentos_preferidos,
          alimentos_rejeitados: v.alimentos_rejeitados,
          alimentos_evitar: v.alimentos_evitar,
          culinarias_preferidas: v.culinarias_preferidas,
          modo_alimentar: v.modo_alimentar,
        })
      ).error;
      if (!err)
        err = (
          await supabase
            .from("users")
            .update({ preferencias_app: { ...(atual?.preferencias_app ?? {}), cardapio: v.cardapio, repeticao: v.repeticao, marmitas: v.marmitas, receitas: v.receitas, unidades: v.unidades, mostrarMacros: v.mostrarMacros } })
            .eq("id", uid)
        ).error;
      if (!err) {
        // restrições ficam no Perfil Saúde (cifrado), preservando os demais campos
        const { data: hp } = await supabase.from("health_profile").select("restricoes").eq("user_id", uid).maybeSingle();
        const { decifrarJson } = await import("./crypto");
        const r = decifrarJson<Record<string, unknown>>(hp?.restricoes, {});
        err = (await up("health_profile", { restricoes: cifrarJson({ ...r, lista: v.restricoes }) })).error;
      }
      break;
    }
    case 7: {
      const v = parsed.data as z.infer<(typeof schemas)[7]>;
      err = (
        await up("budget", {
          orcamento_diario: v.periodo === "diario" ? v.valor : null,
          orcamento_semanal: v.periodo === "semanal" ? v.valor : null,
          orcamento_mensal: v.periodo === "mensal" ? v.valor : null,
          locais_de_compra: v.locais_de_compra,
          observacoes: v.observacoes,
        })
      ).error;
      break;
    }
  }
  if (err) return { ok: false, erro: "Não foi possível salvar. " + err.message };
  if (etapa !== 0) await supabase.from("users").update({ onboarding_etapa: proxima }).eq("id", uid);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resumoPerfil() {
  const { supabase, user } = await requireUser();
  const perfil = await carregarPerfil(supabase, user.id);
  const faltando = camposFaltando(perfil);
  if (faltando.length) return { perfil, faltando, calc: null, seguranca: null };
  const extras = await extrasAcompanhamento(supabase, user.id);
  const { calc, seguranca, idade, imc } = contextoCompleto(perfil, extras);
  await sincronizarAlertas(supabase, user.id, seguranca.alertas);
  return { perfil, faltando, calc, seguranca, idade, imc };
}

export async function confirmarPerfilEGerar(tipo: TipoPlano) {
  const { supabase, user } = await requireUser();
  await supabase.from("users").update({ perfil_confirmado: true, onboarding_completo: true, onboarding_etapa: 8 }).eq("id", user.id);
  await supabase.from("audit_log").insert({ user_id: user.id, acao: "perfil_confirmado", detalhes: {} });
  const r = await criarPlano(supabase, user.id, { tipo });
  revalidatePath("/", "layout");
  return r;
}

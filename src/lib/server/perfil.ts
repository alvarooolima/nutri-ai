import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FOODS } from "@/data/foods";
import { calcular, idadeDe, imcDe, type ExercicioInput, type PerfilCalculo } from "@/lib/nutrition/calc";
import type { ContextoPlano, RefeicaoConfig } from "@/lib/nutrition/planner";
import { alergenosExcluidos, avaliarSeguranca, gruposMedicamento, type Medicamento, type PerfilSaude } from "@/lib/nutrition/safety";
import type { Modo, NivelAtividade, Objetivo, Sexo, TipoRefeicao } from "@/lib/types";
import { decifrar, decifrarJson } from "./crypto";

export interface PreferenciasApp {
  cardapio?: "fechado" | "flexivel";
  repeticao?: "baixa" | "media" | "alta";
  marmitas?: boolean;
  receitas?: boolean;
  unidades?: "gramas" | "caseiras" | "ambos";
  mostrarMacros?: boolean;
}

export interface Habitos {
  fome?: number;
  fomeHorario?: string;
  doces?: string;
  bebidas?: string;
  cafe?: number;
  alcoolDoses?: number;
  ultraprocessados?: string;
  agua?: string;
  diaAlimentar?: string;
  cintura?: number;
  quadril?: number;
}

export interface PerfilCompleto {
  id: string;
  nome: string;
  email: string;
  dataNascimento: string | null;
  sexo: Sexo | null;
  altura: number | null;
  peso: number | null;
  pesoInicial: number | null;
  onboardingEtapa: number;
  onboardingCompleto: boolean;
  perfilConfirmado: boolean;
  prefs: PreferenciasApp;
  habitos: Habitos;
  objetivo: { id?: string; principal: Objetivo | null; secundarios: string[]; metaPeso: number | null; prazo: string | null; motivacao: string | null };
  saude: PerfilSaude;
  medicamentos: (Medicamento & { id: string; frequencia?: string | null; horario?: string | null; observacoes?: string | null })[];
  suplementos: (Medicamento & { id: string; frequencia?: string | null; observacoes?: string | null })[];
  rotina: {
    acordar: string | null;
    dormir: string | null;
    trabalho: string | null;
    deslocamento: string | null;
    horasSono: number | null;
    nivelAtividade: NivelAtividade | null;
    passos: number | null;
    horarios: string[];
    tempoCozinhar: number | null;
    refeicoesFora: string | null;
  };
  exercicios: (ExercicioInput & { id: string; horario?: string | null; objetivo?: string | null })[];
  alimentacao: {
    preferidos: string[];
    rejeitados: string[];
    evitar: string[];
    culinarias: string[];
    refeicoes: TipoRefeicao[];
    numeroRefeicoes: number | null;
    modo: Modo;
  };
  orcamento: { diario: number | null; semanal: number | null; mensal: number | null; locais: string[]; observacoes: string | null };
}

export async function carregarPerfil(supabase: SupabaseClient, userId: string): Promise<PerfilCompleto> {
  const [u, g, h, meds, sups, l, ex, fp, b] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).single(),
    supabase.from("goals").select("*").eq("user_id", userId).eq("status", "ativo").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("health_profile").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("medications").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("supplements").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("lifestyle").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("exercises").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("food_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("budget").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (u.error) throw u.error;
  const user = u.data;
  const hp = h.data;
  // restrições são guardadas junto com a marcação de alergia grave e observações de alergia
  const restr = decifrarJson<{ lista: PerfilSaude["restricoes"]; anafilaxia?: boolean; alergiasTexto?: string }>(hp?.restricoes, { lista: [] });
  return {
    id: userId,
    nome: user.nome ?? "",
    email: user.email ?? "",
    dataNascimento: user.data_nascimento,
    sexo: user.sexo,
    altura: user.altura !== null ? Number(user.altura) : null,
    peso: user.peso_atual !== null ? Number(user.peso_atual) : null,
    pesoInicial: user.peso_inicial !== null ? Number(user.peso_inicial) : null,
    onboardingEtapa: user.onboarding_etapa,
    onboardingCompleto: user.onboarding_completo,
    perfilConfirmado: user.perfil_confirmado,
    prefs: user.preferencias_app ?? {},
    habitos: user.habitos ?? {},
    objetivo: {
      id: g.data?.id,
      principal: g.data?.objetivo_principal ?? null,
      secundarios: g.data?.objetivos_secundarios ?? [],
      metaPeso: g.data?.meta_peso !== null && g.data?.meta_peso !== undefined ? Number(g.data.meta_peso) : null,
      prazo: g.data?.prazo ?? null,
      motivacao: g.data?.motivacao ?? null,
    },
    saude: {
      condicoes: decifrarJson<string[]>(hp?.condicoes_de_saude, []),
      condicoesTexto: decifrar(hp?.observacoes) ?? "",
      cirurgias: decifrar(hp?.cirurgias) ?? "",
      internacoes: decifrar(hp?.internacoes) ?? "",
      sintomas: decifrarJson<string[]>(hp?.sintomas, []),
      alergias: decifrarJson<PerfilSaude["alergias"]>(hp?.alergias, []),
      intolerancias: decifrarJson<PerfilSaude["intolerancias"]>(hp?.intolerancias, []),
      restricoes: restr.lista ?? [],
      anafilaxia: restr.anafilaxia ?? false,
      alergiasTexto: restr.alergiasTexto ?? "",
      exames: decifrar(hp?.exames_relevantes) ?? "",
      orientacoes: decifrar(hp?.orientacoes_profissionais) ?? "",
    },
    medicamentos: (meds.data ?? []).map((m) => ({ id: m.id, nome: decifrar(m.nome) ?? "", dose: decifrar(m.dose_informada) ?? "", frequencia: m.frequencia, horario: m.horario, observacoes: decifrar(m.observacoes) })),
    suplementos: (sups.data ?? []).map((m) => ({ id: m.id, nome: decifrar(m.nome) ?? "", dose: decifrar(m.dose) ?? "", frequencia: m.frequencia, observacoes: decifrar(m.observacoes) })),
    rotina: {
      acordar: l.data?.horario_acordar?.slice(0, 5) ?? null,
      dormir: l.data?.horario_dormir?.slice(0, 5) ?? null,
      trabalho: l.data?.trabalho ?? null,
      deslocamento: l.data?.deslocamento ?? null,
      horasSono: l.data?.horas_de_sono !== null && l.data?.horas_de_sono !== undefined ? Number(l.data.horas_de_sono) : null,
      nivelAtividade: l.data?.nivel_atividade ?? null,
      passos: l.data?.passos_diarios ?? null,
      horarios: l.data?.horarios_disponiveis ?? [],
      tempoCozinhar: l.data?.tempo_cozinhar_min ?? null,
      refeicoesFora: l.data?.refeicoes_fora ?? null,
    },
    exercicios: (ex.data ?? []).map((e) => ({ id: e.id, tipo: e.tipo, frequencia: e.frequencia ?? 0, duracao: e.duracao ?? 0, intensidade: e.intensidade ?? "moderada", horario: e.horario, objetivo: e.objetivo })),
    alimentacao: {
      preferidos: fp.data?.alimentos_preferidos ?? [],
      rejeitados: fp.data?.alimentos_rejeitados ?? [],
      evitar: fp.data?.alimentos_evitar ?? [],
      culinarias: fp.data?.culinarias_preferidas ?? [],
      refeicoes: (fp.data?.refeicoes_preferidas ?? []) as TipoRefeicao[],
      numeroRefeicoes: fp.data?.numero_de_refeicoes ?? null,
      modo: (fp.data?.modo_alimentar ?? "brasileira") as Modo,
    },
    orcamento: {
      diario: b.data?.orcamento_diario !== null && b.data?.orcamento_diario !== undefined ? Number(b.data.orcamento_diario) : null,
      semanal: b.data?.orcamento_semanal !== null && b.data?.orcamento_semanal !== undefined ? Number(b.data.orcamento_semanal) : null,
      mensal: b.data?.orcamento_mensal !== null && b.data?.orcamento_mensal !== undefined ? Number(b.data.orcamento_mensal) : null,
      locais: b.data?.locais_de_compra ?? [],
      observacoes: b.data?.observacoes ?? null,
    },
  };
}

/** Campos essenciais antes de gerar um plano (se faltarem, perguntar) */
export function camposFaltando(p: PerfilCompleto): string[] {
  const f: string[] = [];
  if (!p.dataNascimento) f.push("data de nascimento");
  if (!p.sexo) f.push("sexo");
  if (!p.altura) f.push("altura");
  if (!p.peso) f.push("peso");
  if (!p.objetivo.principal) f.push("objetivo principal");
  if (!p.rotina.nivelAtividade) f.push("nível de atividade no dia a dia");
  if (!p.alimentacao.refeicoes.length) f.push("refeições que você costuma fazer");
  return f;
}

export function orcamentoDiario(p: PerfilCompleto): number | null {
  if (p.orcamento.diario) return p.orcamento.diario;
  if (p.orcamento.semanal) return p.orcamento.semanal / 7;
  if (p.orcamento.mensal) return p.orcamento.mensal / 30;
  return null;
}

const HORARIO_PADRAO: Record<TipoRefeicao, string> = { cafe: "07:30", lanche_manha: "10:00", almoco: "12:30", lanche: "16:00", jantar: "19:30", ceia: "21:30" };

export function refeicoesConfig(p: PerfilCompleto): RefeicaoConfig[] {
  return p.alimentacao.refeicoes.map((t) => ({ tipo: t, horario: HORARIO_PADRAO[t] }));
}

/** Monta todo o contexto usado pelo motor: cálculo, segurança e filtros do plano */
export function contextoCompleto(p: PerfilCompleto, extras: { perdaPesoSemanalPct?: number | null; sintomasRegistrados?: string[]; modo?: Modo } = {}) {
  const idade = p.dataNascimento ? idadeDe(p.dataNascimento) : 0;
  const imc = p.peso && p.altura ? imcDe(p.peso, p.altura) : 0;
  const modo = extras.modo ?? p.alimentacao.modo;
  const perfilCalc: PerfilCalculo = {
    sexo: p.sexo ?? "outro",
    idade,
    altura: p.altura ?? 0,
    peso: p.peso ?? 0,
    nivelAtividade: p.rotina.nivelAtividade ?? "sedentario",
    exercicios: p.exercicios,
    objetivo: p.objetivo.principal ?? "saude_geral",
    metaPeso: p.objetivo.metaPeso,
    prazo: p.objetivo.prazo,
    altaProteina: modo === "alta_proteina",
    padraoVegetal: modo === "plant_based" || modo === "vegetariana" || modo === "mediterranea",
  };
  const pre = calcular(perfilCalc);
  const seguranca = avaliarSeguranca({
    idade,
    imc,
    objetivo: perfilCalc.objetivo,
    modo,
    saude: p.saude,
    medicamentos: p.medicamentos,
    suplementos: p.suplementos,
    alcoolDosesSemana: p.habitos.alcoolDoses,
    perdaPesoSemanalPct: extras.perdaPesoSemanalPct,
    sintomasRegistrados: extras.sintomasRegistrados,
    metaAgressiva: pre.metaAgressiva,
  });
  const calc = calcular(perfilCalc, seguranca.restricoesCalculo);

  const nomes = new Map(FOODS.map((f) => [f.id, f.id]));
  const idsValidos = (xs: string[]) => new Set(xs.filter((x) => nomes.has(x)));
  const ctx: ContextoPlano = {
    modo,
    alergenos: alergenosExcluidos(p.saude),
    restricoes: p.saude.restricoes,
    rejeitados: new Set([...idsValidos(p.alimentacao.rejeitados), ...idsValidos(p.alimentacao.evitar)]),
    preferidos: idsValidos(p.alimentacao.preferidos),
    culinarias: p.alimentacao.culinarias,
    tempoMax: p.rotina.tempoCozinhar,
    repeticao: p.prefs.repeticao ?? "media",
    marmitas: p.prefs.marmitas ?? false,
    orcamentoDiario: orcamentoDiario(p),
    sodioMax: 2000,
    evitarFermentados: gruposMedicamento(p.medicamentos).has("imao"),
  };
  return { idade, imc, perfilCalc, calc, seguranca, ctx, modo };
}

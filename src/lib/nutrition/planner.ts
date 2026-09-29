import { FOODS, getFood } from "@/data/foods";
import { RECIPES } from "@/data/recipes";
import type {
  Alergeno,
  DiaPlanejado,
  Food,
  IngredienteBase,
  ItemPlanejado,
  Macros,
  Modo,
  Receita,
  RefeicaoPlanejada,
  Restricao,
  TipoRefeicao,
} from "@/lib/types";
import { item, macrosDe, macrosItens, somar } from "./foodmath";

export const NOME_REFEICAO: Record<TipoRefeicao, string> = {
  cafe: "Café da manhã",
  lanche_manha: "Lanche da manhã",
  almoco: "Almoço",
  lanche: "Lanche da tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};

export const ORDEM_REFEICAO: TipoRefeicao[] = ["cafe", "lanche_manha", "almoco", "lanche", "jantar", "ceia"];

const PESO_REFEICAO: Record<TipoRefeicao, number> = {
  cafe: 25,
  lanche_manha: 10,
  almoco: 32,
  lanche: 12,
  jantar: 28,
  ceia: 8,
};

export const MODOS: { id: Modo; nome: string; descricao: string }[] = [
  { id: "brasileira", nome: "Brasileira", descricao: "Arroz, feijão, legumes e preparações do dia a dia." },
  { id: "japonesa", nome: "Japonesa", descricao: "Arroz, peixes, tofu, sopas e vegetais, com atenção ao sódio." },
  { id: "mediterranea", nome: "Mediterrânea", descricao: "Azeite, leguminosas, peixes, grãos integrais e vegetais." },
  { id: "vegetariana", nome: "Vegetariana", descricao: "Sem carnes e peixes; inclui ovos e laticínios." },
  { id: "plant_based", nome: "Plant-based", descricao: "100% vegetal." },
  { id: "alta_proteina", nome: "Alta proteína", descricao: "Proteína no topo da faixa segura para o seu objetivo." },
  { id: "baixo_custo", nome: "Baixo custo", descricao: "Prioriza alimentos acessíveis e nutritivos." },
  { id: "marmitas", nome: "Marmitas", descricao: "Receitas que congelam bem e se repetem para facilitar o preparo." },
];

export interface ContextoPlano {
  modo: Modo;
  alergenos: Set<Alergeno>;
  restricoes: Restricao[];
  rejeitados: Set<string>;
  preferidos: Set<string>;
  culinarias: string[];
  tempoMax?: number | null;
  repeticao: "baixa" | "media" | "alta";
  marmitas: boolean;
  orcamentoDiario?: number | null;
  sodioMax: number;
  evitarFermentados?: boolean;
}

export interface AlvoDia {
  kcal: number;
  p: number;
}

export interface RefeicaoConfig {
  tipo: TipoRefeicao;
  horario?: string;
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

function restricoesEfetivas(ctx: ContextoPlano): Set<Restricao> {
  const r = new Set(ctx.restricoes);
  if (ctx.modo === "vegetariana") r.add("vegetariano");
  if (ctx.modo === "plant_based") r.add("vegano");
  if (r.has("vegano")) r.add("vegetariano");
  return r;
}

export function alimentoPermitido(f: Food, ctx: ContextoPlano): boolean {
  if (ctx.rejeitados.has(f.id)) return false;
  if (f.alergenos.some((a) => ctx.alergenos.has(a))) return false;
  if (ctx.evitarFermentados && f.tags.includes("fermentado")) return false;
  const r = restricoesEfetivas(ctx);
  const animal = ["aves", "carne_vermelha", "peixe", "frutos_do_mar"];
  if (r.has("vegetariano") && f.tags.some((t) => animal.includes(t))) return false;
  if (r.has("vegano") && !f.tags.includes("vegano")) return false;
  if (r.has("sem_carne_vermelha") && f.tags.includes("carne_vermelha")) return false;
  if (r.has("sem_porco") && f.tags.includes("porco")) return false;
  if (r.has("sem_peixe") && f.tags.includes("peixe")) return false;
  if (r.has("sem_frutos_do_mar") && f.tags.includes("frutos_do_mar")) return false;
  if (r.has("sem_gluten") && f.alergenos.includes("gluten")) return false;
  if (r.has("sem_lactose") && f.alergenos.includes("lactose")) return false;
  return true;
}

/** Procura substituto no mesmo grupo, priorizando a mesma culinária e proteína similar */
export function substitutoPara(foodId: string, ctx: ContextoPlano, excluir: Set<string> = new Set()): Food | null {
  const orig = getFood(foodId);
  const grupos = orig.grupo === "proteina" ? ["proteina", "leguminosa"] : orig.grupo === "laticinio" ? ["laticinio"] : [orig.grupo];
  const cands = FOODS.filter((f) => f.id !== foodId && !excluir.has(f.id) && grupos.includes(f.grupo) && alimentoPermitido(f, ctx));
  if (!cands.length) return null;
  const cozinha = orig.tags.filter((t) => ["brasileiro", "japones", "mediterraneo"].includes(t));
  cands.sort((a, b) => {
    const sa = a.tags.filter((t) => cozinha.includes(t)).length * 10 - Math.abs(a.p - orig.p) / 5 - Math.abs(a.kcal - orig.kcal) / 100;
    const sb = b.tags.filter((t) => cozinha.includes(t)).length * 10 - Math.abs(b.p - orig.p) / 5 - Math.abs(b.kcal - orig.kcal) / 100;
    return sb - sa;
  });
  return cands[0];
}

export interface ReceitaAdaptada {
  receita: Receita;
  itens: IngredienteBase[];
  trocas: string[];
}

export function adaptarReceita(rec: Receita, ctx: ContextoPlano): ReceitaAdaptada | null {
  const itens: IngredienteBase[] = [];
  const trocas: string[] = [];
  for (const it of rec.itens) {
    const f = getFood(it.food);
    if (alimentoPermitido(f, ctx)) {
      itens.push(it);
      continue;
    }
    if (it.papel === "extra" || f.grupo === "tempero") {
      trocas.push(`${f.nome} removido`);
      continue; // temperos/extras podem ser omitidos
    }
    const sub = substitutoPara(it.food, ctx, new Set(itens.map((i) => i.food)));
    if (!sub) return null;
    // equivalência: proteína para itens proteicos, energia para os demais
    const g = it.papel === "proteina" && sub.p > 2 ? (it.g * f.p) / sub.p : (it.g * f.kcal) / Math.max(sub.kcal, 1);
    itens.push({ ...it, food: sub.id, g: Math.min(g, it.g * 3) });
    trocas.push(`${f.nome} → ${sub.nome}`);
  }
  if (!itens.some((i) => i.papel === "proteina" || i.papel === "carbo")) return null;
  return { receita: rec, itens, trocas };
}

export function receitasPermitidas(tipo: TipoRefeicao, ctx: ContextoPlano): ReceitaAdaptada[] {
  const out: ReceitaAdaptada[] = [];
  for (const r of RECIPES) {
    if (!r.tipos.includes(tipo)) continue;
    const a = adaptarReceita(r, ctx);
    if (a) out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Escala de porções
// ---------------------------------------------------------------------------

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** Porção máxima prática por refeição (g), por grupo de alimento */
export const TETO: Record<string, number> = { cereal: 250, leguminosa: 150, proteina: 200, laticinio: 300, hortalica: 200, fruta: 200, gordura: 15, oleaginosa: 30, tempero: 40, doce: 20 };

function teto(foodId: string, base: number): number {
  const f = getFood(foodId);
  return Math.max(base, TETO[f.grupo] ?? 250);
}

/**
 * Reescala uma receita para a meta da refeição:
 * 1) proteína para a meta de proteína; 2) carboidrato para a energia; 3) gorduras se faltar;
 * 4) ajuste proporcional fino; 5) limites práticos por alimento; 6) se ainda faltar energia,
 * completa com acompanhamentos permitidos (ex.: fruta de sobremesa, castanhas).
 */
export function escalar(itens: IngredienteBase[], kcalAlvo: number, pAlvo: number, complementos: string[] = []): ItemPlanejado[] {
  const prot = itens.filter((i) => i.papel === "proteina");
  let carb = itens.filter((i) => i.papel === "carbo");
  if (!carb.length) carb = itens.filter((i) => i.papel === "fruta");
  const ajustaveis = new Set([...prot, ...carb]);
  const fixos = itens.filter((i) => !ajustaveis.has(i));

  const mProt = macrosItens(prot.map((i) => ({ food: i.food, g: i.g })));
  const mCarb = macrosItens(carb.map((i) => ({ food: i.food, g: i.g })));
  const mFix = macrosItens(fixos.map((i) => ({ food: i.food, g: i.g })));

  const pOutros = mFix.p + mCarb.p;
  const sp = prot.length && mProt.p > 0 ? clamp((pAlvo - pOutros) / mProt.p, 0.6, 1.8) : 1;
  const kcalRestante = kcalAlvo - mFix.kcal - sp * mProt.kcal;
  const sc = carb.length && mCarb.kcal > 0 ? clamp(kcalRestante / mCarb.kcal, 0.4, 2.2) : 1;

  let sf = 1;
  const total = mFix.kcal + sp * mProt.kcal + sc * mCarb.kcal;
  const gord = fixos.filter((i) => i.papel === "gordura");
  if (total < kcalAlvo * 0.9 && gord.length) {
    const mG = macrosItens(gord.map((i) => ({ food: i.food, g: i.g })));
    if (mG.kcal > 0) sf = clamp(1 + (kcalAlvo - total) / mG.kcal, 1, 2);
  }

  const lista: IngredienteBase[] = itens.map((i) => ({ ...i }));
  const gramas = itens.map((i) => i.g * (prot.includes(i) ? sp : carb.includes(i) ? sc : i.papel === "gordura" ? sf : 1));
  const kcalTotal = () => lista.reduce((a, it, k) => a + macrosDe(it.food, gramas[k]).kcal, 0);

  // ajuste proporcional fino (exceto temperos/extras, para não elevar o sódio)
  const escalavel = (k: number) => lista[k].papel !== "extra" && getFood(lista[k].food).grupo !== "tempero";
  let t = kcalTotal();
  if (t < kcalAlvo * 0.93 || t > kcalAlvo * 1.08) {
    const idx = lista.map((_, k) => k).filter(escalavel);
    const kE = idx.reduce((a, k) => a + macrosDe(lista[k].food, gramas[k]).kcal, 0);
    if (kE > 0) {
      const f = clamp((kcalAlvo - (t - kE)) / kE, 0.6, 1.6);
      for (const k of idx) gramas[k] *= f;
    }
  }

  // limites práticos por alimento
  lista.forEach((it, k) => (gramas[k] = Math.min(gramas[k], teto(it.food, it.g))));

  // completa com acompanhamentos se ainda faltar energia
  t = kcalTotal();
  for (const c of complementos) {
    if (t >= kcalAlvo * 0.92) break;
    if (lista.some((x) => x.food === c)) continue;
    const f = getFood(c);
    const falta = kcalAlvo - t;
    const g = Math.min((falta / f.kcal) * 100, TETO[f.grupo] ?? 150, f.gMedida * 2);
    if (g < f.gMedida * 0.5) continue;
    lista.push({ food: c, g, papel: f.grupo === "fruta" ? "fruta" : "gordura", preparo: f.grupo === "fruta" ? "sobremesa ou para levar" : "acompanhamento" });
    gramas.push(g);
    t = kcalTotal();
  }

  return lista.map((i, k) => item(i.food, gramas[k], i.preparo, i.papel));
}

const COMPLEMENTOS: Record<string, string[]> = {
  principal: ["laranja", "banana", "mamao", "manga", "maca", "castanha-para"],
  leve: ["banana", "maca", "mamao", "castanha-para", "amendoim", "aveia"],
};

export function complementosPara(tipo: TipoRefeicao, ctx?: ContextoPlano): string[] {
  const base = tipo === "almoco" || tipo === "jantar" ? COMPLEMENTOS.principal : COMPLEMENTOS.leve;
  return ctx ? base.filter((id) => alimentoPermitido(getFood(id), ctx)) : base;
}

// ---------------------------------------------------------------------------
// Distribuição do dia
// ---------------------------------------------------------------------------

export function distribuir(refeicoes: RefeicaoConfig[], alvo: AlvoDia): Map<TipoRefeicao, AlvoDia> {
  const total = refeicoes.reduce((a, r) => a + PESO_REFEICAO[r.tipo], 0);
  const m = new Map<TipoRefeicao, AlvoDia>();
  for (const r of refeicoes) {
    const f = PESO_REFEICAO[r.tipo] / total;
    m.set(r.tipo, { kcal: alvo.kcal * f, p: alvo.p * f });
  }
  return m;
}

// ---------------------------------------------------------------------------
// RNG determinístico
// ---------------------------------------------------------------------------

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Pontuação e escolha
// ---------------------------------------------------------------------------

const MODO_COZINHA: Record<string, Modo> = { brasileiro: "brasileira", japones: "japonesa", mediterraneo: "mediterranea" };

export function custoPor500kcal(itens: IngredienteBase[]): number {
  const m = macrosItens(itens.map((i) => ({ food: i.food, g: i.g })));
  return (m.custo / Math.max(m.kcal, 1)) * 500;
}

function pontuar(a: ReceitaAdaptada, ctx: ContextoPlano, tipo: TipoRefeicao): number {
  const r = a.receita;
  let s = 1;
  if (r.modos.includes(ctx.modo)) s += 2;
  for (const c of ctx.culinarias) if (MODO_COZINHA[c] && r.modos.includes(MODO_COZINHA[c])) s += 0.6;
  s += a.itens.filter((i) => ctx.preferidos.has(i.food)).length * 0.4;
  if (ctx.tempoMax && r.tempo > ctx.tempoMax && !(ctx.marmitas && r.tags.includes("marmita"))) s *= 0.35;
  if ((ctx.marmitas || ctx.modo === "marmitas") && (tipo === "almoco" || tipo === "jantar") && r.tags.includes("marmita")) s += 1.5;
  if (ctx.modo === "baixo_custo") s *= 3 / Math.max(1, custoPor500kcal(a.itens));
  if (ctx.modo === "alta_proteina") {
    const m = macrosItens(a.itens.map((i) => ({ food: i.food, g: i.g })));
    s *= 0.6 + (m.p * 4) / Math.max(m.kcal, 1);
  }
  if (a.trocas.length) s *= 0.8;
  return Math.max(0.05, s);
}

function poolPara(tipo: TipoRefeicao, ctx: ContextoPlano): ReceitaAdaptada[] {
  const todas = receitasPermitidas(tipo, ctx);
  const estritos: Modo[] = ["brasileira", "japonesa", "mediterranea", "vegetariana", "plant_based"];
  if (estritos.includes(ctx.modo)) {
    const doModo = todas.filter((a) => a.receita.modos.includes(ctx.modo));
    if (doModo.length >= 2) return doModo;
  }
  if (ctx.modo === "marmitas" && (tipo === "almoco" || tipo === "jantar")) {
    const m = todas.filter((a) => a.receita.tags.includes("marmita"));
    if (m.length >= 2) return m;
  }
  return todas;
}

function escolher(pool: ReceitaAdaptada[], ctx: ContextoPlano, tipo: TipoRefeicao, rand: () => number, evitar: Set<string>): ReceitaAdaptada | null {
  const opcoes = pool.filter((a) => !evitar.has(a.receita.id));
  const base = opcoes.length ? opcoes : pool;
  if (!base.length) return null;
  const pesos = base.map((a) => pontuar(a, ctx, tipo));
  const soma = pesos.reduce((x, y) => x + y, 0);
  let alvo = rand() * soma;
  for (let i = 0; i < base.length; i++) {
    alvo -= pesos[i];
    if (alvo <= 0) return base[i];
  }
  return base[base.length - 1];
}

export function montarRefeicao(a: ReceitaAdaptada, tipo: TipoRefeicao, alvo: AlvoDia, horario: string | undefined, ctx: ContextoPlano): RefeicaoPlanejada {
  return {
    tipo,
    nome: NOME_REFEICAO[tipo],
    horario,
    receitaId: a.receita.id,
    itens: escalar(a.itens, alvo.kcal, alvo.p, complementosPara(tipo, ctx)),
    nota: a.trocas.length ? `Adaptado: ${a.trocas.join("; ")}` : undefined,
  };
}

export function macrosRefeicao(r: RefeicaoPlanejada): Macros {
  return macrosItens(r.itens);
}

export function macrosDia(d: DiaPlanejado): Macros {
  return somar(d.refeicoes.map(macrosRefeicao));
}

// ---------------------------------------------------------------------------
// Geração do plano
// ---------------------------------------------------------------------------

export interface EntradaPlano {
  dataInicio: string; // YYYY-MM-DD
  dias: number;
  alvo: AlvoDia;
  refeicoes: RefeicaoConfig[];
  ctx: ContextoPlano;
  seed?: number;
}

export interface ResultadoPlano {
  dias: DiaPlanejado[];
  media: Macros;
  notas: string[];
}

export function addDias(data: string, n: number): string {
  const d = new Date(data + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function gerarPlano(e: EntradaPlano): ResultadoPlano {
  const rand = rng(e.seed ?? Date.now());
  const notas = new Set<string>();
  const refeicoes = [...e.refeicoes].sort((a, b) => ORDEM_REFEICAO.indexOf(a.tipo) - ORDEM_REFEICAO.indexOf(b.tipo));
  const distrib = distribuir(refeicoes, e.alvo);
  const janela = e.ctx.repeticao === "alta" ? 1 : e.ctx.repeticao === "media" ? 2 : 4;
  const historico = new Map<TipoRefeicao, string[]>();
  const pools = new Map<TipoRefeicao, ReceitaAdaptada[]>();
  for (const r of refeicoes) {
    const pool = poolPara(r.tipo, e.ctx);
    pools.set(r.tipo, pool);
    if (!pool.length) notas.add(`Não encontramos receitas compatíveis para ${NOME_REFEICAO[r.tipo].toLowerCase()} com suas restrições.`);
    const trocas = pool.flatMap((a) => a.trocas);
    if (trocas.length) notas.add("Algumas receitas foram adaptadas para respeitar alergias, restrições ou alimentos que você não come.");
  }
  const lote = e.ctx.marmitas || e.ctx.modo === "marmitas";
  const dias: DiaPlanejado[] = [];

  for (let d = 0; d < e.dias; d++) {
    const data = addDias(e.dataInicio, d);
    const dia: DiaPlanejado = { data, refeicoes: [] };
    const usadasHoje = new Set<string>();
    for (const r of refeicoes) {
      const pool = pools.get(r.tipo)!;
      if (!pool.length) continue;
      const hist = historico.get(r.tipo) ?? [];
      let escolhida: ReceitaAdaptada | null = null;
      // marmitas: repete almoço/jantar em blocos de 2 dias (cozinha uma vez, come duas)
      if (lote && (r.tipo === "almoco" || r.tipo === "jantar") && d % 2 === 1 && hist.length) {
        escolhida = pool.find((a) => a.receita.id === hist[hist.length - 1]) ?? null;
      }
      if (!escolhida) {
        const evitar = new Set([...hist.slice(-janela), ...usadasHoje]);
        escolhida = escolher(pool, e.ctx, r.tipo, rand, evitar);
      }
      if (!escolhida) continue;
      usadasHoje.add(escolhida.receita.id);
      historico.set(r.tipo, [...hist, escolhida.receita.id]);
      dia.refeicoes.push(montarRefeicao(escolhida, r.tipo, distrib.get(r.tipo)!, r.horario, e.ctx));
    }
    // os ajustes (proteína, sódio, orçamento) só trocam por receitas que não se repetiram recentemente,
    // para não sacrificar a variedade (voltam ao conjunto completo se não houver alternativa)
    const poolsDia = new Map<TipoRefeicao, ReceitaAdaptada[]>();
    for (const [tipo, pool] of pools) {
      const recentes = new Set((historico.get(tipo) ?? []).slice(-(janela + 1), -1));
      const outrasHoje = new Set(dia.refeicoes.filter((x) => x.tipo !== tipo).map((x) => x.receitaId));
      const f = pool.filter((a) => !recentes.has(a.receita.id) && !outrasHoje.has(a.receita.id));
      poolsDia.set(tipo, f.length ? f : pool);
    }
    ajustarProteina(dia, e, poolsDia, distrib);
    ajustarSodio(dia, e.ctx, poolsDia, distrib, notas, e.alvo.p);
    const naSemana = new Map<string, number>();
    for (const x of [...dias.slice(-6), dia]) for (const r of x.refeicoes) if (r.receitaId) naSemana.set(r.receitaId, (naSemana.get(r.receitaId) ?? 0) + 1);
    const maxSemana = e.ctx.repeticao === "alta" ? 5 : e.ctx.repeticao === "media" ? 3 : 2;
    ajustarOrcamento(dia, e.ctx, poolsDia, distrib, notas, e.alvo.p, (id) => (naSemana.get(id) ?? 0) < maxSemana);
    for (const r of dia.refeicoes) {
      const h = historico.get(r.tipo) ?? [];
      if (h.length && r.receitaId) h[h.length - 1] = r.receitaId;
    }
    if (macrosDia(dia).p < e.alvo.p * 0.85) notas.add("Em alguns dias a proteína ficou abaixo da meta com as opções disponíveis; considere incluir ovos, peixes, frango, tofu ou iogurte (se tolerar).");
    dias.push(dia);
  }

  const somaDias = somar(dias.map(macrosDia));
  const n = Math.max(1, dias.length);
  const media: Macros = { kcal: somaDias.kcal / n, p: somaDias.p / n, c: somaDias.c / n, g: somaDias.g / n, f: somaDias.f / n, na: somaDias.na / n, custo: somaDias.custo / n };
  return { dias, media, notas: [...notas] };
}

/** Troca refeições de baixa proteína por alternativas mais proteicas até aproximar a meta do dia */
function ajustarProteina(dia: DiaPlanejado, e: EntradaPlano, pools: Map<TipoRefeicao, ReceitaAdaptada[]>, distrib: Map<TipoRefeicao, AlvoDia>) {
  for (let tent = 0; tent < dia.refeicoes.length; tent++) {
    if (macrosDia(dia).p >= e.alvo.p * 0.92) return;
    // refeição mais distante da sua meta proporcional de proteína
    let idx = -1;
    let pior = 0;
    dia.refeicoes.forEach((r, i) => {
      const deficit = distrib.get(r.tipo)!.p - macrosRefeicao(r).p;
      if (deficit > pior) {
        pior = deficit;
        idx = i;
      }
    });
    if (idx < 0) return;
    const ref = dia.refeicoes[idx];
    const mRef = macrosRefeicao(ref);
    const pDia = macrosDia(dia).p;
    const usadas = new Set(dia.refeicoes.map((r) => r.receitaId));
    // escolhe a troca que deixa a proteína do dia mais perto da meta (sem exagerar), com custo parecido
    const alt = (pools.get(ref.tipo) ?? [])
      .filter((a) => !usadas.has(a.receita.id))
      .map((a) => montarRefeicao(a, ref.tipo, distrib.get(ref.tipo)!, ref.horario, e.ctx))
      .map((m) => ({ m, mm: macrosRefeicao(m) }))
      .filter((x) => x.mm.p > mRef.p + 3)
      .filter((x) => !e.ctx.orcamentoDiario || x.mm.custo <= mRef.custo * 1.2 + 0.5)
      .map((x) => ({ ...x, dist: Math.abs(pDia - mRef.p + x.mm.p - e.alvo.p) }))
      .sort((x, y) => x.dist - y.dist)[0];
    if (!alt || alt.dist >= Math.abs(pDia - e.alvo.p)) return;
    dia.refeicoes[idx] = alt.m;
  }
}

function ajustarSodio(dia: DiaPlanejado, ctx: ContextoPlano, pools: Map<TipoRefeicao, ReceitaAdaptada[]>, distrib: Map<TipoRefeicao, AlvoDia>, notas: Set<string>, pAlvoDia: number) {
  for (let tent = 0; tent < 3; tent++) {
    const naDia = macrosDia(dia).na;
    if (naDia <= ctx.sodioMax) return;
    // troca a refeição com mais sódio pela alternativa de menor sódio
    let idx = 0;
    let maior = -1;
    dia.refeicoes.forEach((r, i) => {
      const na = macrosRefeicao(r).na;
      if (na > maior) {
        maior = na;
        idx = i;
      }
    });
    const ref = dia.refeicoes[idx];
    const pool = pools.get(ref.tipo) ?? [];
    const pOutras = macrosDia(dia).p - macrosRefeicao(ref).p;
    const alt = pool
      .filter((a) => a.receita.id !== ref.receitaId)
      .map((a) => montarRefeicao(a, ref.tipo, distrib.get(ref.tipo)!, ref.horario, ctx))
      .map((m) => ({ m, mm: macrosRefeicao(m) }))
      .filter((x) => pOutras + x.mm.p >= Math.min(pAlvoDia * 0.9, macrosDia(dia).p))
      .sort((x, y) => x.mm.na - y.mm.na)[0];
    if (!alt || alt.mm.na >= maior) break;
    dia.refeicoes[idx] = alt.m;
  }
  if (macrosDia(dia).na > ctx.sodioMax) notas.add("Em alguns dias o sódio estimado ficou acima de 2.000 mg; use shoyu reduzido e evite sal extra.");
}

function ajustarOrcamento(dia: DiaPlanejado, ctx: ContextoPlano, pools: Map<TipoRefeicao, ReceitaAdaptada[]>, distrib: Map<TipoRefeicao, AlvoDia>, notas: Set<string>, pAlvoDia: number, variedadeOk: (id: string) => boolean) {
  if (!ctx.orcamentoDiario) return;
  for (let tent = 0; tent < dia.refeicoes.length; tent++) {
    if (macrosDia(dia).custo <= ctx.orcamentoDiario) return;
    const custos = dia.refeicoes.map((r) => macrosRefeicao(r).custo);
    const idx = custos.indexOf(Math.max(...custos));
    const ref = dia.refeicoes[idx];
    const pool = pools.get(ref.tipo) ?? [];
    const alvo = distrib.get(ref.tipo)!;
    // só aceita opção mais barata que preserve a proteína (custo nunca vem antes da qualidade nutricional)
    const pOutras = macrosDia(dia).p - macrosRefeicao(ref).p;
    const pMinDia = Math.min(pAlvoDia * 0.9, macrosDia(dia).p);
    const custoOutras = macrosDia(dia).custo - custos[idx];
    // aderência vem antes do custo: não repetir uma receita além do limite semanal só para economizar
    const candidatas = pool
      .filter((a) => variedadeOk(a.receita.id))
      .map((a) => montarRefeicao(a, ref.tipo, alvo, ref.horario, ctx))
      .map((m) => ({ m, mm: macrosRefeicao(m) }))
      .filter((x) => pOutras + x.mm.p >= pMinDia)
      .map((x) => ({ m: x.m, custo: x.mm.custo }))
      .sort((x, y) => x.custo - y.custo);
    // entre as que fazem o dia caber no orçamento, a de maior custo (menor mudança, mais variedade);
    // se nenhuma couber, a mais barata
    const cabem = candidatas.filter((x) => custoOutras + x.custo <= ctx.orcamentoDiario!);
    const alt = cabem.length ? cabem[cabem.length - 1] : candidatas[0];
    if (!alt || alt.custo >= custos[idx] - 0.01) break;
    dia.refeicoes[idx] = alt.m;
  }
  if (macrosDia(dia).custo > ctx.orcamentoDiario) notas.add("Em alguns dias o custo ficou acima do orçamento para preservar a adequação nutricional e a variedade. Use “Reduzir custo” ou aumente a repetição de refeições nas preferências para economizar mais.");
  else notas.add("O plano foi ajustado para caber no seu orçamento.");
}

/** Reescala uma refeição existente para um novo alvo (ex.: mais/menos fome) */
export function reescalarItens(itens: ItemPlanejado[], kcalAlvo: number, pAlvo: number): ItemPlanejado[] {
  return escalar(
    itens.map((i) => ({ food: i.food, g: i.g, papel: i.papel ?? inferirPapel(i.food), preparo: i.preparo })),
    kcalAlvo,
    pAlvo,
  );
}

export function inferirPapel(foodId: string): IngredienteBase["papel"] {
  const f = getFood(foodId);
  if (f.grupo === "proteina" || f.grupo === "laticinio") return "proteina";
  if (f.grupo === "cereal" || f.grupo === "leguminosa") return "carbo";
  if (f.grupo === "hortalica") return "vegetal";
  if (f.grupo === "gordura" || f.grupo === "oleaginosa") return "gordura";
  if (f.grupo === "fruta") return "fruta";
  return "extra";
}

export { macrosDe };

import { describe, expect, it } from "vitest";
import { FOODS, FOOD_MAP } from "@/data/foods";
import { RECIPES } from "@/data/recipes";
import { FONTES } from "@/data/sources";
import { calcular, tmbHarrisBenedict, tmbMifflin } from "../calc";
import { macrosDia, gerarPlano, TETO, type ContextoPlano } from "../planner";
import { avaliarSeguranca, alergenosExcluidos, type PerfilSaude } from "../safety";
import { opcoesTrocaAlimento, opcoesTrocaRefeicao, ajustarFomeRefeicao } from "../swaps";
import { montarLista, adicionarItens, totalLista } from "../shopping";
import { revisar, associacoes } from "../review";
import { macrosItens } from "../foodmath";
import { RECIPE_MAP } from "@/data/recipes";

const saudeVazia: PerfilSaude = { condicoes: [], sintomas: [], alergias: [], intolerancias: [], restricoes: [] };

const ctxBase = (over: Partial<ContextoPlano> = {}): ContextoPlano => ({
  modo: "brasileira",
  alergenos: new Set(),
  restricoes: [],
  rejeitados: new Set(),
  preferidos: new Set(),
  culinarias: [],
  repeticao: "media",
  marmitas: false,
  sodioMax: 2000,
  ...over,
});

describe("dados de referência", () => {
  it("todas as receitas usam alimentos existentes", () => {
    for (const r of RECIPES) for (const i of r.itens) expect(FOOD_MAP[i.food], `${r.id}:${i.food}`).toBeDefined();
  });
  it("ids únicos", () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });
  it("macros coerentes com energia (Atwater ±25%)", () => {
    for (const f of FOODS) {
      const atw = f.p * 4 + f.c * 4 + f.g * 9;
      if (f.kcal > 40) expect(Math.abs(atw - f.kcal) / f.kcal, f.id).toBeLessThan(0.25);
    }
  });
  it("fontes com DOI ou URL", () => {
    for (const s of FONTES) expect(Boolean(s.doi || s.url || s.nivel === "Base de dados de referência"), s.id).toBe(true);
  });
});

describe("cálculo nutricional", () => {
  it("Mifflin-St Jeor confere com valores de referência", () => {
    // homem 30 a, 80 kg, 180 cm => 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(tmbMifflin("masculino", 80, 180, 30)).toBeCloseTo(1780, 5);
    // mulher 40 a, 65 kg, 165 cm => 650 + 1031.25 - 200 - 161 = 1320.25
    expect(tmbMifflin("feminino", 65, 165, 40)).toBeCloseTo(1320.25, 5);
    expect(tmbHarrisBenedict("masculino", 80, 180, 30)).toBeCloseTo(88.362 + 13.397 * 80 + 4.799 * 180 - 5.677 * 30, 5);
  });

  it("perda de peso aplica déficit moderado e respeita o piso", () => {
    const r = calcular({ sexo: "feminino", idade: 35, altura: 160, peso: 58, nivelAtividade: "sedentario", exercicios: [], objetivo: "perda_peso" });
    expect(r.meta.kcal).toBeGreaterThanOrEqual(r.meta.piso);
    expect(r.meta.kcal).toBeGreaterThanOrEqual(1200);
    expect(r.meta.ajuste).toBeLessThan(0);
    expect(r.get.faixa.min).toBeLessThan(r.get.faixa.max);
    expect(r.proteina.gPorKg).toBeGreaterThanOrEqual(1.2);
  });

  it("déficit bloqueado quando segurança exige", () => {
    const r = calcular(
      { sexo: "feminino", idade: 30, altura: 165, peso: 70, nivelAtividade: "leve", exercicios: [], objetivo: "perda_peso" },
      { semDeficit: true, restricaoHidrica: false, motivos: ["gestação"] },
    );
    expect(r.meta.ajuste).toBe(0);
  });

  it("macros somam a meta de energia (±3%)", () => {
    const r = calcular({ sexo: "masculino", idade: 28, altura: 178, peso: 82, nivelAtividade: "moderado", exercicios: [{ tipo: "musculação", frequencia: 4, duracao: 60, intensidade: "moderada" }], objetivo: "ganho_massa" });
    const soma = r.proteina.g * 4 + r.carboidrato.g * 4 + r.gordura.g * 9;
    expect(Math.abs(soma - r.meta.kcal) / r.meta.kcal).toBeLessThan(0.03);
    expect(r.proteina.gPorKg).toBeGreaterThanOrEqual(1.6);
    expect(r.agua.ml).toBeGreaterThan(2500);
  });

  it("doença renal limita proteína e não calcula água", () => {
    const r = calcular(
      { sexo: "masculino", idade: 60, altura: 170, peso: 75, nivelAtividade: "leve", exercicios: [], objetivo: "manutencao" },
      { semDeficit: false, proteinaMaxGkg: 0.8, restricaoHidrica: true, motivos: [] },
    );
    expect(r.proteina.gPorKg).toBeLessThanOrEqual(0.8);
    expect(r.agua.ml).toBeNull();
  });

  it("detecta meta agressiva", () => {
    const prazo = new Date(Date.now() + 28 * 864e5).toISOString().slice(0, 10);
    const r = calcular({ sexo: "feminino", idade: 30, altura: 165, peso: 80, nivelAtividade: "leve", exercicios: [], objetivo: "perda_peso", metaPeso: 70, prazo });
    expect(r.metaAgressiva).toBe(true);
  });
});

describe("segurança", () => {
  it("bloqueia menores de idade", () => {
    const s = avaliarSeguranca({ idade: 16, imc: 21, objetivo: "perda_peso", modo: "brasileira", saude: saudeVazia, medicamentos: [], suplementos: [] });
    expect(s.bloqueios.length).toBeGreaterThan(0);
  });
  it("alerta de hipoglicemia com insulina e sem alterar medicação", () => {
    const s = avaliarSeguranca({ idade: 45, imc: 28, objetivo: "perda_peso", modo: "brasileira", saude: { ...saudeVazia, condicoes: ["diabetes_tipo2"] }, medicamentos: [{ nome: "Insulina NPH" }], suplementos: [] });
    const a = s.alertas.find((x) => x.regra === "hipoglicemia");
    expect(a?.gravidade).toBe("importante");
    expect(a?.acao_recomendada).toMatch(/Não altere doses/);
  });
  it("IMAO evita fermentados; gestação sem déficit; sintomas de alarme", () => {
    const s = avaliarSeguranca({ idade: 30, imc: 24, objetivo: "perda_peso", modo: "japonesa", saude: { ...saudeVazia, condicoes: ["gestante"], sintomas: ["sangue_fezes"] }, medicamentos: [{ nome: "tranilcipromina" }], suplementos: [] });
    expect(s.restricoesCalculo.semDeficit).toBe(true);
    expect(s.alertas.some((a) => a.regra === "imao_tiramina")).toBe(true);
    expect(s.alertas.some((a) => a.regra === "sintomas_alerta")).toBe(true);
  });
  it("celíaca exclui glúten", () => {
    expect(alergenosExcluidos({ ...saudeVazia, condicoes: ["doenca_celiaca"] }).has("gluten")).toBe(true);
  });
});

describe("gerador de cardápio", () => {
  const alvo = { kcal: 2000, p: 110 };
  const refeicoes = [{ tipo: "cafe" as const }, { tipo: "almoco" as const }, { tipo: "lanche" as const }, { tipo: "jantar" as const }];

  it("gera plano semanal próximo da meta", () => {
    const r = gerarPlano({ dataInicio: "2026-10-01", dias: 7, alvo, refeicoes, ctx: ctxBase(), seed: 42 });
    expect(r.dias).toHaveLength(7);
    for (const d of r.dias) {
      expect(d.refeicoes).toHaveLength(4);
      const m = macrosDia(d);
      expect(Math.abs(m.kcal - alvo.kcal) / alvo.kcal, d.data).toBeLessThan(0.15);
      expect(m.p).toBeGreaterThan(alvo.p * 0.75);
    }
  });

  it("poucas refeições com meta alta ainda atingem a energia (±10%)", () => {
    for (const [refs, kcal] of [[["almoco", "lanche", "jantar"], 1940], [["almoco", "jantar"], 2400], [["cafe", "almoco", "jantar"], 2800]] as const) {
      const r = gerarPlano({ dataInicio: "2026-10-01", dias: 7, alvo: { kcal, p: 110 }, refeicoes: refs.map((t) => ({ tipo: t })), ctx: ctxBase({ orcamentoDiario: 21 }), seed: 11 });
      for (const d of r.dias) {
        expect(Math.abs(macrosDia(d).kcal - kcal) / kcal, `${refs.join("+")} ${d.data}`).toBeLessThan(0.1);
        expect(macrosDia(d).p, `proteína ${refs.join("+")} ${d.data}`).toBeGreaterThanOrEqual(110 * 0.85);
        expect(macrosDia(d).p, `proteína sem exagero ${refs.join("+")} ${d.data}`).toBeLessThanOrEqual(110 * 1.6);
        // porções práticas: nenhum alimento acima do teto do seu grupo
        for (const ref of d.refeicoes) for (const i of ref.itens) expect(i.g, `${ref.receitaId}:${i.food}`).toBeLessThanOrEqual(Math.max(TETO[FOOD_MAP[i.food].grupo], RECIPE_MAP[ref.receitaId!].itens.find((x) => x.food === i.food)?.g ?? 0) + (FOOD_MAP[i.food].contavel ? FOOD_MAP[i.food].gMedida : 5));
        expect(macrosDia(d).f, "fibra diária plausível (até ~2,2× a meta de 14 g/1000 kcal)").toBeLessThan((31 * kcal) / 1000);
      }
    }
  });

  it("respeita número de refeições sem forçar café da manhã", () => {
    const r = gerarPlano({ dataInicio: "2026-10-01", dias: 3, alvo, refeicoes: [{ tipo: "almoco" }, { tipo: "jantar" }], ctx: ctxBase(), seed: 1 });
    for (const d of r.dias) expect(d.refeicoes.map((x) => x.tipo)).toEqual(["almoco", "jantar"]);
  });

  it("respeita alergias e restrições (vegano, sem peixe/glúten)", () => {
    const ctx = ctxBase({ modo: "plant_based", alergenos: new Set(["gluten", "amendoim"]) });
    const r = gerarPlano({ dataInicio: "2026-10-01", dias: 7, alvo, refeicoes, ctx, seed: 7 });
    for (const d of r.dias)
      for (const ref of d.refeicoes)
        for (const i of ref.itens) {
          const f = FOOD_MAP[i.food];
          expect(f.tags.includes("vegano"), `${ref.receitaId}:${i.food}`).toBe(true);
          expect(f.alergenos.includes("gluten") || f.alergenos.includes("amendoim"), i.food).toBe(false);
        }
  });

  it("modo japonês 31 dias: variedade e sódio controlado", () => {
    const r = gerarPlano({ dataInicio: "2026-10-01", dias: 31, alvo, refeicoes, ctx: ctxBase({ modo: "japonesa", repeticao: "baixa" }), seed: 10 });
    expect(r.dias).toHaveLength(31);
    const principais = new Set(r.dias.flatMap((d) => d.refeicoes.filter((x) => x.tipo === "almoco" || x.tipo === "jantar").map((x) => x.receitaId)));
    expect(principais.size).toBeGreaterThanOrEqual(8);
    // nenhuma receita principal domina o mês
    const cont = new Map<string, number>();
    for (const d of r.dias) for (const x of d.refeicoes) if (x.tipo === "almoco" || x.tipo === "jantar") cont.set(x.receitaId!, (cont.get(x.receitaId!) ?? 0) + 1);
    expect(Math.max(...cont.values()), "variedade").toBeLessThanOrEqual(12);
    const acimaSodio = r.dias.filter((d) => macrosDia(d).na > 2000).length;
    expect(acimaSodio).toBeLessThanOrEqual(3);
    const japonesas = r.dias.flatMap((d) => d.refeicoes).filter((x) => RECIPE_MAP[x.receitaId!].modos.includes("japonesa")).length;
    expect(japonesas / r.dias.flatMap((d) => d.refeicoes).length).toBeGreaterThan(0.6);
  });

  it("desafio japonês com orçamento e intolerância mantém variedade", () => {
    const ctx = ctxBase({ modo: "japonesa", repeticao: "media", orcamentoDiario: 21, alergenos: new Set(["lactose", "amendoim"]) });
    const r = gerarPlano({ dataInicio: "2026-10-01", dias: 31, alvo: { kcal: 2090, p: 110 }, refeicoes: [{ tipo: "almoco" }, { tipo: "lanche" }, { tipo: "jantar" }], ctx, seed: 21 });
    const distintas = new Set(r.dias.flatMap((d) => d.refeicoes.filter((x) => x.tipo !== "lanche").map((x) => x.receitaId)));
    expect(distintas.size).toBeGreaterThanOrEqual(6);
    // regra de aderência: nenhuma receita principal mais de 3× em qualquer janela de 7 dias (tolerância de 1 por ajustes de segurança)
    for (let i = 0; i + 7 <= r.dias.length; i++) {
      const cont = new Map<string, number>();
      for (const d of r.dias.slice(i, i + 7)) for (const x of d.refeicoes) if (x.tipo !== "lanche") cont.set(x.receitaId!, (cont.get(x.receitaId!) ?? 0) + 1);
      expect(Math.max(...cont.values()), `janela ${i}`).toBeLessThanOrEqual(4);
    }
  });

  it("orçamento diário reduz custo", () => {
    const livre = gerarPlano({ dataInicio: "2026-10-01", dias: 7, alvo, refeicoes, ctx: ctxBase(), seed: 3 });
    const barato = gerarPlano({ dataInicio: "2026-10-01", dias: 7, alvo, refeicoes, ctx: ctxBase({ orcamentoDiario: 14 }), seed: 3 });
    expect(barato.media.custo).toBeLessThanOrEqual(livre.media.custo + 0.01);
  });
});

describe("trocas", () => {
  const plano = gerarPlano({ dataInicio: "2026-10-01", dias: 1, alvo: { kcal: 2000, p: 110 }, refeicoes: [{ tipo: "almoco" }, { tipo: "jantar" }], ctx: ctxBase(), seed: 5 });
  const almoco = plano.dias[0].refeicoes[0];

  it("troca de alimento mantém equivalência aproximada", () => {
    const prot = almoco.itens.find((i) => i.papel === "proteina")!;
    const ops = opcoesTrocaAlimento(prot, ctxBase());
    expect(ops.length).toBeGreaterThan(0);
    const pOrig = macrosItens([prot]).p;
    const pNovo = macrosItens([ops[0].item]).p;
    expect(Math.abs(pNovo - pOrig)).toBeLessThan(Math.max(6, pOrig * 0.3));
    expect(ops[0].diferencas.length).toBeGreaterThan(0);
  });

  it("troca de refeição por opção mais barata", () => {
    const ops = opcoesTrocaRefeicao(almoco, ctxBase(), "barato", (id) => ({ nome: RECIPE_MAP[id].nome, tempo: RECIPE_MAP[id].tempo }));
    const custoAtual = macrosItens(almoco.itens).custo;
    const mA = macrosItens(almoco.itens);
    for (const o of ops) {
      const m = macrosItens(o.refeicao.itens);
      expect(m.custo).toBeLessThan(custoAtual);
      expect(m.p, "troca mais barata preserva a proteína").toBeGreaterThanOrEqual(mA.p * 0.85);
      expect(Math.abs(m.kcal - mA.kcal)).toBeLessThanOrEqual(mA.kcal * 0.12);
    }
  });

  it("mais fome aumenta energia; menos fome preserva proteína", () => {
    const k0 = macrosItens(almoco.itens);
    const mais = macrosItens(ajustarFomeRefeicao(almoco, "mais").itens);
    const menos = macrosItens(ajustarFomeRefeicao(almoco, "menos").itens);
    expect(mais.kcal).toBeGreaterThan(k0.kcal);
    expect(menos.kcal).toBeLessThan(k0.kcal);
    expect(menos.p).toBeGreaterThan(k0.p * 0.85);
  });
});

describe("compras", () => {
  it("soma quantidades e converte cozido → cru", () => {
    const l = montarLista([{ food: "arroz-branco", g: 250 }, { food: "arroz-branco", g: 250 }, { food: "ovo", g: 100 }]);
    const arroz = l.find((i) => i.food_id === "arroz-branco")!;
    expect(arroz.quantidade_g).toBe(200); // 500 g cozido / 2,5
    expect(l.find((i) => i.food_id === "ovo")!.quantidade_texto).toMatch(/2 unidades/);
    const l2 = adicionarItens(l, [{ food: "ovo", g: 50 }]);
    expect(l2.find((i) => i.food_id === "ovo")!.quantidade_g).toBe(150);
    expect(totalLista(l2)).toBeGreaterThan(0);
  });
});

describe("revisão e associações", () => {
  it("com poucos dados, mantém o plano", () => {
    const r = revisar("perda_peso", [{ data: "2026-10-01", peso: 80 }, { data: "2026-10-03", peso: 79.8 }], [], []);
    expect(r.dadosSuficientes).toBe(false);
    expect(r.ajustes[0].tipo).toBe("manter");
  });
  it("perda rápida sugere aumentar energia", () => {
    const t = [0, 4, 8, 12, 14].map((d, i) => ({ data: `2026-10-${String(1 + d).padStart(2, "0")}`, peso: 80 - i * 0.9, adesao: 90 }));
    const r = revisar("perda_peso", t, [], []);
    expect(r.ajustes.some((a) => a.id === "mais_energia")).toBe(true);
  });
  it("associação alimento-sintoma exige repetição", () => {
    const refs = [] as { data: string; hora: string; descricao: string }[];
    const sint = [] as { data: string; hora: string; sintoma: string }[];
    for (let d = 1; d <= 10; d++) {
      const data = `2026-10-${String(d).padStart(2, "0")}`;
      refs.push({ data, hora: "12:00", descricao: d % 2 ? "arroz feijão e leite" : "arroz feijão frango" });
      if (d % 2) sint.push({ data, hora: "15:00", sintoma: "Inchaço abdominal" });
    }
    const a = associacoes(refs, sint);
    expect(a.some((x) => x.alimento === "leite")).toBe(true);
    expect(a.some((x) => x.alimento === "arroz")).toBe(false);
  });
});

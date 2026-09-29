import type { NivelAtividade, Objetivo, Sexo } from "@/lib/types";

export interface ExercicioInput {
  tipo: string;
  frequencia: number; // vezes/semana
  duracao: number; // minutos
  intensidade: "leve" | "moderada" | "intensa";
}

export interface PerfilCalculo {
  sexo: Sexo;
  idade: number;
  altura: number; // cm
  peso: number; // kg
  nivelAtividade: NivelAtividade;
  exercicios: ExercicioInput[];
  objetivo: Objetivo;
  metaPeso?: number | null;
  prazo?: string | null; // YYYY-MM-DD
  altaProteina?: boolean;
  padraoVegetal?: boolean;
}

export interface RestricoesCalculo {
  semDeficit: boolean; // gestação, baixo peso, transtorno alimentar, <18 anos...
  proteinaMaxGkg?: number; // ex.: doença renal => 0,8 até avaliação
  restricaoHidrica: boolean; // insuficiência cardíaca/renal => não recomendar volume
  motivos: string[];
}

export interface Faixa {
  min: number;
  max: number;
}

export interface ResultadoCalculo {
  imc: number;
  classificacaoImc: string;
  pesoReferencia: number;
  pesoReferenciaAjustado: boolean;
  tmb: { mifflin: number; harrisBenedict: number; central: number; faixa: Faixa };
  pal: { valor: number; categoria: string };
  gastoExercicio: number;
  get: { central: number; faixa: Faixa };
  meta: {
    kcal: number;
    faixa: Faixa;
    ajuste: number; // negativo = déficit
    piso: number;
    descricao: string;
  };
  proteina: { g: number; gPorKg: number; faixaGkg: Faixa; percentual: number };
  gordura: { g: number; percentual: number };
  carboidrato: { g: number; percentual: number };
  fibra: { g: number };
  agua: { ml: number | null; faixa: Faixa | null };
  sodioMaxMg: number;
  acucarLivreMaxG: number;
  ritmoEstimadoKgSemana: number | null;
  metaAgressiva: boolean;
  formulas: string[];
  observacoes: string[];
}

const PAL: Record<NivelAtividade, { valor: number; categoria: string }> = {
  sedentario: { valor: 1.4, categoria: "Sedentário (PAL 1,40)" },
  leve: { valor: 1.55, categoria: "Levemente ativo (PAL 1,55)" },
  moderado: { valor: 1.7, categoria: "Moderadamente ativo (PAL 1,70)" },
  ativo: { valor: 1.85, categoria: "Ativo (PAL 1,85)" },
  muito_ativo: { valor: 2.0, categoria: "Muito ativo (PAL 2,00)" },
};

const MET: Record<ExercicioInput["intensidade"], number> = { leve: 3.5, moderada: 5.5, intensa: 8 };

export const round = (n: number, step = 1) => Math.round(n / step) * step;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export function idadeDe(dataNascimento: string, hoje = new Date()): number {
  const d = new Date(dataNascimento + "T12:00:00");
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--;
  return idade;
}

export function imcDe(peso: number, alturaCm: number) {
  const h = alturaCm / 100;
  return peso / (h * h);
}

export function classificarImc(imc: number): string {
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Faixa de referência";
  if (imc < 30) return "Sobrepeso";
  if (imc < 35) return "Obesidade grau I";
  if (imc < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

export function tmbMifflin(sexo: Sexo, peso: number, altura: number, idade: number): number {
  const base = 10 * peso + 6.25 * altura - 5 * idade;
  if (sexo === "masculino") return base + 5;
  if (sexo === "feminino") return base - 161;
  return base - 78; // média das constantes quando o sexo não é informado
}

export function tmbHarrisBenedict(sexo: Sexo, peso: number, altura: number, idade: number): number {
  const m = 88.362 + 13.397 * peso + 4.799 * altura - 5.677 * idade;
  const f = 447.593 + 9.247 * peso + 3.098 * altura - 4.33 * idade;
  if (sexo === "masculino") return m;
  if (sexo === "feminino") return f;
  return (m + f) / 2;
}

export function gastoExercicioDiario(exercicios: ExercicioInput[], peso: number): number {
  // kcal líquidas (MET − 1) × 3,5 × peso / 200 por minuto, média diária na semana
  const semanal = exercicios.reduce((acc, e) => {
    const kcalMin = ((MET[e.intensidade] - 1) * 3.5 * peso) / 200;
    return acc + kcalMin * (e.duracao || 0) * (e.frequencia || 0);
  }, 0);
  return semanal / 7;
}

export function calcular(p: PerfilCalculo, r: RestricoesCalculo = { semDeficit: false, restricaoHidrica: false, motivos: [] }): ResultadoCalculo {
  const formulas: string[] = [];
  const obs: string[] = [];

  const imc = imcDe(p.peso, p.altura);
  const mif = tmbMifflin(p.sexo, p.peso, p.altura, p.idade);
  const hb = tmbHarrisBenedict(p.sexo, p.peso, p.altura, p.idade);
  formulas.push("TMB: Mifflin-St Jeor (1990) — estimativa principal");
  formulas.push("TMB: Harris-Benedict revisada (Roza & Shizgal, 1984) — segunda estimativa para compor a faixa");
  if (p.sexo === "outro") obs.push("Sexo não binário/não informado: usamos a média das equações masculina e feminina; a incerteza é maior.");

  const pal = PAL[p.nivelAtividade];
  formulas.push(`Gasto diário: TMB × PAL (FAO/OMS/UNU, 2004) + gasto de exercícios (METs)`);
  const ex = gastoExercicioDiario(p.exercicios, p.peso);

  const getCentral = mif * pal.valor + ex;
  const getMin = Math.min(mif, hb) * (pal.valor - 0.1) + ex * 0.8;
  const getMax = Math.max(mif, hb) * (pal.valor + 0.1) + ex * 1.1;

  // piso de segurança: não ficar abaixo da TMB estimada nem de valores mínimos usuais em diretrizes
  const pisoAbs = p.sexo === "masculino" ? 1500 : p.sexo === "feminino" ? 1200 : 1350;
  const piso = Math.max(pisoAbs, mif);

  let ajuste = 0;
  let descricao = "Manutenção do peso (necessidade energética estimada)";
  let metaAgressiva = false;

  if (p.objetivo === "perda_peso") {
    if (r.semDeficit) {
      descricao = "Déficit calórico não aplicado por segurança: " + r.motivos.join("; ");
    } else {
      const deficitMax = imc < 25 ? Math.min(350, 0.15 * getCentral) : Math.min(500, 0.2 * getCentral);
      ajuste = -deficitMax;
      descricao = `Déficit moderado de ~${round(deficitMax, 10)} kcal/dia (limitado a 15–20% do gasto)`;
      formulas.push("Déficit: moderado, limitado a 15–20% do gasto (AHA/ACC/TOS 2013; perda de 0,5–1% do peso/semana)");
    }
  } else if (p.objetivo === "ganho_massa") {
    const sup = Math.min(350, 0.1 * getCentral);
    ajuste = sup;
    descricao = `Superávit leve de ~${round(sup, 10)} kcal/dia para ganho de massa`;
    const temForca = p.exercicios.some((e) => /muscula|forca|força|academia|crossfit|calist/i.test(e.tipo));
    if (!temForca) obs.push("Ganho de massa muscular depende de treino de força; sem ele, o superávit tende a virar gordura.");
  }

  let kcal = getCentral + ajuste;
  if (ajuste < 0 && kcal < piso) {
    obs.push(`A meta foi limitada ao piso de segurança (${round(piso, 10)} kcal).`);
    kcal = piso;
    ajuste = kcal - getCentral;
  }
  kcal = round(kcal, 10);

  // ritmo estimado e checagem de meta/prazo
  let ritmo: number | null = null;
  if (ajuste !== 0) ritmo = (ajuste * 7) / 7700; // aproximação inicial; o ritmo real desacelera (Hall 2011)
  if (p.objetivo === "perda_peso" && p.metaPeso && p.prazo) {
    const semanas = Math.max(1, (new Date(p.prazo).getTime() - Date.now()) / (7 * 864e5));
    const necessario = (p.peso - p.metaPeso) / semanas;
    if (necessario > p.peso * 0.01) {
      metaAgressiva = true;
      obs.push(
        `Para atingir ${String(p.metaPeso).replace(".", ",")} kg no prazo seria preciso perder ~${necessario.toFixed(1).replace(".", ",")} kg/semana, acima de 1% do peso por semana. Mantivemos um ritmo seguro — o prazo pode precisar ser ampliado.`,
      );
    }
  }

  // ---------------- Proteína ----------------
  let pesoRef = p.peso;
  let ajustado = false;
  if (imc >= 30) {
    const ideal = 25 * (p.altura / 100) ** 2;
    pesoRef = ideal + 0.25 * (p.peso - ideal);
    ajustado = true;
    formulas.push("Proteína calculada sobre peso de referência ajustado (IMC 25 + 25% do excedente) — hipótese de trabalho para IMC ≥ 30");
  }

  let faixaG: Faixa;
  switch (p.objetivo) {
    case "perda_peso":
      faixaG = { min: 1.2, max: 1.6 };
      break;
    case "ganho_massa":
      faixaG = { min: 1.6, max: 2.0 };
      break;
    case "performance":
      faixaG = { min: 1.4, max: 1.8 };
      break;
    default:
      faixaG = { min: 1.0, max: 1.2 };
  }
  if (p.idade >= 65) faixaG = { min: Math.max(faixaG.min, 1.0), max: Math.max(faixaG.max, 1.2) };
  let gkg = p.altaProteina ? faixaG.max : (faixaG.min + faixaG.max) / 2;
  if (p.altaProteina && faixaG.max < 1.6) {
    gkg = 1.6;
    faixaG = { ...faixaG, max: 1.6 };
  }
  if (r.proteinaMaxGkg !== undefined && gkg > r.proteinaMaxGkg) {
    gkg = r.proteinaMaxGkg;
    faixaG = { min: Math.min(faixaG.min, r.proteinaMaxGkg), max: r.proteinaMaxGkg };
    obs.push(`Proteína limitada a ${r.proteinaMaxGkg} g/kg até validação com profissional de saúde.`);
  }
  let protG = gkg * pesoRef;
  if ((protG * 4) / kcal > 0.35) {
    protG = (0.35 * kcal) / 4;
    gkg = protG / pesoRef;
  }
  protG = round(protG);

  // ---------------- Gordura / carboidrato ----------------
  const gordPct = p.padraoVegetal ? 0.3 : 0.28;
  const gordG = round((kcal * gordPct) / 9);
  const carbG = round(Math.max(0, (kcal - protG * 4 - gordG * 9) / 4));
  const carbPct = (carbG * 4) / kcal;
  if (carbPct < 0.4) obs.push("Com a proteína priorizada, os carboidratos ficaram abaixo de 40% da energia — ainda compatível com uma alimentação equilibrada, mas vale observar energia e desempenho.");
  formulas.push("Distribuição: gordura 28–30% da energia (AMDR 20–35%), carboidratos pelo restante (IOM 2005)");

  // ---------------- Fibra, água, sódio, açúcar ----------------
  const fibra = round(Math.max(25, (14 * kcal) / 1000));
  formulas.push("Fibras: 14 g/1000 kcal, mínimo 25 g (IOM 2005; Reynolds et al., 2019)");

  let agua: number | null = null;
  let aguaFaixa: Faixa | null = null;
  if (r.restricaoHidrica) {
    obs.push("Hidratação: siga a orientação da sua equipe de saúde — não calculamos volume por haver condição que pode exigir controle de líquidos.");
  } else {
    const treinoH = p.exercicios.reduce((a, e) => a + (e.frequencia * e.duracao) / 60, 0) / 7;
    agua = round(35 * p.peso + 500 * treinoH, 50);
    aguaFaixa = { min: round(30 * p.peso, 50), max: round(40 * p.peso + 500 * treinoH, 50) };
    formulas.push("Água: ~35 ml/kg/dia + ~500 ml por hora de exercício (faixa de referência; EFSA 2010 como verificação)");
  }

  return {
    imc: Math.round(imc * 10) / 10,
    classificacaoImc: classificarImc(imc),
    pesoReferencia: Math.round(pesoRef * 10) / 10,
    pesoReferenciaAjustado: ajustado,
    tmb: { mifflin: round(mif), harrisBenedict: round(hb), central: round(mif), faixa: { min: round(Math.min(mif, hb)), max: round(Math.max(mif, hb)) } },
    pal,
    gastoExercicio: round(ex),
    get: { central: round(getCentral, 10), faixa: { min: round(getMin, 10), max: round(getMax, 10) } },
    meta: {
      kcal,
      faixa: { min: round(kcal * 0.95, 10), max: round(kcal * 1.05, 10) },
      ajuste: round(ajuste),
      piso: round(piso, 10),
      descricao,
    },
    proteina: { g: protG, gPorKg: Math.round(gkg * 100) / 100, faixaGkg: faixaG, percentual: Math.round(((protG * 4) / kcal) * 100) },
    gordura: { g: gordG, percentual: Math.round(gordPct * 100) },
    carboidrato: { g: carbG, percentual: Math.round(carbPct * 100) },
    fibra: { g: fibra },
    agua: { ml: agua, faixa: aguaFaixa },
    sodioMaxMg: 2000,
    acucarLivreMaxG: round((kcal * 0.1) / 4),
    ritmoEstimadoKgSemana: ritmo === null ? null : Math.round(ritmo * 100) / 100,
    metaAgressiva,
    formulas,
    observacoes: obs,
  };
}

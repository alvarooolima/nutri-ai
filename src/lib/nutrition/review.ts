import { normalizar } from "./safety";

export interface RegistroTracking {
  data: string;
  peso?: number | null;
  cintura?: number | null;
  fome?: number | null;
  saciedade?: number | null;
  energia?: number | null;
  sono?: number | null;
  adesao?: number | null;
  exercicio_min?: number | null;
  digestao?: number | null;
}

export interface RegistroSintoma {
  data: string;
  hora?: string | null;
  sintoma: string;
  intensidade?: number | null;
}

export interface RegistroRefeicao {
  data: string;
  hora?: string | null;
  descricao?: string | null;
  seguiu_plano?: string | null;
}

export interface Ajuste {
  id: string;
  tipo: "energia" | "estrutura" | "fome" | "manter" | "profissional";
  descricao: string;
  motivo: string;
  deltaKcal?: number;
}

export interface Revisao {
  dadosSuficientes: boolean;
  aconteceu: string[];
  funcionou: string[];
  naoFuncionou: string[];
  ajustes: Ajuste[];
  metricas: {
    registros: number;
    pesoInicio?: number;
    pesoFim?: number;
    tendenciaKgSemana?: number;
    adesaoMedia?: number;
    fomeMedia?: number;
    energiaMedia?: number;
    sonoMedia?: number;
    sintomas: number;
  };
}

const br = (n: number, casas: number) => n.toFixed(casas).replace(".", ",");

const media = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
};

/** Regressão linear simples: kg por dia */
export function tendencia(pontos: { data: string; peso: number }[]): number | undefined {
  if (pontos.length < 2) return undefined;
  const t0 = new Date(pontos[0].data).getTime();
  const xs = pontos.map((p) => (new Date(p.data).getTime() - t0) / 864e5);
  const ys = pontos.map((p) => p.peso);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  return den === 0 ? undefined : num / den;
}

export function revisar(objetivo: string, tracking: RegistroTracking[], sintomas: RegistroSintoma[], refeicoes: RegistroRefeicao[]): Revisao {
  const ord = [...tracking].sort((a, b) => a.data.localeCompare(b.data));
  const pesos = ord.filter((t) => typeof t.peso === "number").map((t) => ({ data: t.data, peso: Number(t.peso) }));
  const span = pesos.length >= 2 ? (new Date(pesos[pesos.length - 1].data).getTime() - new Date(pesos[0].data).getTime()) / 864e5 : 0;
  const incl = tendencia(pesos);
  const kgSemana = incl !== undefined ? incl * 7 : undefined;
  const pesoRef = pesos.length ? pesos[pesos.length - 1].peso : undefined;
  const pctSemana = kgSemana !== undefined && pesoRef ? (kgSemana / pesoRef) * 100 : undefined;

  const adesaoRegs = [...ord.map((t) => t.adesao), ...refeicoes.map((r) => (r.seguiu_plano === "sim" ? 100 : r.seguiu_plano === "parcial" ? 60 : r.seguiu_plano === "nao" ? 0 : null))];
  const adesao = media(adesaoRegs);
  const fome = media(ord.map((t) => t.fome));
  const energia = media(ord.map((t) => t.energia));
  const sono = media(ord.map((t) => t.sono));

  const dadosSuficientes = pesos.length >= 4 && span >= 10;
  const aconteceu: string[] = [];
  const funcionou: string[] = [];
  const nao: string[] = [];
  const ajustes: Ajuste[] = [];

  aconteceu.push(`${ord.length} dias com registros de acompanhamento, ${refeicoes.length} refeições e ${sintomas.length} sintomas registrados.`);
  if (pesos.length >= 2) aconteceu.push(`Peso: ${br(pesos[0].peso, 1)} kg → ${br(pesos[pesos.length - 1].peso, 1)} kg (tendência de ${kgSemana! >= 0 ? "+" : "−"}${br(Math.abs(kgSemana!), 2)} kg/semana).`);
  if (adesao !== undefined) aconteceu.push(`Adesão média estimada: ${Math.round(adesao)}%.`);

  if (adesao !== undefined) (adesao >= 70 ? funcionou : nao).push(adesao >= 70 ? "Você conseguiu seguir boa parte do plano." : "O plano foi difícil de seguir em vários momentos — isso é informação, não fracasso.");
  if (energia !== undefined) (energia >= 3.5 ? funcionou : energia < 2.5 ? nao : funcionou).push(energia >= 3.5 ? "Energia boa na maior parte dos dias." : energia < 2.5 ? "Energia baixa em muitos dias." : "Energia estável.");
  if (fome !== undefined && fome >= 4) nao.push("Fome alta com frequência.");
  else if (fome !== undefined) funcionou.push("Fome sob controle na maior parte dos dias.");
  if (sono !== undefined && sono < 2.5) nao.push("Sono de baixa qualidade — isso afeta fome e energia.");
  if (dadosSuficientes && pctSemana !== undefined && pctSemana < -1.2) nao.push(`A perda de peso está rápida (~${br(Math.abs(pctSemana), 1)}% por semana) — ritmos assim tendem a custar massa muscular e energia.`);

  if (!dadosSuficientes) {
    ajustes.push({ id: "manter", tipo: "manter", descricao: "Manter o plano atual e continuar registrando.", motivo: "Ainda há poucos dados (precisamos de ao menos 4 pesagens em 10 dias ou mais) para mudar calorias com segurança." });
  } else {
    if (objetivo === "perda_peso" && pctSemana !== undefined) {
      if (pctSemana < -1.2) ajustes.push({ id: "mais_energia", tipo: "energia", deltaKcal: 150, descricao: "Aumentar cerca de 150 kcal/dia.", motivo: `A perda está em ~${br(Math.abs(pctSemana), 1)}% do peso por semana, acima do ritmo recomendado.` });
      else if (pctSemana > -0.15 && (adesao ?? 0) >= 70) ajustes.push({ id: "menos_energia", tipo: "energia", deltaKcal: -120, descricao: "Reduzir cerca de 120 kcal/dia.", motivo: "Peso estável há 10+ dias com boa adesão; um ajuste pequeno é suficiente." });
    }
    if (objetivo === "ganho_massa" && kgSemana !== undefined && kgSemana < 0.05 && (adesao ?? 0) >= 70)
      ajustes.push({ id: "mais_energia_ganho", tipo: "energia", deltaKcal: 150, descricao: "Aumentar cerca de 150 kcal/dia.", motivo: "Peso estável mesmo com boa adesão ao plano." });
    if (objetivo === "manutencao" && kgSemana !== undefined && Math.abs(kgSemana) > 0.3)
      ajustes.push({ id: "reequilibrar", tipo: "energia", deltaKcal: kgSemana > 0 ? -100 : 100, descricao: `${kgSemana > 0 ? "Reduzir" : "Aumentar"} cerca de 100 kcal/dia.`, motivo: "O peso está variando mais do que o esperado para manutenção." });
  }
  if (adesao !== undefined && adesao < 60)
    ajustes.push({ id: "simplificar", tipo: "estrutura", descricao: "Simplificar: mais repetição de refeições, receitas mais rápidas e opções de marmita.", motivo: "Quando a adesão está baixa, ajustar a praticidade costuma funcionar melhor do que cortar calorias." });
  if (fome !== undefined && fome >= 4)
    ajustes.push({ id: "fome", tipo: "fome", descricao: "Redistribuir: mais vegetais e proteína nas refeições principais e um lanche com fibras.", motivo: "Fome alta frequente; aumentar volume e proteína ajuda na saciedade." });
  if (energia !== undefined && energia < 2.5)
    ajustes.push({ id: "energia", tipo: "profissional", descricao: "Observe sono, hidratação e carboidratos perto dos treinos. Se o cansaço persistir, converse com um médico.", motivo: "Energia baixa persistente pode ter várias causas além da alimentação." });
  if (!ajustes.length) ajustes.push({ id: "manter_ok", tipo: "manter", descricao: "Manter o plano — está funcionando.", motivo: "Os indicadores estão dentro do esperado." });

  return {
    dadosSuficientes,
    aconteceu,
    funcionou,
    naoFuncionou: nao,
    ajustes,
    metricas: {
      registros: ord.length,
      pesoInicio: pesos[0]?.peso,
      pesoFim: pesos[pesos.length - 1]?.peso,
      tendenciaKgSemana: kgSemana !== undefined ? Math.round(kgSemana * 100) / 100 : undefined,
      adesaoMedia: adesao !== undefined ? Math.round(adesao) : undefined,
      fomeMedia: fome,
      energiaMedia: energia,
      sonoMedia: sono,
      sintomas: sintomas.length,
    },
  };
}

export interface Associacao {
  sintoma: string;
  alimento: string;
  ocorrencias: number;
  totalSintoma: number;
  taxaComAlimento: number;
  taxaBase: number;
}

const PALAVRAS_IGNORAR = new Set(["com", "de", "da", "do", "e", "a", "o", "no", "na", "um", "uma", "para", "sem", "meu", "minha", "cafe", "almoco", "jantar", "lanche"]);

/**
 * Procura alimentos que aparecem com mais frequência nas 24 h antes de um sintoma
 * do que no restante dos registros. Resultado é apenas associação — nunca causalidade.
 */
export function associacoes(refeicoes: RegistroRefeicao[], sintomas: RegistroSintoma[], minOcorrencias = 3): Associacao[] {
  if (sintomas.length < minOcorrencias || refeicoes.length < 5) return [];
  const tokens = (s?: string | null) =>
    new Set(
      normalizar(s ?? "")
        .split(/[^a-z]+/)
        .filter((w) => w.length > 2 && !PALAVRAS_IGNORAR.has(w)),
    );
  const ts = (d: string, h?: string | null) => new Date(`${d}T${h ?? "12:00"}`).getTime();
  const refs = refeicoes.map((r) => ({ t: ts(r.data, r.hora), tok: tokens(r.descricao) }));
  const freqGeral = new Map<string, number>();
  for (const r of refs) for (const w of r.tok) freqGeral.set(w, (freqGeral.get(w) ?? 0) + 1);

  const porSintoma = new Map<string, RegistroSintoma[]>();
  for (const s of sintomas) porSintoma.set(s.sintoma, [...(porSintoma.get(s.sintoma) ?? []), s]);

  const out: Associacao[] = [];
  for (const [sint, lista] of porSintoma) {
    if (lista.length < minOcorrencias) continue;
    const cont = new Map<string, number>();
    for (const s of lista) {
      const t = ts(s.data, s.hora);
      const antes = new Set<string>();
      for (const r of refs) if (r.t <= t && t - r.t <= 24 * 3600e3) for (const w of r.tok) antes.add(w);
      for (const w of antes) cont.set(w, (cont.get(w) ?? 0) + 1);
    }
    for (const [w, n] of cont) {
      const taxa = n / lista.length;
      const base = (freqGeral.get(w) ?? 0) / refs.length;
      if (n >= minOcorrencias && taxa >= 0.6 && taxa > base * 1.5) out.push({ sintoma: sint, alimento: w, ocorrencias: n, totalSintoma: lista.length, taxaComAlimento: taxa, taxaBase: base });
    }
  }
  return out.sort((a, b) => b.taxaComAlimento - a.taxaComAlimento).slice(0, 8);
}

export const AVISO_ASSOCIACAO = "Foi observada uma associação nos seus registros. Isso não prova causalidade.";

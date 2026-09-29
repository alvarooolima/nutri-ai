import type { Alergeno, Restricao } from "@/lib/types";
import type { RestricoesCalculo } from "./calc";

export interface PerfilSaude {
  condicoes: string[];
  condicoesTexto?: string;
  cirurgias?: string;
  internacoes?: string;
  sintomas: string[];
  sintomasTexto?: string;
  alergias: Alergeno[];
  alergiasTexto?: string;
  anafilaxia?: boolean;
  intolerancias: Alergeno[];
  restricoes: Restricao[];
  exames?: string;
  orientacoes?: string;
  observacoes?: string;
}

export interface Medicamento {
  nome: string;
  dose?: string;
}

export interface ContextoSeguranca {
  idade: number;
  imc: number;
  objetivo: string;
  modo: string;
  saude: PerfilSaude;
  medicamentos: Medicamento[];
  suplementos: Medicamento[];
  alcoolDosesSemana?: number;
  perdaPesoSemanalPct?: number | null; // a partir dos registros
  sintomasRegistrados?: string[]; // do diário
  metaAgressiva?: boolean;
}

export type Gravidade = "info" | "atencao" | "importante";

export interface Alerta {
  regra: string;
  tipo: string;
  gravidade: Gravidade;
  mensagem: string;
  acao_recomendada: string;
}

export interface AvaliacaoSeguranca {
  alertas: Alerta[];
  bloqueios: string[]; // motivos que impedem gerar plano automaticamente
  restricoesCalculo: RestricoesCalculo;
  consideradas: string[]; // informações consideradas
  validarComProfissional: string[];
  esconderCalorias: boolean;
}

export const CONDICOES: { id: string; nome: string }[] = [
  { id: "diabetes_tipo1", nome: "Diabetes tipo 1" },
  { id: "diabetes_tipo2", nome: "Diabetes tipo 2" },
  { id: "pre_diabetes", nome: "Pré-diabetes / resistência à insulina" },
  { id: "hipertensao", nome: "Hipertensão" },
  { id: "dislipidemia", nome: "Colesterol/triglicérides alterados" },
  { id: "doenca_renal", nome: "Doença renal" },
  { id: "doenca_hepatica", nome: "Doença hepática" },
  { id: "doenca_cardiaca", nome: "Doença cardíaca" },
  { id: "insuficiencia_cardiaca", nome: "Insuficiência cardíaca" },
  { id: "hipotireoidismo", nome: "Hipotireoidismo" },
  { id: "hipertireoidismo", nome: "Hipertireoidismo" },
  { id: "doenca_celiaca", nome: "Doença celíaca" },
  { id: "sii", nome: "Síndrome do intestino irritável" },
  { id: "dii", nome: "Doença inflamatória intestinal (Crohn/retocolite)" },
  { id: "refluxo", nome: "Refluxo / gastrite" },
  { id: "gota", nome: "Gota / ácido úrico alto" },
  { id: "anemia", nome: "Anemia" },
  { id: "osteoporose", nome: "Osteoporose" },
  { id: "sop", nome: "Síndrome dos ovários policísticos" },
  { id: "cancer_tratamento", nome: "Câncer em tratamento" },
  { id: "transtorno_alimentar", nome: "Transtorno alimentar (atual ou anterior)" },
  { id: "gestante", nome: "Gestação" },
  { id: "lactante", nome: "Amamentação" },
  { id: "cirurgia_bariatrica", nome: "Cirurgia bariátrica" },
];

export const SINTOMAS_ALERTA: { id: string; nome: string }[] = [
  { id: "sangue_fezes", nome: "Sangue nas fezes ou fezes escuras" },
  { id: "perda_peso_involuntaria", nome: "Perda de peso sem intenção" },
  { id: "dificuldade_engolir", nome: "Dificuldade para engolir" },
  { id: "vomitos_persistentes", nome: "Vômitos persistentes" },
  { id: "dor_peito", nome: "Dor no peito" },
  { id: "desmaios", nome: "Desmaios ou tonturas frequentes" },
  { id: "sede_excessiva", nome: "Sede e urina excessivas" },
  { id: "dor_abdominal_intensa", nome: "Dor abdominal intensa ou persistente" },
];

export const SINTOMAS_COMUNS = ["Inchaço abdominal", "Gases", "Azia", "Diarreia", "Constipação", "Náusea", "Dor de cabeça", "Cansaço", "Refluxo", "Cólica"];

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const MED_GRUPOS: { id: string; termos: string[] }[] = [
  { id: "insulina_secretagogo", termos: ["insulina", "glargina", "lantus", "novorapid", "humalog", "tresiba", "nph", "glibenclamida", "gliclazida", "glimepirida", "diamicron", "amaryl", "daonil"] },
  { id: "varfarina", termos: ["varfarina", "warfarina", "marevan", "coumadin"] },
  { id: "imao", termos: ["tranilcipromina", "parnate", "fenelzina", "selegilina", "moclobemida", "linezolida", "rasagilina"] },
  { id: "levotiroxina", termos: ["levotiroxina", "puran", "synthroid", "euthyrox", "levoid"] },
  { id: "litio", termos: ["litio", "carbolitium", "carbonato de litio"] },
  { id: "glp1", termos: ["semaglutida", "ozempic", "wegovy", "rybelsus", "liraglutida", "saxenda", "victoza", "tirzepatida", "mounjaro", "dulaglutida", "trulicity"] },
  { id: "poupador_potassio", termos: ["espironolactona", "aldactone", "enalapril", "captopril", "losartana", "valsartana", "lisinopril", "ramipril", "amilorida"] },
  { id: "diuretico", termos: ["furosemida", "lasix", "hidroclorotiazida", "clortalidona", "indapamida"] },
  { id: "metformina", termos: ["metformina", "glifage", "glucoformin"] },
  { id: "corticoide", termos: ["prednisona", "prednisolona", "dexametasona", "meticorten", "betametasona"] },
];

export function gruposMedicamento(meds: Medicamento[]): Set<string> {
  const out = new Set<string>();
  for (const m of meds) {
    const n = normalizar(m.nome);
    for (const g of MED_GRUPOS) if (g.termos.some((t) => n.includes(t))) out.add(g.id);
  }
  return out;
}

export function avaliarSeguranca(ctx: ContextoSeguranca): AvaliacaoSeguranca {
  const alertas: Alerta[] = [];
  const bloqueios: string[] = [];
  const motivosSemDeficit: string[] = [];
  const validar: string[] = [];
  const consideradas: string[] = [];
  let proteinaMax: number | undefined;
  let restricaoHidrica = false;
  let esconderCalorias = false;
  const c = new Set(ctx.saude.condicoes);
  const meds = gruposMedicamento(ctx.medicamentos);
  const add = (a: Alerta) => alertas.push(a);

  consideradas.push(`Idade: ${ctx.idade} anos; IMC: ${ctx.imc.toFixed(1).replace(".", ",")}`);
  if (ctx.saude.condicoes.length) consideradas.push(`Condições informadas: ${ctx.saude.condicoes.map((id) => CONDICOES.find((x) => x.id === id)?.nome ?? id).join(", ")}`);
  if (ctx.medicamentos.length) consideradas.push(`Medicamentos informados: ${ctx.medicamentos.map((m) => m.nome).join(", ")} (o sistema nunca altera medicamentos)`);
  if (ctx.suplementos.length) consideradas.push(`Suplementos informados: ${ctx.suplementos.map((m) => m.nome).join(", ")} (não são ajustados pelo sistema)`);
  if (ctx.saude.alergias.length || ctx.saude.intolerancias.length)
    consideradas.push(`Alergias/intolerâncias excluídas do plano: ${[...ctx.saude.alergias, ...ctx.saude.intolerancias].join(", ")}`);
  if (ctx.saude.restricoes.length) consideradas.push(`Restrições alimentares: ${ctx.saude.restricoes.join(", ")}`);

  // ---------- idade ----------
  if (ctx.idade < 18) {
    bloqueios.push("Menores de 18 anos precisam de plano elaborado com acompanhamento de pediatra/nutricionista.");
    add({ regra: "menor_idade", tipo: "idade", gravidade: "importante", mensagem: "Para menores de 18 anos, o planejamento alimentar deve ser feito com acompanhamento profissional, pois as necessidades de crescimento são específicas.", acao_recomendada: "Procure um nutricionista ou pediatra. Você ainda pode usar o diário e as receitas." });
  } else if (ctx.idade >= 65) {
    add({ regra: "idoso", tipo: "idade", gravidade: "info", mensagem: "Após os 65 anos, a necessidade de proteína costuma ser maior para preservar músculos. O plano já considera isso.", acao_recomendada: "Se houver doença renal, perda de peso sem intenção ou dificuldade para mastigar, converse com seu médico." });
  }

  // ---------- gestação / amamentação ----------
  if (c.has("gestante") || c.has("lactante")) {
    motivosSemDeficit.push(c.has("gestante") ? "gestação" : "amamentação");
    add({ regra: "gestacao_lactacao", tipo: "condicao", gravidade: "importante", mensagem: "Na gestação e na amamentação as necessidades mudam e dietas restritivas não são indicadas. O plano não aplica déficit calórico.", acao_recomendada: "Valide o plano com seu obstetra ou nutricionista, incluindo suplementação (ex.: ácido fólico, ferro), que o sistema não prescreve." });
    validar.push("Necessidades de energia e micronutrientes na gestação/amamentação");
  }

  // ---------- IMC ----------
  if (ctx.imc < 17) {
    motivosSemDeficit.push("IMC muito baixo");
    esconderCalorias = true;
    add({ regra: "imc_muito_baixo", tipo: "peso", gravidade: "importante", mensagem: "Seu IMC está bem abaixo da faixa de referência. Não vamos propor redução de calorias.", acao_recomendada: "Recomendamos avaliação com médico e nutricionista." });
  } else if (ctx.imc < 18.5) {
    motivosSemDeficit.push("IMC abaixo de 18,5");
    add({ regra: "imc_baixo", tipo: "peso", gravidade: "atencao", mensagem: "Seu IMC está abaixo da faixa de referência, então o plano não aplica déficit calórico.", acao_recomendada: "Se a perda de peso não foi intencional, procure avaliação médica." });
  }
  if (ctx.objetivo === "perda_peso" && ctx.imc < 18.5) {
    add({ regra: "objetivo_incompativel", tipo: "objetivo", gravidade: "atencao", mensagem: "O objetivo de perder peso não é compatível com o IMC atual. O plano foca em qualidade alimentar e manutenção.", acao_recomendada: "Converse com um profissional sobre objetivos alternativos (composição corporal, saúde, desempenho)." });
  }

  // ---------- transtornos alimentares ----------
  if (c.has("transtorno_alimentar")) {
    motivosSemDeficit.push("histórico de transtorno alimentar");
    esconderCalorias = true;
    add({ regra: "transtorno_alimentar", tipo: "condicao", gravidade: "importante", mensagem: "Com histórico de transtorno alimentar, contagem de calorias e restrição podem ser prejudiciais. Ocultamos números de calorias e não aplicamos déficit.", acao_recomendada: "O ideal é seguir com acompanhamento de nutricionista e psicólogo/psiquiatra." });
    validar.push("Estratégia alimentar considerando o histórico de transtorno alimentar");
  }

  // ---------- diabetes ----------
  if (c.has("diabetes_tipo1") || meds.has("insulina_secretagogo")) {
    add({ regra: "hipoglicemia", tipo: "medicamento", gravidade: "importante", mensagem: "Você usa insulina ou medicamento que estimula a insulina. Mudanças em quantidade de carboidratos, horários ou jejum podem alterar a glicemia.", acao_recomendada: "Antes de iniciar o plano, alinhe com seu médico/endocrinologista. Não altere doses por conta própria. Monitore a glicemia conforme orientação." });
    validar.push("Distribuição de carboidratos e horários em relação ao tratamento do diabetes");
  } else if (c.has("diabetes_tipo2") || c.has("pre_diabetes")) {
    add({ regra: "diabetes", tipo: "condicao", gravidade: "atencao", mensagem: "Com diabetes ou pré-diabetes, a distribuição de carboidratos e a escolha de fontes com fibras fazem diferença. O plano prioriza carboidratos com fibras.", acao_recomendada: "Valide o plano com sua equipe de saúde e mantenha o acompanhamento dos exames." });
    validar.push("Carboidratos por refeição em relação ao controle glicêmico");
  }

  // ---------- rim ----------
  if (c.has("doenca_renal")) {
    proteinaMax = 0.8;
    restricaoHidrica = true;
    add({ regra: "doenca_renal", tipo: "condicao", gravidade: "importante", mensagem: "Na doença renal, proteína, potássio, fósforo, sódio e líquidos podem precisar de ajustes específicos conforme o estágio. Limitamos a proteína a 0,8 g/kg e não calculamos volume de água.", acao_recomendada: "Este plano deve ser validado por nefrologista ou nutricionista antes do uso." });
    validar.push("Proteína, potássio, fósforo e líquidos (doença renal)");
  }
  if (c.has("insuficiencia_cardiaca")) {
    restricaoHidrica = true;
    add({ regra: "insuficiencia_cardiaca", tipo: "condicao", gravidade: "importante", mensagem: "Na insuficiência cardíaca pode haver orientação específica de sódio e líquidos. Não calculamos meta de água.", acao_recomendada: "Siga a orientação do seu cardiologista quanto a líquidos e sal." });
    validar.push("Sódio e líquidos (insuficiência cardíaca)");
  }
  if (c.has("doenca_hepatica")) {
    add({ regra: "doenca_hepatica", tipo: "condicao", gravidade: "atencao", mensagem: "Doenças do fígado podem exigir ajustes de proteína, sódio e álcool.", acao_recomendada: "Valide o plano com seu médico." });
  }

  // ---------- medicamentos com interação alimentar ----------
  if (meds.has("varfarina")) {
    add({ regra: "varfarina", tipo: "medicamento", gravidade: "atencao", mensagem: "Quem usa varfarina deve manter o consumo de vitamina K (folhas verdes como couve, espinafre, brócolis) regular — sem grandes variações de um dia para o outro.", acao_recomendada: "Mantenha constância nas folhas verdes e avise seu médico antes de mudanças grandes na alimentação." });
  }
  if (meds.has("imao")) {
    add({ regra: "imao_tiramina", tipo: "medicamento", gravidade: "importante", mensagem: "Medicamentos do tipo IMAO interagem com alimentos ricos em tiramina (fermentados como missô e shoyu, queijos curados, embutidos).", acao_recomendada: "Confirme com seu médico antes de consumir fermentados. O modo japonês deve ser usado com cautela." });
    validar.push("Alimentos fermentados/tiramina (uso de IMAO)");
  }
  if (meds.has("levotiroxina")) {
    add({ regra: "levotiroxina", tipo: "medicamento", gravidade: "info", mensagem: "A absorção da levotiroxina pode ser afetada por café, soja, cálcio e ferro próximos ao horário da dose.", acao_recomendada: "Mantenha o intervalo orientado pelo seu médico entre o remédio e o café da manhã." });
  }
  if (meds.has("litio")) {
    add({ regra: "litio", tipo: "medicamento", gravidade: "atencao", mensagem: "O lítio é sensível a mudanças bruscas de sódio e hidratação.", acao_recomendada: "Evite mudanças grandes no sal e na ingestão de água sem falar com seu psiquiatra." });
  }
  if (meds.has("glp1")) {
    add({ regra: "glp1", tipo: "medicamento", gravidade: "info", mensagem: "Com medicamentos como semaglutida/tirzepatida, o apetite costuma diminuir. Priorizar proteína, hidratação e porções menores ajuda a preservar massa muscular e tolerância.", acao_recomendada: "Acompanhe com seu médico; relate náuseas ou vômitos persistentes." });
  }
  if (meds.has("poupador_potassio")) {
    add({ regra: "potassio", tipo: "medicamento", gravidade: "info", mensagem: "Alguns remédios de pressão elevam o potássio. Sal \"light\" (cloreto de potássio) e suplementos de potássio podem não ser adequados.", acao_recomendada: "Confirme com seu médico antes de usar sal light ou suplementos de potássio." });
  }
  if (meds.has("metformina")) {
    add({ regra: "metformina_b12", tipo: "medicamento", gravidade: "info", mensagem: "O uso prolongado de metformina pode reduzir a vitamina B12.", acao_recomendada: "Pergunte ao seu médico sobre a dosagem periódica de B12." });
  }

  // ---------- outras condições ----------
  if (c.has("hipertensao") || ctx.modo === "japonesa") {
    add({ regra: c.has("hipertensao") ? "sodio_hipertensao" : "sodio_japonesa", tipo: "nutriente", gravidade: c.has("hipertensao") ? "atencao" : "info", mensagem: c.has("hipertensao") ? "Com hipertensão, o sódio merece atenção. O plano mira menos de 2.000 mg/dia e limita shoyu e missô." : "A culinária japonesa usa molhos ricos em sódio. O plano limita shoyu e missô e acompanha o sódio diário.", acao_recomendada: "Prefira shoyu reduzido em sódio, use temperos naturais (gengibre, limão, cebolinha) e evite adicionar sal à mesa." });
  }
  if (c.has("cirurgia_bariatrica")) {
    add({ regra: "bariatrica", tipo: "condicao", gravidade: "importante", mensagem: "Após cirurgia bariátrica, volume das refeições, proteína e suplementação seguem protocolos específicos.", acao_recomendada: "Use o plano apenas como referência e valide com a equipe que acompanha sua cirurgia." });
    validar.push("Volumes, consistência e suplementação pós-bariátrica");
  }
  if (c.has("doenca_celiaca")) {
    add({ regra: "celiaca", tipo: "condicao", gravidade: "atencao", mensagem: "Excluímos alimentos com glúten (incluindo shoyu comum e soba de trigo). Atenção à contaminação cruzada.", acao_recomendada: "Leia rótulos e prefira shoyu sem glúten (tamari)." });
  }
  if (c.has("dii") || c.has("sii")) {
    add({ regra: "intestino", tipo: "condicao", gravidade: "info", mensagem: "Com condições intestinais, aumentar fibras deve ser gradual e alguns alimentos podem ser pouco tolerados.", acao_recomendada: "Use o diário de sintomas e ajuste com seu gastroenterologista/nutricionista." });
  }
  if (c.has("cancer_tratamento")) {
    add({ regra: "cancer", tipo: "condicao", gravidade: "importante", mensagem: "Durante tratamento oncológico, as necessidades nutricionais são individualizadas e restrições podem ser prejudiciais.", acao_recomendada: "Siga a orientação da equipe de oncologia; use o plano apenas como apoio." });
    motivosSemDeficit.push("tratamento oncológico");
    validar.push("Plano durante tratamento oncológico");
  }
  if (c.has("gota")) {
    add({ regra: "gota", tipo: "condicao", gravidade: "info", mensagem: "Com gota, álcool (especialmente cerveja), bebidas açucaradas e excesso de frutos do mar/carnes vermelhas merecem atenção.", acao_recomendada: "Mantenha acompanhamento médico e boa hidratação." });
  }
  if (ctx.saude.anafilaxia) {
    add({ regra: "anafilaxia", tipo: "alergia", gravidade: "importante", mensagem: "Você relatou alergia grave. Excluímos os alérgenos informados, mas produtos industrializados podem conter traços.", acao_recomendada: "Leia sempre os rótulos e mantenha seu plano de emergência conforme orientação médica." });
  }

  // ---------- sintomas de alerta ----------
  const sintomasAlerta = new Set([...(ctx.saude.sintomas ?? []), ...(ctx.sintomasRegistrados ?? [])]);
  const alarmes = SINTOMAS_ALERTA.filter((s) => sintomasAlerta.has(s.id));
  if (alarmes.length) {
    add({ regra: "sintomas_alerta", tipo: "sintoma", gravidade: "importante", mensagem: `Você relatou: ${alarmes.map((a) => a.nome.toLowerCase()).join(", ")}. Esses sinais merecem avaliação médica e não devem ser tratados apenas com mudanças na alimentação.`, acao_recomendada: "Procure um médico. Em caso de dor no peito, desmaio ou sangramento intenso, procure atendimento de urgência." });
  }

  // ---------- perda de peso rápida ----------
  if (ctx.perdaPesoSemanalPct != null && ctx.perdaPesoSemanalPct > 1.5) {
    add({ regra: "perda_rapida", tipo: "evolucao", gravidade: "atencao", mensagem: `Seus registros indicam perda de ~${ctx.perdaPesoSemanalPct.toFixed(1).replace(".", ",")}% do peso por semana, acima do ritmo considerado seguro.`, acao_recomendada: "Na próxima revisão sugeriremos aumentar um pouco a energia. Se não for intencional, procure avaliação." });
  }
  if (ctx.metaAgressiva) {
    add({ regra: "meta_agressiva", tipo: "objetivo", gravidade: "atencao", mensagem: "A meta de peso no prazo informado exigiria um ritmo acima do recomendado. Mantivemos um ritmo seguro.", acao_recomendada: "Considere ampliar o prazo; ritmos mais lentos costumam ser mais sustentáveis." });
  }
  if ((ctx.alcoolDosesSemana ?? 0) > 14) {
    add({ regra: "alcool", tipo: "habito", gravidade: "atencao", mensagem: "O consumo de álcool informado está acima de 14 doses/semana, o que afeta saúde, sono e composição corporal.", acao_recomendada: "Se quiser apoio para reduzir, converse com um profissional de saúde." });
  }

  if (!validar.length) validar.push("Metas de energia e macronutrientes são estimativas — um nutricionista pode refiná-las com avaliação presencial");

  return {
    alertas,
    bloqueios,
    restricoesCalculo: { semDeficit: motivosSemDeficit.length > 0, proteinaMaxGkg: proteinaMax, restricaoHidrica, motivos: motivosSemDeficit },
    consideradas,
    validarComProfissional: validar,
    esconderCalorias,
  };
}

/** Alérgenos que devem ser excluídos com base em alergias, intolerâncias e condições */
export function alergenosExcluidos(s: PerfilSaude): Set<Alergeno> {
  const out = new Set<Alergeno>([...s.alergias, ...s.intolerancias]);
  if (s.condicoes.includes("doenca_celiaca")) out.add("gluten");
  if (s.restricoes.includes("sem_gluten")) out.add("gluten");
  if (s.restricoes.includes("sem_lactose")) out.add("lactose");
  if (out.has("leite")) out.add("lactose");
  return out;
}

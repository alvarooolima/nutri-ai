import { z } from "zod";

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);
const numOpc = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().min(min).max(max).nullable());
const hora = z.string().regex(/^\d{2}:\d{2}$/).nullable().or(z.literal("").transform(() => null));
const txt = (max = 2000) => z.string().max(max).trim().optional().default("");

export const schemas = {
  0: z.object({
    nome: z.string().trim().min(1).max(60),
    data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sexo: z.enum(["feminino", "masculino", "outro"]),
    altura: num(100, 250),
    peso: num(30, 350),
    cintura: numOpc(40, 250),
    quadril: numOpc(40, 250),
  }),
  1: z.object({
    objetivo_principal: z.enum(["perda_peso", "manutencao", "ganho_massa", "saude_geral", "performance", "melhorar_alimentacao"]),
    objetivos_secundarios: z.array(z.string().max(60)).max(10).default([]),
    meta_peso: numOpc(30, 350),
    prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().or(z.literal("").transform(() => null)),
    motivacao: txt(500),
  }),
  2: z.object({
    horario_acordar: hora,
    horario_dormir: hora,
    horas_de_sono: numOpc(0, 16),
    trabalho: txt(120),
    deslocamento: txt(120),
    horarios_disponiveis: z.array(z.string().max(40)).max(10).default([]),
    tempo_cozinhar_min: numOpc(0, 240),
    refeicoes_fora: txt(120),
    nivel_atividade: z.enum(["sedentario", "leve", "moderado", "ativo", "muito_ativo"]),
    passos_diarios: numOpc(0, 60000),
  }),
  3: z.object({
    refeicoes_preferidas: z.array(z.enum(["cafe", "lanche_manha", "almoco", "lanche", "jantar", "ceia"])).min(1).max(6),
    fome: numOpc(1, 5),
    fomeHorario: txt(80),
    doces: txt(80),
    bebidas: txt(120),
    cafe: numOpc(0, 20),
    alcoolDoses: numOpc(0, 100),
    ultraprocessados: txt(80),
    agua: txt(80),
    diaAlimentar: txt(2000),
  }),
  4: z.object({
    condicoes: z.array(z.string().max(40)).max(40).default([]),
    condicoesTexto: txt(1000),
    sintomas: z.array(z.string().max(40)).max(40).default([]),
    cirurgias: txt(500),
    internacoes: txt(500),
    exames: txt(1000),
    orientacoes: txt(1000),
    alergias: z.array(z.enum(["gluten", "leite", "lactose", "ovo", "peixe", "frutos_do_mar", "soja", "amendoim", "castanhas", "gergelim"])).default([]),
    intolerancias: z.array(z.enum(["gluten", "leite", "lactose", "ovo", "peixe", "frutos_do_mar", "soja", "amendoim", "castanhas", "gergelim"])).default([]),
    anafilaxia: z.boolean().default(false),
    alergiasTexto: txt(300),
    medicamentos: z.array(z.object({ nome: z.string().trim().min(1).max(80), dose: txt(60), frequencia: txt(60), horario: txt(30) })).max(30).default([]),
    suplementos: z.array(z.object({ nome: z.string().trim().min(1).max(80), dose: txt(60), frequencia: txt(60) })).max(30).default([]),
  }),
  5: z.object({
    exercicios: z
      .array(
        z.object({
          tipo: z.string().trim().min(1).max(60),
          frequencia: num(0, 14),
          duracao: num(0, 480),
          intensidade: z.enum(["leve", "moderada", "intensa"]),
          horario: txt(30),
          objetivo: txt(80),
        }),
      )
      .max(15)
      .default([]),
  }),
  6: z.object({
    alimentos_preferidos: z.array(z.string().max(40)).max(80).default([]),
    alimentos_rejeitados: z.array(z.string().max(40)).max(80).default([]),
    alimentos_evitar: z.array(z.string().max(40)).max(80).default([]),
    culinarias_preferidas: z.array(z.string().max(30)).max(10).default([]),
    restricoes: z.array(z.enum(["vegetariano", "vegano", "sem_gluten", "sem_lactose", "sem_carne_vermelha", "sem_porco", "sem_peixe", "sem_frutos_do_mar"])).default([]),
    modo_alimentar: z.enum(["brasileira", "japonesa", "mediterranea", "vegetariana", "plant_based", "alta_proteina", "baixo_custo", "marmitas"]),
    cardapio: z.enum(["fechado", "flexivel"]).default("flexivel"),
    repeticao: z.enum(["baixa", "media", "alta"]).default("media"),
    marmitas: z.boolean().default(false),
    receitas: z.boolean().default(true),
    unidades: z.enum(["gramas", "caseiras", "ambos"]).default("ambos"),
    mostrarMacros: z.boolean().default(true),
  }),
  7: z.object({
    periodo: z.enum(["diario", "semanal", "mensal", "nenhum"]),
    valor: numOpc(0, 100000),
    locais_de_compra: z.array(z.string().max(40)).max(10).default([]),
    observacoes: txt(300),
  }),
} as const;


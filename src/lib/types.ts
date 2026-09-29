export type Sexo = "feminino" | "masculino" | "outro";
export type NivelAtividade = "sedentario" | "leve" | "moderado" | "ativo" | "muito_ativo";
export type Objetivo =
  | "perda_peso"
  | "manutencao"
  | "ganho_massa"
  | "saude_geral"
  | "performance"
  | "melhorar_alimentacao";

export type TipoRefeicao = "cafe" | "lanche_manha" | "almoco" | "lanche" | "jantar" | "ceia";

export type Modo =
  | "brasileira"
  | "japonesa"
  | "mediterranea"
  | "vegetariana"
  | "plant_based"
  | "alta_proteina"
  | "baixo_custo"
  | "marmitas";

export type Alergeno =
  | "gluten"
  | "leite"
  | "lactose"
  | "ovo"
  | "peixe"
  | "frutos_do_mar"
  | "soja"
  | "amendoim"
  | "castanhas"
  | "gergelim";

export type Restricao =
  | "vegetariano"
  | "vegano"
  | "sem_gluten"
  | "sem_lactose"
  | "sem_carne_vermelha"
  | "sem_porco"
  | "sem_peixe"
  | "sem_frutos_do_mar";

export type GrupoTroca =
  | "cereal"
  | "leguminosa"
  | "proteina"
  | "hortalica"
  | "fruta"
  | "laticinio"
  | "gordura"
  | "oleaginosa"
  | "tempero"
  | "doce";

export interface Food {
  id: string;
  nome: string;
  categoria: string; // categoria de compra
  grupo: GrupoTroca;
  kcal: number;
  p: number;
  c: number;
  g: number;
  f: number;
  na: number; // mg / 100 g
  medida: string; // descrição da medida caseira
  gMedida: number; // gramas da medida caseira
  contavel?: boolean; // arredondar para unidades inteiras
  precoKg: number; // R$/kg na forma de compra
  rendimento: number; // peso pronto / peso comprado
  nomeCompra?: string;
  tags: string[];
  alergenos: Alergeno[];
  fonte: string;
}

export type Papel = "proteina" | "carbo" | "vegetal" | "gordura" | "fruta" | "extra";

export interface IngredienteBase {
  food: string;
  g: number;
  papel: Papel;
  preparo?: string;
}

export interface Receita {
  id: string;
  nome: string;
  descricao: string;
  ilustracao: string; // emoji
  tipos: TipoRefeicao[];
  modos: Modo[];
  tempo: number; // minutos
  dificuldade: "fácil" | "média" | "difícil";
  itens: IngredienteBase[];
  preparo: string[];
  tags: string[]; // marmita, rapido, sopa ...
}

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  g: number;
  f: number;
  na: number;
  custo: number;
}

export interface ItemPlanejado {
  food: string;
  g: number;
  medida: string;
  preparo?: string;
  papel?: Papel;
}

export interface RefeicaoPlanejada {
  tipo: TipoRefeicao;
  nome: string;
  horario?: string;
  receitaId: string | null;
  itens: ItemPlanejado[];
  foraDeCasa?: boolean;
  nota?: string;
}

export interface DiaPlanejado {
  data: string; // YYYY-MM-DD
  refeicoes: RefeicaoPlanejada[];
}

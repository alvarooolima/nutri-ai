import type { Alergeno, Food, GrupoTroca } from "@/lib/types";

/**
 * Banco de alimentos de referência.
 * Valores por 100 g da forma indicada no nome (ex.: "cozido").
 * Composição: TACO 4ª ed. (NEPA/UNICAMP, 2011) ou USDA FoodData Central (SR Legacy),
 * conforme o campo `fonte`. Valores são referências médias e podem variar por marca,
 * variedade e preparo.
 * Preços: estimativa aproximada de varejo no Brasil (2026), apenas para planejamento —
 * não são cotações.
 */
export const FONTE_TACO = "TACO 4ª ed. (NEPA/UNICAMP, 2011)";
export const FONTE_USDA = "USDA FoodData Central (SR Legacy)";
export const FONTE_PRECO = "Estimativa de preço médio de varejo no Brasil (2026) — referência aproximada, não é cotação";

type N = [kcal: number, p: number, c: number, g: number, f: number, na: number];

function food(
  id: string,
  nome: string,
  categoria: string,
  grupo: GrupoTroca,
  n: N,
  medida: string,
  gMedida: number,
  precoKg: number,
  rendimento: number,
  tags: string[],
  alergenos: Alergeno[],
  fonte: string,
  extra: Partial<Food> = {},
): Food {
  const [kcal, p, c, g, f, na] = n;
  return { id, nome, categoria, grupo, kcal, p, c, g, f, na, medida, gMedida, precoKg, rendimento, tags, alergenos, fonte, ...extra };
}

const V = ["vegano", "vegetariano"];
const VG = ["vegetariano"];

export const FOODS: Food[] = [
  // ---------------- Cereais, massas e tubérculos ----------------
  food("arroz-branco", "Arroz branco cozido", "Grãos e cereais", "cereal", [128, 2.5, 28.1, 0.2, 1.6, 1], "colher de sopa cheia", 25, 6.5, 2.5, [...V, "brasileiro", "japones"], [], FONTE_TACO, { nomeCompra: "Arroz branco (cru)" }),
  food("arroz-integral", "Arroz integral cozido", "Grãos e cereais", "cereal", [124, 2.6, 25.8, 1.0, 2.7, 1], "colher de sopa cheia", 25, 8.5, 2.4, [...V, "brasileiro", "integral"], [], FONTE_TACO, { nomeCompra: "Arroz integral (cru)" }),
  food("quinoa", "Quinoa cozida", "Grãos e cereais", "cereal", [120, 4.4, 21.3, 1.9, 2.8, 7], "colher de sopa cheia", 25, 45, 2.7, [...V, "mediterraneo", "integral"], [], FONTE_USDA, { nomeCompra: "Quinoa em grãos (crua)" }),
  food("macarrao", "Macarrão cozido", "Pães e massas", "cereal", [158, 5.8, 30.9, 0.9, 1.8, 1], "pegador", 60, 9, 2.3, [...V, "mediterraneo"], ["gluten"], FONTE_USDA, { nomeCompra: "Macarrão (seco)" }),
  food("soba", "Macarrão soba cozido", "Japoneses e orientais", "cereal", [99, 5.1, 21.4, 0.1, 1.0, 60], "pegador", 60, 60, 2.4, [...V, "japones"], ["gluten"], FONTE_USDA, { nomeCompra: "Macarrão soba (seco)" }),
  food("pao-frances", "Pão francês", "Pães e massas", "cereal", [300, 8.0, 58.6, 3.1, 2.3, 648], "unidade", 50, 16, 1, [...V, "brasileiro"], ["gluten"], FONTE_TACO, { contavel: true }),
  food("pao-integral", "Pão de forma integral", "Pães e massas", "cereal", [253, 9.4, 49.9, 3.7, 6.9, 506], "fatia", 25, 18, 1, [...V, "integral"], ["gluten"], FONTE_TACO, { contavel: true }),
  food("tapioca", "Tapioca (fécula de mandioca, seca)", "Grãos e cereais", "cereal", [358, 0.2, 88.7, 0.0, 0.9, 1], "colher de sopa", 15, 14, 1, [...V, "brasileiro"], [], FONTE_USDA, { nomeCompra: "Goma/fécula de tapioca" }),
  food("aveia", "Aveia em flocos", "Grãos e cereais", "cereal", [394, 13.9, 66.6, 8.5, 9.1, 5], "colher de sopa", 15, 16, 1, [...V, "integral"], ["gluten"], FONTE_TACO),
  food("cuscuz", "Cuscuz de milho cozido", "Grãos e cereais", "cereal", [113, 2.2, 25.3, 0.7, 2.1, 247], "fatia média", 80, 7, 2.2, [...V, "brasileiro"], [], FONTE_TACO, { nomeCompra: "Flocão de milho" }),
  food("batata", "Batata inglesa cozida", "Hortifrúti", "cereal", [52, 1.2, 11.9, 0.0, 1.3, 2], "unidade média", 90, 6.5, 1, [...V, "brasileiro", "mediterraneo"], [], FONTE_TACO, { nomeCompra: "Batata inglesa" }),
  food("batata-doce", "Batata-doce cozida", "Hortifrúti", "cereal", [77, 0.6, 18.4, 0.1, 2.2, 3], "fatia média", 60, 6, 1, [...V, "brasileiro", "japones"], [], FONTE_TACO, { nomeCompra: "Batata-doce" }),
  food("mandioca", "Mandioca cozida", "Hortifrúti", "cereal", [125, 0.6, 30.1, 0.3, 1.6, 1], "pedaço médio", 70, 6, 1, [...V, "brasileiro"], [], FONTE_TACO, { nomeCompra: "Mandioca" }),

  // ---------------- Leguminosas ----------------
  food("feijao-carioca", "Feijão carioca cozido", "Leguminosas", "leguminosa", [76, 4.8, 13.6, 0.5, 8.5, 2], "concha média", 80, 8.5, 2.3, [...V, "brasileiro"], [], FONTE_TACO, { nomeCompra: "Feijão carioca (cru)" }),
  food("feijao-preto", "Feijão preto cozido", "Leguminosas", "leguminosa", [77, 4.5, 14.0, 0.5, 8.4, 2], "concha média", 80, 9, 2.3, [...V, "brasileiro"], [], FONTE_TACO, { nomeCompra: "Feijão preto (cru)" }),
  food("lentilha", "Lentilha cozida", "Leguminosas", "leguminosa", [93, 6.3, 16.3, 0.5, 7.9, 1], "concha média", 80, 18, 2.5, [...V, "mediterraneo"], [], FONTE_TACO, { nomeCompra: "Lentilha (crua)" }),
  food("grao-de-bico", "Grão-de-bico cozido", "Leguminosas", "leguminosa", [164, 8.9, 27.4, 2.6, 7.6, 7], "colher de sopa cheia", 25, 18, 2.3, [...V, "mediterraneo"], [], FONTE_USDA, { nomeCompra: "Grão-de-bico (cru)" }),
  food("edamame", "Edamame cozido", "Japoneses e orientais", "leguminosa", [121, 11.9, 8.9, 5.2, 5.2, 6], "xícara (vagens sem casca)", 75, 45, 1, [...V, "japones"], ["soja"], FONTE_USDA, { nomeCompra: "Edamame congelado" }),

  // ---------------- Proteínas animais ----------------
  food("frango", "Peito de frango grelhado", "Proteínas animais", "proteina", [159, 32.0, 0.0, 2.5, 0.0, 50], "filé médio", 100, 22, 0.7, ["aves", "brasileiro", "mediterraneo", "japones"], [], FONTE_TACO, { nomeCompra: "Peito de frango sem pele (cru)" }),
  food("patinho", "Patinho bovino grelhado", "Proteínas animais", "proteina", [219, 35.9, 0.0, 7.3, 0.0, 60], "bife médio", 100, 45, 0.7, ["carne_vermelha", "brasileiro"], [], FONTE_TACO, { nomeCompra: "Patinho bovino (cru)" }),
  food("lombo-porco", "Lombo de porco assado", "Proteínas animais", "proteina", [210, 35.7, 0.0, 6.4, 0.0, 39], "fatia média", 80, 28, 0.7, ["carne_vermelha", "porco", "brasileiro"], [], FONTE_TACO, { nomeCompra: "Lombo suíno (cru)" }),
  food("tilapia", "Tilápia grelhada", "Peixes e frutos do mar", "proteina", [128, 26.2, 0.0, 2.7, 0.0, 56], "filé médio", 100, 42, 0.75, ["peixe", "brasileiro", "japones"], ["peixe"], FONTE_USDA, { nomeCompra: "Filé de tilápia (cru)" }),
  food("salmao", "Salmão grelhado", "Peixes e frutos do mar", "proteina", [229, 23.9, 0.0, 14.0, 0.0, 64], "posta média", 100, 90, 0.8, ["peixe", "japones", "mediterraneo"], ["peixe"], FONTE_TACO, { nomeCompra: "Salmão (cru)" }),
  food("sardinha-fresca", "Sardinha assada", "Peixes e frutos do mar", "proteina", [164, 32.2, 0.0, 3.0, 0.0, 66], "unidade média", 50, 18, 0.75, ["peixe", "brasileiro", "japones", "mediterraneo"], ["peixe"], FONTE_TACO, { nomeCompra: "Sardinha fresca (crua)" }),
  food("sardinha-lata", "Sardinha em conserva (óleo, drenada)", "Peixes e frutos do mar", "proteina", [285, 15.9, 0.0, 24.0, 0.0, 666], "lata drenada", 84, 38, 1, ["peixe", "brasileiro"], ["peixe"], FONTE_TACO),
  food("atum-lata", "Atum em lata (água, drenado)", "Peixes e frutos do mar", "proteina", [116, 25.5, 0.0, 0.8, 0.0, 338], "lata drenada", 120, 70, 1, ["peixe", "mediterraneo", "japones"], ["peixe"], FONTE_USDA),
  food("camarao", "Camarão cozido", "Peixes e frutos do mar", "proteina", [90, 19.0, 0.0, 1.0, 0.0, 366], "colher de sopa cheia", 20, 75, 0.8, ["frutos_do_mar", "brasileiro", "japones", "mediterraneo"], ["frutos_do_mar"], FONTE_TACO, { nomeCompra: "Camarão limpo (cru)" }),
  food("ovo", "Ovo cozido", "Ovos e laticínios", "proteina", [146, 13.3, 0.6, 9.5, 0.0, 146], "unidade", 50, 20, 1, [...VG, "ovo", "brasileiro", "japones", "mediterraneo"], ["ovo"], FONTE_TACO, { contavel: true, nomeCompra: "Ovos" }),

  // ---------------- Proteínas vegetais ----------------
  food("tofu", "Tofu firme", "Japoneses e orientais", "proteina", [144, 15.8, 2.8, 8.7, 2.3, 14], "fatia grossa", 80, 32, 1, [...V, "japones"], ["soja"], FONTE_USDA, { nomeCompra: "Tofu firme" }),

  // ---------------- Laticínios e bebidas ----------------
  food("iogurte", "Iogurte natural integral", "Ovos e laticínios", "laticinio", [51, 4.1, 1.9, 3.0, 0.0, 52], "pote", 170, 16, 1, [...VG, "laticinio", "fermentado", "mediterraneo"], ["leite", "lactose"], FONTE_TACO),
  food("leite", "Leite integral", "Ovos e laticínios", "laticinio", [61, 3.2, 4.8, 3.3, 0.0, 43], "copo (200 ml)", 200, 5.5, 1, [...VG, "laticinio", "brasileiro"], ["leite", "lactose"], FONTE_USDA),
  food("leite-desnatado", "Leite desnatado", "Ovos e laticínios", "laticinio", [34, 3.4, 5.0, 0.1, 0.0, 42], "copo (200 ml)", 200, 5.5, 1, [...VG, "laticinio"], ["leite", "lactose"], FONTE_USDA),
  food("bebida-soja", "Bebida de soja sem açúcar", "Ovos e laticínios", "laticinio", [33, 2.9, 1.7, 1.6, 0.3, 32], "copo (200 ml)", 200, 12, 1, [...V, "japones"], ["soja"], FONTE_USDA),
  food("queijo-minas", "Queijo minas frescal", "Ovos e laticínios", "laticinio", [264, 17.4, 3.2, 20.2, 0.0, 31], "fatia média", 30, 42, 1, [...VG, "laticinio", "brasileiro"], ["leite", "lactose"], FONTE_TACO, { contavel: true }),
  food("cottage", "Queijo cottage", "Ovos e laticínios", "laticinio", [98, 11.1, 3.4, 4.3, 0.0, 364], "colher de sopa", 30, 55, 1, [...VG, "laticinio"], ["leite", "lactose"], FONTE_USDA),

  // ---------------- Hortaliças ----------------
  food("brocolis", "Brócolis cozido", "Hortifrúti", "hortalica", [25, 2.1, 4.4, 0.5, 3.4, 2], "ramo médio", 30, 18, 1, [...V, "brasileiro", "japones", "mediterraneo"], [], FONTE_TACO, { nomeCompra: "Brócolis" }),
  food("cenoura", "Cenoura crua", "Hortifrúti", "hortalica", [34, 1.3, 7.7, 0.2, 3.2, 3], "colher de sopa (ralada)", 12, 6, 1, [...V, "brasileiro", "japones"], [], FONTE_TACO, { nomeCompra: "Cenoura" }),
  food("cenoura-cozida", "Cenoura cozida", "Hortifrúti", "hortalica", [30, 0.8, 6.7, 0.2, 2.6, 7], "colher de sopa", 25, 6, 1, [...V, "brasileiro", "japones"], [], FONTE_TACO, { nomeCompra: "Cenoura" }),
  food("abobrinha", "Abobrinha cozida", "Hortifrúti", "hortalica", [15, 1.1, 3.0, 0.2, 1.6, 1], "colher de sopa", 30, 7, 1, [...V, "brasileiro", "mediterraneo"], [], FONTE_TACO, { nomeCompra: "Abobrinha" }),
  food("abobora", "Abóbora cabotiá cozida", "Hortifrúti", "hortalica", [48, 1.4, 10.8, 0.7, 2.5, 0], "pedaço médio", 60, 5, 1, [...V, "brasileiro", "japones"], [], FONTE_TACO, { nomeCompra: "Abóbora cabotiá" }),
  food("alface", "Alface crespa", "Hortifrúti", "hortalica", [11, 1.3, 1.7, 0.2, 1.8, 3], "folhas (prato de sobremesa)", 30, 14, 1, [...V, "brasileiro", "mediterraneo"], [], FONTE_TACO),
  food("tomate", "Tomate", "Hortifrúti", "hortalica", [15, 1.1, 3.1, 0.2, 1.2, 1], "unidade média", 100, 8, 1, [...V, "brasileiro", "mediterraneo"], [], FONTE_TACO),
  food("pepino", "Pepino", "Hortifrúti", "hortalica", [10, 0.9, 2.0, 0.0, 1.1, 0], "fatias (meia unidade)", 60, 6, 1, [...V, "japones", "mediterraneo"], [], FONTE_TACO),
  food("repolho", "Repolho cru", "Hortifrúti", "hortalica", [17, 0.9, 3.9, 0.1, 1.9, 4], "colher de sopa (fatiado)", 15, 5, 1, [...V, "brasileiro", "japones"], [], FONTE_TACO, { nomeCompra: "Repolho" }),
  food("couve", "Couve refogada", "Hortifrúti", "hortalica", [90, 1.7, 8.7, 6.6, 5.7, 11], "colher de sopa", 20, 16, 1, [...V, "brasileiro"], [], FONTE_TACO, { nomeCompra: "Couve-manteiga" }),
  food("espinafre", "Espinafre refogado", "Hortifrúti", "hortalica", [67, 2.7, 4.2, 5.4, 2.5, 101], "colher de sopa", 25, 20, 1, [...V, "japones", "mediterraneo"], [], FONTE_TACO, { nomeCompra: "Espinafre" }),
  food("chuchu", "Chuchu cozido", "Hortifrúti", "hortalica", [19, 0.4, 4.8, 0.0, 1.0, 0], "colher de sopa", 25, 5, 1, [...V, "brasileiro"], [], FONTE_TACO, { nomeCompra: "Chuchu" }),
  food("shiitake", "Shiitake cozido", "Japoneses e orientais", "hortalica", [56, 1.6, 14.4, 0.2, 2.1, 4], "colher de sopa", 20, 60, 1, [...V, "japones"], [], FONTE_USDA, { nomeCompra: "Shiitake fresco" }),
  food("champignon", "Cogumelo champignon", "Hortifrúti", "hortalica", [22, 3.1, 3.3, 0.3, 1.0, 5], "colher de sopa", 20, 40, 1, [...V, "mediterraneo", "japones"], [], FONTE_USDA),
  food("nabo", "Nabo (daikon) cru", "Hortifrúti", "hortalica", [18, 0.6, 4.1, 0.1, 1.6, 21], "colher de sopa (ralado)", 20, 8, 1, [...V, "japones"], [], FONTE_USDA),
  food("cebola", "Cebola", "Hortifrúti", "tempero", [39, 1.7, 8.9, 0.1, 2.2, 1], "colher de sopa (picada)", 15, 6, 1, [...V, "brasileiro", "japones", "mediterraneo"], [], FONTE_TACO),
  food("alho", "Alho", "Hortifrúti", "tempero", [113, 7.0, 23.9, 0.2, 4.3, 5], "dente", 4, 30, 1, [...V, "brasileiro", "japones", "mediterraneo"], [], FONTE_TACO),
  food("gengibre", "Gengibre", "Hortifrúti", "tempero", [42, 1.0, 8.9, 0.1, 1.9, 5], "colher de chá (ralado)", 4, 25, 1, [...V, "japones"], [], FONTE_TACO),
  food("wakame", "Alga wakame (hidratada)", "Japoneses e orientais", "hortalica", [45, 3.0, 9.1, 0.6, 0.5, 872], "colher de sopa", 10, 250, 8, [...V, "japones"], [], FONTE_USDA, { nomeCompra: "Alga wakame desidratada" }),
  food("nori", "Alga nori", "Japoneses e orientais", "hortalica", [35, 5.8, 5.1, 0.3, 0.3, 48], "folha", 3, 300, 1, [...V, "japones"], [], FONTE_USDA, { contavel: true }),

  // ---------------- Frutas ----------------
  food("banana", "Banana prata", "Hortifrúti", "fruta", [98, 1.3, 26.0, 0.1, 2.0, 0], "unidade média", 60, 7, 1, [...V, "brasileiro"], [], FONTE_TACO, { contavel: true }),
  food("maca", "Maçã fuji", "Hortifrúti", "fruta", [56, 0.3, 15.2, 0.0, 1.3, 0], "unidade média", 130, 11, 1, [...V, "mediterraneo", "japones"], [], FONTE_TACO, { contavel: true }),
  food("mamao", "Mamão papaia", "Hortifrúti", "fruta", [40, 0.5, 10.4, 0.1, 1.0, 2], "fatia média", 100, 8, 1, [...V, "brasileiro"], [], FONTE_TACO),
  food("laranja", "Laranja pera", "Hortifrúti", "fruta", [37, 1.0, 8.9, 0.1, 0.8, 0], "unidade média", 140, 5, 1, [...V, "brasileiro", "japones", "mediterraneo"], [], FONTE_TACO, { contavel: true }),
  food("morango", "Morango", "Hortifrúti", "fruta", [30, 0.9, 6.8, 0.3, 1.7, 0], "unidade", 12, 25, 1, [...V, "mediterraneo"], [], FONTE_TACO),
  food("abacate", "Abacate", "Hortifrúti", "gordura", [96, 1.2, 6.0, 8.4, 6.3, 0], "colher de sopa", 30, 10, 1, [...V, "brasileiro"], [], FONTE_TACO),
  food("melancia", "Melancia", "Hortifrúti", "fruta", [33, 0.9, 8.1, 0.0, 0.1, 0], "fatia média", 200, 3.5, 1, [...V, "brasileiro"], [], FONTE_TACO),
  food("manga", "Manga palmer", "Hortifrúti", "fruta", [72, 0.4, 19.4, 0.2, 1.6, 2], "fatia média", 100, 8, 1, [...V, "brasileiro"], [], FONTE_TACO),

  // ---------------- Gorduras, oleaginosas e sementes ----------------
  food("azeite", "Azeite de oliva", "Óleos e temperos", "gordura", [884, 0.0, 0.0, 100.0, 0.0, 0], "colher de sopa", 13, 60, 1, [...V, "mediterraneo", "brasileiro"], [], FONTE_TACO),
  food("oleo-gergelim", "Óleo de gergelim", "Japoneses e orientais", "gordura", [884, 0.0, 0.0, 100.0, 0.0, 0], "colher de chá", 4, 90, 1, [...V, "japones"], ["gergelim"], FONTE_USDA),
  food("gergelim", "Gergelim", "Oleaginosas e sementes", "oleaginosa", [584, 21.2, 21.6, 50.4, 11.9, 3], "colher de sopa", 9, 40, 1, [...V, "japones"], ["gergelim"], FONTE_TACO),
  food("castanha-para", "Castanha-do-pará", "Oleaginosas e sementes", "oleaginosa", [643, 14.5, 15.1, 63.5, 7.9, 1], "unidade", 4, 120, 1, [...V, "brasileiro"], ["castanhas"], FONTE_TACO, { contavel: true }),
  food("amendoim", "Amendoim cru", "Oleaginosas e sementes", "oleaginosa", [544, 27.2, 20.3, 43.9, 8.0, 0], "colher de sopa", 15, 22, 1, [...V, "brasileiro"], ["amendoim"], FONTE_TACO),
  food("pasta-amendoim", "Pasta de amendoim sem sal", "Oleaginosas e sementes", "oleaginosa", [588, 25.1, 19.6, 50.4, 6.0, 17], "colher de sopa", 15, 40, 1, [...V], ["amendoim"], FONTE_USDA),
  food("chia", "Chia", "Oleaginosas e sementes", "oleaginosa", [486, 16.5, 42.1, 30.7, 34.4, 16], "colher de sopa", 10, 40, 1, [...V], [], FONTE_USDA),

  // ---------------- Temperos e condimentos ----------------
  food("misso", "Missô", "Japoneses e orientais", "tempero", [198, 12.8, 25.4, 6.0, 5.4, 3728], "colher de sopa", 17, 60, 1, [...V, "japones", "fermentado"], ["soja"], FONTE_USDA),
  food("shoyu", "Shoyu", "Japoneses e orientais", "tempero", [53, 8.1, 4.9, 0.6, 0.8, 5493], "colher de chá", 5, 30, 1, [...V, "japones", "fermentado"], ["soja", "gluten"], FONTE_USDA),

  // ---------------- Doces ----------------
  food("mel", "Mel", "Mercearia", "doce", [309, 0.0, 84.0, 0.0, 0.0, 6], "colher de chá", 7, 45, 1, [...VG], [], FONTE_TACO),
  food("chocolate-70", "Chocolate 70% cacau", "Mercearia", "doce", [598, 7.8, 45.9, 42.6, 10.9, 20], "quadradinho", 10, 90, 1, [...VG], ["leite"], FONTE_USDA, { contavel: true }),
];

export const FOOD_MAP: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export function getFood(id: string): Food {
  const f = FOOD_MAP[id];
  if (!f) throw new Error(`Alimento desconhecido: ${id}`);
  return f;
}

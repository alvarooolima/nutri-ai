# NUTRI.AI

Assistente de planejamento alimentar baseado em evidências, personalizado para objetivo, rotina, preferências, cultura alimentar, orçamento e segurança clínica.

> O NUTRI.AI não substitui médico ou nutricionista, não faz diagnósticos e não altera medicamentos.

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind CSS 4 — interface mobile-first
- **Supabase** (Postgres + Auth, região São Paulo) com Row Level Security em todas as tabelas de usuário
- **Claude API** (`claude-opus-5`, opcional) para o assistente conversacional; sem chave, usa um motor de regras
- **Vitest** para o motor nutricional

## Arquitetura

```
src/
  data/            base de referência versionada: alimentos (TACO/USDA), receitas, fontes científicas
  lib/nutrition/   motor puro e testado
    calc.ts        TMB (Mifflin-St Jeor + Harris-Benedict), PAL (FAO/OMS/UNU), faixas, macros, fibras, água
    safety.ts      regras de segurança clínica → alertas, bloqueios e restrições de cálculo
    planner.ts     gerador de cardápio (diário/semanal/mensal), escala de porções, sódio, orçamento, proteína, variedade
    swaps.ts       trocas de alimento/refeição com equivalência, fome, comer fora
    shopping.ts    lista de compras (soma, cozido→cru, categorias)
    prep.ts        preparação semanal e reaproveitamento
    review.ts      revisão 1–2 semanas, tendência de peso, associação alimento–sintoma (sem causalidade)
    evidence.ts    recomendações rastreáveis (estimativa / evidência / hipótese / validar com profissional)
  lib/server/      camada de dados (perfil, planos, ações, assistente, criptografia de campos)
  app/             páginas (onboarding, painel, plano, receitas, compras, registros, evolução, evidências…)
supabase/migrations/  esquema SQL, RLS e funções
```

Prioridade de decisão do motor: **segurança → qualidade nutricional → personalização → aderência → praticidade → custo → experiência**. Exemplos: trocas “mais barato” só aceitam opções equivalentes em proteína e energia; o ajuste de orçamento não repete receitas além do limite semanal; déficits são limitados a 15–20% do gasto e ao piso de segurança.

## Privacidade e LGPD

- Consentimento específico para dados de saúde (art. 11) registrado com data e versão no cadastro
- Campos de saúde cifrados na aplicação (AES-256-GCM, chave `HEALTH_DATA_KEY`) além da criptografia do banco
- RLS: cada usuário só acessa seus próprios dados; tabelas de referência são somente leitura
- Exportação completa (JSON), revogação do consentimento de saúde e exclusão de conta em **Configurações**
- Registro de auditoria das ações relevantes

## Variáveis de ambiente

Veja `.env.example`:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente Supabase |
| `HEALTH_DATA_KEY` | 32 bytes em base64 (`openssl rand -base64 32`). **Guarde com segurança**: sem ela, os dados de saúde cifrados não podem ser lidos |
| `ANTHROPIC_API_KEY` | opcional — ativa o assistente com Claude |
| `ANTHROPIC_MODEL` | opcional — padrão `claude-opus-5` |

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:3000
npx vitest run     # testes do motor nutricional
npm run build
```

Migrações em `supabase/migrations` (aplicar em ordem). A base de alimentos, receitas e fontes vive em `src/data` e é a fonte da verdade usada pelo app; as tabelas `foods`, `recipes`, `substitutions` e `scientific_sources` no banco são um espelho opcional.

## Fontes de dados

- Composição: TACO 4ª ed. (NEPA/UNICAMP, 2011) e USDA FoodData Central — cada alimento indica sua fonte
- Referências científicas com DOI/URL verificados em `src/data/sources.ts` e na página “Por que o sistema recomendou isso?”
- Preços: estimativas aproximadas de varejo (2026) para planejamento — não são cotações

## Expansões preparadas

O motor nutricional é independente da interface (`src/lib/nutrition`), permitindo reutilização em apps iOS/Android, integração com balanças e relógios, leitura de código de barras/rótulos e acompanhamento por nutricionista.

## Decisões de design (com base em pesquisa)

**Cor.** Verde-azulado (`#0E6B5C`): o verde é associado a saúde e natureza e o azul a competência e confiança (Elliot & Maier, *Annu Rev Psychol*, 2014, doi:10.1146/annurev-psych-010213-115035; Labrecque & Milne, *J Acad Mark Sci*, 2011, doi:10.1007/s11747-010-0245-y). A cor é usada só na marca e nas ações — **nunca para rotular alimentos ou valores como bons/ruins**, porque rótulos verdes aumentam a percepção de saúde independentemente do conteúdo (Schuldt, *Health Commun*, 2013, doi:10.1080/10410236.2012.725270). Excesso em relação a uma meta aparece em cinza, não em vermelho/verde. Contraste de todos os textos ≥ 4,5:1 (WCAG AA).

**Minimalismo e densidade.** Baixa complexidade visual melhora a primeira impressão (Tuch et al., *Int J Hum-Comput Stud*, 2012, doi:10.1016/j.ijhcs.2012.06.003): fundo claro, poucas cores, cartões planos, detalhes recolhidos (divulgação progressiva), refeições em linhas compactas que abrem ao toque e layout em colunas em telas largas.

**Queixas de nutricionistas sobre apps e o que o NUTRI.AI faz:**

| Queixa (fonte) | Resposta no produto |
|---|---|
| Base de alimentos imprecisa (52%) e sem alimentos locais (48%) — Vasiloglou et al., *Nutrients*, 2020, doi:10.3390/nu12082214 | TACO + USDA com a fonte visível em cada refeição e receita; medidas caseiras brasileiras |
| Automonitoramento trabalhoso — Chen et al., *JMIR mHealth*, 2017, doi:10.2196/mhealth.6945; Cordeiro et al., CHI 2015, doi:10.1145/2702123.2702155 | Registro em um toque por refeição e “Segui tudo neste dia” |
| Foco em peso/calorias e risco de transtornos alimentares (56%) — Vasiloglou et al., 2020 | Progresso por refeições e bem-estar; calorias recolhidas; opção de ocultar números; alertas de segurança |
| Pouco apoio à prática do nutricionista e à integração — Chen et al., 2017 | **Relatório para o nutricionista** (uma página, imprimível/PDF) e exportação completa dos dados |
| Facilidade de uso é o critério nº 1 (87%) — Vasiloglou et al., 2020; König et al., *JMIR mHealth*, 2021, doi:10.2196/20037 | Linguagem simples, ajuda contextual, alvos de toque ≥ 44 px, navegação agrupada por tarefa |

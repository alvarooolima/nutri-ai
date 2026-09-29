-- NUTRI.AI — esquema principal
-- Todas as tabelas com dados do usuário têm RLS restrita ao próprio usuário (auth.uid()).
-- Campos marcados como "cifrado" guardam texto criptografado pela aplicação (AES-256-GCM).

create extension if not exists pgcrypto;

-- =========================================================
-- Função utilitária de updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =========================================================
-- USERS (perfil; 1:1 com auth.users)
-- =========================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  data_nascimento date,
  sexo text check (sexo in ('feminino','masculino','outro')),
  altura numeric(5,1) check (altura between 50 and 260),         -- cm
  peso_atual numeric(5,1) check (peso_atual between 20 and 400), -- kg
  peso_inicial numeric(5,1) check (peso_inicial between 20 and 400),
  data_cadastro date not null default current_date,
  timezone text not null default 'America/Sao_Paulo',
  onboarding_etapa int not null default 0,
  onboarding_completo boolean not null default false,
  perfil_confirmado boolean not null default false,
  preferencias_app jsonb not null default '{}'::jsonb,   -- cardápio fechado/flexível, repetição, marmitas, gramas, medidas caseiras, macros, modo
  habitos jsonb not null default '{}'::jsonb,            -- fome, doces, bebidas, café, álcool, ultraprocessados, água, dia alimentar, medidas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_updated before update on public.users for each row execute function public.set_updated_at();

-- cria o perfil automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Consentimentos (LGPD)
-- =========================================================
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tipo text not null check (tipo in ('termos','privacidade','dados_saude')),
  versao text not null,
  aceito_em timestamptz not null default now(),
  revogado_em timestamptz
);

-- =========================================================
-- GOALS
-- =========================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  objetivo_principal text not null,
  objetivos_secundarios text[] not null default '{}',
  meta_peso numeric(5,1),
  prazo date,
  motivacao text,
  prioridade int not null default 1,
  status text not null default 'ativo' check (status in ('ativo','pausado','concluido','arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger goals_updated before update on public.goals for each row execute function public.set_updated_at();

-- =========================================================
-- HEALTH_PROFILE (dados sensíveis — campos cifrados)
-- =========================================================
create table public.health_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  condicoes_de_saude text,        -- cifrado (JSON)
  cirurgias text,                 -- cifrado
  internacoes text,               -- cifrado
  sintomas text,                  -- cifrado
  alergias text,                  -- cifrado (JSON)
  intolerancias text,             -- cifrado (JSON)
  restricoes text,                -- cifrado (JSON)
  exames_relevantes text,         -- cifrado
  orientacoes_profissionais text, -- cifrado
  observacoes text,               -- cifrado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger health_updated before update on public.health_profile for each row execute function public.set_updated_at();

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  nome text not null,            -- cifrado
  dose_informada text,           -- cifrado
  frequencia text,
  horario text,
  observacoes text,              -- cifrado
  created_at timestamptz not null default now()
);

create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  nome text not null,            -- cifrado
  dose text,                     -- cifrado
  frequencia text,
  observacoes text,              -- cifrado
  created_at timestamptz not null default now()
);

-- =========================================================
-- LIFESTYLE / EXERCISES / FOOD_PREFERENCES / BUDGET
-- =========================================================
create table public.lifestyle (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  horario_acordar time,
  horario_dormir time,
  trabalho text,
  deslocamento text,
  horas_de_sono numeric(3,1),
  nivel_atividade text check (nivel_atividade in ('sedentario','leve','moderado','ativo','muito_ativo')),
  passos_diarios int,
  horarios_disponiveis text[] not null default '{}',
  tempo_cozinhar_min int,
  refeicoes_fora text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lifestyle_updated before update on public.lifestyle for each row execute function public.set_updated_at();

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tipo text not null,
  frequencia int,              -- vezes por semana
  duracao int,                 -- minutos
  intensidade text check (intensidade in ('leve','moderada','intensa')),
  horario text,
  objetivo text,
  created_at timestamptz not null default now()
);

create table public.food_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  alimentos_preferidos text[] not null default '{}',
  alimentos_rejeitados text[] not null default '{}',
  alimentos_evitar text[] not null default '{}',
  culinarias_preferidas text[] not null default '{}',
  refeicoes_preferidas text[] not null default '{}',
  numero_de_refeicoes int check (numero_de_refeicoes between 1 and 8),
  modo_alimentar text not null default 'brasileira',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger foodpref_updated before update on public.food_preferences for each row execute function public.set_updated_at();

create table public.budget (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  orcamento_diario numeric(10,2),
  orcamento_semanal numeric(10,2),
  orcamento_mensal numeric(10,2),
  locais_de_compra text[] not null default '{}',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger budget_updated before update on public.budget for each row execute function public.set_updated_at();

-- =========================================================
-- Bases de referência (leitura pública)
-- =========================================================
create table public.foods (
  id text primary key,
  nome text not null,
  categoria text not null,
  grupo_troca text not null,
  kcal_100g numeric not null,
  proteina_100g numeric not null,
  carboidrato_100g numeric not null,
  gordura_100g numeric not null,
  fibra_100g numeric not null,
  sodio_100g numeric not null,       -- mg
  micronutrientes jsonb not null default '{}'::jsonb,
  medida_caseira text,
  gramas_medida numeric,
  preco_kg numeric,                  -- R$ por kg na forma de compra (estimativa)
  rendimento numeric not null default 1, -- peso pronto / peso comprado
  nome_compra text,
  tags text[] not null default '{}',
  alergenos text[] not null default '{}',
  fonte_dos_dados text not null
);

create table public.recipes (
  id text primary key,
  nome text not null,
  descricao text,
  ilustracao text,
  tipo_refeicao text[] not null,
  modos text[] not null default '{}',
  rendimento int not null default 1,
  tempo_preparo int not null,
  dificuldade text not null check (dificuldade in ('fácil','média','difícil')),
  ingredientes jsonb not null,
  modo_preparo text[] not null,
  informacoes_nutricionais jsonb not null,
  custo_estimado numeric,
  tags text[] not null default '{}'
);

create table public.substitutions (
  id uuid primary key default gen_random_uuid(),
  food_id text not null references public.foods(id) on delete cascade,
  substitute_food_id text not null references public.foods(id) on delete cascade,
  equivalencia text not null,
  observacoes text,
  unique (food_id, substitute_food_id)
);

create table public.scientific_sources (
  id text primary key,
  titulo text not null,
  autores text not null,
  periodico text,
  ano int,
  doi text,
  url text,
  tipo_de_estudo text not null,
  populacao text,
  intervencao text,
  resultado text,
  limitacoes text,
  nivel_de_evidencia text not null,
  data_verificacao date
);

-- =========================================================
-- Planos
-- =========================================================
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  tipo text not null check (tipo in ('diario','semanal','mensal')),
  modo text not null,
  objetivo text,
  calorias_estimadas int,
  proteina_estimada int,
  carboidrato_estimado int,
  gordura_estimada int,
  fibras_estimadas int,
  custo_estimado numeric(10,2),
  calculo jsonb not null default '{}'::jsonb,        -- rastreio do cálculo (fórmulas, entradas, faixas)
  consideracoes jsonb not null default '{}'::jsonb,  -- dados considerados, limitações, pontos a validar
  desafio text,
  status text not null default 'ativo' check (status in ('rascunho','ativo','substituido','arquivado')),
  versao int not null default 1,
  created_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  dia date not null,
  ordem int not null default 0,
  nome text not null,
  horario time,
  tipo text not null,
  recipe_id text references public.recipes(id),
  fora_de_casa boolean not null default false,
  nota text,
  created_at timestamptz not null default now()
);
create index meals_plan_dia on public.meals(meal_plan_id, dia, ordem);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  food_id text not null references public.foods(id),
  quantidade numeric not null,   -- gramas (ou ml)
  unidade text,                  -- medida caseira
  preparacao text,
  observacoes text,
  ordem int not null default 0
);
create index meal_items_meal on public.meal_items(meal_id);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  periodo text not null,
  data_inicio date,
  data_fim date,
  itens jsonb not null default '[]'::jsonb,
  custo_estimado numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger shopping_updated before update on public.shopping_lists for each row execute function public.set_updated_at();

-- =========================================================
-- Acompanhamento
-- =========================================================
create table public.tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  data date not null,
  peso numeric(5,1),
  cintura numeric(5,1),
  quadril numeric(5,1),
  outras_medidas jsonb not null default '{}'::jsonb,
  fome int check (fome between 1 and 5),
  saciedade int check (saciedade between 1 and 5),
  energia int check (energia between 1 and 5),
  sono int check (sono between 1 and 5),
  horas_sono numeric(3,1),
  digestao int check (digestao between 1 and 5),
  adesao int check (adesao between 0 and 100),
  agua_ml int,
  exercicio_min int,
  created_at timestamptz not null default now(),
  unique (user_id, data)
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  data date not null,
  hora time,
  refeicao text,
  meal_id uuid references public.meals(id) on delete set null,
  descricao text,
  seguiu_plano text check (seguiu_plano in ('sim','parcial','nao')),
  fome_antes int check (fome_antes between 1 and 5),
  saciedade_depois int check (saciedade_depois between 1 and 5),
  created_at timestamptz not null default now()
);
create index food_logs_user_data on public.food_logs(user_id, data);

create table public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  data date not null,
  hora time,
  sintoma text not null,
  intensidade int check (intensidade between 0 and 10),
  duracao text,
  relacao_com_alimento text,
  observacoes text,             -- cifrado
  created_at timestamptz not null default now()
);
create index symptoms_user_data on public.symptoms(user_id, data);

-- =========================================================
-- Evidências, recomendações, alertas, revisões
-- =========================================================
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  meal_plan_id uuid references public.meal_plans(id) on delete cascade,
  categoria text not null,
  tipo text not null check (tipo in ('estimativa','evidencia','hipotese','orientacao_profissional')),
  recommendation text not null,
  rationale text not null,
  dados_usuario jsonb not null default '{}'::jsonb,
  scientific_source_ids text[] not null default '{}',
  evidence_level text,
  limitations text,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  regra text not null,
  tipo text not null,
  gravidade text not null check (gravidade in ('info','atencao','importante')),
  mensagem text not null,
  acao_recomendada text,
  status text not null default 'ativo' check (status in ('ativo','lido','resolvido')),
  created_at timestamptz not null default now(),
  unique (user_id, regra)
);

create table public.plan_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  periodo_inicio date not null,
  periodo_fim date not null,
  resumo jsonb not null,
  ajustes_propostos jsonb not null default '[]'::jsonb,
  status text not null default 'pendente' check (status in ('pendente','aceita','recusada')),
  created_at timestamptz not null default now()
);

create table public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  desafio text not null,
  dia int not null check (dia between 1 and 31),
  concluido boolean not null default false,
  notas text,
  created_at timestamptz not null default now(),
  unique (user_id, desafio, dia)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index chat_user on public.chat_messages(user_id, created_at);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  acao text not null,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- RLS
-- =========================================================
alter table public.users enable row level security;
create policy users_self_select on public.users for select to authenticated using ((select auth.uid()) = id);
create policy users_self_update on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare t text;
begin
  foreach t in array array['consents','goals','health_profile','medications','supplements','lifestyle','exercises',
    'food_preferences','budget','meal_plans','meals','meal_items','shopping_lists','tracking','food_logs','symptoms',
    'recommendations','alerts','plan_reviews','challenge_progress','chat_messages','audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t||'_sel', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t||'_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t||'_del', t);
    execute format('create index if not exists %I on public.%I(user_id)', t||'_user_idx', t);
  end loop;
end $$;

-- registro de auditoria é somente inserção/leitura
drop policy audit_log_upd on public.audit_log;
drop policy audit_log_del on public.audit_log;

do $$
declare t text;
begin
  foreach t in array array['foods','recipes','substitutions','scientific_sources']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t||'_read', t);
  end loop;
end $$;

-- =========================================================
-- Exclusão de conta (LGPD) — remove o usuário de auth e, em cascata, todos os dados
-- =========================================================
create or replace function public.delete_my_account()
returns void language plpgsql security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'não autenticado';
  end if;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- índices de chaves estrangeiras
create index meal_items_food on public.meal_items(food_id);
create index meals_recipe on public.meals(recipe_id);
create index shopping_plan on public.shopping_lists(meal_plan_id);
create index food_logs_meal on public.food_logs(meal_id);
create index recommendations_plan on public.recommendations(meal_plan_id);
create index plan_reviews_plan on public.plan_reviews(meal_plan_id);
create index substitutions_sub on public.substitutions(substitute_food_id);

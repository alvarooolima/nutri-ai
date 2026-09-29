-- A base de referência (alimentos/receitas) é versionada no código do app e validada na aplicação;
-- as tabelas foods/recipes no banco são um espelho opcional, então as FKs não são obrigatórias.
alter table public.meal_items drop constraint if exists meal_items_food_id_fkey;
alter table public.meals drop constraint if exists meals_recipe_id_fkey;

-- Registra os consentimentos (LGPD) aceitos no cadastro, a partir dos metadados do usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare v text := coalesce(new.raw_user_meta_data->>'versao_termos', 'v1');
begin
  insert into public.users (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''));
  if coalesce((new.raw_user_meta_data->>'aceite_termos')::boolean, false) then
    insert into public.consents (user_id, tipo, versao) values (new.id, 'termos', v), (new.id, 'privacidade', v);
  end if;
  if coalesce((new.raw_user_meta_data->>'aceite_dados_saude')::boolean, false) then
    insert into public.consents (user_id, tipo, versao) values (new.id, 'dados_saude', v);
  end if;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

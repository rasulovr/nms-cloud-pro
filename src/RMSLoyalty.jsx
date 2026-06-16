-- RMS Loyalty v22 — Public self-registration by QR
-- Allows guests to create/reopen their Loyalty drink card from /loyalty/join?branch=BC1.

create extension if not exists pgcrypto with schema extensions;

alter table public.rms_loyalty_clients
  add column if not exists public_join_source text,
  add column if not exists public_join_branch_id text,
  add column if not exists public_join_at timestamptz;

create or replace function public.rms_loyalty_public_register_secure(
  p_name text,
  p_phone text,
  p_birthday date default null,
  p_branch_id text default 'BC1',
  p_source text default 'public_join_qr'
)
returns table(
  id uuid,
  name text,
  phone text,
  card_number text,
  wallet_token text,
  wallet_enabled boolean,
  stamp_count integer,
  free_drink_balance integer,
  visits_count integer,
  lifetime_drinks integer,
  total_drinks integer,
  vip_level text,
  reward_threshold integer,
  available_rewards integer,
  created_at timestamptz,
  updated_at timestamptz,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text := trim(coalesce(p_phone, ''));
  v_digits text := regexp_replace(trim(coalesce(p_phone, '')), '\D', '', 'g');
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_branch text := nullif(trim(coalesce(p_branch_id, '')), '');
  v_source text := nullif(trim(coalesce(p_source, '')), '');
  v_client_id uuid;
  v_card_number text;
  v_wallet_token text;
  v_attempt integer := 0;
begin
  if length(v_digits) < 7 then
    raise exception 'Введите корректный номер телефона';
  end if;

  select c.id into v_client_id
  from public.rms_loyalty_clients c
  where regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_digits
  order by c.created_at desc
  limit 1;

  if v_client_id is not null then
    update public.rms_loyalty_clients c
    set
      name = coalesce(v_name, c.name),
      birthday = coalesce(p_birthday, c.birthday),
      wallet_enabled = true,
      wallet_token = coalesce(nullif(c.wallet_token, ''), md5(v_digits || '-' || clock_timestamp()::text || '-' || random()::text)),
      card_number = coalesce(nullif(c.card_number, ''), 'BC-' || lpad((floor(random() * 1000000))::integer::text, 6, '0')),
      public_join_source = coalesce(v_source, 'public_join_qr'),
      public_join_branch_id = coalesce(v_branch, 'BC1'),
      public_join_at = now(),
      is_active = true,
      updated_at = now()
    where c.id = v_client_id;
  else
    loop
      v_attempt := v_attempt + 1;
      v_card_number := 'BC-' || lpad((floor(random() * 1000000))::integer::text, 6, '0');
      exit when not exists (select 1 from public.rms_loyalty_clients c where c.card_number = v_card_number) or v_attempt > 12;
    end loop;

    v_wallet_token := md5(v_digits || '-' || clock_timestamp()::text || '-' || random()::text);

    insert into public.rms_loyalty_clients(
      name,
      phone,
      birthday,
      notes,
      level,
      bonus_balance,
      total_spent,
      visits_count,
      stamp_count,
      free_drink_balance,
      lifetime_drinks,
      total_drinks,
      vip_level,
      reward_threshold,
      available_rewards,
      card_number,
      wallet_token,
      wallet_enabled,
      is_active,
      public_join_source,
      public_join_branch_id,
      public_join_at
    ) values (
      coalesce(v_name, 'Гость'),
      v_phone,
      p_birthday,
      'Public Loyalty QR registration',
      'drink_card',
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      'classic',
      10,
      0,
      v_card_number,
      v_wallet_token,
      true,
      true,
      coalesce(v_source, 'public_join_qr'),
      coalesce(v_branch, 'BC1'),
      now()
    ) returning rms_loyalty_clients.id into v_client_id;
  end if;

  return query
  select
    c.id,
    c.name,
    c.phone,
    c.card_number,
    c.wallet_token,
    coalesce(c.wallet_enabled, true),
    coalesce(c.stamp_count, 0)::integer,
    coalesce(c.free_drink_balance, 0)::integer,
    coalesce(c.visits_count, 0)::integer,
    coalesce(c.lifetime_drinks, 0)::integer,
    coalesce(c.total_drinks, 0)::integer,
    coalesce(c.vip_level, 'classic')::text,
    coalesce(c.reward_threshold, 10)::integer,
    coalesce(c.available_rewards, coalesce(c.free_drink_balance, 0))::integer,
    c.created_at,
    c.updated_at,
    coalesce(c.is_active, true)
  from public.rms_loyalty_clients c
  where c.id = v_client_id;
end;
$$;

grant execute on function public.rms_loyalty_public_register_secure(text, text, date, text, text) to anon, authenticated;

-- Quick health check:
create or replace function public.rms_loyalty_public_join_health()
returns table(ok boolean, registered_public bigint)
language sql
security definer
set search_path = public
as $$
  select true, count(*) from public.rms_loyalty_clients where public_join_at is not null;
$$;

grant execute on function public.rms_loyalty_public_join_health() to anon, authenticated;

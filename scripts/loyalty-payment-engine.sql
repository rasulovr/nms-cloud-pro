begin;
create table if not exists private.loyalty_bonus_lots (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 customer_id uuid not null references public.qr_loyalty_customers(id),
 ledger_id uuid not null unique references public.qr_loyalty_ledger(id),
 remaining numeric not null check(remaining>=0),
 expires_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists loyalty_bonus_lots_customer on private.loyalty_bonus_lots(organization_id,customer_id);
create table if not exists private.loyalty_payments (
 order_id uuid primary key references public.qr_orders(id),
 organization_id uuid not null references public.organizations(id),
 customer_id uuid not null references public.qr_loyalty_customers(id),
 cash_paid numeric not null, bonus_paid numeric not null,
 program jsonb not null, result jsonb not null,
 confirmed_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table private.loyalty_bonus_lots enable row level security;
alter table private.loyalty_payments enable row level security;
revoke all on private.loyalty_bonus_lots,private.loyalty_payments from public,anon,authenticated;

-- Internal helper: callers must first authorize the organization and card.
create or replace function private.loyalty_conditions(p_org uuid,p_spend numeric)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_program jsonb:=private.loyalty_program(p_org); v_s jsonb; v_t jsonb;
 v_rate numeric; v_name text:='Участник'; v_next jsonb; v_threshold numeric:=0;
begin
 v_s:=v_program->'settings'; v_rate:=(v_s->>'cashback_percent')::numeric;
 for v_t in select value from jsonb_array_elements(v_s->'tiers') loop
   if p_spend>=(v_t->>'min_spend')::numeric then
     v_rate:=(v_t->>'cashback_percent')::numeric; v_name:=v_t->>'name'; v_threshold:=(v_t->>'min_spend')::numeric;
   else v_next:=v_t; exit; end if;
 end loop;
 return v_program||jsonb_build_object('effective_cashback_percent',case when (v_s->>'enabled')::boolean then v_rate else 0 end,
 'tier_name',v_name,'tier_threshold',v_threshold,'next_tier',v_next);
end $$;
revoke all on function private.loyalty_conditions(uuid,numeric) from public,anon,authenticated;

create or replace function private.loyalty_confirm_payment(p_order_id uuid,p_cash_paid numeric,p_bonus_paid numeric,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_order public.qr_orders%rowtype; v_card public.qr_loyalty_customers%rowtype;
 v_previous private.loyalty_payments%rowtype; v_program jsonb; v_s jsonb; v_result jsonb;
 v_balance numeric; v_limit numeric; v_earn numeric:=0; v_due numeric; v_take numeric;
 v_lot private.loyalty_bonus_lots%rowtype; v_ledger uuid; v_expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into v_order from public.qr_orders where id=p_order_id for update;
 if not found or coalesce(private.rms_member_role(v_order.organization_id)::text,'') not in ('owner','admin','manager','cashier')
 or not private.has_active_license(v_order.organization_id,'loyalty')
 or not private.has_active_license(v_order.organization_id,'qr_menu') then
   raise exception 'Order unavailable' using errcode='42501'; end if;
 if p_cash_paid is null or p_bonus_paid is null or p_cash_paid<0 or p_bonus_paid<0
 or p_cash_paid>100000000 or p_bonus_paid>100000000
 or round(p_cash_paid,2)<>p_cash_paid or round(p_bonus_paid,2)<>p_bonus_paid then raise exception 'Invalid payment amount'; end if;
 select * into v_previous from private.loyalty_payments where order_id=p_order_id;
 if found then
   if v_previous.cash_paid<>p_cash_paid or v_previous.bonus_paid<>p_bonus_paid then raise exception 'Order already settled with different amounts'; end if;
   return v_previous.result;
 end if;
 if v_order.status not in ('confirmed','preparing','ready','payment_requested') or v_order.paid_at is not null
 or v_order.subtotal<=0 or v_order.subtotal>100000000 or round(v_order.subtotal,2)<>v_order.subtotal
 or p_cash_paid+p_bonus_paid<>v_order.subtotal then raise exception 'Order is not payable or amounts do not match'; end if;
 if not exists(select 1 from public.qr_branches where id=v_order.branch_id and organization_id=v_order.organization_id and is_active)
 or not exists(select 1 from public.qr_tables where id=v_order.table_id and branch_id=v_order.branch_id and organization_id=v_order.organization_id) then
   raise exception 'Order establishment mismatch' using errcode='42501'; end if;
 -- Rule changes and settlement serialize against the organization; concurrent checks against one card serialize here.
 perform 1 from public.organizations where id=v_order.organization_id for share;
 select * into v_card from public.qr_loyalty_customers where id=v_order.customer_id and organization_id=v_order.organization_id for update;
 if not found or v_card.is_blocked then raise exception 'Loyalty card unavailable'; end if;
 v_program:=private.loyalty_conditions(v_order.organization_id,v_card.lifetime_spend); v_s:=v_program->'settings';
 if p_expected_version is distinct from (v_program->>'version')::integer then raise exception 'Rules changed. Refresh the payment calculation.' using errcode='40001'; end if;
 -- Expiry is attached to each earning, so later rule changes never alter existing bonuses.
 for v_lot in select * from private.loyalty_bonus_lots where customer_id=v_card.id and organization_id=v_order.organization_id
 and remaining>0 and expires_at<=now() for update loop
   insert into public.qr_loyalty_ledger(customer_id,organization_id,entry_type,amount,description)
   values(v_card.id,v_order.organization_id,'expire',-v_lot.remaining,'Истёк срок действия бонусов');
   update private.loyalty_bonus_lots set remaining=0 where id=v_lot.id;
 end loop;
 select coalesce(sum(remaining),0) into v_balance from private.loyalty_bonus_lots where customer_id=v_card.id
 and organization_id=v_order.organization_id and (expires_at is null or expires_at>now());
 v_limit:=least(v_balance,trunc(v_order.subtotal*(v_s->>'max_redeem_percent')::numeric)/100);
 if not (v_s->>'enabled')::boolean or v_balance<(v_s->>'min_redeem_balance')::numeric then v_limit:=0; end if;
 if p_bonus_paid>v_limit then raise exception 'Bonus payment exceeds the available balance or brand limit'; end if;
 if p_bonus_paid>0 then
   v_due:=p_bonus_paid;
   for v_lot in select * from private.loyalty_bonus_lots where customer_id=v_card.id and organization_id=v_order.organization_id
   and remaining>0 and (expires_at is null or expires_at>now()) order by expires_at nulls last,created_at,id for update loop
     v_take:=least(v_due,v_lot.remaining);
     update private.loyalty_bonus_lots set remaining=remaining-v_take where id=v_lot.id;
     v_due:=v_due-v_take; exit when v_due=0;
   end loop;
   if v_due<>0 then raise exception 'Insufficient bonus balance'; end if;
   insert into public.qr_loyalty_ledger(customer_id,organization_id,order_id,entry_type,amount,description)
   values(v_card.id,v_order.organization_id,p_order_id,'redeem',-p_bonus_paid,'Оплата бонусами · чек '||v_order.order_number);
 end if;
 if p_cash_paid>=(v_s->>'min_purchase')::numeric then
   v_earn:=trunc(p_cash_paid*(v_program->>'effective_cashback_percent')::numeric)/100;
 end if;
 if v_earn>0 then
   if v_s->'expiry_days'<>'null'::jsonb then v_expiry:=now()+make_interval(days=>(v_s->>'expiry_days')::integer); end if;
   insert into public.qr_loyalty_ledger(customer_id,organization_id,order_id,entry_type,amount,description)
   values(v_card.id,v_order.organization_id,p_order_id,'earn',v_earn,'Начисление · чек '||v_order.order_number) returning id into v_ledger;
   insert into private.loyalty_bonus_lots(organization_id,customer_id,ledger_id,remaining,expires_at)
   values(v_order.organization_id,v_card.id,v_ledger,v_earn,v_expiry);
 end if;
 update public.qr_loyalty_customers set lifetime_spend=lifetime_spend+p_cash_paid,visits=visits+1,updated_at=now() where id=v_card.id;
 update public.qr_orders set status='paid',bonus_reserved=p_bonus_paid,payable_amount=p_cash_paid,
 paid_amount=p_cash_paid,paid_at=now(),updated_at=now() where id=p_order_id;
 v_result:=jsonb_build_object('order_id',p_order_id,'cash_paid',p_cash_paid,'bonus_paid',p_bonus_paid,'earned',v_earn,
 'available_bonus',v_balance-p_bonus_paid+v_earn,'program_version',(v_program->>'version')::integer,'expires_at',v_expiry);
 insert into private.loyalty_payments(order_id,organization_id,customer_id,cash_paid,bonus_paid,program,result,confirmed_by)
 values(p_order_id,v_order.organization_id,v_card.id,p_cash_paid,p_bonus_paid,v_program,v_result,auth.uid());
 return v_result;
end $$;
create or replace function public.qr_loyalty_confirm_payment(p_order_id uuid,p_cash_paid numeric,p_bonus_paid numeric,p_expected_version integer)
returns jsonb language sql security invoker set search_path='' as $$ select private.loyalty_confirm_payment(p_order_id,p_cash_paid,p_bonus_paid,p_expected_version); $$;
revoke all on function private.loyalty_confirm_payment(uuid,numeric,numeric,integer),public.qr_loyalty_confirm_payment(uuid,numeric,numeric,integer) from public,anon;
grant execute on function private.loyalty_confirm_payment(uuid,numeric,numeric,integer),public.qr_loyalty_confirm_payment(uuid,numeric,numeric,integer) to authenticated;
create or replace function private.loyalty_pending_payments(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(private.rms_member_role(p_organization_id)::text,'') not in ('owner','admin','manager','cashier')
 or not private.has_active_license(p_organization_id,'loyalty') or not private.has_active_license(p_organization_id,'qr_menu') then
 raise exception 'Payments unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(x.item order by x.created_at desc) from (
 select o.created_at,jsonb_build_object('id',o.id,'order_number',o.order_number,'subtotal',o.subtotal,
 'branch_name',b.name,'customer_name',coalesce(c.display_name,'Гость'), 'member_code',c.id,
 'program',private.loyalty_conditions(p_organization_id,c.lifetime_spend),
 'available_bonus',(select coalesce(sum(remaining),0) from private.loyalty_bonus_lots where organization_id=p_organization_id and customer_id=c.id and (expires_at is null or expires_at>now()))) as item
 from public.qr_orders o join public.qr_loyalty_customers c on c.id=o.customer_id and c.organization_id=o.organization_id
 join public.qr_branches b on b.id=o.branch_id and b.organization_id=o.organization_id
 where o.organization_id=p_organization_id and o.status in ('confirmed','preparing','ready','payment_requested') and o.paid_at is null and not c.is_blocked
 order by o.created_at desc limit 50) x),'[]'::jsonb);
end $$;
create or replace function public.qr_loyalty_pending_payments(p_organization_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.loyalty_pending_payments(p_organization_id); $$;
revoke all on function private.loyalty_pending_payments(uuid),public.qr_loyalty_pending_payments(uuid) from public,anon;
grant execute on function private.loyalty_pending_payments(uuid),public.qr_loyalty_pending_payments(uuid) to authenticated;
commit;

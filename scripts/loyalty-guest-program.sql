begin;
create or replace function private.qr_guest_loyalty(p_branch_code text, p_organization_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
 v_user uuid := auth.uid();
 v_org uuid;
 v_card public.qr_loyalty_customers%rowtype;
 v_history jsonb;
 v_balance numeric;
 v_program jsonb;
begin
 if v_user is null or not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null) then
   raise exception 'Authentication required' using errcode='42501';
 end if;
 select min(b.organization_id::text)::uuid into v_org
 from public.qr_branches b join public.organizations o on o.id=b.organization_id
 where upper(b.code)=upper(trim(p_branch_code)) and b.is_active is true
 and o.status::text='active' and (p_organization_id is null or o.id=p_organization_id)
 having count(distinct b.organization_id)=1;
 if v_org is null or not private.has_active_license(v_org,'loyalty') then
   raise exception 'Loyalty unavailable for this establishment' using errcode='42501';
 end if;
 -- Only identity and tenant may be supplied: financial fields retain database defaults.
 insert into public.qr_loyalty_customers(user_id,organization_id) values(v_user,v_org)
 on conflict(organization_id,user_id) do nothing;
 select * into strict v_card from public.qr_loyalty_customers where user_id=v_user and organization_id=v_org;
 if v_card.is_blocked then raise exception 'Loyalty card unavailable' using errcode='42501'; end if;
 select coalesce(sum(remaining),0) into v_balance from private.loyalty_bonus_lots
 where customer_id=v_card.id and organization_id=v_org and (expires_at is null or expires_at>now());
 v_program:=private.loyalty_conditions(v_org,v_card.lifetime_spend);
 select coalesce(jsonb_agg(x.item order by x.created_at desc,x.id),'[]'::jsonb) into v_history
 from (select l.id,l.created_at,jsonb_build_object('id',l.id,'kind',l.entry_type,'amount',l.amount,
 'description',l.description,'created_at',l.created_at) as item
 from public.qr_loyalty_ledger l where l.customer_id=v_card.id and l.organization_id=v_org
 order by l.created_at desc,l.id limit 100) x;
 return jsonb_build_object('id',v_card.id,'organization_id',v_org,
 'member_code',v_card.id::text,'tier_name',v_program->>'tier_name','program',v_program,
 'available_bonus',greatest(v_balance,0),'lifetime_spend',v_card.lifetime_spend,
 'visits',v_card.visits,'history',v_history);
end $fn$;
revoke all on function private.qr_guest_loyalty(text,uuid) from public,anon;
grant execute on function private.qr_guest_loyalty(text,uuid) to authenticated;
create or replace function public.qr_get_my_loyalty(p_branch_code text,p_organization_id uuid default null)
returns jsonb language sql security invoker set search_path = ''
as $fn$ select private.qr_guest_loyalty(p_branch_code,p_organization_id); $fn$;
revoke all on function public.qr_get_my_loyalty(text,uuid) from public,anon;
grant execute on function public.qr_get_my_loyalty(text,uuid) to authenticated;
commit;

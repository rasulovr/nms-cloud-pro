begin;
-- Test fixtures and assertions are always rolled back. Run in SaaS only after loading the three loyalty scripts.
insert into auth.users(id,email,email_confirmed_at,role,aud) values
('f7392000-0000-4000-8000-000000000001','loyalty-owner-test@example.invalid',now(),'authenticated','authenticated'),
('f7392000-0000-4000-8000-000000000002','loyalty-guest-test@example.invalid',now(),'authenticated','authenticated');
insert into public.organization_members(organization_id,user_id,role) values
('1f0abf22-40e8-4324-a071-f21fc2f92c7b','f7392000-0000-4000-8000-000000000001','owner');
select set_config('request.jwt.claim.sub','f7392000-0000-4000-8000-000000000002',true);
select set_config('test.loyalty_card',public.qr_get_my_loyalty('BC!')->>'id',true);
select set_config('request.jwt.claim.sub','f7392000-0000-4000-8000-000000000001',true);
insert into public.qr_orders(id,order_number,branch_id,table_id,customer_id,status,subtotal,payable_amount,organization_id)
overriding system value
select ('f7392000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,-990000-n,
'79ee50fb-8766-48dd-82aa-edd96ee4b59d','e0142a21-736b-4cf7-ad4a-b182fc9e93b0',
current_setting('test.loyalty_card')::uuid,case when n=15 then 'new' else 'confirmed' end,
case when n=11 then 20 when n=12 then 10 when n=13 then 100 else 20 end,
case when n=11 then 20 when n=12 then 10 when n=13 then 100 else 20 end,
'1f0abf22-40e8-4324-a071-f21fc2f92c7b' from generate_series(11,15) n;
set local role authenticated;
do $$
declare v jsonb; s jsonb; r jsonb; r2 jsonb; ok boolean;
begin
 v:=public.qr_loyalty_admin_programs();
 s:='{"name":"Rollback test","enabled":true,"cashback_percent":5,"max_redeem_percent":30,"min_purchase":10,"min_redeem_balance":0,"expiry_days":365,"tiers":[{"name":"Plus","min_spend":50,"cashback_percent":10}]}'::jsonb;
 v:=public.qr_loyalty_save_program('1f0abf22-40e8-4324-a071-f21fc2f92c7b',s,0);
 assert (v->>'version')::int=1,'saved revision';
 ok:=false;
 begin perform public.qr_loyalty_save_program('1f0abf22-40e8-4324-a071-f21fc2f92c7b',s,0); ok:=true; exception when serialization_failure then null; end;
 assert not ok,'stale revision rejected';
 ok:=false;
 begin perform public.qr_loyalty_save_program('1f0abf22-40e8-4324-a071-f21fc2f92c7b',s||'{"cashback_percent":101}',1); ok:=true; exception when raise_exception then null; end;
 assert not ok,'invalid percent rejected';
 ok:=false;
 begin perform public.qr_loyalty_save_program('1f0abf22-40e8-4324-a071-f21fc2f92c7b',s||'{"tiers":[{"name":"Bad","min_spend":-0.5,"cashback_percent":5}]}',1); ok:=true; exception when raise_exception then null; end;
 assert not ok,'negative tier rejected';
 r:=public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000011',20,0,1);
 assert (r->>'earned')::numeric=1,'20 paid earns 1 at 5 percent';
 r2:=public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000011',20,0,1);
 assert r=r2,'duplicate returns same receipt';
 ok:=false;
 begin perform public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000012',8,2,1); ok:=true; exception when raise_exception then null; end;
 assert not ok,'insufficient balance rejected';
 r:=public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000012',9,1,1);
 assert (r->>'earned')::numeric=0 and (r->>'available_bonus')::numeric=0,'below cash minimum and redemption';
 r:=public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000013',100,0,1);
 assert (r->>'earned')::numeric=5,'threshold evaluated before payment';
 r:=public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000014',17,3,1);
 assert (r->>'earned')::numeric=1.7 and (r->>'available_bonus')::numeric=3.7,'tier percent applies only to cash';
 ok:=false;
 begin perform public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000015',20,0,1); ok:=true; exception when raise_exception then null; end;
 assert not ok,'unconfirmed order rejected';
 perform set_config('request.jwt.claim.sub','f7392000-0000-4000-8000-000000000002',true);
 v:=public.qr_get_my_loyalty('BC!');
 assert (v->>'available_bonus')::numeric=3.7 and (v->>'visits')::int=4,'guest actual balance and no repeated visit';
 assert v->>'tier_name'='Plus','guest reads owner tiers';
 ok:=false;
 begin perform public.qr_loyalty_save_program('1f0abf22-40e8-4324-a071-f21fc2f92c7b',s,1); ok:=true; exception when insufficient_privilege then null; end;
 assert not ok,'guest cannot change conditions';
 ok:=false;
 begin perform public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000015',20,0,1); ok:=true; exception when insufficient_privilege then null; end;
 assert not ok,'guest cannot confirm payment';
 assert not exists(select 1 from public.qr_loyalty_customers where id=current_setting('test.loyalty_card')::uuid),'guest cannot bypass RPC';
end $$;
reset role;
-- Expire an unspent lot, then change rules; neither action rewrites earlier receipts.
update private.loyalty_bonus_lots set expires_at=now()-interval '1 day' where customer_id=current_setting('test.loyalty_card')::uuid and remaining=2;
set local role authenticated;
do $$
declare v jsonb; s jsonb;
begin
 v:=public.qr_get_my_loyalty('BC!');
 assert (v->>'available_bonus')::numeric=1.7,'expired unspent lot not available';
 perform set_config('request.jwt.claim.sub','f7392000-0000-4000-8000-000000000001',true);
 s:='{"name":"Disabled revision","enabled":false,"cashback_percent":25,"max_redeem_percent":80,"min_purchase":0,"min_redeem_balance":0,"expiry_days":null,"tiers":[]}'::jsonb;
 v:=public.qr_loyalty_save_program('1f0abf22-40e8-4324-a071-f21fc2f92c7b',s,1);
 assert (v->>'version')::int=2,'owner may change all parameters';
 v:=public.qr_loyalty_confirm_payment('f7392000-0000-4000-8000-000000000011',20,0,1);
 assert (v->>'earned')::numeric=1 and (v->>'program_version')::int=1,'old receipt survives rule changes';
 perform set_config('request.jwt.claim.sub','f7392000-0000-4000-8000-000000000002',true);
 v:=public.qr_get_my_loyalty('BC!');
 assert (v->'program'->>'effective_cashback_percent')::numeric=0,'disabled program cannot earn';
end $$;
reset role;
do $$
begin
 assert (select count(*)=4 from private.loyalty_payments where customer_id=current_setting('test.loyalty_card')::uuid),'one record per payment';
 assert (select sum(amount)=3.7 from public.qr_loyalty_ledger where customer_id=current_setting('test.loyalty_card')::uuid),'ledger reconciles';
 assert not has_function_privilege('anon','public.qr_loyalty_confirm_payment(uuid,numeric,numeric,integer)','EXECUTE'),'anonymous denied';
end $$;
select 'PASS: owner settings, revision conflicts, validation, earning, redemption, minimum, tiers, idempotency, ledger, guest isolation' as result;

rollback;

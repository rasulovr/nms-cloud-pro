-- Install only after explicit approval of this scoped role/grant/policy change.
-- No business rows are changed by installation. Existing RLS and the 24-hour
-- advance edit guard stay unchanged. The original journal is retained intact.
create role rms_payroll_reclassifier nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
grant rms_payroll_reclassifier to postgres;
grant usage on schema public, auth, rms_payroll_private to rms_payroll_reclassifier;
grant execute on function auth.uid(), rms_payroll_private.can_write() to rms_payroll_reclassifier;
grant select on public.salary_advances, public.salary_payments, public.salary_periods to rms_payroll_reclassifier;
grant update(is_cancelled,cancelled_at,cancelled_by,cancel_comment) on public.salary_advances to rms_payroll_reclassifier;
grant insert(employee_id,branch_id,advance_date,amount,comment,operation_type,created_by,updated_by) on public.salary_advances to rms_payroll_reclassifier;
grant insert(employee_id,branch_id,salary_month,payment_date,amount,method,comment,created_by) on public.salary_payments to rms_payroll_reclassifier;
grant update(advance_amount,salary_net) on public.salary_periods to rms_payroll_reclassifier;
grant insert(user_id,action,table_name,record_id,old_data,new_data) on public.audit_logs to rms_payroll_reclassifier;
create policy reclassify_advance_read on public.salary_advances for select to rms_payroll_reclassifier using ((select rms_payroll_private.can_write()));
create policy reclassify_advance_cancel on public.salary_advances for update to rms_payroll_reclassifier using ((select rms_payroll_private.can_write())) with check ((select rms_payroll_private.can_write()));
create policy reclassify_advance_insert on public.salary_advances for insert to rms_payroll_reclassifier with check ((select rms_payroll_private.can_write()));
create policy reclassify_payment_read on public.salary_payments for select to rms_payroll_reclassifier using ((select rms_payroll_private.can_write()));
create policy reclassify_payment_insert on public.salary_payments for insert to rms_payroll_reclassifier with check ((select rms_payroll_private.can_write()));
create policy reclassify_period_read on public.salary_periods for select to rms_payroll_reclassifier using ((select rms_payroll_private.can_write()));
create policy reclassify_period_mirrors on public.salary_periods for update to rms_payroll_reclassifier using ((select rms_payroll_private.can_write())) with check ((select rms_payroll_private.can_write()));
create policy reclassify_audit_insert on public.audit_logs for insert to rms_payroll_reclassifier with check (user_id=(select auth.uid()) and (select rms_payroll_private.can_write()));

create table rms_payroll_private.reclassifications (
  id uuid primary key,
  request_key text not null unique check(length(request_key) between 1 and 300),
  original_advance_id uuid not null unique references public.salary_advances(id),
  actor_id uuid not null references auth.users(id),
  operation jsonb not null,
  before_data jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table rms_payroll_private.reclassifications enable row level security;
revoke all on table rms_payroll_private.reclassifications from public, anon, authenticated;
grant select,insert on table rms_payroll_private.reclassifications to rms_payroll_reclassifier;
create policy reclassify_request_read on rms_payroll_private.reclassifications for select to rms_payroll_reclassifier using ((select rms_payroll_private.can_write()));
create policy reclassify_request_insert on rms_payroll_private.reclassifications for insert to rms_payroll_reclassifier with check (actor_id=(select auth.uid()) and (select rms_payroll_private.can_write()));

create function rms_payroll_private.reclassify_advance(p_request_key text, p_operation jsonb)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_key text := btrim(p_request_key);
  v_saved rms_payroll_private.reclassifications%rowtype;
  v_source public.salary_advances%rowtype;
  v_residual public.salary_advances%rowtype;
  v_payment public.salary_payments%rowtype;
  v_current public.salary_periods%rowtype;
  v_target public.salary_periods%rowtype;
  v_month date;
  v_target_month date := (p_operation->>'salary_month')::date;
  v_amount numeric := (p_operation->>'amount')::numeric;
  v_reason text := btrim(p_operation->>'reason');
  v_audit uuid := gen_random_uuid();
  v_before jsonb;
  v_result jsonb;
  v_source_key text;
  v_comment text;
  v_debt numeric;
  v_total numeric;
  v_residual_json jsonb := null;
begin
  if v_uid is null then raise exception using errcode='28000', message='Authentication required'; end if;
  if not rms_payroll_private.can_write() then
    raise exception using errcode='42501', message='Payroll write access requires an active linked RMS administrator';
  end if;
  if v_key is null or length(v_key) not between 1 and 300 then raise exception 'A valid reclassification request key is required'; end if;
  if jsonb_typeof(p_operation) is distinct from 'object' or not p_operation ?& array['advance_id','employee_id','branch_id','salary_month','amount','reason','expected','expected_periods'] then
    raise exception 'A complete reviewed reclassification is required';
  end if;
  if v_reason is null or length(v_reason) not between 3 and 1000 then raise exception 'A correction reason of 3 to 1000 characters is required'; end if;
  if v_reason like '%source_key=%' then raise exception 'The correction reason cannot contain a source key'; end if;
  if v_amount is null or v_amount::text in ('NaN','Infinity','-Infinity') or v_amount<=0 or v_amount<>round(v_amount,2) then raise exception 'Correction amount must be positive with at most two decimals'; end if;
  perform pg_advisory_xact_lock(hashtextextended('payroll-request:reclass:'||v_key,0));
  select * into v_saved from rms_payroll_private.reclassifications where request_key=v_key;
  if found then
    if v_saved.actor_id is distinct from v_uid or v_saved.operation is distinct from p_operation then raise exception 'Reclassification request key was already used for different data'; end if;
    v_result:=v_saved.result;
    if not exists(select 1 from public.salary_advances a where a.id=v_saved.original_advance_id and to_jsonb(a)=to_jsonb(jsonb_populate_record(null::public.salary_advances,v_result->'advance')))
       or not exists(select 1 from public.salary_payments p where p.id=(v_result->'payment'->>'id')::uuid and to_jsonb(p)=to_jsonb(jsonb_populate_record(null::public.salary_payments,v_result->'payment')))
       or (v_result->'residual_advance'<>'null'::jsonb and not exists(select 1 from public.salary_advances a where a.id=(v_result->'residual_advance'->>'id')::uuid and to_jsonb(a)=to_jsonb(jsonb_populate_record(null::public.salary_advances,v_result->'residual_advance')))) then
      raise exception using errcode='40001',message='Saved reclassification journals changed or were cancelled; review history before continuing';
    end if;
    return jsonb_build_object('replayed',true,'operation',v_result);
  end if;
  v_source_key:=substring(coalesce(p_operation->'expected'->>'comment','') from 'source_key=([^;[:space:]]+)');
  if v_source_key is not null then perform pg_advisory_xact_lock(hashtextextended('payroll-source:'||v_source_key,0)); end if;
  perform pg_advisory_xact_lock(hashtextextended('payroll-employee:'||(p_operation->>'employee_id'),0));
  select * into v_source from public.salary_advances where id=(p_operation->>'advance_id')::uuid for update;
  if not found or v_source.employee_id is distinct from (p_operation->>'employee_id')::uuid or v_source.branch_id is distinct from nullif(p_operation->>'branch_id','')::uuid then
    raise exception using errcode='40001',message='Original advance identity changed or was not found';
  end if;
  if v_source.is_cancelled or v_source.operation_type<>'advance' or v_source.amount<=0 then raise exception 'Only an active positive advance can be reclassified'; end if;
  if jsonb_typeof(p_operation->'expected') is distinct from 'object' or not (p_operation->'expected') ?& array['id','employee_id','branch_id','advance_date','amount','operation_type','is_cancelled','comment','updated_at']
    or to_jsonb(v_source) is distinct from to_jsonb(jsonb_populate_record(null::public.salary_advances,p_operation->'expected')) then
    raise exception using errcode='40001',message='Original advance changed since review; reload before saving';
  end if;
  if exists(select 1 from rms_payroll_private.reclassifications where original_advance_id=v_source.id) then raise exception 'Original advance was already reclassified'; end if;
  if v_amount>v_source.amount then raise exception 'Correction exceeds the original advance'; end if;
  v_month:=date_trunc('month',v_source.advance_date)::date;
  if v_target_month is null or v_target_month<>date_trunc('month',v_target_month)::date or v_target_month>=v_month then raise exception 'Choose an existing earlier salary month'; end if;
  -- Use the same employee lock as normal payroll writes, then lock periods in
  -- chronological order. No caller can supply a replacement payment date/method.
  select * into v_target from public.salary_periods where employee_id=v_source.employee_id and salary_month=v_target_month for update;
  if not found then raise exception 'Existing settlement salary period is required'; end if;
  select * into v_current from public.salary_periods where employee_id=v_source.employee_id and salary_month=v_month for update;
  if not found then raise exception 'Existing advance salary period is required'; end if;
  if v_target.branch_id is distinct from v_source.branch_id or v_current.branch_id is distinct from v_source.branch_id then raise exception 'Source and both salary periods must have the same employee and branch'; end if;
  if jsonb_typeof(p_operation->'expected_periods') is distinct from 'object'
    or not (p_operation->'expected_periods'->'advance') ? 'updated_at'
    or not (p_operation->'expected_periods'->'settlement') ? 'updated_at'
    or to_jsonb(v_current) is distinct from to_jsonb(jsonb_populate_record(null::public.salary_periods,p_operation->'expected_periods'->'advance'))
    or to_jsonb(v_target) is distinct from to_jsonb(jsonb_populate_record(null::public.salary_periods,p_operation->'expected_periods'->'settlement')) then
    raise exception using errcode='40001',message='Salary period changed since review; reload before saving';
  end if;
  select greatest(0,coalesce((select sum(salary_gross-advance_amount-deduction_amount) from public.salary_periods where employee_id=v_source.employee_id and salary_month<v_month),0)
    -coalesce((select sum(amount) from public.salary_payments where employee_id=v_source.employee_id and salary_month<v_month and is_cancelled is not true),0)) into v_debt;
  if v_amount>v_debt then raise exception 'Correction exceeds the remaining prior salary debt'; end if;
  v_before:=jsonb_build_object('advance',to_jsonb(v_source),'advance_period',to_jsonb(v_current),'settlement_period',to_jsonb(v_target),'prior_debt',v_debt);
  v_comment:='reclassification='||v_audit::text||'; original_advance='||v_source.id::text||'; '||v_reason;
  -- A pure soft-cancel retains financial fields/provenance and respects the
  -- existing age guard. Never call the legacy cancellation RPC.
  update public.salary_advances set is_cancelled=true,cancelled_at=now(),cancelled_by=v_uid,cancel_comment=v_comment where id=v_source.id returning * into v_source;
  if not found then raise exception 'Original advance cancellation was denied'; end if;
  if v_source.amount-v_amount>0 then
    insert into public.salary_advances(employee_id,branch_id,advance_date,amount,comment,operation_type,created_by,updated_by)
    values(v_source.employee_id,v_source.branch_id,v_source.advance_date,v_source.amount-v_amount,'source_key=payroll-reclass:'||v_audit::text||':advance; '||v_comment,'advance',v_uid,v_uid)
    returning * into v_residual;
    v_residual_json:=to_jsonb(v_residual);
  end if;
  insert into public.salary_payments(employee_id,branch_id,salary_month,payment_date,amount,method,comment,created_by)
  values(v_source.employee_id,v_source.branch_id,v_target_month,v_source.advance_date,v_amount,'cash','source_key=payroll-reclass:'||v_audit::text||':payment; '||v_comment,v_uid)
  returning * into v_payment;
  if v_source.amount<>coalesce(v_residual.amount,0)+v_payment.amount then raise exception 'Reclassification does not conserve the original payout'; end if;
  select coalesce(sum(amount),0) into v_total from public.salary_advances where employee_id=v_source.employee_id and advance_date>=v_month and advance_date<(v_month+interval '1 month')::date and is_cancelled is not true;
  update public.salary_periods set advance_amount=v_total,salary_net=salary_gross-deduction_amount-v_total where id=v_current.id returning * into v_current;
  if not found then raise exception 'Advance period reconciliation was denied'; end if;
  select coalesce(sum(amount),0) into v_total from public.salary_advances where employee_id=v_source.employee_id and advance_date>=v_target_month and advance_date<(v_target_month+interval '1 month')::date and is_cancelled is not true;
  update public.salary_periods set advance_amount=v_total,salary_net=salary_gross-deduction_amount-v_total where id=v_target.id returning * into v_target;
  if not found then raise exception 'Settlement period reconciliation was denied'; end if;
  v_result:=jsonb_build_object('type','advance_reclassification','id',v_payment.id,'audit_id',v_audit,'original_advance_id',v_source.id,'advance',to_jsonb(v_source),'residual_advance',v_residual_json,'payment',to_jsonb(v_payment),'advance_period',to_jsonb(v_current),'settlement_period',to_jsonb(v_target));
  insert into public.audit_logs(user_id,action,table_name,record_id,old_data,new_data)
  values(v_uid,'update','salary_advance_reclassification',v_source.id,v_before,v_result||jsonb_build_object('request_key',v_key,'reason',v_reason));
  insert into rms_payroll_private.reclassifications(id,request_key,original_advance_id,actor_id,operation,before_data,result)
  values(v_audit,v_key,v_source.id,v_uid,p_operation,v_before,v_result);
  return jsonb_build_object('replayed',false,'operation',v_result);
end;
$fn$;
revoke all on function rms_payroll_private.reclassify_advance(text,jsonb) from public,anon,authenticated;
-- A fixed private transaction runs as a non-login, non-bypass role, with only
-- the listed columns available and RLS still enforced. No user gets this role.
grant create on schema rms_payroll_private to rms_payroll_reclassifier;
alter function rms_payroll_private.reclassify_advance(text,jsonb) owner to rms_payroll_reclassifier;
revoke create on schema rms_payroll_private from rms_payroll_reclassifier;
revoke rms_payroll_reclassifier from postgres;
grant execute on function rms_payroll_private.reclassify_advance(text,jsonb) to authenticated;
create function public.rms_reclassify_salary_advance(p_request_key text,p_operation jsonb)
returns jsonb language sql security invoker set search_path=pg_catalog
as $fn$ select rms_payroll_private.reclassify_advance(p_request_key,p_operation); $fn$;
revoke all on function public.rms_reclassify_salary_advance(text,jsonb) from public,anon;
grant execute on function public.rms_reclassify_salary_advance(text,jsonb) to authenticated;
create function public.rms_payroll_can_write()
returns boolean language sql stable security invoker set search_path=pg_catalog
as $fn$ select rms_payroll_private.can_write(); $fn$;
revoke all on function public.rms_payroll_can_write() from public,anon;
grant execute on function public.rms_payroll_can_write() to authenticated;
notify pgrst,'reload schema';

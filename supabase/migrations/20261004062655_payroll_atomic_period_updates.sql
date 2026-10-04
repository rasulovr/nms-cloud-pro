-- Atomic payroll writes. Apply only after explicit database-security approval.
-- No financial rows are changed by installing this migration.
-- The access policy is intentionally limited to already-linked RMS administrators.
-- Payroll transaction bodies run as the caller and obey RLS.

create schema if not exists rms_payroll_private;
revoke all on schema rms_payroll_private from public, anon, authenticated;
grant usage on schema rms_payroll_private to authenticated;

-- This helper only reads the protected, server-managed account link. Profiles
-- alone are not used as a trusted privilege boundary.
create or replace function rms_payroll_private.can_write()
returns boolean language sql stable security definer
set search_path = pg_catalog
as $fn$
  select auth.uid() is not null and exists (
    select 1 from public.rms_internal_auth_accounts a
    join public.user_profiles p on p.id = a.auth_user_id
    where a.auth_user_id = auth.uid() and a.is_active is true and a.is_admin is true and p.is_active is true
  ) and public.rms_has_permission(auth.uid(), 'salary.write');
$fn$;
revoke all on function rms_payroll_private.can_write() from public, anon;
grant execute on function rms_payroll_private.can_write() to authenticated;

create policy rms_salary_periods_linked_admin_update
on public.salary_periods for update to authenticated
using ((select rms_payroll_private.can_write()))
with check ((select rms_payroll_private.can_write()));

create table rms_payroll_private.requests (
  request_key text primary key check (length(request_key) between 1 and 300),
  actor_id uuid not null references auth.users(id),
  operations jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table rms_payroll_private.requests enable row level security;
revoke all on table rms_payroll_private.requests from public, anon, authenticated;
grant select, insert on table rms_payroll_private.requests to authenticated;
create policy payroll_requests_select on rms_payroll_private.requests
for select to authenticated using ((select rms_payroll_private.can_write()));
create policy payroll_requests_insert on rms_payroll_private.requests
for insert to authenticated with check (
  actor_id = (select auth.uid()) and (select rms_payroll_private.can_write())
);

create or replace function public.rms_payroll_write_atomic(
  p_request_key text,
  p_operations jsonb
)
returns jsonb language plpgsql security invoker
set search_path = pg_catalog, public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_key text := btrim(p_request_key);
  v_saved rms_payroll_private.requests%rowtype;
  v_op jsonb;
  v_type text;
  v_employee uuid;
  v_branch uuid;
  v_month date;
  v_date date;
  v_amount numeric;
  v_comment text;
  v_source text;
  v_count integer;
  v_id uuid;
  v_patch jsonb;
  v_field text;
  v_source_lock text;
  v_replay jsonb;
  v_replay_index integer := 0;
  v_prior_debt numeric;
  v_debt_month date;
  v_period public.salary_periods%rowtype;
  v_advance public.salary_advances%rowtype;
  v_payment public.salary_payments%rowtype;
  v_total numeric;
  v_result jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if not rms_payroll_private.can_write() then
    raise exception using errcode = '42501', message = 'Payroll write access requires an active linked RMS administrator';
  end if;
  if v_key is null or length(v_key) not between 1 and 300 then
    raise exception using errcode = '22023', message = 'A valid payroll request key is required';
  end if;
  if jsonb_typeof(p_operations) is distinct from 'array'
     or jsonb_array_length(p_operations) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Provide between 1 and 200 payroll operations';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('payroll-request:' || v_key, 0));
  select * into v_saved from rms_payroll_private.requests where request_key = v_key;
  if found then
    if v_saved.operations is distinct from p_operations then
      raise exception using errcode = '22023', message = 'Payroll request key was already used for different data';
    end if;
    for v_replay in select * from jsonb_array_elements(v_saved.result) loop
      v_op := p_operations->v_replay_index;
      if v_replay->>'type' = 'advance' and not exists (
        select 1 from public.salary_advances where id=(v_replay->>'id')::uuid and is_cancelled is not true
          and employee_id=(v_op->>'employee_id')::uuid and branch_id is not distinct from nullif(v_op->>'branch_id','')::uuid
          and advance_date=(v_op->>'advance_date')::date and amount=(v_op->>'amount')::numeric and operation_type='advance'
      ) then raise exception 'The saved advance was changed, cancelled or is no longer available'; end if;
      if v_replay->>'type' = 'payment' and not exists (
        select 1 from public.salary_payments where id=(v_replay->>'id')::uuid and is_cancelled is not true
          and employee_id=(v_op->>'employee_id')::uuid and branch_id is not distinct from nullif(v_op->>'branch_id','')::uuid
          and salary_month=(v_op->>'salary_month')::date and payment_date=(v_op->>'payment_date')::date
          and amount=(v_op->>'amount')::numeric and method=v_op->>'method'
      ) then raise exception 'The saved payment was changed, cancelled or is no longer available'; end if;
      v_replay_index := v_replay_index + 1;
    end loop;
    return jsonb_build_object('replayed', true, 'operations', v_saved.result);
  end if;

  for v_source_lock in
    select distinct substring(coalesce(j->>'comment', '') from 'source_key=([^;[:space:]]+)')
    from jsonb_array_elements(p_operations) j order by 1
  loop
    if v_source_lock is not null then
      perform pg_advisory_xact_lock(hashtextextended('payroll-source:' || v_source_lock, 0));
    end if;
  end loop;

  -- One consistent employee lock order serializes all payroll write/reconcile
  -- operations, including operations that touch more than one month.
  for v_employee in
    select distinct (j->>'employee_id')::uuid from jsonb_array_elements(p_operations) j order by 1
  loop
    if v_employee is null then raise exception 'employee_id is required'; end if;
    perform pg_advisory_xact_lock(hashtextextended('payroll-employee:' || v_employee::text, 0));
  end loop;

  for v_op in select * from jsonb_array_elements(p_operations) loop
    v_type := v_op->>'type';
    v_employee := (v_op->>'employee_id')::uuid;
    v_branch := nullif(v_op->>'branch_id', '')::uuid;
    v_id := null;
    if (select count(*) from regexp_matches(coalesce(v_op->>'comment',''), 'source_key=', 'g')) > 1 then
      raise exception 'Only one source_key is allowed per payroll journal';
    end if;
    if not exists (select 1 from public.employees where id = v_employee) then
      raise exception 'Payroll employee not found';
    end if;
    if v_type in ('advance', 'payment') then
      if not (v_op ? 'branch_id') or not exists (
        select 1 from public.employees where id = v_employee and branch_id is not distinct from v_branch
      ) then raise exception 'Employee branch changed; reload before saving'; end if;
      v_amount := (v_op->>'amount')::numeric;
      if v_amount is null or v_amount::text in ('NaN', 'Infinity', '-Infinity') or v_amount <= 0 or v_amount <> round(v_amount, 2) then
        raise exception 'Payroll amount must be positive and have at most two decimal places';
      end if;
      if v_op ? 'expected_prior_debt' then
        v_debt_month := coalesce((v_op->>'debt_month')::date, date_trunc('month', case when v_type='advance' then (v_op->>'advance_date')::date else (v_op->>'payment_date')::date end)::date);
        if v_debt_month is null or v_debt_month <> date_trunc('month',v_debt_month)::date then raise exception 'Invalid debt_month'; end if;
        select greatest(0, coalesce((select sum(salary_gross-advance_amount-deduction_amount) from public.salary_periods
          where employee_id=v_employee and salary_month<v_debt_month),0)
          -coalesce((select sum(amount) from public.salary_payments where employee_id=v_employee
            and salary_month<v_debt_month and is_cancelled is not true),0)) into v_prior_debt;
        if v_prior_debt is distinct from (v_op->>'expected_prior_debt')::numeric then
          raise exception using errcode='40001', message='Prior salary debt changed since review; reload before saving';
        end if;
        if v_type='advance' and v_prior_debt>0 then raise exception 'Settle prior salary debt before creating the excess advance'; end if;
        if v_type='payment' and (v_op->>'salary_month')::date<v_debt_month and v_amount>v_prior_debt then
          raise exception 'Prior salary payment exceeds the remaining debt';
        end if;
      end if;
      v_comment := nullif(v_op->>'comment', '');
      v_source := substring(coalesce(v_comment, '') from 'source_key=([^;[:space:]]+)');
      if v_type = 'advance' then
        v_date := (v_op->>'advance_date')::date;
        if v_date is null then raise exception 'advance_date is required'; end if;
        v_month := date_trunc('month', v_date)::date;
        if v_source is not null then
          select count(*) into v_count from public.salary_advances
          where substring(coalesce(comment, '') from 'source_key=([^;[:space:]]+)') = v_source;
          if v_count > 1 then raise exception 'Duplicate legacy advance source key requires review'; end if;
          if v_count = 1 then
            select * into v_advance from public.salary_advances
            where substring(coalesce(comment, '') from 'source_key=([^;[:space:]]+)') = v_source;
            if v_advance.is_cancelled or v_advance.employee_id is distinct from v_employee
              or v_advance.branch_id is distinct from v_branch or v_advance.advance_date is distinct from v_date
              or v_advance.amount is distinct from v_amount or v_advance.operation_type is distinct from 'advance' then
              raise exception 'Existing advance source key conflicts with this operation';
            end if;
            v_id := v_advance.id;
          end if;
        end if;
        if v_id is null then
          insert into public.salary_advances(employee_id, branch_id, advance_date, amount, comment, operation_type, created_by, updated_by)
          values (v_employee, v_branch, v_date, v_amount, v_comment, 'advance', v_uid, v_uid)
          returning id into v_id;
        end if;
      else
        v_date := (v_op->>'payment_date')::date;
        v_month := (v_op->>'salary_month')::date;
        if v_date is null or v_month is null or v_month <> date_trunc('month', v_month)::date then
          raise exception 'Valid payment_date and first-of-month salary_month are required';
        end if;
        if coalesce(v_op->>'method', '') not in ('cash', 'bank', 'card') then raise exception 'Invalid payroll payment method'; end if;
        if v_source is not null then
          select count(*) into v_count from public.salary_payments
          where substring(coalesce(comment, '') from 'source_key=([^;[:space:]]+)') = v_source;
          if v_count > 1 then raise exception 'Duplicate legacy payment source key requires review'; end if;
          if v_count = 1 then
            select * into v_payment from public.salary_payments
            where substring(coalesce(comment, '') from 'source_key=([^;[:space:]]+)') = v_source;
            if v_payment.is_cancelled or v_payment.employee_id is distinct from v_employee
              or v_payment.branch_id is distinct from v_branch or v_payment.payment_date is distinct from v_date
              or v_payment.salary_month is distinct from v_month or v_payment.amount is distinct from v_amount
              or v_payment.method is distinct from (v_op->>'method') then
              raise exception 'Existing payment source key conflicts with this operation';
            end if;
            v_id := v_payment.id;
          end if;
        end if;
        if v_id is null then
          insert into public.salary_payments(employee_id, branch_id, salary_month, payment_date, amount, method, comment, created_by)
          values (v_employee, v_branch, v_month, v_date, v_amount, v_op->>'method', v_comment, v_uid)
          returning id into v_id;
        end if;
      end if;
      -- No rate recalculation or cash/card mirror replacement. Legacy manual
      -- allocation fields and provenance stay exactly as they were.
      select * into v_period from public.salary_periods where employee_id = v_employee and salary_month = v_month for update;
      if not found then
        if exists(select 1 from public.salary_periods where employee_id=v_employee and salary_month=v_month) then
          raise exception using errcode='42501', message='Salary period update was denied';
        end if;
        if v_type='payment' then raise exception 'Existing salary period is required for a salary payment'; end if;
        insert into public.salary_periods(employee_id, branch_id, salary_month, created_by)
        values(v_employee, v_branch, v_month, v_uid) returning * into v_period;
      end if;
    elsif v_type in ('period_patch', 'accrual_patch', 'reconcile') then
      v_month := (v_op->>'salary_month')::date;
      if v_month is null or v_month <> date_trunc('month', v_month)::date then raise exception 'Invalid salary_month'; end if;
      select * into v_period from public.salary_periods where id = (v_op->>'id')::uuid for update;
      if not found or v_period.employee_id is distinct from v_employee or v_period.salary_month is distinct from v_month
        or not (v_op ? 'branch_id') or v_period.branch_id is distinct from v_branch then
        raise exception 'Matched salary period changed or was not found; reload before saving';
      end if;
      if v_type in ('period_patch', 'accrual_patch') then
        if jsonb_typeof(v_op->'expected') is distinct from 'object' or (v_op->'expected') = '{}'::jsonb then
          raise exception 'Expected original values are required for a payroll patch';
        end if;
        if v_type='accrual_patch' and nullif(v_op->'expected'->>'updated_at','') is null then
          raise exception 'The reviewed updated_at is required for a matched accrual patch';
        end if;
        if ((v_op->'expected') ? 'updated_at' and v_period.updated_at is distinct from (v_op->'expected'->>'updated_at')::timestamptz)
          or not to_jsonb(v_period) @> ((v_op->'expected') - 'updated_at') then
          raise exception using errcode = '40001', message = 'Salary period changed since review; reload before saving';
        end if;
        v_patch := v_op->'patch';
        if jsonb_typeof(v_patch) is distinct from 'object' or v_patch = '{}'::jsonb then raise exception 'A payroll patch is required'; end if;
        for v_field in select jsonb_object_keys(v_patch) loop
          if v_type = 'accrual_patch' and v_field not in ('worked_days','salary_gross') then
            raise exception 'Accrual patch may change only worked_days and salary_gross';
          end if;
          if v_field not in ('worked_days', 'salary_gross', 'deduction_amount', 'card_payment', 'cash_payment', 'comment') then
            raise exception 'Unsupported payroll patch field: %', v_field;
          end if;
          if not (v_op->'expected' ? v_field) then raise exception 'Original value missing for patch field: %', v_field; end if;
          if v_field <> 'comment' and (jsonb_typeof(v_patch->v_field) is distinct from 'number'
            or (v_patch->>v_field)::numeric < 0 or (v_patch->>v_field)::numeric <> round((v_patch->>v_field)::numeric, 2)) then
            raise exception 'Invalid payroll numeric value: %', v_field;
          end if;
          if v_field = 'comment' and jsonb_typeof(v_patch->v_field) not in ('string','null') then raise exception 'Invalid payroll comment'; end if;
        end loop;
        update public.salary_periods set
          worked_days = case when v_patch ? 'worked_days' then (v_patch->>'worked_days')::numeric else worked_days end,
          salary_gross = case when v_patch ? 'salary_gross' then (v_patch->>'salary_gross')::numeric else salary_gross end,
          deduction_amount = case when v_patch ? 'deduction_amount' then (v_patch->>'deduction_amount')::numeric else deduction_amount end,
          card_payment = case when v_patch ? 'card_payment' then (v_patch->>'card_payment')::numeric else card_payment end,
          cash_payment = case when v_patch ? 'cash_payment' then (v_patch->>'cash_payment')::numeric else cash_payment end,
          comment = case when v_patch ? 'comment' then v_patch->>'comment' else comment end
        where id = v_period.id returning * into v_period;
        if not found then raise exception 'Salary period update was denied'; end if;
      end if;
      v_id := v_period.id;
    else
      raise exception 'Unsupported payroll operation';
    end if;
    select coalesce(sum(amount), 0) into v_total from public.salary_advances
      where employee_id = v_employee and advance_date >= v_month
        and advance_date < (v_month + interval '1 month')::date and is_cancelled is not true;
    -- Update only the two derived fields. Every journal/patch and mirror update
    -- belongs to this transaction; any error rolls the complete batch back.
    update public.salary_periods set advance_amount = v_total,
      salary_net = salary_gross - deduction_amount - v_total
    where id = v_period.id returning * into v_period;
    if not found then raise exception 'Salary period reconciliation was denied'; end if;
    v_result := v_result || jsonb_build_array(jsonb_build_object('type', v_type, 'id', v_id, 'period', to_jsonb(v_period)));
  end loop;
  insert into rms_payroll_private.requests(request_key, actor_id, operations, result)
    values(v_key, v_uid, p_operations, v_result);
  return jsonb_build_object('replayed', false, 'operations', v_result);
end;
$fn$;
revoke all on function public.rms_payroll_write_atomic(text, jsonb) from public, anon;
grant execute on function public.rms_payroll_write_atomic(text, jsonb) to authenticated;
notify pgrst, 'reload schema';

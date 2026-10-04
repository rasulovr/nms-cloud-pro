-- Preserve the cash-day/month interpretation of reclassified advances.
-- Read-only delta to the existing workspace. No roles, grants, policies,
-- financial rows or the existing function's execution/security mode change.
-- Only verified correction journals linked to originals already included in
-- this workspace are returned; unrelated historical salary payments stay out.
-- Do not expose payment IDs, salary months or private correction/audit metadata.
do $migration$
declare
  v_definition text;
  v_anchor text;
begin
  select replace(pg_get_functiondef('public.rms_revenue_day_workspace(uuid,date)'::regprocedure),E'\r','') into v_definition;
  if md5(v_definition)<>'b2935272368c08771f6b02805a8bbcbf' then
    raise exception 'Revenue workspace changed since review; review the read-side delta before installation';
  end if;
  v_definition:=replace(v_definition,E'begin\n  v_payload := jsonb_build_object(', $body$begin
  with correction_cash as (
    select sa.id,sa.employee_id,sa.branch_id,sa.advance_date as payment_date,sp.amount,
      sa.id as original_advance_id,
      jsonb_build_object('full_name',e.full_name,'position',e.position) as employees,
      jsonb_build_object('name',b.name) as branches
    from rms_payroll_private.reclassifications c
    join public.salary_advances sa on sa.id=c.original_advance_id
    join public.salary_payments sp on sp.id=(c.result->'payment'->>'id')::uuid
    left join public.employees e on e.id=sa.employee_id
    left join public.branches b on b.id=sa.branch_id
    where sa.branch_id=p_branch_id and sa.is_cancelled is true
      and sp.employee_id=sa.employee_id and sp.branch_id is not distinct from sa.branch_id
      and sp.payment_date=sa.advance_date and sp.method='cash' and sp.is_cancelled is not true
      and sp.amount>0 and sp.amount<=sa.amount
      and sp.salary_month=date_trunc('month',(c.result->'payment'->>'salary_month')::date)::date
      and sp.payment_date>=v_month_start and sp.payment_date<v_month_end
  )
  select jsonb_build_object($body$);
  v_definition:=replace(v_definition,E'    ''salary_advances'', coalesce((',E'    ''salary_correction_expenses'', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id),''[]''::jsonb) from correction_cash x where x.payment_date=p_date),\n\n    ''salary_advances'', coalesce((');
  v_anchor:='                  + coalesce((select sum(amount) from public.salary_advances where branch_id = p_branch_id and advance_date >= v_month_start and advance_date < v_month_end and coalesce(is_cancelled, false) = false), 0),';
  if strpos(v_definition,v_anchor)=0 then raise exception 'Revenue advance-total anchor was not found'; end if;
  v_definition:=replace(v_definition,v_anchor,replace(v_anchor,'0),','0) + (select coalesce(sum(amount),0) from correction_cash),')||E'\n      ''reclassification_cash'', (select coalesce(sum(amount),0) from correction_cash),\n      ''reclassification_advance_cash'', coalesce((select sum(amount) from public.salary_advances where branch_id=p_branch_id and advance_date>=v_month_start and advance_date<v_month_end and is_cancelled is not true),0),');
  v_anchor:=E'  );\n\n  return v_payload;';
  if strpos(v_definition,v_anchor)=0 then raise exception 'Revenue payload end anchor was not found'; end if;
  v_definition:=replace(v_definition,v_anchor,E'  ) into v_payload;\n\n  return v_payload;');
  execute v_definition;
end;
$migration$;
notify pgrst,'reload schema';

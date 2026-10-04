CREATE OR REPLACE FUNCTION public.rms_revenue_day_workspace(p_branch_id uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_month_start date := date_trunc('month', p_date)::date;
  v_month_end date := (date_trunc('month', p_date) + interval '1 month')::date;
  v_payload jsonb;
begin
  v_payload := jsonb_build_object(
    'revenue_entries', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at)
      from public.daily_revenue_entries r
      where r.branch_id = p_branch_id
        and r.revenue_date = p_date
    ), '[]'::jsonb),

    'cash_register', (
      select to_jsonb(c)
      from public.daily_cash_register c
      where c.branch_id = p_branch_id
        and c.cash_date = p_date
      limit 1
    ),

    'previous_cash', (
      select to_jsonb(c)
      from public.daily_cash_register c
      where c.branch_id = p_branch_id
        and c.cash_date < p_date
      order by c.cash_date desc
      limit 1
    ),

    'branch_settings', (
      select to_jsonb(b)
      from public.branches b
      where b.id = p_branch_id
      limit 1
    ),

    'expenses', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at)
      from (
        select de.*, jsonb_build_object('name', ec.name) as expense_categories
        from public.daily_expenses de
        left join public.expense_categories ec on ec.id = de.category_id
        where de.branch_id = p_branch_id
          and de.expense_date = p_date
      ) x
    ), '[]'::jsonb),

    'salary_advances', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at)
      from (
        select
          sa.*,
          jsonb_build_object('full_name', e.full_name, 'position', e.position) as employees,
          jsonb_build_object('name', b.name) as branches
        from public.salary_advances sa
        left join public.employees e on e.id = sa.employee_id
        left join public.branches b on b.id = sa.branch_id
        where sa.branch_id = p_branch_id
          and sa.advance_date = p_date
          and coalesce(sa.is_cancelled, false) = false
      ) x
    ), '[]'::jsonb),

    'inflows', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.created_at)
      from public.daily_cash_inflows i
      where i.branch_id = p_branch_id
        and i.inflow_date = p_date
    ), '[]'::jsonb),

    'expense_categories', coalesce((
      select jsonb_agg(to_jsonb(ec) order by ec.name)
      from public.expense_categories ec
      where coalesce(ec.is_active, true) = true
    ), '[]'::jsonb),

    'logs', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.created_at desc)
      from (
        select *
        from public.finance_operation_log l
        where l.branch_id = p_branch_id
          and l.operation_date = p_date
        order by l.created_at desc
        limit 250
      ) l
    ), '[]'::jsonb),

    'month_stats', jsonb_build_object(
      'cash', coalesce((select sum(cash_amount) from public.daily_revenue where branch_id = p_branch_id and revenue_date >= v_month_start and revenue_date < v_month_end and deleted_at is null), 0),
      'bank', coalesce((select sum(bank_amount) from public.daily_revenue where branch_id = p_branch_id and revenue_date >= v_month_start and revenue_date < v_month_end and deleted_at is null), 0),
      'wolt', coalesce((select sum(wolt_amount) from public.daily_revenue where branch_id = p_branch_id and revenue_date >= v_month_start and revenue_date < v_month_end and deleted_at is null), 0),
      'revenue', coalesce((select sum(cash_amount + bank_amount + wolt_amount) from public.daily_revenue where branch_id = p_branch_id and revenue_date >= v_month_start and revenue_date < v_month_end and deleted_at is null), 0),
      'expenses', coalesce((select sum(amount) from public.daily_expenses where branch_id = p_branch_id and expense_date >= v_month_start and expense_date < v_month_end and deleted_at is null), 0)
                  + coalesce((select sum(amount) from public.salary_advances where branch_id = p_branch_id and advance_date >= v_month_start and advance_date < v_month_end and coalesce(is_cancelled, false) = false), 0),
      'inflows', coalesce((select sum(amount) from public.daily_cash_inflows where branch_id = p_branch_id and inflow_date >= v_month_start and inflow_date < v_month_end and deleted_at is null), 0),
      'serviceCharge', coalesce((select sum(service_charge_amount) from public.monthly_branch_service_charge_cost where branch_id = p_branch_id and month = v_month_start), 0),
      'serviceCost', coalesce((select sum(staff_cost_amount) from public.monthly_branch_service_charge_cost where branch_id = p_branch_id and month = v_month_start), 0)
    )
  );

  return v_payload;
end;
$function$

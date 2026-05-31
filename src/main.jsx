-- v172 Final Inventory Section
-- Safe/idempotent. Does not enable auto-writeoff.

create extension if not exists pgcrypto;

create or replace function public.rms_inventory_json_call_safe(p_function_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sql text;
  v_result jsonb;
begin
  if p_function_name is null then return null; end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = p_function_name
      and p.pronargs = 0
  ) then
    return null;
  end if;

  v_sql := format('select public.%I()::jsonb', p_function_name);
  execute v_sql into v_result;
  return v_result;
exception when others then
  return jsonb_build_object('status','error','function',p_function_name,'message',sqlerrm);
end;
$$;

create or replace function public.rms_inventory_final_section_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier jsonb;
  v_bazar jsonb;
  v_dashboard jsonb;
  v_iiko jsonb;
  v_unmapped jsonb;
  v_draft jsonb;
begin
  v_supplier := public.rms_inventory_json_call_safe('rms_inventory_supplier_stock_sync_health');
  v_bazar := public.rms_inventory_json_call_safe('rms_inventory_bazar_stock_sync_health');
  v_dashboard := public.rms_inventory_json_call_safe('rms_inventory_dashboard_report');
  v_iiko := public.rms_inventory_json_call_safe('rms_iiko_import_operational_audit');
  v_unmapped := public.rms_inventory_json_call_safe('rms_inventory_sales_unmapped_report');
  v_draft := public.rms_inventory_json_call_safe('rms_inventory_consumption_draft_readiness');

  return jsonb_build_object(
    'supplier_stock', coalesce(v_supplier->>'trigger_status', v_supplier->>'status', 'unknown'),
    'bazar_stock', coalesce(v_bazar->>'trigger_status', v_bazar->>'status', 'unknown'),
    'stock_rows', coalesce((v_dashboard->>'balance_rows')::integer, 0),
    'negative_stock_rows', coalesce((v_dashboard->>'negative_stock_rows')::integer, 0),
    'valid_iiko_rows', coalesce((v_iiko->>'valid_rows')::integer, 0),
    'unmapped_sales', coalesce((v_unmapped->>'unmapped_count')::integer, 0),
    'draft_ready_rows', coalesce((v_draft->>'ready_rows')::integer, 0),
    'auto_writeoff', 'off',
    'section_status', case
      when coalesce((v_dashboard->>'negative_stock_rows')::integer, 0) > 0 then 'needs_stock_review'
      when coalesce((v_unmapped->>'unmapped_count')::integer, 0) > 0 then 'needs_mapping_review'
      else 'ready'
    end,
    'supplier_health', v_supplier,
    'bazar_health', v_bazar,
    'dashboard', v_dashboard,
    'iiko_audit', v_iiko,
    'unmapped', v_unmapped,
    'draft_readiness', v_draft
  );
end;
$$;

insert into public.rms_tech_card_hardening_status (version, area, status, notes)
values (
  'v172',
  'final_inventory_section',
  'stable',
  'Final Inventory/Sklad section status layer installed. Supplier and bazar stock sync, iiko import, consumption preview and manual draft/apply remain enabled; auto-writeoff remains off.'
);

grant execute on function public.rms_inventory_json_call_safe(text) to authenticated, anon;
grant execute on function public.rms_inventory_final_section_health() to authenticated, anon;

select 'v172 final inventory section installed' as status;

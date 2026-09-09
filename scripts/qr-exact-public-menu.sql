-- STAGING ONLY; install with qr-exact-branch-import.sql after client update.
CREATE OR REPLACE FUNCTION public.qr_get_public_menu_v2(p_branch_code text, p_table_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_branch record;
  v_table record;
  v_settings jsonb;
  v_items jsonb;
begin
  select null::uuid as id, null::text as code, null::text as label into v_table;

  with matching as (
    select b.id, b.organization_id, b.code, b.name
    from public.qr_branches b
    where upper(b.code) = upper(trim(p_branch_code))
      and b.is_active is true
      and private.has_active_license(b.organization_id, 'qr_menu')
  )
  select m.id, m.organization_id, m.code, m.name into v_branch
  from matching m
  where (select count(*) from matching) = 1;

  if v_branch.id is null then return null; end if;

  if nullif(trim(p_table_code), '') is not null then
    select t.id, t.code, t.label into v_table
    from public.qr_tables t
    where t.organization_id = v_branch.organization_id
      and t.branch_id = v_branch.id
      and upper(t.code) = upper(trim(p_table_code))
      and t.is_active is true;
    if v_table.id is null then return null; end if;
  end if;

  select jsonb_build_object(
      'hero_title', coalesce(nullif(m.settings ->> 'hero_title', ''), 'Добро пожаловать'),
      'accent_color', case when (m.settings ->> 'accent_color') ~ '^#[0-9A-Fa-f]{6}$' then m.settings ->> 'accent_color' else '#be8a42' end,
      'default_language', case when m.settings ->> 'default_language' in ('ru', 'az', 'en') then m.settings ->> 'default_language' else 'ru' end
    ) into v_settings
  from public.organization_modules m
  where m.organization_id = v_branch.organization_id and m.module_code = 'qr_menu';

  select coalesce(jsonb_agg(to_jsonb(item) order by item.sort_order, item.category_name, item.name), '[]'::jsonb)
    into v_items
  from (
    select c.id, c.name, c.category_name, c.description,
      coalesce(bm.price, c.price) as price,
      case when c.special_price is not null and c.special_price <= coalesce(bm.price, c.price) then c.special_price else null end as special_price,
      c.is_special, c.special_label, c.is_featured, c.weight_text, c.image_url, c.options, c.sort_order,
      coalesce((c.source_metadata->>'exact')::boolean,false) as exact_source,
      c.source_metadata->'translations' as translations,
      c.source_metadata->'category' as source_category
    from public.qr_menu_catalog c
    left join public.qr_branch_menu bm
      on bm.organization_id = c.organization_id
     and bm.branch_id = v_branch.id
     and bm.catalog_id = c.id
    where c.organization_id = v_branch.organization_id
      and c.is_active is true
      and (coalesce((c.source_metadata->>'exact')::boolean,false) is false or bm.is_available is true)
      and coalesce(bm.is_available, true) is true
      and coalesce(bm.is_stop, false) is false
  ) item;

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_branch.organization_id,
      'name', (select o.name from public.organizations o where o.id = v_branch.organization_id)
    ),
    'branch', jsonb_build_object('id', v_branch.id, 'code', v_branch.code, 'name', v_branch.name),
    'table', case when v_table.id is null then null else jsonb_build_object('id', v_table.id, 'code', v_table.code, 'label', v_table.label) end,
    'settings', coalesce(v_settings, jsonb_build_object('hero_title', 'Добро пожаловать', 'accent_color', '#be8a42', 'default_language', 'ru')),
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$function$


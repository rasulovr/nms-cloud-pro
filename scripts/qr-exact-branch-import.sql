-- STAGING ONLY: zzsdcxowhhaxnuliaryb. Do not install on RMS Pro production.
-- Run only after the matching client supports exact_source and structured variants.
begin;
alter table public.qr_menu_catalog add column if not exists source_metadata jsonb not null default '{}'::jsonb;

-- Normal authenticated invocation. Existing RLS, organization triggers and licenses apply.
create or replace function public.qr_import_baristachef_exact(p_menu jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_org constant uuid := '1f0abf22-40e8-4324-a071-f21fc2f92c7b';
  v_source jsonb; v_item jsonb; v_branch record; v_id uuid;
  v_ids uuid[] := '{}'; v_source_ids uuid[]; v_backup jsonb;
  v_expected integer; v_brand text; v_codes jsonb;
begin
  if auth.uid() is null or private.rms_can_access(v_org,'qr_menu',true) is not true then
    raise exception 'Active membership and QR Menu license required';
  end if;
  if p_menu->>'organization_id' is distinct from v_org::text
    or jsonb_typeof(p_menu->'sources') is distinct from 'array'
    or jsonb_array_length(p_menu->'sources') <> 3 then
    raise exception 'Unexpected organization or source list';
  end if;
  if (select count(distinct s->>'brand') from jsonb_array_elements(p_menu->'sources') s) <> 3 then
    raise exception 'Duplicate sources';
  end if;
  -- Serialize imports and retain existing rows for audit/rollback; never delete catalog or orders.
  perform pg_advisory_xact_lock(hashtextextended(v_org::text || ':qr-exact-import',0));
  perform 1 from public.qr_branches where organization_id=v_org for update;
  if (select count(distinct code) from public.qr_branches where organization_id=v_org
      and code in ('BC1','BC2','BC4','BC5') and is_active) <> 4 then
    raise exception 'The four active branches must exist';
  end if;
  select jsonb_build_object(
    'catalog',coalesce((select jsonb_agg(to_jsonb(c)) from public.qr_menu_catalog c where organization_id=v_org),'[]'),
    'branch_menu',coalesce((select jsonb_agg(to_jsonb(b)) from public.qr_branch_menu b where organization_id=v_org),'[]'),
    'captured_at',now()) into v_backup;

  for v_source in select value from jsonb_array_elements(p_menu->'sources') loop
    v_brand := v_source->>'brand';
    case v_brand
      when 'baristachef3' then v_expected:=160; v_codes:='["BC1","BC2"]';
      when 'baristachef' then v_expected:=176; v_codes:='["BC4"]';
      when 'baristachef2' then v_expected:=191; v_codes:='["BC5"]';
      else raise exception 'Unknown source';
    end case;
    if v_source->'branches' is distinct from v_codes
      or jsonb_typeof(v_source->'items') is distinct from 'array'
      or jsonb_array_length(v_source->'items') <> v_expected then
      raise exception 'Source mapping/count mismatch for %',v_brand;
    end if;
    if (select count(distinct x->>'external_key') from jsonb_array_elements(v_source->'items') x) <> v_expected then
      raise exception 'Duplicate item identity';
    end if;
    v_source_ids := '{}';
    for v_item in select value from jsonb_array_elements(v_source->'items') loop
      if nullif(v_item->>'name','') is null or nullif(v_item->>'category_name','') is null
        or v_item->>'external_key' not like 'clopos:' || v_brand || ':%'
        or jsonb_typeof(v_item->'price') is distinct from 'number'
        or (v_item->>'price')::numeric < 0
        or jsonb_typeof(v_item->'options') is distinct from 'array' then
        raise exception 'Invalid item';
      end if;
      if nullif(v_item->>'source_image_url','') is not null and (
        nullif(v_item->>'image_url','') is null or
        v_item->>'image_url' not like 'https://zzsdcxowhhaxnuliaryb.supabase.co/storage/v1/object/public/qr-menu-media/' || v_org::text || '/%') then
        raise exception 'A source image has not been copied to local storage';
      end if;
      if exists(select 1 from jsonb_array_elements(v_item->'options') o
        where nullif(o->>'name','') is null or jsonb_typeof(o->'price') is distinct from 'number'
        or (o->>'price')::numeric < 0) then raise exception 'Invalid variant'; end if;
      insert into public.qr_menu_catalog(organization_id,external_key,name,category_name,description,price,
        image_url,options,sort_order,is_active,special_price,is_special,is_featured,special_label,weight_text,source_metadata)
      values(v_org,v_item->>'external_key',v_item->>'name',v_item->>'category_name',coalesce(v_item->>'description',''),
        (v_item->>'price')::numeric,nullif(v_item->>'image_url',''),v_item->'options',
        (v_item->>'sort_order')::integer,true,null,false,false,null,null,
        (v_item->'source_metadata') || jsonb_build_object('exact',true,'brand',v_brand))
      on conflict(organization_id,external_key) do update set
        name=excluded.name,category_name=excluded.category_name,description=excluded.description,
        price=excluded.price,image_url=excluded.image_url,options=excluded.options,sort_order=excluded.sort_order,
        is_active=true,special_price=null,is_special=false,is_featured=false,special_label=null,weight_text=null,
        source_metadata=excluded.source_metadata,updated_at=now()
      returning id into v_id;
      v_source_ids:=array_append(v_source_ids,v_id);
    end loop;
    v_ids:=v_ids || v_source_ids;
    for v_branch in select id from public.qr_branches
      where organization_id=v_org and v_codes ? code loop
      insert into public.qr_branch_menu(organization_id,branch_id,catalog_id,price,is_available,is_stop)
      select v_org,v_branch.id,c.id,c.price,true,false from public.qr_menu_catalog c where c.id=any(v_source_ids)
      on conflict(organization_id,branch_id,catalog_id) do update set
        price=excluded.price,is_available=true,is_stop=false,updated_at=now();
    end loop;
  end loop;
  -- Every target gets an explicit allowlist, including legacy catalog items.
  for v_branch in select id,code from public.qr_branches
    where organization_id=v_org and code in ('BC1','BC2','BC4','BC5') loop
    v_brand:=case when v_branch.code in ('BC1','BC2') then 'baristachef3'
      when v_branch.code='BC4' then 'baristachef' else 'baristachef2' end;
    insert into public.qr_branch_menu(organization_id,branch_id,catalog_id,price,is_available,is_stop)
    select v_org,v_branch.id,c.id,c.price,false,false from public.qr_menu_catalog c
      where c.organization_id=v_org and (not c.id=any(v_ids) or c.source_metadata->>'brand' is distinct from v_brand)
    on conflict(organization_id,branch_id,catalog_id) do update set is_available=false,updated_at=now();
  end loop;
  return jsonb_build_object('imported',cardinality(v_ids),'branches',jsonb_build_object('BC1',160,'BC2',160,'BC4',176,'BC5',191),'before',v_backup);
end;
$$;
revoke all on function public.qr_import_baristachef_exact(jsonb) from public,anon;
grant execute on function public.qr_import_baristachef_exact(jsonb) to authenticated;
commit;

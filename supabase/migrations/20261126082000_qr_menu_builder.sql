begin;
create table public.rms_qr_builder_draft (
  branch_code text primary key check (branch_code in ('BC1','BC2','BC4','BC5')),
  revision integer not null check(revision > 0),
  document jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.rms_qr_builder_live (like public.rms_qr_builder_draft including all);
alter table public.rms_qr_builder_draft enable row level security;
alter table public.rms_qr_builder_live enable row level security;
revoke all on public.rms_qr_builder_draft,public.rms_qr_builder_live from public,anon,authenticated;
grant select on public.rms_qr_builder_draft to authenticated;
grant select on public.rms_qr_builder_live to anon,authenticated;
create policy qr_builder_admin_draft on public.rms_qr_builder_draft for select to authenticated using ((select public.rms_security_is_protected_admin()));
create policy qr_builder_guest_live on public.rms_qr_builder_live for select to anon,authenticated using (true);

create function public.rms_qr_builder_save(p_branch text,p_revision integer,p_document jsonb,p_publish boolean default false)
returns integer language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare
  ver integer;
  branch_id_actual uuid;
  k text; item jsonb; cat text; label text; descr text; external text; locale jsonb;
  img text; p numeric; saved_id uuid;
begin
  if not public.rms_security_is_protected_admin() then raise exception 'QR_BUILDER_ADMIN_ONLY' using errcode='42501'; end if;
  if p_branch is null or p_branch not in ('BC1','BC2','BC4','BC5') or p_revision is null or p_publish is null then raise exception 'QR_BUILDER_INVALID_BRANCH'; end if;
  if p_document is null or octet_length(p_document::text)>700000 or jsonb_typeof(p_document) is distinct from 'object'
    or jsonb_typeof(p_document->'items') is distinct from 'object' or jsonb_typeof(p_document->'categories') is distinct from 'object'
  then raise exception 'QR_BUILDER_INVALID_DOCUMENT'; end if;

  for k,item in select key,value from jsonb_each(p_document->'categories') loop
    if k !~ '^cat:[0-9a-f-]{36}$' or jsonb_typeof(item->'names') is distinct from 'object'
       or length(btrim(coalesce(item->'names'->>'ru',item->'names'->>'az',item->'names'->>'en',''))) not between 1 and 100 then
      raise exception 'QR_BUILDER_INVALID_CATEGORY'; end if;
  end loop;
  for k,item in select key,value from jsonb_each(p_document->'items') loop
    if length(k) not between 1 and 180 or k in ('__proto__','constructor','prototype')
      or jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'kind','') not in ('existing','new')
      or coalesce(length(item->>'category'),0)>180
      or coalesce(item->>'image','') !~ '^(https://[^[:space:]]+|/menu/[A-Za-z0-9_.-]+|)$' then
      raise exception 'QR_BUILDER_INVALID_ITEM'; end if;
    if (item->>'category') like 'cat:%' and not ((p_document->'categories') ? (item->>'category')) then raise exception 'QR_BUILDER_MISSING_CATEGORY'; end if;
    if item ? 'tags' and (jsonb_typeof(item->'tags') is distinct from 'array'
      or not ((item->'tags') <@ '["new","chef","bestseller","sale"]'::jsonb)) then raise exception 'QR_BUILDER_INVALID_TAG'; end if;
    if item->>'kind'='new' and (k !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(length(item->>'category'),0)<1
      or coalesce(item->>'price_cents','') !~ '^[0-9]{1,7}$'
      or length(btrim(coalesce(item->'copy'->'names'->>'ru',item->'copy'->'names'->>'az',item->'copy'->'names'->>'en',''))) not between 1 and 160)
    then raise exception 'QR_BUILDER_INVALID_NEW_ITEM'; end if;
  end loop;
  if p_document->'offer' is distinct from 'null'::jsonb and (jsonb_typeof(p_document->'offer') is distinct from 'object'
     or coalesce(p_document->'offer'->>'seconds','') !~ '^([3-9]|1[0-2])$'
     or (p_document->'offer'->>'enabled'='true' and coalesce(length(p_document->'offer'->>'product_id'),0) not between 1 and 180)
     or jsonb_typeof(p_document->'offer'->'enabled') is distinct from 'boolean'
     or coalesce(p_document->'offer'->>'image','') !~ '^(https://[^[:space:]]+|/menu/[A-Za-z0-9_.-]+|)$') then
     raise exception 'QR_BUILDER_INVALID_OFFER';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rms_qr_builder:'||p_branch,0));
  select revision into ver from public.rms_qr_builder_draft d where d.branch_code=p_branch;
  if coalesce(ver,0)<>p_revision then raise exception 'QR_BUILDER_STALE'; end if;
  ver:=coalesce(ver,0)+1;
  if p_publish and p_branch in ('BC1','BC2') then
    select b.id into strict branch_id_actual from public.qr_branches b where b.code=p_branch and b.is_active;
    for k,item in select key,value from jsonb_each(p_document->'items') where value->>'kind'='new' loop
      cat:=item->>'category';locale:=p_document->'categories'->cat->'names';
      label:=coalesce(locale->>'ru',locale->>'az',locale->>'en',cat);
      descr:=coalesce(item->'copy'->'descriptions'->>'ru','');
      img:=nullif(item->>'image',''); p:=(item->>'price_cents')::numeric/100;
      external:='qr-builder:'||p_branch||':'||k;
      insert into public.qr_menu_catalog as c(id,external_key,name,category_name,description,price,image_url,options,sort_order,is_active)
      values(k::uuid,external,coalesce(item->'copy'->'names'->>'ru',item->'copy'->'names'->>'az',item->'copy'->'names'->>'en'),
        label,descr,p,img,'[]'::jsonb,1000,true)
      on conflict(id) do update set name=excluded.name,category_name=excluded.category_name,description=excluded.description,
        price=excluded.price,image_url=excluded.image_url,updated_at=now()
      where c.external_key=excluded.external_key and c.menu_item_id is null
      and not exists(select 1 from public.qr_branch_menu b where b.catalog_id=c.id and b.branch_id<>branch_id_actual)
      returning c.id into saved_id;
      if saved_id is null then raise exception 'QR_BUILDER_NATIVE_ID_COLLISION'; end if;
      insert into public.qr_branch_menu as bm(branch_id,catalog_id,price,is_available,is_stop)
        values(branch_id_actual,saved_id,p,not coalesce((item->>'hidden')::boolean,false),false)
      on conflict(branch_id,catalog_id) do update set price=excluded.price,is_available=excluded.is_available,updated_at=now();
    end loop;
    update public.qr_branch_menu as bm set is_available=false,updated_at=now()
      from public.qr_menu_catalog c,public.rms_qr_builder_live l,jsonb_each(l.document->'items') o
      where l.branch_code=p_branch and o.value->>'kind'='new' and not (p_document->'items' ? o.key)
       and bm.branch_id=branch_id_actual and c.id=bm.catalog_id and c.external_key='qr-builder:'||p_branch||':'||o.key;
  end if;
  insert into public.rms_qr_builder_draft values(p_branch,ver,p_document,now())
    on conflict(branch_code) do update set revision=excluded.revision,document=excluded.document,updated_at=excluded.updated_at;
  if p_publish then
    insert into public.rms_qr_builder_live values(p_branch,ver,p_document,now())
      on conflict(branch_code) do update set revision=excluded.revision,document=excluded.document,updated_at=excluded.updated_at;
  end if;
  return ver;
end $$;
revoke all on function public.rms_qr_builder_save(text,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.rms_qr_builder_save(text,integer,jsonb,boolean) to authenticated;
commit;

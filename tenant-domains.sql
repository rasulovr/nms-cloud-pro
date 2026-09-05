-- SaaS project zzsdcxowhhaxnuliaryb only. No changes to restaurant transactions.
begin;
alter table public.organizations add constraint organizations_dns_slug_check
check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
  and slug not in ('www','app','login','auth','api','admin','mail','smtp','send','status','support','docs','cdn','assets','static'));

-- Intentional anonymous endpoint: exposes only published, licensed QR menus.
-- No account/member/contact rows or private RMS data are returned.
create function public.qr_resolve_public_domain(p_slug text, p_branch_code text default null, p_table_code text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_org public.organizations%rowtype;
  v_branch public.qr_branches%rowtype;
  v_branches jsonb;
  v_menu jsonb;
begin
  select * into v_org from public.organizations
    where slug = lower(trim(p_slug)) and status::text = 'active';
  if v_org.id is null then return jsonb_build_object('status','not_found'); end if;
  if not private.has_active_license(v_org.id, 'qr_menu') then
    return jsonb_build_object('status','unpublished','name',v_org.name);
  end if;
  if nullif(trim(p_branch_code),'') is null then
    select coalesce(jsonb_agg(jsonb_build_object('code',code,'name',name) order by name,code),'[]'::jsonb)
      into v_branches from public.qr_branches where organization_id=v_org.id and is_active is true;
    if jsonb_array_length(v_branches)>1 then
      return jsonb_build_object('status','choose_branch','name',v_org.name,'branches',v_branches);
    end if;
    p_branch_code := v_branches->0->>'code';
  end if;
  select * into v_branch from public.qr_branches where organization_id=v_org.id
    and upper(code)=upper(trim(p_branch_code)) and is_active is true;
  if v_branch.id is null then return jsonb_build_object('status','unpublished','name',v_org.name); end if;
  -- Retain existing branch/table/license checks. Ambiguous legacy branch codes fail closed.
  v_menu := public.qr_get_public_menu_v2(v_branch.code,p_table_code);
  if v_menu is null or v_menu->'organization'->>'id' is distinct from v_org.id::text then
    return jsonb_build_object('status','unpublished','name',v_org.name);
  end if;
  return jsonb_build_object('status','ready','menu',v_menu);
end;
$$;
revoke all on function public.qr_resolve_public_domain(text,text,text) from public;
grant execute on function public.qr_resolve_public_domain(text,text,text) to anon,authenticated;
commit;

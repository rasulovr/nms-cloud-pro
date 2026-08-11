begin;

create or replace function public.super_admin_list_organizations()
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_status public.organization_status,
  created_at timestamptz,
  active_members bigint,
  active_branches bigint,
  enabled_modules bigint,
  pending_support_requests bigint
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.is_rms_super_admin(true) then
    raise exception 'RMS Super Admin with MFA is required' using errcode = '42501';
  end if;

  return query
  select
    o.id,
    o.name,
    o.slug,
    o.status,
    o.created_at,
    count(distinct om.user_id) filter (where om.is_active),
    count(distinct b.id) filter (where b.status = 'active'),
    count(distinct mod.module_code) filter (where mod.is_enabled),
    count(distinct sar.id) filter (where sar.status = 'pending')
  from public.organizations o
  left join public.organization_members om on om.organization_id = o.id
  left join public.branches b on b.organization_id = o.id
  left join public.organization_modules mod on mod.organization_id = o.id
  left join public.support_access_requests sar on sar.organization_id = o.id
  group by o.id, o.name, o.slug, o.status, o.created_at
  order by o.created_at desc;
end;
$function$;

revoke all on function public.super_admin_list_organizations() from public;
revoke all on function public.super_admin_list_organizations() from anon;
grant execute on function public.super_admin_list_organizations() to authenticated;

comment on function public.super_admin_list_organizations() is
  'MFA-gated RMS Super Admin organization directory with non-financial aggregate counts.';

commit;

create or replace function public.rms_super_admin_access_state()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  return exists (
    select 1 from private.rms_super_admins sa
    where sa.user_id = v_user_id and sa.is_active and sa.disabled_at is null
  );
end;
$function$;
revoke all on function public.rms_super_admin_access_state() from public;
revoke all on function public.rms_super_admin_access_state() from anon;
grant execute on function public.rms_super_admin_access_state() to authenticated;

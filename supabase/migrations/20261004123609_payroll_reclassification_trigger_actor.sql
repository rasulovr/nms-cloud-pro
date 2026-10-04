-- Preserve the existing invoker audit trigger and all of its assignments.
-- Resolve the same trusted JWT subject without requiring auth-schema USAGE.
-- No roles, grants, policies, trigger ordering, or business rows are changed.
do $migration$
declare
  v_definition text;
begin
  select replace(pg_get_functiondef('public.set_salary_advance_audit()'::regprocedure),E'\r','') into v_definition;
  if md5(v_definition)<>'f2de17b9c5cfed41889c948de6b8dac8' then
    raise exception 'Advance audit trigger changed since review; review before installation';
  end if;
  -- Substitute at each original call site to preserve lazy coalesce behavior
  -- and the original INSERT/UPDATE branches, including NULL claim handling.
  execute replace(v_definition,'auth.uid()', $actor$(coalesce(
    nullif(current_setting('request.jwt.claim.sub',true),''),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')
  )::uuid)$actor$);
end;
$migration$;
notify pgrst,'reload schema';

begin;
create table if not exists private.loyalty_program_versions (
 organization_id uuid not null references public.organizations(id),
 version integer not null,
 settings jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,version)
);
alter table private.loyalty_program_versions enable row level security;
revoke all on private.loyalty_program_versions from public,anon,authenticated;

create or replace function private.loyalty_program(p_org uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('version',version,'settings',settings,'updated_at',created_at)
 from private.loyalty_program_versions where organization_id=p_org order by version desc limit 1),
 jsonb_build_object('version',0,'settings',jsonb_build_object('name','Программа лояльности','enabled',false,
 'cashback_percent',0,'max_redeem_percent',0,'min_purchase',0,'min_redeem_balance',0,'expiry_days',null,'tiers','[]'::jsonb)));
$$;
revoke all on function private.loyalty_program(uuid) from public,anon,authenticated;

create or replace function private.loyalty_admin_programs()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('organization_id',o.id,'name',o.name,
 'can_edit',m.role::text in ('owner','admin'),'can_confirm',m.role::text in ('owner','admin','manager','cashier') and private.has_active_license(o.id,'qr_menu'),'program',private.loyalty_program(o.id)) order by o.name)
 from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.user_id=auth.uid() and m.is_active and o.status::text='active'
 and private.has_active_license(o.id,'loyalty')),'[]'::jsonb);
end $$;

create or replace function private.loyalty_save_program(p_organization_id uuid,p_settings jsonb,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_version integer; v_key text; v_tier jsonb; v_previous numeric:=-1; v_names text[]:=array[]::text[]; v_n numeric;
begin
 if auth.uid() is null or coalesce(private.rms_member_role(p_organization_id)::text,'') not in ('owner','admin')
 or not private.has_active_license(p_organization_id,'loyalty') then
 raise exception 'Only the brand owner or administrator may change loyalty rules' using errcode='42501'; end if;
 if jsonb_typeof(p_settings) is distinct from 'object' or jsonb_typeof(p_settings->'enabled') is distinct from 'boolean'
 or jsonb_typeof(p_settings->'name') is distinct from 'string' or length(trim(p_settings->>'name')) not between 1 and 80 then
 raise exception 'Invalid program name or activation status'; end if;
 foreach v_key in array array['cashback_percent','max_redeem_percent','min_purchase','min_redeem_balance'] loop
 if jsonb_typeof(p_settings->v_key) is distinct from 'number' then raise exception 'Invalid number: %',v_key; end if;
 v_n:=(p_settings->>v_key)::numeric;
 if v_n<0 or v_n>(case when v_key like '%percent' then 100 else 100000000 end) or round(v_n,2)<>v_n then raise exception 'Invalid range: %',v_key; end if;
 end loop;
 if p_settings->'expiry_days' is distinct from 'null'::jsonb then
 if jsonb_typeof(p_settings->'expiry_days') is distinct from 'number' then raise exception 'Invalid expiry'; end if;
 v_n:=(p_settings->>'expiry_days')::numeric;
 if v_n<1 or v_n>3650 or trunc(v_n)<>v_n then raise exception 'Expiry must be 1–3650 days or null'; end if;
 end if;
 if jsonb_typeof(p_settings->'tiers') is distinct from 'array' then raise exception 'Invalid tiers'; end if;
 if jsonb_array_length(p_settings->'tiers')>10 then raise exception 'Maximum 10 tiers'; end if;
 for v_tier in select value from jsonb_array_elements(p_settings->'tiers') loop
 if jsonb_typeof(v_tier->'name') is distinct from 'string' or length(trim(v_tier->>'name')) not between 1 and 40
 or jsonb_typeof(v_tier->'min_spend') is distinct from 'number' or jsonb_typeof(v_tier->'cashback_percent') is distinct from 'number' then raise exception 'Invalid tier'; end if;
 if (v_tier->>'min_spend')::numeric<0 or (v_tier->>'min_spend')::numeric<=v_previous or (v_tier->>'min_spend')::numeric>100000000
 or round((v_tier->>'min_spend')::numeric,2)<>(v_tier->>'min_spend')::numeric
 or (v_tier->>'cashback_percent')::numeric not between 0 and 100
 or round((v_tier->>'cashback_percent')::numeric,2)<>(v_tier->>'cashback_percent')::numeric
 or lower(trim(v_tier->>'name'))=any(v_names) then raise exception 'Tier thresholds must increase and names must be unique'; end if;
 v_previous:=(v_tier->>'min_spend')::numeric;
 v_names:=array_append(v_names,lower(trim(v_tier->>'name')));
 end loop;
 -- Serializes owner edits; stale editors cannot overwrite newer conditions.
 perform 1 from public.organizations where id=p_organization_id for update;
 v_version:=(private.loyalty_program(p_organization_id)->>'version')::integer;
 if p_expected_version is distinct from v_version then raise exception 'Rules were changed by another administrator. Reload before saving.' using errcode='40001'; end if;
 insert into private.loyalty_program_versions(organization_id,version,settings,created_by)
 values(p_organization_id,v_version+1,p_settings,auth.uid());
 return private.loyalty_program(p_organization_id);
end $$;

create or replace function public.qr_loyalty_admin_programs()
returns jsonb language sql security invoker set search_path='' as $$ select private.loyalty_admin_programs(); $$;
create or replace function public.qr_loyalty_save_program(p_organization_id uuid,p_settings jsonb,p_expected_version integer)
returns jsonb language sql security invoker set search_path='' as $$ select private.loyalty_save_program(p_organization_id,p_settings,p_expected_version); $$;
revoke all on function private.loyalty_admin_programs(),private.loyalty_save_program(uuid,jsonb,integer),public.qr_loyalty_admin_programs(),public.qr_loyalty_save_program(uuid,jsonb,integer) from public,anon;
grant execute on function private.loyalty_admin_programs(),private.loyalty_save_program(uuid,jsonb,integer),public.qr_loyalty_admin_programs(),public.qr_loyalty_save_program(uuid,jsonb,integer) to authenticated;
commit;

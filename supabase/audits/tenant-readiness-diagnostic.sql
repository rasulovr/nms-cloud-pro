-- RMS Pro SaaS Foundation — read-only tenant readiness diagnostic
-- Safe to run in Supabase SQL Editor. This script performs SELECT-only checks.
-- It does not change data, roles, RLS, functions, or schemas.

-- 1) Business tables and potential tenant ownership
with business_tables as (
  select c.oid, n.nspname as table_schema, c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','p')
    and c.relname not like 'pg_%'
),
columns_by_table as (
  select table_schema, table_name,
         array_agg(column_name order by ordinal_position) as columns
  from information_schema.columns
  where table_schema = 'public'
  group by table_schema, table_name
),
policy_count as (
  select schemaname, tablename, count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by schemaname, tablename
)
select b.table_name,
       b.rls_enabled,
       coalesce(p.policy_count, 0) as policy_count,
       case
         when 'organization_id' = any(c.columns) then 'organization_id'
         when 'tenant_id' = any(c.columns) then 'tenant_id'
         when 'company_id' = any(c.columns) then 'company_id'
         when 'legal_entity_id' = any(c.columns) then 'legal_entity_id only'
         else 'missing'
       end as tenant_scope,
       array_to_string(
         array(select x from unnest(c.columns) x
               where x in ('id','organization_id','tenant_id','company_id','branch_id','legal_entity_id','user_id','created_by')),
         ', '
       ) as relevant_columns
from business_tables b
join columns_by_table c on c.table_schema=b.table_schema and c.table_name=b.table_name
left join policy_count p on p.schemaname=b.table_schema and p.tablename=b.table_name
order by
  case when b.rls_enabled then 1 else 0 end,
  case when 'organization_id'=any(c.columns) or 'tenant_id'=any(c.columns) then 1 else 0 end,
  b.table_name;

-- 2) Existing RLS policies: confirm whether they restrict by tenant/user or are broad
select schemaname, tablename, policyname, permissive, roles, cmd,
       coalesce(qual, '') as using_expression,
       coalesce(with_check, '') as check_expression
from pg_policies
where schemaname='public'
order by tablename, policyname;

-- 3) Public/authenticated table grants
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated','public')
order by table_name, grantee, privilege_type;

-- 4) SECURITY DEFINER routines without fixed search_path (high priority)
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       case when p.proconfig::text ~ 'search_path=' then 'fixed' else 'missing' end as search_path_status,
       pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosecdef=true
order by search_path_status desc, function_name;

-- 5) Direct execute grants on public functions
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema='public'
  and grantee in ('anon','authenticated','public')
order by routine_name, grantee;

-- 6) Identity/auth-related tables and columns already present
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and (
    table_name ilike '%user%' or table_name ilike '%role%' or table_name ilike '%organization%'
    or column_name in ('organization_id','tenant_id','company_id','branch_id','auth_user_id','user_id')
  )
order by table_name, ordinal_position;

-- 7) Storage access policies (QR photos and client media need tenant isolation too)
select policyname, permissive, roles, cmd, coalesce(qual,'') as using_expression,
       coalesce(with_check,'') as check_expression
from pg_policies
where schemaname='storage' and tablename='objects'
order by policyname;
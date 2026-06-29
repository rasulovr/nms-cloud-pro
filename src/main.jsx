begin;

create or replace function public.rms_final_recipe_component_update_secure(
  p_id uuid,
  p_patch jsonb
)
returns public.rms_final_recipe_components
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.rms_final_recipe_components;
begin
  if p_id is null then
    raise exception 'Component id is required';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Patch must be a JSON object';
  end if;

  update public.rms_final_recipe_components
     set qty = case
                 when p_patch ? 'qty'
                   then greatest(0, coalesce((p_patch->>'qty')::numeric, 0))
                 else qty
               end,
         unit = case
                  when p_patch ? 'unit'
                    then nullif(trim(p_patch->>'unit'), '')
                  else unit
                end,
         waste_percent = case
                           when p_patch ? 'waste_percent'
                             then greatest(0, coalesce((p_patch->>'waste_percent')::numeric, 0))
                           else waste_percent
                         end,
         manual_unit_cost = case
                              when p_patch ? 'manual_unit_cost'
                                then greatest(0, coalesce((p_patch->>'manual_unit_cost')::numeric, 0))
                              else manual_unit_cost
                            end,
         updated_at = now()
   where id = p_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'Tech card component not found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.rms_final_recipe_component_update_secure(uuid, jsonb) from public;
grant execute on function public.rms_final_recipe_component_update_secure(uuid, jsonb) to anon, authenticated;

commit;

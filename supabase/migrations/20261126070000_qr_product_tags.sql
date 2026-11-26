-- Dedicated public presentation data; no changes to orders, pricing or branch tables.
create table public.rms_qr_product_tags (
  branch_code text not null check (branch_code in ('BC1','BC2','BC4','BC5')),
  product_key text not null check (length(product_key) between 1 and 180),
  tag_codes text[] not null check (
    cardinality(tag_codes) <= 4 and array_position(tag_codes, null) is null
    and tag_codes <@ array['new','chef','bestseller','sale']::text[]
  ),
  primary key (branch_code, product_key)
);
alter table public.rms_qr_product_tags enable row level security;
revoke all on public.rms_qr_product_tags from public, anon, authenticated;
grant select on public.rms_qr_product_tags to anon, authenticated;
grant insert, update on public.rms_qr_product_tags to authenticated;
create policy guest_qr_tags_read on public.rms_qr_product_tags
  for select to anon, authenticated using (true);
create policy admin_qr_tags_insert on public.rms_qr_product_tags
  for insert to authenticated with check ((select public.rms_security_is_protected_admin()));
create policy admin_qr_tags_update on public.rms_qr_product_tags
  for update to authenticated using ((select public.rms_security_is_protected_admin()))
  with check ((select public.rms_security_is_protected_admin()));

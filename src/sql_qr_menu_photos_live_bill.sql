-- QR Menu photos + live bill MVP.
-- Run this in Supabase SQL Editor.

alter table if exists public.rms_menu_products
add column if not exists image_url text;

create table if not exists public.rms_qr_live_bills (
  id uuid primary key default gen_random_uuid(),
  branch_id text not null,
  table_number text not null,
  status text default 'open',
  payment_status text default 'unpaid',
  subtotal numeric default 0,
  service_amount numeric default 0,
  discount_amount numeric default 0,
  total numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.rms_qr_live_bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references public.rms_qr_live_bills(id) on delete cascade,
  product_id text,
  product_name text not null,
  qty numeric default 1,
  price numeric default 0,
  total numeric default 0,
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_rms_qr_live_bills_table
on public.rms_qr_live_bills(branch_id, table_number, status);

create index if not exists idx_rms_qr_live_bill_items_bill
on public.rms_qr_live_bill_items(bill_id);

alter table public.rms_qr_live_bills enable row level security;
alter table public.rms_qr_live_bill_items enable row level security;

do $$ begin
  create policy "qr live bills public read" on public.rms_qr_live_bills for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "qr live bill items public read" on public.rms_qr_live_bill_items for select using (true);
exception when duplicate_object then null; end $$;

-- Optional demo bill for testing table BC1 / 1.
insert into public.rms_qr_live_bills (branch_id, table_number, status, payment_status, subtotal, service_amount, discount_amount, total)
values ('BC1', '1', 'open', 'unpaid', 22.00, 0.00, 0.00, 22.00)
on conflict do nothing;

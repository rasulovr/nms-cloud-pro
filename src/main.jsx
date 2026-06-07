-- v255a_supplier_payment_split_groups_diagnostic.sql
-- Purpose:
--   Find supplier payment rows that look like old split multi-e-qaimə payments.
--   Does not modify data.
--
-- Use for Baristica / Ruslan Rasulov Cabit first.

-- 1) Detailed payment rows for Baristica / Ruslan by date.
select
  sp.id,
  sp.payment_date,
  s.name as supplier_name,
  le.name as legal_entity_name,
  sp.amount,
  sp.invoice_notes,
  sp.comment,
  sp.e_invoice_id,
  ei.invoice_number as linked_e_invoice_number,
  sp.created_at,
  sp.deleted_at
from public.supplier_payments sp
left join public.suppliers s on s.id = sp.supplier_id
left join public.legal_entities le on le.id = sp.legal_entity_id
left join public.supplier_e_invoices ei on ei.id = sp.e_invoice_id
where sp.deleted_at is null
  and s.name = 'Baristica'
  and le.name = 'Ruslan Rasulov Cabit'
order by sp.payment_date desc, sp.created_at desc, sp.amount desc;


-- 2) Candidate groups: same supplier + VOEN + payment date with multiple payment rows.
select
  sp.payment_date,
  s.name as supplier_name,
  le.name as legal_entity_name,
  count(*) as payment_rows,
  round(sum(sp.amount), 2) as total_payment,
  string_agg(coalesce(sp.invoice_notes, ei.invoice_number, '—'), ', ' order by sp.created_at) as invoice_notes_combined,
  min(sp.created_at) as first_created_at,
  max(sp.created_at) as last_created_at
from public.supplier_payments sp
left join public.suppliers s on s.id = sp.supplier_id
left join public.legal_entities le on le.id = sp.legal_entity_id
left join public.supplier_e_invoices ei on ei.id = sp.e_invoice_id
where sp.deleted_at is null
  and s.name = 'Baristica'
  and le.name = 'Ruslan Rasulov Cabit'
group by sp.payment_date, s.name, le.name
having count(*) > 1
order by sp.payment_date desc;


-- 3) Candidate groups with IDs for manual review before merge.
select
  sp.payment_date,
  s.name as supplier_name,
  le.name as legal_entity_name,
  round(sum(sp.amount), 2) as total_payment,
  jsonb_agg(
    jsonb_build_object(
      'id', sp.id,
      'amount', sp.amount,
      'invoice_notes', coalesce(sp.invoice_notes, ei.invoice_number),
      'e_invoice_id', sp.e_invoice_id,
      'created_at', sp.created_at
    )
    order by sp.created_at
  ) as payment_rows
from public.supplier_payments sp
left join public.suppliers s on s.id = sp.supplier_id
left join public.legal_entities le on le.id = sp.legal_entity_id
left join public.supplier_e_invoices ei on ei.id = sp.e_invoice_id
where sp.deleted_at is null
  and s.name = 'Baristica'
  and le.name = 'Ruslan Rasulov Cabit'
group by sp.payment_date, s.name, le.name
having count(*) > 1
order by sp.payment_date desc;

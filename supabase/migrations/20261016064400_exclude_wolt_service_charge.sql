-- Wolt deliveries are not eligible for staff service charge.
-- Preserve column order/types, settings, soft-deletion and month grouping.
-- CREATE OR REPLACE retains the view's ownership/grants and dependencies.
CREATE OR REPLACE VIEW public.monthly_branch_service_charge_cost
WITH (security_invoker = true) AS
SELECT dr.branch_id,
 date_trunc('month'::text, dr.revenue_date::timestamp with time zone)::date AS month,
 sum(CASE WHEN b.service_charge_enabled IS TRUE AND COALESCE(b.service_charge_percent, 0::numeric) > 0::numeric
 THEN COALESCE(dr.cash_amount, 0::numeric) + COALESCE(dr.bank_amount, 0::numeric)
 - (COALESCE(dr.cash_amount, 0::numeric) + COALESCE(dr.bank_amount, 0::numeric))
 / (1::numeric + COALESCE(b.service_charge_percent, 0::numeric) / 100::numeric)
 ELSE 0::numeric END) AS service_charge_amount,
 sum(CASE WHEN b.service_charge_enabled IS TRUE
 THEN (COALESCE(dr.cash_amount, 0::numeric) + COALESCE(dr.bank_amount, 0::numeric))
 / (1::numeric + COALESCE(b.service_charge_percent, 0::numeric) / 100::numeric)
 * COALESCE(b.service_staff_cost_percent, 0::numeric) / 100::numeric
 ELSE 0::numeric END) AS staff_cost_amount,
 sum(CASE WHEN b.service_charge_enabled IS TRUE AND COALESCE(b.service_charge_percent, 0::numeric) > 0::numeric
 THEN (COALESCE(dr.cash_amount, 0::numeric) + COALESCE(dr.bank_amount, 0::numeric))
 / (1::numeric + COALESCE(b.service_charge_percent, 0::numeric) / 100::numeric)
 ELSE COALESCE(dr.cash_amount, 0::numeric) + COALESCE(dr.bank_amount, 0::numeric) END) AS base_amount
FROM public.daily_revenue dr JOIN public.branches b ON b.id = dr.branch_id
WHERE dr.deleted_at IS NULL AND b.service_charge_enabled IS TRUE
GROUP BY dr.branch_id, (date_trunc('month'::text, dr.revenue_date::timestamp with time zone)::date);

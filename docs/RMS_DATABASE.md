# RMS database state

Last consolidated: 2026-09-12.
This is an evidence inventory, not a complete schema dump.
Read exact deployed definitions before any production migration.

## Targets
- Production Supabase: `meqttgiksyuyffuoghwx`.
- Test Supabase: `zzsdcxowhhaxnuliaryb`.
- Secure supplier pagination/workspace is installed on test and production; production uses its compatible single-tenant definitions.
- Never infer production from test or copy credentials into this repository.

## Current supplier/auth objects
| Object | Purpose / constraint | Verified state |
| --- | --- | --- |
| `rms_internal_auth_accounts` | Maps one Supabase Auth user to one RMS internal user and organization | RLS enabled; direct anon/authenticated grants revoked |
| `rms_internal_auth_attempts` | Server-side failed-attempt and lockout state | RLS enabled; direct anon/authenticated grants revoked |
| `rms_supplier_purchases_page_secure(integer, integer)` | Tenant-scoped paged supplier purchase read | SECURITY DEFINER, safe search_path, anon revoked, authenticated granted |
| `rms_suppliers_workspace_secure()` | Tenant-scoped supplier workspace metadata; purchases loaded separately by page | SECURITY DEFINER, safe search_path, anon revoked, authenticated granted |
| Edge `rms-internal-auth` | Validates internal password and issues genuine Auth session | Test v2 ACTIVE; production v15 ACTIVE |

The paged RPC additionally checks:
- `auth.uid()` exists.
- Active internal account mapping exists.
- Mapping organization matches the RMS settings lookup.
- Internal user is active.
- `suppliers` permission is `read` or `edit` unless mapped admin.
- Purchases, joins and purchase items are filtered by the mapped `organization_id`.
- Page size is clamped to 1–500 and offset is non-negative.

## Test data and verification
- Synthetic marker: `RMS_PAGINATION_TEST_ONLY`.
- 520 purchase headers and 520 purchase items exist only in test.
- Newest: `TEST-PAGE-0001` dated 2026-09-12.
- Oldest: `TEST-PAGE-0520` dated 2025-04-11.
- Real Edge login created Auth user/session for test Nigar linkage.
- REST RPC with the session returned 250 rows at offset 0 and 20 rows at offset 500.
- Secure workspace RPC with Nigar session returned 1 legal entity, 1 supplier, 1 product, no embedded purchases and no error.
- Privilege audit:
  - anon RPC execute: false.
  - authenticated RPC execute: true.
- Production post-DDL counts remained 2,485 purchase headers, 12,575 items and 2,317 active purchases.
- Production read indexes: `idx_supplier_purchase_items_purchase_id` and `idx_supplier_purchases_page_order`.
  - anon/authenticated direct reads of both internal auth tables: false.
- `pg_net` was used temporarily for a server-side test and removed afterwards.
- Production rollout changed no supplier, invoice, item, payment, balance, revenue or permission rows.

## Existing domain objects
| Object | Purpose / constraint |
| --- | --- |
| `menu_items` | Canonical dish IDs; protected direct writes |
| `rms_tech_menu_item_create_secure` | Secure menu-item creation RPC |
| `rms_final_recipe_components` | Authoritative tech-card components |
| `recipe_items` | Legacy; not tech-card component source |
| `rms_recipes_workspace` | Restricted-user recipe workspace |
| `rms_suppliers_workspace` | Legacy restricted-user supplier workspace; bounded result caused current history defect |
| `daily_revenue / daily_revenue_entries` | Revenue and entries |
| `daily_expenses` | Daily expenses |
| `supplier_purchases / supplier_purchase_items` | Invoice headers and lines |
| `supplier_payments / supplier_balances_v2` | Payments and debt |
| `employees / employee_attendance` | Staff and attendance |
| `salary_periods / salary_advances` | Payroll periods and advances |
| `latest_product_costs / supplier_products` | Cost references; verify live definitions |

## Security review
- Supabase advisors were run after the test DDL.
- The two new auth tables appear under INFO `rls_enabled_no_policy`; this is intentional because direct client access is denied and service-role Edge code owns access.
- Both secure supplier RPCs are intentionally executable by `authenticated` and perform their own mapping/tenant/permission checks.
- It does not appear among anon-executable SECURITY DEFINER findings.
- Existing project-wide advisor warnings predate or lie outside this narrow fix; do not modify unrelated policies or indexes without a separate review.
- Remediation reference: https://supabase.com/docs/guides/database/database-linter

## Migration ledger
| Migration / change | Target | State | Next action |
| --- | --- | --- | --- |
| Secure internal Auth linkage + supplier workspace/paging | Test | Applied, API-verified and UI-accepted 2026-09-12 | Keep as validation environment |
| Secure internal Auth linkage + supplier workspace/paging | Production | Applied and deployment READY 2026-09-13 | Complete live Nigar acceptance |
| `pos_board_create_table_scoped_idempotent` | Test/staging | Applied 2026-09-11 | Do not rerun based on filename |
| `pos_kds_item_readiness_and_served_restore` | Test/staging | Applied 2026-09-10 | Retrieve exact SQL before modifying |
| `baristachef_bc1_isolated_import` | Test/staging | Applied 2026-09-09 | Do not repeat import |
| v405 semifinished migration | Unknown | No applied migration confirmed | Locate existing work first |

## Production safety invariants
- Production currently remains on legacy internal RMS access.
- Never expose supplier data through anon or a public SECURITY DEFINER shortcut.
- Direct anon writes failing RLS can be expected; fix the authorized caller/RPC instead of broad policies.
- SECURITY DEFINER functions require safe search_path and tenant/permission enforcement.
- Preserve branch isolation, active-user checks and role validation.
- No broad delete, reset, duplicated import or automatic test-to-production merge.

## For every future DB change record
Record exact target ref, migration identifier, durable SQL file/commit, pending/applied state,
application timestamp, affected RPC/tables/policies, transactional verification,
rollback strategy and frontend compatibility.
Never store raw customer records, financial exports, passwords, tokens or PINs.

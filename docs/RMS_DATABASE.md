# RMS database state

Last consolidated: 2026-09-12.
This is an evidence inventory, not a live schema dump. No database was queried or mutated
during handoff setup. Read exact deployed definitions before writing any migration.

## Targets
- Production project ref: UNKNOWN; resolve from actual production environment.
- Test/staging project ref: zzsdcxowhhaxnuliaryb (historical applied-migration record).
- src/supabase.js reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
- Never infer production from staging, or copy credentials into these files.

## Objects and contracts
| Object | Purpose / constraint | Evidence |
| --- | --- | --- |
| menu_items | Canonical dish IDs; protected direct writes | v403 incident record |
| rms_tech_menu_item_create_secure | Existing secure creation RPC | v403 reported successful transaction |
| rms_final_recipe_components | Authoritative tech-card components | User established rule |
| recipe_items | Legacy; not tech-card component source | User established rule |
| rms_recipes_workspace | Restricted-user recipe workspace | Historical v22 fix |
| rms_suppliers_workspace | Restricted-user supplier workspace | Historical v22 fix |
| daily_revenue / daily_revenue_entries | Revenue and entries | Historical restore/import |
| daily_expenses | Daily expenses | Historical restore/import |
| supplier_purchases / supplier_purchase_items | Invoice headers / lines | Historical restore/import |
| supplier_payments / supplier_balances_v2 | Payments / debt | Historical restore |
| employees / employee_attendance | Staff / attendance | Historical restore |
| salary_periods / salary_advances | Payroll periods / advances | Historical restore |
| latest_product_costs / supplier_products | Cost references; verify live definitions | Historical project context |

Do not guess function arguments, grants, table columns or semifinished schema from names.

## Migration ledger
| Migration / change | Target | Recorded state | Next action |
| --- | --- | --- | --- |
| pos_board_create_table_scoped_idempotent | Staging | Applied 2026-09-11 | Do not rerun merely because filename says PENDING_APPROVAL |
| pos_kds_item_readiness_and_served_restore | Staging | Applied 2026-09-10 | Retrieve exact SQL before modifying |
| baristachef_bc1_isolated_import | Staging | Applied 2026-09-09 | Do not repeat completed menu import |
| v403 frontend RPC switch | RMS frontend | Code change only; no DB change reported | Verify current failing request |
| v405 semifinished migration | Unknown | No applied migration confirmed | Locate existing work first |

Historical source for POS create-table SQL: server/PENDING_APPROVAL_table_create.sql
inside earlier prepared package; not present in application main tree.
Historical readiness package: RMS_POS_dish_readiness_restore_prepared_20260910.zip.
Do not treat these names as local paths currently available.

## Security invariants
- RMS can use anon key + internal RMS session; Supabase Auth is not a drop-in replacement.
- A direct anon INSERT failing RLS can be expected; fix caller/authorized RPC, not broad policies.
- SECURITY DEFINER functions require safe search_path and scope/permission enforcement.
- Keep tenant/branch isolation, active-terminal checks and role validation.
- Historical v214 diagnostics were clean for high-risk findings; this is NOT a current audit.
- Historical protected anon grants must not be revoked broadly without compatibility checks.

## Repository SQL inventory at c14b3e4
- src/rms_inventory_atomic_transfer.sql
- src/rms_loyalty_schema.sql
This inventory does not prove these files match all deployed migrations.

## For every future DB change record
Exact target ref, migration identifier, durable SQL file/commit, pending/applied state,
application timestamp, affected RPC/tables/policies, transactional verification,
rollback strategy and frontend compatibility.
Never store raw customer records, financial exports, passwords, tokens or PINs.


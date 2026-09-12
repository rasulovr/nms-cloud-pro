# RMS PRO — CURRENT PROJECT STATE

Last updated: 2026-09-12 (UTC)
Owner: RMS Pro development
Status: canonical handoff active on `docs/rms-project-state`.

## READ FIRST
- Canonical repository: https://github.com/rasulovr/nms-cloud-pro
- Canonical documentation branch: `docs/rms-project-state`.
- Always read this file from that branch, even when application checkout is on `main`.
- Read `AGENTS.md`, then only the module required for Current Task.
- GitHub documentation supersedes older chat summaries for recorded state.
- Fresh code, deployment and database evidence supersedes stale documentation.
- New user instructions supersede recorded priorities and permissions.
- Unknown means unverified; never invent a commit, deployment, migration or success.
- STABLE is not the same as WORKING or Preview.

## CURRENT STABLE — PRODUCTION
- Frontend URL: https://app.rms.rest
- Source commit: `4a0976d32772dc731bd5e9dec3e0fde916ea7d2b`.
- Deployment: `dpl_9Xv5CyYbrb3jg9797YJPBdBQfn6o` — READY.
- Vercel project: `prj_JpEc02KgTnexXmWbAJpK4EMpYM2O`.
- Supabase production: `meqttgiksyuyffuoghwx`.
- Authentication: protected Edge-backed internal Auth is active; Nigar linkage is created/refreshed after her next successful login.
- `app.rms.rest` returned HTTP 200 after deployment; no Vercel runtime errors were found.
- Production supplier records, invoice rows, finances and permissions were not changed; only read-only RPCs and two read indexes were added.
- Rollback branch: `rollback/before-nigar-secure-pagination-prod-20260913`.
- Supplier purchases now load through protected 250-row pages instead of the legacy 500-row workspace boundary.

## WORKING VERSION — TEST ONLY
- Task branch: `fix/secure-internal-auth-supplier-pagination`.
- Source commit: `4deb2bd3ea5c78d7ad8fadbc0f9aaa161855e303`.
- Version intent: v405 supplier purchase paged-load fix.
- Supabase test: `zzsdcxowhhaxnuliaryb`.
- Preview deployment: `dpl_9veE3BrmgthWzAk8HPHH2FJSc4zE` — READY.
- Stable Preview alias: https://project-83si4-git-fix-secure-interna-c3a225-nms-clouds-projects.vercel.app
- Preview build is pinned to test Supabase; production ref is absent from its bundle.
- Production `main`, production alias and production database were not changed.

## CURRENT TASK
Module: Suppliers → purchase journal.
Goal: Nigar must see all invoices, including those older than the old 500-row workspace boundary.
Status: TEST ACCEPTED AND PRODUCTION DEPLOYED. Live Nigar acceptance on `app.rms.rest` is pending.
Priority rule: all further changes and confirmations stay on test Preview until explicit production approval.

## ROOT CAUSE
- Nigar used a legacy internal session backed by the public anon client.
- The old complete-workspace RPC returned a bounded result; relevant supplier purchases could rank after its first 500 rows.
- Rasul's admin account used a different authorized path and therefore displayed the older invoices.
- This is a retrieval/authentication-path defect, not missing or deleted invoice data.

## IMPLEMENTED ON TEST
- Added genuine Supabase Auth sessions for internal RMS users through Edge Function `rms-internal-auth`.
- Internal passwords remain validated server-side; password values are not returned to the client.
- Added private account linkage and server-side failed-attempt tracking.
- Added tenant-scoped paged RPC `rms_supplier_purchases_page_secure(limit, offset)`.
- Frontend loads supplier purchases in 250-row pages and combines them before existing filtering/pagination.
- RPC validates Auth user, internal mapping, organization, active status and `suppliers` read/edit permission.
- RPC execute is revoked from `public` and `anon`; granted only to `authenticated`.
- Linkage and attempt tables have RLS enabled and no direct `anon` or `authenticated` table grants.
- Added tenant-scoped `rms_suppliers_workspace_secure()` for authenticated internal users; it returns only organization data and leaves purchases to the paged RPC.
- Fixed the login race by storing the internal-session marker and permissions before installing the Supabase Auth session, preventing `onAuthStateChange` from replacing Nigar with a raw `nigar@rms.internal` session.

## TEST EVIDENCE
- Test-only synthetic dataset: 520 purchases and 520 line items; no production records copied.
- Real Edge login returned HTTP 200 and created a genuine Supabase session.
- REST RPC with that session returned rows 1–250 at offset 0 and rows 501–520 at offset 500.
- Newest test invoice: `TEST-PAGE-0001`, 2026-09-12.
- Oldest test invoice: `TEST-PAGE-0520`, 2025-04-11.
- Access audit: anon RPC execute = false; authenticated RPC execute = true.
- Direct reads of auth-link and attempt tables = false for anon and authenticated.
- Local production build passed; Preview login page loads without application console errors.
- Screenshot verification identified the exact failure state: login succeeded, but the page called missing `rms_suppliers_workspace` and lost internal UI permissions.
- `rms_suppliers_workspace_secure()` was API-tested with Nigar's genuine Auth session: legal entities = 1, suppliers = 1, products = 1, embedded purchases = 0, error = null.
- Final branch transform contains the secure workspace selection and stores the internal marker before `auth.setSession`; transformed v404 source passed syntax/build validation.
- Current Preview deployment for commit `4deb2bd` is READY.
- User completed fresh mobile acceptance and confirmed: «всё ок».
- Production database verification after DDL: 2,485 purchases, 12,575 items and 2,317 active purchases unchanged; new secure workspace has safe search_path, anon execute=false, authenticated execute=true.
- Production bundle verification: secure Auth/workspace/paged RPC markers present; active Supabase client points to production.

## CURRENT PROBLEMS
1. Nigar must complete one fresh production login so Edge Auth can create/refresh her technical linkage, then verify historical invoices.
2. Production promotion is complete; keep rollback ready until Nigar confirms live access and old invoice visibility.
3. Supabase test advisor reports historical project-wide warnings outside this fix; do not broaden this task into unrelated schema cleanup.
4. v405 semifinished-product redesign remains queued behind this urgent supplier issue.
5. POS and QR work remain separate; do not mix their deployment targets or databases.

## DO NOT BREAK
- Existing production access for Nigar while the test fix is being validated.
- Internal RMS authentication and section permissions.
- Tenant isolation and RLS; never expose supplier RPC to anon as a shortcut.
- Supplier debts, payments, purchases, invoice items and Food Cost allocation.
- Revenue, attendance, salaries and manager-salary visibility.
- Existing recipe components in `rms_final_recipe_components`.
- One canonical `menu_item_id` for edit, photo, delete and components.
- Tech-card printing, QR photos and POS integration.
- Existing data: no broad deletes, resets, duplicate imports or recreated invoices.
- Never copy passwords, tokens, raw customer or financial data into GitHub.

## NEXT STEP
1. Ask Nigar to close the old tab, open https://app.rms.rest and sign in with her normal production login/password.
2. Verify Suppliers opens without an RPC/schema-cache error.
3. Select period «Все» and confirm invoices older than 7 September are visible.
4. Confirm other permitted sections still open and forbidden sections remain hidden.
5. If authentication or permissions regress, immediately restore deployment `dpl_9ExMg1y3M3MEyMvG1FcZUwxK7M8o` / rollback branch.
6. After live acceptance, mark production fix complete and resume the queued v405 semifinished-products task.

## ROLLBACK
- Production legacy-access rollback branch: `rollback/before-nigar-legacy-access-20260912`.
- Earlier source rollback checkpoint: `c14b3e4ed377a379f8bd0e2629c5828b101ef6ea`.
- Test changes are isolated on their task branch and separate test Supabase.
- No automatic production rollback or promotion is authorized.

## MODULE INDEX
- [Change history](docs/RMS_CHANGELOG.md)
- [Database and migration state](docs/RMS_DATABASE.md)
- [Business rules](docs/RMS_BUSINESS_RULES.md)
- [POS state](docs/RMS_POS_STATE.md)
- [QR Menu state](docs/RMS_QR_MENU_STATE.md)
- [Tech Cards state](docs/RMS_TECH_CARDS_STATE.md)
- [Task queue](docs/RMS_TODO.md)

## UPDATE CONTRACT
- Keep this file within 100–300 lines; move history to CHANGELOG.
- Update after every substantial change, test result, deployment, block or task switch.
- Record STABLE, WORKING and ROLLBACK separately.
- Record source commit separately from documentation commit.
- Never replace a newer concurrent update: reread branch head before writing.
- Never declare done from build or READY status alone.

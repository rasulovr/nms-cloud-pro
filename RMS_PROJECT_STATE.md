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
- Source commit: `d882bb674b8b0dcbd547b4ef42f038b93e7a391b`.
- Deployment: `dpl_9ExMg1y3M3MEyMvG1FcZUwxK7M8o` — READY.
- Vercel project: `prj_JpEc02KgTnexXmWbAJpK4EMpYM2O`.
- Supabase production: `meqttgiksyuyffuoghwx`.
- Authentication: original internal RMS authorization restored so Nigar can work.
- Runtime errors were not detected after restore.
- Production database, invoices, finances and permissions were not changed.
- Rollback branch: `rollback/before-nigar-legacy-access-20260912`.
- Known limitation: Nigar still receives a truncated old supplier workspace and cannot see all historical invoices.

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
Status: screenshot exposed a session-order race and missing protected workspace RPC; both are fixed and server/API/build verification passed. Fresh mobile UI acceptance remains pending.
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
- Remaining check: fresh authenticated mobile UI must show the Suppliers section, 520 records and final invoice `TEST-PAGE-0520`.

## CURRENT PROBLEMS
1. Production still intentionally uses legacy internal authorization and retains the old 500-row limitation for Nigar.
2. Fresh authenticated Preview UI acceptance after the session/workspace correction has not yet been completed.
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
1. Open the newly generated protected Preview link in a fresh browser tab and sign in as test Nigar.
2. Verify the Suppliers section is visible with no `rms_suppliers_workspace` cache error.
3. Verify journal count = 520 and final record `TEST-PAGE-0520` dated 2025-04-11.
4. Check supplier filters and report any visible error; fix and redeploy test only if needed.
5. After successful test acceptance, prepare a narrow production migration/deployment plan and rollback.
6. Do not promote until the user separately authorizes the exact production changes.
7. Update this file and changelog after the result.

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

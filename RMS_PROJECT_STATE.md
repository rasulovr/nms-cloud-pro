# RMS PRO — CURRENT PROJECT STATE

Last updated: 2026-09-16 (UTC)
Owner: RMS Pro development
Status: canonical handoff active on `docs/rms-project-state`.

## READ FIRST
- Canonical repository: https://github.com/rasulovr/nms-cloud-pro
- Application branch: `main`.
- Canonical documentation branch: `docs/rms-project-state`.
- Always read `AGENTS.md` and this file from the documentation branch before work.
- Read only the module documents needed for the selected task.
- Do not use the application snapshot in the documentation branch as the code base.
- Fresh GitHub, Vercel and database evidence supersedes stale documentation.
- New user instructions supersede recorded priorities and permissions.
- Unknown means unverified; never invent a commit, deployment, migration or success.
- STABLE, WORKING, DEPLOYED and USER-ACCEPTED are separate states.

## CURRENT STABLE — PRODUCTION
- Product: RMS Pro.
- Frontend URL: https://app.rms.rest
- Source branch: `main`.
- Source commit: `88f383b6e3d36f37127a6bb4053b25fa41a256a1`.
- Source version: `main_v413_forecast_current_pace`.
- Production deployment: `dpl_7Dc6SrJeaYZHGG1y91YmFviM34UN` — READY.
- Vercel project: `prj_JpEc02KgTnexXmWbAJpK4EMpYM2O`.
- Vercel team: `team_6d79ZloPmnGRTtEVn5fJmgd5`.
- Production Supabase: `meqttgiksyuyffuoghwx`.
- Production asset observed on 2026-09-16: `/assets/index-Bi_rgfo3.js`.

## v413 BEHAVIOR
- Variable monthly expense forecasts use the current-month pace whenever current data exists.
- Historical averages are used only when the current month has no data for that article.
- Staff service charge remains visible as an informational amount.
- Staff service charge is excluded from P&L expenses, profit and profitability calculations.
- The rule is synchronized across Dashboard, Finance and Reports.
- No database, schema, RLS or production-data mutation was part of v413.
- Changed source parts: `src/main.parts/part-00.jsxpart`, `part-03.jsxpart`, `part-04.jsxpart`.

## VERIFICATION — 2026-09-16
- GitHub `main` resolves exactly to `88f383b6e3d36f37127a6bb4053b25fa41a256a1`.
- Vercel reports the same GitHub SHA on the active Production deployment.
- Deployment target is Production and state is READY.
- `app.rms.rest` opened the RMS Pro internal-login form in the cloud browser.
- No application console errors were observed on the login page.
- Vercel returned no error/fatal runtime logs for the deployment in the checked 24-hour window.
- Authenticated business-flow acceptance was not repeated during this documentation-only task.

## CURRENT TASK
Module: Project continuity / documentation.
Goal: replace the stale 2026-09-13 handoff with the verified v413 Production state.
Status: COMPLETED on 2026-09-16.
Scope: documentation branch only; `main`, Production and Supabase were not changed.
Next product task: not selected. Wait for an explicit user request before code, database or deployment work.

## CURRENT KNOWN PRODUCT STATE
- Tech Cards v405 and subsequent fixes through v410 were promoted before v413.
- Reports supplier-debt work v411 and expense-ledger work v412 preceded v413.
- POS, QR Menu, SaaS and Loyalty remain separate workstreams; do not mix their targets.
- Previous Nigar/auth notes in the 2026-09-13 handoff are historical, not the active task.
- Do not infer restricted-user acceptance from the public login-page check.

## DO NOT BREAK
- Internal RMS authentication and section permissions.
- Tenant isolation, RLS, licensing and protected RPC boundaries.
- Supplier debts, payments, purchases, invoice items and Food Cost attribution.
- Revenue, attendance, salary and manager-salary visibility rules.
- Existing recipe components in `rms_final_recipe_components`.
- One canonical `menu_item_id` for edit, photo, delete and components.
- Tech-card printing, QR photos and POS integration.
- Existing data: no broad deletes, resets, duplicate imports or recreated invoices.
- Never copy credentials, sessions, personal records or business exports into public Git.
- Do not change GitHub `main`, Vercel Production or production Supabase without task-specific authorization.

## FORECAST AND P&L CONTRACT
- Revenue includes the customer service charge as recorded by existing revenue logic.
- Staff service-charge calculation may be shown for operational reference.
- Staff service charge does not reduce P&L profit in v413.
- Tax, salaries, Food Cost, rent and operating expenses retain their existing approved logic.
- Forecast history is a fallback only when a current-month article has no data.
- Dashboard, Finance and Reports must use the same P&L inclusion rules.

## ROLLBACK
- Immediate pre-v413 rollback branch: `rollback/pre-v413-20260916`.
- Rollback source commit: `77f8bd0c16238d3a1c2bc1e3ed0b2b9ead0ee727` (v412 corrected source-part boundaries).
- Rollback is not authorized automatically; use only after explicit task-specific approval and verification.
- Older rollback branches remain historical checkpoints and are not the default recovery target.

## MODULE INDEX
- [Change history](docs/RMS_CHANGELOG.md)
- [Database and migration state](docs/RMS_DATABASE.md)
- [Business rules](docs/RMS_BUSINESS_RULES.md)
- [POS state](docs/RMS_POS_STATE.md)
- [QR Menu state](docs/RMS_QR_MENU_STATE.md)
- [Tech Cards state](docs/RMS_TECH_CARDS_STATE.md)
- [Task queue](docs/RMS_TODO.md)

## SESSION START
Use:
“Continue RMS Pro strictly from branch `docs/rms-project-state`. Read `AGENTS.md` and `RMS_PROJECT_STATE.md`, verify live `main` and Production, perform only the requested task, then update the project documentation.”

## UPDATE CONTRACT
- Keep this file within 100–300 lines; move durable history to CHANGELOG.
- Update after every substantial change, test result, deployment, blocker or task switch.
- Record STABLE, WORKING, DEPLOYED and ROLLBACK separately.
- Record application source commit separately from documentation commit.
- Reread remote documentation head before writing and never force-update.
- Never declare completion from build or READY status alone.

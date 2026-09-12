# RMS PRO — CURRENT PROJECT STATE

Last updated: 2026-09-12 (UTC)
Owner: RMS Pro development
Status: canonical handoff active on `docs/rms-project-state`.
Publication authorized by the user and completed on 2026-09-12.

## READ FIRST
- Canonical repository: https://github.com/rasulovr/nms-cloud-pro
- Canonical documentation branch: `docs/rms-project-state`.
- Always read this file from that branch, even when application checkout is on main.
- Application branch: `main`; documentation branch is NOT an application development base.
- GitHub documentation supersedes older chat summaries for recorded state.
- Fresh code / deployment / database evidence supersedes stale documentation.
- New user instructions supersede recorded task priorities and permissions.
- Unknown means unverified; do not invent a commit, deployment, migration or success.
- Read [AGENTS.md](AGENTS.md), then only the module required for Current Task.

## CURRENT STABLE
- Last reported working checkpoint: v403 — `main_v403_menu_create_rpc_fix`.
- Code commit: `6e6e487ff3f3fa1cbb2992b4b15b77d59d3ec12c`.
- Historical production checkpoint: `dpl_ErL55YK5Xp2aSiANjZX1xjo8ENVT`.
- Evidence: previous handoff dated 2026-09-11 reports READY, RPC transactional test passed.
- Limitation: subsequent user report repeats menu_items RLS error; NOT a fully accepted release.
- Fully regression-verified stable release: not established in this handoff.
- Never roll back automatically to this older checkpoint.

## CURRENT CODE / WORKING VERSION
- Latest application source verified in GitHub: v404.
- Source marker: `main_v404_start_page_tech_card_form_fix`.
- Full frontend: `src/main.jsx`.
- Application commit: `c14b3e4ed377a379f8bd0e2629c5828b101ef6ea`.
- Commit date: 2026-09-11T16:29:16Z.
- GitHub reports successful Vercel deployments for project-83si4 and rms-saas-staging.
- This proves deployment completion, not live alias assignment or user acceptance.
- v405 / semifinished redesign: requested; saved source, branch and deployment not located.
- Start new application work from latest verified code, preserving v404 fixes.
- Before editing, check remote main and concurrent work; v405 may exist outside main.
- ROLLBACK CANDIDATE: v403 commit above; historical fallback, not an instruction to revert.
- Documentation commits do not increment the frontend version.

## ENVIRONMENTS
| Purpose | Address / identifier | Evidence |
| --- | --- | --- |
| RMS production | https://app.rms.rest | Established production URL; alias not rechecked this task |
| RMS Vercel | project-83si4 / prj_JpEc02KgTnexXmWbAJpK4EMpYM2O | Earlier verified handoff |
| SaaS staging | https://rms-saas-staging.vercel.app | Separate deployment target; do not confuse with RMS |
| SaaS Vercel | prj_lh1xU1uCWzjAuGUrPjc1jCnAN7dw | Previous project context |
| Supabase production | UNKNOWN — resolve from production configuration before DB work | src/supabase.js only uses environment variables |
| Supabase test/staging | zzsdcxowhhaxnuliaryb | Previous applied migration records |
| POS project address | https://rms-pos-cloud-preview.vercel.app | Not guaranteed to point at latest Preview |
| Last recorded POS Preview | https://rms-pos-cloud-preview-qv6w6guik-nms-clouds-projects.vercel.app | 2026-09-11 handoff; see module |
| QR public | https://baristachef.rms.rest | Separate client project, using staging DB historically |

## CURRENT TASK
Module: Tech Cards → Semi-finished products.
Goal: creation flow inspired by iiko or equivalent, but simpler and intuitive.
Status: requested; implementation completion is NOT verified.
Current user priority: finish persistent GitHub handoff before application changes.
Task owner: next RMS development session; no exclusive edit lock is claimed here.
Requirements, acceptance checks and unresolved details: [Tech Cards](docs/RMS_TECH_CARDS_STATE.md).

## LAST COMPLETED
- v403 replaced direct dish INSERT with existing secure creation RPC (earlier verified checkpoint).
- v404 initializes dashboard and avoids restoring the previous Reports screen.
- v404 chooses an allowed non-Reports section when dashboard is not permitted.
- v404 removes “Поиск тех. карты” from the creation form.
- GitHub diff verifies these v404 source changes; functional acceptance still pending.
- Persistent module documentation and agent handoff rules published on 2026-09-12.

## CURRENT PROBLEMS
1. Repeated menu_items RLS error reported after earlier fix; confirm actual deployed asset and failing request.
2. v404 startup and form changes need checking under the affected restricted internal user.
3. v405 semifinished work may be in another session/artifact; locate before duplicating it.
4. Current production DB reference and live v404 alias are not independently verified here.
5. POS deployed bundle has no confirmed matching Git commit; do not substitute repo main blindly.
6. QR secondary custom domains were still unconnected in the last verified handoff.

## DO NOT BREAK
- Internal RMS authentication and section permissions.
- Revenue, attendance, salaries and manager-salary visibility.
- Supplier debt, purchases and Food Cost allocation.
- Existing recipe components in rms_final_recipe_components.
- One canonical menu_item_id for edit, photo, delete and components.
- Tech-card printing, QR photos and POS integration.
- Existing data: no duplicate imports, broad deletes, resets or recreated menu items.
- RLS and tenant isolation; no broad anon policy as a shortcut.

## NEXT STEP
1. Read this file, AGENTS.md and Tech Cards state.
2. Compare latest remote main against c14b3e4; locate any saved v405 work.
3. Verify affected user's startup and creation request; identify exact failing operation.
4. Inspect current semifinished model and flow; research official iiko documentation.
5. Implement the simplest agreed flow, then verify yield, cost, persistence and editing.
6. Update working version, exact source commit, test evidence and next action.
7. Promote STABLE only after relevant checks; record deployment separately from code completion.

## WORK SCOPE / PERMISSIONS
- Persistent GitHub project documentation was explicitly authorized and published.
- That authorization does not include DB mutations, application changes or deployment promotion.
- Earlier task-specific approvals exist; preserve exact target and scope when recovered.
- Do not ask for permission again when the same concrete action is already authorized.
- Generic “разрешаю” without a recoverable action is not permission for unrelated targets.
- Prior automatic rejections must not be bypassed through an alternate publication channel.
- No credentials, tokens, PINs, personal records or raw business exports belong in this public repo.

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
- Before ending a session, record saved work location and one concrete next action.
- Record source commit separately from documentation commit to avoid self-referential SHA.
- Never replace a newer concurrent update: reread branch head and merge documentation.
- Never declare “done” based only on an intention, build or deployment READY.
- Archive superseded facts; do not stack multiple contradictory CURRENT sections.
- The older standalone RMS_PROJECT_STATE.md is historical evidence, not the live authority.

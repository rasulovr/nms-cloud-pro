# Read-only e-qaimə workspace review

## Base/version
- Existing app/repository: rasulovr/nms-cloud-pro, app.rms.rest.
- Fetched origin/main and started isolated worktree branch feat/ruslan-eqaime-review at 7a917b9bf4f2324b5c2b5367a9ed0874ff6b21c4.
- Vercel project project-83si4 production deployment dpl_C9EaUhFTs7WxpuRdLLSWKdhP6kwH confirms same git SHA, READY, production alias app.rms.rest. Checked 2026-11-17.
- Original rms-supplier-loading checkout unchanged. New worktree only; no DB writes, schema, grants, authentication changes or document uploads.

## User-facing change
Existing DebtsPayments receives one separate `E-qaimə · Руслан` tab. Existing ledger/debt calculations untouched. When this tab is selected, existing all-payer KPI panel is not shown above it, avoiding confusion with the new blocked amount. Other tabs retain their existing presentation.

Authenticated on-demand read-only register for Ruslan legal entity only; no secrets or private primary evidence embedded in source/bundle. All invoice/payment/purchase queries filter legal_entity_id, links filter previously fetched invoice IDs, purchases filter needed purchase IDs. Existing server RLS remains responsible for access; no grants widened. Names retrieved only for suppliers in those scoped records.

Register/payout-history/link-discrepancy views; search, dates, pagination, refresh and explicit loading/error/empty states. Failure suppresses partial or stale data. Cancellation prevents late loads rendering after unmount. Linked allocations exceeding purchase total across multiple cards flag every affected card. No delete/edit/import/save action.

## Truthfulness guards
Debt always null / not calculated. Source is RMS cards, not original confirmed tax invoices. matched is not approved or paid. No canonical+suffix totals. No e-invoice + physical purchase summation. Date span is explicitly observed RMS record dates, never evidence of complete document/bank/cash coverage. Primary originals not connected to this view. Card-vs-link difference is a review candidate, not a proved wrong invoice.

## Authentication blocker
Production source Login allows rms_internal local-only profiles without Supabase sign-in. The new API requires server-side auth.getUser(jwt) verification plus an exact owner match from private server configuration and fails closed for those local-only sessions. UI explains this distinctly from a generic “log in again”. Secure existing supplier RPCs require auth.uid(). Live rms_internal_login_secure is password-based, changes last_login timestamps and returns a profile, not JWT. The repository Edge Function rms-internal-auth can create/link Auth users, but current Login does not invoke it; activating it is outside this read-only change and was not attempted.

Therefore do not describe the register as operational for every existing internal account before verifying the owner's supported session. No client-storage bypass permitted. Authenticated Supabase sessions are supported. Handling legacy authentication safely is a separate review, not a hidden prerequisite migration.

## Tests and limits
- node --test scripts/test-eqaime-register.mjs: 18 passing (scoping, suffix/composite, duplicate links, cross-card over-allocation, deleted/wrong-supplier links, null amounts, no debt inference, auth gate, pagination/fail-closed, no write methods).
- npm run build: required existing payment/payroll regression checks and Vite production build pass; normal large-chunk warning remains.
- scripts/test-eqaime-browser.mjs builds synthetic fixture. Local executable Chromium could not launch in command sandbox (socket EPERM / crashpad). Escalated review infrastructure errored; no browser success claimed from that command. A separate localhost synthetic fixture is available to parent for CUA testing; parent records actual UI results separately.
- No real private data in fixture. No live auth/user-session read performed by new UI yet. No production behavior verification yet.

## Controlled release / rollback
1. Independent final diff and CUA review; verify auth availability for intended user before claiming usable live register.
2. Recheck current origin/main and production SHA, rebase if changed, rerun tests/build. Do not include node_modules, temporary output, private audit files or fixture artifacts in commit.
3. Upon explicit coordinator authorization: reviewed feature commit and normal preview/PR route, or approved production route. No SQL/auth migration accompanies it.
4. Verify deployed SHA and READY, login gate remains, new tab scoped, old tabs unchanged, sources and missing evidence labels present; no modification requests triggered.
5. Rollback by reverting only this feature commit / promoting known previous deployment. No DB restore needed because no writes exist. Keep original source history untouched.

## Synthetic hosted preview (2026-11-17)
A separate owner-private synthetic Site was published successfully. Hosting access checked: custom owner-only allowlist, no external viewers or groups. It is NOT an RMS deployment.

Published assets are only index.html, fixture.css, fixture.js. Sanitized bundle uses demo-legal-entity, Демо-плательщик, invented 2030 dates and MT99… invoice numbers; mock client has no Supabase network client/URL/token. Forbidden-token scan for actual entity UUID, taxpayer number, bank account prefix, Supabase host/project, credentials and actual invoice prefix passed. No production originals, source ledger or user data uploaded.

Cloud CUA verified the private Site gate; “Continue with ChatGPT” reached OpenAI login without a signed-in session. UI interactions/screenshots of the component remain unverified. Privacy was not weakened. A signed-in owner browser or separately authorized synthetic-only public host is needed for further visual QA. Do not interpret successful hosting or node tests as browser QA success.

## Completed synthetic browser QA (2026-11-17)
A separately authorized, fully synthetic public preview was inspected through cloud CUA. No real identities, tax IDs, accounts, Supabase URLs/keys or primary documents were deployed; mock client has no fetch/XHR/WebSocket code. Existing private preview and RMS production were not modified.
Verified: 27 cards with 25/2 pagination; single payment without bank confirmation; search/reset; 100 minus 90 discrepancy of 10; read-error removes all table rows; absent mock server-session fails closed; unmount/remount restores 25 rows; invalid date interval shows validation alert after native keyboard input. CUA date fill alone did not trigger React change; native ArrowUp did. Layout inspected at 500px and 1180px inner widths, no document-wide overflow (table scroll remains internal). This is narrow responsive layout testing, not iOS/Safari/device testing. Extension-only metadata console errors were observed; no application errors observed in tested UI.
This does not verify production authentication, data access, primary-document completeness, or supplier debt. Legacy internal RMS sessions are deliberately not accepted as server authentication.

## Private scope rework (pending review)
Server-only sensitive environment configuration and GET API replace hardcoded payer identifier. No environment or production changes have been applied. The previous local release commit must NOT be pushed: publish a clean tree based on current main, excluding its intermediate history.

### Server boundary
One server-only sensitive variable `RMS_EQAIME_REVIEW_SCOPE`, with `{version:1, enabled:true, allowedAuthUserId:<verified existing owner>, legalEntityId:<verified entity>}`. Values are never seeded in the repository. API GET `/api/eqaime/review` rejects caller query parameters, cross-site fetches, wrong methods, missing/invalid JWT, anonymous users and owner mismatch. Supabase reads use existing anon key plus caller Authorization, not privileged credentials. Selected columns only; no creator fields or service comments. No CORS grant. All replies private/no-store; errors constant, no tokens/config echoed or logged. Caps: 10,000 rows per dataset, 100-ID lookup chunks, 500-row pages, 2 MB response and 15-second request deadline. User UUID and entity UUID are omitted from response. Existing financial RLS is unchanged.

### Pending verification
This rework has not been deployed. The earlier browser QA tested the same UI with direct mock loader, not this new API boundary. Native Vercel preview must verify `/api/eqaime/review` returns JSON 401 without a token (not catch-all index.html), and synthetic tests cover authenticated behavior. Do not alter existing loyalty routes or Vercel routing speculatively. No real login/session test is authorized.

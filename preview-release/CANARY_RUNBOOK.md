# Read-only canary panel integration

Local only. No deployment/storage/config changes applied.

Panel appears only in e-qaimə workspace of the existing normally signed-in RMS preview. No new login form; no getSession/token extraction. It calls getUser and compares SHA256 of returned UUID with an independently verified owner-mapping digest. UUID itself is not compiled into the browser. Anonymous client is isolated (no persisted session, no auto refresh, no URL session, distinct storageKey) and uses existing public anon key only. Button is manual; reads only one synthetic canary. A changed session discards results. No writes are performed.

## Build gates
- Enabled only if `VERCEL_ENV=preview` OR local `vite serve` in development without VERCEL_ENV.
- Requires `RMS_READ_CANARY_ENABLED=1` plus `RMS_CANARY_OWNER_SHA256=<64 lower-case hex>`.
- `VERCEL_ENV=production` always disables, even when flag/digest supplied.
- Ordinary local production build disables as well.
- Dynamic import is under compile-time positive branch. Production bundle contains neither probe, target canary path, synthetic canary marker nor owner digest. No production endpoint added for this panel.

## Next concrete step
1. Verify exact existing owner auth UUID against authorized server mapping; compute its SHA256 privately. No password or JWT is needed. Do not derive mapping solely from display name/email.
2. Review actual preview branch/commit and read-only canary plan. Set these TWO values only in preview branch configuration; keep production unset. Existing public Supabase config remains unchanged. Do not enable real invoice/bank source configs for this test.
3. After explicit authorization for preview publication, deploy exact reviewed commit to the existing preview, verify deployed SHA/READY and panel absence from production build.
4. Owner opens preview and signs in normally. Legacy local RMS login is insufficient: getUser must verify identity. Panel remains empty for wrong/missing/anonymous identity.
5. Until canary bucket/policies/object have independently passed the approved security preflight and permitted setup, running the panel is expected BLOCKED. Do not treat that as a reason to widen access.
6. With authorized synthetic canary present, owner clicks read-only check. Result names owner integrity/list and anon bucket/download/list checks. Network/500 errors => UNKNOWN, not proof of denial.
7. READ_CHECKS_PASS is only owner/anonymous reads. It does NOT cover non-owner signed HTTP, public route, signed URLs, mutations or old bucket baseline. Do not upload real data or claim batch A complete based solely on this result.

Disable by removing preview enable flag and rebuilding; no data rollback. No storage policies are relaxed, and owner session is not signed out by harness.

Tests: 14 unit/gate tests passed. Full production build forced `VERCEL_ENV=production` with enable flag and synthetic digest tests dead-code exclusion. Actual browser interaction remains unverified because command Chromium fails with socket EPERM; use the existing authorized browser during reviewed preview QA. No publication attempted.

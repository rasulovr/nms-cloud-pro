# RMS change history

Entries distinguish source changes, recorded deployments and verification.
Only durable milestones belong here; no copied chat transcript.

## 2026-09-12 — Nigar supplier pagination fix isolated on test
- Root cause confirmed: legacy internal/anon workspace path truncated supplier purchase history at a bounded result, while owner/admin path could read older invoices.
- Production was first restored to original internal authorization so Nigar could continue working.
- Production frontend: commit `d882bb674b8b0dcbd547b4ef42f038b93e7a391b`; deployment `dpl_9ExMg1y3M3MEyMvG1FcZUwxK7M8o` READY.
- Production database, invoices, finances and permissions were not changed.
- Test-only source commit: `3a90e35de2833b13b0511b669e3eaf61dee15aa5`.
- Test Preview: `dpl_2Q75DwCzE6GJTy21np9UqQVVk2S5` READY.
- Preview bundle is pinned to test Supabase `zzsdcxowhhaxnuliaryb` and does not contain the production project ref.
- Added Edge-backed internal login with genuine Supabase Auth session and tenant-scoped linkage.
- Added protected paged purchase RPC, limited to authenticated linked internal users with supplier permission.
- Inserted 520 synthetic test purchases and 520 items, marked test-only; no production records copied.
- End-to-end Edge login + REST RPC test returned offset 0 (250 rows) and offset 500 (20 rows), including oldest `TEST-PAGE-0520` dated 2025-04-11.
- Grant audit passed: anon cannot execute the RPC; auth-link and failed-attempt tables are unreadable directly by anon/authenticated.
- Preview login screen loads; authenticated browser journal acceptance remains pending.
- No production promotion is authorized.

## 2026-09-12 — Persistent handoff
- Published RMS_PROJECT_STATE.md, AGENTS.md and module documents to `docs/rms-project-state` after explicit authorization.
- Documentation branch is separate from the application branch.
- Historical source checkpoint at publication: `c14b3e4ed377a379f8bd0e2629c5828b101ef6ea`.

## 2026-09-11 — v404
- Commit `c14b3e4ed377a379f8bd0e2629c5828b101ef6ea`.
- Source marker `main_v404_start_page_tech_card_form_fix`.
- Dashboard initialization; stop restoring last Reports section; allowed non-Reports fallback.
- Removed tech-card search from creation form.

## 2026-09-11 — v403
- Commit `6e6e487ff3f3fa1cbb2992b4b15b77d59d3ec12c`.
- Dish creation calls `rms_tech_menu_item_create_secure`.
- Historical production checkpoint `dpl_ErL55YK5Xp2aSiANjZX1xjo8ENVT`.
- Transaction test: anon direct insert rejected; secure RPC succeeded; test rolled back.

## 2026-09-09–11 — POS and QR
- Exact branch menus imported; repeat import not required.
- QR image optimization published on primary client domain.
- POS photos, cancellation form, compact KDS, item readiness and served restore implemented.
- Staging create_table migration applied; last recorded POS Preview is in the module file.

## Future entry format
Date / module / source commit / target environment / result / checks / limitations / rollback reference.

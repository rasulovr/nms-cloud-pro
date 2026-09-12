# RMS change history

Entries distinguish source changes, recorded deployments and verification.
Only durable milestones belong here; no copied chat transcript.

## 2026-09-12 — Persistent handoff
- Prepared RMS_PROJECT_STATE.md, AGENTS.md and module documents for docs/rms-project-state.
- Publication rejected by automatic approval review because destination is public; branch not created.
- Application source checkpoint: c14b3e4ed377a379f8bd0e2629c5828b101ef6ea.
- Verified GitHub commit diff and successful Vercel status records.
- No application source or database changes in this documentation task.
- v405 remains unverified; repeated creation error remains open.
- Historical source: standalone RMS_PROJECT_STATE.md, version 24, updated 2026-09-11.
- That older document contains superseded sections; latest dated entries were used.

## 2026-09-11 — v404 (source verified 2026-09-12)
- Commit c14b3e4ed377a379f8bd0e2629c5828b101ef6ea.
- Source marker main_v404_start_page_tech_card_form_fix.
- Dashboard initialization; stop restoring last Reports section; allowed non-Reports fallback.
- Remove tech-card search from creation form.
- GitHub deployment statuses: project-83si4 and rms-saas-staging success.
- Live alias and restricted-user acceptance not verified in handoff setup.

## 2026-09-11 — v403 (historical verified report)
- Commit 6e6e487ff3f3fa1cbb2992b4b15b77d59d3ec12c.
- Dish creation calls rms_tech_menu_item_create_secure.
- Production checkpoint dpl_ErL55YK5Xp2aSiANjZX1xjo8ENVT.
- Transaction test: anon direct insert rejected; secure RPC succeeds; test rolled back.
- Subsequent user reports repeat RLS failure; do not close without reproducing current request.

## 2026-09-09–11 — POS and QR (historical recorded milestones)
- Exact branch menus imported; repeat import not required.
- QR image optimization published on primary client domain.
- POS photos, cancellation form, compact KDS, item readiness and served restore implemented.
- Staging create_table migration applied; last recorded POS Preview in module state.
- These milestones are not independently retested by documentation setup.

## Future entry format
Date / module / source commit / target environment / result / checks / limitations / rollback reference.


# RMS task queue
Last updated: 2026-09-16.
Do not automatically execute every item. The current explicit user task controls priority.

## Current
- [x] Verify GitHub `main` after Production v413.
- [x] Verify the active Vercel Production deployment and source SHA.
- [x] Verify that `app.rms.rest` opens without application console errors.
- [x] Update the canonical v413 handoff, business rules and change history.
- [ ] Select the next product task only from a new explicit user request.

## Verified continuity
- [x] Canonical documentation branch: `docs/rms-project-state`.
- [x] Production source: `88f383b6e3d36f37127a6bb4053b25fa41a256a1`.
- [x] Production deployment: `dpl_7Dc6SrJeaYZHGG1y91YmFviM34UN` — READY.
- [x] Immediate rollback: `rollback/pre-v413-20260916` at `77f8bd0c16238d3a1c2bc1e3ed0b2b9ead0ee727`.
- [x] Update root state and relevant module documentation after each substantial result.

## Product follow-ups — not active until explicitly selected
- [ ] Run authenticated acceptance of v413 figures for the user-selected branch/month.
- [ ] Reproduce any remaining `menu_items` RLS error with the affected restricted user.
- [ ] Verify Tech Cards save/reopen/edit, permissions, printing and QR photo linkage after v410.
- [ ] Confirm current Nigar access and historical supplier-invoice visibility only if the user reopens that task.
- [ ] August/September 2026 revenue/expense import: preserve prior rows and exclude Bazar.
- [ ] Match current POS and QR deployed packages to durable source refs.
- [ ] POS authenticated table-creation verification.
- [ ] Secondary QR domains connection and root-path verification.
- [ ] Continue QR → waiter confirmation → kitchen/bar end-to-end verification.

## Backlog
AI recommendations, upsell, menu scheduling, shared carts/bills, loyalty integration,
analytics and other proposed enhancements require specific task selection.

## Safety
- No automatic Production deployment, database mutation, rollback or branch merge.
- Reverify live refs before each write.
- Keep POS, QR Menu, SaaS/Loyalty and RMS Pro deployment targets separate.

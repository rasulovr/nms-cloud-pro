# RMS POS state
Last consolidated: 2026-09-12 from the prior 2026-09-11 handoff.
No live POS tests were performed by the documentation task.

## Last recorded checkpoint
- Repository: rasulovr/rms-pos-cloud-preview.
- Project: rms-pos-cloud-preview / prj_TK2Mq976dfMNUtrX4NNJqDzeyHKo.
- Preview deployment: dpl_9AtwDS2tPSCkyxmzriAHTMd3uEzm.
- URL: https://rms-pos-cloud-preview-qv6w6guik-nms-clouds-projects.vercel.app
- Recorded READY; target Preview; aliases empty.
- Deployment/source Git commit correspondence: NOT established.
- Do not replace recovered deployed frontend with repository main without comparison.
- JS: index-pos-board-actions-v1.js; CSS: pos-board-actions-v1.css.
- Readable source mentioned in previous archive: BoardActions.js and patch-board.py.

## Last completed in recorded checkpoint
- Back button in upper panel; account in sidebar bottom.
- New order opens table picker; occupied table opens existing order.
- Add table uses scoped create_table; new tables have no hall.
- Staging migration pos_board_create_table_scoped_idempotent applied.
- Server derives organization/branch from terminal, checks role/name/code/duplicates
  and uses request UUID for idempotency.
- Recorded syntax/build and isolated SQL tests passed.
- Live PIN screen checked; authenticated new-table creation was not tested in that step.

## Earlier preserved behavior
- Compact kitchen/bar cards; readiness per dish row.
- Entire card ready only when all rows ready.
- Explicit issue confirmation; Served section supports return to Ready.
- Readiness operates on the whole quantity row, not partial units.
- Cancellation for sent items requires reason and write-off choice; routed cancellation ticket.
- Wider quantity buttons, one current check selector, managed split-bill action.
- Reports tabs: overview, products, hourly, checks, cancellations.
- Product images restored with optimized image URLs.
- PIN is four digits; never put an actual PIN in public documentation.

## Boundaries and next checks
- Earlier permissions cover test Supabase and POS Preview for specified changes only.
- Do not infer production promotion permission.
- Before changes recover full deployable source and record a matching durable Git ref.
- Verify table creation under an allowed PIN session and duplicate/retry behavior.
- Keep QR waiter confirmation, kitchen/bar routing, cancellation and served-restore compatible.
- New bar order / full guest flow were not rerun at every historical checkpoint.


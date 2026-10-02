# Admin expense correction: isolated draft Preview

This branch is a partial UI prototype, **not ready to merge or promote to production**.

## What the Preview demonstrates

- The actual expense row and save/cancel handlers are extracted from the application source by a Vite plugin.
- Administrators can edit the amount/comment of an old ordinary expense; staff retain the seven-day UI restriction.
- Dates/categories and historical cancellation remain locked. Automatically allocated historical rows remain locked.
- Cancel/Close discards a draft. Repeated or unchanged saves do not issue duplicate UI requests. Failed requests do not falsely update or remove a row.
- The visible journal is an explicitly labeled, in-memory simulation. Reload or reset clears all synthetic data.

## Isolation

The branch entry point intentionally renders only the synthetic editor. It does not import the application or Supabase client. No credentials are needed. `publicDir: false` omits unrelated public assets; explicit static-only Vercel builds omit API handlers. A CSP blocks connections. The Vite plugin rejects `VERCEL_ENV=production`.

Do not merge the isolated entry point, hosting configuration, or production-build guard into the live application. Extract and review the intended application changes separately after backend verification.

## Still required

- Server-side actor/admin/time enforcement must be verified. The existing UI window is not a server authorization guarantee.
- Historical cancellation requires a row lock plus an already-cancelled no-op before audit/ledger posting. The existing procedure can repeat a reversal.
- Real ERP before/after audit, actor attribution, ledger delta and concurrent/retry semantics require an approved isolated database test.
- No historical opening or imported ledger backfill is included.
- No database functions, permissions, grants or production data are changed by this draft.

## Checks

`npm run test:admin-expense-preview`

`npm run test:admin-expense-handlers`

`npm run build && npm run test:admin-expense-isolation`

The local browser test requires Playwright and a usable Chromium runtime. Browser testing of the hosted synthetic Preview does not validate the real database.

Three pre-existing broader checks fail on unchanged main: the daily-ledger service-charge source assertion; the supplier-idempotency cancelled-journal assertion; and the supplier-selection JSX parser check. They are unrelated to this patch and remain unresolved.

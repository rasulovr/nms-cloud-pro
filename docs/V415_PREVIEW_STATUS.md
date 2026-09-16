# RMS Pro v415 Preview status

Updated: 2026-09-16.

## Scope

- Feature branch: `fix/v415-preliminary-shared-allocation`
- Feature commit: `7d8128e731263ce2f4346b7ac3e3c83aee0847e9`
- Vercel deployment: `dpl_CAi7hQ8CQoPNsyBK1JEyqhLu4gwv`
- Target: Preview only
- Production remains on `main` commit `88f383b6e3d36f37127a6bb4053b25fa41a256a1` (v413)

## Implemented rule

- Supplier invoices with an explicit branch remain confirmed and are attributed 100% to that branch.
- Supplier invoices without a branch continue to enter P&L and forecasts by the same-period revenue share.
- This revenue-share result is explicitly labelled as a preliminary allocation and must not be interpreted as a confirmed warehouse receipt.
- Dashboard, Finance, forecast details and Reports expose the preliminary status without changing calculation totals.

## Verification

- Local production build: passed, 1639 modules.
- Vercel Preview build: READY, 1639 modules.
- RMS Pro login form: opened successfully.
- Preview application runtime errors: 0 at verification time.
- Production was checked separately and was not changed.

## Next action

Do not merge or promote to Production without an explicit user instruction.

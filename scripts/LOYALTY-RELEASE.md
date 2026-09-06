# Brand-configurable bonus program

Target: SaaS Supabase `zzsdcxowhhaxnuliaryb` only. Do not apply to the original RMS database.

The SQL below is prepared and tested with transaction rollback. It has **not** been installed persistently; installation requires approval. Publishing this branch builds a frontend Preview only and does not run SQL. Do not promote this frontend before the database functions are installed.

Installation order after approval:

1. `loyalty-brand-program.sql`: private versioned settings and owner/admin RPCs.
2. `loyalty-payment-engine.sql`: bonus lots, payment receipts, staff payment RPCs.
3. `loyalty-guest-program.sql`: guest conditions and available unexpired balance. Requires the existing scoped guest-card trigger from `guest-loyalty-applied.sql`.

No brand is automatically activated. Owner/admin selects a brand in Loyalty → Settings and saves its conditions. Staff with cashier/manager/owner/admin membership and active QR Menu + Loyalty licenses can confirm existing QR orders linked to a guest card. There is no external POS import in this change.

Financial behavior:

- One bonus = 1 AZN. Earning and redemption round down to two decimal places.
- Rate comes from the highest applicable spending tier before the current purchase; otherwise the base rate applies.
- Cashback is earned on money paid only, after the minimum purchase check.
- Redemption is limited by the current unexpired balance, brand percentage, and minimum redemption balance.
- Each earning has its own expiry; spending consumes the earliest-expiring lots first.
- Payment locks the order, organization rules and guest card. Repeating an identical confirmation returns the stored receipt; changing its amounts fails.
- A settings revision conflict requires reload. Historical receipts retain the original settings snapshot.
- The guest cannot edit rules or confirm payment. Existing RLS stays enabled; new private tables have no direct authenticated grants.

Verification: Vite production build passed. Transaction tests cover settings permissions and validation, stale revisions, cash-only earning, minimum purchase, redemption, tiers, duplicate confirmation, guest isolation, expiry visibility and unchanged historical receipts. Test transactions were rolled back; no test users or bonus entries remain. Full browser checkout has not been verified against a persistently installed backend.

`loyalty-program-tests.sql` contains its own BEGIN/ROLLBACK. Fixture branch/table IDs refer to the existing Barista SaaS branch; fixture emails use `example.invalid`. Never remove the rollback.

# Barista&Chef exact branch import — prepared, not applied

Only staging Supabase `zzsdcxowhhaxnuliaryb` and the dedicated Barista&Chef client are in scope. Never deploy these changes to `app.rms.rest` or install SQL on `meqttgiksyuyffuoghwx`.

| Branch | Domain | Source | Items | Variants |
|---|---|---|---:|---:|
| BC1 | baristachef.rms.rest | baristachef3.clopos.menu | 160 | 26 |
| BC2 | baristachef2.rms.rest | baristachef3.clopos.menu | 160 | 26 |
| BC4 | baristachef4.rms.rest | baristachef.clopos.menu | 176 | 24 |
| BC5 | baristachef5.rms.rest | baristachef2.clopos.menu | 191 | 30 |

Full source snapshots and the `menus.json` input are in the separately preserved BaristaChef exact-menu package, captured 2026-09-09. There are 527 unique source records, shared by BC1/BC2 for 687 branch placements. 237 records map to existing own-storage images, 264 images still require copying, and 26 source records have no image.

## Deployment sequence

1. Review and deploy this client to an isolated **staging Preview**, configured with the staging Supabase URL/key. This checkout differs from the separately deployed public client; reconcile any client-specific local-photo/routing changes before promoting it. Never replace the current client with an unreconciled older build.
2. Validate the public renderer with exact-source fixtures, existing non-imported items and an authenticated preview session.
3. Install `qr-exact-branch-import.sql`, then `qr-exact-public-menu.sql` on staging only. These are manual scripts; no automatic migration is configured in this PR.
4. Deploy the compatible renderer to the dedicated Barista&Chef client before importing. Connect BC2/BC4/BC5 domains to that dedicated project and configure their branch routing independently.
5. Open `/qr-exact-import.html` while signed into the staging organization. Choose `menus.json`, review, then apply. The browser uses its normal session; there are no embedded service credentials or forged claims. Existing RLS, write triggers and license checks remain in force.
6. The page downloads the previous state, anonymously fetches missing source images, validates image bytes, uploads content-addressed immutable copies to the organization's own bucket, verifies local image availability, then invokes one authenticated transaction. Network/image failure prevents catalog mutation. A failure after commit is reported as a verification failure and needs inspection, not a blind retry.
7. Verify all four public APIs and domains against source records, including modal descriptions, category labels, local image requests, zero-priced parents with priced variants, and normal existing order flows. The importer verifies API fields; it does not replace browser verification.

## Data behavior and limits

Stable external keys include the source brand and product ID. Different source menus never overwrite one another's prices. BC1/BC2 share their common source catalog rows. Per-branch availability and price rows define the published assortment. Legacy catalog rows and orders are retained. Imported records are hidden from any branch without an explicit availability row. No organization, membership, license or main RMS data is changed.

The RPC returns the transaction's previous catalog/branch state; the page downloads it along with an independent pre-import snapshot. Restoration is a separate reviewed operation under normal authorization. This PR does not claim a tested automatic rollback.

The exact renderer preserves source copy and source order and displays structured variant prices. It does not introduce a variant-aware ordering backend. Check ordering behavior before enabling ordering for variant products.

## Verification completed locally

- Staging-configured Vite build (see turn execution result).
- JavaScript syntax and git whitespace checks.
- All 527 source records verified through the localization module in Russian, Azerbaijani and English: full descriptions, names and displayed variant prices preserved.
- Source counts, mappings, unique identities, nonnegative numeric prices and distinct variant IDs checked.

Not yet verified: live SQL installation, authenticated import transaction, source-CDN browser CORS, all missing-image uploads, dedicated client deployment, new domains, full browser regression. Published menus remain 286 items each until successful application.

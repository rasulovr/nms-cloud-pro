# RMS QR Menu state
Last consolidated: 2026-09-12 from the earlier handoff.
Published-client state below was reported verified 2026-09-10, not rechecked now.

## Client checkpoint
- Project baristachef-qr-public / prj_8KKysCZKwOdObpNHjRFyCUbFm908.
- Primary domain: https://baristachef.rms.rest
- Recorded production deployment: dpl_EnYpN5vTV5b5fBLUeYaBVt2Aa57q.
- Asset: /assets/bc1-exact-20ef43d47d55.js.
- Data target historically staging Supabase zzsdcxowhhaxnuliaryb.
- Client production is not the same as app.rms.rest production.
- Source Git match not established; recover deployed package before editing.

## Exact menu mapping
| Branch | Source | Working public path |
| --- | --- | --- |
| BC1 | baristachef3.clopos.menu/ru/1/products | / |
| BC2 | baristachef3.clopos.menu/ru/1/products | /bc2?branch=BC2 |
| BC4 | baristachef.clopos.menu/ru/1/products | /bc4?branch=BC4 |
| BC5 | baristachef2.clopos.menu/ru/1/products | /bc5?branch=BC5 |

- Exact imports completed; do not repeat based on older incomplete sections.
- Preserve source names, descriptions, categories, sorting, prices, options and translations.
- Photos copied to owned storage; this document does not contain private catalog exports.
- Secondary baristachef2/4/5.rms.rest domains remained unconnected in latest recorded check.
- Do not claim host mapping in source proves a domain is connected.

## Image optimization
- Cards use transformed images 640×480 quality 65; recommendations 320×240.
- Order rows 160×120; offer image 960×720 quality 70.
- Lazy loading and decoding async; original image only for full-size photo modal.
- Historical production verification reported all expected branch images transformed,
  with no raw card requests or broken images.
- Preserve readable price/add-to-cart controls without extra frame or forced wrapping.

## Orders and loyalty
- Guest order targets actual table and needs waiter confirmation, visually red.
- Never assign an implicit table for a generic menu visit.
- Variants historically had ordering disabled pending server variant/price selection.
- Do not represent imported variants as fully orderable without checking implementation.
- Kitchen/bar routing and shared bill need end-to-end checks against current POS.
- Loyalty uses OTP-style flow, balance/level/QR; no duplicate separate bill block.
- No paid status without verified payment; bonus redemption must be idempotent.
- Separate QR-only administration and server license boundaries from full RMS.

## Next unresolved work
Connect and verify secondary domains if that task is active; verify variant selection
only when implemented; establish durable source refs for deployed QR/POS packages.


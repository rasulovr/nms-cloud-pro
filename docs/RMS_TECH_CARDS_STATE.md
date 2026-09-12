# Tech Cards — current state
Last updated: 2026-09-12.

## Current task
Simplify semifinished product creation using iiko/equivalent workflow as a reference.
User requested intuitive controls without unnecessary complexity.
This documentation task did not implement that redesign.

## Baseline
- Main source: src/main.jsx at c14b3e4ed377a379f8bd0e2629c5828b101ef6ea (v404).
- v404 removes search from the creation form.
- v403 secure creation RPC switch precedes v404.
- v405-dev is an intended label only; no source commit located.
- Locate any prepared v405 file from concurrent session before starting another implementation.

## Existing invariants
- Read components from rms_final_recipe_components.
- Use one canonical menu_item_id for edit/photo/delete/components.
- Preserve existing dishes, ingredients, printed cards and QR photo references.
- Keep working ingredient row editing, new semifinished selection and ability to add ingredients.
- No reappearance of deleted cards, no duplicated menu_items.
- Preserve normal list search; removal request concerns creation form only.

## Open incident: menu_items RLS
Historical v403 transactional test passed through rms_tech_menu_item_create_secure.
Later user reported same visible error; failing operation not yet established.
Next checks:
1. Identify actual loaded build marker and environment.
2. Reproduce through restricted internal user flow.
3. Capture failing request name/table/RPC and parameters without exposing credentials.
4. Determine whether failure is dish creation, nested ingredient action or stale deployed frontend.
5. Fix authorized call path; do not loosen RLS.

## Proposed acceptance criteria for redesign
These are a practical implementation checklist, not evidence of completed features.
- Clear product name, output unit and batch output quantity.
- Ingredient composition supports units and quantities with visible totals.
- Batch cost from component costs; unit cost = batch cost / positive output quantity.
- Example test fixture only: batch cost 12 AZN and output 2 kg => 6 AZN/kg.
- Unit conversion must be explicit; mass/volume/pieces cannot be silently interchanged.
- Missing price and invalid/zero output cannot produce a misleading saved cost.
- Save/reopen/edit preserves composition and output with one canonical product.
- Clear saving/saved/error states; no duplicate record from repeat click.
- Existing cards remain readable/printable and photos still reach QR Menu.
- Check allowed and restricted users; reject unauthorized creation.
- If nesting semifinished products is supported, prevent cycles and verify recursive cost.
- Do not invent nested-product support without inspecting current schema.

## Next implementation sequence
Locate v405 work; inspect current source/model; consult official iiko references;
select minimal changes compatible with existing data; save full source;
verify meaningful creation/edit/reopen/cost cases; record exact evidence.


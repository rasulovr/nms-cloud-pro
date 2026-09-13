# RMS Pro v405 modularization plan

## Goal

Replace the upload-safe source parts with maintainable React modules without changing UI, behavior, database calls, permissions, or business rules.

## Safety baseline

- Baseline branch: `fix/tech-cards-v405-preview`
- Baseline commit: `195e87bf92caf9801db3acb7cb6a14ff51fd6b90`
- Reconstructed v405 SHA-256: `aa1d35c294a448af11bbc35f94286e2d1f57dd3a1ac6ff1ad4c407e6bc29dd5b`
- Refactor branch: `refactor/modularize-v405`
- Never merge or deploy to Production without separate approval.
- Do not change Supabase schema, RLS, RPCs, environment variables, authentication, or business calculations during modularization.

## Extraction order

Each stage must be its own commit and must pass `npm run build` before continuing.

1. **Static assets**
   - Move the two embedded RMS logo data URLs out of application code.
   - Preserve their exact bytes and rendered dimensions.

2. **Styles**
   - Move style-only React helpers and injected CSS to dedicated style modules.
   - Preserve selector order and specificity.

3. **Shared utilities**
   - Date, number, unit, permissions, normalization, and formatting helpers.
   - No logic cleanup or renaming in the extraction commit.

4. **Shared UI**
   - Toasts, progress overlays, error boundaries, date input, charts, logo, and layout primitives.

5. **Independent feature modules**
   - Inventory
   - POS administration
   - Dashboard
   - Revenue
   - Finance
   - Attendance
   - Advances

6. **Protected feature modules**
   - Salaries
   - Suppliers and debts/payments
   - Reports
   - Tech Cards and semifinished products

7. **Application shell**
   - Login, navigation, routing, settings, translations, and root render.

8. **Cleanup**
   - Remove `src/main.parts` and the assembly script only after the modular entry builds and passes regression checks.

## Intended structure

```text
src/
  main.jsx
  app/
    App.jsx
    navigation.js
  assets/
  components/
  modules/
    advances/
    attendance/
    dashboard/
    finance/
    inventory/
    pos/
    reports/
    revenue/
    salaries/
    suppliers/
    tech-cards/
  services/
    supabase/
  styles/
  utils/
```

## Required verification after every stage

- `npm run build` succeeds.
- Login screen and internal RMS login open.
- Existing navigation and permissions remain unchanged.
- No new `menu_items` duplicates are created.
- Tech Cards use `rms_final_recipe_components` and the canonical `menu_item_id`.
- Revenue, attendance, salary visibility, advances, suppliers, reports, POS, and QR Menu are not regressed.
- Preview points to the test Supabase project before any data-changing test.

## Working rule for coding agents

Never load or print the complete reconstructed v405 source. Locate symbols with `rg`, inspect only relevant ranges, edit one extraction boundary at a time, and review the staged diff before committing.

# RMS business rules

Established requirements carried from user decisions. These are behavior contracts,
not a claim that every current implementation is correct.
Last consolidated: 2026-09-16. Currency: AZN; branch codes BC1–BC5 and Bistro.
Preserve actual branch IDs and verify display-name mappings before imports.

## Food Cost and supplier purchases
- Food Cost / закупки и базар includes supplier food purchases, kitchen/bar/coffee/drinks,
  bazar and food write-offs.
- Count every supplier purchase once as Food Cost; never mirror it as a daily Revenue expense.
- Preserve branch-specific invoice attribution where a purchase is explicitly tied to a branch.
- A supplier purchase without `branch_id` is shared: allocate it by branch revenue / total network revenue for the same period.
- Use each historical month's own revenue shares when shared purchases enter a historical forecast fallback.
- Do not silently reallocate an explicitly attributed invoice across the network.
- Take away / packaging: cups, lids, containers, bags, disposable cutlery, takeaway napkins.
- Хозтовары: cleaning chemicals, gloves, cloths, sponges and cleaning consumables.

## Bazar allocation
- Allocation is automatic; do not restore “Перераспределить Базар”.
- Branch allocation = shared eligible amount × branch revenue / total eligible revenue.
- Use the same approved date/period and branch scope in numerator and denominator.
- Recalculate when eligible revenue changes; do not freeze shares prematurely.
- Period grain and zero-total handling must be confirmed from current implementation before changes.
- Never silently substitute equal allocation or divide by zero.
- Bazar report retains full daily Bazar view.
- August/September 2026 Excel import request explicitly excludes Bazar.

## Wolt
- Enabled only in BC1, BC3 and Bistronomia.
- User records settlement-period gross Wolt sales on payout date, twice monthly; not daily.
- Actual commission/service charge is an expense under Wolt service fee on the same date.
- Bank payout = gross Wolt sales − service fee; never add payout as extra revenue.
- If net payout was entered instead, do not expense fee again; prefer gross + separate fee.

## Service charge, tax and payroll allocation
- Revenue includes 10% customer service charge.
- Staff service-charge reference amount is 4% of base = gross / 1.10 × 0.04.
- Do not calculate the staff reference amount as 4% of service-inclusive gross.
- From Production v413, staff service charge is informational and is excluded from P&L
  expenses, profit and profitability calculations.
- Keep the informational value visible where operational detail is required.
- Preserve the current configurable tax rate for each branch (8% default only when no positive setting exists);
  this is an application rule, not current tax-law advice.
- Actual and forecast network tax totals are the sum of branch amounts calculated with each branch's rate.
- Manager payroll shared among branches by revenue share under existing logic.
- Keep official salary/working days and configurable payroll contribution rates separate.

## Monthly forecast
- For a variable expense article with current-month data, forecast from the current pace:
  recorded amount × month-days / elapsed-days.
- Do not replace a current-month pace with a larger historical average.
- Use historical average only when the current month has no data for that article.
- Fixed articles continue to follow their configured/current fallback logic.
- Dashboard, Finance and Reports must use the same P&L inclusion and forecast rules.

## Salaries and attendance
- Prior-month balance remains separate from current-period movements.
- Old advances must not be reused in the new month.
- Keep advance logging and change/delete audit.
- Preserve restricted users' employee visibility and manager-salary hiding.
- Do not change internal auth, revenue, attendance or salary logic outside explicit task scope.

## Suppliers and debts
- VOEN is a grouping attribute for legal entities, not an authentication boundary.
- A supplier may invoice different legal entities; preserve entity-specific balances.
- Preserve opening prior-period debt, purchases, payments, notes and transaction audit.
- Invoice line edits must recompute header totals consistently.
- Show deleted financial entries with strike-through/audit as existing workflow requires.
- Debt view needs transaction drilldown and return to original branch/date.

## Revenue and imports
- Preserve existing rows when importing; identify duplicates and ambiguous branch mappings.
- SQL v199 is historical working import pattern; use exact branch_id mapping.
- Do not reintroduce failed frontend import approaches v189–v192.
- User's August/September import is pending verification, not assumed completed.
- Month boundaries use padded YYYY-MM / YYYY-MM-DD and exclude previous-month rows.
- Preserve approved old-style DailyRevenueLineChart behavior.

## Tech cards
- Components: rms_final_recipe_components, not legacy recipe_items.
- Same canonical menu_item_id for photo, delete, edit and components.
- No duplicate menu_items on save; deleted cards must stay hidden.
- Preserve printing and QR photo linkage.
- Preserve the promoted semifinished batch-yield and automatic cost behavior unless
  a new task explicitly changes it.

## POS and QR
- Internal RMS login remains main RMS auth model; POS has separate 4-digit PIN flow.
- Already-sent order items require cancellation reason and with/without-write-off choice.
- Cancellation sends appropriate kitchen/bar ticket and preserves audit.
- QR guest submission requires waiter confirmation, shown red; no automatic paid status.
- Loyalty benefits exclude redeemed bonuses; no duplicate bonus redemption.
- Payment success requires verified provider or authorized staff confirmation.
- Loyalty account displays balance/level/QR; bill stays in separate Bill section.
- RMS POS, QR Menu, Loyalty and RMS Pro module licensing must remain enforced server-side.

import fs from 'node:fs'
import assert from 'node:assert/strict'

const dashboard = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/rms_dashboard_chart.css', import.meta.url), 'utf8')

for (const marker of ['Food Cost', 'Структура расходов', 'Все статьи расходов', 'Топ подорожавших статей', 'Прибыль к прошлому месяцу', 'Расходы к прошлому месяцу', 'Неполный месяц']) {
  assert.ok(dashboard.includes(marker), `Dashboard v416 marker is missing: ${marker}`)
}
assert.ok(dashboard.includes("rmsFinanceSupplierTotalsForScope(purchaseRowsForFinance || [], branchId, revenueShareMap)"), 'Supplier purchases must follow the shared-allocation rule')
assert.ok(dashboard.includes("String(row?.comment || '').startsWith('SUPPLIER_PURCHASE_')"), 'Mirrored supplier expenses must be excluded')
assert.ok(styles.includes('.dashboard-v416-grid'), 'Dashboard v416 responsive styles are missing')

console.log('Dashboard v416 source checks passed')

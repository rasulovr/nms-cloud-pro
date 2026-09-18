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
assert.ok(dashboard.includes("expenseGrowthSort === 'percent'"), 'Expense growth amount/percent sorting is missing')
assert.ok(dashboard.includes("name: 'Остальные статьи'"), 'Small expense categories must be grouped in the chart')
assert.ok(dashboard.includes('finance-line-chart-average'), 'Daily revenue average guide is missing')
assert.ok(dashboard.includes(' C ${middleX.toFixed(1)}'), 'Daily revenue chart must use a smooth curve')
assert.ok(dashboard.includes('dashboard-chart-card-profit'), 'Branch profit chart visual state is missing')
assert.ok(dashboard.includes('dashboard-chart-total'), 'Branch chart total summary is missing')
assert.ok(styles.includes('v417 executive dashboard — premium charts'), 'Dashboard v417 visual layer is missing')
assert.ok(styles.includes('Dashboard branch comparison — visual refinement'), 'Branch comparison visual layer is missing')
assert.ok(dashboard.includes('dash-profit-zero'), 'Dashboard v419 profit/loss zero axis is missing')
assert.ok(dashboard.includes('dashboard-expense-share'), 'Dashboard v419 expense share visualization is missing')
assert.ok(dashboard.includes('dash-kpi-negative'), 'Dashboard v419 negative KPI state is missing')
assert.ok(styles.includes('.dash-profit-track'), 'Dashboard v419 diverging profit chart styles are missing')

console.log('Dashboard v419 source checks passed')

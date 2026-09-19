import fs from 'node:fs'
import assert from 'node:assert/strict'

const shared = fs.readFileSync(new URL('../src/main.parts/part-00.jsxpart', import.meta.url), 'utf8')
const hooks = fs.readFileSync(new URL('../src/main.parts/part-02.jsxpart', import.meta.url), 'utf8')
const dashboard = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const reports = fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart', import.meta.url), 'utf8')
const settings = fs.readFileSync(new URL('../src/main.parts/part-05.jsxpart', import.meta.url), 'utf8')

assert.ok(shared.includes('isServiceChargeStaffExpenseName'), 'Manual service-charge staff duplicates must be detectable')
assert.ok(dashboard.includes("expenseArticleMap.set('Service charge персоналу', serviceCostTotal)"), 'Dashboard must expose service charge as its own expense article')
assert.ok(dashboard.includes('revenue - expenses - salary - serviceCost - tax'), 'Dashboard profit must subtract service charge')
assert.ok(dashboard.includes("{ name: 'Service charge персоналу', amount: serviceForecast"), 'Profit forecast must include service charge as an expense')
assert.ok(reports.includes('supplierFoodCost + salary + serviceCost + tax'), 'Profitability report must subtract service charge')
assert.ok(!reports.includes('Service charge персоналу (справочно, не входит в P&L)'), 'Service charge must not be informational-only')

assert.ok(hooks.includes('function useBranches(includeInactive = false)'), 'Branch hook must support historical inactive branches')
assert.ok(hooks.includes("if (!includeInactive) query = query.eq('is_active', true)"), 'New-operation branch lists must contain active branches only')
assert.ok(dashboard.includes('const branches = useBranches(true)'), 'Dashboard and Finance must keep archived branches in history')
assert.ok(reports.includes('const branches = useBranches(true)'), 'Reports must keep archived branches in history')
assert.ok(settings.includes("update({ is_active: Boolean(isActive) })"), 'Settings must archive/reactivate branches without deleting them')
assert.ok(settings.includes('История и прежние операции останутся без изменений'), 'Branch archive confirmation must explain history preservation')

for (const article of ['Поставщики / закупки', 'Take away / packaging', 'Хозтовары', 'Закупки поставщиков / прочее', 'Зарплаты', 'Service charge персоналу', 'Налог']) {
  assert.ok(dashboard.includes(article), `Dashboard expense breakdown is missing: ${article}`)
}

console.log('Service charge and branch lifecycle v423 checks passed')

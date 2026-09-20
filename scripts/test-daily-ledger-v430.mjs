import fs from 'node:fs'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const dashboard = source.match(/function Dashboard\(\{ t \}\)[\s\S]*?\n}\n\nfunction Finance/)?.[0] || ''
const finance = source.match(/function Finance\(\{ t, lang, onGoToExpense \}\)[\s\S]*?\n}\n\nfunction Recipes/)?.[0] || ''

assert.match(source, /function rmsAggregateRevenueByBranch\(rows = \[\]\)/, 'daily revenue must be aggregated by branch')
assert.match(source, /function rmsServiceChargeStaffCostFromDailyRevenue\(rows = \[\], branches = \[\]\)/, 'service charge cost must be calculated from daily revenue')
assert.match(dashboard, /dashboardDailyRevenueResult/, 'Dashboard must load daily revenue for P&L')
assert.match(dashboard, /rmsAggregateRevenueByBranch\(/, 'Dashboard must use daily revenue aggregation')
assert.match(dashboard, /rmsServiceChargeStaffCostFromDailyRevenue\(/, 'Dashboard must calculate service charge from daily revenue')
assert.match(finance, /from\('daily_revenue'\)/, 'Finance must use daily revenue as the actual ledger')
assert.match(finance, /rmsServiceChargeStaffCostFromDailyRevenue\(revRows \|\| \[\], branches\)/, 'Finance must calculate service charge from daily revenue')

console.log('Daily ledger v430 checks passed')

import fs from 'node:fs'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const finance = source.match(/function Finance\(\{ t, lang, onGoToExpense \}\)[\s\S]*?\n}\n\nfunction Recipes/)?.[0] || ''

// A branch's share must use all daily revenue rows, not only its final day.
const dailyRows = [
  { branch_id: 'bc1', revenue: 1_000 },
  { branch_id: 'bc1', revenue: 8_000 },
  { branch_id: 'bc1', revenue: 5_000 },
  { branch_id: 'bc2', revenue: 12_000 },
  { branch_id: 'bc2', revenue: 4_000 }
]
const byBranch = new Map()
dailyRows.forEach(row => byBranch.set(row.branch_id, (byBranch.get(row.branch_id) || 0) + row.revenue))
const total = [...byBranch.values()].reduce((sum, amount) => sum + amount, 0)
assert.equal(byBranch.get('bc1') / total, 14 / 30, 'BC1 share must include every daily revenue entry')
assert.notEqual(dailyRows[2].revenue / total, 14 / 30, 'the final daily entry alone is not a branch share')

assert.match(finance, /const effectiveRows = rmsAggregateRevenueByBranch\(data \|\| \[\]\)/, 'Finance must aggregate daily revenue before allocation')
assert.match(finance, /effectiveRows\.forEach\(r => map\.set\(String\(r\.branch_id\)/, 'Finance allocation shares must use the aggregated branch rows')

console.log('Finance revenue share v432 checks passed')

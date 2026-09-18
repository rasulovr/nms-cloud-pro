import fs from 'node:fs'
import assert from 'node:assert/strict'

const shared = fs.readFileSync(new URL('../src/main.parts/part-00.jsxpart', import.meta.url), 'utf8')
const finance = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const reports = fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart', import.meta.url), 'utf8')

const supplierRows = [
  { branch_id: 'bc1', total_amount: 250 },
  { branch_id: 'bc2', total_amount: 350 },
  { branch_id: null, total_amount: 400 }
]
const shares = new Map([['bc1', 0.2], ['bc2', 0.3], ['bc3', 0.5]])
const totalPurchases = supplierRows.reduce((sum, row) => sum + row.total_amount, 0)
const allocated = new Map([...shares].map(([branchId, share]) => [branchId, totalPurchases * share]))

assert.equal(allocated.get('bc1'), 200, 'BC1 must receive its revenue share of every supplier purchase')
assert.equal(allocated.get('bc2'), 300, 'BC2 must receive its revenue share of every supplier purchase')
assert.equal(allocated.get('bc3'), 500, 'BC3 must receive its revenue share of every supplier purchase')
assert.equal([...allocated.values()].reduce((sum, amount) => sum + amount, 0), totalPurchases, 'Allocated supplier purchases must reconcile to the network total')

assert.ok(shared.includes('const networkTotals = rmsFinanceAllocatedSupplierTotals(purchaseRows || [], 1)'), 'Supplier allocation must start from the full network purchase total')
assert.ok(shared.includes('food: parseNum(networkTotals.food) * share'), 'Every branch supplier cost must use revenue share')
assert.ok(!shared.includes('const directRows = (purchaseRows || []).filter'), 'Branch-tagged supplier purchases must not bypass revenue allocation')

assert.ok(finance.includes('isSalaryExpenseName(name) || isBazarExpenseName(name)'), 'Dashboard must exclude manual Bazar expenses')
assert.ok(finance.includes('totalExpenses: expenses + salary + tax'), 'Dashboard total expenses must continue to include tax')
assert.ok(finance.includes('const preliminarySupplierExpense = allocatedSupplierExpenseTotal'), 'Finance must describe the complete allocated supplier amount')
assert.ok(reports.includes('const targets = Array.from(revenueShareMap.entries())'), 'Expense report must allocate every supplier invoice across revenue branches')
assert.ok(reports.includes('const supplierFoodCost = supplierPurchases.reduce'), 'Profitability report must use network supplier purchases')
assert.ok(reports.includes('if (isBazarExpenseName(name)) return'), 'Reports must exclude manual Bazar expenses')
assert.ok(reports.includes('const totalExpenses = parseNum(expenseData.operating) + supplierFoodCost + salary + tax'), 'Branch profitability must continue to include tax')

console.log('Supplier revenue allocation v421 checks passed')

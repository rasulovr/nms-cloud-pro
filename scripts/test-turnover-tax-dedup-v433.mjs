import fs from 'node:fs'
import assert from 'node:assert/strict'

const dashboard = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const reports = fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart', import.meta.url), 'utf8')
const common = fs.readFileSync(new URL('../src/main.parts/part-00.jsxpart', import.meta.url), 'utf8')

assert.match(common, /const isTaxExpenseName = \(value\) => \{[\s\S]*?name\.includes\('налог'\)[\s\S]*?name\.includes\('vergi'\)/,
  'Russian and Azerbaijani turnover-tax rows must be recognized')
assert.match(common, /const isTaxPaymentExpenseRow = \(row\) => \{[\s\S]*?isTaxExpenseName\(name\)/,
  'Actual tax payments must be distinguished from ordinary operating costs')
assert.match(common, /const isNonOperatingTaxExpenseRow = \(row\) => \{[\s\S]*?isTaxExpenseName\(name\)/,
  'Excel turnover-tax rows must be excluded from operating expenses even when not payments')
assert.match(common, /const isBoltSettlementExpenseRow = \(row\) => \{[\s\S]*?mentionsBolt[\s\S]*?mentionsPayment/,
  'Bolt settlement payments must be distinguishable from daily taxi rides')
assert.match(dashboard, /if \(isTaxPaymentExpenseRow\(r\)\)[\s\S]*?dashboardTaxPaidByBranch/,
  'Dashboard must transfer actual tax payments into the tax total')
assert.match(dashboard, /filter\(r => !isNonOperatingTaxExpenseRow\(r\)\)/,
  'Finance operating expenses must exclude tax rows')
assert.match(reports, /if \(isTaxPaymentExpenseRow\(row\)\)[\s\S]*?category_name: 'Оплаченный налог'[\s\S]*?bucket: 'tax'/,
  'Expense report must classify actual tax payments under tax rather than operations')
assert.match(reports, /if \(isBoltSettlementExpenseRow\(row\)\)[\s\S]*?informational: true/,
  'Bolt payments for already-counted rides must be visible for review without entering P&L totals')
assert.match(dashboard, /const grossTurnover = parseNum\(rev\.cash_amount\) \+ parseNum\(rev\.bank_amount\) \+ parseNum\(rev\.wolt_amount\)[\s\S]*?const taxCalculated = grossTurnover \* taxRate \/ 100/,
  'Turnover tax must use gross cash, bank, and Wolt revenue before bank fees')
assert.match(dashboard, /const grossTurnover = scopedRevenueRows\.reduce\([\s\S]*?taxCalculated = scopedRevenueRows\.reduce/,
  'Finance tax base must use gross branch turnover')
assert.match(dashboard, /const tax = taxCalculated\s*(?:\n|$)/,
  'Dashboard profit tax must contain only calculated turnover tax')
assert.match(dashboard, /оплата vergi не является дополнительным расходом P&L/,
  'Actual vergi payments must not be added to restaurant profit tax twice')
assert.doesNotMatch(dashboard, /const tax = taxCalculated \+ taxPaid/,
  'Actual tax payments must remain outside the profit calculation')
assert.match(reports, /const tax = taxCalculated\s*(?:\n|$)/,
  'Branch profitability must contain only calculated turnover tax')
assert.match(reports, /Отдельная vergi-оплата не уменьшает прибыль повторно/,
  'Branch profitability must exclude actual vergi payments from profit')

console.log('Turnover tax de-duplication v433 checks passed')

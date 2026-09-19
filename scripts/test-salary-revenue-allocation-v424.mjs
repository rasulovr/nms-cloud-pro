import fs from 'node:fs'
import assert from 'node:assert/strict'

const dashboard = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const reports = fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart', import.meta.url), 'utf8')

const branchRevenue = new Map([['bc1', 20000], ['bc2', 30000], ['bc4', 50000]])
const totalRevenue = [...branchRevenue.values()].reduce((sum, value) => sum + value, 0)
const shares = new Map([...branchRevenue].map(([id, revenue]) => [id, revenue / totalRevenue]))
const directSalary = new Map([['bc1', 5000], ['bc2', 6000], ['bc4', 7000]])
const managerSalary = 10000

const allocated = new Map([...branchRevenue].map(([id]) => [id, directSalary.get(id) + managerSalary * shares.get(id)]))

assert.equal(allocated.get('bc1'), 7000)
assert.equal(allocated.get('bc2'), 9000)
assert.equal(allocated.get('bc4'), 12000)
assert.equal([...allocated.values()].reduce((sum, value) => sum + value, 0), 28000, 'Direct and manager salary must fully reconcile')

assert.ok(dashboard.includes('managerAllocationShareMap.set(id, parseNum(revenueShareMap.get(id)))'), 'Forecast manager allocation must use revenue share')
assert.ok(dashboard.includes('const accrued = parseNum(periodRow.salary_gross)'), 'Dashboard must use accrued salary, not net salary or employee balance')
assert.ok(dashboard.includes('dashboardAccruedManagersSalary * parseNum(revenueShareMap.get(b.id))'), 'Dashboard must allocate accrued manager salary by revenue share')
assert.ok(dashboard.includes('const salary = hasAccruedSalaryPeriods ? accruedSalary'), 'Accrued salary periods must take precedence over configured employee salaries')
assert.ok(!dashboard.includes('зарплата менеджеров распределена по доле предварительной прибыли'), 'Preliminary-profit salary allocation must be removed')
assert.ok(reports.includes('const managerSalary = managerSalaryPool * share'), 'Profitability report must keep revenue-share manager allocation')

console.log('Salary revenue allocation v424 checks passed')

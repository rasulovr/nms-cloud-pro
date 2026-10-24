import assert from 'node:assert/strict'
import fs from 'node:fs'
const source=fs.readFileSync('src/main.parts/part-04.jsxpart','utf8')
const start=source.indexOf('      // Preserve the preliminary gross basis'),end=source.indexOf('      const normalizedExpenseName',start)
assert.ok(start>0&&end>start)
const calculate=new Function('revenueRows','supplierPurchases','salaryPeriods','parseNum','isAuditedMonth','coverageIssues',source.slice(start,end)+'\nreturn legacyMonthlyShares')
const isAuditedMonth=d=>String(d)>='2026-01'&&String(d)<'2026-10',parseNum=x=>Number(x)||0
const row=(branch_id,revenue_date,cash_amount,bank_amount=0,wolt_amount=0)=>({branch_id,revenue_date,cash_amount,bank_amount,wolt_amount})
const october=[row('A','2026-10-01',30,60,10),row('B','2026-10-01',100,0,100)]
const earlier=[row('A','2026-09-01',1000),row('closed','2026-09-01',5000)]
const run=(rows,purchases=[],salaries=[])=>{const issues=[];return {shares:calculate(rows,purchases,salaries,parseNum,isAuditedMonth,issues),issues}}
const only=run(october),mixed=run([...earlier,...october,row('B','2026-11-01',400)])
assert.deepEqual([...only.shares.get('2026-10')],[...mixed.shares.get('2026-10')])
assert.equal(only.shares.get('2026-10').get('A'),1/3)
assert.deepEqual([...run([...october,row('', '2026-10-01',999)]).shares.get('2026-10')],[...only.shares.get('2026-10')])
assert.equal(only.shares.get('2026-10').get('B'),2/3)
assert.equal(only.shares.get('2026-10').has('closed'),false)
assert.equal(mixed.shares.has('2026-09'),false)
assert.equal(run([row('A','2025-12-01',100)]).shares.size,0)
assert.equal(run([], [{purchase_date:'2025-12-03'}]).issues.length,0)
assert.match(source,/if \(String\(date \|\| ''\).slice\(0, 7\) < '2026-01'\) return parseNum\(revenueShareMap.get/)
for(const pool of [100,700.25])assert.ok(Math.abs([...only.shares.get('2026-10').values()].reduce((sum,share)=>sum+pool*share,0)-pool)<1e-9)
assert.ok(run([row('A','2026-10-01',0)]).issues.some(i=>i.month==='2026-10'&&i.severity==='blocking_runtime_basis'))
assert.ok(run([], [{purchase_date:'2026-10-03'}]).issues.some(i=>i.month==='2026-10'))
assert.ok(run([],[],[{salary_month:'2026-11-01'}]).issues.some(i=>i.month==='2026-11'))
assert.equal(run([], [{purchase_date:'2026-09-03'}]).issues.length,0)
assert.match(source,/if \(!isAuditedMonth\(date\)\) return parseNum\(legacyMonthlyShares.get/)
assert.match(source,/const share = monthlyShare\(date, branchId\)/)
assert.ok(source.indexOf('const selectedProfitabilityIds')>source.indexOf('const legacyMonthlyShares'))
console.log('PASS monthly gross allocation: operation-month isolation, all-network denominator, pool conservation, closed branch, missing basis guards, historical path unchanged')

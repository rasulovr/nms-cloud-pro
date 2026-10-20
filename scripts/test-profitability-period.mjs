import assert from 'node:assert/strict'
import fs from 'node:fs'
import {manualPeriod, periodMonths} from '../src/profitability-period.mjs'
import {reportMonths} from '../src/profitability-bank.mjs'
for(const [a,b] of [['','2025-01'],['2025-01',''],['2025-13','2026-01'],['2025-00','2025-03'],['2026-01','2025-12'],['2025-1','2025-12'],['foo','bar']]) assert.equal(manualPeriod(a,b),null)
for(const [a,b,length,to] of [['2025-01','2025-01',1,'2025-02-01'],['2025-12','2026-02',3,'2026-03-01'],['2024-02','2024-02',1,'2024-03-01'],['2025-01','2026-12',24,'2027-01-01']]) {
const p=manualPeriod(a,b);assert.equal(p.toExclusive,to);assert.equal(reportMonths(p.from,p.toExclusive).length,length);assert.deepEqual(periodMonths(p),{start:a,end:b})
}
assert.deepEqual(reportMonths('2025-13-01','2026-01-01'),[])
assert.deepEqual(reportMonths('2025-01-15','2025-02-01'),[])
const source=fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart',import.meta.url),'utf8')
const view=source.slice(source.indexOf('const ReportsProfitabilityView'),source.indexOf('const supplierReportNormalizedSearch'))
assert.doesNotMatch(view,/Сравнение филиалов|Управленческие выводы|Детальная рентабельность|reports-v417-kpis/)
assert.match(view,/ProfitabilityBankReport/)
assert.match(source,/const selectedPeriod = manualPeriod\(start, end\)/)
console.log('Manual month range PASS: inclusive bounds, leap/cross-year, >12 months, malformed/reversed/empty validation, legacy dashboard removed.')

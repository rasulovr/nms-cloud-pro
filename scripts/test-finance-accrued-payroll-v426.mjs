import fs from 'node:fs'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')

assert.match(source, /const accruedRows = \(salaryPeriodRows \|\| \[\]\)\.filter\(row => rmsSalaryPeriodTotal\(row\) > 0\)/)
assert.match(source, /if \(accruedRows\.length\)/)
assert.match(source, /const accrued = rmsSalaryPeriodTotal\(row\)/)
assert.match(source, /const periodBranchId = row\.branch_id \|\| employee\.branch_id/)
assert.match(source, /totalSalary: directSalary \+ \(selectedBranchId === ALL_BRANCHES \? managersSalary : managersSalary \* share\)/)

console.log('Finance accrued payroll source checks passed')

import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const source = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const hooks = fs.readFileSync(new URL('../src/main.parts/part-02.jsxpart', import.meta.url), 'utf8')
const code = source.slice(source.indexOf('function rmsServiceChargeStaffCostFromDailyRevenue('), source.indexOf('\nfunction DashboardStyles('))
const ctx = vm.createContext({ parseNum: x => Number(x) || 0 })
vm.runInContext(code, ctx)
const branch = { id: 'bc2', service_charge_enabled: true, service_charge_percent: 10, service_staff_cost_percent: 5 }
const cost = rows => ctx.rmsServiceChargeStaffCostFromDailyRevenue(rows, [branch, { ...branch, id: 'off', service_charge_enabled: false }])
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)
const row = { branch_id: 'bc2', cash_amount: 440, bank_amount: 660, wolt_amount: 3877.70 }
near(cost([row]), 50)
near(cost([{ ...row, wolt_amount: 0 }]), 50)
near(cost([{ ...row, cash_amount: 0, bank_amount: 0 }]), 0)
near(cost([{ ...row, branch_id: 'off' }]), 0)
near(cost([{ ...row, cash_amount: null, bank_amount: null }]), 0)
near(cost([{ ...row, cash_amount: -110, bank_amount: 0 }]), -5)
assert.ok(hooks.includes('const dailyServiceRevenue = dailyCashRevenue + dailyBankRevenue'))
assert.ok(hooks.includes('const formServiceRevenue = parseNum(form.cash_amount) + parseNum(form.bank_amount)'))
assert.ok(hooks.includes('const serviceRevenue = parseNum(row.cash_amount) + parseNum(row.bank_amount)'))
assert.ok(source.includes('return parts.cash + parts.bank - parts.bankCommission'))
assert.ok(!source.includes('serviceForecastForBranch(selectedBranchId, revenue)'))
// Exercise actual workspace declarations, not only text markers.
const workspaceSnippet = hooks.slice(hooks.indexOf('  const dailyServiceRevenue ='), hooks.indexOf('  const calculatedClosingCash =', hooks.indexOf('  const dailyServiceRevenue =')))
const workspace = vm.createContext({ parseNum: x => Number(x) || 0, dailyCashRevenue: 440, dailyBankRevenue: 660, serviceForm: {enabled: true}, servicePercent: 10, staffCostPercent: 5, woltEnabledForBranch: true, form: {cash_amount:440,bank_amount:660,wolt_amount:3877.70} })
vm.runInContext(workspaceSnippet + ';globalThis.result = {dailyServiceStaffCost,formServiceStaffCost,dailyServiceChargeAmount,formServiceChargeAmount,formRevenueTotal}', workspace)
near(workspace.result.dailyServiceStaffCost, 50)
near(workspace.result.formServiceStaffCost, 50)
near(workspace.result.dailyServiceChargeAmount, 100)
near(workspace.result.formServiceChargeAmount, 100)
near(workspace.result.formRevenueTotal, 4977.70) // Wolt remains in total revenue.
const rowSnippet = hooks.slice(hooks.indexOf('  const serviceRevenue ='), hooks.indexOf('  async function saveChanges()', hooks.indexOf('  const serviceRevenue =')))
const rowContext = vm.createContext({ parseNum: x => Number(x) || 0, row, serviceEnabled: true, servicePercent:10, staffCostPercent:5 })
vm.runInContext(rowSnippet + ';globalThis.result=staffCost', rowContext)
near(rowContext.result, 50)
const forecastSnippet = source.slice(source.indexOf('  const serviceEligibleRevenue ='), source.indexOf('  const serviceForecast =', source.indexOf('  const serviceEligibleRevenue =')))
const forecastContext = vm.createContext({ bankCommissionRate: 2, rmsNetRevenueParts: r => ({cash:r.cash_amount,bank:r.bank_amount,bankCommission:r.bank_amount*.02,wolt:r.wolt_amount}) })
vm.runInContext(forecastSnippet + ';globalThis.calc=serviceEligibleRevenue', forecastContext)
near(forecastContext.calc(row), 1086.8)
near(forecastContext.calc({...row,wolt_amount:999999}), 1086.8)
console.log('Frontend Wolt service-charge regression checks passed')
if (process.env.FRONTEND_ONLY === '1') process.exit(0)
const { PGlite } = await import('@electric-sql/pglite')
const db = new PGlite()
await db.exec(`CREATE TABLE branches(id text PRIMARY KEY,service_charge_enabled boolean,service_charge_percent numeric,service_staff_cost_percent numeric);
CREATE TABLE daily_revenue(branch_id text,revenue_date date,cash_amount numeric,bank_amount numeric,wolt_amount numeric,deleted_at timestamptz);
INSERT INTO branches VALUES ('bc2',true,10,5),('off',false,10,5),('zero',true,0,5);
INSERT INTO daily_revenue VALUES
('bc2','2026-10-15',440,660,3877.70,null),
('bc2','2026-10-15',1100,0,0,now()),
('off','2026-10-15',1100,0,3877.70,null),
('zero','2026-10-15',1100,0,3877.70,null),
('bc2','2026-09-15',220,0,100,null);`)
const sql = fs.readFileSync(new URL('../supabase/migrations/20261016064400_exclude_wolt_service_charge.sql', import.meta.url), 'utf8')
await db.exec(sql)
await db.exec(sql) // repeatable replacement, no duplicates
let rows = (await db.query(`SELECT branch_id,month::text,service_charge_amount::float8 AS sc,staff_cost_amount::float8 AS staff,base_amount::float8 AS base FROM monthly_branch_service_charge_cost ORDER BY branch_id,month`)).rows
assert.deepEqual(rows, [
{branch_id:'bc2',month:'2026-09-01',sc:20,staff:10,base:200},
{branch_id:'bc2',month:'2026-10-01',sc:100,staff:50,base:1000},
{branch_id:'zero',month:'2026-10-01',sc:0,staff:55,base:1100}])
await db.exec('UPDATE daily_revenue SET wolt_amount=99999')
assert.deepEqual((await db.query(`SELECT branch_id,month::text,service_charge_amount::float8 AS sc,staff_cost_amount::float8 AS staff,base_amount::float8 AS base FROM monthly_branch_service_charge_cost ORDER BY branch_id,month`)).rows, rows)
await db.close()
console.log('Wolt service-charge regression tests passed: frontend, SQL, disabled/zero-rate branches, month, soft-delete, Wolt invariance.')

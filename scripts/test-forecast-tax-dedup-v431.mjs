import fs from 'node:fs'
import assert from 'node:assert/strict'

const common = fs.readFileSync(new URL('../src/main.parts/part-00.jsxpart', import.meta.url), 'utf8')
const forecast = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const engine = forecast.match(/async function rmsCalculateNetworkForecastForMonth[\s\S]*?\n}\n\nasync function rmsFinanceForecastEngine/)?.[0] || ''

assert.match(common, /const isTaxExpenseName = \(value\) => \{[\s\S]*?name\.includes\('налог'\)[\s\S]*?name\.includes\('vergi'\)/, 'Tax labels must be recognized across Russian and Azerbaijani data')
assert.match(engine, /isTaxExpenseName\(name\).*?group === 'rent'/, 'Historical tax rows must not enter forecast article history')
assert.match(engine, /isTaxExpenseName\(name\).*?isServiceChargeStaffExpenseName\(name\)/, 'Tax rows must stay separate from the calculated turnover-tax line')

console.log('Forecast v431 tax de-duplication checks passed')

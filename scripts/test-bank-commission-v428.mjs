import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const parts = await Promise.all([
  'src/main.parts/part-00.jsxpart',
  'src/main.parts/part-03.jsxpart',
  'src/main.parts/part-05.jsxpart'
].map(path => readFile(path, 'utf8')))
const source = parts.join('\n')

assert.match(source, /RMS_BANK_COMMISSION_RATE_SETTING = 'bank_commission_rate_v1'/)
assert.match(source, /const RMS_DEFAULT_BANK_COMMISSION_RATE = 2/)
assert.match(source, /bank \* commissionRate \/ 100/)
assert.match(source, /cash \+ bank - bankCommission \+ wolt/)
assert.match(source, /Комиссия банка за безнал/)
assert.match(source, /writeRmsAppSetting\(RMS_BANK_COMMISSION_RATE_SETTING, normalized\)/)

const august = [
  { cash: 5644.03, bank: 19144.73, wolt: 7324.80 },
  { cash: 9620.94, bank: 47604.79, wolt: 0 },
  { cash: 633.42, bank: 5930.62, wolt: 5795 },
  { cash: 22197.09, bank: 70904.03, wolt: 0 },
  { cash: 17263.02, bank: 71864.88, wolt: 0 },
  { cash: 3430.30, bank: 10784.90, wolt: 862 }
]
const gross = august.reduce((sum, row) => sum + row.cash + row.bank + row.wolt, 0)
const fee = august.reduce((sum, row) => sum + row.bank * 0.02, 0)
const net = gross - fee

assert.equal(gross.toFixed(2), '299004.55')
assert.equal(fee.toFixed(2), '4524.68')
assert.equal(net.toFixed(2), '294479.87')

console.log('Bank commission v428 checks passed')

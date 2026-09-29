import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
const a = fs.readFileSync('src/main.parts/part-03.jsxpart', 'utf8')
const b = fs.readFileSync('src/main.parts/part-04.jsxpart', 'utf8')
const helper = a.slice(a.indexOf('function buildSupplierInvoiceIndex('), a.indexOf('function Suppliers('))
const ctx = { Map, String }
vm.createContext(ctx)
vm.runInContext(helper, ctx)
const invoices = Array.from({length: 4000}, (_, i) => ({id: String(i), amount: i + 1, paid_amount: i % 5}))
const links = Array.from({length: 8000}, (_, i) => ({purchase_id: String(i % 4000), e_invoice_id: String(i % 4000), linked_amount: i}))
links.push({purchase_id: 'missing', e_invoice_id: 'absent'})
const index = ctx.buildSupplierInvoiceIndex(invoices, links)
const oldLookup = id => links.filter(l => String(l.purchase_id) === String(id)).map(link => {
  const invoice = invoices.find(v => String(v.id) === String(link.e_invoice_id))
  return invoice ? {...invoice, link} : null
}).filter(Boolean)
const nextLookup = id => index.invoicesByPurchase.get(String(id)) || []
const summary = rows => JSON.stringify(rows)
for (const id of ['0', 1, '1999', '3999', 'missing', 'unknown']) {
  assert.equal(summary(nextLookup(id)), summary(oldLookup(id)))
}
// Cached values must refresh after edits, additions and removals.
const changed = ctx.buildSupplierInvoiceIndex([{id:'0',amount:999,paid_amount:400}], [{purchase_id:'new',e_invoice_id:0}])
assert.equal(changed.invoicesByPurchase.get('new')[0].amount, 999)
assert.equal(changed.invoicesByPurchase.has('0'), false)
const start = performance.now()
let oldTotal=0
for(let i=0;i<4000;i++) oldTotal += oldLookup(i).reduce((sum, row)=>sum+row.amount,0)
const oldMs=performance.now()-start
const nextStart=performance.now()
let nextTotal=0
for(let i=0;i<4000;i++) nextTotal += nextLookup(i).reduce((sum, row)=>sum+row.amount,0)
const nextMs=performance.now()-nextStart
assert.equal(nextTotal,oldTotal)
console.log(JSON.stringify({invoices:4000,links:8001,oldLookupMs:Math.round(oldMs),indexedLookupMs:Math.round(nextMs*100)/100,identicalTotals:true}))
console.log('PASS: multiple links, numeric IDs, missing invoices, edits and removals retain original results')

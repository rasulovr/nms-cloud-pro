import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { expenseEditAccess, expenseEditPatch } from '../src/expenseEditPolicy.mjs'
const source=await readFile('src/main.parts/part-02.jsxpart','utf8')
const handlers=source.slice(source.indexOf('  async function updateExpense('),source.indexOf('  async function addInflow('))
function fixture({admin=true,recent=false,cancelled=false,fail=false}={}){
 const calls=[]
 const row={id:'synthetic-expense',created_at:recent?new Date().toISOString():'2020-01-01T00:00:00Z',expense_date:'2026-09-01',amount:12,comment:'Synthetic fixture',custom_category:'Test expense',deleted_at:cancelled?'2026-10-01':null}
 const c={expenseEditAccess,expenseEditPatch,isAdmin:admin,expenses:[row],branchId:'synthetic-branch',date:'2026-09-01',canEditWithinWeek:r=>Date.now()-new Date(r.created_at).getTime()<=604800000,expenseNameFromPatch:(r,p)=>({...r,...p}).custom_category,isBazarExpenseName:n=>n==='Базар',currentUserMeta:async()=>({user_id:'synthetic-actor'}),hydrateExpenseForLocalState:(r,p)=>({...r,...p}),loadMonthStats:async()=>{},loadLogs:async()=>{},load:async()=>{},setMessage:m=>{c.message=m},setExpenses:updater=>{c.expenses=updater(c.expenses)},supabase:{rpc:async(name,args)=>{calls.push({name,args});return fail?{error:{message:'Synthetic failure'}}:{error:null}}}}
 vm.createContext(c);vm.runInContext(handlers,c)
 return {c,calls,row}
}
let f=fixture()
assert.equal(await f.c.updateExpense(f.row.id,{amount:18,comment:'Correction',expense_date:'2026-10-01',branch_id:'other',deleted_at:'now'}),true)
assert.equal(f.calls.length,1)
assert.equal(f.calls[0].name,'rms_expense_update_secure')
assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].args)),{p_id:'synthetic-expense',p_patch:{amount:18,comment:'Correction'}})
assert.equal(f.c.expenses[0].amount,18)
assert.equal(f.c.expenses[0].expense_date,'2026-09-01')
assert.equal(await f.c.updateExpense(f.row.id,{amount:18,comment:'Correction'}),true)
assert.equal(f.calls.length,1,'Repeated unchanged submission does not create a second audit event')
f=fixture({admin:false});assert.equal(await f.c.updateExpense(f.row.id,{amount:18}),false);assert.equal(f.calls.length,0)
f=fixture({cancelled:true});assert.equal(await f.c.updateExpense(f.row.id,{amount:18}),false);assert.equal(f.calls.length,0)
f=fixture({fail:true});assert.equal(await f.c.updateExpense(f.row.id,{amount:18}),false);assert.equal(f.c.expenses[0].amount,12)
f=fixture();assert.equal(await f.c.cancelExpense(f.row.id),false);assert.equal(f.calls.length,0,'Historical cancellation remains blocked pending backend guard')
f=fixture({recent:true,admin:false});assert.equal(await f.c.updateExpense(f.row.id,{amount:18}),true);assert.equal(f.calls.length,1)
f=fixture({recent:true,fail:true});assert.equal(await f.c.cancelExpense(f.row.id),false);assert.equal(f.c.expenses[0].deleted_at,null,'Failed cancel must not visually delete the row')
f=fixture({recent:true});assert.equal(await f.c.cancelExpense(f.row.id),true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'rms_expense_cancel_secure');assert.ok(f.c.expenses[0].deleted_at);assert.equal(await f.c.cancelExpense(f.row.id),false);assert.equal(f.calls.length,1)
console.log('Expense handler checks passed (actual handlers, synthetic mocked RPC, no database writes)')

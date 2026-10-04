import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
// This project is CommonJS-configured; importing the source via data URL keeps
// the browser module unchanged while testing its real exports in Node.
const source=await fs.readFile(new URL('../src/payroll-write.js', import.meta.url),'utf8')
const {payrollRequestKey,payrollWriteError,writePayrollAtomic,matchedAccrualOperations}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
const ref={current:null};const operations=[{type:'advance',employee_id:'synthetic',amount:12}]
const key=payrollRequestKey(ref,operations);assert.equal(payrollRequestKey(ref,operations),key)
assert.notEqual(payrollRequestKey(ref,[{...operations[0],amount:13}]),key)
const calls=[]
await assert.rejects(()=>writePayrollAtomic({rpc:async(...args)=>{calls.push(args);return {error:{code:'42501',message:'Denied'}}}},key,operations))
assert.equal(calls.length,1);assert.equal(calls[0][0],'rms_payroll_write_atomic')
assert.match(payrollWriteError({code:'42501'}),/настройками доступа к данным/)
assert.match(payrollWriteError({code:'42501',message:'Payroll write access requires an active linked RMS administrator'}),/Недостаточно прав/)
assert.doesNotMatch(payrollWriteError({code:'42501',message:'permission denied for schema private_details'}),/private_details/)
assert.match(payrollWriteError({code:'PGRST202'}),/обновление базы/)
assert.match(payrollWriteError({code:'40001'}),/Данные изменились/)
await assert.rejects(()=>writePayrollAtomic({rpc:async()=>({data:{operations:[]}})},key,operations),/подтвердить результат/)
const result={replayed:false,operations:[{id:'synthetic-journal',period:{id:'synthetic-period'}}]}
assert.deepEqual(await writePayrollAtomic({rpc:async()=>({data:result})},key,operations),result)
const row={id:'synthetic-period',employee_id:'synthetic-employee',branch_id:null,salary_month:'2026-10-01',expected:{updated_at:'2026-10-01T00:00:00Z',worked_days:10},patch:{worked_days:12}}
assert.deepEqual(matchedAccrualOperations(JSON.stringify([row]))[0],{type:'accrual_patch',...row})
assert.throws(()=>matchedAccrualOperations(JSON.stringify([row,row])),/дважды/)
assert.throws(()=>matchedAccrualOperations(JSON.stringify([{...row,patch:{card_payment:4}}])),/только/)
assert.throws(()=>matchedAccrualOperations(JSON.stringify([{...row,expected:{}}])),/updated_at/)
const part=await fs.readFile(new URL('../src/main.parts/part-03.jsxpart', import.meta.url),'utf8')
const advances=part.slice(part.indexOf('function Advances('),part.indexOf('function SupplierProductPriceHistoryChart'))
const add=advances.slice(advances.indexOf('async function addAdvance'),advances.indexOf('function startEditAdvance'))
assert.ok(!add.includes("from('salary_advances')"),'advance creation must not fall back to separate writes')
assert.ok(add.includes('advanceInFlightRef.current')&&add.includes('finally'))
const payments=part.slice(part.indexOf('async function addSalaryPayment'),part.indexOf('async function cancelSalaryPayment'))
assert.ok(!payments.includes('.insert('),'payment creation must be one atomic transaction')
assert.ok(payments.includes('expected_prior_debt: previousDebt')&&payments.includes('expected_prior_debt: 0'))
assert.ok(!payments.includes('previousDebt || previousAmount'),'zero prior debt must route to advance')
assert.ok(payments.includes('payrollInFlightRef.current')&&payments.includes('finally'))
console.log('Payroll client: request identity, error propagation, result validation, bounded accrual patches and atomic-handler guards passed')

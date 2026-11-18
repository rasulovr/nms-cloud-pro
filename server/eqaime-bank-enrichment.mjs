import {projectBalances} from './eqaime-balances.mjs';
import {sourceUnits} from './eqaime-money.mjs';
export function enrichBankMatches(bank,snapshot,entityId){
 const payments=new Map(projectBalances(snapshot,entityId).flatMap(g=>g.payments.map(p=>[p.id,p])));
 if(payments.size!==bank.rows.length)throw Error('Bank evidence coverage mismatch');
 return {...bank,rows:bank.rows.map(r=>{const p=payments.get(r.id);if(!p||sourceUnits(p.amount)!==sourceUnits(r.amount)||p.date!==r.date)throw Error('Bank evidence changed');const matched=Boolean(p.verifiedInvoiceNumber||p.settlementGroupId);return {...r,electronicInvoiceNumbers:p.electronicInvoiceNumbers,reviewRequired:!matched,matchingStatus:p.verifiedInvoiceNumber?'verified_individual':p.settlementGroupId?'verified_group':'unallocated',verifiedInvoiceNumber:p.verifiedInvoiceNumber,settlementGroupId:p.settlementGroupId,allocationNotice:p.allocationNotice}})};
}

import {projectBalances} from './eqaime-balances.mjs';
export function applyGroupStatuses(report,snapshot,entityId){
 const groups=projectBalances(snapshot,entityId),map=new Map(),invoiceAmounts=new Map(groups.flatMap(g=>g.invoices.map(i=>[i.invoiceNumber,i.amount])));
 for(const g of groups)for(const e of g.settlementGroups)for(const number of e.invoiceNumbers){if(map.has(number))throw Error('Duplicate group invoice');map.set(number,e)}
 const live=new Set(report.primaryRows.map(r=>r.invoiceNumber));for(const number of map.keys())if(!live.has(number))throw Error('Missing grouped invoice');
 return {...report,primaryRows:report.primaryRows.map(r=>{const e=map.get(r.invoiceNumber);if(!e)return r;if(invoiceAmounts.get(r.invoiceNumber)!==r.primaryAmount||r.sourceReviewRequired||r.paymentStatus?.state==='paid_observed'||r.paymentStatus?.confirmedPaidAmount!=null)throw Error('Conflicting group payment');return {...r,paymentStatus:{state:'paid_observed',label:'Оплачено в полной группе по имеющимся банковским документам',confirmedPaidAmount:null,groupSettlement:{id:e.id,invoiceNumbers:e.invoiceNumbers,amount:e.amount},paymentDates:e.paymentDates,coverageNotice:'Номер и сумма подтверждены для всей группы. Индивидуальное распределение банковского платежа не устанавливалось. Выписки неполные, возможные возвраты не учтены.'},confirmedDebt:null}})};
}

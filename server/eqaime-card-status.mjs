import {sourceUnits} from './eqaime-money.mjs';
export function applyCardStatuses(report,card){
 if(card.sourceStatus!=='connected'||card.finalDebt!==null)throw Error('Card unavailable');
 const map=new Map();for(const p of card.additionalPayments){if(map.has(p.invoiceNumber))throw Error('Duplicate supplementary invoice');map.set(p.invoiceNumber,p)}
 for(const n of map.keys())if(report.primaryRows.filter(r=>r.invoiceNumber===n).length!==1)throw Error('Missing supplementary invoice');
 return {...report,primaryRows:report.primaryRows.map(r=>{const p=map.get(r.invoiceNumber);if(!p)return r;if(r.supplierKey!==card.supplierKey||r.sourceReviewRequired||r.paymentStatus?.confirmedPaidAmount!=null||r.paymentStatus?.groupSettlement||r.paymentStatus?.state==='paid_observed'||sourceUnits(r.comparisonAmount)!==sourceUnits(p.amount))throw Error('Conflicting supplementary payment');return {...r,paymentStatus:{state:'paid_observed',label:'Оплачено: дополнительный проверенный банковский документ',confirmedPaidAmount:p.amount,paymentDates:[p.date],coverageNotice:p.sourceLabel+'. Один фактический перевод; запись журнала не создаёт вторую оплату. Дополнительная операция карточки, вне прежней центральной банковской выборки. Выписки неполные, возможные возвраты не учтены.'},confirmedDebt:null}})};
}

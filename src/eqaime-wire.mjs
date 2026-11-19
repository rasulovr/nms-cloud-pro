// Lossless transport deduplication only; matching, amounts and status objects are unchanged.
export function packPrimaryStatuses(report){
 if(!Array.isArray(report.primaryRows))return report;
 const keys=new Map(),paymentStatuses=[];
 const primaryRows=report.primaryRows.map(({paymentStatus,...row})=>{if(!paymentStatus)throw Error('Missing status');const key=JSON.stringify(paymentStatus);let id=keys.get(key);if(id===undefined){id=paymentStatuses.length;keys.set(key,id);paymentStatuses.push(paymentStatus)}return {...row,paymentStatusId:id}});
 return {...report,primaryRows,paymentStatuses,statusEncoding:'dictionary-v1'};
}
export function unpackPrimaryStatuses(report){
 if(report.statusEncoding===undefined)return report;
 if(report.statusEncoding!=='dictionary-v1'||!Array.isArray(report.paymentStatuses)||report.paymentStatuses.length>10000||!Array.isArray(report.primaryRows))throw Error('Invalid status encoding');
 const {paymentStatuses,statusEncoding,...rest}=report;
 return {...rest,primaryRows:report.primaryRows.map(({paymentStatusId,...row})=>{if(!Number.isInteger(paymentStatusId)||paymentStatusId<0||paymentStatusId>=paymentStatuses.length||row.paymentStatus!==undefined)throw Error('Invalid status reference');const s=paymentStatuses[paymentStatusId];if(!s||typeof s!=='object'||!['paid_observed','partial_or_unknown','payment_not_found'].includes(s.state))throw Error('Invalid status');return {...row,paymentStatus:s}})};
}

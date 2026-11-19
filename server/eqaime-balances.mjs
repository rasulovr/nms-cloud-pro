import {comparisonUnits,assertMoneyPolicy,monetaryValues} from './eqaime-money.mjs';
import {verifyGroups} from './eqaime-settlement-groups.mjs';
const decimal=/^\d+(\.\d{1,8})?$/;
const units=v=>{if(typeof v!=='string'||!decimal.test(v))throw Error('Invalid amount');const [a,b='']=v.split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'))};
const format=v=>{const sign=v<0n?'-':'';v=v<0n?-v:v;return sign+(v/100000000n)+'.'+(v%100000000n).toString().padStart(8,'0').replace(/0+$/,'').padEnd(2,'0')};
const keyPattern=/^supplier-[a-f0-9-]{36}$/;
const validDate=v=>v===null||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export function projectBalances(snapshot,entityId){
 assertMoneyPolicy(snapshot?.monetaryPolicy);
 if(snapshot?.version!==1||snapshot.legalEntityId!==entityId||!Array.isArray(snapshot.groups)||snapshot.groups.length>1000||snapshot.coverage?.complete!==false||snapshot.coverage?.openingBalanceKnown!==false||snapshot.coverage?.refundCoverageKnown!==false)throw Error('Invalid balance source');
 for(const k of ['primary','bank','mapping'])if(!/^[a-f0-9]{64}$/.test(snapshot.sourceHashes?.[k]||''))throw Error('Missing source binding');
 const keys=new Set(),invoices=new Set(),payments=new Set();
 const projected=snapshot.groups.map(g=>{
  if(!keyPattern.test(g.supplierKey)||keys.has(g.supplierKey)||typeof g.displayName!=='string'||!g.displayName.trim()||g.displayName.length>300||typeof g.bankScopeAvailable!=='boolean'||!Array.isArray(g.invoices)||!Array.isArray(g.payments)||g.invoices.length>10000||g.payments.length>25000||!g.bankScopeAvailable&&g.payments.length)throw Error('Invalid supplier group');keys.add(g.supplierKey);
  let eligible=0n,sourceEligible=0n,paid=0n,matched=0n,reviewCount=0,matchedPaymentCount=0;const allocations=new Map();
  const invoiceRows=g.invoices.map(x=>{if(typeof x.invoiceNumber!=='string'||!/^[A-Z0-9]+$/.test(x.invoiceNumber)||invoices.has(x.invoiceNumber)||!validDate(x.date)||typeof x.reviewRequired!=='boolean')throw Error('Invalid invoice');invoices.add(x.invoiceNumber);const n=units(x.amount);if(x.reviewRequired)reviewCount++;else {eligible+=comparisonUnits(x.amount,snapshot.monetaryPolicy);sourceEligible+=n}return {invoiceNumber:x.invoiceNumber,date:x.date,amount:x.amount,...monetaryValues(x.amount,snapshot.monetaryPolicy),reviewRequired:x.reviewRequired}});
  const paymentRows=g.payments.map(x=>{if(typeof x.id!=='string'||!x.id||payments.has(x.id)||x.date===null||!validDate(x.date)||typeof x.recipientName!=='string'||x.recipientName.length>300||!Array.isArray(x.electronicInvoiceNumbers)||x.electronicInvoiceNumbers.some(n=>typeof n!=='string'||!/^[A-Z0-9]+$/.test(n)))throw Error('Invalid payment');payments.add(x.id);const n=units(x.amount);paid+=n;if(x.verifiedInvoiceNumber!==null){if(typeof x.verifiedInvoiceNumber!=='string'||!x.electronicInvoiceNumbers.includes(x.verifiedInvoiceNumber))throw Error('Missing payment reference');const invoice=invoiceRows.find(i=>i.invoiceNumber===x.verifiedInvoiceNumber);if(!invoice||invoice.reviewRequired)throw Error('Invalid allocation');allocations.set(invoice.invoiceNumber,(allocations.get(invoice.invoiceNumber)||0n)+n);matched+=n;matchedPaymentCount++}return {id:x.id,date:x.date,amount:x.amount,recipientName:x.recipientName,electronicInvoiceNumbers:x.electronicInvoiceNumbers,verifiedInvoiceNumber:x.verifiedInvoiceNumber}});
  for(const [number,total] of allocations){if(total<=0n||total>comparisonUnits(invoiceRows.find(i=>i.invoiceNumber===number).amount,snapshot.monetaryPolicy))throw Error('Invalid allocated amount')}
  return {supplierKey:g.supplierKey,displayName:g.displayName,bankScopeAvailable:g.bankScopeAvailable,invoiceCount:invoiceRows.length,paymentCount:paymentRows.length,reviewCount,eligibleInvoiceAmount:format(eligible),sourceInvoiceAmount:format(sourceEligible),monetaryPolicy:snapshot.monetaryPolicy||'SOURCE_EXACT',observedPaymentAmount:g.bankScopeAvailable?format(paid):null,matchedPaymentAmount:g.bankScopeAvailable?format(matched):null,unallocatedPaymentAmount:g.bankScopeAvailable?format(paid-matched):null,matchedPaymentCount,unallocatedPaymentCount:paymentRows.length-matchedPaymentCount,observedDifference:g.bankScopeAvailable?format(eligible-matched):null,finalDebt:null,invoices:invoiceRows,payments:paymentRows};
 });
 const notices=new Map();
 if(snapshot.allocationWarnings!==undefined){
  if(!Array.isArray(snapshot.allocationWarnings)||snapshot.allocationWarnings.length>1000)throw Error('Invalid allocation warnings');
  for(const w of snapshot.allocationWarnings){if(w.kind!=='additional_unverified_payment_outside_scope'||typeof w.invoiceNumber!=='string'||!invoices.has(w.invoiceNumber)||notices.has(w.invoiceNumber))throw Error('Invalid allocation warning');notices.set(w.invoiceNumber,'Есть сведения о дополнительной неподтверждённой оплате вне этой выборки. Предварительная разница не является подтверждённым долгом.')}
 }
 const settlements=verifyGroups(snapshot,snapshot.settlementGroups||[]);
 for(const g of projected){
  g.settlementGroups=settlements.filter(e=>e.supplierKey===g.supplierKey).map(e=>({...e,paymentDates:[...new Set(e.paymentIds.map(id=>g.payments.find(p=>p.id===id).date))].sort()}));
  const paymentGroups=new Map(g.settlementGroups.flatMap(e=>e.paymentIds.map(id=>[id,e.id])));
  const grouped=g.settlementGroups.reduce((n,e)=>n+units(e.amount),0n);
  if(grouped){g.matchedPaymentAmount=format(units(g.matchedPaymentAmount)+grouped);g.unallocatedPaymentAmount=format(units(g.unallocatedPaymentAmount)-grouped);g.observedDifference=format(units(g.eligibleInvoiceAmount)-units(g.matchedPaymentAmount));g.matchedPaymentCount+=paymentGroups.size;g.unallocatedPaymentCount-=paymentGroups.size}
  const adjustment=g.settlementGroups.reduce((n,e)=>{const v=e.comparisonAdjustment||'0';return n+(v.startsWith('-')?-units(v.slice(1)):units(v))},0n);g.comparisonAdjustment=g.bankScopeAvailable?format(adjustment):null;g.unadjustedObservedDifference=g.observedDifference;if(g.bankScopeAvailable)g.observedDifference=format(units(g.eligibleInvoiceAmount)-units(g.matchedPaymentAmount)-adjustment);
  g.allocationWarnings=g.invoices.filter(i=>notices.has(i.invoiceNumber)).map(i=>({invoiceNumber:i.invoiceNumber,notice:notices.get(i.invoiceNumber)}));
  g.payments=g.payments.map(p=>({...p,settlementGroupId:paymentGroups.get(p.id)||null,allocationNotice:notices.get(p.verifiedInvoiceNumber)||null}));
 }
 return projected;
}
export function balancePage(groups,{supplier='',page=1}={}){
 if(typeof supplier!=='string'||supplier&&!keyPattern.test(supplier)||!Number.isInteger(page)||page<1||page>1000)throw Error('Invalid filters');
 const base={sourceStatus:'connected',coverage:{complete:false,openingBalanceKnown:false,refundCoverageKnown:false},finalDebt:null};
 if(!supplier)return {...base,groups:groups.map(({invoices,payments,...g})=>g)};
 const g=groups.find(x=>x.supplierKey===supplier);if(!g)throw Error('Unknown supplier');
 const pages=Math.max(1,Math.ceil(Math.max(g.invoices.length,g.payments.length)/100));
 return {...base,group:{...g,invoices:g.invoices.slice((page-1)*100,page*100),payments:g.payments.slice((page-1)*100,page*100)},page,pages};
}

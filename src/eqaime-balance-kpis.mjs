import {sumAmounts,debtDifference,decimalUnits} from './eqaime-totals.mjs';
export function balanceTone(g){const v=g.bankScopeAvailable?debtDifference(g.observedDifference):null;return v==null?'unknown':v.startsWith('-')?'debt':decimalUnits(v)===0n?'zero':'overpayment'}
export function balanceKpis(groups){
 const known=groups.filter(g=>g.bankScopeAvailable&&g.observedDifference!=null);
 const debts=known.map(g=>debtDifference(g.observedDifference)).filter(v=>v.startsWith('-')).map(v=>v.slice(1));
 const over=known.map(g=>debtDifference(g.observedDifference)).filter(v=>!v.startsWith('-'));
 return {invoiceAmount:groups.length?sumAmounts(groups.map(g=>g.eligibleInvoiceAmount)):null,paymentAmount:groups.some(g=>g.bankScopeAvailable)?sumAmounts(groups.filter(g=>g.bankScopeAvailable).map(g=>g.observedPaymentAmount)):null,grossDebt:known.length?debtDifference(sumAmounts(debts)):null,overpayment:known.length?sumAmounts(over):null,unknownCount:groups.length-known.length,reviewCount:groups.reduce((n,g)=>n+(g.reviewCount||0),0),invoiceCount:groups.reduce((n,g)=>n+g.invoiceCount,0),paymentCount:groups.reduce((n,g)=>n+g.paymentCount,0),knownCount:known.length};
}

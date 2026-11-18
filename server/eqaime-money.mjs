export const MONEY_POLICY='AZN_PER_INVOICE_HALF_UP_2';
export function assertMoneyPolicy(policy){if(policy!==undefined&&policy!==MONEY_POLICY)throw Error('Unknown monetary comparison policy')}
export function sourceUnits(v){if(typeof v!=='string'||!/^\d+(\.\d{1,8})?$/.test(v))throw Error('Invalid source amount');const [a,b='']=v.split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'))}
export function formatUnits(v){const sign=v<0n?'-':'';v=v<0n?-v:v;return sign+(v/100000000n)+'.'+(v%100000000n).toString().padStart(8,'0').replace(/0+$/,'').padEnd(2,'0')}
export function comparisonUnits(v,policy){assertMoneyPolicy(policy);const n=sourceUnits(v);return policy===MONEY_POLICY?((n+500000n)/1000000n)*1000000n:n}
export function monetaryValues(v,policy){return {sourceAmount:v,comparisonAmount:formatUnits(comparisonUnits(v,policy)),roundingAdjustment:formatUnits(comparisonUnits(v,policy)-sourceUnits(v)),monetaryPolicy:policy||'SOURCE_EXACT'}}

export function decimalUnits(v){if(typeof v!=='string'||!/^\d+(\.\d{1,8})?$/.test(v))throw Error('Invalid amount');const [a,b='']=v.split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'))}
export function decimalText(n){const sign=n<0n?'-':'';n=n<0n?-n:n;return sign+(n/100000000n)+'.'+(n%100000000n).toString().padStart(8,'0').replace(/0+$/,'').padEnd(2,'0')}
export const sumAmounts=values=>decimalText(values.reduce((sum,v)=>sum+decimalUnits(v),0n));
export const debtDifference=v=>v==null?null:decimalText(v.startsWith('-')?decimalUnits(v.slice(1)):-decimalUnits(v));
export const differenceLabel=v=>v==null?'Не рассчитано':v.startsWith('-')?'Долг по расчёту':decimalUnits(v)===0n?'Сходится по расчёту':'Переплата по расчёту';

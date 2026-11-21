// Exact decimal identity only; never rounding or modifying source values.
export function exactDecimal(value){if(typeof value!=='string'||!/^\d{1,15}(?:\.\d{1,8})?$/.test(value))return value;const [a,b='']=value.split('.');const tail=b.replace(/0+$/,'');return a.replace(/^0+(?=\d)/,'')+(tail?'.'+tail:'')}

const codes=new Set(['EQ_CONFIG','EQ_AUTH','EQ_ACCESS','EQ_REQUEST','EQ_READ','EQ_TIMEOUT','EQ_PAYLOAD','EQ_PROCESS','EQ_STARTUP'])
const stages=new Set(['request','config','auth','invoices_payments','links','purchases','suppliers','analysis','response','startup'])
export function diagnostic(code,stage){return {code:codes.has(code)?code:'EQ_PROCESS',stage:stages.has(stage)?stage:'response'}}
export function emitDiagnostic(code,stage,sink=entry=>console.warn(JSON.stringify(entry))){const safe=diagnostic(code,stage);try{sink(safe)}catch{}return safe}

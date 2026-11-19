// Browser-only, network-free PASHA SC workbook adapter. Raw identity fields stay in memory.
const HEADER=['Əməliyyat tarixi','İcra tarixi','Ödəyən/Benefisiar','Təyinat','İstinad No','VÖEN','Mədaxil','Məxaric','Balans'];
const str=v=>v==null?'':String(v).trim();
const norm=v=>str(v).replace(/\s+/g,' ').toUpperCase();
export function money(v){const s=str(v);if(!s)return '0.00';if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('invalid_decimal_amount');return s.split('.')[0].replace(/^0+(?=\d)/,'')+'.'+(s.split('.')[1]||'').padEnd(2,'0');}
export function bankDate(v){const iso=str(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]00:00:00)?$/);const m=iso?[iso[0],iso[3],iso[2],iso[1]]:str(v).match(/^(\d{2})[.-](\d{2})[.-](\d{4})$/);if(!m)return null;const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));return d.toISOString().slice(0,10)===`${m[3]}-${m[2]}-${m[1]}`?d.toISOString().slice(0,10):null;}
const sha=async s=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
export function extractBankReferences(purpose,bankRef=''){
 let s=norm(purpose).split(norm(bankRef)||'\0').join(' ');
 // Only observed linguistic separators; never accept arbitrary letter/extra-digit suffixes.
 s=s.replace(/\bE-QAIME(?=MT\d)/g,'E-QAIME ').replace(/(MT\d{12})(?=QALIQ BORC(?:UN ODENILMESI)?\b|L F4-(?:62|91)\b)/g,'$1 ');
 const refs=[];const re=/(?:MT\s*\d{4}\s*\d{8}|EB[A-Z]{2}\s*\d{6})/g;let m;let incomplete=false;const spans=[];
 while((m=re.exec(s))){const before=s.slice(0,m.index),after=s.slice(re.lastIndex);const adjacentRef=/^(?:MT\s*\d{4}\s*\d{8}|EB[A-Z]{2}\s*\d{6})(?!\d)/.test(after);const previousRef=spans.some(x=>x[1]===m.index);if((/[A-Z0-9]$/.test(before)&&!previousRef)||(/^[A-Z0-9]/.test(after)&&!adjacentRef)){incomplete=true;continue;}refs.push(m[0].replace(/\s/g,''));spans.push([m.index,re.lastIndex]);}
 let residue=s;for(const [a,b]of spans.reverse())residue=residue.slice(0,a)+' '.repeat(b-a)+residue.slice(b);
 residue=residue.replace(/L F4\s*-\s*91961\b/g,' ');
 if(/\d{5,}|\bMT\d|\bEB[A-Z]{2}\s*\d/.test(residue))incomplete=true;
 return {invoiceNumbers:incomplete?[]:[...new Set(refs)],referenceEvidenceComplete:refs.length>0&&!incomplete,unverifiedReferenceCandidates:incomplete?[...new Set(refs)]:[]};
}
function recipientName(v){return str(v).split(/\r?\n/).filter(x=>!/^\/?AZ\d{2}[A-Z0-9]{24}$/.test(x.trim())).join(' ').trim();}
export async function parseBankWorkbook({sheets,sourceHash='',fileName=''}){
 if(!Array.isArray(sheets)||sheets.length>20)throw Error('invalid_workbook');
 const payments=[],excluded=[],review=[],coverage=[];const seen=new Map();
 for(const sheet of sheets){const rows=sheet.rows;if(!Array.isArray(rows)||rows.length>50000)throw Error('workbook_too_large');let hi=rows.findIndex(r=>HEADER.every((h,i)=>norm(r[i])===norm(h)));if(hi<0){review.push({reason:'unsupported_sheet_layout',sheet:sheet.name});continue;}
 const head=rows.slice(0,hi);const ibans=[...new Set(head.flatMap(r=>r.flatMap(v=>str(v).match(/\bAZ\d{2}[A-Z0-9]{24}\b/g)||[])))];const ownerIds=[...new Set(head.flatMap(r=>r.flatMap(v=>[...str(v).matchAll(/V[ÖO]EN:\s*(\d{10})\b/g)].map(m=>m[1]))))];const account=ibans.length===1?ibans[0]:null;const ownerVoen=ownerIds.length===1?ownerIds[0]:null;const bankAccountKey=account?await sha(account):null;
 const periodRow=head.find(r=>norm(r[0])==='MÜDDƏT:');coverage.push({sheet:sheet.name,period:periodRow?str(periodRow[1]):null,complete:false,ownerIdentityPresent:!!ownerVoen,accountIdentityPresent:!!account});
 for(let ri=hi+1;ri<rows.length;ri++){const r=rows[ri];if(!r.some(v=>str(v)))continue;if(!str(r[6])&&!str(r[7]))continue;
 const source={fileName,fileSha256:sourceHash,sheet:sheet.name,row:ri+1};let credit,amount;try{credit=money(r[6]);amount=money(r[7]);}catch{review.push({source,reason:'invalid_amount'});continue;}
 if(credit!=='0.00'&&amount!=='0.00'){review.push({source,reason:'both_credit_and_debit'});continue;}if(credit!=='0.00'||amount==='0.00'){excluded.push({source,reason:'not_outgoing_debit'});continue;}
 const purpose=str(r[3]),recipientVoen=/^\d{10}$/.test(str(r[5]))?str(r[5]):null;const name=recipientName(r[2]);const ref=str(r[4]);const date=bankDate(r[0]);
 if(recipientVoen&&ownerVoen===recipientVoen||/HESABIN\s+MOHKEMLENDIRILMESI/i.test(purpose)){excluded.push({source,reason:'own_account_transfer'});continue;}
 if(/\b(?:PURCHASE|ATM|CASH WITHDRAWAL|CARD PAYMENT|COMMISSION|CONVERSION FEE)\b/i.test(purpose)){excluded.push({source,reason:'card_cash_or_fee'});continue;}
 const reasons=[];if(!account||!ownerVoen)reasons.push('missing_payer_identity');if(!recipientVoen||!name)reasons.push('missing_recipient_identity');if(!/^[A-Za-z0-9-]{5,80}$/.test(ref))reasons.push('missing_stable_transaction_reference');if(!date)reasons.push('invalid_date');if(!/^AZ\d{2}[A-Z]{4}\d{5}AZNSC\d{10}$/.test(account||''))reasons.push('unsupported_currency');
 if(reasons.length){review.push({source,reasons,date,amount});continue;}
 const id='bank-'+await sha(JSON.stringify([bankAccountKey,date,ref]));const fingerprint=await sha(JSON.stringify([date,amount,credit,recipientVoen,purpose]));const references=extractBankReferences(purpose,ref);
 if(!references.referenceEvidenceComplete)review.push({source,id,reason:'incomplete_invoice_references'});
 const p={id,bankTransactionId:ref,bankAccountKey,ownerVoen,recipientVoen,date,executionDate:bankDate(r[1]),amount,currency:'AZN',recipientName:name,identityVerified:true,direction:'outgoing',...references,purpose,source,sourceFingerprint:fingerprint};
 if(seen.has(id)){const prior=seen.get(id);if(prior.sourceFingerprint!==fingerprint){prior.importConflict=true;prior.reviewRequired=true;p.importConflict=true;p.reviewRequired=true;review.push({source,id,reason:'conflicting_duplicate_transaction'});}else{excluded.push({source,id,reason:'duplicate_transaction'});continue;}}
 else seen.set(id,p);payments.push(p);
 }
 }
 return {payments,excluded,review,coverage,conflictCount:review.filter(r=>r.reason==='conflicting_duplicate_transaction').length,warnings:['Возвраты и авансы без номера не учтены. Сверка не является окончательным долгом.'],localOnly:true};
}
// Export only explicit allowlisted non-sensitive fields; never serialize input objects.
export function safeBankImportSummary(result){return {payments:result.payments.map(p=>({id:p.id,date:p.date,amount:p.amount,currency:p.currency,invoiceNumbers:p.invoiceNumbers,referenceEvidenceComplete:p.referenceEvidenceComplete})),excludedCount:result.excluded.length,reviewCount:result.review.length,localOnly:true};}

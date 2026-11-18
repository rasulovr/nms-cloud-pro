function validDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v}
export function projectBank(snapshot,entityId){
 if(snapshot?.version!==1||snapshot.legalEntityId!==entityId||!Array.isArray(snapshot.rows)||snapshot.rows.length>25000)throw Error('Bank source unavailable');
 const seen=new Set();const rows=snapshot.rows.map(r=>{
  if(!r.id||seen.has(r.id)||!validDate(r.date)||r.currency!=='AZN'||r.sourceType!=='bank_statement'||!Array.isArray(r.provenance)||!r.provenance.length||typeof r.amount!=='string'||!/^\d+(\.\d+)?$/.test(r.amount)||!Array.isArray(r.electronicInvoiceNumbers)||r.electronicInvoiceNumbers.some(n=>typeof n!=='string'||!/^[A-Z0-9]+$/.test(n))||typeof r.purpose!=='string')throw Error('Bank source invalid');
  const recipientName=r.recipientNameStatus==='verified_statement_field'&&typeof r.recipientName==='string'&&r.recipientName.trim()&&r.recipientName.length<=300?r.recipientName.trim():null;
  seen.add(r.id);return {recipientName,visibilityClass:['supplier_company','review','excluded'].includes(r.visibilityClass)?r.visibilityClass:'review',id:r.id,date:r.date,amount:r.amount,purpose:r.purpose,electronicInvoiceNumbers:[...r.electronicInvoiceNumbers],reviewRequired:r.identityVerified!==true||r.allocationStatus!=='verified'||Boolean(r.reviewReasons?.length),isInternalTransfer:r.isInternalTransfer===true};
 });
 const ranges=['SC','SK'].map(account=>{const dates=snapshot.rows.filter(r=>r.accountScope===account).map(r=>r.date).sort();return dates.length?{account,from:dates[0],to:dates.at(-1)}:null}).filter(Boolean);
 const selection=snapshot.selection?.kind==='verified_rms_supplier_list'&&Number.isSafeInteger(snapshot.selection.excludedFromCopy)&&snapshot.selection.excludedFromCopy>=0?{kind:'verified_rms_supplier_list',excludedFromCopy:snapshot.selection.excludedFromCopy}:null;
 return {rows,selection,coverage:{complete:snapshot.coverage?.complete===true,ranges,notice:'Периоды отражают доступные записи, не доказывают полноту всех счетов, возвратов и расчётов.'},total:rows.length};
}
export function bankPage(source,{page=1,pageSize=100,from='',to='',search=''}={}){
 if(!Number.isInteger(page)||page<1||page>25000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100||search.length>200||(from&&!validDate(from))||(to&&!validDate(to))||(from&&to&&from>to))throw Error('Invalid filters');
 const rows=source.rows.filter(r=>r.visibilityClass==='supplier_company').filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)&&[r.recipientName||'',r.purpose,...r.electronicInvoiceNumbers].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 return {rows:rows.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:rows.length,pages:Math.max(1,Math.ceil(rows.length/pageSize)),coverage:source.coverage,selection:source.selection,hiddenCount:source.rows.filter(r=>r.visibilityClass!=='supplier_company').length,reviewCount:source.rows.filter(r=>r.visibilityClass==='review').length,sourceStatus:'connected'};
}

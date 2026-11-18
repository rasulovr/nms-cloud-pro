import {paymentStatus,safePaymentEvidence} from './eqaime-payment-status.mjs';
// Server-only candidate. No filesystem/network defaults; never bundle primary files.
const amount=/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
const normalType='Malların, işlərin və xidmətlərin təqdim edilməsi barədə elektron qaimə-faktura';
const receiptFields=new Set(['received_at','receipt_date','Daxil olma tarixi']);
const date=/^\d{4}-\d{2}-\d{2}$/;
function validDate(v){return typeof v==='string'&&date.test(v)&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v}
export function projectPrimary(snapshot,entityId){
  if(!entityId||snapshot?.legalEntityId!==entityId||snapshot.version!==1||!Array.isArray(snapshot.rows)||snapshot.rows.length>10000)throw Error('Primary source unavailable');
  const seen=new Set();
  return snapshot.rows.map(r=>{
    if(typeof r.invoiceNumber!=='string'||!r.invoiceNumber||seen.has(r.invoiceNumber)||typeof r.sourceGross!=='string'||!amount.test(r.sourceGross)||r.amountSourceHeader!=='Yekun məbləğ'||!r.provenance?.file||!Number.isInteger(r.provenance.row)||r.provenance.row<1||!Array.isArray(r.reviewReasons))throw Error('Primary source invalid');
    seen.add(r.invoiceNumber);
    // Receipt date is accepted only from a separately evidenced receipt field.
    const receipt=r.receiptDate==null?null:r.receiptDate;
    if(receipt!==null&&(!validDate(receipt)||r.receiptDateStatus!=='verified_receipt_field'||!r.receiptProvenance?.source||r.receiptProvenance.kind!=='receipt-event'||!receiptFields.has(r.receiptProvenance.field)))throw Error('Unverified receipt date');
    const reasons=[...r.reviewReasons];
    if(r.sourceKind!=='Cari'||!['Sistem tərəfindən təsdiqləndi','Təsdiqləndi'].includes(r.sourceStatus))reasons.push('source_status_requires_review');
    if(r.sourceType!==normalType)reasons.push('special_or_unknown_document_type');
    const reviewReasons=[...new Set(reasons)];
    return {id:`primary:${r.invoiceNumber}`,invoiceNumber:r.invoiceNumber,supplierName:String(r.supplierName||''),
      description:Array.isArray(r.sourceDescription)?r.sourceDescription.filter(x=>typeof x==='string'&&x.trim()).join(' · '):'',
      primaryAmount:r.sourceGross, receiptDate:receipt, receiptDateStatus:receipt===null?'not_available':'verified',
      sourceStatus:String(r.sourceStatus||''),sourceType:String(r.sourceType||''),reviewReasons,
      sourceReviewRequired:reviewReasons.length>0,paymentStatus:{state:'partial_or_unknown',label:'Недостаточно сведений об оплате',confirmedPaidAmount:null},confirmedDebt:null};
  });
}
export async function enrichWithPrimary(report,{entityId,signal,loadPrivateSnapshot}){
  if(signal?.aborted)throw Error('Aborted');
  if(typeof loadPrivateSnapshot!=='function')return {...report,primaryRows:[],primarySourceStatus:'not_connected'};
  const snapshot=await loadPrivateSnapshot({entityId,signal});
  if(signal?.aborted)throw Error('Aborted');
  const evidence=safePaymentEvidence(snapshot.paymentEvidence||{});
  const primaryRows=projectPrimary(snapshot,entityId).map(row=>({...row,paymentStatus:paymentStatus(row,evidence[row.invoiceNumber])}));
  // Do not join by amount, name, or assume an RMS supplier UUID is a tax identity.
  // Primary-first rows are independent of ambiguous RMS grouping and composite numbers.
  return {...report,primaryRows,primarySourceStatus:'connected',confirmedDebt:null};
}
export function filterPrimaryRows(rows,{from='',to='',search=''}={}){
  if((from&&!validDate(from))||(to&&!validDate(to))||(from&&to&&from>to))throw Error('Invalid dates');
  return rows.filter(r=>(!from||r.receiptDate&&r.receiptDate>=from)&&(!to||r.receiptDate&&r.receiptDate<=to)&&`${r.invoiceNumber} ${r.supplierName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a,b)=>String(b.receiptDate||'').localeCompare(String(a.receiptDate||''))||a.invoiceNumber.localeCompare(b.invoiceNumber));
}

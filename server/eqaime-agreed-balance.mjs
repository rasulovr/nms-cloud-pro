import {createHash} from 'node:crypto';

const descriptorNames=['PRIMARY','BANK','BALANCE','CARD','INCREMENTAL'];
const hex64=/^[a-f0-9]{64}$/;
const money=/^\d+\.\d{2}$/;
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const canonicalAmount=v=>typeof v==='string'&&/^\d+(?:\.\d{1,8})?$/.test(v)?v.replace(/^0+(?=\d)/,'').replace(/\.(\d*?[1-9])?0*$/,(_m,f)=>f?'.'+f:''):null;
const digest=(values)=>createHash('sha256').update(JSON.stringify(values)).digest('hex');

// Binds this single dated reconciliation decision to the configuration and
// canonical invoice that were checked together. No business data in the bundle.
const binding='386bd8397805cb0e37b76fd4b6ccad43c44386b4b1912af22fd5fbc113a5c8e5';

const sourceHashes=env=>descriptorNames.map(k=>{try{return JSON.parse(env['RMS_EQAIME_'+k+'_SOURCE']).sha256}catch{return null}});
function scopedBinding(env,scope,hashes){
 if(env?.VERCEL_ENV!=='preview'||!uuid.test(scope?.allowedAuthUserId||'')||!uuid.test(scope?.legalEntityId||'')||hashes.some(h=>typeof h!=='string'||!hex64.test(h)))return null;
 return ['rms-eqaime-agreement-v1',scope.allowedAuthUserId,scope.legalEntityId,...hashes];
}
function rowBinding(prefix,group,invoice){
 if(!prefix||!group?.bankScopeAvailable||!/^supplier-[a-f0-9-]{36}$/.test(group.supplierKey||'')||group.referenceRule!=='EXACT_REFERENCE_CENTS'||invoice?.reviewRequired!==false||invoice.referenceMatch!=null||invoice.priorUnresolvedPaymentEvidence||!/^MT\d{12}$/.test(invoice.invoiceNumber||'')||!/^\d{4}-\d{2}-\d{2}$/.test(invoice.date||'')||!money.test(invoice.comparisonAmount||'')||canonicalAmount(invoice.comparisonAmount)!==canonicalAmount(invoice.sourceAmount)||invoice.comparisonAmount==='0.00')return null;
 return digest([...prefix,group.supplierKey,invoice.invoiceNumber,invoice.date,invoice.comparisonAmount]);
}

export function asOfAgreementBinding(env,scope,group,invoice){return rowBinding(scopedBinding(env,scope,sourceHashes(env)),group,invoice)}

export function withAgreedBalance(groups,env,scope){
 const prefix=scopedBinding(env,scope,sourceHashes(env));if(!prefix)return groups;
 let found=null;
 for(const group of groups){
  for(const invoice of group.invoices){
   if(rowBinding(prefix,group,invoice)!==binding)continue;
   if(found)return groups;
   found={group,invoice};
  }
 }
 if(!found)return groups;
 const {group,invoice}=found;
 return groups.map(g=>g!==group?g:{...g,agreedBalance:{amount:'-'+invoice.comparisonAmount,invoiceNumber:invoice.invoiceNumber,invoiceDate:invoice.date}});
}

// The dated reconciliation worksheet is private runtime configuration, never a
// client/build literal. Monetary offsets are not bank transfers or allocations.
const openDate=/^\d{4}-\d{2}-\d{2}$/;
function readAgreedOpenConfig(raw){
 if(typeof raw!=='string'||raw.length>8192)return null;
 try{
  const c=JSON.parse(raw);
  if(c?.version!==1||Object.keys(c).length!==4||!openDate.test(c.asOf)||new Date(c.asOf+'T00:00:00Z').toISOString().slice(0,10)!==c.asOf||!hex64.test(c.binding)||!Array.isArray(c.groups)||c.groups.length<1||c.groups.length>6)return null;
  const seen=new Set();
  for(const group of c.groups){
   if(!group||Object.keys(group).length!==2||!['owner_agreed_open_invoices','source_open_invoices'].includes(group.kind)||!Array.isArray(group.rows)||group.rows.length<1||group.rows.length>32)return null;
   for(const rule of group.rows){
    if(!rule||Object.keys(rule).length!==(rule.partial===undefined?2:3)||typeof rule.row!=='string'||!hex64.test(rule.row)||seen.has(rule.row)||typeof rule.offsetCents!=='string'||!/^(0|[1-9]\d{0,9})$/.test(rule.offsetCents))return null;
    if(rule.partial!==undefined&&(group.kind!=='source_open_invoices'||rule.offsetCents==='0'||typeof rule.partial!=='string'||!hex64.test(rule.partial)))return null;
    if(group.kind==='source_open_invoices'&&rule.offsetCents!=='0'&&rule.partial===undefined)return null;
    seen.add(rule.row);
   }
  }
  return c;
 }catch{return null}
}
const toCents=v=>BigInt(v.replace('.',''));
const centsText=v=>`${v/100n}.${String(v%100n).padStart(2,'0')}`;
const approvedRowDigest=(g,i)=>digest(['rms-eqaime-open-row-v1',g.supplierKey,g.displayName,i.invoiceNumber,i.date,i.sourceAmount,i.comparisonAmount]);

export function withAgreedOpenBalances(groups,env,scope){
 const config=readAgreedOpenConfig(env?.RMS_EQAIME_AGREED_OPEN_BALANCES);if(!config)return groups;
 const {asOf,binding:openBinding,groups:openRules}=config;
 const hashes=sourceHashes(env);
 try{hashes.push(JSON.parse(env.RMS_EQAIME_ARCHIVE_SOURCE).sha256)}catch{return groups}
 const prefix=scopedBinding(env,scope,hashes);
 if(!prefix||digest(['rms-eqaime-open-remainder-v1',...prefix.slice(1),asOf])!==openBinding)return groups;
 const approved=new Map();
 for(const {kind,rows:rules} of openRules){
  const source=kind==='source_open_invoices';
  const selected=new Map();
  for(const group of groups){
   if(group.agreedBalance||group.bankScopeAvailable!==source||!Array.isArray(group.payments)||(!source&&(group.paymentCount!==0||group.payments.length!==0)))continue;
   const hits=[];
   for(const invoice of group.invoices){
    if(invoice.reviewRequired!==false||invoice.priorUnresolvedPaymentEvidence||!money.test(invoice.comparisonAmount)||!openDate.test(invoice.date)||invoice.date>asOf)continue;
    const id=approvedRowDigest(group,invoice);
    const rule=rules.find(r=>r.row===id);
    if(!rule)continue;
    const m=invoice.referenceMatch;
    if(rule.partial===undefined){if(m!==null)continue}
    else if(!m||m.state!=='difference'||m.supplierKey!==group.supplierKey||m.invoiceNumbers?.length!==1||m.invoiceNumbers[0]!==invoice.invoiceNumber||m.paymentIds?.length!==1||m.amount!==centsText(BigInt(rule.offsetCents))||m.invoiceAmount!==invoice.comparisonAmount||m.difference!=='-'+centsText(toCents(m.invoiceAmount)-toCents(m.amount))||group.payments.filter(p=>p.id===m.paymentIds[0]&&p.amount===m.amount).length!==1||rule.partial!==digest(['rms-eqaime-open-partial-v1',id,m.amount,m.invoiceAmount,m.difference,m.paymentIds,m.paymentDates]))continue;
    const balance=toCents(invoice.comparisonAmount)-BigInt(rule.offsetCents);
    if(balance<=0n||hits.some(h=>h.id===id))return groups;
    hits.push({id,balance,invoice});
   }
   if(hits.length===rules.length)selected.set(group,hits);
  }
  if(selected.size!==1)return groups;
  const [[group,hits]]=selected;
  if(approved.has(group))return groups;
  const items=hits.sort((a,b)=>a.invoice.date.localeCompare(b.invoice.date)||a.invoice.invoiceNumber.localeCompare(b.invoice.invoiceNumber)).map(({invoice,balance})=>({invoiceNumber:invoice.invoiceNumber,invoiceDate:invoice.date,remainingAmount:centsText(balance)}));
  const total=hits.reduce((sum,row)=>sum+row.balance,0n);
  approved.set(group,{kind,asOf,amount:'-'+centsText(total),items});
 }
 return groups.map(g=>approved.has(g)?{...g,agreedBalance:approved.get(g)}:g);
}

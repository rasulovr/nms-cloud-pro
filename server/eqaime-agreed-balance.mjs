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

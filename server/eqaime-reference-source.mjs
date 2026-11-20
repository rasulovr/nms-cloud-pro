import {appendIncremental} from './eqaime-incremental-source.mjs';
import {applyApprovedReallocation} from './eqaime-confirmed-reallocation.mjs';
import {applyApprovedReferenceCompletion,applyApprovedStandaloneCompletion} from './eqaime-confirmed-reference.mjs';
import {checkedHistoricalEvidence} from './eqaime-observed-status.mjs';
import {projectPrimary} from './eqaime-primary.mjs';
import {applyReferenceEvidence} from './eqaime-reference-evidence.mjs';
import {projectBank} from './eqaime-bank.mjs';
import {projectBalances} from './eqaime-balances.mjs';
import {projectCard} from './eqaime-card.mjs';
import {privateSourceLoader} from './eqaime-primary-source.mjs';
import {reconcileReferences} from './eqaime-exact-reference.mjs';
export async function referenceGroups(snapshot,{client,env,scope,signal,bankSnapshot,primarySnapshot}){
 let pilot=null,groups=projectBalances(snapshot,scope.legalEntityId);
 if(env.VERCEL_ENV!=='preview')return groups;
 for(const name of ['BANK','PRIMARY'])if(!env[`RMS_EQAIME_${name}_SOURCE`]||JSON.parse(env[`RMS_EQAIME_${name}_SOURCE`]).sha256!==snapshot.sourceHashes?.[name.toLowerCase()])throw Error('Source binding');
 const load=(raw,maxSourceBytes)=>{const loader=privateSourceLoader(client,raw,scope,maxSourceBytes?{maxSourceBytes}:undefined);if(!loader)throw Error('Source unavailable');return loader({entityId:scope.legalEntityId,signal})};
 // Reuse already authenticated route inputs; independent remaining reads run concurrently.
 const [bank,primary,cardSource,incremental]=await Promise.all([bankSnapshot||load(env.RMS_EQAIME_BANK_SOURCE,20000000),primarySnapshot||load(env.RMS_EQAIME_PRIMARY_SOURCE),env.RMS_EQAIME_CARD_SOURCE?load(env.RMS_EQAIME_CARD_SOURCE,100000):null,env.RMS_EQAIME_INCREMENTAL_SOURCE?load(env.RMS_EQAIME_INCREMENTAL_SOURCE,100000):null]);
 projectBank(bank,scope.legalEntityId);
 if(cardSource){const group=groups.find(g=>g.supplierKey===cardSource.supplierKey);if(!group)throw Error('Card supplier');pilot=cardSource.supplierKey;const card=projectCard(cardSource,{entityId:scope.legalEntityId,balanceSha256:JSON.parse(env.RMS_EQAIME_BALANCE_SOURCE).sha256,group,allPaymentIds:groups.flatMap(g=>g.payments.map(p=>p.id))});groups=groups.map(g=>g!==group?g:{...g,payments:[...g.payments,...card.additionalPayments.map(p=>({id:p.id,date:p.date,amount:p.amount,recipientName:p.recipientName,electronicInvoiceNumbers:[p.invoiceNumber],verifiedInvoiceNumber:null,supplementary:true,sourceLabel:p.sourceLabel,bankRecipientName:p.recipientName}))]})}
 const rows=projectPrimary(primary,scope.legalEntityId),historical=checkedHistoricalEvidence(primary),primaryNumbers=new Set(rows.map(r=>r.invoiceNumber));
 if(rows.length!==groups.reduce((n,g)=>n+g.invoices.length,0)||groups.some(g=>g.invoices.some(i=>!primaryNumbers.has(i.invoiceNumber))))throw Error('Primary coverage changed');
 const unresolved=new Set(rows.filter(r=>{const e=historical?.byInvoice[r.invoiceNumber];return e&&(e.kind!=='single'||e.identityVerified!==true||e.referencesVerified!==true)}).map(r=>r.invoiceNumber));
 groups=groups.map(g=>({...g,invoices:g.invoices.map(i=>g.supplierKey!==pilot&&unresolved.has(i.invoiceNumber)?{...i,priorUnresolvedPaymentEvidence:true}:i)}));
 groups=applyReferenceEvidence(groups,bank);
 if(incremental){const sourceHashes=Object.fromEntries(['PRIMARY','BANK','BALANCE','CARD'].map(name=>{const raw=env['RMS_EQAIME_'+name+'_SOURCE'];if(!raw)throw Error('Missing baseline source');return [name.toLowerCase(),JSON.parse(raw).sha256]}));groups=appendIncremental(groups,incremental,{entityId:scope.legalEntityId,sourceHashes})}
 groups=applyApprovedReferenceCompletion(groups,bank,rows,env,scope);
 groups=applyApprovedReallocation(groups,bank,rows,env,scope);
 return reconcileReferences(applyApprovedStandaloneCompletion(groups,bank,rows,env,scope),rows);
}

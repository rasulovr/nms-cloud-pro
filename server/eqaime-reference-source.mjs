import {projectBalances} from './eqaime-balances.mjs';
import {projectCard} from './eqaime-card.mjs';
import {privateSourceLoader} from './eqaime-primary-source.mjs';
import {reconcileReferences} from './eqaime-exact-reference.mjs';
export async function referenceGroups(snapshot,{client,env,scope,signal}){
 let pilot=null;let groups=projectBalances(snapshot,scope.legalEntityId);
 if(env.VERCEL_ENV!=='preview')return groups;
 if(env.RMS_EQAIME_CARD_SOURCE){const loader=privateSourceLoader(client,env.RMS_EQAIME_CARD_SOURCE,scope,{maxSourceBytes:100000});if(!loader)throw Error('Card');const s=await loader({entityId:scope.legalEntityId,signal});const group=groups.find(g=>g.supplierKey===s.supplierKey);if(!group)throw Error('Card supplier');pilot=s.supplierKey;const card=projectCard(s,{entityId:scope.legalEntityId,balanceSha256:JSON.parse(env.RMS_EQAIME_BALANCE_SOURCE).sha256,group,allPaymentIds:groups.flatMap(g=>g.payments.map(p=>p.id))});groups=groups.map(g=>g!==group?g:{...g,payments:[...g.payments,...card.additionalPayments.map(p=>({id:p.id,date:p.date,amount:p.amount,recipientName:p.recipientName,electronicInvoiceNumbers:[p.invoiceNumber],verifiedInvoiceNumber:null,supplementary:true,sourceLabel:p.sourceLabel,bankRecipientName:p.recipientName}))]})}
 return groups.map(g=>g.supplierKey===pilot?reconcileReferences([g])[0]:g);
}

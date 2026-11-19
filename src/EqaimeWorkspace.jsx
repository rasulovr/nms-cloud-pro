import {unpackPrimaryStatuses} from './eqaime-wire.mjs';
import './eqaime-reconciliation.css';
import React,{useEffect,useState} from 'react';
import PrimaryRegister from './EqaimePrimaryRegister.jsx';
import BankPayments from './EqaimeBankPayments.jsx';
import EqaimeBalances from './EqaimeBalances.jsx';
import {loadEqaimeRegister} from './eqaime-register.mjs';
const LocalImport=__RMS_PREVIEW_IDENTITY_ENABLED__?React.lazy(()=>import('./EqaimeLocalImport.jsx')):null;
function validatePrimary(report){
 report=unpackPrimaryStatuses(report);
 if(!['connected','not_connected'].includes(report.primarySourceStatus)||!Array.isArray(report.primaryRows))throw Error('Некорректный источник первички');
 const ids=new Set();for(const r of report.primaryRows){if(!r.id||ids.has(r.id)||typeof r.primaryAmount!=='string'||!/^\d+(\.\d+)?$/.test(r.primaryAmount)||r.confirmedDebt!==null||typeof r.sourceReviewRequired!=='boolean'||!Array.isArray(r.reviewReasons)||r.sourceReviewRequired!==(r.reviewReasons.length>0)||(r.receiptDate!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.receiptDate)||r.receiptDateStatus!=='verified')))throw Error('Некорректный документ первички');ids.add(r.id)}
 if(report.primarySourceStatus==='not_connected'&&report.primaryRows.length)throw Error('Не подтверждён источник');return report;
}
export default function EqaimeWorkspace({client,loadReport=loadEqaimeRegister}){
 const [state,setState]=useState({loading:true,data:null,error:''}),[tab,setTab]=useState('primary'),[entityChoice,setEntityChoice]=useState('all'),[authRevision,setAuthRevision]=useState(0);
 useEffect(()=>{const sub=client.auth.onAuthStateChange?.((event)=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)){setTab('primary');setState({loading:true,data:null,error:''});setAuthRevision(n=>n+1)}});return()=>sub?.data?.subscription?.unsubscribe()},[client]);
 useEffect(()=>{let active=true;const c=new AbortController();setState({loading:true,data:null,error:''});Promise.resolve().then(()=>loadReport(client,{signal:c.signal})).then(validatePrimary).then(data=>{if(active)setState({loading:false,data,error:''})}).catch(e=>{if(active)setState({loading:false,data:null,error:e.message})});return()=>{active=false;c.abort()}},[client,loadReport,authRevision]);

 return <><label className="eqaime-entity-choice">VÖEN<select value={entityChoice} onChange={e=>setEntityChoice(e.target.value)}><option value="all">Все доступные VÖEN (1)</option><option value="current">Подключённый VÖEN</option></select></label><nav aria-label="Источники реестра"><button aria-pressed={tab==='primary'} onClick={()=>setTab('primary')}>E-qaimə из портала</button><button aria-pressed={tab==='bank'} onClick={()=>setTab('bank')}>Банковские оплаты</button><button aria-pressed={tab==='balances'} onClick={()=>setTab('balances')}>Остаток по долгу</button>{LocalImport&&!state.loading&&!state.error&&state.data?.primarySourceStatus==='connected'&&<button aria-pressed={tab==='import'} onClick={()=>setTab('import')}>Импорт и сверка</button>}</nav>
 {tab==='import'&&LocalImport&&!state.loading&&!state.error&&state.data?.primarySourceStatus==='connected'?<React.Suspense fallback={<p>Открытие локального импорта…</p>}><LocalImport client={client}/></React.Suspense>:tab==='balances'?<EqaimeBalances client={client}/>:tab==='bank'?<BankPayments client={client}/>:<>{state.loading&&<p role="status">Загрузка e-qaimə…</p>}{state.error&&<p role="alert">{state.error}. Частичный результат не показан.</p>}{!state.loading&&!state.error&&state.data&&(state.data.primarySourceStatus==='connected'?<PrimaryRegister rows={state.data.primaryRows} supplierOptions={state.data.supplierOptions||[]}/>:<p role="status">Защищённый источник первичных e-qaimə пока не подключён. Суммы внутренних карточек вместо первички не подставляются.</p>)}</>}</>
}

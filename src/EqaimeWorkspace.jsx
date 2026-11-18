import './eqaime-reconciliation.css';
import React,{useEffect,useState,useRef} from 'react';
import PrimaryRegister from './EqaimePrimaryRegister.jsx';
import BankPayments from './EqaimeBankPayments.jsx';
import {loadEqaimeRegister} from './eqaime-register.mjs';
function validatePrimary(report){
 if(!['connected','not_connected'].includes(report.primarySourceStatus)||!Array.isArray(report.primaryRows))throw Error('Некорректный источник первички');
 const ids=new Set();for(const r of report.primaryRows){if(!r.id||ids.has(r.id)||typeof r.primaryAmount!=='string'||!/^\d+(\.\d+)?$/.test(r.primaryAmount)||r.confirmedDebt!==null||typeof r.sourceReviewRequired!=='boolean'||!Array.isArray(r.reviewReasons)||r.sourceReviewRequired!==(r.reviewReasons.length>0)||(r.receiptDate!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.receiptDate)||r.receiptDateStatus!=='verified')))throw Error('Некорректный документ первички');ids.add(r.id)}
 if(report.primarySourceStatus==='not_connected'&&report.primaryRows.length)throw Error('Не подтверждён источник');return report;
}
export default function EqaimeWorkspace({client,loadReport=loadEqaimeRegister}){
 const canaryRoot=useRef(null),identityRoot=useRef(null);
 useEffect(()=>{if(__RMS_PREVIEW_IDENTITY_ENABLED__){let active=true,cleanup=()=>{};import('./preview/identity-check.mjs').then(m=>{if(active)cleanup=m.mountIdentityCheck(identityRoot.current,{client})}).catch(()=>{});return()=>{active=false;cleanup()}}},[client]);
 useEffect(()=>{if(__RMS_READ_CANARY_ENABLED__){let active=true,cleanup=()=>{};import('./preview/read-canary-entry.mjs').then(m=>m.mountOwnerReadCanary(canaryRoot.current,{ownerClient:client,ownerDigest:__RMS_CANARY_OWNER_DIGEST__,isActive:()=>active})).then(fn=>{if(active)cleanup=fn;else fn()}).catch(()=>{});return()=>{active=false;cleanup()}}},[client]);
 const [state,setState]=useState({loading:true,data:null,error:''}),[revision,setRevision]=useState(0),[tab,setTab]=useState('primary');
 useEffect(()=>{let active=true;const c=new AbortController();setState({loading:true,data:null,error:''});Promise.resolve().then(()=>loadReport(client,{signal:c.signal})).then(validatePrimary).then(data=>{if(active)setState({loading:false,data,error:''})}).catch(e=>{if(active)setState({loading:false,data:null,error:e.message})});return()=>{active=false;c.abort()}},[client,loadReport,revision]);

 return <>{__RMS_PREVIEW_IDENTITY_ENABLED__&&<aside ref={identityRoot} aria-label="Preview: проверка связи владельца"/>}{__RMS_READ_CANARY_ENABLED__&&<aside ref={canaryRoot} aria-label="Preview: проверка доступа к вымышленному файлу"/>}<button disabled={tab==='primary'&&state.loading} onClick={()=>setRevision(x=>x+1)}>Обновить все источники</button><nav aria-label="Источники реестра"><button aria-pressed={tab==='primary'} onClick={()=>setTab('primary')}>E-qaimə из портала</button><button aria-pressed={tab==='bank'} onClick={()=>setTab('bank')}>Банковские оплаты</button></nav>
 {tab==='bank'?<BankPayments client={client} revision={revision}/>:<>{state.loading&&<p role="status">Загрузка e-qaimə…</p>}{state.error&&<p role="alert">{state.error}. Частичный результат не показан.</p>}{!state.loading&&!state.error&&state.data&&(state.data.primarySourceStatus==='connected'?<PrimaryRegister rows={state.data.primaryRows}/>:<p role="status">Защищённый источник первичных e-qaimə пока не подключён. Суммы внутренних карточек вместо первички не подставляются.</p>)}</>}</>
}

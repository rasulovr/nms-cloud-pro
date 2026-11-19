import React from 'react';
import {balanceKpis,balanceTone} from './eqaime-balance-kpis.mjs';
import {debtDifference,differenceLabel} from './eqaime-totals.mjs';
import './eqaime-balance-kpis.css';
export const formatBalance=v=>{if(v==null)return 'Не рассчитано';const [whole,fraction]=String(v).split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,' ')+(fraction!=null?','+fraction:'')};
export function BalanceBadge({group}){const value=group.bankScopeAvailable?debtDifference(group.observedDifference):null;return <span className={'balance-badge balance-'+balanceTone(group)}><strong>{formatBalance(value)}{value!=null?' AZN':''}</strong>{value!=null&&<span>{differenceLabel(value)}</span>}</span>}
export default function BalanceKpis({groups,single=false}){
 const k=balanceKpis(groups),g=single?groups[0]:null;
 return <div className="balance-overview"><div className="balance-kpis" aria-label="Итоги по выбранным контрагентам">
 <section className="balance-kpi"><span>Сумма e-qaimə</span><strong>{formatBalance(k.invoiceAmount)}{k.invoiceAmount!=null&&<small> AZN</small>}</strong><p>{groups.length>0?`${k.invoiceCount} накладных · учитываемая сумма`:"Нет контрагентов по фильтру"}{ k.reviewCount>0?`; спорных вне суммы: ${k.reviewCount}`:''}</p></section>
 <section className="balance-kpi"><span>Банковские оплаты</span><strong>{formatBalance(k.paymentAmount)}{k.paymentAmount!=null&&<small> AZN</small>}</strong><p>Фактические переводы в выборке, не только зачтённые</p></section>
 <section className={'balance-kpi balance-kpi-result '+(g?'balance-'+balanceTone(g):k.grossDebt==null?'balance-unknown':k.grossDebt==='0.00'?'balance-zero':'balance-debt')}><span>Остаток по долгу</span>{g?<BalanceBadge group={g}/>:<><strong>{formatBalance(k.grossDebt)}{k.grossDebt!=null&&<small> AZN</small>}</strong><p>Сумма долгов по рассчитанным контрагентам, без взаимозачёта переплат</p></>}{!g&&k.overpayment!=null&&<p>Переплаты отдельно: {formatBalance(k.overpayment)} AZN</p>}</section>
 </div><p className="balance-kpi-scope">Предварительный расчёт, не подтверждённый долг.{k.unknownCount>0&&` Не рассчитано у ${k.unknownCount} из ${groups.length} контрагентов: неполные сведения.`} Начальное сальдо и полнота расчётов не подтверждены.</p></div>
}

import {operationalMetrics} from './profitability-metrics.mjs'
import {buildProfitabilitySummary} from './profitability-summary.mjs'
export const PROFIT_UNAVAILABLE = 'Расчёт недоступен'
export function formatVerifiedProfit(value, formatter) {
  return typeof value==='number' && Number.isFinite(value) ? formatter(value) : PROFIT_UNAVAILABLE
}
export function profitReasonText(reason) {
  const labels={
    'missing-recorded-payroll':'За месяц нет записанных начислений зарплаты; оценка по текущим окладам не добавлена.',
    'verification-read-error':'Результат рассчитан; сведения о сверке источников не удалось загрузить.',
    'operational-calculation-error':'Расчёт остановлен из-за ошибки суммы или базы распределения.',
    'loading-profitability-sources':'Загружаются данные выбранного месяца.',
    'profitability-source-read-error':'Не удалось полностью прочитать источники. Расчёт недоступен до успешной загрузки.',
    'missing-profitability-source-state':'Источники расчёта ещё не загружены.',
    'missing-coverage-manifest':'Полнота источников этого месяца ещё не подтверждена.',
    'stale-or-invalid-coverage-manifest':'Данные месяца изменились после сверки; подтверждение нужно обновить.',
    'changed-target-inputs':'Часть исходных записей изменилась; прежние корректировки нельзя считать подтверждёнными.',
    'stale-or-invalid-bank-evidence':'Банковская база изменилась после сверки; комиссия требует повторной проверки.',
    'missing-bank-basis':'Не подтверждено, включена ли комиссия в банковскую выручку.',
    'incomplete-network-allocation-basis':'Не полностью подтверждена база распределения общих расходов между филиалами.',
    'missing-network-allocation-basis':'Независимая сверка базы распределения общих расходов не завершена.',
    'partial-reporting-month':'Месяц ещё не завершён: показаны только загруженные данные.',
    'unsafe-provisional-calculation':'Невозможно получить достоверный расчёт даже предварительно: проверьте суммы и базу распределения.',
    'missing-revenue-observations':'Нет записей выручки за выбранный период; отсутствие данных не считается нулём.',
    'missing-payroll-accruals':'Нет начислений зарплаты за месяц.',
    'invalid-payroll-accrual':'Некорректная сумма начисленной зарплаты.',
    'unresolved-payroll-identity':'Не установлено соответствие сотрудника в начислении.',
    'duplicate-payroll-accrual':'Есть повторные начисления сотрудника за один месяц.',
    'invalid-service-accrual':'Некорректная сумма начисления service charge.',
    'duplicate-service-accrual':'Есть повторные начисления service charge.',
    'missing-service-accrual':'Не загружено начисление service charge.',
    'procurement_accounting_not_verified_inventory_consumption':'Закупки учтены по поступлениям; расход по фактическому потреблению не подтверждён.',
    'source_bistro_rent_accrual_3500_not_cash_verified':'Для Bistro не подтверждена оплата аренды 3 500 AZN.',
    'source_extras_900_purpose_unconfirmed':'Не уточнено назначение дополнительных 900 AZN.',
    'source_crescent_rent_extra_5000_purpose_unconfirmed':'Не уточнено назначение дополнительных 5 000 AZN по аренде Crescent.',
    'source_taxi_update_not_yet_applied':'Изменение данных о такси ещё не сверено.',
    'wolt_bc2_days_1_4_source_unconfirmed':'Не подтверждена выручка Wolt BC2 за 1–4 сентября.',
    'legacy-period-allocation':'Расчёт использует принятую методику выбранного периода; окончательная полнота не подтверждена.'
  }
  if(labels[reason])return labels[reason]
  if(/accounting.*payments/.test(reason))return 'Не сверены периоды начисления и оплаты бухгалтерских услуг.'
  if(/iiko|prior_period_rent/.test(reason))return 'Не сверены периоды начисления и оплаты аренды или iiko.'
  if(/household/.test(reason))return 'Требуется сверить суммы и соответствие записей хозтоваров.'
  if(/supplier|bazar|procurement/.test(reason))return 'Не завершена сверка закупок и Базара с первичными источниками.'
  if(/salary|payroll|accrual/.test(reason))return 'Начисления зарплаты или их соответствие первичным источникам требуют сверки.'
  if(/bank/.test(reason))return 'Требуется проверить банковскую комиссию и возможное повторное включение в расходы.'
  if(/expected|unreviewed|required/.test(reason))return 'Состав или суммы источников не совпадают с проверенным реестром.'
  return 'Есть неразрешённое расхождение в первичных источниках.'
}
export function profitStatusText(profit,metric='net') {
  if(profit.mode==='october-dashboard')return metric==='margin'?'Маржа':'Прибыль'
  if(!profit.available)return metric==='margin'?'Маржа: расчёт недоступен':'Прибыль: расчёт недоступен'
  if(profit.verified)return metric==='margin'?'Подтверждённая маржа':'Подтверждённая прибыль'
  if(profit.basis==='before-unverified-bank-commission')return metric==='margin'?'Предварительная маржа до комиссии':'Предварительный результат до комиссии'
  return metric==='margin'?'Предварительная маржа':'Предварительная прибыль'
}
export function profitabilitySurface(report,now=new Date()) {
  const blocked={available:false,verified:false,preliminary:false,net:null,margin:null,branches:[],reasons:[]}
  if (!report || report.loading) return {...blocked,reasons:['loading-profitability-sources']}
  if (report.error) return {...blocked,reasons:['profitability-source-read-error']}
  if (!report.summaryInputs?.period || !Array.isArray(report.summaryInputs.coverageIssues)) return {...blocked,reasons:['missing-profitability-source-state']}
  if(report.operational?.error)return {...blocked,error:report.operational.error,reasons:['operational-calculation-error']}
  if(report.operational?.model){
    const model=buildProfitabilitySummary(report)
    const project=(p,issues)=>({mode:'october-dashboard',available:p.profitAvailable,verified:false,preliminary:false,net:p.profitAvailable?p.net:null,margin:p.profitAvailable&&p.revenue>0?p.net/p.revenue*100:null,revenue:p.revenue,expenses:p.expenses,basis:'october-dashboard',reasons:[...new Set(issues.map(i=>i.reason||i.code).filter(Boolean))]})
    return {...operationalMetrics(model),...project(model.total,model.total.coverageIssues),branches:model.branches.map(b=>({id:b.id,name:b.name,...operationalMetrics(model,b.id),...project(b.period,b.period.coverageIssues)}))}
  }
  const model=buildProfitabilitySummary(report),period=report.summaryInputs.period
  const issues=report.summaryInputs.coverageIssues
  const partial=period.toExclusive>now.toISOString().slice(0,10)
  const project=(p,candidate,reasons)=>{
    const sourcesUsable=!report.provisional || (report.provisional.sourceComplete && report.provisional.allocationComplete)
    const canonical=sourcesUsable && p.profitAvailable===true && Number.isFinite(p.net)
    const available=canonical || (sourcesUsable && !p.operatingExcluded && !p.hasClosedPeriods && !model.mixedBasisBlocksTotals && model.reconciled && candidate?.available===true && Number.isFinite(candidate.net))
    const verified=canonical && reasons.length===0 && !partial
    const net=canonical?p.net:available?candidate.net:null
    const revenue=canonical?p.revenue:candidate?.revenue
    return {available,verified,preliminary:available&&!verified,net,verifiedNet:verified?net:null,margin:available&&revenue>0?net/revenue*100:null,
      revenue,expenses:canonical?p.expenses:candidate?.expenses,basis:canonical?'recorded-components':candidate?.basis,
      reasons:[...new Set([...reasons,...(partial?['partial-reporting-month']:[]),...(!available?['unsafe-provisional-calculation']:[])])]}
  }
  const reasons=issues.map(i=>i.reason||i.code).filter(Boolean)
  return {...project(model.total,report.provisional,reasons),branches:model.branches.map(b=>({id:b.id,name:b.name,...project(b.period,report.provisional?.branches.find(r=>String(r.id)===String(b.id)),issues.filter(i=>!i.branchId||String(i.branchId)===String(b.id)).map(i=>i.reason||i.code).filter(Boolean))}))}
}
export function profitabilityTrend(current,previous) {
  // Do not compare an attested result with a provisional result as if equivalent.
  if (!(current?.mode==='october-dashboard'&&previous?.mode==='october-dashboard'&&current.available&&previous.available) && (!current?.verified || !previous?.verified)) return {delta:null,percent:null}
  return {delta:current.net-previous.net,percent:previous.net!==0?(current.net-previous.net)/Math.abs(previous.net)*100:null}
}

export function profitBasisText(profit,formatter=String) {
  if(profit.error)return profit.error
  if(!profit.available)return 'Расчёт недоступен: источники или база распределения требуют проверки.'
  if(profit.mode==='october-dashboard')return `Выручка после банковской комиссии ${formatter(profit.revenue)} − расходы ${formatter(profit.expenses)} AZN. Зарплата по начислениям; закупки и менеджмент распределены по месячной доле выручки после комиссии.`
  return `База расчёта: выручка ${formatter(profit.revenue)} − учтённые расходы ${formatter(profit.expenses)} AZN.` + (profit.basis==='before-unverified-bank-commission'?' Неподтверждённая часть банковской комиссии не вычтена. Это результат до комиссии, а не окончательная прибыль.':'')
}
export function profitDisclosureText(profit,formatter=String) {
  return [profit.available?profitStatusText(profit):'Расчёт недоступен',profitBasisText(profit,formatter),...new Set(profit.reasons.map(profitReasonText))].join(' ')
}

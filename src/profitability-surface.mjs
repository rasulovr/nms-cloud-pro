import {buildProfitabilitySummary} from './profitability-summary.mjs'
export const PROFIT_UNAVAILABLE = 'Недостаточно данных'
export function formatVerifiedProfit(value, formatter) {
  return typeof value==='number' && Number.isFinite(value) ? formatter(value) : PROFIT_UNAVAILABLE
}
export function profitabilitySurface(report) {
  const blocked={available:false,net:null,margin:null,branches:[],reasons:[]}
  if (!report || report.loading) return {...blocked,reasons:['loading-profitability-sources']}
  if (report.error) return {...blocked,reasons:['profitability-source-read-error'],error:report.error}
  if (!report.summaryInputs?.period || !Array.isArray(report.summaryInputs.coverageIssues)) return {...blocked,reasons:['missing-profitability-source-state']}
  const model=buildProfitabilitySummary(report)
  const project=p=>({available:p.profitAvailable===true && Number.isFinite(p.net),net:p.profitAvailable===true && Number.isFinite(p.net)?p.net:null,margin:p.profitAvailable===true && Number.isFinite(p.net) && p.revenue>0?p.net/p.revenue*100:null})
  return {...project(model.total),branches:model.branches.map(b=>({id:b.id,name:b.name,...project(b.period)})),reasons:[...new Set((report.summaryInputs?.coverageIssues||[]).map(i=>i.reason).filter(Boolean))]}
}
export function profitabilityTrend(current,previous) {
  if (!current?.available || !previous?.available) return {delta:null,percent:null}
  return {delta:current.net-previous.net,percent:previous.net!==0?(current.net-previous.net)/Math.abs(previous.net)*100:null}
}

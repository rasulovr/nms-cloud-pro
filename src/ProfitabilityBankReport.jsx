import React, { useEffect, useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BANK_BRANCH_IDS, buildBankReport, groupBankExpenses } from './profitability-bank.mjs'
import { manualPeriod, periodMonths } from './profitability-period.mjs'
import './profitability-bank.css'
import bankPrintStyles from './profitability-bank.css?raw'
const money = value => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
const percent = value => value == null ? '—' : `${money(value)}%`
function Trend({ rows }) {
  const values = rows.flatMap(row => [row.revenue, row.expenses, row.net])
  const min = Math.min(0, ...values), max = Math.max(1, ...values), range = max - min
  const y = value => 150 - (value - min) / range * 125
  const x = index => 55 + index * 650 / Math.max(1, rows.length - 1)
  return <div className="bank-chart"><svg viewBox="0 0 760 190" role="img" aria-label="Помесячная выручка, расходы и расчётный результат в AZN">
    {[min, (max + min) / 2, max].map((value, i) => <g key={i}><line x1="55" x2="705" y1={y(value)} y2={y(value)} stroke="#dbe3ee"/><text x="50" y={y(value) + 4} textAnchor="end" fontSize="9" fill="#52627a">{Math.round(value).toLocaleString('ru-RU')}</text></g>)}
    <line x1="55" x2="705" y1={y(0)} y2={y(0)} stroke="#8090a3" strokeDasharray="4 3"/>
    {[['revenue', '#2563eb'], ['expenses', '#d97706'], ['net', '#15803d']].map(([key, color]) => <g key={key}><polyline fill="none" stroke={color} strokeWidth="2.5" points={rows.map((row, index) => `${x(index)},${y(row[key])}`).join(' ')}/>{rows.map((row, index) => <circle key={index} cx={x(index)} cy={y(row[key])} r="3" fill={color}/>)}</g>)}
    {rows.map((row, index) => <text key={row.month} x={x(index)} y="174" textAnchor="middle" fontSize="9" fill="#52627a">{row.month.slice(5)}.{row.month.slice(2, 4)}</text>)}
  </svg><div className="bank-legend"><span style={{color:'#2563eb'}}>● Выручка</span><span style={{color:'#d97706'}}>● Расходы</span><span style={{color:'#15803d'}}>● Расчётный результат</span><span>AZN</span></div></div>
}
function ExpenseTable({ section, months, external = false }) {
  const grouped = groupBankExpenses(section)
  return <><div className="bank-table-scroll"><table className="bank-expense-table"><caption>Расходы по статьям, AZN · суммы входят в итог один раз</caption><thead><tr><th>Статья</th>{months.map(month => <th key={month}>{month.slice(5)}.{month.slice(2,4)}</th>)}<th>Итого</th></tr></thead><tbody>{grouped.groups.map(category => <tr key={category.key}><th>{category.name}</th>{grouped.monthly.map(row => <td key={row.month}>{row.hasData[category.key] ? money(row.categories[category.key]) : '—'}</td>)}<td>{category.sources.length ? money(category.amount) : '—'}</td></tr>)}<tr className="bank-total"><th>Все расходы</th>{section.monthly.map(row => <td key={row.month}>{money(row.expenses)}</td>)}<td>{money(section.totals.expenses)}</td></tr></tbody></table></div><p className="bank-meta">«—» — нет отдельно выделенных данных.</p>{!external && <p className="bank-meta">Прочие: {grouped.groups.find(group => group.key === 'other').sources.filter(source => source.amount !== 0).map(source => `${source.name} — ${money(source.amount)} AZN`).join('; ') || 'нет учтённых сумм'}.</p>}</>
}
function Section({ section, months, external = false }) {
  return <section className="bank-report-section"><h2>{section.name}</h2><div className="bank-kpis"><div>Выручка<strong>{money(section.totals.revenue)} AZN</strong></div><div>Расходы<strong>{money(section.totals.expenses)} AZN</strong></div><div>Прибыль · расчётный результат<strong>{money(section.totals.net)} AZN</strong></div><div>Расчётная маржа<strong>{percent(section.totals.margin)}</strong></div></div>
    {section.id !== 'combined' && <p className="bank-meta">Доля филиала в выручке всей сети за период: {percent(section.share)} · Налог: {percent(section.taxRate)}</p>}
    <Trend rows={section.monthly}/>
    <div className="bank-table-scroll"><table><caption>Помесячные итоги, AZN</caption><thead><tr><th>Месяц</th><th>Выручка</th><th>Расходы</th><th>Расчётный результат</th><th>Маржа</th>{!external && section.id !== 'combined' && <><th>Дней выручки</th><th>Строк начислений¹</th></>}</tr></thead><tbody>{section.monthly.map(row => <tr key={row.month}><th>{row.month}</th><td>{money(row.revenue)}</td><td>{money(row.expenses)}</td><td>{money(row.net)}</td><td>{percent(row.margin)}</td>{!external && section.id !== 'combined' && <><td>{row.revenueDays}</td><td>{row.sheetSource ? 'Sheets' : row.salaryRows}</td></>}</tr>)}</tbody></table></div>
    {!external && <p className="bank-meta">¹ Число записей RMS с привязкой к филиалу не подтверждает полноту. «Sheets» означает замену итогом соответствующего месяца из загруженного источника.</p>}
    {!external && <div className="bank-table-scroll"><table><caption>Состав выручки до комиссий, AZN</caption><thead><tr><th>Месяц</th><th>Cash</th><th>Bank</th><th>Wolt</th><th>Итого</th></tr></thead><tbody>{section.monthly.map(row => <tr key={row.month}><th>{row.month}</th><td>{money(row.cash)}</td><td>{money(row.bank)}</td><td>{money(row.wolt)}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div>}
    <ExpenseTable section={section} months={months} external={external}/>
    {!external && !!section.warnings?.length && <div className="bank-warnings"><h3>Покрытие и пропуски</h3><ul>{section.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div>}
    {external && <ExternalCoverage section={section}/>}
  </section>
}
export function BankDocument({ model }) {
  return <ExternalBankDocument model={model}/>
}
// External output is allowlisted, not a CSS-hidden copy of the internal audit.
function ExternalCoverage({ section }) {
  const gaps = section.monthly.filter(row => row.revenueDays != null && row.revenueDays < new Date(Date.UTC(Number(row.month.slice(0,4)), Number(row.month.slice(5)), 0)).getUTCDate())
  const missingPayroll = section.monthly.filter(row => !row.salaryRows && !row.sheetSource)
  if (section.id === 'combined' || (!gaps.length && !missingPayroll.length && !section.warnings?.length)) return null
  return <div className="bank-warnings"><h3>Ограничения данных</h3>
    {!!gaps.length && <p>Дни с записями выручки: {gaps.map(row => `${row.month}: ${row.revenueDays}`).join('; ')}. За остальные дни полнота выручки не подтверждена.</p>}
    {!!missingPayroll.length && <p>Полнота начислений зарплаты не подтверждена за {missingPayroll.map(row => row.month).join(', ')}.</p>}
  </div>
}
export function ExternalBankDocument({ model }) {
  // Only public branch labels enter the external document, never free-form metadata.
  const branches = model.branches.map((branch, index) => ({ ...branch,
    name: branch.id === BANK_BRANCH_IDS[0] ? 'BC4' : branch.id === BANK_BRANCH_IDS[1] ? 'Crescent' : `Выбранный филиал ${index + 1}` }))
  const combined = { ...model.combined, name: 'Совокупно: ' + branches.map(branch => branch.name).join(' + ') }
  return <article className="bank-document bank-external-document"><header><p className="bank-eyebrow">RMS PRO · УПРАВЛЕНЧЕСКИЙ ОТЧЁТ</p><h1>Рентабельность филиалов</h1>
    <p>{model.period.from} — {new Date(Date.parse(`${model.period.toExclusive}T00:00:00Z`) - 86400000).toISOString().slice(0,10)} · AZN</p>
    </header>
    {!model.exportable && <p className="bank-meta" role="status">PDF недоступен: {model.reconciled ? 'есть недостающие данные за выбранный период.' : 'итоги не прошли сверку.'}</p>}
    <Section section={combined} months={model.months} external/>{branches.map(branch => <Section key={branch.id} section={branch} months={model.months} external/>)}
    {model.payrollEstimated && <p className="bank-meta">Зарплата включает расчётную оценку.</p>}

  </article>
}
const MONTH_LABELS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
function MonthPicker({ label, value, onChange, years }) {
  const [year, month] = value.split('-')
  return <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'end'}}>
    <label>{label}: год<select style={{minWidth:100,width:"auto"}} aria-label={`${label}: год`} value={year} onChange={event => onChange(`${event.target.value}-${month || '01'}`)}>{years.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <label>Месяц<select style={{minWidth:140,width:"auto"}} aria-label={`${label}: месяц`} value={month} onChange={event => onChange(`${year}-${event.target.value}`)}>{MONTH_LABELS.map((name,index) => <option key={name} value={String(index+1).padStart(2,'0')}>{name}</option>)}</select></label>
  </div>
}
export function printBankDocument(model) {
  if (!model?.exportable) return 'Сначала загрузите отчёт, проверьте сверку итогов и полноту исходных данных.'
  const popup = window.open('', '_blank')
  if (!popup) return 'Браузер заблокировал окно печати. Разрешите всплывающие окна для RMS Pro и повторите.'
  const styles = `<style>${bankPrintStyles}</style>`
  popup.document.open()
  popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>RMS Pro — Рентабельность ${model.period.from}</title>${styles}</head><body class="bank-print-body">${renderToStaticMarkup(<ExternalBankDocument model={model}/>)}</body></html>`)
  popup.onload = async () => {
    try { await popup.document.fonts.ready; popup.focus(); popup.print() }
    catch { /* The complete printable report remains open for the browser's Print command. */ }
  }
  popup.document.close()
  // Stylesheets and fonts must finish before opening the native PDF/print dialog.
  return ''
}
export default function ProfitabilityBankReport({ report, branches, onPeriodChange, periodKey, availableYears = [] }) {
  const [selected, setSelected] = useState(BANK_BRANCH_IDS)
  const initial = periodMonths(report.period)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  useEffect(() => {
    if (!report.period || report.error) return
    const next = periodMonths(report.period)
    setStart(next.start); setEnd(next.end)
  }, [report.period?.from, report.period?.toExclusive])
  const chosenPeriod = manualPeriod(start, end)
  const yearNow = new Date().getFullYear()
  const years = Array.from(new Set([yearNow - 3, yearNow - 2, yearNow - 1, yearNow, yearNow + 1, ...availableYears.map(Number), Number(start.slice(0,4)), Number(end.slice(0,4)), ...(report.bankInputs?.revenueRows || []).map(row => Number(String(row.revenue_date).slice(0,4)))]))
    .filter(year => year >= 2000 && year <= 2100).sort((a,b) => b-a)
  const stale = report.periodKey !== periodKey
  const applyPeriod = () => {
    if (!chosenPeriod || report.loading) return
    setError('')
    onPeriodChange(chosenPeriod.key)
  }
  const [error, setError] = useState('')
  const model = useMemo(() => buildBankReport(report, selected), [report, selected])
  const exportReport = () => setError(printBankDocument(report.loading || report.error || report.periodKey !== periodKey ? null : model))
  return <section className="bank-workspace"><div className="bank-controls"><div><h2>Управленческий отчёт</h2><p>По выбранным филиалам и совокупно · помесячно · AZN</p></div>
    <div className="bank-control-row">
      <MonthPicker label="Начало" value={start} onChange={setStart} years={years}/>
      <MonthPicker label="Конец" value={end} onChange={setEnd} years={years}/>
      <button type="button" disabled={!chosenPeriod || report.loading} onClick={applyPeriod}>Применить период</button>
      <button id="profitability-bank-export" type="button" disabled={report.loading || !!report.error || stale || !model?.exportable} onClick={exportReport}>PDF / печать</button>
    </div>
    {!chosenPeriod && <p role="alert">Укажите начальный и конечный месяц. Конец периода должен быть не раньше начала.</p>}
    <fieldset><legend>Филиалы отчёта</legend>{branches.map(branch => <label key={branch.id}><input type="checkbox" checked={selected.includes(String(branch.id))} onChange={event => setSelected(current => event.target.checked ? [...current, String(branch.id)] : current.filter(id => id !== String(branch.id)))}/>{branch.name}</label>)}</fieldset>
    <p className="bank-meta">Полные календарные месяцы, включая начальный и конечный.</p></div>
    {error && <p role="alert" className="bank-disclosure">{error}</p>}
    {report.error && !report.loading ? <p role="alert">Отчёт не сформирован: {report.error}. Повторите загрузку кнопкой «Применить период».</p> : report.loading || stale ? <p role="status">Загружаю расчёт…</p> : model ? <BankDocument model={model}/> : <p>Выберите филиалы и период.</p>}
  </section>
}

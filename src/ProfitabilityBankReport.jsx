import {MONTHLY_COLUMNS,monthlyViewRows,monthlyText,monthlyLabel} from './report-monthly-view.mjs'
import React, { useEffect, useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BANK_BRANCH_IDS, buildBankReport, groupBankExpenses } from './profitability-bank.mjs'
import { manualPeriod, periodMonths } from './profitability-period.mjs'
import './profitability-bank.css'
import bankPrintStyles from './profitability-bank.css?raw'
const currentReportLanguage = () => { try { return localStorage.getItem('rms_lang') || localStorage.getItem('nms_lang') || 'ru' } catch { return 'ru' } }
const money = value => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
const percent = value => value == null ? '—' : `${money(value)}%`
function Trend({ rows }) {
  const values = rows.flatMap(row => [row.revenue, row.expenses, row.net])
  const min = Math.min(0, ...values), max = Math.max(1, ...values), range = max - min
  const y = value => 150 - (value - min) / range * 125
  const x = index => 55 + index * 650 / Math.max(1, rows.length - 1)
  return <div className="bank-chart"><svg viewBox="0 0 760 190" role="img" aria-label="Помесячная выручка, расходы и расчётный результат в AZN">
    {[min, (max + min) / 2, max].map((value, i) => <g key={i}><line x1="55" x2="705" y1={y(value)} y2={y(value)} stroke="#dbe3ee"/><text x="50" y={y(value) + 4} textAnchor="end" fontSize="12" fill="#52627a">{Math.round(value).toLocaleString('ru-RU')}</text></g>)}
    <line x1="55" x2="705" y1={y(0)} y2={y(0)} stroke="#8090a3" strokeDasharray="4 3"/>
    {[['revenue', '#2563eb'], ['expenses', '#d97706'], ['net', '#15803d']].map(([key, color]) => <g key={key}><polyline fill="none" stroke={color} strokeWidth="2.5" points={rows.map((row, index) => `${x(index)},${y(row[key])}`).join(' ')}/>{rows.map((row, index) => <circle key={index} cx={x(index)} cy={y(row[key])} r="3" fill={color}/>)}</g>)}
    {rows.map((row, index) => <text key={row.month} x={x(index)} y="174" textAnchor="middle" fontSize="12" fill="#52627a">{row.month.slice(5)}.{row.month.slice(2, 4)}</text>)}
  </svg><div className="bank-legend"><span style={{color:'#2563eb'}}>● Выручка</span><span style={{color:'#d97706'}}>● Расходы</span><span style={{color:'#15803d'}}>● Расчётный результат</span><span>AZN</span></div></div>
}
function MarginTrend({ rows }) {
  const valid = rows.filter(row => Number.isFinite(row.margin))
  const min = Math.min(0, ...valid.map(row => row.margin)), max = Math.max(1, ...valid.map(row => row.margin))
  const x = i => 65 + i * 600 / Math.max(1, rows.length - 1)
  const y = value => 102 - (value - min) / (max - min) * 78
  return <div className="bank-margin-chart"><h3>Расчётная маржа по месяцам, %</h3><svg viewBox="0 0 720 130" role="img" aria-label="Расчётная маржа по месяцам, проценты">
    {[min,max].map((value,i) => <g key={i}><line x1="45" x2="682" y1={y(value)} y2={y(value)} stroke="#dbe3ee"/><text x="40" y={y(value)+3} textAnchor="end" fontSize="12" fill="#52627a">{Math.round(value)}%</text></g>)}
    <line x1="45" x2="682" y1={y(0)} y2={y(0)} stroke="#8090a3" strokeDasharray="4 3"/>
    {rows.map((row,i) => <g key={row.month}>{Number.isFinite(row.margin) && <rect x={x(i)-9} y={Math.min(y(0),y(row.margin))} width="18" height={Math.max(1,Math.abs(y(0)-y(row.margin)))} rx="3" fill={row.margin < 0 ? '#d44459' : '#10a6a0'}/>}{(i % Math.max(1,Math.ceil(rows.length / 7)) === 0 || i === rows.length - 1) && <text x={x(i)} y="124" textAnchor="middle" fontSize="12" fill="#52627a">{row.month.slice(5)}.{row.month.slice(2,4)}</text>}</g>)}
  </svg></div>
}
function ExpenseTable({ section, months, external = false, monthly = true }) {
  const grouped = groupBankExpenses(section)
  return <><div className="bank-table-scroll"><table className="bank-expense-table"><caption>Расходы по статьям, AZN · суммы входят в итог один раз</caption><thead><tr><th>Статья</th>{monthly && months.map(month => <th key={month}>{month.slice(5)}.{month.slice(2,4)}</th>)}<th>Итого</th></tr></thead><tbody>{grouped.groups.map(category => <tr key={category.key}><th>{category.name}</th>{monthly && grouped.monthly.map(row => <td key={row.month}>{row.hasData[category.key] ? money(row.categories[category.key]) : '—'}</td>)}<td>{category.sources.length ? money(category.amount) : '—'}</td></tr>)}<tr className="bank-total"><th>Все расходы</th>{monthly && section.monthly.map(row => <td key={row.month}>{money(row.expenses)}</td>)}<td>{money(section.totals.expenses)}</td></tr></tbody></table></div><p className="bank-meta">«—» — нет отдельно выделенных данных.</p>{!external && <p className="bank-meta">Прочие: {grouped.groups.find(group => group.key === 'other').sources.filter(source => source.amount !== 0).map(source => `${source.name} — ${money(source.amount)} AZN`).join('; ') || 'нет учтённых сумм'}.</p>}</>
}
function MonthlyOverview({ section, monthly, lang }) {
  const t=text=>monthlyText(text,lang)
  const rows=monthlyViewRows(section,monthly)
  return <div className="bank-table-scroll"><table className="bank-monthly-overview"><caption>{t(monthly ? "Помесячные итоги, AZN" : "Итоги периода, AZN")}</caption><thead><tr><th>{t(monthly ? "Месяц" : "Период")}</th><th>{t("Выручка")}</th>{MONTHLY_COLUMNS.map(([key,label])=><th key={key}>{t(label)}</th>)}<th>{t("Расходы")}</th><th>{t("Расчётный результат")}</th><th>{t("Маржа")}</th></tr></thead><tbody>{rows.map(row=><tr key={row.month || 'period'}><th data-month={row.month || undefined}>{row.month?monthlyLabel(row.month,lang):t("Весь период")}</th><td>{money(row.revenue)}</td>{MONTHLY_COLUMNS.map(([key])=><td key={key}>{row.displayPresent[key]?money(row.displayCategories[key]):'—'}</td>)}<td>{money(row.expenses)}</td><td>{money(row.net)}</td><td>{percent(row.margin)}</td></tr>)}</tbody>{monthly && <tfoot><tr><th>{t("Итого")}</th><td>{money(section.totals.revenue)}</td>{MONTHLY_COLUMNS.map(([key])=>{const total=monthlyViewRows(section,false)[0];return <td key={key}>{total.displayPresent[key]?money(total.displayCategories[key]):'—'}</td>})}<td>{money(section.totals.expenses)}</td><td>{money(section.totals.net)}</td><td>{percent(section.totals.margin)}</td></tr></tfoot>}</table><p className="bank-meta">{t("Закупки не равны себестоимости потребления. «—» — нет отдельно выделенных данных.")}</p></div>
}
function Section({ section, months, external = false, expanded = false, monthly = true, lang = 'ru' }) {
  return <section className="bank-report-section"><h2>{section.name}</h2><div className="bank-kpis"><div>Выручка<strong>{money(section.totals.revenue)} AZN</strong></div><div>Расходы<strong>{money(section.totals.expenses)} AZN</strong></div><div>Расчётный результат<strong>{money(section.totals.net)} AZN</strong></div><div>Расчётная маржа<strong>{percent(section.totals.margin)}</strong></div></div>
    {section.id !== 'combined' && <p className="bank-meta">Доля филиала в выручке всей сети за период: {percent(section.share)} · Налог: {percent(section.taxRate)}</p>}
    {monthly && <div className="bank-visuals"><Trend rows={section.monthly}/><MarginTrend rows={section.monthly}/></div>}
    <MonthlyOverview section={section} monthly={monthly} lang={lang}/>
    {!external && <p className="bank-meta">¹ Число записей RMS с привязкой к филиалу не подтверждает полноту. «Sheets» означает замену итогом соответствующего месяца из загруженного источника.</p>}
    {!external && <div className="bank-table-scroll"><table><caption>Состав выручки до комиссий, AZN</caption><thead><tr><th>Месяц</th><th>Cash</th><th>Bank</th><th>Wolt</th><th>Итого</th></tr></thead><tbody>{section.monthly.map(row => <tr key={row.month}><th>{row.month}</th><td>{money(row.cash)}</td><td>{money(row.bank)}</td><td>{money(row.wolt)}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div>}
    {expanded && <ExpenseTable section={section} months={months} external={external}/>}
    {!external && !!section.warnings?.length && <div className="bank-warnings"><h3>Покрытие и пропуски</h3><ul>{section.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div>}
    {external && <ExternalCoverage section={section}/>}
  </section>
}
export function BankDocument({ model, expanded = false, monthly = true, lang = currentReportLanguage() }) {
  return <ExternalBankDocument model={model} expanded={expanded} monthly={monthly} lang={lang}/>
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
export function ExternalBankDocument({ model, expanded = false, monthly = true, lang = currentReportLanguage() }) {
  // Only public branch labels enter the external document, never free-form metadata.
  const branches = model.branches.map((branch, index) => ({ ...branch,
    name: branch.id === BANK_BRANCH_IDS[0] ? 'BC4' : branch.id === BANK_BRANCH_IDS[1] ? 'Crescent' : `Выбранный филиал ${index + 1}` }))
  const combined = { ...model.combined, name: 'Совокупно: ' + branches.map(branch => branch.name).join(' + ') }
  return <article className="bank-document bank-external-document"><header><div className="bank-stamp">RMS PRO<strong>Сформировано<br/>в RMS Pro</strong><span>Управленческие данные</span></div><p className="bank-eyebrow">RMS PRO · УПРАВЛЕНЧЕСКИЙ ОТЧЁТ</p><h1>Рентабельность филиалов</h1>
    <p>{model.period.from} — {new Date(Date.parse(`${model.period.toExclusive}T00:00:00Z`) - 86400000).toISOString().slice(0,10)} · AZN</p>
    <p className="bank-header-note">Управленческий расчёт · не аудиторское заключение</p></header>
    {!model.exportable && <p className="bank-meta" role="status">PDF недоступен: {model.reconciled ? 'есть недостающие данные за выбранный период.' : 'итоги не прошли сверку.'}</p>}
    <Section section={combined} months={model.months} external monthly={monthly} lang={lang}/>{branches.map(branch => <Section key={branch.id} section={branch} months={model.months} external monthly={monthly} lang={lang}/>)}
    {expanded && <div className="bank-expense-appendix"><h2>Расширенный отчёт · статьи расходов</h2>{[combined,...branches].map(section => <div className="bank-expense-block" key={section.id}><h3>{section.name}</h3><ExpenseTable section={section} months={model.months} external monthly={monthly} lang={lang}/></div>)}</div>}
    {model.payrollEstimated && <p className="bank-meta">Зарплата включает расчётную оценку.</p>}

  </article>
}
const monthLabel = value => {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return 'Не выбран'
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`)).replace(' г.', '')
}
function presetMonths(preset) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Baku' }).formatToParts(new Date())
  const year = Number(parts.find(part => part.type === 'year').value)
  const month = Number(parts.find(part => part.type === 'month').value)
  const current = `${year}-${String(month).padStart(2, '0')}`
  const previous = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}`
  return preset === 'previous' ? { start: previous, end: previous } : { start: preset === 'year' ? `${year}-01` : current, end: current }
}
export function printBankDocument(model, expanded = false, monthly = true, lang = currentReportLanguage()) {
  if (!model?.exportable) return 'Сначала загрузите отчёт, проверьте сверку итогов и полноту исходных данных.'
  const popup = window.open('', '_blank')
  if (!popup) return 'Браузер заблокировал окно печати. Разрешите всплывающие окна для RMS Pro и повторите.'
  const styles = `<style>${bankPrintStyles}</style>`
  popup.document.open()
  popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>RMS Pro — Рентабельность ${model.period.from}</title>${styles}</head><body class="bank-print-body">${renderToStaticMarkup(<ExternalBankDocument model={model} expanded={expanded} monthly={monthly} lang={lang}/>)}</body></html>`)
  popup.onload = async () => {
    try { await popup.document.fonts.ready; popup.focus(); popup.print() }
    catch { /* The complete printable report remains open for the browser's Print command. */ }
  }
  popup.document.close()
  // Stylesheets and fonts must finish before opening the native PDF/print dialog.
  return ''
}
export default function ProfitabilityBankReport({ report, branches, onPeriodChange, periodKey, availableYears = [], children, expanded: expandedProp, onExpandedChange }) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = expandedProp === undefined ? internalExpanded : expandedProp
  const [draftExpanded, setDraftExpanded] = useState(expanded)
  const [monthly,setMonthly]=useState(true)
  const [draftMonthly,setDraftMonthly]=useState(true)
  const viewLang=currentReportLanguage()
  const monthlyT=text=>monthlyText(text,viewLang)
  const [selected, setSelected] = useState(BANK_BRANCH_IDS)
  const [draftSelected, setDraftSelected] = useState(BANK_BRANCH_IDS)
  const [search, setSearch] = useState('')
  const [branchOpen, setBranchOpen] = useState(false)
  const initial = periodMonths(report.period)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!report.period || report.error) return
    const next = periodMonths(report.period)
    setStart(next.start); setEnd(next.end)
  }, [report.period?.from, report.period?.toExclusive])
  useEffect(() => { setDraftExpanded(expanded) }, [expanded])
  const chosenPeriod = manualPeriod(start, end)
  const appliedPeriod = periodMonths(report.period)
  const pending = draftMonthly !== monthly || start !== appliedPeriod.start || end !== appliedPeriod.end || draftExpanded !== expanded || [...draftSelected].sort().join('|') !== [...selected].sort().join('|')
  const stale = report.periodKey !== periodKey
  const model = useMemo(() => buildBankReport(report, selected), [report, selected])
  const branchNames = ids => branches.filter(branch => ids.includes(String(branch.id))).map(branch => branch.name)
  const chosenNames = branchNames(draftSelected)
  const appliedNames = branchNames(selected)
  const visibleBranches = branches.filter(branch => branch.name.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')))
  const allSelected = branches.length > 0 && branches.every(branch => draftSelected.includes(String(branch.id)))
  const applyPeriod = () => {
    if (!chosenPeriod || !draftSelected.length || report.loading) return
    setError(''); setBranchOpen(false)
    setMonthly(draftMonthly); setSelected([...draftSelected]); setInternalExpanded(draftExpanded); onExpandedChange?.(draftExpanded)
    onPeriodChange(chosenPeriod.key)
  }
  const choosePreset = preset => { const next = presetMonths(preset); setStart(next.start); setEnd(next.end) }
  const exportReport = () => setError(printBankDocument(report.loading || report.error || stale || pending ? null : model, expanded, monthly, viewLang))
  return <section className="bank-workspace"><div className="bank-controls bank-filter-panel">
    <div className="bank-filter-heading"><div><p className="bank-filter-eyebrow">АНАЛИТИКА / ОТЧЁТЫ</p><h2>Управленческий отчёт</h2><p>Рентабельность филиалов и сети · AZN</p></div><span className="bank-filter-badge">{monthlyT(monthly ? "Помесячно" : "За период")}</span></div>
    <div className="bank-filter-grid">
      <div className="bank-period-field"><span className="bank-field-label" id="bank-period-label">Период отчёта</span>
        <div className="bank-month-range" role="group" aria-labelledby="bank-period-label"><label><span>С</span><input type="month" aria-label="Начальный месяц" min="2000-01" max="2100-12" value={start} disabled={report.loading} onChange={event => setStart(event.target.value)}/></label><span className="bank-range-divider" aria-hidden="true">→</span><label><span>По</span><input type="month" aria-label="Конечный месяц" min="2000-01" max="2100-12" value={end} disabled={report.loading} onChange={event => setEnd(event.target.value)}/></label></div>
        <div className="bank-period-presets" aria-label="Быстрый выбор периода">{[['current','Текущий месяц'],['previous','Прошлый месяц'],['year','С начала года']].map(([key,label]) => <button key={key} type="button" disabled={report.loading} onClick={() => choosePreset(key)}>{label}</button>)}</div>
      </div>
      <div className="bank-branch-field"><span className="bank-field-label" id="bank-branch-label">Филиалы</span>
        <div className="bank-branch-picker" onKeyDown={event => { if (event.key === 'Escape') { setBranchOpen(false); event.currentTarget.querySelector('button')?.focus() } }}>
          <button type="button" className="bank-branch-trigger" aria-labelledby="bank-branch-label bank-branch-value" aria-expanded={branchOpen} aria-controls="bank-branch-options" disabled={report.loading} onClick={() => setBranchOpen(!branchOpen)}><span id="bank-branch-value">{chosenNames.length ? chosenNames.length <= 2 ? chosenNames.join(', ') : `Выбрано филиалов: ${chosenNames.length}` : 'Выберите филиалы'}</span><span className="bank-branch-count">{chosenNames.length}</span><span aria-hidden="true">⌄</span></button>
          {branchOpen && <div id="bank-branch-options" className="bank-branch-popover"><input type="search" aria-label="Поиск филиала" placeholder="Найти филиал…" value={search} onChange={event => setSearch(event.target.value)}/><label className="bank-select-all"><input type="checkbox" checked={allSelected} onChange={event => setDraftSelected(event.target.checked ? branches.map(branch => String(branch.id)) : [])}/><span>Выбрать все</span><small>{branches.length}</small></label><div className="bank-branch-list">{visibleBranches.map(branch => <label key={branch.id}><input type="checkbox" checked={draftSelected.includes(String(branch.id))} onChange={event => setDraftSelected(current => event.target.checked ? [...new Set([...current,String(branch.id)])] : current.filter(id => id !== String(branch.id)))}/><span>{branch.name}</span></label>)}{!visibleBranches.length && <p>Филиалы не найдены</p>}</div><div className="bank-branch-footer"><span>Выбрано: {chosenNames.length} из {branches.length}</span><button type="button" onClick={() => setBranchOpen(false)}>Готово</button></div></div>}
        </div><p className="bank-field-hint">По каждому филиалу и совокупно</p>
      </div>
      <div className="bank-detail-field"><span className="bank-field-label" id="bank-detail-label">Детализация</span><div className="bank-detail-segments" role="group" aria-labelledby="bank-detail-label"><button type="button" aria-pressed={!draftExpanded} disabled={report.loading} onClick={() => setDraftExpanded(false)}>Краткий</button><button type="button" aria-pressed={draftExpanded} disabled={report.loading} onClick={() => setDraftExpanded(true)}>Расширенный</button></div><p className="bank-field-hint">{draftExpanded ? 'Со статьями расходов' : 'Ключевые показатели и динамика'}</p></div>
    </div>
    <label className="bank-monthly-toggle"><input type="checkbox" checked={draftMonthly} disabled={report.loading} onChange={event=>setDraftMonthly(event.target.checked)}/><span>{monthlyT("Помесячно")}</span><small>{monthlyT("Все месяцы выбранного периода в одном отчёте")}</small></label>
    <div className="bank-filter-bottom"><p className="bank-field-hint">Полные календарные месяцы, включая начальный и конечный.</p><div className="bank-filter-actions"><button className="bank-generate" type="button" disabled={!chosenPeriod || !draftSelected.length || report.loading} onClick={applyPeriod}>{report.loading ? 'Формирование…' : 'Сформировать'}</button><button className="bank-export" id="profitability-bank-export" type="button" disabled={report.loading || !!report.error || stale || pending || !model?.exportable} onClick={exportReport}>PDF / печать</button></div></div>
    {!chosenPeriod && <p className="bank-filter-alert" role="alert">Укажите начальный и конечный месяц. Конец периода должен быть не раньше начала.</p>}
    {!draftSelected.length && <p className="bank-filter-alert" role="alert">Выберите хотя бы один филиал.</p>}
    <div className={`bank-applied-summary${pending ? ' is-pending' : ''}`} aria-live="polite"><span>{report.loading || stale ? 'Формируется отчёт…' : report.error ? 'Отчёт не сформирован' : `В отчёте: ${monthLabel(appliedPeriod.start)} — ${monthLabel(appliedPeriod.end)} · ${appliedNames.join(', ')} · ${expanded ? 'Расширенный' : 'Краткий'} · ${monthlyT(monthly ? 'Помесячно' : 'За период')}`}</span>{pending && <strong>Есть изменения. Нажмите «Сформировать».</strong>}</div>
  </div>
    {!report.loading && !report.error && !stale && children}
    {error && <p role="alert" className="bank-disclosure">{error}</p>}
    {report.error && !report.loading ? <p role="alert">Отчёт не сформирован: {report.error}. Повторите загрузку кнопкой «Сформировать».</p> : report.loading || stale ? <p role="status">Загружаю расчёт…</p> : model ? <BankDocument model={model} expanded={expanded} monthly={monthly} lang={viewLang}/> : <p>Выберите филиалы и период.</p>}
  </section>
}

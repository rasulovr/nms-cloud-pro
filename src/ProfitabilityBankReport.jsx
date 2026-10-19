import React, { useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BANK_BRANCH_IDS, buildBankReport, groupBankExpenses } from './profitability-bank.mjs'
import './profitability-bank.css'
import bankPrintStyles from './profitability-bank.css?raw'
const money = value => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
const percent = value => value == null ? '—' : `${money(value)}%`
const METHOD = [
  'Управленческий расчёт RMS Pro по имеющимся записям, не аудированная отчётность и не подтверждённая полная чистая прибыль. Нули означают только отсутствие суммы в загруженных источниках. Полнота расходов, начислений, DSMF и комиссий требует сверки.',
  'Статьи сгруппированы в девять строк: Зарплаты, Аренда, ФудКост, ХозТовары, DSMF+Налог, Такси, Сервис чардж, Коммунальные, Прочие. Прочие включают все остальные учтённые движком расходы, в том числе Wolt/банковские комиссии и партнёрские расходы; их состав и суммы приведены под таблицей. Группировка не меняет расходы и результат.',
  'DSMF+Налог объединяет расчётный налог с оборота и уже включённые действующим движком расходы DSMF. Для DSMF источник — расходные записи: статус начисления требует сверки. Отдельные выплаты не добавляются; оплаты налога не входят в расходы. Зарплаты — только зарплатная статья расчёта, без повторного добавления авансов.',
  'Выручка = Cash + Bank + Wolt до комиссий. Расходы включают операционные статьи, распределённые закупки, зарплату, service charge персоналу и расчётный налог с оборота. Прибыль (расчётный результат) = выручка − эти расходы; маржа = результат / выручка. Нулевой оборот: маржа не определена.',
  'Все закупки поставщиков и зарплата менеджмента распределены по доле выручки филиала во всей сети за выбранный период. В помесячной раскладке сохранена эта доля периода, а не пересчитана доля каждого месяца. Совокупный итог — сумма выбранных филиалов, без повторного распределения на них всей сети.',
  'Food Cost здесь основан на закупках, а не на движении запасов/себестоимости продаж. Ручной «Базар», зеркала закупок, выплаты зарплат и расчёты Bolt, уже учтённые как расходы, исключаются действующим движком. Авансы не добавлены повторно.',
  'Налог начислен по текущей настройке филиала (или штатной ставке 8%). Историческая ставка не подтверждена. Оплаченный налог (Vergi) справочный и повторно не уменьшает результат. Wolt-комиссия, банковская комиссия, DSMF и аренда включены только в том виде, в котором их учитывает действующий отчёт: автоматического восстановления недостающих сумм нет.',
  'Service charge персоналу включён в фактический расчёт расходов этого окна. Аренда здесь отражена из записей расходов; фиксированная начисленная аренда автоматически не восстановлена. Текущая настройка прогноза аренды не является подтверждением исторических начислений.',
  'Начисления берутся из salary_periods. Если за весь период их нет, текущий движок оценивает зарплату по активным сотрудникам, ставкам и официальным дням; месячная разбивка такой оценки равномерная по месяцам с выручкой сети. Наличие отдельных начислений не доказывает полноту payroll. Исторические ставки и состав сотрудников требуют проверки.',
  'Выручка берётся из daily_revenue_entries, а при полном отсутствии записей за период — из daily_revenue. Источники не складываются между собой. При частичном заполнении entries пропуски не дополняются автоматически.'
]
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
function ExpenseTable({ section, months }) {
  const grouped = groupBankExpenses(section)
  return <><div className="bank-table-scroll"><table className="bank-expense-table"><caption>Расходы по статьям, AZN · суммы входят в итог один раз</caption><thead><tr><th>Статья</th>{months.map(month => <th key={month}>{month.slice(5)}.{month.slice(2,4)}</th>)}<th>Итого</th></tr></thead><tbody>{grouped.groups.map(category => <tr key={category.key}><th>{category.name}</th>{grouped.monthly.map(row => <td key={row.month}>{money(row.categories[category.key] || 0)}</td>)}<td>{money(category.amount)}</td></tr>)}<tr className="bank-total"><th>Все расходы</th>{section.monthly.map(row => <td key={row.month}>{money(row.expenses)}</td>)}<td>{money(section.totals.expenses)}</td></tr></tbody></table></div><p className="bank-meta">Прочие: {grouped.groups.find(group => group.key === 'other').sources.filter(source => source.amount !== 0).map(source => `${source.name} — ${money(source.amount)} AZN`).join('; ') || 'нет учтённых сумм'}.</p></>
}
function Section({ section, months }) {
  return <section className="bank-report-section"><h2>{section.name}</h2><div className="bank-kpis"><div>Выручка<strong>{money(section.totals.revenue)} AZN</strong></div><div>Расходы<strong>{money(section.totals.expenses)} AZN</strong></div><div>Прибыль · расчётный результат<strong>{money(section.totals.net)} AZN</strong></div><div>Расчётная маржа<strong>{percent(section.totals.margin)}</strong></div></div>
    {section.id !== 'combined' && <p className="bank-meta">Доля филиала в выручке всей сети за период: {percent(section.share)} · Налог: {percent(section.taxRate)}</p>}
    <Trend rows={section.monthly}/>
    <div className="bank-table-scroll"><table><caption>Помесячные итоги, AZN</caption><thead><tr><th>Месяц</th><th>Выручка</th><th>Расходы</th><th>Расчётный результат</th><th>Маржа</th>{section.id !== 'combined' && <><th>Дней выручки</th><th>Строк начислений¹</th></>}</tr></thead><tbody>{section.monthly.map(row => <tr key={row.month}><th>{row.month}</th><td>{money(row.revenue)}</td><td>{money(row.expenses)}</td><td>{money(row.net)}</td><td>{percent(row.margin)}</td>{section.id !== 'combined' && <><td>{row.revenueDays}</td><td>{row.salaryRows}</td></>}</tr>)}</tbody></table></div>
    <p className="bank-meta">¹ Только начисления с привязкой к филиалу; число записей не подтверждает полноту зарплаты.</p>
    <div className="bank-table-scroll"><table><caption>Состав выручки до комиссий, AZN</caption><thead><tr><th>Месяц</th><th>Cash</th><th>Bank</th><th>Wolt</th><th>Итого</th></tr></thead><tbody>{section.monthly.map(row => <tr key={row.month}><th>{row.month}</th><td>{money(row.cash)}</td><td>{money(row.bank)}</td><td>{money(row.wolt)}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div>
    <ExpenseTable section={section} months={months}/>
    {!!section.warnings?.length && <div className="bank-warnings"><h3>Покрытие и пропуски</h3><ul>{section.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div>}
  </section>
}
export function BankDocument({ model }) {
  return <article className="bank-document"><header><p className="bank-eyebrow">RMS PRO · УПРАВЛЕНЧЕСКАЯ ОТЧЁТНОСТЬ</p><h1>Рентабельность филиалов</h1><p>{model.period.from} — {new Date(Date.parse(`${model.period.toExclusive}T00:00:00Z`) - 86400000).toISOString().slice(0,10)} · AZN</p><p className="bank-meta">Данные загружены: {model.generatedAt ? new Date(model.generatedAt).toLocaleString('ru-RU') : 'не указано'} · Предварительно, полнота не подтверждена</p></header>
    <div className="bank-disclosure">Для рассмотрения банком. Расчёт по доступным данным; не подтверждает полную чистую прибыль. Перед передачей сверьте пропуски, начисления аренды, зарплату, DSMF и комиссии.</div>
    <Section section={model.combined} months={model.months}/>{model.branches.map(branch => <Section key={branch.id} section={branch} months={model.months}/>)}
    <section className="bank-method"><h2>Источники и методика</h2><p>Источник: {model.source} + monthly_branch_service_charge_cost; настройки налогов и текущие данные сотрудников. Период и выбранные филиалы указаны выше. Доступ к исходным данным и метод расчёта не изменены.</p><ol>{METHOD.map((text, i) => <li key={i}>{text}</li>)}</ol><p>Сверка: помесячные выручка, расходы и результат {model.exportable ? 'совпадают' : 'НЕ совпадают'} с итогом существующего расчёта по каждому выбранному филиалу. Округление только при отображении; возможна разница копеек при сложении округлённых ячеек.</p></section>
  </article>
}
export function printBankDocument(model) {
  if (!model?.exportable) return 'Сначала загрузите отчёт и проверьте сверку итогов.'
  const popup = window.open('', '_blank')
  if (!popup) return 'Браузер заблокировал окно печати. Разрешите всплывающие окна для RMS Pro и повторите.'
  const styles = `<style>${bankPrintStyles}</style>`
  popup.document.open()
  popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>RMS Pro — Рентабельность ${model.period.from}</title>${styles}</head><body class="bank-print-body">${renderToStaticMarkup(<BankDocument model={model}/>)}</body></html>`)
  popup.onload = async () => {
    try { await popup.document.fonts.ready; popup.focus(); popup.print() }
    catch { /* The complete printable report remains open for the browser's Print command. */ }
  }
  popup.document.close()
  // Stylesheets and fonts must finish before opening the native PDF/print dialog.
  return ''
}
export default function ProfitabilityBankReport({ report, branches, onPeriodChange, periodKey }) {
  const [selected, setSelected] = useState(BANK_BRANCH_IDS)
  const [start, setStart] = useState(`${new Date().getFullYear()}-01`)
  const [error, setError] = useState('')
  const model = useMemo(() => buildBankReport(report, selected), [report, selected])
  const exportReport = () => setError(printBankDocument(report.loading || report.error || report.periodKey !== periodKey ? null : model))
  return <section className="bank-workspace"><div className="bank-controls"><div><h2>Отчёт для банка</h2><p>Отдельно по выбранным филиалам и совокупно · помесячно · AZN</p></div><div className="bank-control-row"><label>Первый месяц года<input type="month" value={start} onChange={event => setStart(event.target.value)}/></label><button type="button" disabled={!/^\d{4}-\d{2}$/.test(start) || report.loading} onClick={() => onPeriodChange(`annual:${start}`)}>Показать 12 месяцев</button><button id="profitability-bank-export" type="button" disabled={report.loading || !!report.error || report.periodKey !== periodKey || !model?.exportable} onClick={exportReport}>Экспорт PDF / печать</button></div><fieldset><legend>Филиалы банковского отчёта (независимо от общего фильтра)</legend>{branches.map(branch => <label key={branch.id}><input type="checkbox" checked={selected.includes(String(branch.id))} onChange={event => setSelected(current => event.target.checked ? [...current, String(branch.id)] : current.filter(id => id !== String(branch.id)))}/>{branch.name}</label>)}</fieldset><p className="bank-meta">Показанный период: {report.periodLabel || report.period?.from || 'не выбран'}. По умолчанию BC4 и BC5 / Crescent. Распределение расходов сохраняет базу всей сети, даже если выбраны два филиала.</p></div>
    {error && <p role="alert" className="bank-disclosure">{error}</p>}{report.loading ? <p role="status">Загружаю расчёт; экспорт временно недоступен…</p> : report.error ? <p role="alert">Отчёт не сформирован: {report.error}</p> : model ? <BankDocument model={model}/> : <p>Выберите филиалы и период: месяц, календарный год или любые 12 последовательных месяцев.</p>}
  </section>
}

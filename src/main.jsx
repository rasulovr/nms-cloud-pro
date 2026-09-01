import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const modules = {
  rms: { label: 'RMS Pro', enabled: true },
  qr: { label: 'QR Menu', enabled: true },
  loyalty: { label: 'Loyalty', enabled: true }
}

const navigation = [
  { id: 'dashboard', icon: '⌂', label: 'Обзор', module: 'rms' },
  { id: 'revenue', icon: '↗', label: 'Выручка', module: 'rms' },
  { id: 'finance', icon: '◫', label: 'Финансы', module: 'rms' },
  { id: 'menu', icon: '▦', label: 'Меню и тех. карты', module: 'rms' },
  { id: 'qr-menu', icon: '▦', label: 'QR Menu', module: 'qr' },
  { id: 'qr-tables', icon: '⌘', label: 'QR и столы', module: 'qr' },
  { id: 'loyalty', icon: '◌', label: 'Loyalty', module: 'loyalty' },
  { id: 'clients', icon: '◎', label: 'Клиенты', module: 'loyalty' },
]

const moduleMeta = {
  rms: { eyebrow: 'Restaurant management', title: 'RMS Pro', description: 'Операционное управление рестораном в едином рабочем пространстве.' },
  qr: { eyebrow: 'Guest experience', title: 'QR Menu', description: 'Меню, филиалы, QR-коды и гостевые сценарии без выхода из RMS Pro.' },
  loyalty: { eyebrow: 'Guest retention', title: 'Loyalty', description: 'Клиенты, уровни, бонусы и история визитов в составе единого продукта.' }
}

function Metric({ label, value, note, accent }) {
  return <article className="metric-card"><span className={`metric-dot ${accent || ''}`} /><p>{label}</p><strong>{value}</strong><small>{note}</small></article>
}

function Insight({ icon, title, text, action }) {
  return <article className="insight"><span className="insight-icon">{icon}</span><div><b>{title}</b><p>{text}</p></div>{action && <button className="quiet-button">{action}</button>}</article>
}

function Dashboard() {
  return <>
    <section className="page-intro"><div><span className="eyebrow">Restaurant management</span><h1>Добрый день, Руслан</h1><p>Сеть под контролем: ключевые показатели и действия на сегодня.</p></div><button className="primary-button">＋ Добавить операцию</button></section>
    <section className="metric-grid"><Metric label="Выручка сегодня" value="12 480 ₼" note="+8,4% к прошлой неделе" accent="blue" /><Metric label="Чистая маржа" value="14,6%" note="В пределах плана" accent="green" /><Metric label="Food Cost" value="31,2%" note="−1,1 п.п. к месяцу" accent="amber" /><Metric label="Гостей сегодня" value="486" note="Во всех филиалах" accent="purple" /></section>
    <section className="content-grid"><article className="surface chart-card"><div className="section-head"><div><span className="eyebrow">Динамика</span><h2>Выручка за неделю</h2></div><button className="chip">Последние 7 дней⌄</button></div><div className="chart" aria-label="График выручки"><div className="chart-fill" /><svg viewBox="0 0 700 210" preserveAspectRatio="none"><path d="M0 170 C52 150 72 161 118 126 S195 130 240 84 S315 110 360 96 S438 49 478 73 S557 49 600 55 S655 25 700 35" /><circle cx="700" cy="35" r="5" /></svg><div className="chart-axis"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div></div></article><article className="surface branch-panel"><div className="section-head"><div><span className="eyebrow">Филиалы</span><h2>Сегодня</h2></div><button className="text-button">Все филиалы</button></div>{[['BC5 · Crescent', '3 740 ₼', 88], ['BC1 · R. Behbudova', '2 890 ₼', 68], ['Bistronomia', '2 440 ₼', 57]].map(([name, value, progress]) => <div className="branch-row" key={name}><div><b>{name}</b><small>{value}</small></div><i><em style={{ width: `${progress}%` }} /></i></div>)}</article></section>
    <section className="surface action-panel"><div className="section-head"><div><span className="eyebrow">Требует внимания</span><h2>Операционные задачи</h2></div><button className="text-button">Все задачи</button></div><Insight icon="◷" title="3 позиции в Stop-list" text="Проверьте наличие и обновите гостевое QR Menu." action="Открыть QR Menu" /><Insight icon="◌" title="47 гостей близки к следующему уровню" text="Можно запустить персональное предложение в Loyalty." action="Открыть Loyalty" /></section>
  </>
}

function QrWorkspace({ tab }) {
  const title = tab === 'qr-tables' ? 'QR и столы' : 'QR Menu по филиалам'
  return <><section className="page-intro"><div><span className="eyebrow">Guest experience · QR Menu</span><h1>{title}</h1><p>Самостоятельный лицензируемый модуль, встроенный в единый интерфейс RMS Pro.</p></div><button className="primary-button">＋ {tab === 'qr-tables' ? 'Создать QR' : 'Добавить позицию'}</button></section><section className="module-banner"><span>⌘</span><div><b>QR Menu подключён</b><p>Филиалы, QR-коды, меню, реклама и гостевые заказы управляются из RMS Pro.</p></div><span className="status-chip">Активно</span></section><section className="card-grid">{['BC1 · Rashid Behbudova', 'BC3 · Nizami', 'BC5 · Crescent', 'Bistronomia'].map((branch, index) => <article className="branch-card" key={branch}><div className="branch-card-head"><b>{branch}</b><span className={index === 0 ? 'source-chip' : 'status-chip'}>{index === 0 ? 'Эталон' : 'Подключено'}</span></div><p>{tab === 'qr-tables' ? `${[18, 12, 22, 8][index]} активных столов` : `${[82, 76, 69, 54][index]} позиций в меню`}</p><div className="branch-card-actions"><button className="quiet-button">Управлять</button><button className="icon-button">↗</button></div></article>)}</section><section className="surface"><div className="section-head"><div><span className="eyebrow">Управление</span><h2>{tab === 'qr-tables' ? 'Последние QR-коды' : 'Меню выбранного филиала'}</h2></div><button className="chip">BC5 · Crescent⌄</button></div><div className="list-row"><b>{tab === 'qr-tables' ? 'Стол 08' : 'Салат Медисон Гарден'}</b><span>{tab === 'qr-tables' ? 'QR готов к печати' : 'Салаты · 11.90 ₼'}</span><button className="quiet-button">Открыть</button></div><div className="list-row"><b>{tab === 'qr-tables' ? 'Стол 09' : 'Паста с креветками'}</b><span>{tab === 'qr-tables' ? 'QR готов к печати' : 'Горячее · 18.90 ₼'}</span><button className="quiet-button">Открыть</button></div></section></>
}

function LoyaltyWorkspace({ tab }) {
  return <><section className="page-intro"><div><span className="eyebrow">Guest retention · Loyalty</span><h1>{tab === 'clients' ? 'Клиенты' : 'Loyalty'}</h1><p>Отдельный модуль программы лояльности, работающий в едином пространстве RMS Pro.</p></div><button className="primary-button">＋ Новый клиент</button></section><section className="metric-grid"><Metric label="Активные клиенты" value="8 426" note="+124 за этот месяц" accent="blue" /><Metric label="Повторные визиты" value="36,8%" note="Выше целевого уровня" accent="green" /><Metric label="Начислено бонусов" value="2 180 ₼" note="За последние 30 дней" accent="purple" /></section><section className="content-grid"><article className="surface"><div className="section-head"><div><span className="eyebrow">Клиентская база</span><h2>Последние визиты</h2></div><button className="text-button">Открыть список</button></div>{['Leyla M.', 'Nigar A.', 'Elvin R.'].map((name, i) => <div className="client-row" key={name}><span>{name.split(' ')[0][0]}</span><div><b>{name}</b><small>{[12, 8, 6][i]} визитов · {['Gold', 'Silver', 'Gold'][i]}</small></div><strong>{[72, 48, 35][i]} ₼</strong></div>)}</article><article className="surface"><div className="section-head"><div><span className="eyebrow">Следующее действие</span><h2>Удержание</h2></div></div><div className="loyalty-callout"><span>✦</span><b>47 гостей близки к уровню Gold</b><p>Создайте предложение для следующего визита и отправьте через доступный канал.</p><button className="quiet-button">Создать предложение</button></div></article></section></>
}

function GenericWorkspace({ page }) {
  const map = { revenue: ['Выручка', 'Внесение и анализ выручки по филиалам.'], finance: ['Финансы', 'Расходы, рентабельность и финансовый контроль.'], menu: ['Меню и тех. карты', 'Себестоимость, рецептуры и состав блюд.'] }
  const [title, description] = map[page]
  return <><section className="page-intro"><div><span className="eyebrow">Restaurant management · RMS Pro</span><h1>{title}</h1><p>{description}</p></div><button className="primary-button">＋ Добавить</button></section><section className="module-banner"><span>◫</span><div><b>Единый интерфейс RMS Pro</b><p>Данные и права доступа ядра RMS остаются отдельными от QR Menu и Loyalty.</p></div><span className="status-chip">Доступно</span></section><section className="surface empty-surface"><span>✦</span><h2>Раздел подготовлен к переносу рабочего функционала</h2><p>Визуальная система уже общая; следующие этапы подключат текущие операции нового SaaS RMS Pro без изменения действующего production RMS.</p></section></>
}

function App() {
  const [page, setPage] = useState('dashboard')
  const active = useMemo(() => navigation.find(item => item.id === page), [page])
  const visibleNav = navigation.filter(item => modules[item.module].enabled)
  const workspace = active.module === 'qr' ? <QrWorkspace tab={page} /> : active.module === 'loyalty' ? <LoyaltyWorkspace tab={page} /> : page === 'dashboard' ? <Dashboard /> : <GenericWorkspace page={page} />
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><i>R</i><b>M</b><i>S</i></span><div><strong>RMS <em>Pro</em></strong><small>Restaurant management</small></div></div><div className="workspace-pill"><span className="workspace-avatar">BC</span><div><b>Barista&Chef</b><small>Полная подписка</small></div><button>⌄</button></div><nav>{visibleNav.map((item, index) => <React.Fragment key={item.id}>{index === 4 && <p className="nav-label">Гостевой опыт</p>}{index === 6 && <p className="nav-label">Лояльность</p>}<button className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id)}><span>{item.icon}</span>{item.label}</button></React.Fragment>)}</nav><div className="sidebar-footer"><div className="license-card"><span>✦</span><div><b>Full Suite</b><small>RMS Pro · QR · Loyalty</small></div></div><button className="profile"><span>R</span><div><b>Ruslan Rasulov</b><small>Super Admin</small></div><i>•••</i></button></div></aside><main><header className="topbar"><div><span className="crumb">RMS Pro / {modules[active.module].label}</span><b>{active.label}</b></div><div className="topbar-actions"><button className="round-button">⌕</button><button className="round-button notification">◌</button><button className="mobile-menu">☰</button></div></header><div className="content">{workspace}</div></main></div>
}

createRoot(document.getElementById('root')).render(<App />)

import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import './styles.css'

const I18N = {
  ru: {
    system_title:'Система управления сетью', system_short_title:'Система сети', system_subtitle:'Выручка · Финансы · Персонал · Поставщики', dashboard_tab:'Дашборд',
    brand_subtitle:'Выручка · Финансы · Персонал', language_label:'Язык интерфейса', login_label:'Login', password_label:'Пароль',
    login_button:'Войти', login_hint:'Вход по внутреннему login', login_error:'Неверный логин или пароль', show_password:'Показать пароль',
    logout:'Выйти', revenue_tab:'Выручка', finance_tab:'Финансы ресторанов', recipes_tab:'Тех. карты', salaries_tab:'Зарплаты',
    attendance_tab:'Посещаемость', advances_tab:'Авансы', suppliers_tab:'Поставщики', debts_payments_tab:'Долги и оплаты', settings_tab:'Настройки',
    revenue_subtitle:'Ввод выручки и расходов за выбранную дату по филиалу', finance_subtitle:'Аналитика по филиалу, месяцу, выручке и расходам',
    period_branch:'Период и филиал', branch_select:'Филиал', date:'Дата', daily_revenue_title:'Выручка за выбранную дату',
    cash:'Наличными', bank:'Банк', wolt:'Wolt', revenue_summary:'Сводка выручки', total_revenue:'Общая выручка',
    forecast:'Прогноз месяца', forecast_revenue:'Предполагаемая выручка', forecast_profit:'Предполагаемая прибыль', avg_daily_revenue:'Средняя выручка / день',
    daily_expenses_title:'Расходы за выбранную дату', daily_expenses_hint:'Статьи расходов вводятся вертикально в столбик.',
    add_expense:'+ Статья расхода', daily_expenses_total:'Итого расходов за дату', expense_item:'Статья расхода', amount:'Сумма', comment:'Комментарий',
    year:'Год', month:'Месяц', tax_rate:'Налог %', planned_revenue:'План выручки', planned_profit:'План прибыли',
    expense_breakdown:'Расходы по статьям', current_result:'Текущий факт', gross_profit:'Валовая прибыль', total_expenses:'Расходы',
    tax_amount:'Налог', net_profit:'Чистая прибыль', profitable:'Филиал прибыльный', loss:'Филиал в убытке', comparison:'Сравнение',
    prev_month_revenue:'Выручка прошлого месяца', revenue_change_pct:'Изменение выручки', profit_change_pct:'Изменение прибыли',
    margins:'Маржинальность', expense_pct:'Расходы %', net_margin:'Маржа чистой прибыли', plan_status:'План',
    revenue_plan_progress:'Выполнение плана выручки', profit_plan_progress:'Выполнение плана прибыли', module_coming:'Раздел будет добавлен следующим этапом.',
    settings_subtitle:'Пользователи, права доступа и режимы работы', users_management:'Пользователи', add_user:'+ Пользователь',
    role:'Роль', sections_access:'Доступ к разделам', access_mode:'Режим', administrator:'Администратор', employee:'Сотрудник',
    read_only:'Только чтение', edit_mode:'Изменение', permission_denied:'Нет доступа к этому разделу', new_expense:'Новая статья', save:'Сохранить', saved:'Сохранено', loading:'Загрузка...', profile:'Профиль текущего пользователя', full_name:'Имя', create_admin:'Создать admin-профиль',
    months:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  },
  az: {
    system_title:'Şəbəkə idarəetmə sistemi', system_short_title:'Şəbəkə sistemi', system_subtitle:'Dövriyyə · Maliyyə · Personal · Təchizatçılar', dashboard_tab:'Dashboard',
    brand_subtitle:'Dövriyyə · Maliyyə · Personal', language_label:'İnterfeys dili', login_label:'Login', password_label:'Parol',
    login_button:'Daxil ol', login_hint:'Daxili login ilə giriş', login_error:'Login və ya parol yanlışdır', show_password:'Parolu göstər',
    logout:'Çıxış', revenue_tab:'Dövriyyə', finance_tab:'Restoran maliyyəsi', recipes_tab:'Tex. kartlar', salaries_tab:'Maaşlar',
    attendance_tab:'Davamiyyət', advances_tab:'Avanslar', suppliers_tab:'Təchizatçılar', debts_payments_tab:'Borclar və ödənişlər', settings_tab:'Ayarlar',
    revenue_subtitle:'Seçilmiş tarix və filial üzrə dövriyyə və xərclər', finance_subtitle:'Filial, ay, dövriyyə və xərclər üzrə analitika',
    period_branch:'Dövr və filial', branch_select:'Filial', date:'Tarix', daily_revenue_title:'Seçilmiş tarixin dövriyyəsi',
    cash:'Nağd', bank:'Bank', wolt:'Wolt', revenue_summary:'Dövriyyə xülasəsi', total_revenue:'Ümumi dövriyyə',
    forecast:'Ay sonu proqnozu', forecast_revenue:'Gözlənilən dövriyyə', forecast_profit:'Gözlənilən mənfəət', avg_daily_revenue:'Orta gündəlik dövriyyə',
    daily_expenses_title:'Seçilmiş tarixin xərcləri', daily_expenses_hint:'Xərc maddələri şaquli siyahı ilə daxil edilir.',
    add_expense:'+ Xərc maddəsi', daily_expenses_total:'Tarixin xərcləri cəmi', expense_item:'Xərc maddəsi', amount:'Məbləğ', comment:'Şərh',
    year:'İl', month:'Ay', tax_rate:'Vergi %', planned_revenue:'Dövriyyə planı', planned_profit:'Mənfəət planı',
    expense_breakdown:'Xərclər maddələr üzrə', current_result:'Cari fakt', gross_profit:'Brüt mənfəət', total_expenses:'Xərclər',
    tax_amount:'Vergi', net_profit:'Xalis mənfəət', profitable:'Filial mənfəətlidir', loss:'Filial zərərlə işləyir', comparison:'Müqayisə',
    prev_month_revenue:'Keçən ayın dövriyyəsi', revenue_change_pct:'Dövriyyə dəyişikliyi', profit_change_pct:'Mənfəət dəyişikliyi',
    margins:'Marjalar', expense_pct:'Xərclər %', net_margin:'Xalis mənfəət marjası', plan_status:'Plan',
    revenue_plan_progress:'Dövriyyə planının icrası', profit_plan_progress:'Mənfəət planının icrası', module_coming:'Bölmə növbəti mərhələdə əlavə olunacaq.',
    settings_subtitle:'İstifadəçilər, giriş hüquqları və rejimlər', users_management:'İstifadəçilər', add_user:'+ İstifadəçi',
    role:'Rol', sections_access:'Bölmələrə giriş', access_mode:'Rejim', administrator:'Administrator', employee:'Əməkdaş',
    read_only:'Yalnız oxuma', edit_mode:'Dəyişiklik', permission_denied:'Bu bölməyə giriş yoxdur', new_expense:'Yeni xərc maddəsi', save:'Yadda saxla', saved:'Saxlanıldı', loading:'Yüklənir...', profile:'Cari istifadəçi profili', full_name:'Ad', create_admin:'Admin profil yarat',
    months:['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
  }
}

const SECTIONS = [
  { id: 'dashboard', key: 'dashboard_tab' },
  { id: 'revenue', key: 'revenue_tab' },
  { id: 'finance', key: 'finance_tab' },
  { id: 'recipes', key: 'recipes_tab' },
  { id: 'salaries', key: 'salaries_tab' },
  { id: 'attendance', key: 'attendance_tab' },
  { id: 'advances', key: 'advances_tab' },
  { id: 'suppliers', key: 'suppliers_tab' },
  { id: 'debts', key: 'debts_payments_tab' },
  { id: 'settings', key: 'settings_tab' }
]

const ACCESS_LEVELS = ['none', 'read', 'edit', 'admin']
const THEMES = [
  { id: 'classic', name: 'Классический' },
  { id: 'modern', name: 'Современный' }
]
const accessRank = (value) => ACCESS_LEVELS.indexOf(value || 'none')
const canReadAccess = (value) => accessRank(value) >= accessRank('read')

const fmt = (n) => Number(n || 0).toFixed(2)
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`
const parseNum = (v) => Number(String(v ?? '0').replace(',', '.').replace(/\s/g, '')) || 0
const todayISO = () => new Date().toISOString().slice(0, 10)
const ADVANCE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000
const canEditAdvance = (row) => row?.created_at ? (Date.now() - new Date(row.created_at).getTime()) <= ADVANCE_EDIT_WINDOW_MS : true
const formatDT = (value) => value ? new Date(value).toLocaleString() : '—'
const calcDailyRate = (emp) => {
  const type = emp?.salary_type || 'monthly'
  return type === 'daily' ? parseNum(emp?.daily_rate) : parseNum(emp?.monthly_salary) / 26
}
const calcGrossSalary = (emp, workedDays) => {
  const type = emp?.salary_type || 'monthly'
  if (type === 'monthly') return parseNum(emp?.monthly_salary)
  return calcDailyRate(emp) * parseNum(workedDays)
}
const monthKeyFromDate = (date) => date.slice(0, 7)
const monthStart = (year, month) => `${year}-${String(month).padStart(2, '0')}-01`
const daysInMonth = (year, month) => new Date(Number(year), Number(month), 0).getDate()
const prevMonth = (year, month) => {
  let y = Number(year)
  let m = Number(month) - 1
  if (m < 1) { m = 12; y -= 1 }
  return { year: y, month: m }
}
const defaultYears = () => {
  const cy = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => cy - 3 + i)
}

const STAFF_GROUP_MANAGERS = '__managers'
const STAFF_POSITION_GROUPS = ['Менеджеры', 'Бар', 'Повар', 'Стьюарт', 'Другое']
const STAFF_POSITIONS = ['Повар', 'Бар', 'Стьюард', 'Менеджер']
const employeeGroupId = (emp) => emp?.branch_id || STAFF_GROUP_MANAGERS
const employeeGroupName = (emp) => emp?.branches?.name || 'Менеджеры'
const staffGroupOptions = (branches) => [{ id: STAFF_GROUP_MANAGERS, name: 'Менеджеры' }, ...branches]
const positionGroup = (position) => {
  const p = String(position || '').toLowerCase()
  if (p.includes('менедж') || p.includes('закуп') || p.includes('smm') || p.includes('шеф-бар') || p.includes('шеф-повар')) return 'Менеджеры'
  if (p.includes('бар') || p.includes('сервис') || p.includes('servis') || p.includes('service')) return 'Бар'
  if (p.includes('повар') || p.includes('кух') || p.includes('chef')) return 'Повар'
  if (p.includes('стю') || p.includes('стью') || p.includes('stew')) return 'Стьюарт'
  return 'Другое'
}
const matchesStaffGroup = (emp, groupId) => groupId === 'all' || employeeGroupId(emp) === groupId
const matchesPositionGroup = (emp, group) => group === 'all' || positionGroup(emp?.position) === group

function useLang() {
  const [lang, setLangState] = useState(localStorage.getItem('nms_lang') || 'ru')
  const setLang = (value) => {
    localStorage.setItem('nms_lang', value)
    setLangState(value)
  }
  return [lang, setLang, (key) => I18N[lang]?.[key] || I18N.ru[key] || key]
}

function App() {
  const [lang, setLang, t] = useLang()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [theme, setThemeState] = useState(localStorage.getItem('nms_theme') || 'classic')
  const [section, setSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setTheme = (value) => {
    const next = value || 'classic'
    localStorage.setItem('nms_theme', next)
    setThemeState(next)
  }

  useEffect(() => {
    document.documentElement.dataset.nmsTheme = theme
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) { setProfile(null); setPermissions([]); return }
      const [{ data: prof }, { data: perms }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle(),
        supabase.from('user_permissions').select('*').eq('user_id', session.user.id)
      ])
      setProfile(prof)
      setPermissions(perms || [])
      if (prof?.ui_theme) setTheme(prof.ui_theme)
    }
    loadProfile()
  }, [session])

  const isAdmin = !profile || profile?.role === 'admin'
  const sectionAccess = (sectionId) => {
    if (isAdmin) return 'admin'
    const row = permissions.find(p => p.section === sectionId)
    return row?.access || 'none'
  }
  const visibleSections = SECTIONS.filter(s => canReadAccess(sectionAccess(s.id)))
  const currentAccess = sectionAccess(section)

  useEffect(() => {
    if (!visibleSections.length) return
    if (!canReadAccess(sectionAccess(section))) setSection(visibleSections[0].id)
  }, [permissions, profile, section])

  if (loading) return <div className="login-screen"><div className="login-card">{t('loading')}</div></div>
  if (!session) return <Login lang={lang} setLang={setLang} t={t} />

  return (
    <div className={`app ${theme === 'modern' ? 'theme-modern' : 'theme-classic'}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">NMS</div>
          <div>
            <h1>{t('system_short_title')}</h1>
            <p>{t('brand_subtitle')}</p>
          </div>
        </div>

        <nav className="nav-tabs">
          {visibleSections.map(s => (
            <button key={s.id} className={`nav ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>{t(s.key)}</button>
          ))}
        </nav>

        <div className="userbar">
          <span>{profile?.full_name || profile?.login_name || session.user.email}</span>
          <button className="ghost small" onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
        </div>
      </aside>

      <main className={`main ${currentAccess === 'read' ? 'readonly-mode' : ''}`}>
        <DashboardStyles />
        <ThemeStyles />
        {currentAccess === 'read' && <div className="readonly-banner">Режим просмотра: редактирование этого раздела отключено.</div>}
        {section === 'dashboard' && <Dashboard t={t} />}
        {section === 'revenue' && <Revenue t={t} />}
        {section === 'finance' && <Finance t={t} lang={lang} />}
        {section === 'recipes' && <Recipes t={t} />}
        {section === 'salaries' && <Salaries t={t} />}
        {section === 'attendance' && <Attendance t={t} />}
        {section === 'advances' && <Advances t={t} />}
        {section === 'suppliers' && <Suppliers t={t} />}
        {section === 'debts' && <DebtsPayments t={t} />}
        {section === 'settings' && <Settings session={session} t={t} theme={theme} setTheme={setTheme} />}
      </main>
    </div>
  )
}

function normalizeLogin(login) {
  const value = String(login || '').trim().toLowerCase()
  if (!value) return ''
  return value.includes('@') ? value : `${value}@nms.local.az`
}

function Login({ lang, setLang, t }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setError('')
    const email = normalizeLogin(login)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(t('login_error'))
  }

  return <div className="login-screen"><div className="login-card">
    <div className="login-logo">NMS</div>
    <h1>{t('system_title')}</h1>
    <p>{t('login_hint')}</p>
    <label><span>{t('language_label')}</span><select value={lang} onChange={e => setLang(e.target.value)}><option value="ru">Русский</option><option value="az">Azərbaycan</option></select></label>
    <label><span>{t('login_label')}</span><input value={login} onChange={e => setLogin(e.target.value)} placeholder="nigar" autoComplete="username" /></label>
    <label><span>{t('password_label')}</span><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
    <label className="checkbox-row"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> {t('show_password')}</label>
    {error && <p className="bad">{error}</p>}
    <button className="primary" onClick={signIn}>{t('login_button')}</button>
  </div></div>
}

function useBranches() {
  const [branches, setBranches] = useState([])
  useEffect(() => {
    supabase.from('branches').select('*').eq('is_active', true).order('name').then(({ data }) => setBranches(data || []))
  }, [])
  return branches
}

function Revenue({ t }) {
  const branches = useBranches()
  const [branchId, setBranchId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [form, setForm] = useState({ cash_amount: '', bank_amount: '', wolt_amount: '', comment: '' })
  const [inflowForm, setInflowForm] = useState({ amount: '', source: '', comment: '' })
  const [cashForm, setCashForm] = useState({ opening_cash: '', counted_cash: '', comment: '' })
  const [serviceForm, setServiceForm] = useState({ enabled: false, service_percent: '10', staff_cost_percent: '4' })
  const [cashRow, setCashRow] = useState(null)
  const [revenueEntries, setRevenueEntries] = useState([])
  const [expenses, setExpenses] = useState([])
  const [advanceExpenses, setAdvanceExpenses] = useState([])
  const [inflows, setInflows] = useState([])
  const [categories, setCategories] = useState([])
  const [monthStats, setMonthStats] = useState({ cash: 0, bank: 0, wolt: 0, revenue: 0, expenses: 0, inflows: 0, serviceCharge: 0, serviceCost: 0 })
  const [logs, setLogs] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => { if (!branchId && branches[0]) setBranchId(branches[0].id) }, [branches, branchId])
  useEffect(() => { load() }, [branchId, date])

  async function currentUserMeta() {
    const { data } = await supabase.auth.getUser()
    return { user_id: data?.user?.id || null, user_email: data?.user?.email || null }
  }

  async function writeLog({ entity_type, record_id, action, field_name = null, old_value = null, new_value = null }) {
    if (!branchId || !record_id) return
    const user = await currentUserMeta()
    await supabase.from('finance_operation_log').insert({ entity_type, record_id, branch_id: branchId, operation_date: date, action, field_name, old_value: old_value == null ? null : String(old_value), new_value: new_value == null ? null : String(new_value), ...user })
  }

  async function recalcDailyRevenueAggregate(activeBranchId = branchId, activeDate = date) {
    if (!activeBranchId) return
    const { data: rows } = await supabase.from('daily_revenue_entries').select('cash_amount, bank_amount, wolt_amount').eq('branch_id', activeBranchId).eq('revenue_date', activeDate).is('deleted_at', null)
    const cash = (rows || []).reduce((s, r) => s + parseNum(r.cash_amount), 0)
    const bank = (rows || []).reduce((s, r) => s + parseNum(r.bank_amount), 0)
    const wolt = (rows || []).reduce((s, r) => s + parseNum(r.wolt_amount), 0)
    const user = await currentUserMeta()
    await supabase.from('daily_revenue').upsert({ branch_id: activeBranchId, revenue_date: activeDate, cash_amount: cash, bank_amount: bank, wolt_amount: wolt, comment: 'Автосумма из строк выручки', updated_by: user.user_id, deleted_at: null, deleted_by: null }, { onConflict: 'branch_id,revenue_date' })
  }

  async function load() {
    if (!branchId) return
    const { data: revEntries } = await supabase.from('daily_revenue_entries').select('*').eq('branch_id', branchId).eq('revenue_date', date).order('created_at')
    setRevenueEntries(revEntries || [])
    const { data: cash } = await supabase.from('daily_cash_register').select('*').eq('branch_id', branchId).eq('cash_date', date).maybeSingle()
    let openingCash = cash?.opening_cash ?? ''
    if (!cash) {
      const { data: prevCash } = await supabase
        .from('daily_cash_register')
        .select('closing_cash,counted_cash,cash_date')
        .eq('branch_id', branchId)
        .lt('cash_date', date)
        .order('cash_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      openingCash = prevCash ? (prevCash.counted_cash ?? prevCash.closing_cash ?? '') : ''
    }
    setCashRow(cash || null)
    setCashForm({ opening_cash: openingCash, counted_cash: cash?.counted_cash ?? '', comment: cash?.comment ?? '' })
    const { data: activeBranch } = await supabase
      .from('branches')
      .select('id, service_charge_enabled, service_charge_percent, service_staff_cost_percent')
      .eq('id', branchId)
      .maybeSingle()
    setServiceForm({
      enabled: Boolean(activeBranch?.service_charge_enabled),
      service_percent: activeBranch?.service_charge_percent ?? '10',
      staff_cost_percent: activeBranch?.service_staff_cost_percent ?? '4'
    })
    const { data: exp } = await supabase.from('daily_expenses').select('*, expense_categories(name)').eq('branch_id', branchId).eq('expense_date', date).order('created_at')
    setExpenses(exp || [])
    const { data: advExp } = await supabase
      .from('salary_advances')
      .select('*, employees(full_name, position), branches(name)')
      .eq('branch_id', branchId)
      .eq('advance_date', date)
      .or('is_cancelled.is.null,is_cancelled.eq.false')
      .order('created_at')
    setAdvanceExpenses(advExp || [])
    const { data: inc } = await supabase.from('daily_cash_inflows').select('*').eq('branch_id', branchId).eq('inflow_date', date).order('created_at')
    setInflows(inc || [])
    const { data: cats } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name')
    setCategories(cats || [])
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  async function loadLogs(activeBranchId = branchId, activeDate = date) {
    if (!activeBranchId) return
    const { data } = await supabase.from('finance_operation_log').select('*').eq('branch_id', activeBranchId).eq('operation_date', activeDate).order('created_at', { ascending: false }).limit(250)
    setLogs(data || [])
  }

  async function loadMonthStats(activeBranchId = branchId, activeDate = date) {
    if (!activeBranchId) return
    const ym = monthKeyFromDate(activeDate)
    const start = `${ym}-01`
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 1).toISOString().slice(0, 10)
    const [{ data: monthRows }, { data: expRows }, { data: advRows }, { data: inflowRows }, { data: svcRows }] = await Promise.all([
      supabase.from('daily_revenue').select('*').eq('branch_id', activeBranchId).gte('revenue_date', start).lt('revenue_date', end).is('deleted_at', null),
      supabase.from('daily_expenses').select('amount').eq('branch_id', activeBranchId).gte('expense_date', start).lt('expense_date', end).is('deleted_at', null),
      supabase.from('salary_advances').select('amount').eq('branch_id', activeBranchId).gte('advance_date', start).lt('advance_date', end).or('is_cancelled.is.null,is_cancelled.eq.false'),
      supabase.from('daily_cash_inflows').select('amount').eq('branch_id', activeBranchId).gte('inflow_date', start).lt('inflow_date', end).is('deleted_at', null),
      supabase.from('monthly_branch_service_charge_cost').select('*').eq('branch_id', activeBranchId).eq('month', start)
    ])
    const cash = (monthRows || []).reduce((s, r) => s + parseNum(r.cash_amount), 0)
    const bank = (monthRows || []).reduce((s, r) => s + parseNum(r.bank_amount), 0)
    const wolt = (monthRows || []).reduce((s, r) => s + parseNum(r.wolt_amount), 0)
    const expenses = (expRows || []).reduce((s, r) => s + parseNum(r.amount), 0) + (advRows || []).reduce((s, r) => s + parseNum(r.amount), 0)
    const inflows = (inflowRows || []).reduce((s, r) => s + parseNum(r.amount), 0)
    const serviceCharge = (svcRows || []).reduce((s, r) => s + parseNum(r.service_charge_amount), 0)
    const serviceCost = (svcRows || []).reduce((s, r) => s + parseNum(r.staff_cost_amount), 0)
    setMonthStats({ cash, bank, wolt, revenue: cash + bank + wolt, expenses, inflows, serviceCharge, serviceCost })
  }

  async function addRevenueEntry() {
    if (!branchId) return
    setMessage('')
    const total = parseNum(form.cash_amount) + parseNum(form.bank_amount) + parseNum(form.wolt_amount)
    if (!total && !form.comment.trim()) return setMessage('Введите сумму или комментарий')
    const user = await currentUserMeta()
    const payload = { branch_id: branchId, revenue_date: date, cash_amount: parseNum(form.cash_amount), bank_amount: parseNum(form.bank_amount), wolt_amount: parseNum(form.wolt_amount), comment: form.comment || null, created_by: user.user_id, updated_by: user.user_id }
    const { data, error } = await supabase.from('daily_revenue_entries').insert(payload).select('*').single()
    if (error) return setMessage(error.message)
    await writeLog({ entity_type: 'revenue', record_id: data.id, action: 'create', field_name: 'daily_revenue_entry', old_value: null, new_value: fmt(total) })
    await recalcDailyRevenueAggregate(branchId, date)
    setForm({ cash_amount: '', bank_amount: '', wolt_amount: '', comment: '' })
    await load()
    setMessage('Выручка добавлена и зафиксирована ниже')
  }

  async function updateRevenueEntry(id, patch) {
    const current = revenueEntries.find(r => r.id === id)
    if (!current || current.deleted_at) return
    setRevenueEntries(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    const user = await currentUserMeta()
    const { error } = await supabase.from('daily_revenue_entries').update({ ...patch, updated_by: user.user_id }).eq('id', id)
    if (error) return setMessage(error.message)
    for (const [field, value] of Object.entries(patch)) {
      const before = current[field] ?? ''
      const after = value ?? ''
      if (String(before) !== String(after)) await writeLog({ entity_type: 'revenue', record_id: id, action: 'field_update', field_name: field, old_value: before, new_value: after })
    }
    await recalcDailyRevenueAggregate(branchId, date)
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  async function cancelRevenueEntry(id) {
    const current = revenueEntries.find(r => r.id === id)
    if (!current || current.deleted_at) return
    const user = await currentUserMeta()
    const payload = { deleted_at: new Date().toISOString(), deleted_by: user.user_id, updated_by: user.user_id }
    setRevenueEntries(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r))
    const { error } = await supabase.from('daily_revenue_entries').update(payload).eq('id', id)
    if (error) return setMessage(error.message)
    const total = parseNum(current.cash_amount) + parseNum(current.bank_amount) + parseNum(current.wolt_amount)
    await writeLog({ entity_type: 'revenue', record_id: id, action: 'cancel', field_name: 'daily_revenue_entry', old_value: fmt(total), new_value: '0' })
    await recalcDailyRevenueAggregate(branchId, date)
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  async function saveCashRegister() {
    if (!branchId) return
    const user = await currentUserMeta()
    const calculatedClosingCash = parseNum(cashForm.opening_cash) + dailyCashRevenue + dailyInflowTotal - dailyExpenseTotal
    const payload = {
      branch_id: branchId,
      cash_date: date,
      opening_cash: parseNum(cashForm.opening_cash),
      closing_cash: calculatedClosingCash,
      counted_cash: parseNum(cashForm.counted_cash),
      comment: cashForm.comment || null,
      updated_by: user.user_id,
      created_by: cashRow?.created_by || user.user_id
    }
    const { data, error } = await supabase.from('daily_cash_register').upsert(payload, { onConflict: 'branch_id,cash_date' }).select('*').single()
    if (error) return setMessage(error.message)
    await writeLog({
      entity_type: 'cash',
      record_id: data.id,
      action: cashRow ? 'update' : 'create',
      field_name: 'cash_register',
      old_value: cashRow ? `${cashRow.opening_cash}/${cashRow.closing_cash}/${cashRow.counted_cash ?? ''}` : null,
      new_value: `${data.opening_cash}/${data.closing_cash}/${data.counted_cash ?? ''}`
    })
    setCashRow(data)
    await loadLogs(branchId, date)
    setMessage('Касса сохранена и зафиксирована в журнале')
  }

  async function saveServiceCharge() {
    if (!branchId) return
    const activeBranch = branches.find(b => b.id === branchId)
    const payload = {
      service_charge_enabled: Boolean(serviceForm.enabled),
      service_charge_percent: parseNum(serviceForm.service_percent),
      service_staff_cost_percent: parseNum(serviceForm.staff_cost_percent)
    }
    const { error } = await supabase.from('branches').update(payload).eq('id', branchId)
    if (error) return setMessage(error.message)
    await writeLog({
      entity_type: 'service_charge',
      record_id: branchId,
      action: 'update',
      field_name: 'service_charge_settings',
      old_value: activeBranch ? `${activeBranch.service_charge_enabled}/${activeBranch.service_charge_percent}/${activeBranch.service_staff_cost_percent}` : null,
      new_value: `${payload.service_charge_enabled}/${payload.service_charge_percent}/${payload.service_staff_cost_percent}`
    })
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
    setMessage('Настройка service charge сохранена для выбранного филиала')
  }

  async function addExpense() {
    if (!branchId) return
    const user = await currentUserMeta()
    const category = categories[0]
    const { data, error } = await supabase.from('daily_expenses').insert({ branch_id: branchId, expense_date: date, category_id: category?.id || null, custom_category: category ? null : t('new_expense'), amount: 0, created_by: user.user_id, updated_by: user.user_id }).select('*, expense_categories(name)').single()
    if (error) return setMessage(error.message)
    await writeLog({ entity_type: 'expense', record_id: data.id, action: 'create', field_name: 'expense', old_value: null, new_value: category?.name || t('new_expense') })
    await load()
  }

  async function updateExpense(id, patch) {
    const current = expenses.find(e => e.id === id)
    if (!current || current.deleted_at) return
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    const user = await currentUserMeta()
    const { error } = await supabase.from('daily_expenses').update({ ...patch, updated_by: user.user_id }).eq('id', id)
    if (error) return setMessage(error.message)
    for (const [field, value] of Object.entries(patch)) {
      const before = current[field] ?? ''
      const after = value ?? ''
      if (String(before) !== String(after)) await writeLog({ entity_type: 'expense', record_id: id, action: 'field_update', field_name: field, old_value: before, new_value: after })
    }
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  async function cancelExpense(id) {
    const current = expenses.find(e => e.id === id)
    if (!current || current.deleted_at) return
    const user = await currentUserMeta()
    const payload = { deleted_at: new Date().toISOString(), deleted_by: user.user_id, updated_by: user.user_id }
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...payload } : e))
    const { error } = await supabase.from('daily_expenses').update(payload).eq('id', id)
    if (error) return setMessage(error.message)
    await writeLog({ entity_type: 'expense', record_id: id, action: 'cancel', field_name: 'expense', old_value: current.amount, new_value: '0' })
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  async function addInflow() {
    if (!branchId) return
    setMessage('')
    const amount = parseNum(inflowForm.amount)
    if (!amount && !inflowForm.source.trim() && !inflowForm.comment.trim()) return setMessage('Введите сумму, источник или комментарий прихода')
    const user = await currentUserMeta()
    const payload = { branch_id: branchId, inflow_date: date, source: inflowForm.source || null, amount, comment: inflowForm.comment || null, created_by: user.user_id, updated_by: user.user_id }
    const { data, error } = await supabase.from('daily_cash_inflows').insert(payload).select('*').single()
    if (error) return setMessage(error.message)
    await writeLog({ entity_type: 'inflow', record_id: data.id, action: 'create', field_name: 'cash_inflow', old_value: null, new_value: fmt(amount) })
    setInflowForm({ amount: '', source: '', comment: '' })
    await load()
    setMessage('Приход добавлен и зафиксирован ниже')
  }

  async function updateInflow(id, patch) {
    const current = inflows.find(i => i.id === id)
    if (!current || current.deleted_at) return
    setInflows(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    const user = await currentUserMeta()
    const { error } = await supabase.from('daily_cash_inflows').update({ ...patch, updated_by: user.user_id }).eq('id', id)
    if (error) return setMessage(error.message)
    for (const [field, value] of Object.entries(patch)) {
      const before = current[field] ?? ''
      const after = value ?? ''
      if (String(before) !== String(after)) await writeLog({ entity_type: 'inflow', record_id: id, action: 'field_update', field_name: field, old_value: before, new_value: after })
    }
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  async function cancelInflow(id) {
    const current = inflows.find(i => i.id === id)
    if (!current || current.deleted_at) return
    const user = await currentUserMeta()
    const payload = { deleted_at: new Date().toISOString(), deleted_by: user.user_id, updated_by: user.user_id }
    setInflows(prev => prev.map(i => i.id === id ? { ...i, ...payload } : i))
    const { error } = await supabase.from('daily_cash_inflows').update(payload).eq('id', id)
    if (error) return setMessage(error.message)
    await writeLog({ entity_type: 'inflow', record_id: id, action: 'cancel', field_name: 'cash_inflow', old_value: current.amount, new_value: '0' })
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  const activeRevenueEntries = revenueEntries.filter(r => !r.deleted_at)
  const dailyCashRevenue = activeRevenueEntries.reduce((s, r) => s + parseNum(r.cash_amount), 0)
  const dailyBankRevenue = activeRevenueEntries.reduce((s, r) => s + parseNum(r.bank_amount), 0)
  const dailyWoltRevenue = activeRevenueEntries.reduce((s, r) => s + parseNum(r.wolt_amount), 0)
  const dailyRevenueTotal = dailyCashRevenue + dailyBankRevenue + dailyWoltRevenue
  const dailyManualExpenseTotal = expenses.filter(e => !e.deleted_at).reduce((s, e) => s + parseNum(e.amount), 0)
  const dailyAdvanceExpenseTotal = advanceExpenses.reduce((s, e) => s + parseNum(e.amount), 0)
  const dailyExpenseTotal = dailyManualExpenseTotal + dailyAdvanceExpenseTotal
  const dailyInflowTotal = inflows.filter(i => !i.deleted_at).reduce((s, i) => s + parseNum(i.amount), 0)
  const servicePercent = parseNum(serviceForm.service_percent || 10)
  const staffCostPercent = parseNum(serviceForm.staff_cost_percent || 4)
  const serviceBase = serviceForm.enabled && servicePercent > 0 ? dailyRevenueTotal / (1 + servicePercent / 100) : dailyRevenueTotal
  const dailyServiceChargeAmount = serviceForm.enabled && servicePercent > 0 ? dailyRevenueTotal - serviceBase : 0
  const dailyServiceStaffCost = serviceForm.enabled ? serviceBase * staffCostPercent / 100 : 0
  const formRevenueTotal = parseNum(form.cash_amount) + parseNum(form.bank_amount) + parseNum(form.wolt_amount)
  const formServiceBase = serviceForm.enabled && servicePercent > 0 ? formRevenueTotal / (1 + servicePercent / 100) : formRevenueTotal
  const formServiceChargeAmount = serviceForm.enabled && servicePercent > 0 ? formRevenueTotal - formServiceBase : 0
  const formServiceStaffCost = serviceForm.enabled ? formServiceBase * staffCostPercent / 100 : 0
  const calculatedClosingCash = parseNum(cashForm.opening_cash) + dailyCashRevenue + dailyInflowTotal - dailyExpenseTotal
  const cashDifference = parseNum(cashForm.counted_cash) - calculatedClosingCash

  return (
    <section id="revenuePage">
      <section className="topbar"><div><h2>{t('revenue_tab')}</h2><p>{t('revenue_subtitle')}</p></div></section>
      <section className="grid">
        <div className="card span-2"><div className="card-head"><h3>{t('period_branch')}</h3></div><div className="form-grid">
          <label><span>{t('branch_select')}</span><select value={branchId} onChange={e => setBranchId(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>{t('date')}</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        </div></div>

        <div className="card span-2"><div className="card-head"><div><h3>{t('daily_revenue_title')}</h3><p className="hint">Кнопка “Добавить” создаёт строку выручки ниже. Любые изменения фиксируются в журнале операций.</p></div><button className="small primary" onClick={addRevenueEntry}>Добавить</button></div><div className="form-grid">
          <MoneyInput label={t('cash')} value={form.cash_amount} onChange={v => setForm(f => ({ ...f, cash_amount: v }))} />
          <MoneyInput label={t('bank')} value={form.bank_amount} onChange={v => setForm(f => ({ ...f, bank_amount: v }))} />
          <MoneyInput label={t('wolt')} value={form.wolt_amount} onChange={v => setForm(f => ({ ...f, wolt_amount: v }))} />
          <label><span>{t('comment')}</span><input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} /></label>
          <label><span>Service charge в этой строке</span><input value={serviceForm.enabled ? fmt(formServiceChargeAmount) : '0.00'} readOnly /></label>
          <label><span>Затраты персоналу</span><input value={serviceForm.enabled ? fmt(formServiceStaffCost) : '0.00'} readOnly /></label>
        </div>{message && <p className="hint">{message}</p>}
          <div className="table-wrap" style={{marginTop:14}}><table><thead><tr><th>{t('cash')}</th><th>{t('bank')}</th><th>{t('wolt')}</th><th>{t('comment')}</th><th>Итого</th><th>Service персоналу</th><th>Статус</th><th></th></tr></thead><tbody>
            {revenueEntries.map(r => <RevenueEntryRow key={r.id} row={r} serviceEnabled={serviceForm.enabled} servicePercent={servicePercent} staffCostPercent={staffCostPercent} onSave={patch => updateRevenueEntry(r.id, patch)} onCancel={() => cancelRevenueEntry(r.id)} />)}
            {!revenueEntries.length && <tr><td colSpan="8" className="hint">Пока нет добавлений</td></tr>}
          </tbody></table></div>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>{t('daily_expenses_title')}</h3><p className="hint">Изменения суммы, статьи и комментария фиксируются ниже. Отмена перечёркивает строку и исключает её из расчётов.</p></div><button className="small" onClick={addExpense}>+ Добавить</button></div>
          <div className="form-grid compact"><label><span>{t('daily_expenses_total')}</span><input value={fmt(dailyExpenseTotal)} readOnly /></label></div>
          <div className="table-wrap"><table><thead><tr><th>{t('expense_item')}</th><th>{t('amount')}</th><th>{t('comment')}</th><th>Статус</th><th></th></tr></thead><tbody>
            {expenses.map(e => <ExpenseRow key={e.id} expense={e} categories={categories} onSave={patch => updateExpense(e.id, patch)} onCancel={() => cancelExpense(e.id)} />)}
            {advanceExpenses.map(a => <AdvanceExpenseRow key={`adv-${a.id}`} advance={a} />)}
            {!expenses.length && !advanceExpenses.length && <tr><td colSpan="5" className="hint">—</td></tr>}
          </tbody></table></div>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Приходы за выбранную дату</h3><p className="hint">Деньги извне: возврат подотчёта, пополнение кассы, личное внесение, прочие наличные поступления. Отмена перечёркивает строку и исключает её из кассы.</p></div><button className="small primary" onClick={addInflow}>+ Добавить</button></div>
          <div className="form-grid">
            <MoneyInput label="Сумма прихода" value={inflowForm.amount} onChange={v => setInflowForm(f => ({ ...f, amount: v }))} />
            <label><span>Источник</span><input value={inflowForm.source} onChange={e => setInflowForm(f => ({ ...f, source: e.target.value }))} placeholder="Например: возврат, пополнение кассы" /></label>
            <label><span>{t('comment')}</span><input value={inflowForm.comment} onChange={e => setInflowForm(f => ({ ...f, comment: e.target.value }))} /></label>
          </div>
          <div className="form-grid compact" style={{marginTop:12}}><label><span>Итого приходов за дату</span><input value={fmt(dailyInflowTotal)} readOnly /></label></div>
          <div className="table-wrap"><table><thead><tr><th>Источник</th><th>{t('amount')}</th><th>{t('comment')}</th><th>Статус</th><th></th></tr></thead><tbody>
            {inflows.map(i => <InflowRow key={i.id} inflow={i} onSave={patch => updateInflow(i.id, patch)} onCancel={() => cancelInflow(i.id)} />)}
            {!inflows.length && <tr><td colSpan="5" className="hint">—</td></tr>}
          </tbody></table></div>
        </div>

        <div className="card span-2"><h3>Касса за день</h3><p className="hint">Только наличные: касса на начало + наличная выручка + приходы − расходы. Сумма конца дня автоматически переходит на начало следующего дня.</p>
          <div className="form-grid">
            <MoneyInput label="Касса на начало дня" value={cashForm.opening_cash} onChange={v => setCashForm(f => ({ ...f, opening_cash: v }))} />
            <label><span>Касса конец дня</span><input value={fmt(calculatedClosingCash)} readOnly /></label>
            <MoneyInput label="Сверка / на руках" value={cashForm.counted_cash} onChange={v => setCashForm(f => ({ ...f, counted_cash: v }))} />
            <label><span>Расхождение</span><input className={Math.abs(cashDifference) > 0.009 ? 'bad' : 'good'} value={fmt(cashDifference)} readOnly /></label>
            <label><span>{t('comment')}</span><input value={cashForm.comment} onChange={e => setCashForm(f => ({ ...f, comment: e.target.value }))} /></label>
          </div>
          <div className="row-actions" style={{marginTop:12}}><button className="small primary" onClick={saveCashRegister}>Сохранить кассу</button></div>
        </div>

        <div className="card span-2"><h3>{t('revenue_summary')}</h3>
          <Metric label="Выручка за дату" value={fmt(dailyRevenueTotal)} />
          <Metric label="Расходы за дату" value={fmt(dailyExpenseTotal)} />
          <Metric label="Приходы за дату — не выручка" value={fmt(dailyInflowTotal)} />
          <Metric label="Service charge внутри выручки" value={fmt(dailyServiceChargeAmount)} />
          <Metric label="Расход персоналу по service charge" value={fmt(dailyServiceStaffCost)} />
          <Metric label="Наличные за дату" value={fmt(dailyCashRevenue)} />
          <Metric label="Банк за дату" value={fmt(dailyBankRevenue)} />
          <Metric label="Wolt за дату" value={fmt(dailyWoltRevenue)} />
          <hr />
          <Metric label="Выручка месяца" value={fmt(monthStats.revenue)} />
          <Metric label="Расходы месяца" value={fmt(monthStats.expenses)} />
          <Metric label="Приходы месяца — не выручка" value={fmt(monthStats.inflows)} />
          <Metric label="Service charge месяца" value={fmt(monthStats.serviceCharge)} />
          <Metric label="Расход персоналу по service charge" value={fmt(monthStats.serviceCost)} />
          <Metric label={t('cash')} value={fmt(monthStats.cash)} />
          <Metric label={t('bank')} value={fmt(monthStats.bank)} />
          <Metric label={t('wolt')} value={fmt(monthStats.wolt)} />
        </div>

        <div className="card span-2"><h3>Журнал подтверждённых операций</h3><p className="hint">Каждое создание, изменение и отмена по выбранной дате фиксируется с временем и пользователем.</p><div className="table-wrap"><table><thead><tr><th>Время</th><th>Пользователь</th><th>Раздел</th><th>Действие</th><th>Поле</th><th>Было</th><th>Стало</th></tr></thead><tbody>
          {logs.map(l => <tr key={l.id} className={l.action === 'cancel' ? 'cancelled-row' : ''}><td>{formatDT(l.created_at)}</td><td>{l.user_email || l.user_id || '—'}</td><td>{entityLabel(l.entity_type)}</td><td>{operationLabel(l.action)}</td><td>{fieldLabel(l.field_name)}</td><td>{l.old_value || '—'}</td><td>{l.new_value || '—'}</td></tr>)}
          {!logs.length && <tr><td colSpan="7" className="hint">Пока нет операций</td></tr>}
        </tbody></table></div></div>
      </section>
    </section>
  )
}

function RevenueEntryRow({ row, serviceEnabled=false, servicePercent=10, staffCostPercent=4, onSave, onCancel }) {
  const [cash, setCash] = useState(row.cash_amount ?? '')
  const [bank, setBank] = useState(row.bank_amount ?? '')
  const [wolt, setWolt] = useState(row.wolt_amount ?? '')
  const [comment, setComment] = useState(row.comment || '')
  const cancelled = Boolean(row.deleted_at)

  useEffect(() => setCash(row.cash_amount ?? ''), [row.id, row.cash_amount])
  useEffect(() => setBank(row.bank_amount ?? ''), [row.id, row.bank_amount])
  useEffect(() => setWolt(row.wolt_amount ?? ''), [row.id, row.wolt_amount])
  useEffect(() => setComment(row.comment || ''), [row.id, row.comment])

  const save = (field, value) => { if (!cancelled) onSave({ [field]: field === 'comment' ? value : parseNum(value) }) }
  const total = parseNum(cash) + parseNum(bank) + parseNum(wolt)
  const base = serviceEnabled && servicePercent > 0 ? total / (1 + servicePercent / 100) : total
  const staffCost = serviceEnabled ? base * staffCostPercent / 100 : 0

  return <tr className={cancelled ? 'cancelled-row' : ''}>
    <td><input inputMode="decimal" value={cash} disabled={cancelled} onChange={e => setCash(e.target.value)} onBlur={() => save('cash_amount', cash)} /></td>
    <td><input inputMode="decimal" value={bank} disabled={cancelled} onChange={e => setBank(e.target.value)} onBlur={() => save('bank_amount', bank)} /></td>
    <td><input inputMode="decimal" value={wolt} disabled={cancelled} onChange={e => setWolt(e.target.value)} onBlur={() => save('wolt_amount', wolt)} /></td>
    <td><input value={comment} disabled={cancelled} onChange={e => setComment(e.target.value)} onBlur={() => save('comment', comment)} /></td>
    <td><b>{fmt(total)}</b></td>
    <td><b>{fmt(staffCost)}</b></td>
    <td>{cancelled ? `Отменено · ${formatDT(row.deleted_at)}` : 'Активно'}</td>
    <td>{cancelled ? <span className="hint">—</span> : <button className="remove" onClick={onCancel}>×</button>}</td>
  </tr>
}

function entityLabel(entity) {
  const labels = { revenue: 'Выручка', expense: 'Расход', inflow: 'Приход', cash: 'Касса', service_charge: 'Service charge' }
  return labels[entity] || entity || '—'
}

function operationLabel(action) {
  const labels = { create: 'Создано', update: 'Обновлено', field_update: 'Изменено', cancel: 'Отменено', restore: 'Восстановлено' }
  return labels[action] || action || '—'
}

function fieldLabel(field) {
  const labels = { daily_revenue: 'Выручка за дату', daily_revenue_entry: 'Строка выручки', cash_register: 'Касса за день', cash_inflow: 'Приход', service_charge: 'Service charge', expense: 'Расход', source: 'Источник', cash_amount: 'Наличные', bank_amount: 'Банк', wolt_amount: 'Wolt', comment: 'Комментарий', amount: 'Сумма', category_id: 'Статья', custom_category: 'Своя статья' }
  return labels[field] || field || '—'
}


function InflowRow({ inflow, onSave, onCancel }) {
  const [source, setSource] = useState(inflow.source || '')
  const [amount, setAmount] = useState(inflow.amount ?? '')
  const [comment, setComment] = useState(inflow.comment || '')
  const cancelled = Boolean(inflow.deleted_at)

  useEffect(() => setSource(inflow.source || ''), [inflow.id, inflow.source])
  useEffect(() => setAmount(inflow.amount ?? ''), [inflow.id, inflow.amount])
  useEffect(() => setComment(inflow.comment || ''), [inflow.id, inflow.comment])

  const save = (field, value) => {
    if (cancelled) return
    onSave({ [field]: field === 'amount' ? parseNum(value) : value })
  }

  return (
    <tr className={cancelled ? 'cancelled-row' : ''}>
      <td><input value={source} disabled={cancelled} onChange={e => setSource(e.target.value)} onBlur={() => save('source', source)} /></td>
      <td><input inputMode="decimal" value={amount} disabled={cancelled} onChange={e => setAmount(e.target.value)} onBlur={() => save('amount', amount)} /></td>
      <td><input value={comment} disabled={cancelled} onChange={e => setComment(e.target.value)} onBlur={() => save('comment', comment)} /></td>
      <td>{cancelled ? `Отменено · ${formatDT(inflow.deleted_at)}` : 'Активно'}</td>
      <td>{cancelled ? <span className="hint">—</span> : <button className="remove" onClick={onCancel}>×</button>}</td>
    </tr>
  )
}


function AdvanceExpenseRow({ advance }) {
  const employeeName = advance?.employees?.full_name || 'Сотрудник'
  const comment = advance?.comment ? `Аванс сотруднику · ${advance.comment}` : 'Аванс сотруднику, наличная выплата'
  return (
    <tr className="system-row">
      <td><input value={`Аванс — ${employeeName}`} readOnly /></td>
      <td><input value={fmt(advance.amount)} readOnly /></td>
      <td><input value={comment} readOnly /></td>
      <td>Системная строка</td>
      <td><span className="hint">—</span></td>
    </tr>
  )
}

function ExpenseRow({ expense, categories, onSave, onCancel }) {
  const [amount, setAmount] = useState(expense.amount ?? '')
  const [comment, setComment] = useState(expense.comment || '')
  const cancelled = Boolean(expense.deleted_at)

  useEffect(() => setAmount(expense.amount ?? ''), [expense.id, expense.amount])
  useEffect(() => setComment(expense.comment || ''), [expense.id, expense.comment])

  function saveAmount() {
    if (cancelled) return
    onSave({ amount: parseNum(amount) })
  }

  function saveComment() {
    if (cancelled) return
    onSave({ comment })
  }

  return (
    <tr className={cancelled ? 'cancelled-row' : ''}>
      <td><ExpenseNameInput expense={expense} categories={categories} disabled={cancelled} onChange={onSave} /></td>
      <td><input inputMode="decimal" value={amount} disabled={cancelled} onChange={ev => setAmount(ev.target.value)} onBlur={saveAmount} /></td>
      <td><input value={comment} disabled={cancelled} onChange={ev => setComment(ev.target.value)} onBlur={saveComment} /></td>
      <td>{cancelled ? `Отменено · ${formatDT(expense.deleted_at)}` : 'Активно'}</td>
      <td>{cancelled ? <span className="hint">—</span> : <button className="remove" onClick={onCancel}>×</button>}</td>
    </tr>
  )
}

function ExpenseNameInput({ expense, categories, onChange, disabled = false }) {
  const [custom, setCustom] = useState(expense.custom_category || expense.expense_categories?.name || '')
  useEffect(() => setCustom(expense.custom_category || expense.expense_categories?.name || ''), [expense.id, expense.custom_category, expense.expense_categories?.name])

  if (categories.length) {
    return (
      <select disabled={disabled} value={expense.category_id || '__custom__'} onChange={ev => onChange({ category_id: ev.target.value === '__custom__' ? null : ev.target.value, custom_category: ev.target.value === '__custom__' ? (expense.custom_category || 'Своя статья') : null })}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="__custom__">Своя статья</option>
      </select>
    )
  }
  return <input disabled={disabled} value={custom} onChange={ev => setCustom(ev.target.value)} onBlur={() => onChange({ custom_category: custom || 'Своя статья' })} />
}

function DashboardStyles() {
  return <style>{`
    .dashboard-hero { align-items: center; }
    .dashboard-period { min-width: 320px; grid-template-columns: 1fr 1fr; }
    .dashboard-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .dash-kpi { background: linear-gradient(180deg, #fffaf2, #f8f1e3); border: 1px solid var(--line); border-radius: 22px; padding: 18px; box-shadow: 0 12px 30px rgba(23,37,29,.07); display: flex; flex-direction: column; gap: 8px; min-height: 132px; }
    .dash-kpi span { color: var(--muted); font-size: 13px; font-weight: 700; }
    .dash-kpi strong { font-size: 30px; line-height: 1; color: var(--ink); }
    .dash-kpi em { font-style: normal; color: var(--muted); font-size: 12px; }
    .danger-kpi { border-color: rgba(155,45,45,.25); }
    .dash-bars { display: grid; gap: 11px; }
    .dash-bar-row { display: grid; grid-template-columns: 120px 1fr 90px; gap: 10px; align-items: center; }
    .dash-bar-label { font-weight: 800; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dash-bar-track { height: 13px; border-radius: 999px; background: #efe8da; overflow: hidden; }
    .dash-bar { height: 100%; border-radius: 999px; background: var(--gold); }
    .dash-bar.negative { background: var(--danger); }
    .dash-bar-value { text-align: right; font-weight: 800; font-size: 12px; }
    .dashboard-table th, .dashboard-table td { white-space: nowrap; }
    .dashboard-insight p { line-height: 1.6; }
    .risk-row { background: rgba(155,45,45,.06); }
    .supplier-risk-list { display: grid; gap: 8px; margin-top: 12px; }
    .supplier-risk-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; align-items: start; padding: 10px 12px; border: 1px solid rgba(155,45,45,.18); border-radius: 12px; background: rgba(155,45,45,.05); overflow: hidden; }
    .supplier-risk-row b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .supplier-risk-row span { text-align: right; font-weight: 900; color: var(--danger); white-space: nowrap; }
    .supplier-risk-row em { grid-column: 1 / -1; font-style: normal; color: var(--muted); font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }
    .supplier-risk-summary { display: grid; gap: 8px; }
    .supplier-risk-empty { padding: 12px; border: 1px dashed var(--line); border-radius: 12px; background: rgba(255,255,255,.55); }
    .cancelled-row { opacity: .58; text-decoration: line-through; background: rgba(155,45,45,.07); }
    .cancelled-row input { text-decoration: line-through; }
    .system-row { background: rgba(35,61,44,.05); }
    .system-row input { background: #f6f1e8; color: var(--muted); font-weight: 700; }
    .supplier-entity-group { border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: rgba(255,255,255,.45); margin-bottom: 12px; }
    .supplier-entity-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding: 12px 14px; background:#f4eddf; }
    .supplier-entity-head b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .supplier-compact-table td, .supplier-compact-table th { vertical-align: middle; }
    .supplier-transactions-panel { border: 1px solid var(--line); border-radius: 16px; padding: 14px; background: #fffaf2; }
    @media (max-width: 1200px) { .dashboard-kpi-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
    @media (max-width: 700px) { .dashboard-kpi-grid { grid-template-columns: 1fr; } .dash-bar-row { grid-template-columns: 82px 1fr 78px; } .dashboard-period { min-width: 0; } }
  `}</style>
}

function ThemeStyles() {
  return <style>{`
    .readonly-banner { margin: 0 0 14px; padding: 10px 14px; border-radius: 14px; background: #fff3cd; border: 1px solid #ecd58b; color: #5c4812; font-weight: 800; }
    .readonly-mode .card input, .readonly-mode .card select, .readonly-mode .card textarea, .readonly-mode .card button:not(.allow-read) { pointer-events: none; opacity: .62; }
    .theme-modern { --bg: #eef2f6; --panel: rgba(255,255,255,.92); --ink: #0f172a; --muted: #64748b; --line: #d8e0ea; --accent: #0f766e; --gold: #2dd4bf; --danger: #dc2626; --good: #16a34a; }
    .theme-modern .sidebar { background: linear-gradient(180deg, #0f172a, #111827 58%, #0f766e); box-shadow: 12px 0 35px rgba(15,23,42,.18); }
    .theme-modern .logo, .theme-modern .login-logo { background: linear-gradient(135deg, #2dd4bf, #a7f3d0); color: #042f2e; box-shadow: 0 12px 28px rgba(45,212,191,.28); }
    .theme-modern .main { background: radial-gradient(circle at top left, rgba(45,212,191,.13), transparent 32%), linear-gradient(180deg, #f8fafc, #eef2f6); }
    .theme-modern .card, .theme-modern .dash-kpi { border-color: rgba(148,163,184,.35); background: rgba(255,255,255,.88); box-shadow: 0 18px 46px rgba(15,23,42,.08); backdrop-filter: blur(10px); }
    .theme-modern .nav.active { background: linear-gradient(135deg, #2dd4bf, #a7f3d0); color: #052e2b; box-shadow: 0 10px 24px rgba(45,212,191,.22); }
    .theme-modern input, .theme-modern select, .theme-modern textarea { border-color: #cbd5e1; background: rgba(255,255,255,.95); }
    .permission-grid { display: grid; grid-template-columns: minmax(160px, 1fr) 160px; gap: 10px; align-items: center; }
    .permission-grid b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `}</style>
}

function MiniBarChart({ rows, valueKey = 'revenue', labelKey = 'name', title, subtitle }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(parseNum(r[valueKey]))))
  return <div className="card span-2 dashboard-chart-card">
    <div className="card-head"><div><h3>{title}</h3><p className="hint">{subtitle}</p></div></div>
    <div className="dash-bars">
      {rows.map(r => {
        const val = parseNum(r[valueKey])
        const width = Math.max(3, Math.min(100, Math.abs(val) / max * 100))
        return <div className="dash-bar-row" key={r.id || r[labelKey]}>
          <div className="dash-bar-label">{r[labelKey]}</div>
          <div className="dash-bar-track"><div className={`dash-bar ${val < 0 ? 'negative' : ''}`} style={{width: `${width}%`}} /></div>
          <div className={`dash-bar-value ${val < 0 ? 'bad' : ''}`}>{fmt(val)}</div>
        </div>
      })}
      {!rows.length && <p className="hint">Нет данных для графика.</p>}
    </div>
  </div>
}

function Dashboard({ t }) {
  const TAX_RATE = 8
  const branches = useBranches()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState(null)

  useEffect(() => { load() }, [year, month, branches.length])

  async function calcMonth(y, m) {
    const monthDate = monthStart(y, m)
    const [
      { data: revRows },
      { data: expRows },
      { data: salRows },
      { data: svcRows },
      supplierResult,
      suppliersResult,
      purchasesResult,
      paymentsResult
    ] = await Promise.all([
      supabase.from('monthly_branch_revenue').select('*').eq('month', monthDate),
      supabase.from('monthly_branch_expenses').select('*').eq('month', monthDate),
      supabase.from('monthly_branch_salary').select('*').eq('month', monthDate),
      supabase.from('monthly_branch_service_charge_cost').select('*').eq('month', monthDate),
      supabase.from('supplier_balances_v2').select('*'),
      supabase.from('suppliers').select('id,name,payment_term_days,credit_limit,is_active').eq('is_active', true),
      supabase.from('supplier_purchases').select('id,supplier_id,purchase_date,invoice_number,total_amount,deleted_at').is('deleted_at', null),
      supabase.from('supplier_payments').select('supplier_id,amount')
    ])

    const suppliersRaw = suppliersResult?.data || []
    const purchasesRaw = purchasesResult?.data || []
    const paymentsRaw = paymentsResult?.data || []
    let supplierRows = supplierResult?.data || []

    if (!supplierRows.length || supplierResult?.error) {
      const fallback = await supabase.from('supplier_balances').select('*')
      supplierRows = (fallback.data || []).map(r => ({
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        balance: r.balance
      }))
    }

    const balanceMap = new Map((supplierRows || []).map(r => [r.supplier_id, parseNum(r.balance)]))
    const enrichedSupplierRows = suppliersRaw.map(s => {
      const purchaseTotal = purchasesRaw
        .filter(p => p.supplier_id === s.id)
        .reduce((sum, p) => sum + parseNum(p.total_amount), 0)
      const paymentTotal = paymentsRaw
        .filter(p => p.supplier_id === s.id)
        .reduce((sum, p) => sum + parseNum(p.amount), 0)
      const balance = balanceMap.has(s.id) ? balanceMap.get(s.id) : purchaseTotal - paymentTotal
      return {
        supplier_id: s.id,
        supplier_name: s.name,
        balance,
        payment_term_days: s.payment_term_days,
        credit_limit: s.credit_limit
      }
    })
    const revByBranch = new Map((revRows || []).map(r => [r.branch_id, r]))
    const expByBranch = new Map((expRows || []).map(r => [r.branch_id, r]))
    const salByBranch = new Map((salRows || []).map(r => [r.branch_id, r]))
    const svcByBranch = new Map((svcRows || []).map(r => [r.branch_id, r]))
    const branchRows = branches.map(b => {
      const rev = revByBranch.get(b.id) || {}
      const revenue = parseNum(rev.total_revenue)
      const expenses = parseNum(expByBranch.get(b.id)?.total_expenses)
      const salary = parseNum(salByBranch.get(b.id)?.total_salary)
      const serviceCost = parseNum(svcByBranch.get(b.id)?.staff_cost_amount)
      const tax = revenue * TAX_RATE / 100
      const net = revenue - expenses - salary - serviceCost - tax
      return { id: b.id, name: b.name, revenue, expenses, salary, serviceCost, tax, totalExpenses: expenses + salary + serviceCost + tax, net, margin: revenue ? net / revenue * 100 : 0 }
    })
    const revenue = branchRows.reduce((s, r) => s + r.revenue, 0)
    const expenses = branchRows.reduce((s, r) => s + r.totalExpenses, 0)
    const net = branchRows.reduce((s, r) => s + r.net, 0)
    const todayForDebts = new Date()
    const supplierDebtRowsRaw = (enrichedSupplierRows || [])
      .map(r => {
        const balance = Math.max(0, parseNum(r.balance))
        const limit = parseNum(r.credit_limit)
        const termDays = parseNum(r.payment_term_days)
        const overLimit = limit > 0 && balance > limit ? balance - limit : 0
        const overdueInvoices = termDays > 0 && balance > 0
          ? purchasesRaw
              .filter(p => p.supplier_id === r.supplier_id)
              .filter(p => ((todayForDebts - new Date(p.purchase_date)) / 86400000) > termDays)
              .map(p => p.invoice_number || p.purchase_date)
              .slice(0, 4)
          : []
        const reason = [
          overLimit > 0 ? `превышение лимита: +${fmt(overLimit)} AZN` : '',
          overdueInvoices.length ? `просрочка: ${overdueInvoices.join(', ')}` : ''
        ].filter(Boolean).join(' · ')
        return {
          id: r.supplier_id || r.supplier_name,
          name: r.supplier_name || 'Поставщик',
          value: balance,
          overLimit,
          overdueCount: overdueInvoices.length,
          reason
        }
      })
      .filter(r => r.value > 0 && (r.overLimit > 0 || r.overdueCount > 0))

    const supplierRiskMap = new Map()
    supplierDebtRowsRaw.forEach(r => {
      const key = r.id || r.name
      const prev = supplierRiskMap.get(key)
      if (!prev) supplierRiskMap.set(key, r)
      else supplierRiskMap.set(key, {
        ...prev,
        value: Math.max(prev.value, r.value),
        overLimit: Math.max(prev.overLimit, r.overLimit),
        overdueCount: prev.overdueCount + r.overdueCount,
        reason: [prev.reason, r.reason].filter(Boolean).join(' · ')
      })
    })
    const supplierDebtRows = Array.from(supplierRiskMap.values()).sort((a,b) => b.value - a.value)
    const supplierDebt = supplierDebtRows.reduce((s, r) => s + r.value, 0)
    const d = new Date(Number(y), Number(m) - 1, 1)
    const current = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()
    const passed = current ? now.getDate() : daysInMonth(y, m)
    const avgRevenue = passed ? revenue / passed : 0
    const forecastRevenue = avgRevenue * daysInMonth(y, m)
    const expenseRate = revenue ? expenses / revenue : 0
    const forecastProfit = forecastRevenue - forecastRevenue * expenseRate
    return { revenue, expenses, net, supplierDebt, supplierDebtRows, branchRows, forecastRevenue, forecastProfit }
  }

  async function load() {
    const current = await calcMonth(year, month)
    const pm = prevMonth(year, month)
    const previous = await calcMonth(pm.year, pm.month)
    setData({ ...current, previous })
  }

  if (!data) return <div className="module-placeholder">{t('loading')}</div>
  const revenueChange = data.previous?.revenue ? (data.revenue - data.previous.revenue) / data.previous.revenue * 100 : 0
  const profitChange = data.previous?.net ? (data.net - data.previous.net) / Math.abs(data.previous.net) * 100 : 0
  return <section id="dashboardPage">
    <section className="topbar dashboard-hero"><div><h2>Финансовое состояние сети</h2><p>Выручка, расходы, прибыль, прогноз, динамика и долги поставщикам по всей сети.</p></div><div className="form-grid compact dashboard-period"><label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label><label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label></div></section>
    <section className="dashboard-kpi-grid"><div className="dash-kpi"><span>Выручка сети</span><strong>{fmt(data.revenue)}</strong><em className={revenueChange >= 0 ? 'good' : 'bad'}>{revenueChange >= 0 ? '▲' : '▼'} {pct(Math.abs(revenueChange))} к прошлому месяцу</em></div><div className="dash-kpi"><span>Расходы сети</span><strong>{fmt(data.expenses)}</strong><em>включая зарплаты, service charge и налог 8%</em></div><div className="dash-kpi"><span>Чистая прибыль</span><strong className={data.net >= 0 ? 'good' : 'bad'}>{fmt(data.net)}</strong><em className={profitChange >= 0 ? 'good' : 'bad'}>{profitChange >= 0 ? '▲' : '▼'} {pct(Math.abs(profitChange))} к прошлому месяцу</em></div><div className="dash-kpi"><span>Прогноз прибыли</span><strong className={data.forecastProfit >= 0 ? 'good' : 'bad'}>{fmt(data.forecastProfit)}</strong><em>прогноз до конца месяца</em></div><div className="dash-kpi danger-kpi"><span>Проблемные долги</span><strong>{fmt(data.supplierDebt)}</strong><em>просрочка или превышение лимита</em></div></section>
    <section className="grid dashboard-grid"><MiniBarChart rows={data.branchRows.filter(r => r.revenue || r.net).sort((a,b) => b.revenue - a.revenue)} valueKey="revenue" title="Выручка по филиалам" subtitle="Сравнение филиалов за выбранный месяц" /><MiniBarChart rows={data.branchRows.filter(r => r.revenue || r.net).sort((a,b) => b.net - a.net)} valueKey="net" title="Прибыль по филиалам" subtitle="После расходов, зарплат, service charge и налога" /><div className="card span-2"><div className="card-head"><h3>Сводка по филиалам</h3></div><div className="table-wrap"><table className="dashboard-table"><thead><tr><th>Филиал</th><th>Выручка</th><th>Расходы</th><th>Зарплаты</th><th>Service</th><th>Налог</th><th>Прибыль</th><th>Маржа</th></tr></thead><tbody>{data.branchRows.map(r => <tr key={r.id} className={r.net < 0 ? 'risk-row' : ''}><td><b>{r.name}</b></td><td>{fmt(r.revenue)}</td><td>{fmt(r.expenses)}</td><td>{fmt(r.salary)}</td><td>{fmt(r.serviceCost)}</td><td>{fmt(r.tax)}</td><td className={r.net >= 0 ? 'good' : 'bad'}><b>{fmt(r.net)}</b></td><td>{pct(r.margin)}</td></tr>)}</tbody></table></div></div><div className="card"><div className="card-head"><h3>Проблемные долги поставщикам</h3><p className="hint">Только превышение лимита или просроченные фактуры</p></div>{data.supplierDebtRows?.length ? <div className="supplier-risk-summary"><div className="metric"><span>Проблемная сумма</span><strong className="bad">{fmt(data.supplierDebt)} AZN</strong></div><div className="supplier-risk-list">{data.supplierDebtRows.slice(0, 8).map(r => <div key={r.id || r.name} className="supplier-risk-row"><b title={r.name}>{r.name}</b><span>{fmt(r.value)} AZN</span><em>{r.reason || 'требует проверки'}</em></div>)}</div></div> : <div className="supplier-risk-empty"><p className="hint">Проблемных долгов нет. Обычные долги смотри в разделе “Поставщики”.</p></div>}</div><div className="card span-2 dashboard-insight"><h3>Краткий вывод</h3><p>Сеть сейчас показывает <b className={data.net >= 0 ? 'good' : 'bad'}>{data.net >= 0 ? 'прибыль' : 'убыток'} {fmt(data.net)} AZN</b>. Прогноз до конца месяца: <b>{fmt(data.forecastRevenue)} AZN выручки</b> и <b className={data.forecastProfit >= 0 ? 'good' : 'bad'}>{fmt(data.forecastProfit)} AZN прибыли</b>.</p><p className="hint">Динамика сравнивается с прошлым календарным месяцем. Если нужен “аналогичный период” строго день-в-день, следующим шагом добавим сравнение текущего периода с тем же количеством дней прошлого месяца.</p></div></section>
  </section>
}

function Finance({ t, lang }) {
  const ALL_BRANCHES = '__all__'
  const TAX_RATE = 8
  const branches = useBranches()
  const now = new Date()
  const [branchId, setBranchId] = useState(ALL_BRANCHES)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState(null)
  const [breakdown, setBreakdown] = useState([])

  useEffect(() => { load() }, [branchId, year, month, branches.length])

  async function calcFor(branch, y, m) {
    const monthDate = monthStart(y, m)

    let revQuery = supabase.from('monthly_branch_revenue').select('*').eq('month', monthDate)
    let expQuery = supabase.from('monthly_branch_expenses').select('*').eq('month', monthDate)
    let salQuery = supabase.from('monthly_branch_salary').select('*').eq('month', monthDate)
    let svcQuery = supabase.from('monthly_branch_service_charge_cost').select('*').eq('month', monthDate)

    if (branch !== ALL_BRANCHES) {
      revQuery = revQuery.eq('branch_id', branch)
      expQuery = expQuery.eq('branch_id', branch)
      salQuery = salQuery.eq('branch_id', branch)
      svcQuery = svcQuery.eq('branch_id', branch)
    }

    const [{ data: revRows }, { data: expRows }, { data: salRows }, { data: svcRows }] = await Promise.all([revQuery, expQuery, salQuery, svcQuery])

    const revenue = (revRows || []).reduce((s, r) => s + parseNum(r.total_revenue), 0)
    const expenses = (expRows || []).reduce((s, r) => s + parseNum(r.total_expenses), 0)
    const salary = (salRows || []).reduce((s, r) => s + parseNum(r.total_salary), 0)
    const serviceCost = (svcRows || []).reduce((s, r) => s + parseNum(r.staff_cost_amount), 0)
    const cash = (revRows || []).reduce((s, r) => s + parseNum(r.cash_amount), 0)
    const bank = (revRows || []).reduce((s, r) => s + parseNum(r.bank_amount), 0)
    const wolt = (revRows || []).reduce((s, r) => s + parseNum(r.wolt_amount), 0)

    const tax = revenue * (TAX_RATE / 100)
    const net = revenue - expenses - salary - serviceCost - tax

    const d = new Date(Number(y), Number(m) - 1, 1)
    const current = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()
    const passed = current ? now.getDate() : daysInMonth(y, m)
    const avg = passed ? revenue / passed : 0
    const forecastRevenue = avg * daysInMonth(y, m)
    const costRate = revenue > 0 ? (expenses + salary + serviceCost) / revenue : 0
    const forecastProfit = forecastRevenue - (forecastRevenue * costRate) - (forecastRevenue * TAX_RATE / 100)

    return { revenue, expenses, salary, serviceCost, cash, bank, wolt, tax, gross: revenue, net, avg, forecastRevenue, forecastProfit }
  }

  async function load() {
    if (branchId !== ALL_BRANCHES && !branchId) return

    const monthDate = monthStart(year, month)

    const current = await calcFor(branchId, year, month)
    const pm = prevMonth(year, month)
    const previous = await calcFor(branchId, pm.year, pm.month)
    setStats({ ...current, previous })

    const start = monthDate
    const end = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)
    let expQuery = supabase.from('daily_expenses').select('amount, custom_category, expense_categories(name)').gte('expense_date', start).lt('expense_date', end).is('deleted_at', null)
    if (branchId !== ALL_BRANCHES) expQuery = expQuery.eq('branch_id', branchId)
    const { data: rows } = await expQuery

    const map = new Map()
    for (const r of rows || []) {
      const name = r.expense_categories?.name || r.custom_category || t('new_expense')
      map.set(name, (map.get(name) || 0) + parseNum(r.amount))
    }
    const expenseRows = [...map.entries()].map(([name, amount]) => ({ name, amount }))
    if (current.serviceCost > 0) expenseRows.push({ name: 'Service charge персоналу', amount: current.serviceCost })
    if (current.tax > 0) expenseRows.push({ name: `Налог %`, amount: current.tax })
    setBreakdown(expenseRows.sort((a, b) => b.amount - a.amount))
  }

  if (!stats) return <div className="module-placeholder">{t('loading')}</div>
  const revChange = stats.previous?.revenue ? ((stats.revenue - stats.previous.revenue) / stats.previous.revenue * 100) : 0
  const profitChange = stats.previous?.net ? ((stats.net - stats.previous.net) / Math.abs(stats.previous.net) * 100) : 0

  return (
    <section id="financePage">
      <section className="topbar">
        <div>
          <h2>{t('finance_tab')}</h2>
          <p>{branchId === ALL_BRANCHES ? 'Общие финансы по всем ресторанам за выбранный месяц' : t('finance_subtitle')}</p>
        </div>
      </section>

      <section className="grid">
        <div className="card span-2">
          <div className="card-head"><h3>{t('period_branch')}</h3></div>
          <div className="form-grid">
            <label><span>{t('branch_select')}</span>
              <select value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value={ALL_BRANCHES}>Общие финансы по всем ресторанам</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
            <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N[lang].months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          </div>
          <p className="hint">Налог {TAX_RATE}% считается автоматически от выручки. В общем режиме налог считается по каждому ресторану и суммируется.</p>
        </div>

        <div className="card span-2">
          <div className="card-head"><h3>{t('expense_breakdown')}</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('expense_item')}</th><th>{t('amount')}</th><th>{t('expense_pct')}</th></tr></thead>
              <tbody>
                {breakdown.map(r => <tr key={r.name}><td>{r.name}</td><td><b>{fmt(r.amount)}</b></td><td>{pct(stats.revenue ? r.amount / stats.revenue * 100 : 0)}</td></tr>)}
                {!breakdown.length && <tr><td colSpan="3" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>{t('current_result')}</h3>
          <Metric label={t('gross_profit')} value={fmt(stats.gross)} />
          <Metric label={t('total_expenses')} value={fmt(stats.expenses + stats.salary + stats.tax)} />
          <Metric label="Операционные расходы" value={fmt(stats.expenses)} />
          <Metric label="Зарплаты" value={fmt(stats.salary)} />
        <Metric label="Service charge персоналу" value={fmt(stats.serviceCost)} />
          <Metric label={`Налог ${TAX_RATE}%`} value={fmt(stats.tax)} />
        </div>

        <div className="card"><h3>{t('net_profit')}</h3><div className="big-number">{fmt(stats.net)}</div><p className={`hint ${stats.net >= 0 ? 'good' : 'bad'}`}>{stats.net >= 0 ? t('profitable') : t('loss')}</p></div>
        <div className="card"><h3>{t('forecast')}</h3><Metric label={t('forecast_revenue')} value={fmt(stats.forecastRevenue)} /><Metric label={t('forecast_profit')} value={fmt(stats.forecastProfit)} /><Metric label={t('avg_daily_revenue')} value={fmt(stats.avg)} /></div>
        <div className="card"><h3>{t('comparison')}</h3><Metric label={t('prev_month_revenue')} value={fmt(stats.previous?.revenue)} /><Metric label={t('revenue_change_pct')} value={pct(revChange)} /><Metric label={t('profit_change_pct')} value={pct(profitChange)} /></div>
        <div className="card"><h3>{t('margins')}</h3><Metric label={t('expense_pct')} value={pct(stats.revenue ? (stats.expenses + stats.salary + stats.tax) / stats.revenue * 100 : 0)} /><Metric label={t('net_margin')} value={pct(stats.revenue ? stats.net / stats.revenue * 100 : 0)} /></div>
      </section>
    </section>
  )
}



const PRODUCT_CATEGORIES = ['Бар', 'Кухня', 'Хоз.Товар']
const MENU_CATEGORIES = ['Кофе', 'Напитки', 'Завтраки', 'Выпечка', 'Десерты', 'Салаты', 'Закуски', 'Основные блюда', 'Паста', 'Бургеры / Сэндвичи', 'Комбо', 'Прочее']
function normalizeProductType(category) {
  const value = String(category || '').toLowerCase()
  if (value.includes('бар') || value.includes('кофе') || value.includes('молоко') || value.includes('сироп')) return 'Бар'
  if (value.includes('хоз') || value.includes('упаков')) return 'Хоз.Товар'
  return 'Кухня'
}

const BASE_UNITS = [
  { value: 'g', label: 'грамм (g)' },
  { value: 'ml', label: 'миллилитр (ml)' },
  { value: 'pcs', label: 'штука (pcs)' }
]
const PURCHASE_UNITS = [
  { value: 'kg', label: 'килограмм (kg)' },
  { value: 'g', label: 'грамм (g)' },
  { value: 'l', label: 'литр (l)' },
  { value: 'ml', label: 'миллилитр (ml)' },
  { value: 'pcs', label: 'штука (pcs)' },
  { value: 'pack', label: 'пачка / упаковка' }
]

function unitLabel(unit) {
  return [...BASE_UNITS, ...PURCHASE_UNITS].find(u => u.value === unit)?.label || unit || '—'
}

function convertToBase(quantity, fromUnit, baseUnit) {
  const q = parseNum(quantity)
  if (baseUnit === 'g') {
    if (fromUnit === 'kg') return q * 1000
    if (fromUnit === 'g') return q
  }
  if (baseUnit === 'ml') {
    if (fromUnit === 'l') return q * 1000
    if (fromUnit === 'ml') return q
  }
  if (baseUnit === 'pcs') return q
  return q
}

function Recipes({ t }) {
  const [products, setProducts] = useState([])
  const [costs, setCosts] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [recipeItems, setRecipeItems] = useState([])
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(PRODUCT_CATEGORIES[0])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productForm, setProductForm] = useState({ name: '', category: PRODUCT_CATEGORIES[0], base_unit: 'g' })
  const [menuForm, setMenuForm] = useState({ name: '', category: 'Кофе', sale_price: '', target_food_cost_percent: '30' })
  const [message, setMessage] = useState('')

  useEffect(() => { loadBase() }, [])
  useEffect(() => { if (selectedMenuId) loadRecipeItems(selectedMenuId); else setRecipeItems([]) }, [selectedMenuId])
  useEffect(() => {
    const first = products.find(p => (p.category || 'Прочее') === selectedCategory)
    setSelectedProductId(first?.id || '')
  }, [selectedCategory, products])

  async function loadBase() {
    const [{ data: prod }, { data: item }, { data: latest }] = await Promise.all([
      supabase.from('supplier_products').select('*').eq('is_active', true).order('category').order('name'),
      supabase.from('menu_items').select('*').eq('is_active', true).order('name'),
      supabase.from('latest_product_costs').select('*')
    ])
    setProducts(prod || [])
    setMenuItems(item || [])
    setCosts(latest || [])
    if (!selectedMenuId && item?.[0]) setSelectedMenuId(item[0].id)
  }

  async function loadRecipeItems(menuId = selectedMenuId) {
    if (!menuId) return
    const { data, error } = await supabase
      .from('recipe_items')
      .select('*, supplier_products(id,name,category,base_unit)')
      .eq('menu_item_id', menuId)
      .order('id')
    if (error) setMessage(error.message)
    setRecipeItems(data || [])
  }

  function productCost(productId) {
    return costs.find(c => c.product_id === productId)
  }

  function lineCost(row) {
    const cost = productCost(row.product_id)
    const unitPrice = parseNum(cost?.price_per_base_unit)
    const waste = parseNum(row.waste_percent)
    return parseNum(row.quantity) * unitPrice * (1 + waste / 100)
  }

  const filteredProducts = products.filter(p => (p.category || 'Прочее') === selectedCategory)
  const selectedMenu = menuItems.find(i => i.id === selectedMenuId)
  const recipeCost = recipeItems.reduce((sum, row) => sum + lineCost(row), 0)
  const salePrice = parseNum(selectedMenu?.sale_price)
  const foodCostPercent = salePrice > 0 ? (recipeCost / salePrice) * 100 : 0
  const grossProfit = salePrice - recipeCost

  async function addProduct() {
    setMessage('')
    if (!productForm.name.trim()) return setMessage('Введите название товара')
    const { data, error } = await supabase.from('supplier_products').insert({
      name: productForm.name.trim(),
      category: productForm.category,
      base_unit: productForm.base_unit
    }).select('*').single()
    if (error) return setMessage(error.message)
    setProductForm({ name: '', category: productForm.category, base_unit: productForm.base_unit })
    await loadBase()
    setSelectedCategory(data?.category || productForm.category)
    setSelectedProductId(data?.id || '')
    setMessage(t('saved'))
  }

  async function updateProduct(id, patch) {
    setMessage('')
    const { error } = await supabase.from('supplier_products').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await loadBase()
  }

  async function deactivateProduct(id) {
    setMessage('')
    const { error } = await supabase.from('supplier_products').update({ is_active: false }).eq('id', id)
    if (error) setMessage(error.message)
    else await loadBase()
  }

  async function addMenuItem() {
    setMessage('')
    if (!menuForm.name.trim()) return setMessage('Введите название блюда')
    const { data, error } = await supabase.from('menu_items').insert({
      name: menuForm.name.trim(),
      category: menuForm.category || null,
      sale_price: parseNum(menuForm.sale_price),
      target_food_cost_percent: parseNum(menuForm.target_food_cost_percent) || 30
    }).select('*').single()
    if (error) return setMessage(error.message)
    setMenuForm({ name: '', category: 'Кофе', sale_price: '', target_food_cost_percent: '30' })
    await loadBase()
    if (data?.id) setSelectedMenuId(data.id)
    setMessage(t('saved'))
  }

  async function updateMenuItem(id, patch) {
    setMessage('')
    const { error } = await supabase.from('menu_items').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await loadBase()
  }

  async function deactivateMenuItem(id) {
    setMessage('')
    const { error } = await supabase.from('menu_items').update({ is_active: false }).eq('id', id)
    if (error) return setMessage(error.message)
    await loadBase()
    if (selectedMenuId === id) setSelectedMenuId('')
  }

  async function addRecipeItem() {
    setMessage('')
    if (!selectedMenuId) return setMessage('Сначала выберите блюдо')
    if (!selectedProductId) return setMessage('Выберите категорию и товар')
    const { error } = await supabase.from('recipe_items').insert({
      menu_item_id: selectedMenuId,
      product_id: selectedProductId,
      quantity: 0,
      waste_percent: 0
    })
    if (error) return setMessage(error.message)
    await loadRecipeItems()
  }

  async function updateRecipeItem(id, patch) {
    setMessage('')
    const { error } = await supabase.from('recipe_items').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await loadRecipeItems()
  }

  async function deleteRecipeItem(id) {
    setMessage('')
    const { error } = await supabase.from('recipe_items').delete().eq('id', id)
    if (error) setMessage(error.message)
    else await loadRecipeItems()
  }

  return (
    <section>
      <section className="topbar">
        <div>
          <h2>{t('recipes_tab')}</h2>
          <p>Техкарты блюд. Товар выбирается из справочника поставщиков, а себестоимость берётся по последней закупке.</p>
        </div>
      </section>

      <section className="grid">
        <div className="card"><h3>Себестоимость</h3><div className="big-number">{fmt(recipeCost)}</div><p className="hint">Себестоимость выбранного блюда</p></div>
        <div className="card"><h3>Цена продажи</h3><div className="big-number">{fmt(salePrice)}</div><p className="hint">Цена в меню</p></div>
        <div className="card"><h3>Food cost</h3><div className={`big-number ${foodCostPercent <= parseNum(selectedMenu?.target_food_cost_percent || 30) ? 'good' : 'bad'}`}>{pct(foodCostPercent)}</div><p className="hint">Цель: {fmt(selectedMenu?.target_food_cost_percent || 30)}%</p></div>
        <div className="card"><h3>Валовая прибыль</h3><div className={`big-number ${grossProfit >= 0 ? 'good' : 'bad'}`}>{fmt(grossProfit)}</div><p className="hint">Цена − себестоимость</p></div>

        <div className="card span-2">
          <div className="card-head">
            <div>
              <h3>Состав техкарты</h3>
              <p className="hint">Выбранное блюдо: <strong>{selectedMenu?.name || 'не выбрано'}</strong>. Здесь вводится количество использования в блюде.</p>
            </div>
            <button className="small" onClick={addRecipeItem}>+ Ингредиент в техкарту</button>
          </div>

          <div className="form-grid compact">
            <label><span>Выбрать блюдо</span>
              <select value={selectedMenuId} onChange={e => setSelectedMenuId(e.target.value)}>
                <option value="">Выберите блюдо</option>
                {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label><span>Категория товара</span>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label><span>Товар / ингредиент</span>
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                <option value="">Выберите товар</option>
                {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Товар</th>
                  <th>Кол-во использования</th>
                  <th>Ед.</th>
                  <th>Потери %</th>
                  <th>Цена за 1 ед.</th>
                  <th>Себестоимость</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recipeItems.map(row => {
                  const product = row.supplier_products
                  const cost = productCost(row.product_id)
                  return (
                    <tr key={row.id}>
                      <td>{product?.category || '—'}</td>
                      <td>
                        <select value={row.product_id || ''} onChange={e => updateRecipeItem(row.id, { product_id: e.target.value })}>
                          {products.map(p => <option key={p.id} value={p.id}>{p.category} · {p.name}</option>)}
                        </select>
                      </td>
                      <td><input inputMode="decimal" defaultValue={row.quantity} onBlur={e => updateRecipeItem(row.id, { quantity: parseNum(e.target.value) })} placeholder="18 / 200" /></td>
                      <td>{unitLabel(product?.base_unit)}</td>
                      <td><input inputMode="decimal" defaultValue={row.waste_percent} onBlur={e => updateRecipeItem(row.id, { waste_percent: parseNum(e.target.value) })} /></td>
                      <td>{cost ? `${fmt(cost.price_per_base_unit)} / ${cost.base_unit}` : 'нет закупки'}</td>
                      <td><strong>{fmt(lineCost(row))}</strong></td>
                      <td><button className="remove" onClick={() => deleteRecipeItem(row.id)}>×</button></td>
                    </tr>
                  )
                })}
                {!recipeItems.length && <tr><td colSpan="8" className="hint">Пока нет ингредиентов в техкарте выбранного блюда.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="hint">Пример: Cappuccino = молоко 200 ml + кофе 18 g. Цена берётся из последней закупки товара у поставщика.</p>
          {message && <p className={`hint ${message === t('saved') ? 'good' : 'bad'}`}>{message}</p>}
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Блюда / позиции меню</h3><p className="hint">Блюдо создаётся один раз, затем выбирается в техкарте.</p></div></div>
          <div className="form-grid compact">
            <label><span>Название блюда</span><input value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} placeholder="Cappuccino / Chicken Bowl" /></label>
            <label><span>Категория</span><select value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}>{MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label><span>Цена продажи</span><input inputMode="decimal" value={menuForm.sale_price} onChange={e => setMenuForm({...menuForm, sale_price: e.target.value})} /></label>
            <label><span>Целевой food cost %</span><input inputMode="decimal" value={menuForm.target_food_cost_percent} onChange={e => setMenuForm({...menuForm, target_food_cost_percent: e.target.value})} /></label>
          </div>
          <button className="small" onClick={addMenuItem}>+ Добавить блюдо</button><br /><br />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Блюдо</th><th>Категория</th><th>Цена</th><th>Цель food cost</th><th></th></tr></thead>
              <tbody>
                {menuItems.map(item => (
                  <tr key={item.id}>
                    <td><button className={selectedMenuId === item.id ? 'primary small' : 'ghost small'} onClick={() => setSelectedMenuId(item.id)}>{item.name}</button></td>
                    <td><select value={item.category || 'Прочее'} onChange={e => updateMenuItem(item.id, { category: e.target.value })}>{MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                    <td><input inputMode="decimal" defaultValue={item.sale_price} onBlur={e => updateMenuItem(item.id, { sale_price: parseNum(e.target.value) })} /></td>
                    <td><input inputMode="decimal" defaultValue={item.target_food_cost_percent} onBlur={e => updateMenuItem(item.id, { target_food_cost_percent: parseNum(e.target.value) })} /></td>
                    <td><button className="remove" onClick={() => deactivateMenuItem(item.id)}>×</button></td>
                  </tr>
                ))}
                {!menuItems.length && <tr><td colSpan="5" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Товары / ингредиенты</h3><p className="hint">Это единый справочник. Эти же товары используются в закупках поставщиков и в техкартах.</p></div></div>
          <div className="form-grid compact">
            <label><span>Название товара</span><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Молоко / Кофе / Сыр" /></label>
            <label><span>Тип</span><select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label><span>Базовая ед. использования</span><select value={productForm.base_unit} onChange={e => setProductForm({...productForm, base_unit: e.target.value})}>{BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
          </div>
          <button className="small" onClick={addProduct}>+ Добавить товар</button><br /><br />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Категория</th><th>Товар</th><th>Базовая ед.</th><th>Последняя цена за ед.</th><th></th></tr></thead>
              <tbody>
                {products.map(item => {
                  const cost = productCost(item.id)
                  return (
                    <tr key={item.id}>
                      <td><select value={item.category || 'Прочее'} onChange={e => updateProduct(item.id, { category: e.target.value })}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                      <td><input defaultValue={item.name} onBlur={e => updateProduct(item.id, { name: e.target.value.trim() })} /></td>
                      <td><select value={item.base_unit || 'g'} onChange={e => updateProduct(item.id, { base_unit: e.target.value })}>{BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                      <td>{cost ? `${fmt(cost.price_per_base_unit)} / ${cost.base_unit}` : 'нет закупки'}</td>
                      <td><button className="remove" onClick={() => deactivateProduct(item.id)}>×</button></td>
                    </tr>
                  )
                })}
                {!products.length && <tr><td colSpan="5" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  )
}

function Attendance({ t }) {
  const branches = useBranches()
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [message, setMessage] = useState('')
  const [employeeForm, setEmployeeForm] = useState({ full_name: '', position: 'Повар', branch_id: '', monthly_salary: '' })
  const [transferForm, setTransferForm] = useState({ employee_id: '', branch_id: STAFF_GROUP_MANAGERS, start_date: todayISO(), position: '', monthly_salary: '', comment: '' })

  useEffect(() => { if (!employeeForm.branch_id) setEmployeeForm(f => ({ ...f, branch_id: STAFF_GROUP_MANAGERS })) }, [branches])
  useEffect(() => { load() }, [year, month, branchId, positionFilter])

  const dim = daysInMonth(year, month)
  const monthDate = monthStart(year, month)
  const days = Array.from({ length: dim }, (_, i) => i + 1)
  const DAILY_DIVISOR = 26

  async function load() {
    const empQuery = supabase.from('employees').select('*, branches(name)').eq('is_active', true).order('branch_id').order('position').order('full_name')

    const start = monthDate
    const end = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
    const attQuery = supabase.from('employee_attendance').select('*').gte('work_date', start).lte('work_date', end)

    const [{ data: emp }, { data: att }] = await Promise.all([empQuery, attQuery])
    const visibleEmployees = (emp || []).filter(e => matchesStaffGroup(e, branchId)).filter(e => matchesPositionGroup(e, positionFilter))
    setEmployees(visibleEmployees)
    if (!transferForm.employee_id && visibleEmployees[0]) {
      setTransferForm(f => ({
        ...f,
        employee_id: visibleEmployees[0].id,
        branch_id: visibleEmployees[0].branch_id || STAFF_GROUP_MANAGERS,
        position: visibleEmployees[0].position || '',
        monthly_salary: visibleEmployees[0].monthly_salary || ''
      }))
    }
    setAttendance(att || [])
  }

  function recordFor(employeeId, day) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return attendance.find(a => a.employee_id === employeeId && a.work_date === date) || null
  }

  function valueFor(employeeId, day) {
    const record = recordFor(employeeId, day)
    return record ? parseNum(record.value) : null
  }

  function workedDays(employeeId) {
    return days.reduce((s, d) => s + parseNum(valueFor(employeeId, d)), 0)
  }

  function dailyRate(emp) {
    return calcDailyRate(emp)
  }

  function calcSalary(emp, worked) {
    return calcGrossSalary(emp, worked)
  }

  async function addEmployee() {
    setMessage('')
    if (!employeeForm.full_name.trim()) return setMessage('Введите имя сотрудника')
    const monthlySalary = parseNum(employeeForm.monthly_salary)
    const { data, error } = await supabase.from('employees').insert({
      full_name: employeeForm.full_name.trim(),
      position: employeeForm.position.trim() || null,
      branch_id: employeeForm.branch_id === STAFF_GROUP_MANAGERS ? null : (employeeForm.branch_id || null),
      salary_type: 'monthly',
      monthly_salary: monthlySalary,
      daily_rate: monthlySalary / DAILY_DIVISOR
    }).select('*, branches(name)').single()
    if (error) return setMessage(error.message)
    setEmployeeForm(f => ({ ...f, full_name: '', position: '', monthly_salary: '' }))
    if (data) {
      await supabase.from('employee_assignments').insert({
        employee_id: data.id,
        branch_id: data.branch_id || null,
        position: data.position || null,
        salary_type: 'monthly',
        monthly_salary: monthlySalary,
        daily_rate: monthlySalary / DAILY_DIVISOR,
        start_date: todayISO(),
        comment: 'Первичное назначение'
      })
      await syncSalaryForEmployee(data)
    }
    await load()
    setMessage('Сотрудник добавлен. Он уже доступен в зарплатах и авансах.')
  }

  async function updateEmployee(id, patch) {
    setMessage('')
    const payload = { ...patch }
    if ('monthly_salary' in payload) {
      payload.monthly_salary = parseNum(payload.monthly_salary)
      payload.daily_rate = payload.monthly_salary / DAILY_DIVISOR
      payload.salary_type = 'monthly'
    }
    const { error } = await supabase.from('employees').update(payload).eq('id', id)
    if (error) setMessage(error.message)
    else {
      await load()
      setMessage(t('saved'))
    }
  }

  function nextAttendanceValue(currentValue) {
    if (currentValue === null || currentValue === undefined || currentValue === '') return 1
    const value = parseNum(currentValue)
    if (value === 1) return 0.5
    if (value === 0.5) return 0
    return null
  }

  async function setAttendanceValue(emp, day, rawValue) {
    setMessage('')
    const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    if (rawValue === null) {
      const { error } = await supabase.from('employee_attendance').delete().eq('employee_id', emp.id).eq('work_date', workDate)
      if (error) { setMessage(error.message); return }
    } else {
      const value = parseNum(rawValue)
      const { error } = await supabase.from('employee_attendance').upsert({
        employee_id: emp.id,
        branch_id: emp.branch_id || null,
        work_date: workDate,
        value
      }, { onConflict: 'employee_id,work_date' })
      if (error) { setMessage(error.message); return }
    }

    await load()
    await syncSalaryForEmployee(emp)
  }

  async function syncSalaryForEmployee(emp) {
    const start = monthDate
    const end = year + '-' + String(month).padStart(2, '0') + '-' + String(dim).padStart(2, '0')
    const { data: monthAttendance } = await supabase.from('employee_attendance').select('value').eq('employee_id', emp.id).gte('work_date', start).lte('work_date', end)
    const worked = (monthAttendance || []).reduce((s, r) => s + parseNum(r.value), 0)
    const monthlySalary = parseNum(emp.monthly_salary)
    const gross = calcGrossSalary(emp, worked)

    const [{ data: existing }, { data: advanceRows }] = await Promise.all([
      supabase.from('salary_periods').select('*').eq('employee_id', emp.id).eq('salary_month', monthDate).maybeSingle(),
      supabase.from('salary_advances').select('amount').eq('employee_id', emp.id).gte('advance_date', start).lte('advance_date', end).or('is_cancelled.is.null,is_cancelled.eq.false')
    ])
    const advance = (advanceRows || []).reduce((sum, row) => sum + parseNum(row.amount), 0)
    const deduction = parseNum(existing?.deduction_amount)
    const net = gross - advance - deduction

    const { error } = await supabase.from('salary_periods').upsert({
      employee_id: emp.id,
      branch_id: emp.branch_id || null,
      salary_month: monthDate,
      worked_days: worked,
      salary_gross: gross,
      salary_net: net,
      advance_amount: advance,
      deduction_amount: deduction,
      card_payment: parseNum(existing?.card_payment),
      cash_payment: parseNum(existing?.cash_payment),
      comment: existing?.comment || `Авторасчёт из табеля: ${worked} дн. × ${fmt(calcDailyRate(emp))} AZN`
    }, { onConflict: 'employee_id,salary_month' })
    if (error) setMessage(error.message)
  }

  async function transferEmployee() {
    setMessage('')
    if (!transferForm.employee_id) return setMessage('Выберите сотрудника')
    const emp = employees.find(e => e.id === transferForm.employee_id)
    if (!emp) return setMessage('Сотрудник не найден в текущем списке')
    const startDate = transferForm.start_date || todayISO()
    const newBranchId = transferForm.branch_id === STAFF_GROUP_MANAGERS ? null : transferForm.branch_id
    const newPosition = transferForm.position || emp.position || null
    const newMonthlySalary = parseNum(transferForm.monthly_salary || emp.monthly_salary)
    const newDailyRate = newMonthlySalary / DAILY_DIVISOR
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || null
    const prevEnd = new Date(startDate)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevEndDate = prevEnd.toISOString().slice(0, 10)

    await supabase
      .from('employee_assignments')
      .update({ end_date: prevEndDate, updated_by: userId })
      .eq('employee_id', emp.id)
      .is('end_date', null)

    const { error: insertError } = await supabase.from('employee_assignments').insert({
      employee_id: emp.id,
      branch_id: newBranchId,
      position: newPosition,
      salary_type: 'monthly',
      monthly_salary: newMonthlySalary,
      daily_rate: newDailyRate,
      start_date: startDate,
      comment: transferForm.comment || null,
      created_by: userId
    })
    if (insertError) return setMessage(insertError.message)

    const { error: empError } = await supabase.from('employees').update({
      branch_id: newBranchId,
      position: newPosition,
      salary_type: 'monthly',
      monthly_salary: newMonthlySalary,
      daily_rate: newDailyRate
    }).eq('id', emp.id)
    if (empError) return setMessage(empError.message)

    await load()
    setMessage('Сотрудник переведён. История назначения сохранена.')
  }

  async function syncAllSalaries() {
    setMessage('')
    for (const emp of employees) await syncSalaryForEmployee(emp)
    setMessage('Зарплаты пересчитаны по табелю')
  }

  const totals = employees.reduce((acc, emp) => {
    const worked = workedDays(emp.id)
    const salary = calcSalary(emp, worked)
    acc.days += worked
    acc.salary += salary
    return acc
  }, { days: 0, salary: 0 })

  return (
    <section>
      <section className="topbar"><div><h2>{t('attendance_tab')}</h2><p>Компактный табель: клик по дню переключает значение. Зарплата считается как месячная ставка / 26 × отработанные дни.</p></div></section>
      <section className="grid">
        <div className="card span-2">
          <div className="card-head"><div><h3>Период и филиал</h3><p className="hint">Клик по ячейке: пусто → 1 → 0.5 → 0 → пусто.</p></div><button className="small" onClick={syncAllSalaries}>Пересчитать зарплаты</button></div>
          <div className="form-grid compact">
            <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
            <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
            <label><span>Филиал / группа</span><select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="all">Все филиалы и менеджеры</option>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span>Позиция</span><select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}><option value="all">Все позиции</option>{STAFF_POSITION_GROUPS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><span>Формула дневной ставки</span><input value="Месячная ставка / 26" readOnly /></label>
          </div>
          <div className="metric"><span>Итого рабочих дней</span><strong>{fmt(totals.days)}</strong></div>
          <div className="metric"><span>Расчётная зарплата</span><strong>{fmt(totals.salary)}</strong></div>
          {message && <p className={`hint ${message.includes('Сохран') || message.includes('пересчитаны') || message.includes('добавлен') ? 'good' : 'bad'}`}>{message}</p>}
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Добавить сотрудника</h3><p className="hint">После добавления сотрудник сразу появляется в разделах “Зарплаты” и “Авансы”.</p></div></div>
          <div className="form-grid compact">
            <label style={{ gridColumn: 'span 2' }}><span>И.Ф.О.</span><input value={employeeForm.full_name} onChange={e => setEmployeeForm({...employeeForm, full_name: e.target.value})} /></label>
            <label><span>Должность</span><select value={employeeForm.position} onChange={e => setEmployeeForm({...employeeForm, position: e.target.value})}>{STAFF_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><span>Филиал / группа</span><select value={employeeForm.branch_id} onChange={e => setEmployeeForm({...employeeForm, branch_id: e.target.value})}>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span>Месячная ставка</span><input inputMode="decimal" value={employeeForm.monthly_salary} onChange={e => setEmployeeForm({...employeeForm, monthly_salary: e.target.value})} /></label>
            <label><span>Дневная ставка</span><input value={fmt(parseNum(employeeForm.monthly_salary) / DAILY_DIVISOR)} readOnly /></label>
          </div>
          <button className="small" onClick={addEmployee}>+ Добавить сотрудника</button>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Перевод сотрудника</h3><p className="hint">Закрывает старое назначение и создаёт новое. Так сохраняется история филиалов и зарплатного фонда.</p></div></div>
          <div className="form-grid compact">
            <label><span>Сотрудник</span><select value={transferForm.employee_id} onChange={e => {
              const emp = employees.find(x => x.id === e.target.value)
              setTransferForm(f => ({ ...f, employee_id: e.target.value, branch_id: emp?.branch_id || STAFF_GROUP_MANAGERS, position: emp?.position || '', monthly_salary: emp?.monthly_salary || '' }))
            }}>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></label>
            <label><span>Новый филиал / группа</span><select value={transferForm.branch_id} onChange={e => setTransferForm({...transferForm, branch_id: e.target.value})}>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span>Дата перевода</span><input type="date" value={transferForm.start_date} onChange={e => setTransferForm({...transferForm, start_date: e.target.value})} /></label>
            <label><span>Позиция</span><select value={transferForm.position || 'Повар'} onChange={e => setTransferForm({...transferForm, position: e.target.value})}>{STAFF_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><span>Мес. ставка</span><input inputMode="decimal" value={transferForm.monthly_salary} onChange={e => setTransferForm({...transferForm, monthly_salary: e.target.value})} /></label>
            <label><span>Комментарий</span><input value={transferForm.comment} onChange={e => setTransferForm({...transferForm, comment: e.target.value})} placeholder="Причина перевода" /></label>
          </div>
          <button className="small" onClick={transferEmployee}>Перевести сотрудника</button>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Табель посещаемости</h3><p className="hint">Ячейки уменьшены. Ф.И.О. расширено. Значение выбирается кликом.</p></div></div>
          <div className="table-wrap">
            <table style={{ fontSize: 11, tableLayout: 'auto' }}>
              <thead><tr><th style={{ minWidth: 70 }}>Филиал</th><th style={{ minWidth: 95 }}>Должность</th><th style={{ minWidth: 230 }}>И.Ф.О.</th><th style={{ minWidth: 80 }}>Мес. ставка</th><th style={{ minWidth: 75 }}>День</th>{days.map(d => <th key={d} style={{ width: 30, minWidth: 30, textAlign: 'center' }}>{d}</th>)}<th style={{ minWidth: 48 }}>Дни</th><th style={{ minWidth: 80 }}>ЗП</th></tr></thead>
              <tbody>
                {employees.map(emp => {
                  const worked = workedDays(emp.id)
                  const salary = calcSalary(emp, worked)
                  return <tr key={emp.id}>
                    <td>{employeeGroupName(emp)}</td>
                    <td><input style={{ minWidth: 90, padding: '6px 7px' }} defaultValue={emp.position || ''} onBlur={e => updateEmployee(emp.id, { position: e.target.value.trim() || null })} /></td>
                    <td><input style={{ minWidth: 220, padding: '6px 7px' }} defaultValue={emp.full_name} onBlur={e => updateEmployee(emp.id, { full_name: e.target.value.trim() })} /></td>
                    <td><input style={{ minWidth: 78, padding: '6px 7px' }} inputMode="decimal" defaultValue={emp.monthly_salary} onBlur={e => updateEmployee(emp.id, { monthly_salary: e.target.value })} /></td>
                    <td>{fmt(dailyRate(emp))}</td>
                    {days.map(d => {
                      const currentValue = valueFor(emp.id, d)
                      const label = currentValue === null ? '' : String(currentValue)
                      return <td key={d} style={{ padding: 2, textAlign: 'center' }}>
                        <button
                          type="button"
                          title="Клик: пусто → 1 → 0.5 → 0 → пусто"
                          onClick={() => setAttendanceValue(emp, d, nextAttendanceValue(currentValue))}
                          style={{ width: 26, minWidth: 26, height: 24, padding: 0, borderRadius: 6, fontSize: 11 }}
                          className={label === '1' ? 'primary' : label === '0.5' ? 'ghost' : label === '0' ? 'danger' : 'ghost'}
                        >{label}</button>
                      </td>
                    })}
                    <td><strong>{fmt(worked)}</strong></td>
                    <td><strong>{fmt(salary)}</strong></td>
                  </tr>
                })}
                {!employees.length && <tr><td colSpan={days.length + 7} className="hint">Сначала добавьте сотрудников.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  )
}

function Salaries({ t }) {
  const branches = useBranches()
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [paymentForm, setPaymentForm] = useState({ employee_id: '', payment_date: todayISO(), amount: '', method: 'cash', comment: '' })
  const [message, setMessage] = useState('')
  const [employeeInfoId, setEmployeeInfoId] = useState('')
  const [employeeFiles, setEmployeeFiles] = useState({})
  const [uploadType, setUploadType] = useState('document')
  const DAILY_DIVISOR = 26

  useEffect(() => { load() }, [year, month, branchId, positionFilter])

  const monthDate = monthStart(year, month)
  const dim = daysInMonth(year, month)
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`

  function emptySalary(emp, advanceTotal = 0) {
    const gross = calcGrossSalary(emp, 0)
    return {
      id: null,
      employee_id: emp.id,
      branch_id: emp.branch_id,
      employees: emp,
      branches: emp.branches,
      worked_days: 0,
      salary_gross: gross,
      advance_amount: advanceTotal,
      deduction_amount: 0,
      salary_net: gross - advanceTotal,
      opening_balance: 0,
      payroll_payments: 0,
      final_balance: gross - advanceTotal,
      card_payment: 0,
      cash_payment: 0,
      comment: ''
    }
  }

  async function loadEmployeeFiles(employeeIds) {
    if (!employeeIds.length) { setEmployeeFiles({}); return }
    const { data, error } = await supabase
      .from('employee_files')
      .select('*')
      .in('employee_id', employeeIds)
      .order('created_at', { ascending: false })

    if (error) {
      // If the migration has not been executed yet, the salaries screen should still work.
      setEmployeeFiles({})
      return
    }

    const grouped = {}
    ;(data || []).forEach(f => {
      if (!grouped[f.employee_id]) grouped[f.employee_id] = []
      grouped[f.employee_id].push(f)
    })
    setEmployeeFiles(grouped)
  }

  async function load() {
    setMessage('')
    const empQ = supabase.from('employees').select('*, branches(name)').eq('is_active', true).order('branch_id').order('position').order('full_name')

    const salQ = supabase.from('salary_periods').select('*, employees(*), branches(name)').eq('salary_month', monthDate).order('branch_id')

    const advQ = supabase.from('salary_advances').select('employee_id, amount, branch_id').gte('advance_date', monthDate).lte('advance_date', monthEnd).or('is_cancelled.is.null,is_cancelled.eq.false')
    const payQ = supabase.from('salary_payments').select('*').eq('salary_month', monthDate).or('is_cancelled.is.null,is_cancelled.eq.false').order('payment_date', { ascending: false }).order('created_at', { ascending: false })
    const prevSalQ = supabase.from('salary_periods').select('employee_id, salary_gross, advance_amount, deduction_amount').lt('salary_month', monthDate)
    const prevPayQ = supabase.from('salary_payments').select('employee_id, amount').lt('salary_month', monthDate).or('is_cancelled.is.null,is_cancelled.eq.false')

    const [
      { data: emp, error: empError },
      { data: sal, error: salError },
      { data: adv, error: advError },
      { data: pays, error: payError },
      { data: prevSal, error: prevSalError },
      { data: prevPays, error: prevPayError }
    ] = await Promise.all([empQ, salQ, advQ, payQ, prevSalQ, prevPayQ])
    if (empError || salError || advError || payError || prevSalError || prevPayError) {
      setMessage(empError?.message || salError?.message || advError?.message || payError?.message || prevSalError?.message || prevPayError?.message)
      return
    }

    const advancesByEmployee = new Map()
    ;(adv || []).forEach(a => advancesByEmployee.set(a.employee_id, parseNum(advancesByEmployee.get(a.employee_id)) + parseNum(a.amount)))
    const paymentsByEmployee = new Map()
    ;(pays || []).forEach(p => paymentsByEmployee.set(p.employee_id, parseNum(paymentsByEmployee.get(p.employee_id)) + parseNum(p.amount)))
    const prevDueByEmployee = new Map()
    ;(prevSal || []).forEach(r => prevDueByEmployee.set(r.employee_id, parseNum(prevDueByEmployee.get(r.employee_id)) + parseNum(r.salary_gross) - parseNum(r.advance_amount) - parseNum(r.deduction_amount)))
    const prevPaymentsByEmployee = new Map()
    ;(prevPays || []).forEach(p => prevPaymentsByEmployee.set(p.employee_id, parseNum(prevPaymentsByEmployee.get(p.employee_id)) + parseNum(p.amount)))
    const salaryByEmployee = new Map((sal || []).map(r => [r.employee_id, r]))

    const mappedRows = (emp || []).filter(e => matchesStaffGroup(e, branchId)).filter(e => matchesPositionGroup(e, positionFilter)).map(e => {
      const advanceTotal = parseNum(advancesByEmployee.get(e.id))
      const salary = salaryByEmployee.get(e.id) || emptySalary(e, advanceTotal)
      const employees = { ...e, ...(salary.employees || {}) }
      const gross = salary.id ? parseNum(salary.salary_gross) : calcGrossSalary(employees, salary.worked_days)
      const deduction = parseNum(salary.deduction_amount)
      const currentDue = gross - advanceTotal - deduction
      const paid = parseNum(paymentsByEmployee.get(e.id))
      const opening = parseNum(prevDueByEmployee.get(e.id)) - parseNum(prevPaymentsByEmployee.get(e.id))
      const finalBalance = opening + currentDue - paid
      return { ...salary, employees, branches: e.branches || salary.branches, branch_id: e.branch_id, salary_gross: gross, advance_amount: advanceTotal, salary_net: currentDue, opening_balance: opening, payroll_payments: paid, final_balance: finalBalance }
    })

    setRows(mappedRows)
    setSalaryPayments(pays || [])
    if (!paymentForm.employee_id && mappedRows[0]) setPaymentForm(f => ({ ...f, employee_id: mappedRows[0].employee_id }))
    await loadEmployeeFiles(mappedRows.map(r => r.employee_id))
  }

  async function recalcSalaryRow(row, updatedEmployee = row.employees, patch = {}) {
    const workedDays = 'worked_days' in patch ? parseNum(patch.worked_days) : parseNum(row.worked_days)
    const gross = 'salary_gross' in patch ? parseNum(patch.salary_gross) : calcGrossSalary(updatedEmployee, workedDays)
    const advance = parseNum(row.advance_amount)
    const deduction = 'deduction_amount' in patch ? parseNum(patch.deduction_amount) : parseNum(row.deduction_amount)
    const payload = {
      employee_id: row.employee_id,
      branch_id: row.branch_id || null,
      salary_month: monthDate,
      worked_days: workedDays,
      salary_gross: gross,
      advance_amount: advance,
      deduction_amount: deduction,
      salary_net: gross - advance - deduction,
      card_payment: 'card_payment' in patch ? parseNum(patch.card_payment) : parseNum(row.card_payment),
      cash_payment: 'cash_payment' in patch ? parseNum(patch.cash_payment) : parseNum(row.cash_payment),
      comment: 'comment' in patch ? patch.comment : (row.comment || '')
    }
    const { error } = await supabase.from('salary_periods').upsert(payload, { onConflict: 'employee_id,salary_month' })
    return error
  }

  async function updateEmployeeDetails(row, patch, recalc = false) {
    setMessage('')
    const payload = { ...patch }
    if ('monthly_salary' in payload) payload.monthly_salary = parseNum(payload.monthly_salary)
    if ('daily_rate' in payload) payload.daily_rate = parseNum(payload.daily_rate)

    if (payload.salary_type === 'daily' && !parseNum(row.employees?.daily_rate)) {
      payload.daily_rate = parseNum(row.employees?.monthly_salary) / DAILY_DIVISOR
    }
    if (payload.salary_type === 'monthly') {
      payload.daily_rate = parseNum(row.employees?.monthly_salary) / DAILY_DIVISOR
    }

    const { error } = await supabase.from('employees').update(payload).eq('id', row.employee_id)
    if (error) return setMessage(error.message)

    if (recalc || 'salary_type' in payload || 'monthly_salary' in payload || 'daily_rate' in payload) {
      const updatedEmployee = { ...row.employees, ...payload }
      const salaryError = await recalcSalaryRow(row, updatedEmployee)
      if (salaryError) return setMessage(salaryError.message)
    }

    await load()
    setMessage(t('saved'))
  }

  async function updateSalary(row, patch) {
    setMessage('')
    const payload = { ...patch }
    ;['worked_days','salary_gross','card_payment','cash_payment','deduction_amount'].forEach(k => { if (k in payload) payload[k] = parseNum(payload[k]) })
    const error = await recalcSalaryRow(row, row.employees, payload)
    if (error) setMessage(error.message)
    else { await load(); setMessage(t('saved')) }
  }

  async function addSalaryPayment() {
    setMessage('')
    const employeeId = paymentForm.employee_id
    const row = rows.find(r => r.employee_id === employeeId)
    if (!row) return setMessage('Выберите сотрудника')
    const amount = parseNum(paymentForm.amount)
    if (!amount) return setMessage('Введите сумму выплаты')
    const { error } = await supabase.from('salary_payments').insert({
      employee_id: employeeId,
      branch_id: row.branch_id || null,
      salary_month: monthDate,
      payment_date: paymentForm.payment_date || todayISO(),
      amount,
      method: paymentForm.method || 'cash',
      comment: paymentForm.comment || null
    })
    if (error) return setMessage(error.message)
    setPaymentForm(f => ({ ...f, amount: '', comment: '' }))
    await load()
    setMessage('Выплата зарплаты добавлена и привязана к выбранному месяцу')
  }

  async function cancelSalaryPayment(payment) {
    if (!confirm('Отменить выплату зарплаты? Строка останется в журнале и не будет учитываться в расчётах.')) return
    setMessage('')
    const { error } = await supabase.from('salary_payments').update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancel_comment: 'Отменено через раздел зарплаты'
    }).eq('id', payment.id)
    if (error) return setMessage(error.message)
    await load()
    setMessage('Выплата отменена и исключена из расчётов')
  }

  async function uploadEmployeeFile(row, file) {
    if (!file) return
    setMessage('')
    const safeName = file.name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_')
    const path = `${row.employee_id}/${Date.now()}_${safeName}`
    const { error: uploadError } = await supabase.storage.from('employee-files').upload(path, file, { upsert: false })
    if (uploadError) return setMessage(uploadError.message)

    const { error } = await supabase.from('employee_files').insert({
      employee_id: row.employee_id,
      file_type: uploadType,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size || null
    })
    if (error) return setMessage(error.message)
    await loadEmployeeFiles(rows.map(r => r.employee_id))
    setMessage('Файл добавлен')
  }

  async function openEmployeeFile(file) {
    const { data, error } = await supabase.storage.from('employee-files').createSignedUrl(file.storage_path, 60)
    if (error) return setMessage(error.message)
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteEmployeeFile(file) {
    if (!confirm('Удалить файл из карточки сотрудника?')) return
    setMessage('')
    await supabase.storage.from('employee-files').remove([file.storage_path])
    const { error } = await supabase.from('employee_files').delete().eq('id', file.id)
    if (error) return setMessage(error.message)
    await loadEmployeeFiles(rows.map(r => r.employee_id))
    setMessage('Файл удалён')
  }

  const totals = rows.reduce((acc, r) => {
    acc.gross += parseNum(r.salary_gross)
    acc.advances += parseNum(r.advance_amount)
    acc.deductions += parseNum(r.deduction_amount)
    acc.net += parseNum(r.salary_net)
    acc.opening += parseNum(r.opening_balance)
    acc.payments += parseNum(r.payroll_payments)
    acc.balance += parseNum(r.final_balance)
    acc.card += parseNum(r.card_payment)
    acc.cash += parseNum(r.cash_payment)
    return acc
  }, { gross: 0, advances: 0, deductions: 0, net: 0, opening: 0, payments: 0, balance: 0, card: 0, cash: 0 })

  const branchTotals = staffGroupOptions(branches).map(b => {
    const branchRows = rows.filter(r => employeeGroupId(r.employees) === b.id)
    return {
      id: b.id,
      name: b.name,
      employees: new Set(branchRows.map(r => r.employee_id)).size,
      gross: branchRows.reduce((s, r) => s + parseNum(r.salary_gross), 0),
      advances: branchRows.reduce((s, r) => s + parseNum(r.advance_amount), 0),
      deductions: branchRows.reduce((s, r) => s + parseNum(r.deduction_amount), 0),
      net: branchRows.reduce((s, r) => s + parseNum(r.salary_net), 0),
      opening: branchRows.reduce((s, r) => s + parseNum(r.opening_balance), 0),
      payments: branchRows.reduce((s, r) => s + parseNum(r.payroll_payments), 0),
      balance: branchRows.reduce((s, r) => s + parseNum(r.final_balance), 0)
    }
  }).filter(b => branchId === 'all' ? (b.gross || b.advances || b.net || b.balance || b.employees) : b.id === branchId)

  return <section>
    <section className="topbar"><div><h2>{t('salaries_tab')}</h2><p>Начисленные зарплаты, авансы и остатки по сотрудникам, филиалам и общей сумме.</p></div></section>
    <section className="grid">
      <div className="card span-2">
        <div className="form-grid compact">
          <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label><span>Филиал / группа</span><select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="all">Все филиалы и менеджеры</option>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>Позиция</span><select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}><option value="all">Все позиции</option>{STAFF_POSITION_GROUPS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        </div>
        <div className="grid mini-grid">
          <div className="metric"><span>Начислено</span><strong>{fmt(totals.gross)}</strong></div>
          <div className="metric"><span>Авансы</span><strong>{fmt(totals.advances)}</strong></div>
          <div className="metric"><span>Удержания</span><strong>{fmt(totals.deductions)}</strong></div>
          <div className="metric"><span>Долг на начало</span><strong>{fmt(totals.opening)}</strong></div>
          <div className="metric"><span>Выплачено за месяц</span><strong>{fmt(totals.payments)}</strong></div>
          <div className="metric"><span>Итоговый баланс</span><strong className={totals.balance >= 0 ? '' : 'bad'}>{fmt(totals.balance)}</strong></div>
        </div>
        {message && <p className={`hint ${message === t('saved') || message.includes('Файл') ? 'good' : 'bad'}`}>{message}</p>}
      </div>

      <div className="card span-2">
        <h3>Сводка по филиалам</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал / группа</th><th>Сотрудников</th><th>Долг на начало</th><th>Начислено</th><th>Авансы</th><th>Удержания</th><th>Выплачено</th><th>Итоговый баланс</th></tr></thead>
          <tbody>{branchTotals.map(b => <tr key={b.id}><td>{b.name}</td><td><strong>{b.employees}</strong></td><td>{fmt(b.opening)}</td><td>{fmt(b.gross)}</td><td>{fmt(b.advances)}</td><td>{fmt(b.deductions)}</td><td>{fmt(b.payments)}</td><td><strong className={b.balance >= 0 ? '' : 'bad'}>{fmt(b.balance)}</strong></td></tr>)}{!branchTotals.length && <tr><td colSpan="8" className="hint">Нет данных за выбранный период.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Выплата зарплаты за выбранный месяц</h3>
        <p className="hint">Например, зарплату за апрель можно выплатить 1 или 2 мая — она всё равно закроет апрель, а не станет авансом мая.</p>
        <div className="form-grid compact">
          <label><span>Сотрудник</span><select value={paymentForm.employee_id} onChange={e => setPaymentForm({ ...paymentForm, employee_id: e.target.value })}>{rows.map(r => <option key={r.employee_id} value={r.employee_id}>{employeeGroupName(r.employees)} · {r.employees?.full_name}</option>)}</select></label>
          <label><span>Дата выплаты</span><input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></label>
          <label><span>Сумма</span><input inputMode="decimal" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></label>
          <label><span>Способ</span><select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}><option value="cash">Наличные</option><option value="card">Карта</option><option value="bank">Банк</option></select></label>
          <label style={{gridColumn:'span 2'}}><span>Комментарий</span><input value={paymentForm.comment} onChange={e => setPaymentForm({ ...paymentForm, comment: e.target.value })} placeholder="Например: закрытие зарплаты за апрель" /></label>
        </div>
        <br />
        <button className="primary" onClick={addSalaryPayment}>+ Добавить выплату зарплаты</button>
      </div>

      <div className="card span-2">
        <h3>Зарплаты сотрудников</h3>
        <div className="table-wrap"><table style={{ tableLayout: 'auto' }}>
          <thead><tr><th>Филиал</th><th>Должность</th><th style={{minWidth:220}}>Сотрудник</th><th style={{width:54}}>Инфо</th><th>Расчёт</th><th>Мес. ставка</th><th>Дневная</th><th style={{minWidth:90}}>Дни</th><th>Долг нач.</th><th>Начислено</th><th>Авансы</th><th>Удержание</th><th>Остаток месяца</th><th>Выплачено</th><th>Баланс</th><th>Комментарий</th></tr></thead>
          <tbody>{rows.map(r => <React.Fragment key={r.id || r.employee_id}>
            <tr>
              <td>{employeeGroupName(r.employees)}</td>
              <td>{positionGroup(r.employees?.position)} · {r.employees?.position || '—'}</td>
              <td style={{minWidth:220, maxWidth:360, whiteSpace:'normal'}}>{r.employees?.full_name}</td>
              <td style={{width:54, paddingLeft:4, paddingRight:4, textAlign:'center'}}><button className="ghost small" onClick={() => setEmployeeInfoId(employeeInfoId === r.employee_id ? '' : r.employee_id)}>i</button></td>
              <td><select value={r.employees?.salary_type || 'monthly'} onChange={e => updateEmployeeDetails(r, { salary_type: e.target.value }, true)}><option value="monthly">Фикс</option><option value="daily">Ежедневный</option></select></td>
              <td><input inputMode="decimal" defaultValue={r.employees?.monthly_salary || 0} onBlur={e => updateEmployeeDetails(r, { monthly_salary: e.target.value }, true)} /></td>
              <td><input inputMode="decimal" key={(r.employees?.salary_type || 'monthly') + '-' + (r.employees?.daily_rate || '') + '-' + (r.employees?.monthly_salary || '')} defaultValue={fmt(calcDailyRate(r.employees))} readOnly={r.employees?.salary_type !== 'daily'} onBlur={e => r.employees?.salary_type === 'daily' && updateEmployeeDetails(r, { daily_rate: e.target.value }, true)} /></td>
              <td style={{minWidth:90}}><input style={{minWidth:80}} defaultValue={r.worked_days} onBlur={e => updateSalary(r, { worked_days: e.target.value })} /></td>
              <td><strong className={parseNum(r.opening_balance) < 0 ? 'bad' : ''}>{fmt(r.opening_balance)}</strong></td>
              <td><input defaultValue={r.salary_gross} onBlur={e => updateSalary(r, { salary_gross: e.target.value })} /></td>
              <td><strong>{fmt(r.advance_amount)}</strong></td>
              <td><input defaultValue={r.deduction_amount} onBlur={e => updateSalary(r, { deduction_amount: e.target.value })} /></td>
              <td><strong>{fmt(r.salary_net)}</strong></td>
              <td><strong>{fmt(r.payroll_payments)}</strong></td>
              <td><strong className={parseNum(r.final_balance) < 0 ? 'bad' : ''}>{fmt(r.final_balance)}</strong></td>
              <td><input defaultValue={r.comment || ''} onBlur={e => updateSalary(r, { comment: e.target.value })} /></td>
            </tr>
            {employeeInfoId === r.employee_id && <tr><td colSpan="16"><div className="notice">
              <h3>Карточка сотрудника: {r.employees?.full_name}</h3>
              <div className="form-grid compact">
                <label><span>Телефон</span><input defaultValue={r.employees?.phone || ''} onBlur={e => updateEmployeeDetails(r, { phone: e.target.value.trim() || null })} /></label>
                <label><span>Адрес</span><input defaultValue={r.employees?.address || ''} onBlur={e => updateEmployeeDetails(r, { address: e.target.value.trim() || null })} /></label>
                <label><span>Прочая информация</span><input defaultValue={r.employees?.extra_info || ''} onBlur={e => updateEmployeeDetails(r, { extra_info: e.target.value.trim() || null })} /></label>
              </div>
              <br />
              <div className="form-grid compact">
                <label><span>Тип файла</span><select value={uploadType} onChange={e => setUploadType(e.target.value)}><option value="document">Удостоверение</option><option value="statement">Заявление</option><option value="contract">Договор</option><option value="other">Другое</option></select></label>
                <label style={{ gridColumn: 'span 2' }}><span>Добавить файл / изображение</span><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e => { uploadEmployeeFile(r, e.target.files?.[0]); e.target.value = '' }} /></label>
              </div>
              <br />
              <div className="table-wrap"><table>
                <thead><tr><th>Тип</th><th>Файл</th><th>Размер</th><th>Дата</th><th></th></tr></thead>
                <tbody>{(employeeFiles[r.employee_id] || []).map(f => <tr key={f.id}>
                  <td>{f.file_type === 'document' ? 'Удостоверение' : f.file_type === 'statement' ? 'Заявление' : f.file_type === 'contract' ? 'Договор' : 'Другое'}</td>
                  <td><button className="ghost small" onClick={() => openEmployeeFile(f)}>{f.file_name}</button></td>
                  <td>{f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : '—'}</td>
                  <td>{formatDT(f.created_at)}</td>
                  <td><button className="danger small" onClick={() => deleteEmployeeFile(f)}>×</button></td>
                </tr>)}{!(employeeFiles[r.employee_id] || []).length && <tr><td colSpan="5" className="hint">Файлы ещё не добавлены.</td></tr>}</tbody>
              </table></div>
            </div></td></tr>}
          </React.Fragment>)}{!rows.length && <tr><td colSpan="16" className="hint">Нет активных сотрудников.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Журнал выплат зарплаты за выбранный месяц</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Дата выплаты</th><th>Сотрудник</th><th>Способ</th><th>Сумма</th><th>Комментарий</th><th>Статус</th><th></th></tr></thead>
          <tbody>{salaryPayments.map(p => {
            const row = rows.find(r => r.employee_id === p.employee_id)
            return <tr key={p.id} className={p.is_cancelled ? 'cancelled-row' : ''}>
              <td>{p.payment_date}</td>
              <td>{row?.employees?.full_name || p.employee_id}</td>
              <td>{p.method === 'card' ? 'Карта' : p.method === 'bank' ? 'Банк' : 'Наличные'}</td>
              <td><strong>{fmt(p.amount)}</strong></td>
              <td>{p.comment || '—'}</td>
              <td>{p.is_cancelled ? `Отменено: ${formatDT(p.cancelled_at)}` : `Создано: ${formatDT(p.created_at)}`}</td>
              <td>{!p.is_cancelled && <button className="danger small" onClick={() => cancelSalaryPayment(p)}>×</button>}</td>
            </tr>
          })}{!salaryPayments.length && <tr><td colSpan="7" className="hint">Выплат за выбранный месяц пока нет.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>
  </section>
}
function Advances({ t }) {
  const branches = useBranches()
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [advanceGroupId, setAdvanceGroupId] = useState(STAFF_GROUP_MANAGERS)
  const [employees, setEmployees] = useState([])
  const [advances, setAdvances] = useState([])
  const [profiles, setProfiles] = useState([])
  const [form, setForm] = useState({ employee_id: '', advance_date: todayISO(), amount: '', comment: '' })
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [year, month, branchId, positionFilter])
  const formEmployees = employees.filter(e => employeeGroupId(e) === advanceGroupId).filter(e => matchesPositionGroup(e, positionFilter))
  useEffect(() => {
    if (!formEmployees.some(e => e.id === form.employee_id)) setForm(f => ({ ...f, employee_id: formEmployees[0]?.id || '' }))
  }, [advanceGroupId, employees, positionFilter])

  const monthDate = monthStart(year, month)
  const dim = daysInMonth(year, month)
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`

  async function load() {
    setMessage('')
    const empQ = supabase.from('employees').select('*, branches(name)').eq('is_active', true).order('branch_id').order('position').order('full_name')
    const advQ = supabase.from('salary_advances').select('*, employees(full_name, position, monthly_salary, branch_id), branches(name)').gte('advance_date', monthDate).lte('advance_date', monthEnd).order('advance_date', { ascending: false }).order('created_at', { ascending: false })
    const [{ data: emp, error: empError }, { data: adv, error: advError }, { data: prof }] = await Promise.all([empQ, advQ, supabase.from('user_profiles').select('id, full_name')])
    if (empError || advError) {
      setMessage(empError?.message || advError?.message)
      return
    }
    setEmployees(emp || [])
    setAdvances(adv || [])
    setProfiles(prof || [])
  }

  function userName(id) {
    if (!id) return '—'
    const p = profiles.find(u => u.id === id)
    return p?.full_name || String(id).slice(0, 8)
  }

  function advanceStatus(row) {
    const editable = canEditAdvance(row)
    if (row.updated_at && row.updated_by) return `Изменено: ${formatDT(row.updated_at)} · ${userName(row.updated_by)}${editable ? '' : ' · закрыто'}`
    return `Создано: ${formatDT(row.created_at)} · ${userName(row.created_by)}${editable ? '' : ' · закрыто'}`
  }

  async function refreshSalaryForEmployee(employeeId) {
    const emp = employees.find(e => e.id === employeeId)
    if (!emp) return
    const [{ data: existing }, { data: advanceRows }] = await Promise.all([
      supabase.from('salary_periods').select('*').eq('employee_id', employeeId).eq('salary_month', monthDate).maybeSingle(),
      supabase.from('salary_advances').select('amount').eq('employee_id', employeeId).gte('advance_date', monthDate).lte('advance_date', monthEnd).or('is_cancelled.is.null,is_cancelled.eq.false')
    ])
    const advanceTotal = (advanceRows || []).reduce((s, r) => s + parseNum(r.amount), 0)
    const gross = parseNum(existing?.salary_gross)
    const deduction = parseNum(existing?.deduction_amount)
    const net = gross - advanceTotal - deduction
    await supabase.from('salary_periods').upsert({
      employee_id: employeeId,
      branch_id: emp.branch_id || null,
      salary_month: monthDate,
      worked_days: parseNum(existing?.worked_days),
      salary_gross: gross,
      advance_amount: advanceTotal,
      deduction_amount: deduction,
      card_payment: parseNum(existing?.card_payment),
      cash_payment: parseNum(existing?.cash_payment),
      salary_net: net,
      comment: existing?.comment || ''
    }, { onConflict: 'employee_id,salary_month' })
  }

  async function addAdvance() {
    setMessage('')
    const emp = employees.find(e => e.id === form.employee_id)
    if (!emp) return setMessage('Выберите сотрудника')
    const amount = parseNum(form.amount)
    if (!amount) return setMessage('Введите сумму аванса')
    const { error } = await supabase.from('salary_advances').insert({
      employee_id: emp.id,
      branch_id: emp.branch_id || null,
      advance_date: form.advance_date || todayISO(),
      amount,
      comment: form.comment || null
    })
    if (error) return setMessage(error.message)
    await refreshSalaryForEmployee(emp.id)
    setForm(f => ({ ...f, amount: '', comment: '' }))
    await load()
    setMessage('Аванс добавлен и учтён в зарплате')
  }

  async function updateAdvance(row, patch) {
    setMessage('')
    if (!canEditAdvance(row)) return setMessage('Аванс можно редактировать только в течение 24 часов после создания')
    const payload = { ...patch }
    if ('amount' in payload) payload.amount = parseNum(payload.amount)
    const { error } = await supabase.from('salary_advances').update(payload).eq('id', row.id)
    if (error) return setMessage(error.message)
    await refreshSalaryForEmployee(row.employee_id)
    await load()
    setMessage(t('saved'))
  }

  async function deleteAdvance(row) {
    setMessage('')
    if (!canEditAdvance(row)) return setMessage('Аванс можно отменить только в течение 24 часов после создания')
    const ok = window.confirm('Отменить этот аванс? Строка останется в журнале перечёркнутой и не будет учитываться в расчётах.')
    if (!ok) return
    const { error } = await supabase.from('salary_advances').update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancel_comment: 'Отменено через журнал авансов'
    }).eq('id', row.id)
    if (error) return setMessage(error.message)
    await refreshSalaryForEmployee(row.employee_id)
    await load()
    setMessage('Аванс отменён и исключён из расчётов')
  }

  const displayedEmployees = employees.filter(e => matchesStaffGroup(e, branchId)).filter(e => matchesPositionGroup(e, positionFilter))
  const displayedAdvances = advances.filter(a => matchesStaffGroup({ branch_id: a.branch_id, branches: a.branches }, branchId)).filter(a => matchesPositionGroup(a.employees, positionFilter))
  const activeAdvances = displayedAdvances.filter(a => !a.is_cancelled)

  const totalsByEmployee = displayedEmployees.map(emp => {
    const empAdvances = activeAdvances.filter(a => a.employee_id === emp.id)
    return {
      id: emp.id,
      branch: employeeGroupName(emp),
      position: `${positionGroup(emp.position)} · ${emp.position || '—'}`,
      full_name: emp.full_name,
      amount: empAdvances.reduce((s, a) => s + parseNum(a.amount), 0)
    }
  }).filter(r => r.amount > 0)

  const totalAdvance = activeAdvances.reduce((s, r) => s + parseNum(r.amount), 0)
  const branchTotals = staffGroupOptions(branches).map(b => ({
    id: b.id,
    name: b.name,
    employees: displayedEmployees.filter(e => employeeGroupId(e) === b.id).length,
    amount: activeAdvances.filter(a => (a.branch_id || STAFF_GROUP_MANAGERS) === b.id).reduce((s, a) => s + parseNum(a.amount), 0)
  })).filter(b => branchId === 'all' ? (b.amount || b.employees) : b.id === branchId)

  return <section>
    <section className="topbar"><div><h2>{t('advances_tab')}</h2><p>Каждая выплата аванса фиксируется отдельной строкой с датой и комментарием.</p></div></section>
    <section className="grid">
      <div className="card span-2">
        <div className="form-grid compact">
          <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label><span>Филиал / группа</span><select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="all">Все филиалы и менеджеры</option>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>Позиция</span><select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}><option value="all">Все позиции</option>{STAFF_POSITION_GROUPS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        </div>
        <div className="metric"><span>Итого авансы за месяц</span><strong>{fmt(totalAdvance)}</strong></div>
        {message && <p className={`hint ${message.includes('добавлен') || message === t('saved') || message.includes('удал') ? 'good' : 'bad'}`}>{message}</p>}
      </div>

      <div className="card span-2">
        <h3>Новый аванс</h3>
        <div className="form-grid compact">
          <label><span>Филиал / группа</span><select value={advanceGroupId} onChange={e => setAdvanceGroupId(e.target.value)}>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>Сотрудник</span><select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})}>{formEmployees.map(e => <option key={e.id} value={e.id}>{positionGroup(e.position)} · {e.full_name}</option>)}</select></label>
          <label><span>Дата</span><input type="date" value={form.advance_date} onChange={e => setForm({...form, advance_date: e.target.value})} /></label>
          <label><span>Сумма</span><input value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" /></label>
          <label><span>Комментарий</span><input value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} placeholder="Например: аванс за первую половину месяца" /></label>
        </div><br />
        <button className="small" onClick={addAdvance}>+ Добавить аванс</button>
      </div>

      <div className="card span-2">
        <h3>Сводка авансов по филиалам</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал / группа</th><th>Сотрудников</th><th>Авансы</th></tr></thead>
          <tbody>{branchTotals.map(b => <tr key={b.id}><td>{b.name}</td><td><strong>{b.employees}</strong></td><td><strong>{fmt(b.amount)}</strong></td></tr>)}{!branchTotals.length && <tr><td colSpan="3" className="hint">Нет авансов за выбранный период.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Сводка авансов по сотрудникам</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал</th><th>Должность</th><th style={{minWidth:240}}>Сотрудник</th><th>Сумма авансов</th></tr></thead>
          <tbody>{totalsByEmployee.map(r => <tr key={r.id}><td>{r.branch}</td><td>{r.position}</td><td>{r.full_name}</td><td><strong>{fmt(r.amount)}</strong></td></tr>)}{!totalsByEmployee.length && <tr><td colSpan="4" className="hint">Нет авансов за выбранный период.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Журнал авансов</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Дата</th><th>Филиал</th><th>Должность</th><th style={{minWidth:240}}>Сотрудник</th><th>Сумма</th><th>Комментарий</th><th>Статус</th><th></th></tr></thead>
          <tbody>{displayedAdvances.map(a => {
            const editable = canEditAdvance(a) && !a.is_cancelled
            return <tr key={a.id} className={a.is_cancelled ? 'cancelled-row' : (editable ? '' : 'muted-row')}>
              <td><input type="date" defaultValue={a.advance_date} disabled={!editable} onBlur={e => updateAdvance(a, { advance_date: e.target.value })} /></td>
              <td>{employeeGroupName({ branch_id: a.branch_id, branches: a.branches })}</td><td>{positionGroup(a.employees?.position)} · {a.employees?.position || '—'}</td><td>{a.employees?.full_name}</td>
              <td><input defaultValue={a.amount} disabled={!editable} onBlur={e => updateAdvance(a, { amount: e.target.value })} /></td>
              <td><input defaultValue={a.comment || ''} disabled={!editable} onBlur={e => updateAdvance(a, { comment: e.target.value })} /></td>
              <td className="hint" style={{minWidth:220}}>{a.is_cancelled ? `Отменено: ${formatDT(a.cancelled_at)} · ${userName(a.cancelled_by)}` : advanceStatus(a)}</td>
              <td><button className="remove" disabled={!editable || a.is_cancelled} onClick={() => deleteAdvance(a)}>×</button></td>
            </tr>
          })}{!advances.length && <tr><td colSpan="8" className="hint">Авансов за выбранный период нет.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>
  </section>
}

function Suppliers({ t }) {
  const branches = useBranches()
  const [legalEntities, setLegalEntities] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [balances, setBalances] = useState([])
  const [purchases, setPurchases] = useState([])
  const [payments, setPayments] = useState([])
  const [profiles, setProfiles] = useState([])
  const [supplierForm, setSupplierForm] = useState({ name: '', voen: '', contact_person: '', phone: '', info: '', payment_term_days: '', credit_limit: '' })
  const [productForm, setProductForm] = useState({ name: '', category: PRODUCT_CATEGORIES[0], base_unit: 'g' })
  const [purchaseForm, setPurchaseForm] = useState({ supplier_id: '', legal_entity_id: '', branch_id: '', purchase_date: todayISO(), invoice_number: '', comment: '' })
  const emptyLine = { category: PRODUCT_CATEGORIES[0], product_id: '', base_unit: 'g', quantity: '1', unit: 'kg', unit_price: '' }
  const [lineRows, setLineRows] = useState([emptyLine])
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', payment_date: todayISO(), amount: '', invoice_notes: '', comment: '' })
  const [activeInfoId, setActiveInfoId] = useState('')
  const [editingPurchaseId, setEditingPurchaseId] = useState('')
  const [viewPurchaseId, setViewPurchaseId] = useState('')
  const [transactionSupplierId, setTransactionSupplierId] = useState('')
  const [transactionPeriod, setTransactionPeriod] = useState('month')
  const [transactionDate, setTransactionDate] = useState(todayISO())
  const [expandedEntities, setExpandedEntities] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!purchaseForm.supplier_id && suppliers[0]) setPurchaseForm(f => ({ ...f, supplier_id: suppliers[0].id }))
    if (!purchaseForm.legal_entity_id && legalEntities[0]) setPurchaseForm(f => ({ ...f, legal_entity_id: legalEntities[0].id }))
    if (!purchaseForm.branch_id && branches[0]) setPurchaseForm(f => ({ ...f, branch_id: branches[0].id }))
  }, [suppliers, legalEntities, branches])

  async function load() {
    const [{ data: le }, { data: sup }, { data: prod }, { data: bal }, { data: pur }, { data: pay }, { data: prof }] = await Promise.all([
      supabase.from('legal_entities').select('*').eq('is_active', true).order('name'),
      supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
      supabase.from('supplier_products').select('*').eq('is_active', true).order('category').order('name'),
      supabase.from('supplier_balances_v2').select('*').order('supplier_name'),
      supabase.from('supplier_purchases').select('*, suppliers(name), legal_entities(name,voen), branches(name), supplier_purchase_items(*, supplier_products(name,base_unit,category))').is('deleted_at', null).order('purchase_date', { ascending: false }).order('created_at', { ascending: false }).limit(500),
      supabase.from('supplier_payments').select('*, suppliers(name)').order('payment_date', { ascending: false }).order('created_at', { ascending: false }).limit(500),
      supabase.from('user_profiles').select('id, full_name')
    ])
    setLegalEntities(le || [])
    setSuppliers(sup || [])
    setProducts(prod || [])
    setBalances(bal || [])
    setPurchases(pur || [])
    setPayments(pay || [])
    setProfiles(prof || [])
  }

  function userName(id) {
    if (!id) return '—'
    const p = profiles.find(u => u.id === id)
    return p?.full_name || String(id).slice(0, 8)
  }
  function balanceForSupplier(id) { return parseNum(balances.find(b => b.supplier_id === id)?.balance) }
  function supplierAlert(supplier) {
    const balance = balanceForSupplier(supplier.id)
    const limit = parseNum(supplier.credit_limit)
    const termDays = parseNum(supplier.payment_term_days)
    const overLimit = limit > 0 && balance > limit ? balance - limit : 0
    const now = new Date()
    const overdue = termDays > 0 ? purchases.filter(p => p.supplier_id === supplier.id && ((now - new Date(p.purchase_date)) / 86400000) > termDays) : []
    return { overLimit, overdueCount: overdue.length, overdueInvoices: overdue.map(p => p.invoice_number || p.purchase_date).slice(0, 5) }
  }
  function lineTotal(row) { return parseNum(row.quantity) * parseNum(row.unit_price) }
  function updateLine(index, patch) {
    setLineRows(rows => rows.map((row, i) => {
      if (i !== index) return row
      const next = { ...row, ...patch }
      return next
    }))
  }
  function productLabel(product) { return product ? product.name : '' }
  function productOptionsForRow(row) {
    const type = row.category || PRODUCT_CATEGORIES[0]
    const sameType = products.filter(p => normalizeProductType(p.category) === type)
    const otherTypes = products.filter(p => normalizeProductType(p.category) !== type)
    return [...sameType, ...otherTypes]
  }
  function selectProductForLine(index, productId) {
    setLineRows(rows => rows.map((row, i) => i === index ? { ...row, product_id: productId || '' } : row))
  }
  async function ensureProduct(row) {
    if (row.product_id) return products.find(p => p.id === row.product_id)
    throw new Error('Выберите товар из списка. Если товара нет, сначала добавьте его в блоке “Товары”.')
  }

  async function addSupplier() {
    setMessage('')
    if (!supplierForm.name.trim()) return setMessage('Введите имя контрагента')
    const { error } = await supabase.from('suppliers').insert({
      name: supplierForm.name.trim(), voen: supplierForm.voen.trim() || null,
      contact_person: supplierForm.contact_person.trim() || null, phone: supplierForm.phone.trim() || null,
      info: supplierForm.info.trim() || null,
      payment_term_days: parseNum(supplierForm.payment_term_days) || null,
      credit_limit: parseNum(supplierForm.credit_limit) || 0
    })
    if (error) return setMessage(error.message)
    setSupplierForm({ name: '', voen: '', contact_person: '', phone: '', info: '', payment_term_days: '', credit_limit: '' })
    await load(); setMessage(t('saved'))
  }
  async function updateSupplier(id, patch) {
    setMessage('')
    const { error } = await supabase.from('suppliers').update(patch).eq('id', id)
    if (error) setMessage(error.message); else await load()
  }
  async function addProductFromForm() {
    setMessage('')
    if (!productForm.name.trim()) return setMessage('Введите товар')
    const { error } = await supabase.from('supplier_products').insert({ name: productForm.name.trim(), category: productForm.category, base_unit: productForm.base_unit })
    if (error) return setMessage(error.message)
    setProductForm({ name: '', category: productForm.category, base_unit: productForm.base_unit })
    await load(); setMessage(t('saved'))
  }

  async function addPurchase() {
    setMessage('')
    try {
      if (!purchaseForm.supplier_id || !purchaseForm.legal_entity_id) throw new Error('Выберите поставщика и VOEN')
      const prepared = []
      for (const row of lineRows) {
        const hasData = row.product_id || parseNum(row.quantity) || parseNum(row.unit_price)
        if (!hasData) continue
        const product = await ensureProduct(row)
        const quantity = parseNum(row.quantity)
        const unitPrice = parseNum(row.unit_price)
        const total = quantity * unitPrice
        const baseQty = convertToBase(quantity, row.unit, product?.base_unit)
        if (!product?.id || !quantity || !unitPrice || !baseQty) throw new Error('Проверьте товар, количество, единицу и цену')
        prepared.push({ row, product, quantity, unitPrice, total, baseQty })
      }
      if (!prepared.length) throw new Error('Добавьте хотя бы один товар в поступление')
      const totalAmount = prepared.reduce((s, r) => s + r.total, 0)
      const { data: purchase, error } = await supabase.from('supplier_purchases').insert({
        supplier_id: purchaseForm.supplier_id, legal_entity_id: purchaseForm.legal_entity_id,
        branch_id: purchaseForm.branch_id || null, purchase_date: purchaseForm.purchase_date,
        invoice_number: purchaseForm.invoice_number.trim() || null, comment: purchaseForm.comment.trim() || null,
        total_amount: totalAmount
      }).select('*').single()
      if (error) throw error
      const items = prepared.map(({ row, product, quantity, unitPrice, total, baseQty }) => ({
        purchase_id: purchase.id, product_id: product.id, quantity, unit: row.unit,
        unit_price: unitPrice, total_amount: total, base_quantity: baseQty,
        base_unit: product?.base_unit || 'g', price_per_base_unit: total / baseQty
      }))
      const { error: itemError } = await supabase.from('supplier_purchase_items').insert(items)
      if (itemError) throw itemError
      await load(); setLineRows([{ ...emptyLine }]); setPurchaseForm(f => ({ ...f, invoice_number: '', comment: '' })); setMessage(t('saved'))
    } catch (e) { setMessage(e.message) }
  }
  async function recalcPurchaseTotal(purchaseId) {
    const { data } = await supabase.from('supplier_purchase_items').select('total_amount').eq('purchase_id', purchaseId)
    const total = (data || []).reduce((s, i) => s + parseNum(i.total_amount), 0)
    await supabase.from('supplier_purchases').update({ total_amount: total }).eq('id', purchaseId)
  }
  async function updatePurchase(id, patch) {
    const { data: authData } = await supabase.auth.getUser()
    const payload = { ...patch, updated_at: new Date().toISOString(), updated_by: authData?.user?.id || null }
    const { error } = await supabase.from('supplier_purchases').update(payload).eq('id', id)
    if (error) setMessage(error.message); else { await load(); setMessage(t('saved')) }
  }
  async function updatePurchaseItem(purchaseId, item, patch) {
    const next = { ...item, ...patch }
    const product = products.find(p => p.id === next.product_id) || item.supplier_products
    const quantity = parseNum(next.quantity)
    const unitPrice = parseNum(next.unit_price)
    const total = quantity * unitPrice
    const baseQty = convertToBase(quantity, next.unit, product?.base_unit || next.base_unit)
    const payload = { ...patch, total_amount: total, base_quantity: baseQty, base_unit: product?.base_unit || next.base_unit || 'g', price_per_base_unit: baseQty ? total / baseQty : 0 }
    const { error } = await supabase.from('supplier_purchase_items').update(payload).eq('id', item.id)
    if (error) return setMessage(error.message)
    await recalcPurchaseTotal(purchaseId); await load(); setMessage(t('saved'))
  }
  async function softDeletePurchase(id) {
    if (!window.confirm('Отменить поступление? Оно будет зачёркнуто и не будет учитываться в финансах.')) return
    const { data: authData } = await supabase.auth.getUser()
    const { error } = await supabase.from('supplier_purchases').update({
      deleted_at: new Date().toISOString(),
      deleted_by: authData?.user?.id || null
    }).eq('id', id)
    if (error) setMessage(error.message); else { await load(); setMessage(t('saved')) }
  }
  function startPayment(supplierId) { setPaymentForm({ supplier_id: supplierId, payment_date: todayISO(), amount: '', invoice_notes: '', comment: '' }) }
  async function savePayment() {
    const amount = parseNum(paymentForm.amount)
    if (!paymentForm.supplier_id || !amount) return setMessage('Выберите поставщика и сумму оплаты')
    const { error } = await supabase.from('supplier_payments').insert({
      supplier_id: paymentForm.supplier_id, payment_date: paymentForm.payment_date || todayISO(), amount,
      invoice_notes: paymentForm.invoice_notes.trim() || null, comment: paymentForm.comment.trim() || null
    })
    if (error) return setMessage(error.message)
    setPaymentForm({ supplier_id: '', payment_date: todayISO(), amount: '', invoice_notes: '', comment: '' })
    await load(); setMessage(t('saved'))
  }

  const purchaseTotal = lineRows.reduce((s, r) => s + lineTotal(r), 0)
  function allTransactions() {
    const purchaseRows = purchases.map(p => ({ id: `p-${p.id}`, type: 'Поступление', date: p.purchase_date, supplier_id: p.supplier_id, supplier: p.suppliers?.name || suppliers.find(s => s.id === p.supplier_id)?.name || '—', invoice: p.invoice_number || '—', amount: parseNum(p.total_amount), comment: p.comment || '', legal: p.legal_entities?.name || '—' }))
    const paymentRows = payments.map(p => ({ id: `pay-${p.id}`, type: 'Оплата', date: p.payment_date, supplier_id: p.supplier_id, supplier: p.suppliers?.name || suppliers.find(s => s.id === p.supplier_id)?.name || '—', invoice: p.invoice_notes || '—', amount: -parseNum(p.amount), comment: p.comment || '', legal: '—' }))
    return [...purchaseRows, ...paymentRows].sort((a,b) => new Date(b.date) - new Date(a.date))
  }
  function periodOk(dateStr) {
    if (transactionPeriod === 'all') return true
    const d = new Date(dateStr), anchor = new Date(transactionDate || todayISO())
    if (transactionPeriod === 'day') return d.toISOString().slice(0,10) === anchor.toISOString().slice(0,10)
    if (transactionPeriod === 'month') return d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth()
    if (transactionPeriod === 'year') return d.getFullYear() === anchor.getFullYear()
    return true
  }
  const supplierTransactions = allTransactions().filter(r => (!transactionSupplierId || r.supplier_id === transactionSupplierId) && periodOk(r.date))
  const lastTransactions = allTransactions().slice(0, 10)
  function suppliersForLegalEntity(entityId) {
    const ids = new Set(purchases.filter(p => p.legal_entity_id === entityId).map(p => p.supplier_id))
    return suppliers.filter(s => ids.has(s.id))
  }

  return <section>
    <section className="topbar"><div><h2>{t('suppliers_tab')}</h2><p>Поставщики, поступления, оплаты, товары и долги. VOEN / юрлица теперь находятся в разделе “Настройки”.</p></div></section>
    <section className="grid">
      <div className="card span-2">
        <div className="card-head"><div><h3>Поступления от поставщика</h3><p className="hint">Сначала заполняется шапка фактуры. Товары добавляются строками ниже.</p></div></div>
        <div className="form-grid compact">
          <label><span>Поставщик</span><select value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({...purchaseForm, supplier_id: e.target.value})}>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label><span>Наш VOEN</span><select value={purchaseForm.legal_entity_id} onChange={e => setPurchaseForm({...purchaseForm, legal_entity_id: e.target.value})}>{legalEntities.map(le => <option key={le.id} value={le.id}>{le.name} · {le.voen}</option>)}</select></label>
          <label><span>Филиал</span><select value={purchaseForm.branch_id} onChange={e => setPurchaseForm({...purchaseForm, branch_id: e.target.value})}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>Дата поступления</span><input type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({...purchaseForm, purchase_date: e.target.value})} /></label>
          <label><span>Номер фактуры</span><input value={purchaseForm.invoice_number} onChange={e => setPurchaseForm({...purchaseForm, invoice_number: e.target.value})} /></label>
          <label><span>Комментарий</span><input value={purchaseForm.comment} onChange={e => setPurchaseForm({...purchaseForm, comment: e.target.value})} /></label>
        </div><br />
        <div className="card-head"><div><h3>Товары в поступлении</h3><p className="hint">Если товара нет, сначала добавьте его ниже в блоке “Товары”.</p></div><button className="small" onClick={() => setLineRows(rows => [...rows, { ...emptyLine }])}>+ Строка товара</button></div>
        <div className="table-wrap"><table><thead><tr><th>Тип</th><th>Товар</th><th>Кол-во закупа</th><th>Ед. закупа</th><th>Цена за ед.</th><th>Сумма</th><th></th></tr></thead><tbody>{lineRows.map((row, idx) => <tr key={idx}>
          <td><select value={row.category} onChange={e => updateLine(idx, { category: e.target.value })}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
          <td style={{minWidth:260}}><select value={row.product_id || ''} onChange={e => selectProductForLine(idx, e.target.value)}><option value="">Выберите товар</option>{productOptionsForRow(row).map(p => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}</select></td>
          <td><input inputMode="decimal" value={row.quantity} onChange={e => updateLine(idx, { quantity: e.target.value })} /></td>
          <td><select value={row.unit} onChange={e => updateLine(idx, { unit: e.target.value })}>{PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
          <td><input inputMode="decimal" value={row.unit_price} onChange={e => updateLine(idx, { unit_price: e.target.value })} /></td>
          <td><strong>{fmt(lineTotal(row))}</strong></td>
          <td><button className="remove" onClick={() => setLineRows(rows => rows.length === 1 ? [{ ...emptyLine }] : rows.filter((_, i) => i !== idx))}>×</button></td>
        </tr>)}</tbody></table></div>
        <p className="hint">Итого по фактуре: <strong>{fmt(purchaseTotal)}</strong> AZN.</p><button className="small primary" onClick={addPurchase}>+ Сохранить поступление</button>{message && <p className={`hint ${message === t('saved') ? 'good' : 'bad'}`}>{message}</p>}
      </div>

      <div className="card span-2">
        <div className="card-head"><div><h3>Оплата поставщику</h3><p className="hint">Укажите сумму оплаты, номера счёт-фактур и комментарий.</p></div></div>
        <div className="form-grid compact">
          <label><span>Поставщик</span><select value={paymentForm.supplier_id} onChange={e => setPaymentForm({...paymentForm, supplier_id: e.target.value})}><option value="">Выберите поставщика</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label><span>Дата оплаты</span><input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} /></label>
          <label><span>Сумма оплаты</span><input inputMode="decimal" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} /></label>
          <label><span>Отметки / номера счёт-фактур</span><input value={paymentForm.invoice_notes} onChange={e => setPaymentForm({...paymentForm, invoice_notes: e.target.value})} /></label>
          <label><span>Комментарий</span><input value={paymentForm.comment} onChange={e => setPaymentForm({...paymentForm, comment: e.target.value})} /></label>
        </div><button className="small primary" onClick={savePayment}>+ Сохранить оплату</button>
      </div>

      <div className="card span-2">
        <div className="card-head"><div><h3>Контрагенты</h3><p className="hint">Условия оплаты и лимиты используются в Dashboard для проблемных долгов.</p></div></div>
        <div className="form-grid compact">
          <label><span>Имя контрагента</span><input value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} /></label>
          <label><span>VOEN поставщика</span><input value={supplierForm.voen} onChange={e => setSupplierForm({...supplierForm, voen: e.target.value})} /></label>
          <label><span>Контакт</span><input value={supplierForm.contact_person} onChange={e => setSupplierForm({...supplierForm, contact_person: e.target.value})} /></label>
          <label><span>Телефон</span><input value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} /></label>
          <label><span>Информация</span><input value={supplierForm.info} onChange={e => setSupplierForm({...supplierForm, info: e.target.value})} /></label>
          <label><span>Срок оплаты, дней</span><input inputMode="numeric" value={supplierForm.payment_term_days} onChange={e => setSupplierForm({...supplierForm, payment_term_days: e.target.value})} /></label>
          <label><span>Кредитный лимит</span><input inputMode="decimal" value={supplierForm.credit_limit} onChange={e => setSupplierForm({...supplierForm, credit_limit: e.target.value})} /></label>
        </div><button className="small" onClick={addSupplier}>+ Добавить поставщика</button>
      </div>

      <div className="card span-2">
        <div className="card-head"><div><h3>Товары</h3><p className="hint">Товар создаётся один раз и потом выбирается в поступлении и в техкарте.</p></div></div>
        <div className="form-grid compact"><label><span>Товар</span><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} /></label><label><span>Тип</span><select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label><span>Базовая ед. для техкарты</span><select value={productForm.base_unit} onChange={e => setProductForm({...productForm, base_unit: e.target.value})}>{BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label></div><button className="small" onClick={addProductFromForm}>+ Добавить товар</button>
      </div>

     <div className="card span-2">
        <div className="card-head">
          <div>
            <h3>Последние поступления</h3>
            <p className="hint">Сначала открывается просмотр накладной. Редактирование и отмена доступны внутри накладной.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Дата</th><th>Фактура</th><th>Поставщик</th><th>Наш VOEN</th><th>Филиал</th><th>Сумма</th><th>Статус</th><th></th></tr>
            </thead>
            <tbody>
              {purchases.slice(0, 50).map(p => (
                <React.Fragment key={p.id}>
                  <tr className={p.deleted_at ? 'cancelled-row' : ''}>
                    <td>{p.purchase_date}</td>
                    <td>{p.invoice_number || '—'}</td>
                    <td>{p.suppliers?.name}</td>
                    <td>{p.legal_entities?.voen}</td>
                    <td>{p.branches?.name || '—'}</td>
                    <td><strong>{fmt(p.total_amount)}</strong></td>
                    <td>{p.deleted_at ? <span className="bad">Отменено</span> : <span className="good">Активно</span>}</td>
                    <td><button className="ghost small" onClick={() => { setViewPurchaseId(viewPurchaseId === p.id ? '' : p.id); setEditingPurchaseId('') }}>{viewPurchaseId === p.id ? 'Закрыть' : 'Просмотр'}</button></td>
                  </tr>
                  {viewPurchaseId === p.id && (
                    <tr>
                      <td colSpan="8">
                        <div className="invoice-view">
                          <div className="card-head">
                            <div>
                              <h3>Накладная {p.invoice_number || 'без номера'}</h3>
                              <p className="hint">
                                Создано: {p.created_at ? new Date(p.created_at).toLocaleString() : '—'} · {userName(p.created_by)}
                                {' '} | Изменено: {p.updated_at ? new Date(p.updated_at).toLocaleString() : '—'} · {userName(p.updated_by)}
                                {p.deleted_at ? <> | Отменено: {new Date(p.deleted_at).toLocaleString()} · {userName(p.deleted_by)}</> : null}
                              </p>
                            </div>
                            {!p.deleted_at && <div className="row-actions">
                              <button className="ghost small" onClick={() => setEditingPurchaseId(editingPurchaseId === p.id ? '' : p.id)}>{editingPurchaseId === p.id ? 'Готово' : 'Редактировать'}</button>
                              <button className="remove" onClick={() => softDeletePurchase(p.id)}>Отменить</button>
                            </div>}
                          </div>

                          <div className="form-grid compact">
                            <label><span>Дата</span>{editingPurchaseId === p.id && !p.deleted_at ? <input type="date" defaultValue={p.purchase_date} onBlur={e => updatePurchase(p.id, { purchase_date: e.target.value })} /> : <strong>{p.purchase_date}</strong>}</label>
                            <label><span>Фактура</span>{editingPurchaseId === p.id && !p.deleted_at ? <input defaultValue={p.invoice_number || ''} onBlur={e => updatePurchase(p.id, { invoice_number: e.target.value.trim() || null })} /> : <strong>{p.invoice_number || '—'}</strong>}</label>
                            <label><span>Филиал</span>{editingPurchaseId === p.id && !p.deleted_at ? <select defaultValue={p.branch_id || ''} onBlur={e => updatePurchase(p.id, { branch_id: e.target.value || null })}><option value="">—</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select> : <strong>{p.branches?.name || '—'}</strong>}</label>
                          </div>

                          <div className="table-wrap">
                            <table>
                              <thead><tr><th>Тип</th><th>Товар</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th></tr></thead>
                              <tbody>
                                {(p.supplier_purchase_items || []).map(i => (
                                  <tr key={i.id}>
                                    <td>{i.supplier_products?.category || '—'}</td>
                                    <td>{editingPurchaseId === p.id && !p.deleted_at ? <select defaultValue={i.product_id} onBlur={e => updatePurchaseItem(p.id, i, { product_id: e.target.value })}>{products.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}</select> : <span>{i.supplier_products?.name}</span>}</td>
                                    <td>{editingPurchaseId === p.id && !p.deleted_at ? <input inputMode="decimal" defaultValue={i.quantity} onBlur={e => updatePurchaseItem(p.id, i, { quantity: parseNum(e.target.value) })} /> : <span>{fmt(i.quantity)}</span>}</td>
                                    <td>{editingPurchaseId === p.id && !p.deleted_at ? <select defaultValue={i.unit} onBlur={e => updatePurchaseItem(p.id, i, { unit: e.target.value })}>{PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select> : <span>{i.unit}</span>}</td>
                                    <td>{editingPurchaseId === p.id && !p.deleted_at ? <input inputMode="decimal" defaultValue={i.unit_price} onBlur={e => updatePurchaseItem(p.id, i, { unit_price: parseNum(e.target.value) })} /> : <span>{fmt(i.unit_price)} AZN</span>}</td>
                                    <td><strong>{fmt(i.total_amount)}</strong></td>
                                  </tr>
                                ))}
                                {!(p.supplier_purchase_items || []).length && <tr><td colSpan="6" className="hint">Товары не найдены</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {!purchases.length && <tr><td colSpan="8" className="hint">—</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </section>
}

function DebtsPayments({ t }) {
  const [legalEntities, setLegalEntities] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [balances, setBalances] = useState([])
  const [purchases, setPurchases] = useState([])
  const [payments, setPayments] = useState([])
  const [activeSupplierId, setActiveSupplierId] = useState('')
  const [transactionType, setTransactionType] = useState('purchases')
  const [transactionPeriod, setTransactionPeriod] = useState('month')
  const [transactionDate, setTransactionDate] = useState(todayISO())
  const [expandedEntities, setExpandedEntities] = useState({})
  const [detailPurchaseId, setDetailPurchaseId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: le }, { data: sup }, { data: bal }, { data: pur }, { data: pay }] = await Promise.all([
      supabase.from('legal_entities').select('*').eq('is_active', true).order('name'),
      supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
      supabase.from('supplier_balances_v2').select('*').order('supplier_name'),
      supabase.from('supplier_purchases').select('*, suppliers(name,voen,payment_term_days,credit_limit), legal_entities(name,voen), branches(name), supplier_purchase_items(*, supplier_products(name,category,base_unit))').is('deleted_at', null).order('purchase_date', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
      supabase.from('supplier_payments').select('*, suppliers(name,voen)').order('payment_date', { ascending: false }).order('created_at', { ascending: false }).limit(1000)
    ])
    setLegalEntities(le || [])
    setSuppliers(sup || [])
    setBalances(bal || [])
    setPurchases(pur || [])
    setPayments(pay || [])
  }

  function balanceForSupplier(id) { return parseNum(balances.find(b => b.supplier_id === id)?.balance) }
  function supplierAlert(supplier) {
    const balance = balanceForSupplier(supplier.id)
    const limit = parseNum(supplier.credit_limit)
    const termDays = parseNum(supplier.payment_term_days)
    const overLimit = limit > 0 && balance > limit ? balance - limit : 0
    const now = new Date()
    const overdue = termDays > 0 ? purchases.filter(p => p.supplier_id === supplier.id && ((now - new Date(p.purchase_date)) / 86400000) > termDays) : []
    return { overLimit, overdueCount: overdue.length, overdueInvoices: overdue.map(p => p.invoice_number || p.purchase_date).slice(0, 5) }
  }
  function suppliersForLegalEntity(entityId) {
    const ids = new Set(purchases.filter(p => p.legal_entity_id === entityId).map(p => p.supplier_id))
    return suppliers.filter(s => ids.has(s.id))
  }
  function periodOk(dateStr) {
    if (transactionPeriod === 'all') return true
    const d = new Date(dateStr), anchor = new Date(transactionDate || todayISO())
    if (transactionPeriod === 'day') return d.toISOString().slice(0,10) === anchor.toISOString().slice(0,10)
    if (transactionPeriod === 'month') return d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth()
    if (transactionPeriod === 'year') return d.getFullYear() === anchor.getFullYear()
    return true
  }
  function openTransactions(id, type = 'purchases') {
    setActiveSupplierId(id)
    setTransactionType(type)
    setDetailPurchaseId('')
  }
  const activeSupplier = suppliers.find(s => s.id === activeSupplierId)
  const filteredPurchases = purchases.filter(p => (!activeSupplierId || p.supplier_id === activeSupplierId) && periodOk(p.purchase_date))
  const filteredPayments = payments.filter(p => (!activeSupplierId || p.supplier_id === activeSupplierId) && periodOk(p.payment_date))
  const lastOps = [
    ...purchases.map(p => ({ id: `p-${p.id}`, date: p.purchase_date, supplier: p.suppliers?.name || suppliers.find(s => s.id === p.supplier_id)?.name || '—', type: 'Поступление', invoice: p.invoice_number || '—', amount: parseNum(p.total_amount), comment: p.comment || '' })),
    ...payments.map(p => ({ id: `pay-${p.id}`, date: p.payment_date, supplier: p.suppliers?.name || suppliers.find(s => s.id === p.supplier_id)?.name || '—', type: 'Оплата', invoice: p.invoice_notes || '—', amount: -parseNum(p.amount), comment: p.comment || '' }))
  ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10)

  return <section>
    <section className="topbar"><div><h2>Долги и оплаты</h2><p>Балансы поставщиков, контроль лимитов, просрочек, поступления и оплаты.</p></div></section>
    <section className="grid">
      <div className="card span-2">
        <div className="card-head"><div><h3>Поставщики и долги</h3><p className="hint">Разделено по вашим VOEN / юрлицам из настроек. В каждой группе сначала показаны 5 поставщиков.</p></div></div>
        {legalEntities.map(le => {
          const list = suppliersForLegalEntity(le.id)
          const shown = expandedEntities[le.id] ? list : list.slice(0, 5)
          return <div key={le.id} className="supplier-entity-group"><div className="supplier-entity-head"><b>{le.name} · {le.voen}</b><span>{list.length} поставщиков</span></div><div className="table-wrap"><table className="supplier-compact-table"><thead><tr><th>Поставщик</th><th>Долг</th><th>Условия</th><th>Статус</th><th></th></tr></thead><tbody>{shown.map(s => { const alert = supplierAlert(s); const risky = alert.overLimit > 0 || alert.overdueCount > 0; return <tr key={s.id} style={risky ? { background: 'rgba(155,45,45,.08)' } : undefined}><td><b>{s.name}</b><br /><span className="hint">{s.voen || 'VOEN не указан'}</span></td><td><strong className={balanceForSupplier(s.id) > 0 ? 'bad' : 'good'}>{fmt(balanceForSupplier(s.id))}</strong></td><td className="hint">{s.payment_term_days ? `${s.payment_term_days} дней` : '—'} · лимит {fmt(s.credit_limit)}</td><td className="hint">{alert.overLimit > 0 && <div className="bad">лимит +{fmt(alert.overLimit)}</div>}{alert.overdueCount > 0 && <div className="bad">просрочено: {alert.overdueCount}</div>}{!risky && <span className="good">ОК</span>}</td><td><button className="small" onClick={() => openTransactions(s.id, 'purchases')}>Транзакции</button></td></tr>})}{!shown.length && <tr><td colSpan="5" className="hint">Нет поставщиков по этому VOEN</td></tr>}</tbody></table></div>{list.length > 5 && <button className="ghost small" onClick={() => setExpandedEntities(e => ({...e, [le.id]: !e[le.id]}))}>{expandedEntities[le.id] ? 'Свернуть' : 'Показать всех'}</button>}</div>
        })}
      </div>

      {activeSupplierId && <div className="card span-2 supplier-transactions-panel"><div className="card-head"><div><h3>Транзакции: {activeSupplier?.name}</h3><p className="hint">Поступления и оплаты показаны отдельно, чтобы не смешивать операции.</p></div><button className="ghost small" onClick={() => setActiveSupplierId('')}>Закрыть</button></div>
        <div className="form-grid compact"><label><span>Тип операций</span><select value={transactionType} onChange={e => { setTransactionType(e.target.value); setDetailPurchaseId('') }}><option value="purchases">Поступления</option><option value="payments">Оплаты</option></select></label><label><span>Период</span><select value={transactionPeriod} onChange={e => setTransactionPeriod(e.target.value)}><option value="day">За день</option><option value="month">За месяц</option><option value="year">За год</option><option value="all">Весь период</option></select></label>{transactionPeriod !== 'all' && <label><span>Дата периода</span><input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} /></label>}</div>
        {transactionType === 'purchases' ? <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Фактура</th><th>Наш VOEN</th><th>Филиал</th><th>Сумма</th><th>Комментарий</th><th></th></tr></thead><tbody>{filteredPurchases.map(p => <React.Fragment key={p.id}><tr><td>{p.purchase_date}</td><td>{p.invoice_number || '—'}</td><td>{p.legal_entities?.name || '—'}<br /><span className="hint">{p.legal_entities?.voen || ''}</span></td><td>{p.branches?.name || '—'}</td><td><strong className="bad">{fmt(p.total_amount)}</strong></td><td>{p.comment || '—'}</td><td><button className="small" onClick={() => setDetailPurchaseId(detailPurchaseId === p.id ? '' : p.id)}>{detailPurchaseId === p.id ? 'Скрыть' : 'Детали'}</button></td></tr>{detailPurchaseId === p.id && <tr><td colSpan="7"><div className="table-wrap"><table><thead><tr><th>Категория</th><th>Товар</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>{(p.supplier_purchase_items || []).map(i => <tr key={i.id}><td>{i.supplier_products?.category || '—'}</td><td>{i.supplier_products?.name || '—'}</td><td>{fmt(i.quantity)}</td><td>{i.unit}</td><td>{fmt(i.unit_price)}</td><td>{fmt(i.total_amount)}</td></tr>)}{!(p.supplier_purchase_items || []).length && <tr><td colSpan="6" className="hint">Товары не найдены</td></tr>}</tbody></table></div></td></tr>}</React.Fragment>)}{!filteredPurchases.length && <tr><td colSpan="7" className="hint">Нет поступлений за выбранный период</td></tr>}</tbody></table></div> : <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Отметки / фактуры</th><th>Сумма</th><th>Комментарий</th></tr></thead><tbody>{filteredPayments.map(p => <tr key={p.id}><td>{p.payment_date}</td><td>{p.invoice_notes || '—'}</td><td><strong className="good">{fmt(p.amount)}</strong></td><td>{p.comment || '—'}</td></tr>)}{!filteredPayments.length && <tr><td colSpan="4" className="hint">Нет оплат за выбранный период</td></tr>}</tbody></table></div>}
      </div>}

      {!activeSupplierId && <div className="card span-2"><div className="card-head"><div><h3>Последние поступления и оплаты</h3><p className="hint">Последние 10 операций по всем поставщикам.</p></div></div><div className="table-wrap"><table><thead><tr><th>Дата</th><th>Поставщик</th><th>Тип</th><th>Фактура/отметки</th><th>Сумма</th><th>Комментарий</th></tr></thead><tbody>{lastOps.map(r => <tr key={r.id}><td>{r.date}</td><td>{r.supplier}</td><td>{r.type}</td><td>{r.invoice}</td><td className={r.amount >= 0 ? 'bad' : 'good'}>{fmt(Math.abs(r.amount))}</td><td>{r.comment || '—'}</td></tr>)}{!lastOps.length && <tr><td colSpan="6" className="hint">—</td></tr>}</tbody></table></div></div>}
    </section>
  </section>
}


function Settings({ session, t, theme, setTheme }) {
  const [users, setUsers] = useState([])
  const [permissions, setPermissions] = useState([])
  const [legalEntities, setLegalEntities] = useState([])
  const [branches, setBranches] = useState([])
  const [serviceBranchId, setServiceBranchId] = useState('')
  const [serviceSettings, setServiceSettings] = useState({ enabled: false, service_percent: '10', staff_cost_percent: '4' })
  const [fullName, setFullName] = useState('')
  const [legalForm, setLegalForm] = useState({ name: '', voen: '' })
  const [newUser, setNewUser] = useState({ login: '', password: '', full_name: '' })
  const [clearConfirm, setClearConfirm] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const editableSections = SECTIONS.filter(s => s.id !== 'settings')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: u }, { data: le }, { data: perms }, { data: br }] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at'),
      supabase.from('legal_entities').select('*').order('name'),
      supabase.from('user_permissions').select('*'),
      supabase.from('branches').select('id,name,service_charge_enabled,service_charge_percent,service_staff_cost_percent').eq('is_active', true).order('name')
    ])
    setUsers(u || [])
    setLegalEntities(le || [])
    setPermissions(perms || [])
    setBranches(br || [])
    if (!serviceBranchId && br?.[0]) setServiceBranchId(br[0].id)
  }

  async function createProfileForCurrentUser() {
    await supabase.from('user_profiles').upsert({ id: session.user.id, email: session.user.email, login_name: (session.user.email || '').split('@')[0], full_name: fullName || session.user.email, role: 'admin', ui_theme: theme })
    setMsg(t('saved'))
    load()
  }

  async function addUser() {
    setMsg('')
    const login = String(newUser.login || '').trim().toLowerCase()
    if (!login) return setMsg('Введите login пользователя')
    if (!/^[a-z0-9._-]{3,40}$/.test(login)) return setMsg('Login: только латиница, цифры, точка, дефис или подчёркивание, минимум 3 символа')
    if (!newUser.password.trim()) return setMsg('Введите временный пароль')
    const { data: userId, error } = await supabase.rpc('create_nms_login_user', {
      p_login: login,
      p_password: newUser.password.trim(),
      p_full_name: newUser.full_name || login,
      p_ui_theme: theme
    })
    if (error) return setMsg(error.message)
    if (!userId) return setMsg('Пользователь не создан. Проверь SQL-функцию create_nms_login_user.')
    const defaultAccess = editableSections.map(sec => ({ user_id: userId, section: sec.id, access: 'read' }))
    const { error: permError } = await supabase.from('user_permissions').upsert(defaultAccess, { onConflict: 'user_id,section' })
    if (permError) return setMsg(permError.message)
    setNewUser({ login: '', password: '', full_name: '' })
    setMsg(`Пользователь ${login} добавлен. Вход: ${login}`)
    load()
  }

  async function updateUser(id, patch) {
    const { error } = await supabase.from('user_profiles').update(patch).eq('id', id)
    if (error) setMsg(error.message); else { setMsg(t('saved')); load() }
  }

  const getPermission = (userId, section) => permissions.find(p => p.user_id === userId && p.section === section)?.access || 'none'

  async function updatePermission(userId, section, access) {
    const { error } = await supabase.from('user_permissions').upsert({ user_id: userId, section, access }, { onConflict: 'user_id,section' })
    if (error) setMsg(error.message); else { setMsg(t('saved')); load() }
  }

  async function updateTheme(value) {
    setTheme(value)
    await supabase.from('user_profiles').update({ ui_theme: value }).eq('id', session.user.id)
    setMsg(t('saved'))
  }

  useEffect(() => {
    const b = branches.find(x => x.id === serviceBranchId)
    if (b) setServiceSettings({ enabled: Boolean(b.service_charge_enabled), service_percent: b.service_charge_percent ?? '10', staff_cost_percent: b.service_staff_cost_percent ?? '4' })
  }, [serviceBranchId, branches])

  async function saveBranchServiceSettings() {
    if (!serviceBranchId) return setMsg('Выберите филиал')
    const { error } = await supabase.from('branches').update({
      service_charge_enabled: Boolean(serviceSettings.enabled),
      service_charge_percent: parseNum(serviceSettings.service_percent),
      service_staff_cost_percent: parseNum(serviceSettings.staff_cost_percent)
    }).eq('id', serviceBranchId)
    if (error) return setMsg(error.message)
    setMsg('Настройка service charge сохранена')
    load()
  }


  async function addLegalEntity() {
    if (!legalForm.name.trim() || !legalForm.voen.trim()) return setMsg('Введите название и VOEN')
    const { error } = await supabase.from('legal_entities').insert({ name: legalForm.name.trim(), voen: legalForm.voen.trim() })
    if (error) return setMsg(error.message)
    setLegalForm({ name: '', voen: '' })
    setMsg(t('saved'))
    load()
  }

  async function updateLegalEntity(id, patch) {
    const { error } = await supabase.from('legal_entities').update(patch).eq('id', id)
    if (error) setMsg(error.message); else { setMsg(t('saved')); load() }
  }

  async function exportBackup() {
    setMsg('')
    setBackupBusy(true)
    const { data, error } = await supabase.rpc('nms_backup_operational_data')
    setBackupBusy(false)
    if (error) return setMsg(error.message)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nms-backup-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMsg('Бэкап данных скачан')
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMsg('')
    let parsed
    try {
      parsed = JSON.parse(await file.text())
    } catch (_e) {
      return setMsg('Не удалось прочитать JSON-файл бэкапа')
    }
    const ok = window.confirm('Восстановление сначала очистит текущие операционные данные и затем загрузит данные из бэкапа. Продолжить?')
    if (!ok) return
    setBackupBusy(true)
    const { error } = await supabase.rpc('nms_restore_operational_data', { p_backup: parsed })
    setBackupBusy(false)
    if (error) return setMsg(error.message)
    setMsg('Бэкап восстановлен')
  }

  async function clearOperationalData() {
    setMsg('')
    if (clearConfirm !== 'ОЧИСТИТЬ') return setMsg('Для очистки введите ОЧИСТИТЬ')
    const ok = window.confirm('Будут очищены выручка, расходы, приходы, касса, закупки/поступления, оплаты поставщикам, авансы, выплаты зарплаты, табель и журналы операций. Справочники останутся. Продолжить?')
    if (!ok) return
    setBackupBusy(true)
    const { error } = await supabase.rpc('nms_clear_operational_data')
    setBackupBusy(false)
    if (error) return setMsg(error.message)
    setClearConfirm('')
    setMsg('Операционные данные очищены. Можно начинать работу с чистой базы.')
  }

  return (
    <section><section className="topbar"><div><h2>{t('settings_tab')}</h2><p>{t('settings_subtitle')}</p></div></section>
      <section className="grid">
        <div className="card span-2"><div className="card-head"><h3>Интерфейс</h3></div><p className="hint">Классический вид остаётся основным. Современный вид можно включить здесь.</p><div className="form-grid compact"><label><span>Вид интерфейса</span><select value={theme} onChange={e => updateTheme(e.target.value)}>{THEMES.map(th => <option key={th.id} value={th.id}>{th.name}</option>)}</select></label></div>{msg && <p className="hint good">{msg}</p>}</div>

        <div className="card span-2"><div className="card-head"><div><h3>Настройка service charge филиала</h3><p className="hint">Выберите филиал и один раз включите service charge. В разделе “Выручка” сумма для персонала будет считаться автоматически в конце строки.</p></div><button className="small primary" onClick={saveBranchServiceSettings}>Сохранить</button></div><div className="form-grid compact"><label><span>Филиал</span><select value={serviceBranchId} onChange={e => setServiceBranchId(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={serviceSettings.enabled} onChange={e => setServiceSettings(s => ({...s, enabled: e.target.checked}))} /> Учитывать service charge</label><MoneyInput label="Service charge % в счёте" value={serviceSettings.service_percent} onChange={v => setServiceSettings(s => ({...s, service_percent: v}))} /><MoneyInput label="% затрат персоналу от базы" value={serviceSettings.staff_cost_percent} onChange={v => setServiceSettings(s => ({...s, staff_cost_percent: v}))} /></div></div>

        <div className="card span-2"><div className="card-head"><h3>Добавить пользователя</h3></div><p className="hint">Пользователь входит по login. Email-рассылка не используется, поэтому лимит email не затрагивается.</p><div className="form-grid compact"><label><span>Login</span><input value={newUser.login} onChange={e => setNewUser({...newUser, login: e.target.value})} placeholder="nigar" /></label><label><span>Временный пароль</span><input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></label><label><span>Имя</span><input value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} /></label></div><button className="small" onClick={addUser}>+ Добавить пользователя</button></div>

        <div className="card span-2"><div className="card-head"><h3>Права доступа</h3></div><p className="hint">По каждому разделу: нет доступа / readonly / editor.</p><div className="table-wrap"><table><thead><tr><th>Пользователь</th><th>Login</th><th>Активен</th><th>Разделы</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td><b>{u.full_name || u.login_name || u.id}</b></td><td><span className="hint">{u.login_name || (u.email || '').split('@')[0] || u.id}</span></td><td><select value={String(u.is_active !== false)} onChange={e => updateUser(u.id, { is_active: e.target.value === 'true' })}><option value="true">Да</option><option value="false">Нет</option></select></td><td><div className="permission-grid">{editableSections.map(sec => <React.Fragment key={`${u.id}-${sec.id}`}><b>{t(sec.key)}</b><select value={getPermission(u.id, sec.id)} onChange={e => updatePermission(u.id, sec.id, e.target.value)}><option value="none">Нет доступа</option><option value="read">Readonly</option><option value="edit">Editor</option></select></React.Fragment>)}</div></td></tr>)}</tbody></table></div></div>

        <div className="card span-2"><div className="card-head"><h3>Наши VOEN / юрлица</h3></div><p className="hint">Используются в разделе “Поставщики”.</p><div className="form-grid compact"><label><span>Имя / компания</span><input value={legalForm.name} onChange={e => setLegalForm({...legalForm, name: e.target.value})} placeholder="Ruslan Rasulov" /></label><label><span>VOEN</span><input value={legalForm.voen} onChange={e => setLegalForm({...legalForm, voen: e.target.value})} /></label></div><button className="small" onClick={addLegalEntity}>+ Добавить VOEN</button><div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Имя / компания</th><th>VOEN</th><th>Активен</th></tr></thead><tbody>{legalEntities.map(le => <tr key={le.id}><td><input defaultValue={le.name} onBlur={e => updateLegalEntity(le.id, { name: e.target.value.trim() })} /></td><td><input defaultValue={le.voen} onBlur={e => updateLegalEntity(le.id, { voen: e.target.value.trim() })} /></td><td><select defaultValue={String(le.is_active !== false)} onChange={e => updateLegalEntity(le.id, { is_active: e.target.value === 'true' })}><option value="true">Да</option><option value="false">Нет</option></select></td></tr>)}{!legalEntities.length && <tr><td colSpan="3" className="hint">—</td></tr>}</tbody></table></div></div>

        <div className="card span-2"><div className="card-head"><div><h3>Бэкап и очистка данных</h3><p className="hint">Очищаются только операционные данные: выручка, расходы, приходы, касса, поступления/оплаты поставщиков, авансы, выплаты зарплаты, табель и журналы. Справочники, сотрудники, поставщики, товары, филиалы, VOEN и настройки остаются.</p></div></div><div className="form-grid compact"><label><span>Бэкап данных</span><button type="button" className="small primary" disabled={backupBusy} onClick={exportBackup}>{backupBusy ? 'Выполняется...' : 'Скачать бэкап JSON'}</button></label><label><span>Восстановить из бэкапа</span><input type="file" accept="application/json,.json" disabled={backupBusy} onChange={importBackup} /></label><label><span>Очистка</span><input value={clearConfirm} onChange={e => setClearConfirm(e.target.value)} placeholder="Введите ОЧИСТИТЬ" /></label></div><button type="button" className="danger" disabled={backupBusy} onClick={clearOperationalData}>Очистить всю операционную информацию</button><p className="hint">Перед очисткой сначала скачай бэкап. Восстановление принимает JSON-файл, созданный этой кнопкой.</p></div>

        <div className="card span-2"><div className="card-head"><h3>{t('profile')}</h3></div><div className="form-grid compact"><label><span>{t('full_name')}</span><input value={fullName} onChange={e => setFullName(e.target.value)} /></label></div><button className="small" onClick={createProfileForCurrentUser}>{t('create_admin')}</button></div>
      </section>
    </section>
  )
}

function Placeholder({ title, t }) {
  return <section><section className="topbar"><div><h2>{title}</h2></div></section><div className="module-placeholder"><h2>{title}</h2><p>{t('module_coming')}</p></div></section>
}

function MoneyInput({ label, value, onChange, disabled = false }) {
  const [local, setLocal] = useState(value ?? '')
  useEffect(() => setLocal(value ?? ''), [value])
  return <label><span>{label}</span><input inputMode="decimal" value={local} disabled={disabled} onChange={e => setLocal(e.target.value)} onBlur={() => onChange(local)} /></label>
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

createRoot(document.getElementById('root')).render(<App />)

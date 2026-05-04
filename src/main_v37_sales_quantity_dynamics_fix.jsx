import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import './styles.css'

const I18N = {
  ru: {
    system_title:'RMS', system_short_title:'RMS', system_subtitle:'Выручка · Финансы · Персонал · Поставщики', dashboard_tab:'Дашборд',
    brand_subtitle:'Restaurant Management System', language_label:'Язык интерфейса', login_label:'Login', password_label:'Пароль',
    login_button:'Войти', login_hint:'Вход по внутреннему login. Допустим вход по логину без домена.', login_error:'Неверный логин или пароль', show_password:'Показать пароль',
    logout:'Выйти', revenue_tab:'Выручка', finance_tab:'Финансы ресторанов', reports_tab:'Отчёты', recipes_tab:'Тех. карты', salaries_tab:'Зарплаты',
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
    system_title:'RMS', system_short_title:'RMS', system_subtitle:'Dövriyyə · Maliyyə · Personal · Təchizatçılar', dashboard_tab:'Dashboard',
    brand_subtitle:'Restaurant Management System', language_label:'İnterfeys dili', login_label:'Login', password_label:'Parol',
    login_button:'Daxil ol', login_hint:'Daxili login ilə giriş. Domen yazmadan login istifadə etmək olar.', login_error:'Login və ya parol yanlışdır', show_password:'Parolu göstər',
    logout:'Çıxış', revenue_tab:'Dövriyyə', finance_tab:'Restoran maliyyəsi', reports_tab:'Hesabatlar', recipes_tab:'Tex. kartlar', salaries_tab:'Maaşlar',
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
  { id: 'reports', key: 'reports_tab' },
  { id: 'recipes', key: 'recipes_tab' },
  { id: 'salaries', key: 'salaries_tab' },
  { id: 'suppliers', key: 'suppliers_tab' },
  { id: 'debts', key: 'debts_payments_tab' },
  { id: 'settings', key: 'settings_tab' }
]

const ACCESS_LEVELS = ['none', 'read', 'edit', 'admin']
const THEMES = [
  { id: 'classic', name: 'Классический' },
  { id: 'modern', name: 'Современный' },
  { id: 'dashboard', name: 'Dashboard / Light Pro' },
  { id: 'executive', name: 'Graphite / Soft Pro' }
]
const accessRank = (value) => ACCESS_LEVELS.indexOf(value || 'none')
const canReadAccess = (value) => accessRank(value) >= accessRank('read')

const fmt = (n) => Number(n || 0).toFixed(2)
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`
const parseNum = (v) => Number(String(v ?? '0').replace(',', '.').replace(/\s/g, '')) || 0
const normalizeExpenseText = (value) => String(value || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')
const isBazarExpenseName = (value) => {
  const name = normalizeExpenseText(value)
  return name === 'базар' || name === 'bazar' || name.includes('базар')
}

const isDsmfExpenseName = (value) => {
  const name = normalizeExpenseText(value)
  return name.includes('dsmf') || name.includes('дсмф') || name.includes('соц') || name.includes('sosial') || name.includes('social')
}
const isSalaryExpenseName = (value) => {
  const name = normalizeExpenseText(value)
  return name.includes('зарплат') || name.includes('salary') || name.includes('emek haqq') || name.includes('əmək haqq')
}
const statutorySocialEmployer = (baseValue) => {
  const base = parseNum(baseValue)
  if (base <= 0) return 0
  if (base <= 200) return base * 0.22
  if (base <= 8000) return 44 + (base - 200) * 0.15
  return 1214 + (base - 8000) * 0.11
}
const statutoryUnemploymentEmployer = (baseValue) => parseNum(baseValue) * 0.005
const statutoryMedicalEmployer = (baseValue) => {
  const base = parseNum(baseValue)
  if (base <= 0) return 0
  if (base <= 2500) return base * 0.02
  return 50 + (base - 2500) * 0.005
}
const statutorySocialEmployee = (baseValue) => {
  const base = parseNum(baseValue)
  if (base <= 0) return 0
  if (base <= 200) return base * 0.03
  return 6 + (base - 200) * 0.10
}
const statutoryUnemploymentEmployee = (baseValue) => parseNum(baseValue) * 0.005
const statutoryMedicalEmployee = (baseValue) => {
  const base = parseNum(baseValue)
  if (base <= 0) return 0
  if (base <= 2500) return base * 0.02
  return 50 + (base - 2500) * 0.005
}
const statutoryIncomeTaxPrivateNonOil2026 = (baseValue) => {
  const base = parseNum(baseValue)
  if (base <= 0) return 0
  if (base <= 2500) return Math.max(base - 200, 0) * 0.03
  if (base <= 8000) return 75 + (base - 2500) * 0.10
  return 625 + (base - 8000) * 0.14
}
const statutoryEmployerPayrollCharges = (baseValue) => {
  const base = parseNum(baseValue)
  const social = statutorySocialEmployer(base)
  const unemployment = statutoryUnemploymentEmployer(base)
  const medical = statutoryMedicalEmployer(base)
  return {
    base,
    social,
    unemployment,
    medical,
    total: social + unemployment + medical
  }
}
const statutoryEmployeePayrollDeductions = (baseValue) => {
  const base = parseNum(baseValue)
  const social = statutorySocialEmployee(base)
  const unemployment = statutoryUnemploymentEmployee(base)
  const medical = statutoryMedicalEmployee(base)
  const incomeTax = statutoryIncomeTaxPrivateNonOil2026(base)
  return {
    base,
    social,
    unemployment,
    medical,
    incomeTax,
    total: social + unemployment + medical + incomeTax
  }
}
const statutoryRestaurantOfficialPayrollCost = (baseValue) => {
  const base = parseNum(baseValue)
  const employer = statutoryEmployerPayrollCharges(base)
  const employee = statutoryEmployeePayrollDeductions(base)
  return {
    base,
    employer,
    employee,
    total: employer.total + employee.total
  }
}
const todayISO = () => new Date().toISOString().slice(0, 10)
const ADVANCE_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const canEditAdvance = (row) => row?.created_at ? (Date.now() - new Date(row.created_at).getTime()) <= ADVANCE_EDIT_WINDOW_MS : true
const canEditWithinWeek = (row) => row?.created_at ? (Date.now() - new Date(row.created_at).getTime()) <= EDIT_WINDOW_MS : true
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
const employeeGroupName = (emp) => {
  if (!emp?.branch_id) return 'Менеджеры'
  if (emp?.branches?.name) return emp.branches.name
  if (emp?.branch_name) return emp.branch_name
  return 'Филиал'
}
const staffGroupOptions = (branches) => [{ id: STAFF_GROUP_MANAGERS, name: 'Менеджеры' }, ...branches]
const positionGroup = (position) => {
  const p = String(position || '').toLowerCase()
  if (p.includes('менедж') || p.includes('управ') || p.includes('директор') || p.includes('админ') || p.includes('закуп') || p.includes('smm') || p.includes('шеф-бар') || p.includes('шеф бар') || p.includes('шеф-повар') || p.includes('шеф повар') || p.includes('brand') || p.includes('manager') || p.includes('director') || p.includes('admin')) return 'Менеджеры'
  if (p.includes('бар') || p.includes('сервис') || p.includes('servis') || p.includes('service')) return 'Бар'
  if (p.includes('повар') || p.includes('кух') || p.includes('chef')) return 'Повар'
  if (p.includes('стю') || p.includes('стью') || p.includes('stew')) return 'Стьюарт'
  return 'Другое'
}
const isManagerStaff = (emp) => {
  const position = String(emp?.position || '').toLowerCase()
  const groupName = String(emp?.branches?.name || emp?.branch_name || '').toLowerCase()
  return !emp?.branch_id
    || groupName.includes('менедж')
    || positionGroup(position) === 'Менеджеры'
    || ['owner', 'ceo', 'coo', 'cfo', 'управ', 'директор', 'админ', 'закуп', 'smm', 'шеф'].some(x => position.includes(x))
}
const matchesStaffGroup = (emp, groupId) => {
  if (groupId === 'all') return true
  if (groupId === STAFF_GROUP_MANAGERS) return !emp?.branch_id
  return String(employeeGroupId(emp)) === String(groupId)
}
const matchesPositionGroup = (emp, group) => group === 'all' || positionGroup(emp?.position) === group

function useLang() {
  const [lang, setLangState] = useState(localStorage.getItem('rms_lang') || localStorage.getItem('nms_lang') || 'ru')
  const setLang = (value) => {
    localStorage.setItem('rms_lang', value)
    setLangState(value)
  }
  return [lang, setLang, (key) => I18N[lang]?.[key] || I18N.ru[key] || key]
}


const RMS_INTERNAL_USERS_KEY = 'rms_internal_users_v2'
const RMS_INTERNAL_PERMISSIONS_KEY = 'rms_internal_permissions_v2'
const RMS_INTERNAL_SESSION_KEY = 'rms_internal_session_v2'

const normalizeInternalLogin = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/@(rms|nms)\.local\.az$/i, '')
    .replace(/@rms\.internal$/i, '')

const readJsonStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (_e) {
    return fallback
  }
}

const writeJsonStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (_e) {}
}

const getInternalUsers = () =>
  readJsonStorage(RMS_INTERNAL_USERS_KEY, null) ||
  readJsonStorage('rms_internal_users_v1', null) ||
  {}

const setInternalUsers = (users) => writeJsonStorage(RMS_INTERNAL_USERS_KEY, users || {})

const getInternalPermissions = () =>
  readJsonStorage(RMS_INTERNAL_PERMISSIONS_KEY, null) ||
  readJsonStorage('rms_internal_permissions_v1', null) ||
  {}

const setInternalPermissions = (perms) => writeJsonStorage(RMS_INTERNAL_PERMISSIONS_KEY, perms || {})

const getInternalSessionStorage = () =>
  readJsonStorage(RMS_INTERNAL_SESSION_KEY, null) ||
  readJsonStorage('rms_internal_session_v1', null)

const setInternalSessionStorage = (session) => {
  try {
    if (session) writeJsonStorage(RMS_INTERNAL_SESSION_KEY, session)
    else {
      localStorage.removeItem(RMS_INTERNAL_SESSION_KEY)
      localStorage.removeItem('rms_internal_session_v1')
    }
  } catch (_e) {}
}

const RMS_APP_SETTINGS_TABLE = 'rms_app_settings'
const RMS_CUSTOM_LOGO_KEY = 'custom_logo'
const RMS_HIDDEN_SALES_KEYS_SETTING = 'hidden_sales_keys'
const RMS_SALES_NAME_ALIASES_SETTING = 'sales_name_aliases'

async function readRmsAppSetting(key, fallback = null) {
  try {
    const { data, error } = await supabase
      .from(RMS_APP_SETTINGS_TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) return fallback
    return data?.value ?? fallback
  } catch (_e) {
    return fallback
  }
}

async function writeRmsAppSetting(key, value) {
  try {
    const { error } = await supabase
      .from(RMS_APP_SETTINGS_TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    return { error: error || null }
  } catch (error) {
    return { error }
  }
}

async function deleteRmsAppSetting(key) {
  try {
    const { error } = await supabase
      .from(RMS_APP_SETTINGS_TABLE)
      .delete()
      .eq('key', key)
    return { error: error || null }
  } catch (error) {
    return { error }
  }
}


const RMS_GLOBAL_PROGRESS_EVENT = 'rms-global-progress'
const startGlobalProgress = (label = 'Выполняется операция...') => {
  let progress = 12
  window.dispatchEvent(new CustomEvent(RMS_GLOBAL_PROGRESS_EVENT, { detail: { active: true, progress, label } }))
  const timer = setInterval(() => {
    progress = Math.min(92, progress + Math.max(1, Math.round((96 - progress) / 8)))
    window.dispatchEvent(new CustomEvent(RMS_GLOBAL_PROGRESS_EVENT, { detail: { active: true, progress, label } }))
  }, 320)
  return () => {
    clearInterval(timer)
    window.dispatchEvent(new CustomEvent(RMS_GLOBAL_PROGRESS_EVENT, { detail: { active: true, progress: 100, label: 'Готово' } }))
    setTimeout(() => window.dispatchEvent(new CustomEvent(RMS_GLOBAL_PROGRESS_EVENT, { detail: { active: false, progress: 0, label: '' } })), 260)
  }
}

function GlobalProgressOverlay() {
  const [state, setState] = useState({ active: false, progress: 0, label: '' })
  useEffect(() => {
    const handler = e => setState(e.detail || { active: false, progress: 0, label: '' })
    window.addEventListener(RMS_GLOBAL_PROGRESS_EVENT, handler)
    return () => window.removeEventListener(RMS_GLOBAL_PROGRESS_EVENT, handler)
  }, [])
  if (!state.active) return null
  return <div className="global-progress-overlay">
    <div className="global-progress-card">
      <div className="global-progress-spinner" />
      <strong>{state.label || 'Выполняется операция...'}</strong>
      <div className="global-progress-track"><div style={{width: `${Math.round(state.progress || 0)}%`}} /></div>
      <span>{Math.round(state.progress || 0)}%</span>
    </div>
  </div>
}

function getRmsLocalUser() {
  const sess = getInternalSessionStorage()
  if (!sess?.rms_internal) return null
  const login = normalizeInternalLogin(sess?.user?.login_name || sess?.user?.email)
  const users = getInternalUsers()
  const localUser = users[login] || Object.values(users).find(u => u?.id === sess?.user?.id)
  if (!localUser) return null
  return {
    id: localUser.id,
    login_name: localUser.login || login,
    email: `${localUser.login || login}@rms.internal`,
    full_name: localUser.full_name || localUser.login || login,
    role: 'employee',
    is_active: localUser.is_active !== false,
    hide_manager_salary: Boolean(localUser.hide_manager_salary || localUser.hide_manager_salaries),
    hide_manager_salaries: Boolean(localUser.hide_manager_salary || localUser.hide_manager_salaries),
    ui_theme: localUser.ui_theme || 'classic',
    rms_internal: true
  }
}

const makeInternalPermissionRows = (userId) => {
  const all = getInternalPermissions()
  const byUser = all[userId] || {}
  return Object.entries(byUser).map(([section, access]) => ({ user_id: userId, section, access }))
}

async function fetchRmsStaffWorkspaceSnapshot(monthDate) {
  if (!monthDate) return { data: null, error: new Error('monthDate is required') }
  const { data, error } = await supabase.rpc('rms_staff_workspace_snapshot', { p_month: monthDate })
  if (error) return { data: null, error }
  const normalized = data && typeof data === 'object' ? data : null
  if (!normalized) return { data: null, error: new Error('Empty RMS workspace snapshot') }
  return { data: normalized, error: null }
}


async function fetchRmsRevenueWorkspace(branchId, activeDate) {
  if (!branchId || !activeDate) return { data: null, error: new Error('branchId/date required') }
  const { data, error } = await supabase.rpc('rms_revenue_day_workspace', { p_branch_id: branchId, p_date: activeDate })
  if (error) return { data: null, error }
  const normalized = data && typeof data === 'object' ? data : null
  if (!normalized) return { data: null, error: new Error('Empty RMS revenue workspace') }
  return { data: normalized, error: null }
}


async function fetchRmsSuppliersWorkspace() {
  const { data, error } = await supabase.rpc('rms_suppliers_workspace')
  if (error) return { data: null, error }
  const normalized = data && typeof data === 'object' ? data : null
  if (!normalized) return { data: null, error: new Error('Empty RMS suppliers workspace') }
  return { data: normalized, error: null }
}

async function fetchRmsRecipesWorkspace() {
  const { data, error } = await supabase.rpc('rms_recipes_workspace')
  if (error) return { data: null, error }
  const normalized = data && typeof data === 'object' ? data : null
  if (!normalized) return { data: null, error: new Error('Empty RMS recipes workspace') }
  return { data: normalized, error: null }
}


function App() {
  const [lang, setLang, t] = useLang()
  const [session, setSession] = useState(() => getInternalSessionStorage())
  const [profile, setProfile] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [theme, setThemeState] = useState(localStorage.getItem('rms_theme') || localStorage.getItem('nms_theme') || 'classic')
  const [section, setSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const setTheme = (value) => {
    const next = value || 'classic'
    localStorage.setItem('rms_theme', next)
    setThemeState(next)
  }

  useEffect(() => { document.documentElement.dataset.nmsTheme = theme }, [theme])

  useEffect(() => {
    const storedInternal = getInternalSessionStorage()
    if (storedInternal?.rms_internal) {
      setSession(storedInternal)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!getInternalSessionStorage()?.rms_internal) setSession(nextSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadSupabaseProfile(activeSession) {
    const email = activeSession.user.email || ''
    const loginName = String(email).split('@')[0] || ''

    let prof = null
    const { data: profById } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', activeSession.user.id)
      .maybeSingle()

    prof = profById || null

    if (!prof && (email || loginName)) {
      const filters = []
      if (email) filters.push(`email.eq.${email}`)
      if (loginName) filters.push(`login_name.eq.${loginName}`)
      const { data: profByLogin } = await supabase
        .from('user_profiles')
        .select('*')
        .or(filters.join(','))
        .maybeSingle()
      prof = profByLogin || null
    }

    const permissionUserId = prof?.id || activeSession.user.id
    const { data: perms } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', permissionUserId)

    setProfile(prof)
    setPermissions(perms || [])
    if (prof?.ui_theme) setTheme(prof.ui_theme)
  }

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) { setProfile(null); setPermissions([]); return }

      if (session?.rms_internal) {
        const localUser = getRmsLocalUser()
        setProfile(localUser)
        setPermissions(makeInternalPermissionRows(localUser?.id || session.user.id))
        if (localUser?.ui_theme) setTheme(localUser.ui_theme)
        return
      }

      await loadSupabaseProfile(session)
    }
    loadProfile()
  }, [session])

  useEffect(() => {
    const reloadUserAccess = async () => {
      if (!session?.user) return

      if (session?.rms_internal) {
        const localUser = getRmsLocalUser()
        setProfile(localUser)
        setPermissions(makeInternalPermissionRows(localUser?.id || session.user.id))
        if (localUser?.ui_theme) setTheme(localUser.ui_theme)
        return
      }

      await loadSupabaseProfile(session)
    }

    window.addEventListener('rms-user-settings-updated', reloadUserAccess)
    window.addEventListener('storage', reloadUserAccess)
    return () => {
      window.removeEventListener('rms-user-settings-updated', reloadUserAccess)
      window.removeEventListener('storage', reloadUserAccess)
    }
  }, [session])

  const isInternalSession = Boolean(session?.rms_internal)
  const isAdmin = !isInternalSession && (!profile || profile?.role === 'admin')
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

  function logout() {
    if (session?.rms_internal) {
      setInternalSessionStorage(null)
      setSession(null)
      setProfile(null)
      setPermissions([])
      return
    }
    supabase.auth.signOut()
  }

  if (loading) return <div className="login-screen"><div className="login-card">{t('loading')}</div></div>
  if (!session) return <Login lang={lang} setLang={setLang} t={t} />

  return (
    <div className={`app theme-${theme || 'classic'}`}>
      <aside className="sidebar">
        <div className="brand">
          <ProductLogo compact />
          <div>
            <h1>{t('system_short_title')}</h1>
            <p>{t('brand_subtitle')}</p>
          </div>
        </div>

        <nav className="nav-tabs">
          {visibleSections.map(s => (
            <button key={s.id} className={`nav ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>{t(s.key)}</button>
          ))}
          <button className="nav logout-nav" onClick={logout}>{t('logout')}</button>
        </nav>

        <div className="userbar">
          <span>{profile?.full_name || profile?.login_name || session.user.email}</span>
        </div>
      </aside>

      <main className={`main ${currentAccess === 'read' ? 'readonly-mode' : ''}`}>
        <DashboardStyles />
        <ThemeStyles />
        <ResponsiveAndSettingsStyles />
        <GlobalProgressOverlay />
        {!canReadAccess(currentAccess) && <section className="card"><h3>{t('permission_denied')}</h3><p className="hint">Этот раздел скрыт для текущего пользователя.</p></section>}
        {canReadAccess(currentAccess) && currentAccess === 'read' && <div className="readonly-banner">Режим просмотра: редактирование этого раздела отключено.</div>}
        {canReadAccess(currentAccess) && section === 'dashboard' && <Dashboard t={t} />}
        {canReadAccess(currentAccess) && section === 'revenue' && <Revenue t={t} />}
        {canReadAccess(currentAccess) && section === 'finance' && <Finance t={t} lang={lang} />}
        {canReadAccess(currentAccess) && section === 'reports' && <Reports t={t} />}
        {canReadAccess(currentAccess) && section === 'recipes' && <Recipes t={t} />}
        {canReadAccess(currentAccess) && section === 'salaries' && <SalaryWorkspace t={t} isAdmin={isAdmin || accessRank(sectionAccess('salaries')) >= accessRank('admin')} />}
        {canReadAccess(currentAccess) && section === 'suppliers' && <Suppliers t={t} />}
        {canReadAccess(currentAccess) && section === 'debts' && <DebtsPayments t={t} />}
        {canReadAccess(currentAccess) && section === 'settings' && <Settings session={session} t={t} theme={theme} setTheme={setTheme} />}
      </main>
    </div>
  )
}


function SalaryWorkspace({ t, isAdmin = false }) {
  const [salaryTab, setSalaryTab] = useState('employees')
  return (
    <section>
      <section className="topbar">
        <div>
          <h2>Зарплаты</h2>
          <p>Единый раздел персонала: сотрудники, посещаемость, авансы и DSMF в одном месте.</p>
        </div>
      </section>
      <div className="settings-tabs">
        <button className={salaryTab === 'employees' ? 'active' : ''} onClick={() => setSalaryTab('employees')}>Сотрудники</button>
        <button className={salaryTab === 'sheet' ? 'active' : ''} onClick={() => setSalaryTab('sheet')}>Зарплатный лист</button>
        <button className={salaryTab === 'attendance' ? 'active' : ''} onClick={() => setSalaryTab('attendance')}>Посещения</button>
        <button className={salaryTab === 'advances' ? 'active' : ''} onClick={() => setSalaryTab('advances')}>Авансы</button>
        <button className={salaryTab === 'dsmf' ? 'active' : ''} onClick={() => setSalaryTab('dsmf')}>DSMF</button>
      </div>
      {salaryTab === 'employees' && <>
        <Salaries t={t} view="employees" isAdmin={isAdmin} />
        <Attendance t={t} mode="staff" isAdmin={isAdmin} />
      </>}
      {salaryTab === 'sheet' && <Salaries t={t} view="sheet" isAdmin={isAdmin} />}
      {salaryTab === 'attendance' && <Attendance t={t} mode="attendance" isAdmin={isAdmin} />}
      {salaryTab === 'advances' && <Advances t={t} />}
      {salaryTab === 'dsmf' && <Salaries t={t} view="dsmf" isAdmin={isAdmin} />}
    </section>
  )
}

function ResponsiveAndSettingsStyles() {
  return <style>{`
    .salary-view-employees .salary-dsmf-card {
      display: none;
    }
    .salary-view-dsmf > .topbar,
    .salary-view-dsmf > .grid > .card:not(.salary-dsmf-card) {
      display: none !important;
    }
    .salary-view-sheet tfoot td {
      background: rgba(71,85,105,.06);
      font-weight: 900;
    }
    .theme-executive .salary-view-sheet tfoot td {
      background: rgba(71,85,105,.08);
    }
    .salary-view-dsmf .salary-dsmf-card {
      display: block !important;
    }
    .settings-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 16px;
    }
    .rms-brandmark {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
    }
    .rms-brandmark.login {
      margin: 0 auto 10px;
    }
    .rms-logo-svg {
      width: 50px;
      height: 50px;
      display: block;
      filter: drop-shadow(0 10px 18px rgba(0,0,0,.18));
    }
    .login-card .rms-logo-svg {
      width: 64px;
      height: 64px;
      filter: drop-shadow(0 12px 18px rgba(0,0,0,.12));
    }
    .rms-custom-logo {
      width: 50px;
      height: 50px;
      object-fit: contain;
      display: block;
      border-radius: 14px;
      box-shadow: 0 10px 18px rgba(0,0,0,.16);
      background: rgba(255,255,255,.9);
      padding: 4px;
    }
    .login-card .rms-custom-logo {
      width: 76px;
      height: 76px;
      border-radius: 18px;
      box-shadow: 0 12px 24px rgba(0,0,0,.12);
    }
    .logo-uploader {
      display: grid;
      gap: 12px;
    }
    .logo-preview-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      border: 1px dashed var(--line);
      border-radius: 16px;
      background: rgba(255,255,255,.48);
    }
    .logo-preview-wrap img {
      width: 84px;
      height: 84px;
      object-fit: contain;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--line);
      padding: 6px;
    }
    .logo-preview-wrap .empty-logo {
      width: 84px;
      height: 84px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      background: #f7f3ea;
      border: 1px dashed var(--line);
      color: var(--muted);
      font-weight: 800;
    }
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .inline-edit {
      display: grid;
      grid-template-columns: minmax(140px, 1fr) auto;
      gap: 8px;
      align-items: center;
      min-width: 260px;
    }
    .login-title {
      margin: 0;
      text-align: center;
      font-size: 20px;
      letter-spacing: .14em;
      font-weight: 900;
    }
    .login-subtitle {
      margin: 4px 0 10px;
      text-align: center;
      color: var(--muted);
      font-size: 13px;
    }
    .settings-tabs button {
      background: rgba(23,37,29,.08);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 10px 14px;
      font-weight: 800;
    }
    .settings-tabs button.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .blurred-money {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 72px;
      height: 24px;
      padding: 0 10px;
      border-radius: 999px;
      background: rgba(23,37,29,.12);
      color: transparent;
      text-shadow: 0 0 8px rgba(23,37,29,.65);
      filter: blur(2.2px);
      user-select: none;
      pointer-events: none;
      font-weight: 900;
      letter-spacing: .12em;
    }
    .cell-value {
      display: inline-block;
      min-width: 0;
      padding: 2px 0;
    }
    .table-wrap table th,
    .table-wrap table td {
      vertical-align: middle;
    }
    @media (max-width: 900px) {
      .app {
        display: block;
      }
      .sidebar {
        position: sticky;
        top: 0;
        z-index: 30;
        width: 100%;
        min-height: auto;
        padding: 12px;
        border-radius: 0 0 18px 18px;
      }
      .brand h1 {
        font-size: 18px;
      }
      .brand p {
        display: none;
      }
      .nav-tabs {
        display: flex;
        overflow-x: auto;
        gap: 8px;
        padding-bottom: 4px;
        -webkit-overflow-scrolling: touch;
      }
      .nav-tabs .nav {
        white-space: nowrap;
        min-width: max-content;
      }
      .userbar {
        margin-top: 10px;
      }
      .main {
        padding: 12px;
      }
      .topbar {
        display: block;
      }
      .topbar h2 {
        font-size: 24px;
      }
      .grid,
      .form-grid,
      .mini-grid {
        display: block;
      }
      .card {
        margin-bottom: 12px;
        padding: 14px;
        border-radius: 16px;
      }
      .span-2 {
        grid-column: auto;
      }
      .settings-tabs {
        position: sticky;
        top: 108px;
        z-index: 20;
        background: var(--bg);
        padding: 8px 0;
        overflow-x: auto;
        flex-wrap: nowrap;
        -webkit-overflow-scrolling: touch;
      }
      .settings-tabs button {
        white-space: nowrap;
        min-width: max-content;
      }
      .table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      table {
        min-width: 760px;
      }
      th, td {
        padding: 8px;
        font-size: 12px;
      }
      input, select, textarea, button {
        font-size: 16px;
      }
    }
    @media (max-width: 520px) {
      .login-card {
        padding: 18px;
      }
      .big-number {
        font-size: 30px;
      }
      .metric {
        align-items: flex-start;
      }
      .permission-grid {
        grid-template-columns: 1fr;
      }
      .card-head {
        display: block;
      }
      .card-head button {
        margin-top: 10px;
      }
    }

    /* FINAL FIELD COLOR OVERRIDE: all normal fields are white, attendance day cells are excluded. */
    .app input:not([type="checkbox"]),
    .app select,
    .app textarea,
    .login-screen input:not([type="checkbox"]),
    .login-screen select,
    .login-screen textarea,
    .theme-executive input:not([type="checkbox"]),
    .theme-executive select,
    .theme-executive textarea {
      background: #ffffff !important;
      color: #111827 !important;
      border-color: #cbd5e1 !important;
      box-shadow: none !important;
    }
    .attendance-card td button.attendance-day-cell,
    .theme-executive .attendance-card td button.attendance-day-cell {
      box-shadow: inset 0 1px 2px rgba(15,23,42,.08) !important;
    }
    .supplier-opening-debt-card {
      border: 1px solid rgba(71,85,105,.28) !important;
      background: linear-gradient(180deg, #ffffff, #f8fafc) !important;
      box-shadow: 0 16px 36px rgba(15,23,42,.07) !important;
    }
  `}</style>
}


function ProductLogo({ compact = false, login = false }) {
  const [customLogo, setCustomLogo] = useState(() => {
    try { return localStorage.getItem('rms_custom_logo') || sessionStorage.getItem('rms_custom_logo') || '' } catch (_e) { return '' }
  })

  useEffect(() => {
    let cancelled = false
    const syncLogo = () => {
      try { setCustomLogo(localStorage.getItem('rms_custom_logo') || sessionStorage.getItem('rms_custom_logo') || '') } catch (_e) { setCustomLogo('') }
    }
    async function loadCloudLogo() {
      const cloudLogo = await readRmsAppSetting(RMS_CUSTOM_LOGO_KEY, '')
      if (cancelled || !cloudLogo) return
      try {
        localStorage.setItem('rms_custom_logo', cloudLogo)
        sessionStorage.setItem('rms_custom_logo', cloudLogo)
      } catch (_e) {}
      setCustomLogo(cloudLogo)
    }
    syncLogo()
    loadCloudLogo()
    window.addEventListener('storage', syncLogo)
    window.addEventListener('rms-logo-updated', syncLogo)
    return () => {
      cancelled = true
      window.removeEventListener('storage', syncLogo)
      window.removeEventListener('rms-logo-updated', syncLogo)
    }
  }, [])

  if (customLogo) {
    const wrapStyle = login
      ? { width: 270, maxWidth: '100%', height: 138, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
      : compact
        ? { width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: '0 0 auto' }
        : { width: 140, height: 82, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }

    const imgStyle = {
      display: 'block',
      maxWidth: '100%',
      maxHeight: '100%',
      width: 'auto',
      height: 'auto',
      objectFit: 'contain'
    }

    return <div className={`rms-brandmark ${compact ? 'compact' : ''} ${login ? 'login' : ''}`} style={wrapStyle}>
      <img src={customLogo} alt="RMS logo" className="rms-custom-logo" style={imgStyle} />
    </div>
  }

  return <div className={`rms-brandmark ${compact ? 'compact' : ''} ${login ? 'login' : ''}`}>
    <svg className="rms-logo-svg" viewBox="0 0 128 128" aria-hidden="true">
      <defs>
        <linearGradient id="rmsBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#24352b" />
          <stop offset="100%" stopColor="#0f1b15" />
        </linearGradient>
        <linearGradient id="rmsAccent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d7c3a0" />
          <stop offset="100%" stopColor="#f3e7d4" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="112" height="112" rx="30" fill="url(#rmsBg)" />
      <rect x="16" y="16" width="96" height="96" rx="24" fill="none" stroke="rgba(243,231,212,.18)" strokeWidth="1.6" />
      <text x="64" y="74" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="34" fontWeight="900" letterSpacing="3" fill="url(#rmsAccent)">RMS</text>
      <path d="M31 88h66" fill="none" stroke="rgba(243,231,212,.24)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
}

function normalizeLoginCandidates(login) {
  const value = String(login || '').trim().toLowerCase()
  if (!value) return []
  if (value.includes('@')) return [value]
  return [`${value}@rms.local.az`, `${value}@nms.local.az`]
}

function Login({ lang, setLang, t }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setError('')
    const stopProgress = startGlobalProgress('Вход в RMS...')
    try {
    const rawLogin = String(login || '').trim()
    const rawPassword = String(password || '')
    if (!rawLogin || !rawPassword) { stopProgress(); return setError(t('login_error')) }

    const normalizedLogin = normalizeInternalLogin(rawLogin)
    const internalUsers = getInternalUsers()
    const internalUser = normalizedLogin
      ? (internalUsers[normalizedLogin] || Object.values(internalUsers).find(u =>
          normalizeInternalLogin(u?.login || u?.email) === normalizedLogin ||
          String(u?.id || '') === normalizedLogin
        ))
      : null

    if (internalUser) {
      if (internalUser.is_active === false) { stopProgress(); return setError('Пользователь отключён') }
      if (String(internalUser.password || '') !== rawPassword) { stopProgress(); return setError(t('login_error')) }

      const loginName = internalUser.login || normalizedLogin
      setInternalSessionStorage({
        rms_internal: true,
        access_token: `rms-internal-${internalUser.id || loginName}`,
        user: {
          id: internalUser.id || `rms-${loginName}`,
          email: `${loginName}@rms.internal`,
          login_name: loginName
        }
      })
      window.dispatchEvent(new Event('rms-user-settings-updated'))
      window.location.reload()
      return
    }

    if (!rawLogin.includes('@') || /@(rms|nms)\.local\.az$/i.test(rawLogin) || /@rms\.internal$/i.test(rawLogin)) {
      stopProgress(); return setError('Пользователь не найден или пароль неверный. Создайте пользователя заново в Настройки → Пользователи.')
    }

    const { error } = await supabase.auth.signInWithPassword({ email: rawLogin.toLowerCase(), password: rawPassword })
    stopProgress()
    if (!error) {
      setInternalSessionStorage(null)
      return
    }

    setError(error?.message || t('login_error'))
    } catch (e) {
      stopProgress()
      setError(e?.message || t('login_error'))
    }
  }

  return <div className="login-screen theme-executive">
    <ThemeStyles />
    <ResponsiveAndSettingsStyles />
    <GlobalProgressOverlay />
    <div className="login-card">
    <ProductLogo login />
    <h1 className="login-title">{t('system_title')}</h1>
    <p className="login-subtitle">{t('brand_subtitle')}</p>
    <p>{t('login_hint')}</p>
    <label><span>{t('language_label')}</span><select value={lang} onChange={e => setLang(e.target.value)}><option value="ru">Русский</option><option value="az">Azərbaycan</option></select></label>
    <label><span>{t('login_label')}</span><input value={login} onChange={e => setLogin(e.target.value)} placeholder="" autoComplete="username" /></label>
    <label><span>{t('password_label')}</span><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
    <label className="checkbox-row"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> {t('show_password')}</label>
    {error && <p className="bad">{error}</p>}
    <button className="primary" onClick={signIn}>{t('login_button')}</button>
  </div></div>
}

function useBranches() {
  const [branches, setBranches] = useState([])
  useEffect(() => {
    let alive = true

    async function loadBranches() {
      const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).order('name')
      if (!error && data?.length) {
        if (alive) setBranches(data || [])
        return
      }

      const now = new Date()
      const { data: snap } = await fetchRmsStaffWorkspaceSnapshot(monthStart(now.getFullYear(), now.getMonth() + 1))
      const map = new Map()
      ;(snap?.employees || []).forEach(e => {
        if (e.branch_id) {
          map.set(e.branch_id, {
            id: e.branch_id,
            name: e.branches?.name || e.branch_name || 'Филиал',
            is_active: true
          })
        }
      })

      if (alive) setBranches(Array.from(map.values()).sort((a, b) => String(a.name).localeCompare(String(b.name))))
    }

    loadBranches()
    return () => { alive = false }
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
  const [manualOpeningCashEnabled, setManualOpeningCashEnabled] = useState(false)
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

  function expenseNameFromRow(row) {
    return row?.expense_categories?.name || row?.custom_category || ''
  }

  function expenseNameFromPatch(row, patch) {
    if (patch?.category_id) {
      const category = categories.find(c => String(c.id) === String(patch.category_id))
      return category?.name || row?.expense_categories?.name || ''
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'custom_category')) return patch.custom_category || ''
    return expenseNameFromRow(row)
  }

  async function bazarExpenseIdsForDates(dates, includeId = null) {
    const uniqueDates = [...new Set((dates || []).filter(Boolean))]
    const ids = new Set(includeId ? [includeId] : [])
    if (!uniqueDates.length) return [...ids]

    const { data, error } = await supabase
      .from('daily_expenses')
      .select('id, custom_category, category_id, expense_categories(name)')
      .in('expense_date', uniqueDates)
      .is('deleted_at', null)

    if (error) throw error
    ;(data || []).forEach(row => {
      const categoryName = row.expense_categories?.name || ''
      if (isBazarExpenseName(row.custom_category) || isBazarExpenseName(categoryName)) ids.add(row.id)
    })
    return [...ids]
  }

  async function distributeBazarExpense({ sourceExpense, nextExpense, user }) {
    const targetDate = nextExpense.expense_date || date
    const amount = parseNum(nextExpense.amount)
    if (!targetDate || amount <= 0) throw new Error('Введите сумму расхода Базар')

    const { data: revenueRows, error: revenueError } = await supabase
      .from('daily_revenue')
      .select('branch_id, cash_amount, bank_amount, wolt_amount')
      .eq('revenue_date', targetDate)
      .is('deleted_at', null)

    if (revenueError) throw revenueError

    const revenueByBranch = (revenueRows || [])
      .map(row => ({
        branch_id: row.branch_id,
        revenue: parseNum(row.cash_amount) + parseNum(row.bank_amount) + parseNum(row.wolt_amount)
      }))
      .filter(row => row.branch_id && row.revenue > 0)

    const totalRevenue = revenueByBranch.reduce((sum, row) => sum + row.revenue, 0)
    if (totalRevenue <= 0) throw new Error('За выбранную дату нет выручки по филиалам. Сначала внесите выручку, затем сохраните Базар.')

    const bazarCategoryId = nextExpense.category_id && isBazarExpenseName(expenseNameFromPatch(sourceExpense, nextExpense))
      ? nextExpense.category_id
      : null
    const commentBase = nextExpense.comment || 'Автоматически распределено по доле выручки'

    const rows = revenueByBranch.map(row => {
      const share = row.revenue / totalRevenue
      return {
        branch_id: row.branch_id,
        expense_date: targetDate,
        category_id: bazarCategoryId,
        custom_category: bazarCategoryId ? null : 'Базар',
        amount: Number((amount * share).toFixed(2)),
        comment: `${commentBase} · доля выручки ${pct(share * 100)}`,
        created_by: user.user_id,
        updated_by: user.user_id,
        deleted_at: null,
        deleted_by: null
      }
    })

    const distributedTotal = rows.reduce((sum, row) => sum + parseNum(row.amount), 0)
    const diff = Number((amount - distributedTotal).toFixed(2))
    if (rows.length && diff !== 0) rows[0].amount = Number((parseNum(rows[0].amount) + diff).toFixed(2))

    const idsToDelete = await bazarExpenseIdsForDates([sourceExpense?.expense_date, targetDate], sourceExpense?.id)
    if (idsToDelete.length) {
      const { error: deleteError } = await supabase.from('daily_expenses').delete().in('id', idsToDelete)
      if (deleteError) throw deleteError
    }

    const { data: inserted, error: insertError } = await supabase
      .from('daily_expenses')
      .insert(rows)
      .select('id, branch_id, amount')

    if (insertError) throw insertError
    return inserted || []
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

  function expenseGroupName(name) {
    const value = String(name || '').toLowerCase()
    if (value.includes('аренд')) return 'rent'
    if (value.includes('коммун') || value.includes('свет') || value.includes('газ') || value.includes('вода') || value.includes('элект')) return 'utilities'
    if (value.includes('упаков') || value.includes('тара') || value.includes('однораз')) return 'packaging'
    if (value.includes('маркет') || value.includes('реклам') || value.includes('smm')) return 'marketing'
    if (isBazarExpenseName(value) || value.includes('market') || value.includes('продукт')) return 'food_market'
    if (value.includes('ремонт') || value.includes('тех') || value.includes('обслуж')) return 'maintenance'
    return 'other'
  }

  function expenseGroupTotal(rows, group) {
    return (rows || []).filter(r => expenseGroupName(r.name) === group).reduce((s, r) => s + parseNum(r.amount), 0)
  }

  function purchaseFoodTotal(rows) {
    return (rows || []).reduce((sum, p) => {
      const items = p.supplier_purchase_items || []
      if (items.length) {
        return sum + items.reduce((itemSum, i) => {
          const cat = i.supplier_products?.category || ''
          const isFood = cat === 'Бар' || cat === 'Кухня'
          return itemSum + (isFood ? parseNum(i.total_amount) : 0)
        }, 0)
      }
      return sum + parseNum(p.total_amount)
    }, 0)
  }

  function suggestedStaffLimit(position, revenue) {
    const group = positionGroup(position)
    if (!revenue) return 0
    if (group === 'Менеджеры') return revenue > 220000 ? 3 : revenue > 120000 ? 2 : 1
    if (group === 'Бар') return Math.max(1, Math.ceil(revenue / 45000))
    if (group === 'Повар') return Math.max(1, Math.ceil(revenue / 55000))
    if (group === 'Стьюарт') return revenue > 90000 ? 2 : revenue > 30000 ? 1 : 0
    return Math.max(1, Math.ceil(revenue / 80000))
  }

  function addAiPercent(rows, { branchName, indicator, amount, revenue, limit, recommendation }) {
    const value = parseNum(amount)
    if (value <= 0) return
    if (revenue <= 0) {
      rows.push({
        branchName,
        indicator,
        fact: `нет выручки · ${fmt(value)} AZN`,
        norm: `≤ ${fmt(limit)}% от выручки`,
        deviation: 'нет базы для %',
        level: 'critical',
        recommendation: `За месяц нет выручки, но есть расход. ${recommendation}`
      })
      return
    }
    const actual = value / revenue * 100
    const deviation = actual - limit
    if (actual > limit) {
      rows.push({
        branchName,
        indicator,
        fact: `${pct(actual)} · ${fmt(value)} AZN`,
        norm: `≤ ${fmt(limit)}%`,
        deviation: `+${pct(deviation)}`,
        level: deviation >= 8 ? 'critical' : 'warning',
        recommendation
      })
    }
  }

  function buildAiForBranch({ branch, branchStats, expenseRows, purchaseRows, employeeRows }) {
    const rows = []
    const branchName = branch?.name || 'Все филиалы'
    const revenue = parseNum(branchStats?.revenue)
    const operatingExpenses = parseNum(branchStats?.expenses)
    const salaryAmount = parseNum(branchStats?.salary)
    const serviceAmount = parseNum(branchStats?.serviceCost)
    const taxAmount = parseNum(branchStats?.tax)
    const net = parseNum(branchStats?.net)
    const totalBurden = operatingExpenses + salaryAmount + serviceAmount + taxAmount

    if (revenue <= 0 && totalBurden > 0) {
      rows.push({
        branchName,
        indicator: 'Нет выручки при наличии расходов',
        fact: `${fmt(totalBurden)} AZN расходов`,
        norm: 'Выручка должна покрывать расходы',
        deviation: `-${fmt(totalBurden)} AZN`,
        level: 'critical',
        recommendation: 'Проверь корректность введённой выручки за месяц. Если данные верны — филиал убыточен и требует срочных действий.'
      })
    }

    const marketFoodAmount = expenseGroupTotal(expenseRows, 'food_market')
    const foodAmount = purchaseFoodTotal(purchaseRows) + marketFoodAmount
    addAiPercent(rows, {
      branchName,
      indicator: 'Food cost / закупки Бар + Кухня + Базар',
      amount: foodAmount,
      revenue,
      limit: 35,
      recommendation: 'Проверить рост закупочных цен, нормы техкарт, списания, порции и позиции с низкой маржой.'
    })

    addAiPercent(rows, {
      branchName,
      indicator: 'Фонд зарплаты',
      amount: parseNum(branchStats?.salary),
      revenue,
      limit: 25,
      recommendation: 'Сверить график смен с фактической выручкой, переработки и количество сотрудников по должностям.'
    })

    addAiPercent(rows, {
      branchName,
      indicator: 'Service charge персоналу',
      amount: parseNum(branchStats?.serviceCost),
      revenue,
      limit: 5,
      recommendation: 'Проверить процент service charge персоналу и соответствие фактической выручке.'
    })

    const rent = expenseGroupTotal(expenseRows, 'rent')
    if (rent > 0) addAiPercent(rows, {
      branchName,
      indicator: 'Аренда',
      amount: rent,
      revenue,
      limit: 12,
      recommendation: 'Аренда выше референса: нужен рост выручки, пересмотр условий или компенсация высокой маржей.'
    })
    if (rent > 0 && revenue > 0 && rent >= revenue) {
      rows.push({
        branchName,
        indicator: 'Аренда выше выручки',
        fact: `${fmt(rent)} AZN аренда · ${fmt(revenue)} AZN выручка`,
        norm: 'Аренда должна быть значительно ниже выручки',
        deviation: `+${fmt(rent - revenue)} AZN`,
        level: 'critical',
        recommendation: 'Это критическое отклонение. Нужно либо поднять оборот, либо пересмотреть аренду/формат филиала.'
      })
    }
    if (revenue > 0 && totalBurden > revenue) {
      rows.push({
        branchName,
        indicator: 'Общие расходы выше выручки',
        fact: `${fmt(totalBurden)} AZN расходов · ${fmt(revenue)} AZN выручка`,
        norm: 'Расходы < выручки',
        deviation: `+${fmt(totalBurden - revenue)} AZN`,
        level: 'critical',
        recommendation: 'Филиал сработал в минус. Проверь аренду, зарплаты, закупки и корректность загрузки выручки.'
      })
    }
    if (net < 0) {
      rows.push({
        branchName,
        indicator: 'Чистый убыток месяца',
        fact: `${fmt(net)} AZN`,
        norm: '≥ 0 AZN',
        deviation: `-${fmt(Math.abs(net))} AZN`,
        level: Math.abs(net) >= Math.max(1000, revenue * 0.1) ? 'critical' : 'warning',
        recommendation: 'Проверь показатели месяца и причины убытка. ИИ теперь должен показывать этот сигнал даже если часть процентов выглядит в норме.'
      })
    }

    const utilities = expenseGroupTotal(expenseRows, 'utilities')
    if (utilities > 0) addAiPercent(rows, {
      branchName,
      indicator: 'Коммунальные расходы',
      amount: utilities,
      revenue,
      limit: 5,
      recommendation: 'Проверить энергоёмкое оборудование, график работы, утечки и сезонное потребление.'
    })

    const packaging = expenseGroupTotal(expenseRows, 'packaging')
    if (packaging > 0) addAiPercent(rows, {
      branchName,
      indicator: 'Упаковка / тара',
      amount: packaging,
      revenue,
      limit: 4,
      recommendation: 'Проверить Wolt/takeaway долю, закупочные цены упаковки и нормы выдачи.'
    })

    const marketing = expenseGroupTotal(expenseRows, 'marketing')
    if (marketing > 0) addAiPercent(rows, {
      branchName,
      indicator: 'Маркетинг / реклама',
      amount: marketing,
      revenue,
      limit: 5,
      recommendation: 'Оценить ROMI: оставить только каналы, которые дают измеримую выручку.'
    })

    const employeesByGroup = new Map()
    ;(employeeRows || []).forEach(e => {
      const g = positionGroup(e.position)
      employeesByGroup.set(g, (employeesByGroup.get(g) || 0) + 1)
    })
    employeesByGroup.forEach((count, group) => {
      const limit = suggestedStaffLimit(group, revenue)
      if (limit > 0 && count > limit) {
        rows.push({
          branchName,
          indicator: `Штат: ${group}`,
          fact: `${count} чел.`,
          norm: `≤ ${limit} чел.`,
          deviation: `+${count - limit} чел.`,
          level: count - limit >= 2 ? 'critical' : 'warning',
          recommendation: 'Проверить необходимость количества сотрудников этой должности относительно оборота и сменности.'
        })
      }
    })

    if (!rows.length) {
      rows.push({
        branchName,
        indicator: 'Отклонения не найдены',
        fact: 'В норме',
        norm: 'Референсы соблюдены',
        deviation: '—',
        level: 'ok',
        recommendation: 'Продолжать контроль food cost, зарплат и постоянных расходов до закрытия месяца.'
      })
    }

    return rows
  }

  async function load() {
    if (!branchId) return
    const isInternal = Boolean(getInternalSessionStorage()?.rms_internal)

    if (isInternal) {
      const { data: ws, error } = await fetchRmsRevenueWorkspace(branchId, date)
      if (!error && ws) {
        setRevenueEntries(ws.revenue_entries || [])
        const cash = ws.cash_register || null
        let openingCash = cash?.opening_cash ?? ''
        if (!cash && ws.previous_cash) openingCash = ws.previous_cash.counted_cash ?? ws.previous_cash.closing_cash ?? ''
        setCashRow(cash)
        setManualOpeningCashEnabled(false)
        setCashForm({ opening_cash: openingCash, counted_cash: cash?.counted_cash ?? '', comment: cash?.comment ?? '' })
        setServiceForm({
          enabled: Boolean(ws.branch_settings?.service_charge_enabled),
          service_percent: ws.branch_settings?.service_charge_percent ?? '10',
          staff_cost_percent: ws.branch_settings?.service_staff_cost_percent ?? '4'
        })
        setExpenses(ws.expenses || [])
        setAdvanceExpenses(ws.salary_advances || [])
        setInflows(ws.inflows || [])
        setCategories(ws.expense_categories || [])
        setLogs(ws.logs || [])
        setMonthStats(ws.month_stats || { cash: 0, bank: 0, wolt: 0, revenue: 0, expenses: 0, inflows: 0, serviceCharge: 0, serviceCost: 0 })
        return
      }
      setMessage(error?.message || 'Нет доступа к выручке')
    }

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
    setManualOpeningCashEnabled(false)
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
    if (getInternalSessionStorage()?.rms_internal) {
      const { data: ws } = await fetchRmsRevenueWorkspace(activeBranchId, activeDate)
      setLogs(ws?.logs || [])
      return
    }
    const { data } = await supabase.from('finance_operation_log').select('*').eq('branch_id', activeBranchId).eq('operation_date', activeDate).order('created_at', { ascending: false }).limit(250)
    setLogs(data || [])
  }

  async function loadMonthStats(activeBranchId = branchId, activeDate = date) {
    if (!activeBranchId) return
    if (getInternalSessionStorage()?.rms_internal) {
      const { data: ws } = await fetchRmsRevenueWorkspace(activeBranchId, activeDate)
      setMonthStats(ws?.month_stats || { cash: 0, bank: 0, wolt: 0, revenue: 0, expenses: 0, inflows: 0, serviceCharge: 0, serviceCost: 0 })
      return
    }
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

    if (getInternalSessionStorage()?.rms_internal) {
      const { error } = await supabase.rpc('rms_add_revenue_entry', {
        p_branch_id: branchId,
        p_date: date,
        p_cash_amount: parseNum(form.cash_amount),
        p_bank_amount: parseNum(form.bank_amount),
        p_wolt_amount: parseNum(form.wolt_amount),
        p_comment: form.comment || null
      })
      if (error) return setMessage(error.message)
      setForm({ cash_amount: '', bank_amount: '', wolt_amount: '', comment: '' })
      await load()
      setMessage('Выручка добавлена и зафиксирована ниже')
      return
    }

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

    if (getInternalSessionStorage()?.rms_internal) {
      const next = { ...current, ...patch }
      const { error } = await supabase.rpc('rms_update_revenue_entry', {
        p_entry_id: id,
        p_revenue_date: next.revenue_date || date,
        p_cash_amount: parseNum(next.cash_amount),
        p_bank_amount: parseNum(next.bank_amount),
        p_wolt_amount: parseNum(next.wolt_amount),
        p_comment: next.comment || null
      })
      if (error) return setMessage(error.message)
      await load()
      return
    }

    const user = await currentUserMeta()
    const { error } = await supabase.from('daily_revenue_entries').update({ ...patch, updated_by: user.user_id }).eq('id', id)
    if (error) return setMessage(error.message)
    for (const [field, value] of Object.entries(patch)) {
      const before = current[field] ?? ''
      const after = value ?? ''
      if (String(before) !== String(after)) await writeLog({ entity_type: 'revenue', record_id: id, action: 'field_update', field_name: field, old_value: before, new_value: after })
    }
    await recalcDailyRevenueAggregate(branchId, current.revenue_date || date)
    if (patch.revenue_date && patch.revenue_date !== current.revenue_date) {
      await recalcDailyRevenueAggregate(branchId, patch.revenue_date)
    }
    await load()
    await Promise.all([loadMonthStats(branchId, date), loadLogs(branchId, date)])
  }

  async function cancelRevenueEntry(id) {
    const current = revenueEntries.find(r => r.id === id)
    if (!current || current.deleted_at) return

    if (getInternalSessionStorage()?.rms_internal) {
      const { error } = await supabase.rpc('rms_cancel_revenue_entry', { p_entry_id: id })
      if (error) return setMessage(error.message)
      await load()
      return
    }

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
    const newName = t('new_expense') || 'Новая статья'
    const { data, error } = await supabase.from('daily_expenses').insert({
      branch_id: branchId,
      expense_date: date,
      category_id: null,
      custom_category: newName,
      amount: 0,
      created_by: user.user_id,
      updated_by: user.user_id
    }).select('*, expense_categories(name)').single()
    if (error) return setMessage(error.message)
    await writeLog({ entity_type: 'expense', record_id: data.id, action: 'create', field_name: 'expense', old_value: null, new_value: newName })
    await load()
  }

  async function updateExpense(id, patch) {
    const current = expenses.find(e => e.id === id)
    if (!current || current.deleted_at) return
    const user = await currentUserMeta()
    const nextExpense = { ...current, ...patch }
    const nextExpenseName = expenseNameFromPatch(current, patch)

    if (isBazarExpenseName(nextExpenseName)) {
      try {
        const inserted = await distributeBazarExpense({ sourceExpense: current, nextExpense, user })
        await writeLog({
          entity_type: 'expense',
          record_id: inserted?.[0]?.id || id,
          action: 'bazar_distribution',
          field_name: 'Базар',
          old_value: current.amount,
          new_value: `${fmt(nextExpense.amount)} распределено между филиалами`
        })
        await load()
        await Promise.all([loadMonthStats(branchId, nextExpense.expense_date || date), loadLogs(branchId, nextExpense.expense_date || date)])
        setMessage('Базар распределён между филиалами по доле выручки')
      } catch (error) {
        setMessage(error?.message || 'Не удалось распределить Базар')
        await load()
      }
      return
    }

    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    const { error } = await supabase.from('daily_expenses').update({ ...patch, updated_by: user.user_id }).eq('id', id)
    if (error) return setMessage(error.message)
    for (const [field, value] of Object.entries(patch)) {
      const before = current[field] ?? ''
      const after = value ?? ''
      if (String(before) !== String(after)) await writeLog({ entity_type: 'expense', record_id: id, action: 'field_update', field_name: field, old_value: before, new_value: after })
    }
    await load()
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
          <label><span>Service Charge Общий</span><input value={serviceForm.enabled ? fmt(formServiceChargeAmount) : '0.00'} readOnly /></label>
          <label><span>Service Charge Персонал</span><input value={serviceForm.enabled ? fmt(formServiceStaffCost) : '0.00'} readOnly /></label>
        </div>{message && <p className="hint">{message}</p>}
          <div className="table-wrap" style={{marginTop:14}}><table><thead><tr><th>Дата</th><th>{t('cash')}</th><th>{t('bank')}</th><th>{t('wolt')}</th><th>{t('comment')}</th><th>Итого</th><th>Service персоналу</th><th>Статус</th><th></th></tr></thead><tbody>
            {revenueEntries.map(r => <RevenueEntryRow key={r.id} row={r} serviceEnabled={serviceForm.enabled} servicePercent={servicePercent} staffCostPercent={staffCostPercent} onSave={patch => updateRevenueEntry(r.id, patch)} onCancel={() => cancelRevenueEntry(r.id)} />)}
            {!revenueEntries.length && <tr><td colSpan="9" className="hint">Пока нет добавлений</td></tr>}
          </tbody></table></div>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>{t('daily_expenses_title')}</h3><p className="hint">Изменения суммы, статьи и комментария фиксируются ниже. Отмена перечёркивает строку и исключает её из расчётов.</p></div><button className="small" onClick={addExpense}>+ Добавить</button></div>
          <div className="form-grid compact"><label><span>{t('daily_expenses_total')}</span><input value={fmt(dailyExpenseTotal)} readOnly /></label></div>
          <div className="table-wrap"><table><thead><tr><th>Дата</th><th>{t('expense_item')}</th><th>{t('amount')}</th><th>{t('comment')}</th><th>Статус</th><th></th></tr></thead><tbody>
            {expenses.map(e => <ExpenseRow key={e.id} expense={e} categories={categories} onSave={patch => updateExpense(e.id, patch)} onCancel={() => cancelExpense(e.id)} />)}
            {advanceExpenses.map(a => <AdvanceExpenseRow key={`adv-${a.id}`} advance={a} />)}
            {!expenses.length && !advanceExpenses.length && <tr><td colSpan="6" className="hint">—</td></tr>}
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

        <div className="card span-2"><h3>Касса за день</h3><p className="hint">Только наличные: касса на начало + наличная выручка + приходы − расходы. Стартовая касса берётся автоматически, но её можно ввести вручную только после включения галочки.</p>
          <div className="form-grid">
            <label><span>Касса на начало дня</span><input value={manualOpeningCashEnabled ? cashForm.opening_cash : fmt(cashForm.opening_cash)} readOnly={!manualOpeningCashEnabled} inputMode="decimal" onChange={e => setCashForm(f => ({ ...f, opening_cash: e.target.value }))} title={manualOpeningCashEnabled ? 'Ручной старт кассы активирован' : 'Автоматически берётся из кассы конца предыдущего дня'} /></label>
            <label className="checkbox-row"><input type="checkbox" checked={manualOpeningCashEnabled} onChange={e => setManualOpeningCashEnabled(e.target.checked)} /> Ввести стартовую кассу вручную</label>
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
  const [editing, setEditing] = useState(false)
  const [entryDate, setEntryDate] = useState(row.revenue_date || todayISO())
  const [cash, setCash] = useState(row.cash_amount ?? '')
  const [bank, setBank] = useState(row.bank_amount ?? '')
  const [wolt, setWolt] = useState(row.wolt_amount ?? '')
  const [comment, setComment] = useState(row.comment || '')
  const cancelled = Boolean(row.deleted_at)
  const editable = !cancelled && canEditWithinWeek(row)

  useEffect(() => setEntryDate(row.revenue_date || todayISO()), [row.id, row.revenue_date])
  useEffect(() => setCash(row.cash_amount ?? ''), [row.id, row.cash_amount])
  useEffect(() => setBank(row.bank_amount ?? ''), [row.id, row.bank_amount])
  useEffect(() => setWolt(row.wolt_amount ?? ''), [row.id, row.wolt_amount])
  useEffect(() => setComment(row.comment || ''), [row.id, row.comment])

  const total = parseNum(row.cash_amount) + parseNum(row.bank_amount) + parseNum(row.wolt_amount)
  const editedTotal = parseNum(cash) + parseNum(bank) + parseNum(wolt)
  const base = serviceEnabled && servicePercent > 0 ? total / (1 + servicePercent / 100) : total
  const staffCost = serviceEnabled ? base * staffCostPercent / 100 : 0

  async function saveChanges() {
    if (!editable) return
    await onSave({ revenue_date: entryDate, cash_amount: parseNum(cash), bank_amount: parseNum(bank), wolt_amount: parseNum(wolt), comment })
    setEditing(false)
  }

  return <>
    <tr className={cancelled ? 'cancelled-row' : ''}>
      <td>{row.revenue_date}</td>
      <td>{fmt(row.cash_amount)}</td>
      <td>{fmt(row.bank_amount)}</td>
      <td>{fmt(row.wolt_amount)}</td>
      <td>{row.comment || '—'}</td>
      <td><b>{fmt(total)}</b></td>
      <td><b>{fmt(staffCost)}</b></td>
      <td>{cancelled ? `Отменено · ${formatDT(row.deleted_at)}` : editable ? 'Активно' : 'Редактирование закрыто'}</td>
      <td>{cancelled ? <span className="hint">—</span> : <button className="ghost small" onClick={() => setEditing(true)}>Редактировать</button>}</td>
    </tr>
    {editing && <tr><td colSpan="9"><div className="notice">
      <h3>Редактирование выручки</h3>
      <p className="hint">Можно исправить сумму, комментарий или дату. Смена даты фиксируется в журнале и переносит строку на выбранный день.</p>
      <div className="form-grid compact">
        <label><span>Дата операции</span><input type="date" value={entryDate} disabled={!editable} onChange={e => setEntryDate(e.target.value)} /></label>
        <label><span>Наличные</span><input inputMode="decimal" value={cash} disabled={!editable} onChange={e => setCash(e.target.value)} /></label>
        <label><span>Банк</span><input inputMode="decimal" value={bank} disabled={!editable} onChange={e => setBank(e.target.value)} /></label>
        <label><span>Wolt</span><input inputMode="decimal" value={wolt} disabled={!editable} onChange={e => setWolt(e.target.value)} /></label>
        <label><span>Комментарий</span><input value={comment} disabled={!editable} onChange={e => setComment(e.target.value)} /></label>
        <label><span>Итого</span><input value={fmt(editedTotal)} readOnly /></label>
      </div>
      <div className="row-actions" style={{marginTop:12}}>
        <button className="ghost small" onClick={() => setEditing(false)}>Отмена</button>
        {editable && <button className="primary small" onClick={saveChanges}>Сохранить изменения</button>}
        {editable && <button className="danger small" onClick={() => { onCancel(); setEditing(false) }}>Удалить / зачеркнуть</button>}
      </div>
    </div></td></tr>}
  </>
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
  const [editing, setEditing] = useState(false)
  const [source, setSource] = useState(inflow.source || '')
  const [amount, setAmount] = useState(inflow.amount ?? '')
  const [comment, setComment] = useState(inflow.comment || '')
  const cancelled = Boolean(inflow.deleted_at)
  const editable = !cancelled && canEditWithinWeek(inflow)

  useEffect(() => setSource(inflow.source || ''), [inflow.id, inflow.source])
  useEffect(() => setAmount(inflow.amount ?? ''), [inflow.id, inflow.amount])
  useEffect(() => setComment(inflow.comment || ''), [inflow.id, inflow.comment])

  async function saveChanges() {
    if (!editable) return
    await onSave({ source, amount: parseNum(amount), comment })
    setEditing(false)
  }

  return (
    <>
      <tr className={cancelled ? 'cancelled-row' : ''}>
        <td>{inflow.source || '—'}</td>
        <td><b>{fmt(inflow.amount)}</b></td>
        <td>{inflow.comment || '—'}</td>
        <td>{cancelled ? `Отменено · ${formatDT(inflow.deleted_at)}` : editable ? 'Активно' : 'Редактирование закрыто'}</td>
        <td>{cancelled ? <span className="hint">—</span> : <button className="ghost small" onClick={() => setEditing(true)}>Редактировать</button>}</td>
      </tr>
      {editing && <tr><td colSpan="5"><div className="notice">
        <h3>Редактирование прихода</h3>
        <p className="hint">Редактирование доступно только в течение 7 дней после создания операции.</p>
        <div className="form-grid compact">
          <label><span>Источник</span><input value={source} disabled={!editable} onChange={e => setSource(e.target.value)} /></label>
          <label><span>Сумма</span><input inputMode="decimal" value={amount} disabled={!editable} onChange={e => setAmount(e.target.value)} /></label>
          <label><span>Комментарий</span><input value={comment} disabled={!editable} onChange={e => setComment(e.target.value)} /></label>
        </div>
        <div className="row-actions" style={{marginTop:12}}>
          <button className="ghost small" onClick={() => setEditing(false)}>Отмена</button>
          {editable && <button className="primary small" onClick={saveChanges}>Сохранить изменения</button>}
          {editable && <button className="danger small" onClick={() => { onCancel(); setEditing(false) }}>Удалить / зачеркнуть</button>}
        </div>
      </div></td></tr>}
    </>
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
  const [editing, setEditing] = useState(false)
  const [expenseDate, setExpenseDate] = useState(expense.expense_date || todayISO())
  const [categoryId, setCategoryId] = useState(expense.category_id || '__custom__')
  const [customCategory, setCustomCategory] = useState(expense.custom_category || expense.expense_categories?.name || '')
  const [amount, setAmount] = useState(expense.amount ?? '')
  const [comment, setComment] = useState(expense.comment || '')
  const cancelled = Boolean(expense.deleted_at)
  const editable = !cancelled && canEditWithinWeek(expense)

  useEffect(() => setExpenseDate(expense.expense_date || todayISO()), [expense.id, expense.expense_date])
  useEffect(() => setCategoryId(expense.category_id || '__custom__'), [expense.id, expense.category_id])
  useEffect(() => setCustomCategory(expense.custom_category || expense.expense_categories?.name || ''), [expense.id, expense.custom_category, expense.expense_categories?.name])
  useEffect(() => setAmount(expense.amount ?? ''), [expense.id, expense.amount])
  useEffect(() => setComment(expense.comment || ''), [expense.id, expense.comment])

  const categoryName = expense.expense_categories?.name || expense.custom_category || 'Своя статья'

  async function saveChanges() {
    if (!editable) return
    const patch = {
      expense_date: expenseDate,
      amount: parseNum(amount),
      comment,
      category_id: categoryId === '__custom__' ? null : categoryId,
      custom_category: categoryId === '__custom__' ? (customCategory || 'Своя статья') : null
    }
    await onSave(patch)
    setEditing(false)
  }

  return (
    <>
      <tr className={cancelled ? 'cancelled-row' : ''}>
        <td>{expense.expense_date}</td>
        <td>{categoryName}</td>
        <td><b>{fmt(expense.amount)}</b></td>
        <td>{expense.comment || '—'}</td>
        <td>{cancelled ? `Отменено · ${formatDT(expense.deleted_at)}` : editable ? 'Активно' : 'Редактирование закрыто'}</td>
        <td>{cancelled ? <span className="hint">—</span> : <button className="ghost small" onClick={() => setEditing(true)}>Редактировать</button>}</td>
      </tr>
      {editing && <tr><td colSpan="6"><div className="notice">
        <h3>Редактирование расхода</h3>
        <p className="hint">Можно исправить сумму, статью, комментарий или дату. Смена даты фиксируется в журнале и переносит строку на выбранный день.</p>
        <div className="form-grid compact">
          <label><span>Дата операции</span><input type="date" disabled={!editable} value={expenseDate} onChange={e => setExpenseDate(e.target.value)} /></label>
          <label><span>Статья</span><select disabled={!editable} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__custom__">Своя статья</option>
          </select></label>
          {categoryId === '__custom__' && <label><span>Своя статья</span><input disabled={!editable} value={customCategory} onChange={e => setCustomCategory(e.target.value)} /></label>}
          <label><span>Сумма</span><input inputMode="decimal" disabled={!editable} value={amount} onChange={e => setAmount(e.target.value)} /></label>
          <label><span>Комментарий</span><input disabled={!editable} value={comment} onChange={e => setComment(e.target.value)} /></label>
        </div>
        <div className="row-actions" style={{marginTop:12}}>
          <button className="ghost small" onClick={() => setEditing(false)}>Отмена</button>
          {editable && <button className="primary small" onClick={saveChanges}>Сохранить изменения</button>}
          {editable && <button className="danger small" onClick={() => { onCancel(); setEditing(false) }}>Удалить / зачеркнуть</button>}
        </div>
      </div></td></tr>}
    </>
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


function RecipesStyles() {
  return <style>{`
    .recipe-sheet {
      border-radius: 24px;
      padding: 22px 22px 18px;
    }
    .recipe-sheet-head {
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .recipe-sheet-filters {
      align-items: end;
      margin-bottom: 8px;
    }
    .recipe-sheet-table table {
      min-width: 100%;
    }
    .recipe-sheet-table th {
      white-space: nowrap;
    }
    .recipe-sheet-note {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--line);
    }
    @media (max-width: 900px) {
      .recipe-sheet {
        padding: 14px;
      }
    }
  `}</style>
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
    .dash-bar-row { display: grid; grid-template-columns: 120px minmax(180px, 1fr) 190px; gap: 10px; align-items: center; }
    .dash-bar-label { font-weight: 800; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dash-bar-track { height: 13px; border-radius: 999px; background: #efe8da; overflow: hidden; }
    .dash-bar { height: 100%; border-radius: 999px; background: var(--gold); transition: width .25s ease; }
    .dash-bar.negative { background: var(--danger); }
    .dash-bar-value { text-align: right; font-weight: 800; font-size: 12px; display:flex; justify-content:flex-end; gap:5px; align-items:baseline; white-space:nowrap; }
    .dash-bar-value em { font-style: normal; color: var(--muted); font-weight: 700; font-size: 10px; opacity: .72; }
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
    .theme-modern .rms-logo-svg { filter: drop-shadow(0 12px 28px rgba(45,212,191,.26)); }
    .theme-modern .main { background: radial-gradient(circle at top left, rgba(45,212,191,.13), transparent 32%), linear-gradient(180deg, #f8fafc, #eef2f6); }
    .theme-modern .card, .theme-modern .dash-kpi { border-color: rgba(148,163,184,.35); background: rgba(255,255,255,.88); box-shadow: 0 18px 46px rgba(15,23,42,.08); backdrop-filter: blur(10px); }
    .theme-modern .nav.active { background: linear-gradient(135deg, #2dd4bf, #a7f3d0); color: #052e2b; box-shadow: 0 10px 24px rgba(45,212,191,.22); }
    .theme-modern input, .theme-modern select, .theme-modern textarea { border-color: #cbd5e1; background: rgba(255,255,255,.95); }
    .theme-dashboard { --bg: #f3f4f6; --panel: #ffffff; --ink: #111827; --muted: #6b7280; --line: #e5e7eb; --accent: #f59e0b; --gold: #f59e0b; --danger: #dc2626; --good: #16a34a; }
    .theme-dashboard .sidebar { background: #ffffff; color: var(--ink); border-right: 1px solid var(--line); box-shadow: 8px 0 24px rgba(15,23,42,.05); }
    .theme-dashboard .brand p, .theme-dashboard .userbar span { color: var(--muted); }
    .theme-dashboard .nav { background: #f3f4f6; color: #374151; border: 1px solid transparent; }
    .theme-dashboard .nav.active { background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; box-shadow: 0 10px 20px rgba(245,158,11,.25); }
    .theme-dashboard .main { background: #f3f4f6; }
    .theme-dashboard .card, .theme-dashboard .dash-kpi { background: #fff; border-color: var(--line); box-shadow: 0 10px 24px rgba(17,24,39,.05); }
    .theme-dashboard .topbar h2, .theme-dashboard h3, .theme-dashboard .big-number { color: #111827; }
    .theme-dashboard .dash-bar { background: linear-gradient(90deg, #f59e0b, #f97316); }
    .theme-dashboard .dash-bar.negative { background: #ef4444; }
    .theme-dashboard input, .theme-dashboard select, .theme-dashboard textarea { background: #fff; border-color: #e5e7eb; }
    .theme-dashboard .button, .theme-dashboard button.primary, .theme-dashboard .primary { background: linear-gradient(135deg, #f59e0b, #f97316); border-color: #f59e0b; }
    .theme-dashboard .logo, .theme-dashboard .login-logo { background: linear-gradient(135deg, #fff7ed, #ffedd5); color: #9a3412; box-shadow: 0 10px 24px rgba(245,158,11,.12); }
    .theme-executive { --bg: #eef1f4; --panel: rgba(255,255,255,.88); --ink: #1f2937; --muted: #6b7280; --line: rgba(148,163,184,.38); --accent: #475569; --gold: #64748b; --danger: #dc2626; --good: #15803d; }
    .theme-executive .sidebar { background: linear-gradient(180deg, #f8fafc, #eef2f7 58%, #e2e8f0); color: #1f2937; box-shadow: 14px 0 34px rgba(15,23,42,.08); border-right: 1px solid rgba(148,163,184,.35); }
    .theme-executive .main { background: radial-gradient(circle at top left, rgba(148,163,184,.18), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #eef1f4 100%); color: var(--ink); }
    .theme-executive .card, .theme-executive .dash-kpi { background: rgba(255,255,255,.86); border-color: rgba(148,163,184,.30); box-shadow: 0 16px 38px rgba(15,23,42,.07); backdrop-filter: blur(10px); }
    .theme-executive .topbar h2, .theme-executive h3, .theme-executive .big-number, .theme-executive .card-head h3, .theme-executive .brand h1 { color: #111827; }
    .theme-executive .brand p, .theme-executive .userbar span, .theme-executive .hint, .theme-executive .dash-kpi span, .theme-executive .metric span { color: #64748b; }
    .expense-note { display:block; margin-top:3px; color:#64748b; font-size:11px; font-weight:500; line-height:1.25; }
    .theme-executive .nav { background: rgba(255,255,255,.62); color: #334155; border: 1px solid rgba(148,163,184,.30); }
    .theme-executive .nav:hover { background: rgba(241,245,249,.95); }
    .theme-executive .nav.active { background: linear-gradient(135deg, #475569, #64748b); color: #ffffff; box-shadow: 0 10px 24px rgba(71,85,105,.20); border-color: transparent; }
    .theme-executive input, .theme-executive select, .theme-executive textarea { background: rgba(255,255,255,.94); color: #111827; border-color: rgba(148,163,184,.38); }
    .theme-executive input::placeholder, .theme-executive textarea::placeholder { color: #94a3b8; }
    .theme-executive .button, .theme-executive button.primary, .theme-executive .primary { background: linear-gradient(135deg, #475569, #64748b); color: #ffffff; border-color: transparent; }
    .theme-executive button.ghost, .theme-executive .ghost { background: rgba(255,255,255,.68); color: #334155; border-color: rgba(148,163,184,.36); }
    .theme-executive table th { background: rgba(241,245,249,.88); color: #475569; }
    .theme-executive table td { color: #1f2937; border-color: rgba(148,163,184,.22); }
    .theme-executive .dash-bar { background: linear-gradient(90deg, #475569, #94a3b8); }
    .theme-executive .dash-bar.negative { background: linear-gradient(90deg, #ef4444, #f87171); }
    .theme-executive .login-card { background: rgba(255,255,255,.90); color: #1f2937; border-color: rgba(148,163,184,.32); box-shadow: 0 24px 60px rgba(15,23,42,.12); }
    .theme-executive .logo, .theme-executive .login-logo { background: linear-gradient(135deg, #f8fafc, #e2e8f0); color: #334155; box-shadow: 0 12px 28px rgba(71,85,105,.12); }
    .theme-executive .readonly-banner { background: rgba(241,245,249,.92); border-color: rgba(148,163,184,.45); color: #334155; }
    .theme-executive .dash-bar-track { background: #d7dde6; box-shadow: inset 0 1px 2px rgba(15,23,42,.08); }
    .theme-executive .dash-bar { background: linear-gradient(90deg, #475569, #718096); }
    .theme-executive .salary-view-employees input,
    .theme-executive .salary-view-employees select,
    .theme-executive .salary-view-employees textarea,
    .theme-executive .salary-view-dsmf input,
    .theme-executive .salary-view-dsmf select,
    .theme-executive .salary-view-dsmf textarea,
    .theme-executive .attendance-card input,
    .theme-executive .attendance-card select,
    .theme-executive .attendance-card textarea {
      background: #dbe2ea;
      border-color: #94a3b8;
      color: #111827;
      box-shadow: inset 0 1px 2px rgba(15,23,42,.08);
    }
    .theme-executive .salary-view-employees input:focus,
    .theme-executive .salary-view-employees select:focus,
    .theme-executive .salary-view-employees textarea:focus,
    .theme-executive .salary-view-dsmf input:focus,
    .theme-executive .salary-view-dsmf select:focus,
    .theme-executive .salary-view-dsmf textarea:focus,
    .theme-executive .attendance-card input:focus,
    .theme-executive .attendance-card select:focus,
    .theme-executive .attendance-card textarea:focus {
      background: #f8fafc;
      border-color: #475569;
      outline: 2px solid rgba(71,85,105,.18);
    }
    .logout-nav { margin-top: 6px; }
    .theme-executive .supplier-entity-group { background: rgba(255,255,255,.78); border-color: rgba(148,163,184,.34); }
    .theme-executive .supplier-entity-head { background: linear-gradient(180deg, #e7edf4, #dde5ee); color: #1f2937; border-bottom: 1px solid rgba(148,163,184,.26); }
    .theme-executive .supplier-transactions-panel { background: #edf2f7; border-color: rgba(148,163,184,.34); }
    .theme-executive .system-row { background: rgba(71,85,105,.06); }
    .theme-executive .system-row input { background: #e2e8f0; color: #334155; }
    .theme-executive .supplier-risk-empty { background: rgba(241,245,249,.8); }
    .theme-executive .attendance-card table { background: rgba(255,255,255,.72); }
    .theme-executive .attendance-card td button { border: 1px solid rgba(100,116,139,.55); opacity: 1; visibility: visible; }
    .theme-executive .attendance-card td button.ghost { background: #d9e2ec; color: #334155; border-color: #94a3b8; }
    .theme-executive .attendance-card td button.primary { background: linear-gradient(135deg, #475569, #64748b); color: #ffffff; border-color: #475569; }
    .theme-executive .attendance-card td button.danger { background: linear-gradient(135deg, #ef4444, #f87171); color: #ffffff; border-color: #dc2626; }
    .theme-executive .dash-bar-track { background: #d7dde6 !important; box-shadow: inset 0 1px 2px rgba(15,23,42,.08); }
    .theme-executive .dash-bar { background: linear-gradient(90deg, #475569, #718096) !important; }
    .theme-executive .supplier-entity-group { background: rgba(255,255,255,.78); border-color: rgba(148,163,184,.34); }
    .theme-executive .supplier-entity-head { background: linear-gradient(180deg, #e7edf4, #dde5ee); color: #1f2937; border-bottom: 1px solid rgba(148,163,184,.26); }
    .theme-executive .supplier-transactions-panel { background: #edf2f7; border-color: rgba(148,163,184,.34); }
    .theme-executive .system-row { background: rgba(71,85,105,.06); }
    .theme-executive .system-row input { background: #e2e8f0; color: #334155; }
    .theme-executive .supplier-risk-empty { background: rgba(241,245,249,.8); }
    .theme-executive .dash-kpi { background: linear-gradient(180deg, #f8fafc, #eef2f7); }
    .theme-executive .attendance-card table { background: rgba(255,255,255,.72); }
    .theme-executive .attendance-card .table-wrap { background: transparent; }
    .theme-executive .attendance-card td button.attendance-day-cell {
      border: 1px solid rgba(100,116,139,.55);
      opacity: 1;
      visibility: visible;
      box-shadow: inset 0 1px 2px rgba(15,23,42,.08);
    }
    .theme-executive .attendance-card td button.attendance-day-empty {
      background: #dbe2ea !important;
      color: #64748b !important;
      border-color: #94a3b8 !important;
    }
    .theme-executive .attendance-card td button.ghost { background: #d9e2ec; color: #334155; border-color: #94a3b8; }
    .theme-executive .attendance-card td button.primary { background: linear-gradient(135deg, #475569, #64748b); color: #ffffff; border-color: #475569; }
    .theme-executive .attendance-card td button.danger { background: linear-gradient(135deg, #ef4444, #f87171); color: #ffffff; border-color: #dc2626; }
    .theme-executive .attendance-card input,
    .theme-executive .attendance-card select,
    .theme-executive .attendance-card textarea,
    .theme-executive .salary-view-employees input,
    .theme-executive .salary-view-employees select,
    .theme-executive .salary-view-employees textarea,
    .theme-executive .salary-view-dsmf input,
    .theme-executive .salary-view-dsmf select,
    .theme-executive .salary-view-dsmf textarea {
      background: #dbe2ea;
      border-color: #94a3b8;
      color: #111827;
      box-shadow: inset 0 1px 2px rgba(15,23,42,.08);
    }
    .theme-executive .attendance-card input:focus,
    .theme-executive .attendance-card select:focus,
    .theme-executive .attendance-card textarea:focus,
    .theme-executive .salary-view-employees input:focus,
    .theme-executive .salary-view-employees select:focus,
    .theme-executive .salary-view-employees textarea:focus,
    .theme-executive .salary-view-dsmf input:focus,
    .theme-executive .salary-view-dsmf select:focus,
    .theme-executive .salary-view-dsmf textarea:focus {
      background: #f8fafc;
      border-color: #475569;
      outline: 2px solid rgba(71,85,105,.18);
    }
    input, select, textarea,
    .theme-executive input, .theme-executive select, .theme-executive textarea,
    .theme-dashboard input, .theme-dashboard select, .theme-dashboard textarea,
    .theme-modern input, .theme-modern select, .theme-modern textarea {
      background: #ffffff !important;
      color: #111827 !important;
      border-color: #cbd5e1 !important;
    }
    .attendance-card td button.attendance-day-cell,
    .theme-executive .attendance-card td button.attendance-day-cell {
      background: initial;
    }
    .global-progress-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15,23,42,.18);
      backdrop-filter: blur(3px);
    }
    .global-progress-card {
      width: min(360px, calc(100vw - 32px));
      padding: 22px;
      border-radius: 22px;
      background: rgba(255,255,255,.96);
      border: 1px solid rgba(148,163,184,.34);
      box-shadow: 0 24px 70px rgba(15,23,42,.18);
      display: grid;
      gap: 12px;
      text-align: center;
      color: #1f2937;
    }
    .global-progress-spinner {
      width: 42px;
      height: 42px;
      border-radius: 999px;
      border: 4px solid #e2e8f0;
      border-top-color: #475569;
      margin: 0 auto;
      animation: rmsSpin .9s linear infinite;
    }
    .global-progress-track {
      height: 9px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
    }
    .global-progress-track div {
      height: 100%;
      background: linear-gradient(90deg, #475569, #94a3b8);
      transition: width .25s ease;
    }
    @keyframes rmsSpin { to { transform: rotate(360deg); } }
    .login-screen.theme-executive {
      background: radial-gradient(circle at top left, rgba(148,163,184,.22), transparent 36%), linear-gradient(180deg, #f8fafc, #eef2f7);
    }
    .permission-grid { display: grid; grid-template-columns: minmax(160px, 1fr) 160px; gap: 10px; align-items: center; }
    .permission-grid b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `}</style>
}

function MiniBarChart({ rows, valueKey = 'revenue', labelKey = 'name', title, subtitle, showShare = false }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(parseNum(r[valueKey]))))
  const positiveTotal = rows.reduce((s, r) => s + Math.max(0, parseNum(r[valueKey])), 0)
  const signedTotal = rows.reduce((s, r) => s + parseNum(r[valueKey]), 0)
  const shareBase = valueKey === 'net' ? signedTotal : positiveTotal
  const shareLabel = valueKey === 'net' ? 'от общей прибыли' : 'от общей выручки'
  return <div className="card span-2 dashboard-chart-card">
    <div className="card-head"><div><h3>{title}</h3><p className="hint">{subtitle}</p></div></div>
    <div className="dash-bars">
      {rows.map(r => {
        const val = parseNum(r[valueKey])
        const width = Math.max(3, Math.min(100, Math.abs(val) / max * 100))
        const share = shareBase ? val / shareBase * 100 : 0
        return <div className="dash-bar-row" key={r.id || r[labelKey]}>
          <div className="dash-bar-label">{r[labelKey]}</div>
          <div className="dash-bar-track" title={`${fmt(val)} ман.${showShare ? ` · ${pct(share)} ${shareLabel}` : ''}`}><div className={`dash-bar ${val < 0 ? 'negative' : ''}`} style={{width: `${width}%`}} /></div>
          <div className={`dash-bar-value ${val < 0 ? 'bad' : ''}`}><span>{fmt(val)} ман.</span>{showShare && <em>({pct(share)})</em>}</div>
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
    <section className="grid dashboard-grid"><MiniBarChart rows={data.branchRows.filter(r => r.revenue || r.net).sort((a,b) => b.revenue - a.revenue)} valueKey="revenue" title="Выручка по филиалам" subtitle="Сравнение филиалов за выбранный месяц" showShare /><MiniBarChart rows={data.branchRows.filter(r => r.revenue || r.net).sort((a,b) => b.net - a.net)} valueKey="net" title="Прибыль по филиалам" subtitle="После расходов, зарплат, service charge и налога" showShare /><div className="card span-2"><div className="card-head"><h3>Сводка по филиалам</h3></div><div className="table-wrap"><table className="dashboard-table"><thead><tr><th>Филиал</th><th>Выручка</th><th>Расходы</th><th>Зарплаты</th><th>Service</th><th>Налог</th><th>Прибыль</th><th>Маржа</th></tr></thead><tbody>{data.branchRows.map(r => <tr key={r.id} className={r.net < 0 ? 'risk-row' : ''}><td><b>{r.name}</b></td><td>{fmt(r.revenue)}</td><td>{fmt(r.expenses)}</td><td>{fmt(r.salary)}</td><td>{fmt(r.serviceCost)}</td><td>{fmt(r.tax)}</td><td className={r.net >= 0 ? 'good' : 'bad'}><b>{fmt(r.net)}</b></td><td>{pct(r.margin)}</td></tr>)}</tbody></table></div></div><div className="card"><div className="card-head"><h3>Проблемные долги поставщикам</h3><p className="hint">Только превышение лимита или просроченные фактуры</p></div>{data.supplierDebtRows?.length ? <div className="supplier-risk-summary"><div className="metric"><span>Проблемная сумма</span><strong className="bad">{fmt(data.supplierDebt)} AZN</strong></div><div className="supplier-risk-list">{data.supplierDebtRows.slice(0, 8).map(r => <div key={r.id || r.name} className="supplier-risk-row"><b title={r.name}>{r.name}</b><span>{fmt(r.value)} AZN</span><em>{r.reason || 'требует проверки'}</em></div>)}</div></div> : <div className="supplier-risk-empty"><p className="hint">Проблемных долгов нет. Обычные долги смотри в разделе “Поставщики”.</p></div>}</div><div className="card span-2 dashboard-insight"><h3>Краткий вывод</h3><p>Сеть сейчас показывает <b className={data.net >= 0 ? 'good' : 'bad'}>{data.net >= 0 ? 'прибыль' : 'убыток'} {fmt(data.net)} AZN</b>. Прогноз до конца месяца: <b>{fmt(data.forecastRevenue)} AZN выручки</b> и <b className={data.forecastProfit >= 0 ? 'good' : 'bad'}>{fmt(data.forecastProfit)} AZN прибыли</b>.</p><p className="hint">Динамика сравнивается с прошлым календарным месяцем. Если нужен “аналогичный период” строго день-в-день, следующим шагом добавим сравнение текущего периода с тем же количеством дней прошлого месяца.</p></div></section>
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
  const [aiRows, setAiRows] = useState([])
  const [showAllAiRows, setShowAllAiRows] = useState(false)

  function financeExpenseGroupName(name) {
    const value = normalizeExpenseText(name)
    if (value.includes('аренд')) return 'rent'
    if (value.includes('коммун') || value.includes('свет') || value.includes('газ') || value.includes('вода') || value.includes('элект')) return 'utilities'
    if (value.includes('упаков') || value.includes('тара') || value.includes('однораз') || value.includes('стакан') || value.includes('крыш') || value.includes('контейнер') || value.includes('пакет') || value.includes('салфет') || value.includes('take away') || value.includes('takeaway') || value.includes('packaging')) return 'packaging'
    if (value.includes('хоз') || value.includes('хим') || value.includes('перчат') || value.includes('тряп') || value.includes('губк') || value.includes('моющ') || value.includes('уборк') || value.includes('cleaning')) return 'household'
    if (value.includes('маркет') || value.includes('реклам') || value.includes('smm')) return 'marketing'
    if (isBazarExpenseName(value) || value.includes('food cost') || value.includes('market') || value.includes('продукт') || value.includes('закуп') || value.includes('кухня') || value.includes('бар') || value.includes('кофе') || value.includes('напит') || value.includes('списан')) return 'food_market'
    if (value.includes('ремонт') || value.includes('тех') || value.includes('обслуж')) return 'maintenance'
    return 'other'
  }

  function financeExpenseGroupTotal(rows, group) {
    return (rows || []).filter(r => financeExpenseGroupName(r.name) === group).reduce((s, r) => s + parseNum(r.amount), 0)
  }

  function financeSupplierProductGroup(product = {}) {
    const value = normalizeExpenseText(`${product?.category || ''} ${product?.name || ''}`)
    if (value.includes('упаков') || value.includes('тара') || value.includes('однораз') || value.includes('стакан') || value.includes('крыш') || value.includes('контейнер') || value.includes('пакет') || value.includes('салфет') || value.includes('take away') || value.includes('takeaway') || value.includes('packaging')) return 'packaging'
    if (value.includes('хоз') || value.includes('хим') || value.includes('перчат') || value.includes('тряп') || value.includes('губк') || value.includes('моющ') || value.includes('уборк') || value.includes('cleaning')) return 'household'
    if (value.includes('бар') || value.includes('кухня') || value.includes('кофе') || value.includes('напит') || value.includes('food') || value.includes('продукт') || value.includes('мяс') || value.includes('рыб') || value.includes('овощ') || value.includes('молоч') || value.includes('бакале') || value.includes('соус') || value.includes('специ')) return 'food'
    return 'other'
  }

  function financePurchaseTotalsByGroup(rows) {
    return (rows || []).reduce((totals, p) => {
      const items = p.supplier_purchase_items || []
      if (items.length) {
        items.forEach(i => {
          const group = financeSupplierProductGroup(i.supplier_products || {})
          totals[group] = parseNum(totals[group]) + parseNum(i.total_amount)
        })
      } else {
        totals.food = parseNum(totals.food) + parseNum(p.total_amount)
      }
      return totals
    }, { food: 0, packaging: 0, household: 0, other: 0 })
  }

  function financePurchaseFoodTotal(rows) {
    return financePurchaseTotalsByGroup(rows).food
  }

  function financeAllocatedSupplierTotals(purchaseRows, share = 1) {
    const totals = financePurchaseTotalsByGroup(purchaseRows || [])
    return {
      food: parseNum(totals.food) * share,
      packaging: parseNum(totals.packaging) * share,
      household: parseNum(totals.household) * share,
      other: parseNum(totals.other) * share
    }
  }

  async function financeRevenueSharesForMonth(y, m) {
    const monthDate = monthStart(y, m)
    const { data } = await supabase.from('monthly_branch_revenue').select('branch_id,total_revenue').eq('month', monthDate)
    const total = (data || []).reduce((s, r) => s + parseNum(r.total_revenue), 0)
    const map = new Map()
    ;(data || []).forEach(r => map.set(r.branch_id, total > 0 ? parseNum(r.total_revenue) / total : 0))
    return { total, map }
  }

  function financeSuggestedStaffLimit(position, revenue) {
    const group = positionGroup(position)
    if (!revenue) return 0
    if (group === 'Менеджеры') return revenue > 220000 ? 3 : revenue > 120000 ? 2 : 1
    if (group === 'Бар') return Math.max(1, Math.ceil(revenue / 45000))
    if (group === 'Повар') return Math.max(1, Math.ceil(revenue / 55000))
    if (group === 'Стьюарт') return revenue > 90000 ? 2 : revenue > 30000 ? 1 : 0
    return Math.max(1, Math.ceil(revenue / 80000))
  }

  function financeAddAiPercent(rows, { branchName, indicator, amount, revenue, limit, recommendation }) {
    const value = parseNum(amount)
    if (value <= 0) return
    if (revenue <= 0) {
      rows.push({
        branchName,
        indicator,
        fact: `нет выручки · ${fmt(value)} AZN`,
        norm: `≤ ${fmt(limit)}% от выручки`,
        deviation: 'нет базы для %',
        level: 'critical',
        recommendation: `За месяц нет выручки, но есть расход. ${recommendation}`
      })
      return
    }
    const actual = value / revenue * 100
    const deviation = actual - limit
    if (actual > limit) {
      rows.push({
        branchName,
        indicator,
        fact: `${pct(actual)} · ${fmt(value)} AZN`,
        norm: `≤ ${fmt(limit)}%`,
        deviation: `+${pct(deviation)}`,
        level: deviation >= 8 ? 'critical' : 'warning',
        recommendation
      })
    }
  }

  function financeBuildAiForBranch({ branch, branchStats, expenseRows, purchaseRows, employeeRows }) {
    const rows = []
    const branchName = branch?.name || 'Все филиалы'
    const revenue = parseNum(branchStats?.revenue)
    const operatingExpenses = parseNum(branchStats?.expenses)
    const salaryAmount = parseNum(branchStats?.salary)
    const serviceAmount = parseNum(branchStats?.serviceCost)
    const taxAmount = parseNum(branchStats?.tax)
    const net = parseNum(branchStats?.net)
    const totalBurden = operatingExpenses + salaryAmount + serviceAmount + taxAmount

    if (revenue <= 0 && totalBurden > 0) {
      rows.push({
        branchName,
        indicator: 'Нет выручки при наличии расходов',
        fact: `${fmt(totalBurden)} AZN расходов`,
        norm: 'Выручка должна покрывать расходы',
        deviation: `-${fmt(totalBurden)} AZN`,
        level: 'critical',
        recommendation: 'Проверь корректность введённой выручки за месяц. Если данные верны — филиал убыточен и требует срочных действий.'
      })
    }

    const explicitFoodCostRow = (expenseRows || []).find(r => normalizeExpenseText(r.name).includes('food cost'))
    const marketFoodAmount = explicitFoodCostRow ? parseNum(explicitFoodCostRow.amount) : financeExpenseGroupTotal(expenseRows, 'food_market')
    const foodAmount = explicitFoodCostRow ? marketFoodAmount : financePurchaseFoodTotal(purchaseRows) + marketFoodAmount
    financeAddAiPercent(rows, {
      branchName,
      indicator: 'Food cost / закупки Бар + Кухня + Базар',
      amount: foodAmount,
      revenue,
      limit: 35,
      recommendation: 'Проверить рост закупочных цен, нормы техкарт, списания, порции и позиции с низкой маржой.'
    })

    financeAddAiPercent(rows, {
      branchName,
      indicator: 'Фонд зарплаты',
      amount: salaryAmount,
      revenue,
      limit: 25,
      recommendation: 'Сверить график смен с фактической выручкой, переработки и количество сотрудников по должностям.'
    })

    financeAddAiPercent(rows, {
      branchName,
      indicator: 'Service charge персоналу',
      amount: serviceAmount,
      revenue,
      limit: 5,
      recommendation: 'Проверить процент service charge персоналу и соответствие фактической выручке.'
    })

    const rent = financeExpenseGroupTotal(expenseRows, 'rent')
    if (rent > 0) financeAddAiPercent(rows, {
      branchName,
      indicator: 'Аренда',
      amount: rent,
      revenue,
      limit: 12,
      recommendation: 'Аренда выше референса: нужен рост выручки, пересмотр условий или компенсация высокой маржей.'
    })

    if (rent > 0 && revenue > 0 && rent >= revenue) {
      rows.push({
        branchName,
        indicator: 'Аренда выше выручки',
        fact: `${fmt(rent)} AZN аренда · ${fmt(revenue)} AZN выручка`,
        norm: 'Аренда должна быть значительно ниже выручки',
        deviation: `+${fmt(rent - revenue)} AZN`,
        level: 'critical',
        recommendation: 'Критическое отклонение. Нужно поднять оборот, пересмотреть аренду или формат филиала.'
      })
    }

    const utilities = financeExpenseGroupTotal(expenseRows, 'utilities')
    if (utilities > 0) financeAddAiPercent(rows, {
      branchName,
      indicator: 'Коммунальные расходы',
      amount: utilities,
      revenue,
      limit: 5,
      recommendation: 'Проверить энергоёмкое оборудование, график работы, утечки и сезонное потребление.'
    })

    const packaging = financeExpenseGroupTotal(expenseRows, 'packaging')
    if (packaging > 0) financeAddAiPercent(rows, {
      branchName,
      indicator: 'Take away / packaging',
      amount: packaging,
      revenue,
      limit: 4,
      recommendation: 'Проверить Wolt/takeaway долю, закупочные цены упаковки и нормы выдачи.'
    })

    const household = financeExpenseGroupTotal(expenseRows, 'household')
    if (household > 0) financeAddAiPercent(rows, {
      branchName,
      indicator: 'Хозтовары',
      amount: household,
      revenue,
      limit: 3,
      recommendation: 'Проверить нормы расхода химии, перчаток, губок, тряпок и других расходников уборки.'
    })

    const marketing = financeExpenseGroupTotal(expenseRows, 'marketing')
    if (marketing > 0) financeAddAiPercent(rows, {
      branchName,
      indicator: 'Маркетинг / реклама',
      amount: marketing,
      revenue,
      limit: 5,
      recommendation: 'Оценить ROMI: оставить только каналы, которые дают измеримую выручку.'
    })

    if (revenue > 0 && totalBurden > revenue) {
      rows.push({
        branchName,
        indicator: 'Общие расходы выше выручки',
        fact: `${fmt(totalBurden)} AZN расходов · ${fmt(revenue)} AZN выручка`,
        norm: 'Расходы < выручки',
        deviation: `+${fmt(totalBurden - revenue)} AZN`,
        level: 'critical',
        recommendation: 'Филиал сработал в минус. Проверь аренду, зарплаты, закупки и корректность загрузки выручки.'
      })
    }

    if (net < 0) {
      rows.push({
        branchName,
        indicator: 'Чистый убыток месяца',
        fact: `${fmt(net)} AZN`,
        norm: '≥ 0 AZN',
        deviation: `-${fmt(Math.abs(net))} AZN`,
        level: Math.abs(net) >= Math.max(1000, revenue * 0.1) ? 'critical' : 'warning',
        recommendation: 'Проверь показатели месяца и причины убытка. Сигнал показывается даже при неполных данных по расходам.'
      })
    }

    const employeesByGroup = new Map()
    ;(employeeRows || []).forEach(e => {
      const g = positionGroup(e.position)
      employeesByGroup.set(g, (employeesByGroup.get(g) || 0) + 1)
    })
    employeesByGroup.forEach((count, group) => {
      const limit = financeSuggestedStaffLimit(group, revenue)
      if (limit > 0 && count > limit) {
        rows.push({
          branchName,
          indicator: `Штат: ${group}`,
          fact: `${count} чел.`,
          norm: `≤ ${limit} чел.`,
          deviation: `+${count - limit} чел.`,
          level: count - limit >= 2 ? 'critical' : 'warning',
          recommendation: 'Проверить необходимость количества сотрудников этой должности относительно оборота и сменности.'
        })
      }
    })

    if (!rows.length) {
      rows.push({
        branchName,
        indicator: 'Отклонения не найдены',
        fact: 'В норме',
        norm: 'Референсы соблюдены',
        deviation: '—',
        level: 'ok',
        recommendation: 'Продолжать контроль food cost, зарплат и постоянных расходов до закрытия месяца.'
      })
    }

    return rows
  }

  useEffect(() => { load() }, [branchId, year, month, branches.length])

  function financeDsmfRates() {
    try {
      return JSON.parse(localStorage.getItem('rms_dsmf_rates') || '{"employee_dsmf":3,"employer_dsmf":22,"unemployment":0.5,"medical":2,"income_tax":0}')
    } catch (_e) {
      return { employee_dsmf: 3, employer_dsmf: 22, unemployment: 0.5, medical: 2, income_tax: 0 }
    }
  }

  function financeOfficialDaysByEmployee() {
    try {
      return JSON.parse(localStorage.getItem('rms_employee_official_days') || '{}')
    } catch (_e) {
      return {}
    }
  }

  function financeOfficialSalaryByEmployee() {
    try {
      return JSON.parse(localStorage.getItem('rms_employee_official_salary') || '{}')
    } catch (_e) {
      return {}
    }
  }

  function financePayrollBaseByEmployee(employeeRows = [], salaryPeriodRows = []) {
    const officialDays = financeOfficialDaysByEmployee()
    const officialSalary = financeOfficialSalaryByEmployee()
    const defaultDays = parseNum(localStorage.getItem('rms_dsmf_official_days') || '26') || 26
    const map = new Map()

    ;(employeeRows || []).forEach(e => {
      const days = parseNum(officialDays[e.id]) || defaultDays
      const officialMonthly = parseNum(officialSalary[e.id]) || parseNum(e.official_salary) || parseNum(e.monthly_official_salary) || parseNum(e.monthly_salary)
      const base = officialMonthly > 0 ? officialMonthly / 26 * days : 0
      if (base > 0) map.set(e.id, base)
    })

    return map
  }

  function financePayrollDetailsForScope(employeeRows = [], salaryPeriodRows = [], selectedBranchId = ALL_BRANCHES, revenueShareMap = new Map()) {
    const baseMap = financePayrollBaseByEmployee(employeeRows, salaryPeriodRows)
    let directSalary = 0
    let managersSalary = 0
    let directDsmf = 0
    let managersDsmf = 0

    ;(employeeRows || []).forEach(e => {
      const base = parseNum(baseMap.get(e.id))
      if (base <= 0) return
      const isManager = !e.branch_id || positionGroup(e.position) === 'Менеджеры'
      const charges = statutoryRestaurantOfficialPayrollCost(base).total
      if (isManager) {
        managersSalary += base
        managersDsmf += charges
      } else if (selectedBranchId === ALL_BRANCHES || e.branch_id === selectedBranchId) {
        directSalary += base
        directDsmf += charges
      }
    })

    const share = selectedBranchId === ALL_BRANCHES ? 1 : parseNum(revenueShareMap.get(selectedBranchId))
    const allocatedManagersSalary = selectedBranchId === ALL_BRANCHES ? managersSalary : managersSalary * share
    const allocatedManagersDsmf = selectedBranchId === ALL_BRANCHES ? managersDsmf : managersDsmf * share

    return {
      directSalary,
      managersSalary: allocatedManagersSalary,
      totalSalary: directSalary + allocatedManagersSalary,
      directDsmf,
      managersDsmf: allocatedManagersDsmf,
      totalDsmf: directDsmf + allocatedManagersDsmf,
      managerShare: share
    }
  }

  function financeDsmfForEmployees(employeeRows = [], salaryPeriodRows = [], revenueShareMap = new Map()) {
    const map = new Map()
    const baseMap = financePayrollBaseByEmployee(employeeRows, salaryPeriodRows)
    let managerTotal = 0

    ;(employeeRows || []).forEach(e => {
      const base = parseNum(baseMap.get(e.id))
      if (base <= 0) return
      const total = statutoryRestaurantOfficialPayrollCost(base).total
      const isManager = !e.branch_id || positionGroup(e.position) === 'Менеджеры'
      if (isManager) managerTotal += total
      else map.set(e.branch_id, (map.get(e.branch_id) || 0) + total)
    })

    if (managerTotal > 0) {
      for (const [branchKey, share] of revenueShareMap.entries()) {
        map.set(branchKey, (map.get(branchKey) || 0) + managerTotal * parseNum(share))
      }
      map.set(STAFF_GROUP_MANAGERS, managerTotal)
    }

    return map
  }

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
    const start = monthDate
    const end = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)
    let expQuery = supabase.from('daily_expenses').select('branch_id, amount, custom_category, expense_categories(name)').gte('expense_date', start).lt('expense_date', end).is('deleted_at', null)
    let purQuery = supabase.from('supplier_purchases').select('branch_id, total_amount, supplier_purchase_items(total_amount, supplier_products(name,category))').gte('purchase_date', start).lt('purchase_date', end).is('deleted_at', null)
    let empQuery = supabase.from('employees').select('id, branch_id, position, monthly_salary').eq('is_active', true)
    let salaryPeriodQuery = supabase.from('salary_periods').select('employee_id, branch_id, salary_gross, salary_net, final_balance, payroll_payments').eq('salary_month', monthDate)
    let salaryPaymentQuery = supabase.from('salary_payments').select('employee_id, branch_id, amount').eq('salary_month', monthDate).or('is_cancelled.is.null,is_cancelled.eq.false')

    if (branchId !== ALL_BRANCHES) {
      expQuery = expQuery.eq('branch_id', branchId)
    }

    const [{ data: rows }, { data: purchaseRows }, { data: employeeRows }, { data: salaryPeriodRows }, { data: salaryPaymentRows }] = await Promise.all([expQuery, purQuery, empQuery, salaryPeriodQuery, salaryPaymentQuery])
    const revenueShares = await financeRevenueSharesForMonth(year, month)
    const activeSupplierShare = branchId === ALL_BRANCHES ? 1 : (revenueShares.map.get(branchId) || 0)
    const allocatedSupplierTotals = financeAllocatedSupplierTotals(purchaseRows || [], activeSupplierShare)
    const allocatedSupplierExpenseTotal = allocatedSupplierTotals.food + allocatedSupplierTotals.packaging + allocatedSupplierTotals.household + allocatedSupplierTotals.other

    const rawExpenseRows = (rows || []).map(r => ({
      branch_id: r.branch_id,
      name: r.expense_categories?.name || r.custom_category || t('new_expense'),
      amount: parseNum(r.amount)
    }))
    const directMarketFoodCost = financeExpenseGroupTotal(rawExpenseRows, 'food_market')
    const directPackagingCost = financeExpenseGroupTotal(rawExpenseRows, 'packaging')
    const directHouseholdCost = financeExpenseGroupTotal(rawExpenseRows, 'household')

    const map = new Map()
    for (const r of rawExpenseRows) {
      const group = financeExpenseGroupName(r.name)
      if (group === 'food_market' || group === 'packaging' || group === 'household' || isDsmfExpenseName(r.name) || isSalaryExpenseName(r.name)) continue
      map.set(r.name, (map.get(r.name) || 0) + parseNum(r.amount))
    }

    const totalFoodCost = allocatedSupplierTotals.food + directMarketFoodCost
    const totalPackagingCost = allocatedSupplierTotals.packaging + directPackagingCost
    const totalHouseholdCost = allocatedSupplierTotals.household + directHouseholdCost
    if (totalFoodCost > 0) map.set('Food Cost / закупки и базар', totalFoodCost)
    if (totalPackagingCost > 0) map.set('Take away / packaging', totalPackagingCost)
    if (totalHouseholdCost > 0) map.set('Хозтовары', totalHouseholdCost)
    if (allocatedSupplierTotals.other > 0) map.set('Закупки поставщиков / прочее', allocatedSupplierTotals.other)

    const payrollDetails = financePayrollDetailsForScope(employeeRows || [], salaryPeriodRows || [], branchId, revenueShares.map)
    const calculatedDsmfByBranch = financeDsmfForEmployees(employeeRows || [], salaryPeriodRows || [], revenueShares.map)
    const calculatedDsmfTotal = parseNum(payrollDetails.totalDsmf)
    if (calculatedDsmfTotal > 0) {
      map.set('DSMF', calculatedDsmfTotal)
    }

    const directSalaryTotal = parseNum(payrollDetails.totalSalary) || parseNum(current.salary)
    if (directSalaryTotal > 0) {
      map.set('Зарплаты', {
        amount: directSalaryTotal,
        note: parseNum(payrollDetails.managersSalary) > 0
          ? `в том числе менеджеры ${fmt(payrollDetails.managersSalary)} AZN`
          : ''
      })
    }

    const expenseRows = [...map.entries()].map(([name, value]) => (
      value && typeof value === 'object'
        ? { name, amount: parseNum(value.amount), note: value.note || '' }
        : { name, amount: parseNum(value), note: '' }
    ))
    const extraDsmf = calculatedDsmfTotal
    const salaryOverride = directSalaryTotal - parseNum(current.salary)
    const currentForFinance = {
      ...current,
      salary: directSalaryTotal,
      expenses: parseNum(current.expenses) + extraDsmf + allocatedSupplierExpenseTotal,
      net: parseNum(current.net) - extraDsmf - salaryOverride - allocatedSupplierExpenseTotal,
      forecastProfit: parseNum(current.forecastProfit) - allocatedSupplierExpenseTotal - Math.max(0, salaryOverride) - extraDsmf
    }
    setStats({ ...currentForFinance, previous })

    if (currentForFinance.serviceCost > 0) expenseRows.push({ name: 'Service charge персоналу', amount: currentForFinance.serviceCost })
    if (currentForFinance.tax > 0) expenseRows.push({ name: `Налог %`, amount: currentForFinance.tax })
    setBreakdown(expenseRows.sort((a, b) => b.amount - a.amount))

    if (branchId === ALL_BRANCHES) {
      const networkAiRows = financeBuildAiForBranch({
        branch: { name: 'Вся сеть' },
        branchStats: currentForFinance,
        expenseRows,
        purchaseRows: purchaseRows || [],
        employeeRows: employeeRows || []
      })

      const branchAiRows = []
      for (const branch of branches) {
        const branchStats = await calcFor(branch.id, year, month)
        const branchExpenseMap = new Map()
        ;(rows || []).filter(r => r.branch_id === branch.id).forEach(r => {
          const name = r.expense_categories?.name || r.custom_category || t('new_expense')
          if (isDsmfExpenseName(name) || isSalaryExpenseName(name)) return
          branchExpenseMap.set(name, (branchExpenseMap.get(name) || 0) + parseNum(r.amount))
        })
        const branchRawExpenseRows = [...branchExpenseMap.entries()].map(([name, amount]) => ({ name, amount }))
        const branchDirectFoodCost = financeExpenseGroupTotal(branchRawExpenseRows, 'food_market')
        const branchDirectPackagingCost = financeExpenseGroupTotal(branchRawExpenseRows, 'packaging')
        const branchDirectHouseholdCost = financeExpenseGroupTotal(branchRawExpenseRows, 'household')
        ;[...branchExpenseMap.keys()].forEach(name => {
          const group = financeExpenseGroupName(name)
          if (group === 'food_market' || group === 'packaging' || group === 'household') branchExpenseMap.delete(name)
        })
        const branchSupplierShare = revenueShares.map.get(branch.id) || 0
        const branchSupplierTotals = financeAllocatedSupplierTotals(purchaseRows || [], branchSupplierShare)
        const branchSupplierExpenseTotal = branchSupplierTotals.food + branchSupplierTotals.packaging + branchSupplierTotals.household + branchSupplierTotals.other
        const branchFoodCost = branchSupplierTotals.food + branchDirectFoodCost
        const branchPackagingCost = branchSupplierTotals.packaging + branchDirectPackagingCost
        const branchHouseholdCost = branchSupplierTotals.household + branchDirectHouseholdCost
        if (branchFoodCost > 0) branchExpenseMap.set('Food Cost / закупки и базар', branchFoodCost)
        if (branchPackagingCost > 0) branchExpenseMap.set('Take away / packaging', branchPackagingCost)
        if (branchHouseholdCost > 0) branchExpenseMap.set('Хозтовары', branchHouseholdCost)
        if (branchSupplierTotals.other > 0) branchExpenseMap.set('Закупки поставщиков / прочее', branchSupplierTotals.other)

        const branchPayrollDetails = financePayrollDetailsForScope(employeeRows || [], salaryPeriodRows || [], branch.id, revenueShares.map)
        const branchDsmfAmount = parseNum(branchPayrollDetails.totalDsmf)
        if (branchDsmfAmount > 0) branchExpenseMap.set('DSMF', branchDsmfAmount)
        const branchSalaryTotal = parseNum(branchPayrollDetails.totalSalary) || parseNum(branchStats.salary)
        if (branchSalaryTotal > 0) branchExpenseMap.set('Зарплаты', branchSalaryTotal)
        const branchExpenseRows = [...branchExpenseMap.entries()].map(([name, amount]) => ({ name, amount }))
        const branchSalaryOverride = branchSalaryTotal - parseNum(branchStats.salary)
        const branchStatsForAi = {
          ...branchStats,
          salary: branchSalaryTotal,
          expenses: parseNum(branchStats.expenses) + branchDsmfAmount + branchSupplierExpenseTotal,
          net: parseNum(branchStats.net) - branchDsmfAmount - branchSupplierExpenseTotal - branchSalaryOverride
        }
        branchAiRows.push(...financeBuildAiForBranch({
          branch,
          branchStats: branchStatsForAi,
          expenseRows: branchExpenseRows,
          purchaseRows: (purchaseRows || []).filter(p => p.branch_id === branch.id),
          employeeRows: (employeeRows || []).filter(e => e.branch_id === branch.id)
        }))
      }

      const combinedRows = [...networkAiRows, ...branchAiRows]
      setAiRows(combinedRows.length ? combinedRows : [{
        branchName: 'Вся сеть',
        indicator: 'Данные не распознаны',
        fact: `Выручка ${fmt(currentForFinance.revenue)} AZN · расходы ${fmt(currentForFinance.expenses + currentForFinance.salary + currentForFinance.serviceCost + currentForFinance.tax)} AZN`,
        norm: 'Требуется проверка',
        deviation: '—',
        level: 'warning',
        recommendation: 'Проверь, что расходы, аренда, зарплаты и выручка заведены за выбранный месяц.'
      }])
    } else {
      const singleRows = financeBuildAiForBranch({
        branch: branches.find(b => b.id === branchId),
        branchStats: currentForFinance,
        expenseRows,
        purchaseRows: purchaseRows || [],
        employeeRows: employeeRows || []
      })
      setAiRows(singleRows.length ? singleRows : [{
        branchName: branches.find(b => b.id === branchId)?.name || 'Филиал',
        indicator: 'Данные не распознаны',
        fact: `Выручка ${fmt(currentForFinance.revenue)} AZN · расходы ${fmt(currentForFinance.expenses + currentForFinance.salary + currentForFinance.serviceCost + currentForFinance.tax)} AZN`,
        norm: 'Требуется проверка',
        deviation: '—',
        level: 'warning',
        recommendation: 'Проверь, что расходы, аренда, зарплаты и выручка заведены за выбранный месяц.'
      }])
    }
  }

  if (!stats) return <div className="module-placeholder">{t('loading')}</div>
  const revChange = stats.previous?.revenue ? ((stats.revenue - stats.previous.revenue) / stats.previous.revenue * 100) : 0
  const profitChange = stats.previous?.net ? ((stats.net - stats.previous.net) / Math.abs(stats.previous.net) * 100) : 0
  const aiPriority = { critical: 0, warning: 1, ok: 2 }
  const sortedAiRows = [...aiRows].sort((a, b) => (aiPriority[a.level] ?? 9) - (aiPriority[b.level] ?? 9))
  const visibleAiRows = showAllAiRows ? sortedAiRows : sortedAiRows.slice(0, 5)

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

        <div className="card span-2">
          <div className="card-head"><h3>{t('expense_breakdown')}</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('expense_item')}</th><th>{t('amount')}</th><th>{t('expense_pct')}</th></tr></thead>
              <tbody>
                {breakdown.map(r => <tr key={r.name}><td>{r.name}{r.note ? <small className="expense-note">({r.note})</small> : null}</td><td><b>{fmt(r.amount)}</b></td><td>{pct(stats.revenue ? r.amount / stats.revenue * 100 : 0)}</td></tr>)}
                {!breakdown.length && <tr><td colSpan="3" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card span-2">
          <div className="card-head">
            <div>
              <h3>ИИ-аналитика и отклонения</h3>
              <p className="hint">Референсы: food cost ≤ 35%, зарплаты ≤ 25%, аренда ≤ 12%, коммунальные ≤ 5%, упаковка ≤ 4%, маркетинг ≤ 5%. Проверка идёт по выбранному месяцу.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Филиал</th><th>Показатель</th><th>Факт</th><th>Норма</th><th>Отклонение</th><th>Рекомендация</th></tr></thead>
              <tbody>
                {visibleAiRows.map((r, idx) => (
                  <tr key={`${r.branchName}-${r.indicator}-${idx}`} className={r.level === 'critical' ? 'risk-row' : ''}>
                    <td><b>{r.branchName}</b></td>
                    <td>{r.indicator}</td>
                    <td className={r.level === 'ok' ? 'good' : r.level === 'critical' ? 'bad' : ''}><b>{r.fact}</b></td>
                    <td>{r.norm}</td>
                    <td className={r.level === 'ok' ? 'good' : r.level === 'critical' || r.level === 'warning' ? 'bad' : ''}>{r.deviation}</td>
                    <td>{r.recommendation}</td>
                  </tr>
                ))}
                {!aiRows.length && <tr><td colSpan="6" className="hint">Аналитика не построена. Проверь выбранный месяц и наличие данных по выручке/расходам.</td></tr>}
              </tbody>
            </table>
          </div>
          {aiRows.length > 5 && <div className="action-row" style={{marginTop: 12}}>
            <button className="ghost small" onClick={() => setShowAllAiRows(v => !v)}>{showAllAiRows ? 'Скрыть детали' : `Показать все отклонения (${aiRows.length})`}</button>
            <span className="hint">Сначала показываются топ-5 критичных сигналов.</span>
          </div>}
        </div>

      </section>
    </section>
  )
}



const PRODUCT_CATEGORIES = ['Бар', 'Кухня', 'Хоз.Товар']
const MENU_CATEGORIES = ['Кофе', 'Напитки', 'Завтраки', 'Выпечка', 'Десерты', 'Салаты', 'Закуски', 'Основные блюда', 'Паста', 'Бургеры / Сэндвичи', 'Комбо', 'Прочее']
const MENU_CATEGORIES_BY_PRODUCT_CATEGORY = {
  'Бар': ['Кофе', 'Напитки'],
  'Кухня': ['Завтраки', 'Выпечка', 'Десерты', 'Салаты', 'Закуски', 'Основные блюда', 'Паста', 'Бургеры / Сэндвичи', 'Комбо'],
  'Хоз.Товар': ['Прочее']
}
const menuCategoriesForProductCategory = (category) => MENU_CATEGORIES_BY_PRODUCT_CATEGORY[category] || MENU_CATEGORIES
function normalizeProductType(category) {
  const value = String(category || '').toLowerCase()
  if (value.includes('бар') || value.includes('кофе') || value.includes('молоко') || value.includes('сироп')) return 'Бар'
  if (value.includes('хоз') || value.includes('упаков')) return 'Хоз.Товар'
  return 'Кухня'
}

const BASE_UNITS = [
  { value: 'g', label: 'грамм (g)' },
  { value: 'kg', label: 'килограмм (kg)' },
  { value: 'ml', label: 'миллилитр (ml)' },
  { value: 'l', label: 'литр (l)' },
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
  if (baseUnit === 'kg') {
    if (fromUnit === 'kg') return q
    if (fromUnit === 'g') return q / 1000
  }
  if (baseUnit === 'ml') {
    if (fromUnit === 'l') return q * 1000
    if (fromUnit === 'ml') return q
  }
  if (baseUnit === 'l') {
    if (fromUnit === 'l') return q
    if (fromUnit === 'ml') return q / 1000
  }
  if (baseUnit === 'pcs') return q
  return q
}

function Recipes({ t }) {
  const [products, setProducts] = useState([])
  const [costs, setCosts] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [recipeItems, setRecipeItems] = useState([])
  const [allRecipeItems, setAllRecipeItems] = useState([])
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(PRODUCT_CATEGORIES[0])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [recipeEditMode, setRecipeEditMode] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', category: PRODUCT_CATEGORIES[0], base_unit: 'g' })
  const [menuForm, setMenuForm] = useState({ name: '', category: 'Кофе', sale_price: '', target_food_cost_percent: '30' })
  const [message, setMessage] = useState('')
  const [recipesLoading, setRecipesLoading] = useState(false)

  useEffect(() => { loadBase() }, [])
  useEffect(() => {
    if (selectedMenuId) {
      setRecipeEditMode(false)
      loadRecipeItems(selectedMenuId)
    } else {
      setRecipeItems([])
      setRecipeEditMode(false)
    }
  }, [selectedMenuId, allRecipeItems])
  useEffect(() => {
    const usedIds = new Set(recipeItems.map(r => String(r.product_id)))
    const first = products.find(p => normalizeProductType(p.category) === selectedCategory && !usedIds.has(String(p.id)))
    setSelectedProductId(first?.id || '')
  }, [selectedCategory, products, recipeItems])

  useEffect(() => {
    const allowedCategories = menuCategoriesForProductCategory(selectedCategory)
    const matchingMenuItems = menuItems.filter(item => allowedCategories.includes(item.category || 'Прочее'))
    if (matchingMenuItems.length && !matchingMenuItems.some(item => item.id === selectedMenuId)) {
      setSelectedMenuId(matchingMenuItems[0].id)
    }
    if (!matchingMenuItems.length && selectedMenuId) {
      setSelectedMenuId('')
    }
  }, [selectedCategory, menuItems, selectedMenuId])

  async function loadBase() {
    setRecipesLoading(true)
    const isInternal = Boolean(getInternalSessionStorage()?.rms_internal)

    try {
      if (isInternal) {
        let result = await fetchRmsRecipesWorkspace()
        if (result.error) {
          await new Promise(resolve => setTimeout(resolve, 250))
          result = await fetchRmsRecipesWorkspace()
        }
        const ws = result.data
        if (ws) {
          const normalizedProducts = (ws.supplier_products || []).map(p => ({ ...p, category: normalizeProductType(p.category) }))
          setProducts(normalizedProducts)
          setMenuItems(ws.menu_items || [])
          setCosts(ws.latest_product_costs || [])
          setAllRecipeItems(ws.recipe_items || [])
          if (!selectedMenuId && ws.menu_items?.[0]) setSelectedMenuId(ws.menu_items[0].id)
          setMessage('')
          return
        }
        setMessage(result.error?.message || 'Нет доступа к тех. картам')
        return
      }

      const [{ data: prod, error: prodError }, { data: item, error: itemError }, { data: latest, error: latestError }, { data: recipeRows, error: recipeError }] = await Promise.all([
        supabase.from('supplier_products').select('*').eq('is_active', true).order('category').order('name'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('name'),
        supabase.from('latest_product_costs').select('*'),
        supabase.from('recipe_items').select('*, supplier_products(id,name,category,base_unit)').order('id')
      ])
      if (prodError || itemError || latestError || recipeError) throw (prodError || itemError || latestError || recipeError)
      const normalizedProducts = (prod || []).map(p => ({ ...p, category: normalizeProductType(p.category) }))
      setProducts(normalizedProducts)
      setMenuItems(item || [])
      setCosts(latest || [])
      setAllRecipeItems(recipeRows || [])
      if (!selectedMenuId && item?.[0]) setSelectedMenuId(item[0].id)
      setMessage('')
    } catch (e) {
      setMessage(e?.message || 'Ошибка загрузки тех. карт')
    } finally {
      setRecipesLoading(false)
    }
  }

  async function loadRecipeItems(menuId = selectedMenuId) {
    if (!menuId) return

    const cachedRows = (allRecipeItems || []).filter(r => r.menu_item_id === menuId)
    if (cachedRows.length || getInternalSessionStorage()?.rms_internal) {
      setRecipeItems(cachedRows)
      return
    }

    const { data, error } = await supabase
      .from('recipe_items')
      .select('*, supplier_products(id,name,category,base_unit)')
      .eq('menu_item_id', menuId)
      .order('id')
    if (error) {
      const { data: ws } = await fetchRmsRecipesWorkspace()
      const rows = (ws?.recipe_items || []).filter(r => r.menu_item_id === menuId)
      setAllRecipeItems(ws?.recipe_items || [])
      setRecipeItems(rows)
      if (!rows.length) setMessage(error.message)
      return
    }
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

  const filteredProducts = products.filter(p => normalizeProductType(p.category) === selectedCategory)
  const usedRecipeProductIds = new Set(recipeItems.map(r => String(r.product_id)))
  const availableProductsForRecipe = filteredProducts.filter(p => !usedRecipeProductIds.has(String(p.id)))
  const selectedProductAlreadyInRecipe = selectedProductId && usedRecipeProductIds.has(String(selectedProductId))
  const recipeProductOptionsForRow = (row) => products.filter(p =>
    String(p.id) === String(row.product_id) ||
    !recipeItems.some(r => String(r.id) !== String(row.id) && String(r.product_id) === String(p.id))
  )
  const allowedMenuCategories = menuCategoriesForProductCategory(selectedCategory)
  const filteredMenuItems = menuItems.filter(item => allowedMenuCategories.includes(item.category || 'Прочее'))
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
    if (!availableProductsForRecipe.length) {
      setRecipeEditMode(true)
      return setMessage('В этой категории все товары уже добавлены в техкарту. Измените количество в существующей строке или выберите другую категорию.')
    }
    const productIdToAdd = (!selectedProductId || selectedProductAlreadyInRecipe) ? availableProductsForRecipe[0]?.id : selectedProductId
    if (!productIdToAdd) {
      setRecipeEditMode(true)
      return setMessage('В выбранной категории нет новых товаров для добавления.')
    }

    const existing = recipeItems.find(r =>
      String(r.menu_item_id) === String(selectedMenuId) &&
      String(r.product_id) === String(productIdToAdd)
    )
    if (existing) {
      setRecipeEditMode(true)
      setMessage('Этот ингредиент уже есть в техкарте. Измените количество в существующей строке.')
      return
    }

    const { error } = await supabase.from('recipe_items').insert({
      menu_item_id: selectedMenuId,
      product_id: productIdToAdd,
      quantity: 0,
      waste_percent: 0
    })

    if (error) {
      if (String(error.message || '').includes('recipe_items_menu_product_unique') || String(error.message || '').includes('duplicate key')) {
        await loadRecipeItems()
        setRecipeEditMode(true)
        return setMessage('Этот ингредиент уже есть в техкарте. Измените количество в существующей строке.')
      }
      return setMessage(error.message)
    }

    await loadRecipeItems()
    setRecipeEditMode(true)

    const usedIds = new Set([...recipeItems.map(r => String(r.product_id)), String(productIdToAdd)])
    const nextProduct = filteredProducts.find(p => !usedIds.has(String(p.id)))
    setSelectedProductId(nextProduct?.id || '')
    setMessage(t('saved'))
  }

  async function updateRecipeItem(id, patch) {
    setMessage('')

    if (patch?.product_id) {
      const duplicate = recipeItems.find(r =>
        String(r.id) !== String(id) &&
        String(r.menu_item_id) === String(selectedMenuId) &&
        String(r.product_id) === String(patch.product_id)
      )
      if (duplicate) {
        return setMessage('Этот ингредиент уже есть в техкарте. Выберите другой товар или измените существующую строку.')
      }
    }

    const { error } = await supabase.from('recipe_items').update(patch).eq('id', id)
    if (error) {
      if (String(error.message || '').includes('recipe_items_menu_product_unique') || String(error.message || '').includes('duplicate key')) {
        return setMessage('Этот ингредиент уже есть в техкарте. Выберите другой товар или измените существующую строку.')
      }
      setMessage(error.message)
    }
    else await loadRecipeItems()
  }

  async function deleteRecipeItem(id) {
    setMessage('')
    const { error } = await supabase.from('recipe_items').delete().eq('id', id)
    if (error) setMessage(error.message)
    else await loadRecipeItems()
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]))
  }

  function buildTechCardHtml() {
    const rowsHtml = recipeItems.map(row => {
      const product = row.supplier_products
      const cost = productCost(row.product_id)
      return `<tr>
        <td>${escapeHtml(product?.category || '—')}</td>
        <td>${escapeHtml(product?.name || '—')}</td>
        <td class="num">${fmt(row.quantity)}</td>
        <td>${escapeHtml(unitLabel(product?.base_unit))}</td>
        <td class="num">${fmt(row.waste_percent)}</td>
        <td class="num">${cost ? `${fmt(cost.price_per_base_unit)} / ${escapeHtml(cost.base_unit)}` : 'нет закупки'}</td>
        <td class="num strong">${fmt(lineCost(row))}</td>
      </tr>`
    }).join('')
    const generatedAt = new Date().toLocaleString()
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Техкарта — ${escapeHtml(selectedMenu?.name || 'блюдо')}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, Arial, sans-serif; color: #17251d; margin: 0; background: #eef2ee; padding: 20px; }
  .page { max-width: 820px; margin: 0 auto; }
  .actionbar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 12px; }
  .actionbar button { border: 1px solid #cdd6cf; background: #fff; border-radius: 999px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
  .sheet { background: #fff; border: 1px solid #d7dfd9; border-radius: 26px; box-shadow: 0 18px 48px rgba(23,37,29,.08); padding: 18px 20px 16px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; padding-bottom: 12px; border-bottom: 1px solid #e6ece7; }
  .brandline { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .mark { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; width: 46px; height: 46px; padding: 6px; border-radius: 14px; background: linear-gradient(180deg, #24352b, #17251d); }
  .mark span { display: flex; align-items: center; justify-content: center; border-radius: 9px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.12); color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
  .brandtext strong { display: block; font-size: 16px; letter-spacing: .18em; }
  .brandtext small { color: #667085; font-size: 10px; }
  h1 { margin: 0; font-size: 24px; line-height: 1.15; }
  .meta { color: #667085; font-size: 11px; margin-top: 6px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0 12px; }
  .kpi { border: 1px solid #e5ebe6; border-radius: 18px; background: #fafbf9; padding: 10px 12px; }
  .kpi span { display: block; color: #667085; font-size: 10px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .06em; }
  .kpi strong { font-size: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; color: #667085; font-size: 10px; border-bottom: 1px solid #dde5df; padding: 8px 7px; text-transform: uppercase; letter-spacing: .04em; }
  td { border-bottom: 1px solid #edf1ee; padding: 8px 7px; font-size: 12px; }
  .num { text-align: right; }
  .strong { font-weight: 800; }
  .footer { margin-top: 12px; color: #667085; font-size: 11px; display: flex; justify-content: space-between; gap: 16px; }
  .help { margin-top: 10px; font-size: 11px; color: #667085; }
  @media print {
    body { background: #fff; padding: 0; }
    .page { max-width: none; }
    .actionbar { display: none; }
    .sheet { box-shadow: none; border-radius: 20px; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="actionbar">
      <button onclick="window.print()">PDF/Print</button>
    </div>
    <div class="sheet">
      <div class="header">
        <div>
          <div class="brandline">
            <div class="mark"><span>R</span><span>M</span><span>S</span></div>
            <div class="brandtext"><strong>RMS</strong><small>Restaurant Management System</small></div>
          </div>
          <h1>${escapeHtml(selectedMenu?.name || 'Блюдо не выбрано')}</h1>
          <div class="meta">Категория: ${escapeHtml(selectedMenu?.category || '—')} · Сформировано: ${escapeHtml(generatedAt)}</div>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><span>Себестоимость</span><strong>${fmt(recipeCost)}</strong></div>
        <div class="kpi"><span>Цена продажи</span><strong>${fmt(salePrice)}</strong></div>
        <div class="kpi"><span>Food cost</span><strong>${pct(foodCostPercent)}</strong></div>
        <div class="kpi"><span>Валовая прибыль</span><strong>${fmt(grossProfit)}</strong></div>
      </div>
      <table>
        <thead><tr><th>Категория</th><th>Товар / ингредиент</th><th class="num">Кол-во</th><th>Ед.</th><th class="num">Потери %</th><th class="num">Цена за ед.</th><th class="num">Себестоимость</th></tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="7">Нет ингредиентов</td></tr>'}</tbody>
      </table>
      <div class="footer">
        <span>Цена закупки берётся из последней закупки товара у поставщика.</span>
        
      </div>
      
    </div>
  </div>
</body>
</html>`
  }

  function openTechCardWindow(autoPrint = false) {
    const win = window.open('', '_blank', 'width=980,height=760')
    if (!win) return setMessage('Браузер заблокировал окно печати')
    win.document.open()
    win.document.write(buildTechCardHtml())
    win.document.close()
    win.focus()
    if (autoPrint) setTimeout(() => win.print(), 350)
  }

  function printTechCard() {
    openTechCardWindow(false)
  }

  function exportTechCardPdf() {
    openTechCardWindow(true)
  }


  function recipeProductPriceInfo(productId) {
    const cost = productCost(productId)
    if (!cost) return { label: 'нет закупки', className: 'hint' }
    return {
      label: `${fmt(cost.price_per_base_unit)} / ${cost.base_unit || 'ед.'}`,
      className: 'hint'
    }
  }

  return (
    <section>
      <RecipesStyles />
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

        <div className="card recipe-sheet" style={{ gridColumn: '1 / -1' }}>
          <div className="card-head recipe-sheet-head">
            <div>
              <h3>Состав техкарты</h3>
              <p className="hint">Выбранное блюдо: <strong>{selectedMenu?.name || 'не выбрано'}</strong>. Готовая техкарта отображается под ключевыми показателями, а редактирование открывается только по кнопке «Редактировать».</p>
            </div>
            <div className="row-actions">
              {!recipeEditMode && recipeItems.length > 0 && <button className="ghost small" onClick={printTechCard}>PDF/Print</button>}
              {!recipeEditMode && recipeItems.length > 0 && <button className="ghost small" onClick={() => setRecipeEditMode(true)}>Редактировать</button>}
              {(recipeEditMode || recipeItems.length === 0) && <button className="small" disabled={!availableProductsForRecipe.length} onClick={addRecipeItem}>{availableProductsForRecipe.length ? '+ ингредиент' : 'Все ингредиенты добавлены'}</button>}
              {recipeEditMode && <button className="primary small" onClick={() => { setRecipeEditMode(false); setMessage(t('saved')) }}>Сохранить техкарту</button>}
            </div>
          </div>

          <div className="form-grid compact recipe-sheet-filters">
            <label><span>Категория товара</span>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label><span>Выбрать блюдо</span>
              <select value={selectedMenuId} onChange={e => setSelectedMenuId(e.target.value)}>
                <option value="">Выберите блюдо</option>
                {filteredMenuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label><span>Новый ингредиент</span>
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} disabled={!availableProductsForRecipe.length}>
                <option value="">{availableProductsForRecipe.length ? 'Выберите товар' : 'Все товары уже добавлены'}</option>
                {availableProductsForRecipe.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <div className="table-wrap recipe-sheet-table">
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
                        {recipeEditMode ? (
                          <select value={row.product_id || ''} onChange={e => updateRecipeItem(row.id, { product_id: e.target.value })}>
                            {recipeProductOptionsForRow(row).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        ) : (
                          <span className="cell-value">{product?.name || '—'}</span>
                        )}
                      </td>
                      <td>{recipeEditMode ? <input inputMode="decimal" defaultValue={row.quantity} onBlur={e => updateRecipeItem(row.id, { quantity: parseNum(e.target.value) })} placeholder="18 / 200" /> : <span className="cell-value">{fmt(row.quantity)}</span>}</td>
                      <td>{unitLabel(product?.base_unit)}</td>
                      <td>{recipeEditMode ? <input inputMode="decimal" defaultValue={row.waste_percent} onBlur={e => updateRecipeItem(row.id, { waste_percent: parseNum(e.target.value) })} /> : <span className="cell-value">{fmt(row.waste_percent)}</span>}</td>
                      <td>{cost ? `${fmt(cost.price_per_base_unit)} / ${cost.base_unit}` : 'нет закупки'}</td>
                      <td><strong>{fmt(lineCost(row))}</strong></td>
                      <td>{recipeEditMode ? <button className="remove" onClick={() => deleteRecipeItem(row.id)}>×</button> : <span className="hint">—</span>}</td>
                    </tr>
                  )
                })}
                {!recipeItems.length && <tr><td colSpan="8" className="hint">Пока нет ингредиентов в техкарте выбранного блюда.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="hint recipe-sheet-note">Пример: Cappuccino = молоко 200 ml + кофе 18 g. Цена берётся из последней закупки товара у поставщика.</p>
          {recipesLoading && <p className="hint">Загрузка тех. карт...</p>}
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
              <thead><tr><th>Категория</th><th>Товар</th><th>Базовая ед.</th><th>Цена / изменение</th><th></th></tr></thead>
              <tbody>
                {products.map(item => {
                  const cost = productCost(item.id)
                  return (
                    <tr key={item.id}>
                      <td><select value={item.category || 'Прочее'} onChange={e => updateProduct(item.id, { category: e.target.value })}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                      <td><input defaultValue={item.name} onBlur={e => updateProduct(item.id, { name: e.target.value.trim() })} /></td>
                      <td><select value={item.base_unit || 'g'} onChange={e => updateProduct(item.id, { base_unit: e.target.value })}>{BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                      <td><span className={recipeProductPriceInfo(item.id).className}>{recipeProductPriceInfo(item.id).label}</span></td>
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

function Attendance({ t, mode = 'attendance', isAdmin = false }) {
  const branches = useBranches()
  const [salaryPrivacyProfile, setSalaryPrivacyProfile] = useState(null)
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [message, setMessage] = useState('')
  const [employeeForm, setEmployeeForm] = useState({ full_name: '', position: 'Повар', branch_id: '', monthly_salary: '' })
  const [officialDaysByEmployee, setOfficialDaysByEmployee] = useState(() => { try { return JSON.parse(localStorage.getItem('rms_employee_official_days') || '{}') } catch (_e) { return {} } })
  const [officialSalaryByEmployee, setOfficialSalaryByEmployee] = useState(() => { try { return JSON.parse(localStorage.getItem('rms_employee_official_salary') || '{}') } catch (_e) { return {} } })
  const [transferForm, setTransferForm] = useState({ employee_id: '', branch_id: STAFF_GROUP_MANAGERS, start_date: todayISO(), position: '', monthly_salary: '', comment: '' })

  useEffect(() => { if (!employeeForm.branch_id) setEmployeeForm(f => ({ ...f, branch_id: STAFF_GROUP_MANAGERS })) }, [branches])
  async function loadSalaryPrivacyProfile() {
    const localProfile = getRmsLocalUser()
    if (localProfile) { setSalaryPrivacyProfile(localProfile); return }
    const { data: rpcData, error: rpcError } = await supabase.rpc('rms_current_salary_privacy')
    if (!rpcError && rpcData) {
      setSalaryPrivacyProfile(rpcData)
      return
    }

    const { data } = await supabase.auth.getUser()
    const userId = data?.user?.id
    const email = data?.user?.email || ''
    const loginName = String(email).split('@')[0]
    if (!userId) return setSalaryPrivacyProfile(null)

    const { data: profById } = await supabase
      .from('user_profiles')
      .select('id, email, login_name, role, hide_manager_salary, hide_manager_salaries')
      .eq('id', userId)
      .maybeSingle()

    if (profById) return setSalaryPrivacyProfile(profById)

    const { data: profByLogin } = await supabase
      .from('user_profiles')
      .select('id, email, login_name, role, hide_manager_salary, hide_manager_salaries')
      .or(`email.eq.${email},login_name.eq.${loginName}`)
      .maybeSingle()

    setSalaryPrivacyProfile(profByLogin || null)
  }

  useEffect(() => { loadSalaryPrivacyProfile() }, [])
  useEffect(() => { loadSalaryPrivacyProfile() }, [year, month, branchId, positionFilter])

  useEffect(() => { load() }, [year, month, branchId, positionFilter])

  const dim = daysInMonth(year, month)
  const monthDate = monthStart(year, month)
  const days = Array.from({ length: dim }, (_, i) => i + 1)
  const DAILY_DIVISOR = 26

  async function load() {
    const start = monthDate
    const end = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
    const isInternal = Boolean(getInternalSessionStorage()?.rms_internal)

    let empRows = []
    let attRows = []

    if (isInternal) {
      const { data: snap } = await fetchRmsStaffWorkspaceSnapshot(monthDate)
      if (snap?.employees?.length) {
        empRows = snap.employees || []
        attRows = snap.attendance || []
      }
    }

    if (!empRows.length) {
      const empQuery = supabase.from('employees').select('*, branches(name)').eq('is_active', true).order('branch_id').order('position').order('full_name')
      const attQuery = supabase.from('employee_attendance').select('*').gte('work_date', start).lte('work_date', end)
      const [{ data: emp, error: empError }, { data: att, error: attError }] = await Promise.all([empQuery, attQuery])

      if (empError || attError) {
        const { data: snap } = await fetchRmsStaffWorkspaceSnapshot(monthDate)
        if (snap?.employees?.length) {
          empRows = snap.employees || []
          attRows = snap.attendance || []
        } else {
          setMessage(empError?.message || attError?.message || 'Нет доступа к сотрудникам')
          setEmployees([])
          setAttendance([])
          return
        }
      } else {
        empRows = emp || []
        attRows = att || []
      }
    }

    const shouldHideManagers = Boolean(salaryPrivacyProfile?.hide_manager_salary || salaryPrivacyProfile?.hide_manager_salaries)
    const visibleEmployees = (empRows || [])
      .filter(e => e.is_active !== false)
      .filter(e => !(shouldHideManagers && isManagerStaff(e)))
      .filter(e => matchesStaffGroup(e, branchId))
      .filter(e => matchesPositionGroup(e, positionFilter))

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
    setAttendance(attRows || [])
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
    if (value === 1) return 0
    return null
  }

  async function setAttendanceValue(emp, day, rawValue) {
    setMessage('')
    const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isInternal = Boolean(getInternalSessionStorage()?.rms_internal)

    if (isInternal) {
      const { error } = await supabase.rpc('rms_set_attendance_value', {
        p_employee_id: emp.id,
        p_work_date: workDate,
        p_value: rawValue === null ? null : parseNum(rawValue)
      })
      if (error) { setMessage(error.message); return }
      await load()
      return
    }

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

  const attendanceGroups = staffGroupOptions(branches)
    .map(group => ({
      ...group,
      rows: employees.filter(emp => employeeGroupId(emp) === group.id)
    }))
    .filter(group => branchId === 'all' ? true : group.id === branchId)

  function officialDaysForEmployee(employeeId) {
    return officialDaysByEmployee[employeeId] ?? '26'
  }

  function updateOfficialDays(employeeId, value) {
    const next = { ...officialDaysByEmployee, [employeeId]: value }
    setOfficialDaysByEmployee(next)
    localStorage.setItem('rms_employee_official_days', JSON.stringify(next))
    window.dispatchEvent(new Event('rms-official-days-updated'))
  }

  function officialSalaryForEmployee(emp) {
    return officialSalaryByEmployee[emp.id] ?? emp.official_salary ?? emp.monthly_official_salary ?? emp.monthly_salary ?? '400'
  }

  function updateOfficialSalary(employeeId, value) {
    const next = { ...officialSalaryByEmployee, [employeeId]: value }
    setOfficialSalaryByEmployee(next)
    localStorage.setItem('rms_employee_official_salary', JSON.stringify(next))
    window.dispatchEvent(new Event('rms-official-salary-updated'))
  }

  return (
    <section className="attendance-card">
      <section className="topbar"><div><h2>{mode === 'staff' ? 'Сотрудники' : t('attendance_tab')}</h2><p>{mode === 'staff' ? 'Добавление сотрудников и перевод между филиалами.' : 'Компактный табель: клик по дню переключает значение. Зарплата считается как месячная ставка / 26 × отработанные дни.'}</p></div></section>
      <section className="grid">
        <div className="card span-2">
          <div className="card-head"><div><h3>Период и филиал</h3><p className="hint">Клик по ячейке: пусто → 1 → 0 → пусто.</p></div><button className="small" onClick={syncAllSalaries}>Пересчитать зарплаты</button></div>
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

        {mode !== 'attendance' && <>
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

                </>}

        {mode !== 'staff' && 
        <div className="card span-2">
          <div className="card-head"><div><h3>Табель посещаемости по филиалам</h3><p className="hint">Сотрудники сгруппированы отдельными блоками по филиалам. В режиме “Все филиалы” каждый филиал показывается отдельно.</p></div></div>
          {attendanceGroups.map(group => (
            <div key={group.id} className="supplier-entity-group">
              <div className="supplier-entity-head"><b>{group.name}</b><span>{group.rows.length} сотрудников</span></div>
              <div className="table-wrap">
                <table style={{ fontSize: 11, tableLayout: 'auto' }}>
                  <thead><tr><th style={{ minWidth: 95 }}>Должность</th><th style={{ minWidth: 230 }}>И.Ф.О.</th><th style={{ minWidth: 80 }}>Мес. ставка</th><th style={{ minWidth: 75 }}>День</th><th style={{ minWidth: 105 }}>Оф. зарплата</th><th style={{ minWidth: 96 }}>Оф. дни</th>{days.map(d => <th key={d} style={{ width: 30, minWidth: 30, textAlign: 'center' }}>{d}</th>)}<th style={{ minWidth: 48 }}>Дни</th><th style={{ minWidth: 80 }}>ЗП</th></tr></thead>
                  <tbody>
                    {group.rows.map(emp => {
                      const worked = workedDays(emp.id)
                      const salary = calcSalary(emp, worked)
                      return <tr key={emp.id}>
                        <td>{emp.position || '—'}</td>
                        <td><b>{emp.full_name}</b></td>
                        <td>{fmt(emp.monthly_salary)}</td>
                        <td>{fmt(dailyRate(emp))}</td>
                        <td><input style={{ minWidth: 88, padding: '6px 7px' }} inputMode="decimal" value={officialSalaryForEmployee(emp)} onChange={e => updateOfficialSalary(emp.id, e.target.value)} /></td>
                        <td><input style={{ minWidth: 74, padding: '6px 7px' }} inputMode="decimal" value={officialDaysForEmployee(emp.id)} onChange={e => updateOfficialDays(emp.id, e.target.value)} /></td>
                        {days.map(d => {
                          const currentValue = valueFor(emp.id, d)
                          const label = currentValue === null ? '' : String(currentValue)
                          return <td key={d} style={{ padding: 2, textAlign: 'center' }}>
                            <button
                              type="button"
                              title="Клик: пусто → 1 → 0 → пусто"
                              onClick={() => setAttendanceValue(emp, d, nextAttendanceValue(currentValue))}
                              style={{ width: 26, minWidth: 26, height: 24, padding: 0, borderRadius: 6, fontSize: 11 }}
                              className={`attendance-day-cell ${label === '' ? 'attendance-day-empty' : ''} ${label === '1' ? 'primary' : label === '0.5' ? 'ghost' : label === '0' ? 'danger' : 'ghost'}`}
                            >{label || '·'}</button>
                          </td>
                        })}
                        <td><strong>{fmt(worked)}</strong></td>
                        <td><strong>{fmt(salary)}</strong></td>
                      </tr>
                    })}
                    {!group.rows.length && <tr><td colSpan={days.length + 8} className="hint">Нет сотрудников в этом филиале.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {!attendanceGroups.length && <p className="hint">Сначала добавьте сотрудников или выберите другой филиал.</p>}
        </div>
      }
      </section>
    </section>
  )
}

function Salaries({ t, view = 'employees', isAdmin = false }) {
  const branches = useBranches()
  const [salaryPrivacyProfile, setSalaryPrivacyProfile] = useState(null)
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [showAllSalaryPayments, setShowAllSalaryPayments] = useState(false)
  const [salaryAdvanceRows, setSalaryAdvanceRows] = useState([])
  const [editingSalaryTxn, setEditingSalaryTxn] = useState(null)
  const [paymentBranchId, setPaymentBranchId] = useState('all')
  const [paymentForm, setPaymentForm] = useState({ employee_id: '', payment_date: todayISO(), manual_previous_balance: '', previous_amount: '', amount: '', method: 'cash', comment: '' })
  const [dailyPaymentDate, setDailyPaymentDate] = useState(todayISO())
  const [useManualPreviousSalaryBalance, setUseManualPreviousSalaryBalance] = useState(false)
  const [usePreviousSalaryBalance, setUsePreviousSalaryBalance] = useState(false)
  const [expandedPaymentGroups, setExpandedPaymentGroups] = useState({})
  const [message, setMessage] = useState('')
  const [employeeInfoId, setEmployeeInfoId] = useState('')
  const [employeeHistoryTick, setEmployeeHistoryTick] = useState(0)
  const [terminationPayments, setTerminationPayments] = useState({})
  const [expandedSalaryGroups, setExpandedSalaryGroups] = useState({})
  const [employeeFiles, setEmployeeFiles] = useState({})
  const [uploadType, setUploadType] = useState('document')
  const [dsmfRows, setDsmfRows] = useState([])
  const [expandedDsmfGroups, setExpandedDsmfGroups] = useState({})
  const [officialDaysByEmployee, setOfficialDaysByEmployee] = useState(() => { try { return JSON.parse(localStorage.getItem('rms_employee_official_days') || '{}') } catch (_e) { return {} } })
  const [officialSalaryByEmployee, setOfficialSalaryByEmployee] = useState(() => { try { return JSON.parse(localStorage.getItem('rms_employee_official_salary') || '{}') } catch (_e) { return {} } })
  const [dsmfOfficialDays, setDsmfOfficialDays] = useState(() => localStorage.getItem('rms_dsmf_official_days') || '26')
  const [dsmfRates, setDsmfRates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rms_dsmf_rates') || '{"employee_dsmf":3,"employer_dsmf":22,"unemployment":0.5,"medical":2,"income_tax":0}')
    } catch (_e) {
      return { employee_dsmf: 3, employer_dsmf: 22, unemployment: 0.5, medical: 2, income_tax: 0 }
    }
  })
  const DAILY_DIVISOR = 26

  async function loadSalaryPrivacyProfile() {
    const localProfile = getRmsLocalUser()
    if (localProfile) { setSalaryPrivacyProfile(localProfile); return }

    const { data: rpcData, error: rpcError } = await supabase.rpc('rms_current_salary_privacy')
    if (!rpcError && rpcData) {
      setSalaryPrivacyProfile(rpcData)
      return
    }

    const { data } = await supabase.auth.getUser()
    const userId = data?.user?.id
    const email = data?.user?.email || ''
    const loginName = String(email).split('@')[0]
    if (!userId) return setSalaryPrivacyProfile(null)

    const { data: profById } = await supabase
      .from('user_profiles')
      .select('id, email, login_name, role, hide_manager_salary, hide_manager_salaries')
      .eq('id', userId)
      .maybeSingle()

    if (profById) return setSalaryPrivacyProfile(profById)

    const { data: profByLogin } = await supabase
      .from('user_profiles')
      .select('id, email, login_name, role, hide_manager_salary, hide_manager_salaries')
      .or(`email.eq.${email},login_name.eq.${loginName}`)
      .maybeSingle()

    setSalaryPrivacyProfile(profByLogin || null)
  }

  useEffect(() => { loadSalaryPrivacyProfile() }, [])
  useEffect(() => { loadSalaryPrivacyProfile() }, [year, month, branchId, positionFilter])
  useEffect(() => { load() }, [year, month, branchId, positionFilter])
  useEffect(() => { setShowAllSalaryPayments(false) }, [year, month, branchId, positionFilter])
  useEffect(() => {
    const syncOfficialDays = () => { try { setOfficialDaysByEmployee(JSON.parse(localStorage.getItem('rms_employee_official_days') || '{}')) } catch (_e) { setOfficialDaysByEmployee({}) } }
    const syncOfficialSalary = () => { try { setOfficialSalaryByEmployee(JSON.parse(localStorage.getItem('rms_employee_official_salary') || '{}')) } catch (_e) { setOfficialSalaryByEmployee({}) } }
    window.addEventListener('storage', syncOfficialDays)
    window.addEventListener('rms-official-days-updated', syncOfficialDays)
    window.addEventListener('storage', syncOfficialSalary)
    window.addEventListener('rms-official-salary-updated', syncOfficialSalary)
    return () => {
      window.removeEventListener('storage', syncOfficialDays)
      window.removeEventListener('rms-official-days-updated', syncOfficialDays)
      window.removeEventListener('storage', syncOfficialSalary)
      window.removeEventListener('rms-official-salary-updated', syncOfficialSalary)
    }
  }, [])

  const monthDate = monthStart(year, month)
  const dim = daysInMonth(year, month)
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
  const isMonthClosingDay = todayISO() === monthEnd
  const shouldHideManagerSalaries = Boolean(salaryPrivacyProfile?.hide_manager_salary || salaryPrivacyProfile?.hide_manager_salaries)
  const isManagerRow = (row) => isManagerStaff(row?.employees)
  const canSeeSalaryValue = (row) => !(shouldHideManagerSalaries && isManagerRow(row))
  const maskedMoney = <span className="blurred-money">•••••</span>
  const moneyCell = (row, value, className = '') => canSeeSalaryValue(row) ? <span className={className}>{fmt(value)}</span> : maskedMoney
  const strongMoneyCell = (row, value, className = '') => canSeeSalaryValue(row) ? <strong className={className}>{fmt(value)}</strong> : maskedMoney


  function emptySalary(emp, advanceTotal = 0) {
    // Empty row after operational data cleanup should not auto-accrue fixed salary.
    // Salary is accrued only when a salary_period row exists or attendance is recalculated/saved.
    const gross = 0
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
    const previousForDisplay = prevMonth(year, month)
    const previousMonthForDisplay = monthStart(previousForDisplay.year, previousForDisplay.month)
    const isInternal = Boolean(getInternalSessionStorage()?.rms_internal)

    let empRows = []
    let salRows = []
    let advRows = []
    let payRows = []
    let previousDisplayPayRows = []
    let dsmfExpenseRows = []
    let prevSalRows = []
    let prevPayRows = []

    if (isInternal) {
      const { data: snap } = await fetchRmsStaffWorkspaceSnapshot(monthDate)
      if (snap?.employees?.length) {
        empRows = snap.employees || []
        const allSalaryPeriods = snap.salary_periods || []
        const allSalaryPayments = snap.salary_payments || []
        salRows = allSalaryPeriods.filter(r => r.salary_month === monthDate)
        advRows = (snap.salary_advances || []).filter(r => String(r.advance_date || '') >= monthDate && String(r.advance_date || '') <= monthEnd && !r.is_cancelled)
        payRows = allSalaryPayments.filter(r => r.salary_month === monthDate && !r.is_cancelled)
        previousDisplayPayRows = allSalaryPayments.filter(r => r.salary_month === previousMonthForDisplay && !r.is_cancelled)
        dsmfExpenseRows = (snap.dsmf_expenses || []).filter(r => String(r.expense_date || '') >= monthDate && String(r.expense_date || '') <= monthEnd && !r.deleted_at)
        prevSalRows = allSalaryPeriods.filter(r => String(r.salary_month || '') < monthDate)
        prevPayRows = allSalaryPayments.filter(r => String(r.salary_month || '') < monthDate && !r.is_cancelled)
      }
    }

    if (!empRows.length) {
      const empQ = supabase.from('employees').select('*, branches(name)').order('branch_id').order('position').order('full_name')
      const salQ = supabase.from('salary_periods').select('*, employees(*), branches(name)').eq('salary_month', monthDate).order('branch_id')
      const advQ = supabase.from('salary_advances').select('*').gte('advance_date', monthDate).lte('advance_date', monthEnd).or('is_cancelled.is.null,is_cancelled.eq.false').order('advance_date', { ascending: false }).order('created_at', { ascending: false })
      const payQ = supabase.from('salary_payments').select('*').eq('salary_month', monthDate).or('is_cancelled.is.null,is_cancelled.eq.false').order('payment_date', { ascending: false }).order('created_at', { ascending: false })
      const previousPayDisplayQ = supabase.from('salary_payments').select('*').eq('salary_month', previousMonthForDisplay).or('is_cancelled.is.null,is_cancelled.eq.false').order('payment_date', { ascending: false }).order('created_at', { ascending: false })
      const dsmfQ = supabase.from('daily_expenses').select('*, branches(name)').gte('expense_date', monthDate).lte('expense_date', monthEnd).eq('custom_category', 'DSMF').is('deleted_at', null).order('expense_date', { ascending: false })
      const prevSalQ = supabase.from('salary_periods').select('employee_id, salary_gross, advance_amount, deduction_amount').lt('salary_month', monthDate)
      const prevPayQ = supabase.from('salary_payments').select('employee_id, amount').lt('salary_month', monthDate).or('is_cancelled.is.null,is_cancelled.eq.false')

      const [
        { data: emp, error: empError },
        { data: sal, error: salError },
        { data: adv, error: advError },
        { data: pays, error: payError },
        { data: previousDisplayPays, error: previousDisplayPayError },
        { data: dsmf, error: dsmfError },
        { data: prevSal, error: prevSalError },
        { data: prevPays, error: prevPayError }
      ] = await Promise.all([empQ, salQ, advQ, payQ, previousPayDisplayQ, dsmfQ, prevSalQ, prevPayQ])

      if (empError || salError || advError || payError || previousDisplayPayError || dsmfError || prevSalError || prevPayError) {
        const { data: snap } = await fetchRmsStaffWorkspaceSnapshot(monthDate)
        if (snap?.employees?.length) {
          empRows = snap.employees || []
          const allSalaryPeriods = snap.salary_periods || []
          const allSalaryPayments = snap.salary_payments || []
          salRows = allSalaryPeriods.filter(r => r.salary_month === monthDate)
          advRows = (snap.salary_advances || []).filter(r => String(r.advance_date || '') >= monthDate && String(r.advance_date || '') <= monthEnd && !r.is_cancelled)
          payRows = allSalaryPayments.filter(r => r.salary_month === monthDate && !r.is_cancelled)
          previousDisplayPayRows = allSalaryPayments.filter(r => r.salary_month === previousMonthForDisplay && !r.is_cancelled)
          dsmfExpenseRows = (snap.dsmf_expenses || []).filter(r => String(r.expense_date || '') >= monthDate && String(r.expense_date || '') <= monthEnd && !r.deleted_at)
          prevSalRows = allSalaryPeriods.filter(r => String(r.salary_month || '') < monthDate)
          prevPayRows = allSalaryPayments.filter(r => String(r.salary_month || '') < monthDate && !r.is_cancelled)
        } else {
          setMessage(empError?.message || salError?.message || advError?.message || payError?.message || previousDisplayPayError?.message || dsmfError?.message || prevSalError?.message || prevPayError?.message)
          setRows([])
          return
        }
      } else {
        empRows = emp || []
        salRows = sal || []
        advRows = adv || []
        payRows = pays || []
        previousDisplayPayRows = previousDisplayPays || []
        dsmfExpenseRows = dsmf || []
        prevSalRows = prevSal || []
        prevPayRows = prevPays || []
      }
    }

    const advancesByEmployee = new Map()
    ;(advRows || []).forEach(a => advancesByEmployee.set(a.employee_id, parseNum(advancesByEmployee.get(a.employee_id)) + parseNum(a.amount)))
    const paymentsByEmployee = new Map()
    ;(payRows || []).forEach(p => paymentsByEmployee.set(p.employee_id, parseNum(paymentsByEmployee.get(p.employee_id)) + parseNum(p.amount)))
    const prevDueByEmployee = new Map()
    ;(prevSalRows || []).forEach(r => prevDueByEmployee.set(r.employee_id, parseNum(prevDueByEmployee.get(r.employee_id)) + parseNum(r.salary_gross) - parseNum(r.advance_amount) - parseNum(r.deduction_amount)))
    const prevPaymentsByEmployee = new Map()
    ;(prevPayRows || []).forEach(p => prevPaymentsByEmployee.set(p.employee_id, parseNum(prevPaymentsByEmployee.get(p.employee_id)) + parseNum(p.amount)))
    const salaryByEmployee = new Map((salRows || []).map(r => [r.employee_id, r]))

    const mappedRows = (empRows || [])
      .filter(e => e.is_active !== false)
      .filter(e => matchesStaffGroup(e, branchId))
      .filter(e => matchesPositionGroup(e, positionFilter))
      .map(e => {
        const advanceTotal = parseNum(advancesByEmployee.get(e.id))
        const salary = salaryByEmployee.get(e.id) || emptySalary(e, advanceTotal)
        const employees = { ...e, ...(salary.employees || {}) }
        const gross = salary.id ? parseNum(salary.salary_gross) : 0
        const deduction = parseNum(salary.deduction_amount)
        const currentDue = gross - advanceTotal - deduction
        const paid = parseNum(paymentsByEmployee.get(e.id))
        const opening = parseNum(prevDueByEmployee.get(e.id)) - parseNum(prevPaymentsByEmployee.get(e.id))
        const finalBalance = opening + currentDue - paid
        return { ...salary, employees, branches: e.branches || salary.branches, branch_id: e.branch_id, salary_gross: gross, advance_amount: advanceTotal, salary_net: currentDue, opening_balance: opening, payroll_payments: paid, final_balance: finalBalance }
      })

    const visibleMappedRows = shouldHideManagerSalaries ? mappedRows.filter(r => !isManagerStaff(r?.employees)) : mappedRows
    const visibleEmployeeIds = new Set(visibleMappedRows.map(r => r.employee_id))

    setRows(visibleMappedRows)
    setSalaryPayments([...(payRows || []), ...(previousDisplayPayRows || [])].filter(p => !shouldHideManagerSalaries || visibleEmployeeIds.has(p.employee_id)))
    setSalaryAdvanceRows((advRows || []).filter(a => !shouldHideManagerSalaries || visibleEmployeeIds.has(a.employee_id)))
    setDsmfRows(dsmfExpenseRows || [])
    if (!paymentForm.employee_id && visibleMappedRows[0]) setPaymentForm(f => ({ ...f, employee_id: visibleMappedRows[0].employee_id }))
    await loadEmployeeFiles(visibleMappedRows.map(r => r.employee_id))
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

  const EMPLOYEE_POSITION_OPTIONS = ['Менеджер', 'Администратор', 'Кассир', 'Бариста', 'Повар', 'Су-шеф', 'Официант', 'Стьюарт', 'Уборщик', 'Курьер', 'Бухгалтер', 'Директор', 'Другое']

  function employeeHistoryKey(employeeId) {
    return `rms_employee_history_${employeeId}`
  }

  function getEmployeeHistory(employeeId) {
    try { return JSON.parse(localStorage.getItem(employeeHistoryKey(employeeId)) || '[]') } catch (_e) { return [] }
  }

  function recordEmployeeHistory(row, patch) {
    const emp = row?.employees || {}
    const labels = {
      full_name: 'Ф.И.О.',
      position: 'Должность',
      monthly_salary: 'Месячная ставка',
      daily_rate: 'Дневная ставка',
      salary_type: 'Тип расчёта',
      employment_status: 'Статус',
      is_active: 'Активность',
      terminated_at: 'Дата увольнения',
      hired_at: 'Дата приёма'
    }
    const changes = Object.entries(patch || {}).map(([key, next]) => ({
      field: labels[key] || key,
      before: emp[key] ?? '',
      after: next ?? ''
    })).filter(c => String(c.before) !== String(c.after))
    if (!changes.length) return
    const history = getEmployeeHistory(row.employee_id)
    history.unshift({
      at: new Date().toLocaleString('ru-RU'),
      user: salaryPrivacyProfile?.login_name || salaryPrivacyProfile?.email || 'system',
      changes
    })
    localStorage.setItem(employeeHistoryKey(row.employee_id), JSON.stringify(history.slice(0, 100)))
    setEmployeeHistoryTick(v => v + 1)
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

    recordEmployeeHistory(row, payload)
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

  async function terminateEmployee(row) {
    setMessage('')
    const amount = parseNum(terminationPayments[row.employee_id])
    if (amount > 0) {
      const { error: payError } = await supabase.from('salary_payments').insert({
        employee_id: row.employee_id,
        branch_id: row.branch_id || row.employees?.branch_id || null,
        salary_month: monthDate,
        payment_date: todayISO(),
        amount,
        method: 'cash',
        comment: 'Выплата остатка зарплаты при увольнении'
      })
      if (payError) return setMessage(payError.message)
    }
    await updateEmployeeDetails(row, {
      employment_status: 'terminated',
      is_active: false,
      terminated_at: todayISO()
    })
    setTerminationPayments(p => ({ ...p, [row.employee_id]: '' }))
  }

  async function deleteEmployeePermanently(row) {
    setMessage('')
    if (!isAdmin) return setMessage('Удаление сотрудников доступно только администратору')
    const employeeId = row?.employee_id || row?.employees?.id
    const employeeName = row?.employees?.full_name || 'сотрудника'
    if (!employeeId) return setMessage('Сотрудник не найден')
    const ok = window.confirm(`Удалить неправильно созданного сотрудника “${employeeName}”? Будут удалены его табель, зарплатные строки, авансы и история назначений. Для обычного увольнения используйте кнопку “Уволить”.`)
    if (!ok) return

    const relatedDeletes = [
      supabase.from('employee_attendance').delete().eq('employee_id', employeeId),
      supabase.from('salary_advances').delete().eq('employee_id', employeeId),
      supabase.from('salary_payments').delete().eq('employee_id', employeeId),
      supabase.from('salary_periods').delete().eq('employee_id', employeeId),
      supabase.from('employee_assignments').delete().eq('employee_id', employeeId),
      supabase.from('employee_files').delete().eq('employee_id', employeeId)
    ]
    for (const op of relatedDeletes) {
      const { error } = await op
      if (error && !String(error.message || '').toLowerCase().includes('does not exist')) return setMessage(error.message)
    }

    const { error } = await supabase.from('employees').delete().eq('id', employeeId)
    if (error) {
      const { error: softError } = await supabase.from('employees').update({ is_active: false, employment_status: 'deleted', terminated_at: todayISO() }).eq('id', employeeId)
      if (softError) return setMessage(error.message)
      await load()
      return setMessage('Сотрудник скрыт из активных. Полное удаление заблокировано связанными данными в базе.')
    }

    try {
      const salaryMap = { ...officialSalaryByEmployee }
      const daysMap = { ...officialDaysByEmployee }
      delete salaryMap[employeeId]
      delete daysMap[employeeId]
      localStorage.setItem('rms_employee_official_salary', JSON.stringify(salaryMap))
      localStorage.setItem('rms_employee_official_days', JSON.stringify(daysMap))
      setOfficialSalaryByEmployee(salaryMap)
      setOfficialDaysByEmployee(daysMap)
    } catch (_e) {}

    await load()
    setEmployeeInfoId('')
    setMessage(`Сотрудник ${employeeName} удалён`)
  }

  async function updateSalary(row, patch) {
    setMessage('')
    const payload = { ...patch }
    ;['worked_days','salary_gross','card_payment','cash_payment','deduction_amount'].forEach(k => { if (k in payload) payload[k] = parseNum(payload[k]) })
    const error = await recalcSalaryRow(row, row.employees, payload)
    if (error) setMessage(error.message)
    else { await load(); setMessage(t('saved')) }
  }

  async function logSalaryTransactionChange(txn, fieldName, oldValue, newValue) {
    try {
      const { data } = await supabase.auth.getUser()
      await supabase.from('finance_operation_log').insert({
        entity_type: txn.txn_type === 'advance' ? 'salary_advance' : 'salary_payment',
        record_id: txn.id,
        branch_id: txn.branch_id || null,
        operation_date: dailyPaymentDate,
        action: 'field_update',
        field_name: fieldName,
        old_value: oldValue == null ? null : String(oldValue),
        new_value: newValue == null ? null : String(newValue),
        user_id: data?.user?.id || null,
        user_email: data?.user?.email || null
      })
    } catch (_e) {}
  }

  async function updateSalaryTransaction(txn, patch) {
    setMessage('')
    const table = txn.txn_type === 'advance' ? 'salary_advances' : 'salary_payments'
    const payload = { ...patch }
    if ('amount' in payload) payload.amount = parseNum(payload.amount)
    const { error } = await supabase.from(table).update(payload).eq('id', txn.id)
    if (error) return setMessage(error.message)
    for (const [field, next] of Object.entries(payload)) {
      const before = field === 'date' ? txn.date : txn[field]
      if (String(before ?? '') !== String(next ?? '')) await logSalaryTransactionChange(txn, field, before, next)
    }
    setEditingSalaryTxn(null)
    await load()
    setMessage('Транзакция зарплатного отчёта обновлена')
  }

  function dsmfCalcForBase(baseValue) {
    const base = parseNum(baseValue)
    const cost = statutoryRestaurantOfficialPayrollCost(base)
    return {
      base,
      employeeDsmf: cost.employee.social,
      employerDsmf: cost.employer.social,
      employeeUnemployment: cost.employee.unemployment,
      employerUnemployment: cost.employer.unemployment,
      employeeMedical: cost.employee.medical,
      employerMedical: cost.employer.medical,
      incomeTax: cost.employee.incomeTax,
      employeeTotal: cost.employee.total,
      employerTotal: cost.employer.total,
      total: cost.total
    }
  }

  function officialDaysForDsmf(row) {
    return parseNum(officialDaysByEmployee[row?.employee_id]) || parseNum(dsmfOfficialDays) || DAILY_DIVISOR
  }

  function officialSalaryForDsmf(row) {
    const employeeId = row?.employee_id
    return parseNum(officialSalaryByEmployee[employeeId]) || parseNum(row?.employees?.official_salary) || parseNum(row?.employees?.monthly_official_salary) || parseNum(row?.employees?.monthly_salary) || parseNum(row?.salary_gross)
  }

  function updateOfficialSalaryForDsmf(employeeId, value) {
    const next = { ...officialSalaryByEmployee, [employeeId]: value }
    setOfficialSalaryByEmployee(next)
    localStorage.setItem('rms_employee_official_salary', JSON.stringify(next))
    window.dispatchEvent(new Event('rms-official-salary-updated'))
  }

  function updateOfficialDaysForDsmf(employeeId, value) {
    const next = { ...officialDaysByEmployee, [employeeId]: value }
    setOfficialDaysByEmployee(next)
    localStorage.setItem('rms_employee_official_days', JSON.stringify(next))
    window.dispatchEvent(new Event('rms-official-days-updated'))
  }

  function dsmfBaseForRow(row) {
    const officialDays = officialDaysForDsmf(row)
    const monthly = officialSalaryForDsmf(row)
    return monthly / DAILY_DIVISOR * officialDays
  }

  function dsmfLineForRow(row) {
    const calc = dsmfCalcForBase(dsmfBaseForRow(row))
    return {
      ...calc,
      employee_id: row.employee_id,
      branch_id: row.branch_id || null,
      branchName: employeeGroupName(row.employees),
      employeeName: row.employees?.full_name || '—',
      position: row.employees?.position || '—',
      officialDays: officialDaysForDsmf(row),
      officialSalary: officialSalaryForDsmf(row)
    }
  }

  const dsmfEmployeeRows = rows.map(dsmfLineForRow).filter(r => r.base > 0)
  const dsmfGroups = staffGroupOptions(branches)
    .map(group => {
      const list = dsmfEmployeeRows.filter(r => (r.branch_id || STAFF_GROUP_MANAGERS) === group.id)
      const total = list.reduce((s, r) => s + parseNum(r.total), 0)
      return { ...group, rows: list, total }
    })
    .filter(group => branchId === 'all' ? group.rows.length > 0 : group.id === branchId)
  const dsmfTotal = dsmfGroups.reduce((s, g) => s + parseNum(g.total), 0)

  function saveDsmfRates() {
    localStorage.setItem('rms_dsmf_rates', JSON.stringify(dsmfRates))
    localStorage.setItem('rms_dsmf_official_days', String(dsmfOfficialDays || '26'))
  }

  async function syncAutoDsmfExpenses() {
    if (!dsmfGroups.length || !dsmfTotal) return
    const start = monthDate
    const end = monthEnd
    await supabase
      .from('daily_expenses')
      .delete()
      .gte('expense_date', start)
      .lte('expense_date', end)
      .eq('custom_category', 'DSMF')
      .ilike('comment', 'DSMF автоматически%')

    const payload = dsmfGroups
      .filter(g => parseNum(g.total) > 0)
      .map(g => ({
        branch_id: g.id === STAFF_GROUP_MANAGERS ? null : g.id,
        expense_date: monthDate,
        amount: parseNum(g.total),
        custom_category: 'DSMF',
        comment: `DSMF автоматически · ${g.name} · сотрудников ${g.rows.length} · оф. дни по табелю/настройке`
      }))
    if (!payload.length) return
    const { error } = await supabase.from('daily_expenses').insert(payload)
    if (!error) setDsmfRows(payload.map((r, i) => ({ id: `auto-${i}`, ...r, branches: { name: dsmfGroups[i]?.name || '—' } })))
  }

  async function addSalaryPayment() {
    setMessage('')
    const employeeId = paymentForm.employee_id
    const row = rows.find(r => r.employee_id === employeeId)
    if (!row) return setMessage('Выберите сотрудника')

    const previousAmount = usePreviousSalaryBalance ? parseNum(paymentForm.previous_amount) : 0
    const currentAmount = parseNum(paymentForm.amount)
    const manualPreviousBalance = useManualPreviousSalaryBalance ? parseNum(paymentForm.manual_previous_balance) : 0
    if (!manualPreviousBalance && !previousAmount && !currentAmount) return setMessage('Введите сумму выплаты или ручной остаток прошлого месяца')

    const paymentDate = paymentForm.payment_date || todayISO()
    const method = paymentForm.method || 'cash'
    const commentBase = paymentForm.comment || 'Выплата зарплаты'

    const previous = prevMonth(year, month)
    const previousMonthDate = monthStart(previous.year, previous.month)

    if (manualPreviousBalance > 0) {
      const { data: existingPreviousSalary } = await supabase
        .from('salary_periods')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('salary_month', previousMonthDate)
        .maybeSingle()

      const { error: manualBalanceError } = await supabase.from('salary_periods').upsert({
        employee_id: employeeId,
        branch_id: row.branch_id || null,
        salary_month: previousMonthDate,
        worked_days: parseNum(existingPreviousSalary?.worked_days),
        salary_gross: manualPreviousBalance,
        advance_amount: parseNum(existingPreviousSalary?.advance_amount),
        deduction_amount: parseNum(existingPreviousSalary?.deduction_amount),
        salary_net: manualPreviousBalance - parseNum(existingPreviousSalary?.advance_amount) - parseNum(existingPreviousSalary?.deduction_amount),
        card_payment: parseNum(existingPreviousSalary?.card_payment),
        cash_payment: parseNum(existingPreviousSalary?.cash_payment),
        comment: 'Ручной ввод остатка зарплаты прошлого месяца'
      }, { onConflict: 'employee_id,salary_month' })
      if (manualBalanceError) return setMessage(manualBalanceError.message)
    }

    let previousPaidAmount = 0
    let previousExcessToAdvance = 0
    if (previousAmount > 0) {
      const previousDebt = Math.max(0, parseNum(row.opening_balance) + manualPreviousBalance)
      previousPaidAmount = Math.min(previousAmount, previousDebt || previousAmount)
      previousExcessToAdvance = Math.max(0, previousAmount - previousPaidAmount)

      if (previousPaidAmount > 0) {
        const { error: previousPayError } = await supabase.from('salary_payments').insert({
          employee_id: employeeId,
          branch_id: row.branch_id || null,
          salary_month: previousMonthDate,
          payment_date: paymentDate,
          amount: previousPaidAmount,
          method,
          comment: `${commentBase} · оплата остатка прошлого месяца`
        })
        if (previousPayError) return setMessage(previousPayError.message)
      }

      if (previousExcessToAdvance > 0) {
        const { error: previousAdvanceError } = await supabase.from('salary_advances').insert({
          employee_id: employeeId,
          branch_id: row.branch_id || null,
          advance_date: paymentDate,
          amount: previousExcessToAdvance,
          comment: `${commentBase} · превышение оплаты прошлого долга перенесено в аванс`
        })
        if (previousAdvanceError) return setMessage(previousAdvanceError.message)
      }
    }

    if (currentAmount > 0) {
      const { error: currentPayError } = await supabase.from('salary_payments').insert({
        employee_id: employeeId,
        branch_id: row.branch_id || null,
        salary_month: monthDate,
        payment_date: paymentDate,
        amount: currentAmount,
        method,
        comment: `${commentBase} · оплата зарплаты выбранного месяца`
      })
      if (currentPayError) return setMessage(currentPayError.message)
    }

    const start = monthDate
    const end = monthEnd
    const [{ data: existing }, { data: advanceRows }, { data: payRows }] = await Promise.all([
      supabase.from('salary_periods').select('*').eq('employee_id', employeeId).eq('salary_month', monthDate).maybeSingle(),
      supabase.from('salary_advances').select('amount').eq('employee_id', employeeId).gte('advance_date', start).lte('advance_date', end).or('is_cancelled.is.null,is_cancelled.eq.false'),
      supabase.from('salary_payments').select('amount').eq('employee_id', employeeId).eq('salary_month', monthDate).or('is_cancelled.is.null,is_cancelled.eq.false')
    ])

    const advance = (advanceRows || []).reduce((sum, a) => sum + parseNum(a.amount), 0)
    const paid = (payRows || []).reduce((sum, p) => sum + parseNum(p.amount), 0)
    const gross = parseNum(existing?.salary_gross || row.salary_gross)
    const deduction = parseNum(existing?.deduction_amount || row.deduction_amount)
    const net = gross - advance - deduction

    const { error: salaryError } = await supabase.from('salary_periods').upsert({
      employee_id: employeeId,
      branch_id: row.branch_id || null,
      salary_month: monthDate,
      worked_days: parseNum(existing?.worked_days || row.worked_days),
      salary_gross: gross,
      salary_net: net,
      advance_amount: advance,
      deduction_amount: deduction,
      card_payment: method === 'bank' ? paid : parseNum(existing?.card_payment || row.card_payment),
      cash_payment: method === 'cash' ? paid : parseNum(existing?.cash_payment || row.cash_payment),
      comment: existing?.comment || 'Автообновление после выплаты зарплаты'
    }, { onConflict: 'employee_id,salary_month' })
    if (salaryError) return setMessage(salaryError.message)

    setPaymentForm(f => ({ ...f, manual_previous_balance: '', previous_amount: '', amount: '', comment: '' }))
    setUseManualPreviousSalaryBalance(false)
    setUsePreviousSalaryBalance(false)
    await load()

    const parts = []
    if (manualPreviousBalance > 0) parts.push(`сохранён ручной долг прошлого месяца: ${fmt(manualPreviousBalance)} AZN`)
    if (previousPaidAmount > 0) parts.push(`закрыт остаток прошлого месяца: ${fmt(previousPaidAmount)} AZN`)
    if (previousExcessToAdvance > 0) parts.push(`превышение перенесено в аванс: ${fmt(previousExcessToAdvance)} AZN`)
    if (currentAmount > 0) parts.push(`оплата выбранного месяца: ${fmt(currentAmount)} AZN`)
    setMessage(parts.join(' · '))
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

  const paymentRows = rows.filter(r => paymentBranchId === 'all' || employeeGroupId(r.employees) === paymentBranchId)
  const selectedPaymentRow = rows.find(r => r.employee_id === paymentForm.employee_id)
  const selectedPaymentCanSee = selectedPaymentRow ? canSeeSalaryValue(selectedPaymentRow) : true
  const selectedEmployeePayments = salaryPayments.filter(p => p.employee_id === paymentForm.employee_id)
  const selectedPaidCash = selectedEmployeePayments.filter(p => p.method === 'cash').reduce((s, p) => s + parseNum(p.amount), 0)
  const selectedPaidCard = selectedEmployeePayments.filter(p => p.method === 'card' || p.method === 'bank').reduce((s, p) => s + parseNum(p.amount), 0)
  const selectedPaidTotal = selectedPaidCash + selectedPaidCard
  const selectedManualPreviousDebtPreview = useManualPreviousSalaryBalance ? parseNum(paymentForm.manual_previous_balance) : 0
  const selectedOpeningDebt = Math.max(0, parseNum(selectedPaymentRow?.opening_balance) + selectedManualPreviousDebtPreview)
  const selectedCurrentDebt = Math.max(0, parseNum(selectedPaymentRow?.salary_net))
  const selectedTotalDebt = Math.max(0, parseNum(selectedPaymentRow?.final_balance))

  const payrollPaymentsForSelectedDate = salaryPayments.filter(p => p.payment_date === dailyPaymentDate)
  const salaryAdvancesForSelectedDate = salaryAdvanceRows.filter(a => a.advance_date === dailyPaymentDate)
  const salaryTransactionsForSelectedDate = [
    ...payrollPaymentsForSelectedDate.map(p => ({ ...p, txn_type: 'payment', txn_id: `payment-${p.id}`, date: p.payment_date, operation: p.salary_month !== monthDate ? 'Оплата остатка прошлого месяца' : 'Оплата зарплаты', method_label: p.method === 'bank' ? 'Банк' : 'Наличные' })),
    ...salaryAdvancesForSelectedDate.map(a => ({ ...a, txn_type: 'advance', txn_id: `advance-${a.id}`, date: a.advance_date, operation: 'Аванс', method: 'cash', method_label: 'Наличные' }))
  ]

  const salaryReportRowsForSelectedDate = rows
    .map(r => {
      const txns = salaryTransactionsForSelectedDate.filter(x => x.employee_id === r.employee_id)
      const payments = txns.filter(x => x.txn_type === 'payment')
      const advances = txns.filter(x => x.txn_type === 'advance')
      const previousPayments = payments.filter(p => p.salary_month !== monthDate)
      const currentPayments = payments.filter(p => p.salary_month === monthDate)
      const paidCash = payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseNum(p.amount), 0)
      const paidBank = payments.filter(p => p.method === 'bank' || p.method === 'card').reduce((s, p) => s + parseNum(p.amount), 0)
      const paidPrevious = previousPayments.reduce((s, p) => s + parseNum(p.amount), 0)
      const paidCurrent = currentPayments.reduce((s, p) => s + parseNum(p.amount), 0)
      const advancesTotal = advances.reduce((s, a) => s + parseNum(a.amount), 0)
      return { row: r, txns, payments, advances, paidCash, paidBank, paidPrevious, paidCurrent, advancesTotal, totalMovement: paidCash + paidBank + advancesTotal, openingDebt: Math.max(0, parseNum(r.opening_balance)) }
    })
    .filter(x => x.txns.length || x.openingDebt > 0)
  const salaryReportGroupsForSelectedDate = staffGroupOptions(branches)
    .map(g => {
      const items = salaryReportRowsForSelectedDate.filter(x => employeeGroupId(x.row.employees) === g.id)
      const visibleItems = items.filter(x => canSeeSalaryValue(x.row))
      return {
        ...g,
        items,
        visibleItems,
        totalCash: visibleItems.reduce((s, x) => s + x.paidCash, 0),
        totalBank: visibleItems.reduce((s, x) => s + x.paidBank, 0),
        totalPreviousPaid: visibleItems.reduce((s, x) => s + x.paidPrevious, 0),
        totalCurrentPaid: visibleItems.reduce((s, x) => s + x.paidCurrent, 0),
        totalAdvances: visibleItems.reduce((s, x) => s + x.advancesTotal, 0),
        totalPaid: visibleItems.reduce((s, x) => s + x.paidCash + x.paidBank, 0),
        totalMovement: visibleItems.reduce((s, x) => s + x.totalMovement, 0),
        totalOpeningDebt: visibleItems.reduce((s, x) => s + x.openingDebt, 0)
      }
    })
    .filter(g => g.items.length)
  const salaryReportDayPaidTotal = salaryReportGroupsForSelectedDate.reduce((s, g) => s + g.totalPaid, 0)
  const salaryReportDayAdvanceTotal = salaryReportGroupsForSelectedDate.reduce((s, g) => s + g.totalAdvances, 0)
  const salaryReportDayMovementTotal = salaryReportGroupsForSelectedDate.reduce((s, g) => s + g.totalMovement, 0)
  const salaryReportDayPreviousTotal = salaryReportGroupsForSelectedDate.reduce((s, g) => s + g.totalPreviousPaid, 0)
  const salaryReportDayCurrentTotal = salaryReportGroupsForSelectedDate.reduce((s, g) => s + g.totalCurrentPaid, 0)
  const salaryReportDayOpeningTotal = salaryReportGroupsForSelectedDate.reduce((s, g) => s + g.totalOpeningDebt, 0)
  const moneyVisibleRows = rows.filter(r => canSeeSalaryValue(r))

  const totals = moneyVisibleRows.reduce((acc, r) => {
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
    const visibleBranchRows = branchRows.filter(r => canSeeSalaryValue(r))
    const masked = branchRows.length > 0 && visibleBranchRows.length === 0
    return {
      id: b.id,
      name: b.name,
      employees: new Set(branchRows.map(r => r.employee_id)).size,
      masked,
      gross: visibleBranchRows.reduce((s, r) => s + parseNum(r.salary_gross), 0),
      advances: visibleBranchRows.reduce((s, r) => s + parseNum(r.advance_amount), 0),
      deductions: visibleBranchRows.reduce((s, r) => s + parseNum(r.deduction_amount), 0),
      net: visibleBranchRows.reduce((s, r) => s + parseNum(r.salary_net), 0),
      opening: visibleBranchRows.reduce((s, r) => s + parseNum(r.opening_balance), 0),
      payments: visibleBranchRows.reduce((s, r) => s + parseNum(r.payroll_payments), 0),
      balance: visibleBranchRows.reduce((s, r) => s + parseNum(r.final_balance), 0)
    }
  }).filter(b => branchId === 'all' ? (b.gross || b.advances || b.net || b.balance || b.employees || b.masked) : b.id === branchId)


  function employeePaidAmount(employeeId) {
    return salaryPayments
      .filter(p => p.employee_id === employeeId && !p.is_cancelled)
      .reduce((s, p) => s + parseNum(p.amount), 0)
  }

  const salaryRows = rows.filter(r => r.employees?.employment_status !== 'terminated' && r.employees?.is_active !== false)
  const archiveRows = rows.filter(r => r.employees?.employment_status === 'terminated' || r.employees?.is_active === false)
  const salaryGroups = staffGroupOptions(branches)
    .map(g => ({ ...g, rows: salaryRows.filter(r => employeeGroupId(r.employees) === g.id) }))
    .filter(g => (branchId === 'all' ? g.rows.length : g.id === branchId))
  const visibleSalaryRowsCount = salaryGroups.reduce((s, g) => s + (expandedSalaryGroups[g.id] ? g.rows.length : Math.min(g.rows.length, 1)), 0)

  function printSalaryEmployeesPdf() {
    const title = `Зарплаты сотрудников · ${I18N.ru.months[Number(month) - 1]} ${year}`
    const branchTitle = branchId === 'all' ? 'Все филиалы и группы' : (staffGroupOptions(branches).find(b => b.id === branchId)?.name || 'Филиал')

    const renderRows = groupRows => groupRows.map(r => {
      const hidden = !canSeeSalaryValue(r)
      return `<tr>
        <td><b>${r.employees?.full_name || ''}</b></td>
        <td>${r.employees?.position || '—'}</td>
        <td>${hidden ? '***' : fmt(r.employees?.monthly_salary)}</td>
        <td>${fmt(r.worked_days)}</td>
        <td>${hidden ? '***' : fmt(r.salary_gross)}</td>
        <td>${hidden ? '***' : fmt(r.advance_amount)}</td>
        <td>${hidden ? '***' : fmt(r.payroll_payments)}</td>
        <td class="pay">${hidden ? '***' : fmt(r.final_balance)}</td>
        <td>${r.employees?.employment_status === 'terminated' || r.employees?.is_active === false ? 'Уволен' : 'Активный'}</td>
      </tr>`
    }).join('')

    const groupHtml = salaryGroups.map(group => {
      const visibleRows = group.rows.filter(r => canSeeSalaryValue(r))
      const groupTotal = visibleRows.reduce((s, r) => s + parseNum(r.final_balance), 0)
      return `<section class="group">
        <div class="group-head"><b>${group.name}</b><span>К оплате: <strong>${fmt(groupTotal)} AZN</strong> · сотрудников: ${group.rows.length}</span></div>
        <table>
          <thead><tr><th>Сотрудник</th><th>Должность</th><th>Ставка</th><th>Дни</th><th>Начислено</th><th>Авансы</th><th>Выплачено</th><th>К оплате</th><th>Статус</th></tr></thead>
          <tbody>${renderRows(group.rows) || '<tr><td colspan="9">Нет сотрудников</td></tr>'}</tbody>
        </table>
        <div class="total">Итого к оплате по филиалу: <b>${fmt(groupTotal)} AZN</b></div>
      </section>`
    }).join('')

    const totalToPay = moneyVisibleRows.reduce((s, r) => s + parseNum(r.final_balance), 0)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#17251d;background:#fffaf2}
      h2{margin:0 0 6px}.muted{color:#777;margin-bottom:16px}
      .summary{display:flex;gap:12px;margin:14px 0 18px}
      .box{border:1px solid #ddd1bf;border-radius:14px;padding:10px 14px;background:#fff}
      .box b{display:block;font-size:18px}
      .group{border:1px solid #ddd1bf;border-radius:16px;overflow:hidden;margin:14px 0;background:#fffdf8}
      .group-head{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#f0e8d8;padding:12px 14px;font-size:15px}
      .group-head strong{color:#b91c1c;font-weight:900}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border-bottom:1px solid #e6dac8;padding:7px;text-align:left}
      th{background:#fffaf2;color:#536057}
      .pay{color:#b91c1c;font-weight:900}
      .total{padding:10px 14px;text-align:right;color:#b91c1c;font-weight:700}
      .total b{font-size:17px}
      .grand{margin-top:18px;border-radius:16px;padding:14px 18px;background:#fff;border:1px solid #ddd1bf;text-align:right;color:#b91c1c;font-weight:800}
      .grand b{font-size:22px}
    </style></head><body>
      <h2>${title}</h2>
      <div class="muted">${branchTitle}</div>
      <div class="summary">
        <div class="box">Начислено<b>${fmt(totals.gross)}</b></div>
        <div class="box">Выплачено<b>${fmt(totals.payments)}</b></div>
        <div class="box">Общая сумма к оплате<b>${fmt(totalToPay)}</b></div>
      </div>
      ${groupHtml || '<p>Нет сотрудников</p>'}
      <div class="grand">Общая сумма к оплате: <b>${fmt(totalToPay)} AZN</b></div>
    </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }


  const salarySheetRows = rows
    .filter(r => r.employees?.employment_status !== 'terminated' && r.employees?.is_active !== false)
    .map(r => ({
      employee_id: r.employee_id,
      branch: employeeGroupName(r.employees),
      employee: r.employees?.full_name || '—',
      position: r.employees?.position || '—',
      days: parseNum(r.worked_days),
      base_salary: parseNum(r.employees?.monthly_salary),
      accrued: parseNum(r.salary_gross),
      advances: parseNum(r.advance_amount),
      to_pay: parseNum(r.final_balance)
    }))
    .sort((a, b) => String(a.branch).localeCompare(String(b.branch)) || String(a.position).localeCompare(String(b.position)) || String(a.employee).localeCompare(String(b.employee)))

  const salarySheetTotals = salarySheetRows.reduce((acc, r) => {
    acc.base += parseNum(r.base_salary)
    acc.accrued += parseNum(r.accrued)
    acc.advances += parseNum(r.advances)
    acc.toPay += parseNum(r.to_pay)
    return acc
  }, { base: 0, accrued: 0, advances: 0, toPay: 0 })

  function exportSalarySheetCsv() {
    const headers = ['Филиал', 'Сотрудник', 'Должность', 'Дни', 'Базовая зарплата', 'Начислено', 'Авансы', 'К выплате']
    const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`
    const lines = [
      headers.map(escapeCsv).join(';'),
      ...salarySheetRows.map(r => [
        r.branch,
        r.employee,
        r.position,
        fmt(r.days),
        fmt(r.base_salary),
        fmt(r.accrued),
        fmt(r.advances),
        fmt(r.to_pay)
      ].map(escapeCsv).join(';')),
      ['ИТОГО', '', '', '', fmt(salarySheetTotals.base), fmt(salarySheetTotals.accrued), fmt(salarySheetTotals.advances), fmt(salarySheetTotals.toPay)].map(escapeCsv).join(';')
    ]
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `salary-sheet-${year}-${String(month).padStart(2, '0')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function printSalarySheet() {
    const title = `Зарплатный лист · ${I18N.ru.months[Number(month) - 1]} ${year}`
    const rowsHtml = salarySheetRows.map(r => `<tr>
      <td>${r.branch}</td>
      <td><b>${r.employee}</b></td>
      <td>${r.position}</td>
      <td class="num">${fmt(r.days)}</td>
      <td class="num">${fmt(r.base_salary)}</td>
      <td class="num">${fmt(r.accrued)}</td>
      <td class="num">${fmt(r.advances)}</td>
      <td class="num pay">${fmt(r.to_pay)}</td>
    </tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0;color:#17212f}
        .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm;background:#fff}
        h1{margin:0 0 5px;font-size:20px}
        .muted{color:#667085;margin-bottom:12px;font-size:12px}
        .sheet{background:#fff}
        table{width:100%;border-collapse:collapse;font-size:10.5px;table-layout:fixed}
        th{background:#eef2f7;color:#475569;text-align:left;padding:6px;border-bottom:1px solid #d7dee8}
        td{padding:6px;border-bottom:1px solid #e5e9ef;vertical-align:top;word-break:break-word}
        th:nth-child(1),td:nth-child(1){width:17%}
        th:nth-child(2),td:nth-child(2){width:22%}
        th:nth-child(3),td:nth-child(3){width:15%}
        th:nth-child(4),td:nth-child(4){width:7%}
        th:nth-child(5),td:nth-child(5){width:13%}
        th:nth-child(6),td:nth-child(6){width:12%}
        th:nth-child(7),td:nth-child(7){width:10%}
        th:nth-child(8),td:nth-child(8){width:12%}
        thead{display:table-header-group}
        tfoot{display:table-row-group}
        tr{page-break-inside:avoid}
        .num{text-align:right;white-space:nowrap}
        .pay{font-weight:900;color:#166534}
        tfoot td{background:#f8fafc;font-weight:900;border-top:2px solid #cbd5e1}
        .actions{width:210mm;margin:0 auto 10px;padding-top:10px}
        button{border:0;border-radius:10px;padding:9px 14px;background:#475569;color:white;font-weight:800}
        @media print{body{background:white}.actions{display:none}.page{width:auto;min-height:auto;margin:0;padding:0}.sheet{border:0;border-radius:0}}
      </style></head><body>
      <div class="actions"><button onclick="window.print()">PDF/Print</button></div>
      <div class="page"><div class="sheet">
        <h1>${title}</h1>
        <div class="muted">${branchId === 'all' ? 'Все филиалы и группы' : (staffGroupOptions(branches).find(b => b.id === branchId)?.name || 'Филиал')}</div>
        <table>
          <thead><tr><th>Филиал</th><th>Сотрудник</th><th>Должность</th><th class="num">Дни</th><th class="num">Базовая зарплата</th><th class="num">Начислено</th><th class="num">Авансы</th><th class="num">К выплате</th></tr></thead>
          <tbody>${rowsHtml || '<tr><td colspan="8">Нет данных</td></tr>'}</tbody>
          <tfoot><tr><td colspan="3">Итого</td><td class="num">—</td><td class="num">${fmt(salarySheetTotals.base)}</td><td class="num">${fmt(salarySheetTotals.accrued)}</td><td class="num">${fmt(salarySheetTotals.advances)}</td><td class="num pay">${fmt(salarySheetTotals.toPay)}</td></tr></tfoot>
        </table>
      </div></div>
    </body></html>`
    const w = window.open('', '_blank', 'width=1100,height=760')
    if (!w) return setMessage('Браузер заблокировал окно печати')
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  if (view === 'sheet') {
    return <section className="salary-section salary-view-sheet">
      <section className="topbar">
        <div>
          <h2>Зарплатный лист</h2>
          <p>Компактная таблица по сотрудникам: филиал, должность, дни, базовая зарплата, начислено, авансы и сумма к выплате.</p>
        </div>
        <div className="action-row">
          <button className="ghost small" onClick={exportSalarySheetCsv}>CSV</button>
          <button className="small primary" onClick={printSalarySheet}>PDF/Print</button>
        </div>
      </section>

      <section className="grid">
        <div className="card span-2">
          <div className="form-grid compact">
            <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
            <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
            <label><span>Филиал / группа</span><select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="all">Все филиалы и менеджеры</option>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span>Позиция</span><select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}><option value="all">Все позиции</option>{STAFF_POSITION_GROUPS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          </div>
          <div className="grid mini-grid">
            <div className="metric"><span>Дни</span><strong>—</strong></div>
            <div className="metric"><span>Базовая зарплата</span><strong>{fmt(salarySheetTotals.base)}</strong></div>
            <div className="metric"><span>Начислено</span><strong>{fmt(salarySheetTotals.accrued)}</strong></div>
            <div className="metric"><span>Авансы</span><strong>{fmt(salarySheetTotals.advances)}</strong></div>
            <div className="metric"><span>К выплате</span><strong className={salarySheetTotals.toPay >= 0 ? 'good' : 'bad'}>{fmt(salarySheetTotals.toPay)}</strong></div>
          </div>
          {shouldHideManagerSalaries && <p className="hint">Менеджерские зарплаты скрыты по правам текущего пользователя.</p>}
          {message && <p className={`hint ${message === t('saved') || message.includes('Файл') ? 'good' : 'bad'}`}>{message}</p>}
        </div>

        <div className="card span-2">
          <div className="card-head">
            <div>
              <h3>Список сотрудников</h3>
              <p className="hint">К выплате выделено жирным цветом. Экспорт доступен в CSV и PDF/Print.</p>
            </div>
            <span className="hint">{salarySheetRows.length} сотрудников</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Филиал</th>
                  <th>Сотрудник</th>
                  <th>Должность</th>
                  <th>Дни</th>
                  <th>Базовая зарплата</th>
                  <th>Начислено</th>
                  <th>Авансы</th>
                  <th>К выплате</th>
                </tr>
              </thead>
              <tbody>
                {salarySheetRows.map(r => <tr key={r.employee_id}>
                  <td>{r.branch}</td>
                  <td><strong>{r.employee}</strong></td>
                  <td>{r.position}</td>
                  <td>{fmt(r.days)}</td>
                  <td>{fmt(r.base_salary)}</td>
                  <td>{fmt(r.accrued)}</td>
                  <td>{fmt(r.advances)}</td>
                  <td><strong className={r.to_pay >= 0 ? 'good' : 'bad'}>{fmt(r.to_pay)}</strong></td>
                </tr>)}
                {!salarySheetRows.length && <tr><td colSpan="8" className="hint">Нет данных за выбранный период.</td></tr>}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3"><strong>Итого</strong></td>
                  <td><strong>—</strong></td>
                  <td><strong>{fmt(salarySheetTotals.base)}</strong></td>
                  <td><strong>{fmt(salarySheetTotals.accrued)}</strong></td>
                  <td><strong>{fmt(salarySheetTotals.advances)}</strong></td>
                  <td><strong className={salarySheetTotals.toPay >= 0 ? 'good' : 'bad'}>{fmt(salarySheetTotals.toPay)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </section>
  }

  return <section className={`salary-section salary-view-${view} attendance-card`}>
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
        {shouldHideManagerSalaries
          ? <p className="hint">Зарплаты менеджерского состава скрыты для текущего пользователя: суммы заменены на замутнённые значения.</p>
          : <p className="hint">Маскировка зарплат менеджеров для текущего пользователя выключена.</p>}
        {message && <p className={`hint ${message === t('saved') || message.includes('Файл') ? 'good' : 'bad'}`}>{message}</p>}
      </div>

      <div className="card span-2">
        <h3>Сводка по филиалам</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал / группа</th><th>Сотр.</th><th>Начислено</th><th>Авансы</th><th>Выплачено</th><th>К оплате</th></tr></thead>
          <tbody>{branchTotals.map(b => <tr key={b.id}><td>{b.name}</td><td><strong>{b.employees}</strong></td><td>{b.masked ? maskedMoney : fmt(b.gross)}</td><td>{b.masked ? maskedMoney : fmt(b.advances)}</td><td>{b.masked ? maskedMoney : fmt(b.payments)}</td><td>{b.masked ? maskedMoney : <strong className={b.balance >= 0 ? '' : 'bad'}>{fmt(b.balance)}</strong>}</td></tr>)}{!branchTotals.length && <tr><td colSpan="6" className="hint">Нет данных за выбранный период.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Выплата зарплаты за выбранный месяц</h3>
        {message && <p className={`hint ${message.includes('сохранён') || message.includes('закрыт') || message.includes('оплата') || message.includes('обновлена') ? 'good' : 'bad'}`}>{message}</p>}
        <p className="hint">Например, зарплату за апрель можно выплатить 1 или 2 мая — она всё равно закроет апрель. Остаток прошлого месяца можно сначала внести вручную через галочку, а оплату этого остатка — отдельной галочкой. Эти суммы не попадают в авансы текущего месяца.</p>
        <div className="form-grid compact">
          <label><span>Филиал / группа</span><select value={paymentBranchId} onChange={e => { setPaymentBranchId(e.target.value); const first = rows.find(r => e.target.value === 'all' || employeeGroupId(r.employees) === e.target.value); setPaymentForm(f => ({ ...f, employee_id: first?.employee_id || '' })) }}><option value="all">Все филиалы и менеджеры</option>{staffGroupOptions(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label><span>Сотрудник</span><select value={paymentForm.employee_id} onChange={e => setPaymentForm({ ...paymentForm, employee_id: e.target.value })}>{paymentRows.map(r => <option key={r.employee_id} value={r.employee_id}>{employeeGroupName(r.employees)} · {r.employees?.full_name}</option>)}</select></label>
          <label><span>Дата выплаты</span><input type="date" value={paymentForm.payment_date} onChange={e => { setPaymentForm({ ...paymentForm, payment_date: e.target.value }); setDailyPaymentDate(e.target.value) }} /></label>
          <label><span>Оплата зарплаты выбранного месяца</span><input inputMode="decimal" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></label>
          <label><span>Способ</span><select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}><option value="cash">Наличные</option><option value="bank">Банк</option></select></label>

          <div className="notice" style={{gridColumn:'span 2', padding:12}}>
            <label className="checkbox-row"><input type="checkbox" checked={useManualPreviousSalaryBalance} onChange={e => setUseManualPreviousSalaryBalance(e.target.checked)} /> Ввести долг / остаток зарплаты прошлого месяца вручную</label>
            <p className="hint">Используется при запуске программы с нуля, если долг уже существовал до начала учёта.</p>
            {useManualPreviousSalaryBalance && <label><span>Сумма долга прошлого месяца</span><input inputMode="decimal" value={paymentForm.manual_previous_balance} onChange={e => setPaymentForm({ ...paymentForm, manual_previous_balance: e.target.value })} placeholder="Например: 930" /></label>}
          </div>

          <div className="notice" style={{gridColumn:'span 2', padding:12}}>
            <label className="checkbox-row"><input type="checkbox" checked={usePreviousSalaryBalance} onChange={e => setUsePreviousSalaryBalance(e.target.checked)} /> Оплатить долг / остаток зарплаты прошлого месяца</label>
            <p className="hint">Эта сумма закрывает прошлый месяц и не попадает в авансы текущего месяца.</p>
            {usePreviousSalaryBalance && <label><span>Сумма оплаты долга прошлого месяца</span><input inputMode="decimal" value={paymentForm.previous_amount} onChange={e => setPaymentForm({ ...paymentForm, previous_amount: e.target.value })} placeholder="Например: 930" /></label>}
          </div>

          <label style={{gridColumn:'span 2'}}><span>Комментарий</span><input value={paymentForm.comment} onChange={e => setPaymentForm({ ...paymentForm, comment: e.target.value })} placeholder="Например: закрытие зарплаты за апрель" /></label>
          <div style={{gridColumn:'span 2'}}><button className="primary" onClick={addSalaryPayment}>+ Сохранить операцию</button></div>
        </div>
        {selectedPaymentRow && <div className="mini-grid" style={{marginTop:12}}>
          <div className="metric"><span>Итого к оплате</span><strong className={selectedTotalDebt > 0 ? 'bad' : ''}>{selectedPaymentCanSee ? fmt(selectedTotalDebt) : maskedMoney}</strong></div>
          <div className="metric"><span>Долг / остаток прошлого месяца</span><strong>{selectedPaymentCanSee ? fmt(selectedOpeningDebt) : maskedMoney}</strong></div>
          <div className="metric"><span>Текущий остаток месяца</span><strong>{selectedPaymentCanSee ? fmt(selectedCurrentDebt) : maskedMoney}</strong></div>
          <div className="metric"><span>Уже оплачено наличными</span><strong>{selectedPaymentCanSee ? fmt(selectedPaidCash) : maskedMoney}</strong></div>
          <div className="metric"><span>Уже оплачено банком</span><strong>{selectedPaymentCanSee ? fmt(selectedPaidCard) : maskedMoney}</strong></div>
          <div className="metric"><span>Уже оплачено всего</span><strong>{selectedPaymentCanSee ? fmt(selectedPaidTotal) : maskedMoney}</strong></div>
        </div>}
      </div>

      <div className="card span-2">
        <div className="card-head">
          <div>
            <h3>Отчёты зарплат за выбранный день</h3>
            <p className="hint">Единый отчёт по выплатам зарплаты, оплате остатков прошлого месяца и авансам за выбранную дату.</p>
          </div>
        </div>
        <div className="form-grid compact" style={{marginBottom:12}}>
          <label><span>Выбрать день отчёта</span><input type="date" value={dailyPaymentDate} onChange={e => setDailyPaymentDate(e.target.value)} /></label>
        </div>
        <div className="mini-grid">
          <div className="metric"><span>Дата</span><strong>{dailyPaymentDate}</strong></div>
          <div className="metric"><span>Выплаты зарплаты</span><strong>{fmt(salaryReportDayPaidTotal)}</strong></div>
          <div className="metric"><span>Авансы</span><strong>{fmt(salaryReportDayAdvanceTotal)}</strong></div>
          <div className="metric"><span>Всего движение</span><strong>{fmt(salaryReportDayMovementTotal)}</strong></div>
          <div className="metric"><span>Оплата остатка прошлого месяца</span><strong>{fmt(salaryReportDayPreviousTotal)}</strong></div>
          <div className="metric"><span>Оплата выбранного месяца</span><strong>{fmt(salaryReportDayCurrentTotal)}</strong></div>
          <div className="metric"><span>Остаток прошлого месяца</span><strong className={salaryReportDayOpeningTotal > 0 ? 'bad' : ''}>{fmt(salaryReportDayOpeningTotal)}</strong></div>
        </div>
        {salaryReportGroupsForSelectedDate.map(group => {
          const expanded = Boolean(expandedPaymentGroups[group.id])
          const shown = expanded ? group.items : group.items.slice(0, 1)
          return <div key={`salary-report-${group.id}`} className="supplier-entity-group">
            <div className="supplier-entity-head">
              <b>{group.name}</b>
              <span>Выплаты: <strong>{fmt(group.totalPaid)}</strong> · авансы: <strong>{fmt(group.totalAdvances)}</strong> · всего: <strong>{fmt(group.totalMovement)}</strong> · сотрудников: {group.items.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Сотрудник</th><th>Должность</th><th>Операция</th><th>Сумма</th><th>Способ</th><th>Комментарий</th><th>Остаток прошлого месяца</th><th>Ред.</th></tr></thead>
                <tbody>
                  {shown.map(item => {
                    const r = item.row
                    const hidden = !canSeeSalaryValue(r)
                    const txns = item.txns.length ? item.txns : [{ txn_id: `empty-${r.employee_id}`, txn_type: 'empty', operation: 'Нет операции', amount: 0, method_label: '—', comment: '' }]
                    return txns.map((txn, txIdx) => {
                      const isEditing = editingSalaryTxn?.txn_id === txn.txn_id
                      return <tr key={`${txn.txn_id}-${txIdx}`}>
                        {txIdx === 0 && <td rowSpan={txns.length}><b>{r.employees?.full_name}</b></td>}
                        {txIdx === 0 && <td rowSpan={txns.length}>{r.employees?.position || '—'}</td>}
                        <td>{txn.operation}</td>
                        <td>{isEditing
                          ? <input style={{width:90}} inputMode="decimal" value={editingSalaryTxn.amount} onChange={e => setEditingSalaryTxn(x => ({...x, amount: e.target.value}))} />
                          : hidden ? maskedMoney : <b>{fmt(txn.amount)}</b>}</td>
                        <td>{isEditing && txn.txn_type === 'payment'
                          ? <select value={editingSalaryTxn.method || 'cash'} onChange={e => setEditingSalaryTxn(x => ({...x, method: e.target.value}))}><option value="cash">Наличные</option><option value="bank">Банк</option></select>
                          : txn.method_label}</td>
                        <td>{isEditing
                          ? <input value={editingSalaryTxn.comment || ''} onChange={e => setEditingSalaryTxn(x => ({...x, comment: e.target.value}))} />
                          : (txn.comment || '—')}</td>
                        {txIdx === 0 && <td rowSpan={txns.length} className={item.openingDebt > 0 ? 'bad' : ''}>{hidden ? maskedMoney : fmt(item.openingDebt)}</td>}
                        <td>{txn.txn_type === 'empty' ? '—' : isEditing
                          ? <div className="action-row"><button className="small primary" onClick={() => updateSalaryTransaction(txn, txn.txn_type === 'advance' ? { amount: editingSalaryTxn.amount, comment: editingSalaryTxn.comment } : { amount: editingSalaryTxn.amount, method: editingSalaryTxn.method, comment: editingSalaryTxn.comment })}>Сохранить</button><button className="ghost small" onClick={() => setEditingSalaryTxn(null)}>Отмена</button></div>
                          : <button className="ghost small" onClick={() => setEditingSalaryTxn({ txn_id: txn.txn_id, amount: String(txn.amount || ''), method: txn.method || 'cash', comment: txn.comment || '' })}>Ред.</button>}</td>
                      </tr>
                    })
                  })}
                </tbody>
              </table>
            </div>
            {group.items.length > 1 && <button className="ghost small" onClick={() => setExpandedPaymentGroups(s => ({...s, [group.id]: !expanded}))}>{expanded ? 'Свернуть' : `Показать всех (${group.items.length})`}</button>}
          </div>
        })}
        {!salaryReportGroupsForSelectedDate.length && <p className="hint">За выбранную дату выплат и авансов пока нет.</p>}
      </div>

      <div className="card span-2 salary-dsmf-card">
        <div className="card-head">
          <div>
            <h3>DSMF</h3>
            <p className="hint">Система автоматически считает DSMF по сотрудникам, группирует по филиалам и автоматически добавляет итог филиала отдельной статьёй расходов.</p>
          </div>
        </div>

        <div className="form-grid compact">
          <MoneyInput label="Официально рабочих дней по умолчанию" value={dsmfOfficialDays} onChange={v => setDsmfOfficialDays(v)} />
          <label style={{ gridColumn: 'span 2' }}><span>Логика расчёта</span><input value="От официальной зарплаты и оф. дней: часть работодателя + часть сотрудника + подоходный налог" readOnly /></label>
        </div>

        <div className="action-row" style={{marginBottom:12}}>
          <span className="hint">Итого официальная налоговая нагрузка, покрываемая рестораном: <b>{fmt(dsmfTotal)}</b> AZN · расчёт по правилам 2026 для частного non-oil сектора</span>
          <button className="small" onClick={saveDsmfRates}>Сохранить оф. дни по умолчанию</button>
        </div>

        {dsmfGroups.map(group => {
          const expanded = Boolean(expandedDsmfGroups[group.id])
          const shownRows = expanded ? group.rows : group.rows.slice(0, 1)
          return <div key={`dsmf-${group.id}`} className="supplier-entity-group">
            <div className="supplier-entity-head">
              <b>{group.name}</b>
              <span>DSMF: <strong>{fmt(group.total)}</strong> AZN · сотрудников: {group.rows.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Сотрудник</th><th>Должность</th><th>Оф. зарплата</th><th>Оф. дни</th><th>База</th><th>DSMF сотр.</th><th>DSMF работ.</th><th>Безраб. сотр.</th><th>Безраб. работ.</th><th>Мед. сотр.</th><th>Мед. работ.</th><th>Налог</th><th>Итого</th></tr></thead>
                <tbody>
                  {shownRows.map(r => <tr key={r.employee_id}>
                    <td><b>{r.employeeName}</b></td>
                    <td>{r.position}</td>
                    <td><input style={{ minWidth: 92, padding: '6px 7px' }} inputMode="decimal" value={officialSalaryByEmployee[r.employee_id] ?? r.officialSalary ?? ''} onChange={e => updateOfficialSalaryForDsmf(r.employee_id, e.target.value)} /></td>
                    <td><input style={{ minWidth: 72, padding: '6px 7px' }} inputMode="decimal" value={officialDaysByEmployee[r.employee_id] ?? r.officialDays ?? ''} onChange={e => updateOfficialDaysForDsmf(r.employee_id, e.target.value)} /></td>
                    <td>{fmt(r.base)}</td>
                    <td>{fmt(r.employeeDsmf)}</td>
                    <td>{fmt(r.employerDsmf)}</td>
                    <td>{fmt(r.employeeUnemployment)}</td>
                    <td>{fmt(r.employerUnemployment)}</td>
                    <td>{fmt(r.employeeMedical)}</td>
                    <td>{fmt(r.employerMedical)}</td>
                    <td>{fmt(r.incomeTax)}</td>
                    <td><b>{fmt(r.total)}</b></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            {group.rows.length > 2 && <button className="ghost small" onClick={() => setExpandedDsmfGroups(s => ({...s, [group.id]: !expanded}))}>{expanded ? 'Свернуть' : `Показать всех (${group.rows.length})`}</button>}
          </div>
        })}
        {!dsmfGroups.length && <p className="hint">Нет сотрудников для расчёта DSMF в выбранном фильтре.</p>}

        <p className="hint">DSMF автоматически попадает в расходы филиалов как статья “DSMF”. В сумму включены обязательства работодателя и удержания сотрудника, если их фактически покрывает ресторан.</p>
      </div>

      <div className="card span-2">
        <div className="card-head"><h3>Зарплаты сотрудников</h3><button className="small primary" onClick={printSalaryEmployeesPdf}>PDF/Print</button></div>
        {salaryGroups.map(group => {
          const expanded = Boolean(expandedSalaryGroups[group.id])
          const groupRows = expanded ? group.rows : group.rows.slice(0, 1)
          const visibleGroupRows = group.rows.filter(r => canSeeSalaryValue(r))
          const groupToPay = visibleGroupRows.reduce((s, r) => s + parseNum(r.final_balance), 0)
          return <div key={`salary-group-${group.id}`} className="supplier-entity-group">
            <div className="supplier-entity-head">
              <b>{group.name}</b>
              <span>К оплате: <strong className="bad">{fmt(groupToPay)} AZN</strong> · сотрудников: {group.rows.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Сотрудник</th><th>Должность</th><th>Ставка</th><th>Дни</th><th>Начислено</th><th>Авансы</th><th>Выплачено</th><th>К оплате</th><th>Статус</th><th>Инфо</th></tr></thead>
                <tbody>
                  {groupRows.map(r => {
                    const underworked = isMonthClosingDay && r.id && parseNum(r.worked_days) < DAILY_DIVISOR
                    const isInfoOpen = employeeInfoId === r.employee_id
                    const history = isInfoOpen ? getEmployeeHistory(r.employee_id) : []
                    return <React.Fragment key={r.id || r.employee_id}>
                      <tr style={underworked ? { background: 'rgba(240,232,216,.55)' } : undefined}>
                        <td><b>{r.employees?.full_name}</b></td>
                        <td>{r.employees?.position || '—'}</td>
                        <td>{moneyCell(r, r.employees?.monthly_salary)}</td>
                        <td>{fmt(r.worked_days)}</td>
                        <td>{moneyCell(r, r.salary_gross)}</td>
                        <td>{moneyCell(r, r.advance_amount)}</td>
                        <td>{moneyCell(r, r.payroll_payments)}</td>
                        <td className="bad"><b>{strongMoneyCell(r, r.final_balance, 'bad')}</b></td>
                        <td>{r.employees?.employment_status === 'terminated' || r.employees?.is_active === false ? <span className="bad">Уволен</span> : <span className="good">Активный</span>}</td>
                        <td><button className="ghost small" onClick={() => setEmployeeInfoId(isInfoOpen ? '' : r.employee_id)}>i</button></td>
                      </tr>
                      {isInfoOpen && <tr><td colSpan="10"><div className="notice">
                        <div className="card-head">
                          <div><h3>Карточка сотрудника: {r.employees?.full_name}</h3><p className="hint">Редактирование сотрудника и история изменений.</p></div>
                          <div className="action-row">
                            {r.employees?.employment_status === 'terminated' || r.employees?.is_active === false
                              ? <button className="small primary" onClick={() => updateEmployeeDetails(r, { employment_status: 'active', is_active: true, terminated_at: null })}>Вернуть в активные</button>
                              : <>
                                  <input style={{width:140}} inputMode="decimal" value={terminationPayments[r.employee_id] || ''} onChange={e => setTerminationPayments(p => ({...p, [r.employee_id]: e.target.value}))} placeholder="Выплата остатка" />
                                  <button className="danger small" onClick={() => terminateEmployee(r)}>Уволить</button>
                                </>}
                            {isAdmin && <button className="danger small" onClick={() => deleteEmployeePermanently(r)}>Удалить ошибочно созданного</button>}
                            <button className="ghost small" onClick={() => setEmployeeInfoId('')}>Закрыть</button>
                          </div>
                        </div>
                        <div className="mini-grid" style={{marginBottom:12}}>
                          <div className="metric"><span>Базовая ставка</span><strong>{moneyCell(r, r.employees?.monthly_salary)}</strong></div>
                          <div className="metric"><span>Долг на начало</span><strong>{moneyCell(r, r.opening_balance)}</strong></div>
                          <div className="metric"><span>Удержание</span><strong>{moneyCell(r, r.deduction_amount)}</strong></div>
                          <div className="metric"><span>Остаток месяца</span><strong>{moneyCell(r, r.salary_net)}</strong></div>
                          <div className="metric"><span>Выплачено</span><strong>{moneyCell(r, r.payroll_payments)}</strong></div>
                          <div className="metric"><span>К оплате</span><strong className="bad">{strongMoneyCell(r, r.final_balance, 'bad')}</strong></div>
                        </div>
                        <div className="form-grid compact">
                          <label><span>Ф.И.О.</span><input defaultValue={r.employees?.full_name || ''} onBlur={e => updateEmployeeDetails(r, { full_name: e.target.value.trim() || r.employees?.full_name })} /></label>
                          <label><span>Должность</span><select value={r.employees?.position || ''} onChange={e => updateEmployeeDetails(r, { position: e.target.value || null })}><option value="">—</option>{EMPLOYEE_POSITION_OPTIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}</select></label>
                          <label><span>Месячная ставка</span><input inputMode="decimal" defaultValue={r.employees?.monthly_salary || r.monthly_salary || ''} onBlur={e => updateEmployeeDetails(r, { monthly_salary: e.target.value }, true)} /></label>
                          <label><span>Тип расчёта</span><select defaultValue={r.employees?.salary_type || 'monthly'} onBlur={e => updateEmployeeDetails(r, { salary_type: e.target.value }, true)}><option value="monthly">Фикс</option><option value="daily">По дням</option></select></label>
                          <label><span>Дата приёма</span><input type="date" defaultValue={r.employees?.hired_at || ''} onBlur={e => updateEmployeeDetails(r, { hired_at: e.target.value || null })} /></label>
                          <label><span>Дата увольнения</span><input type="date" defaultValue={r.employees?.terminated_at || ''} onBlur={e => updateEmployeeDetails(r, { terminated_at: e.target.value || null, employment_status: e.target.value ? 'terminated' : (r.employees?.employment_status || 'active'), is_active: e.target.value ? false : true })} /></label>
                        </div>
                        <h3>История изменений</h3>
                        <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Пользователь</th><th>Изменение</th></tr></thead><tbody>
                          {history.map((h, idx) => <tr key={idx}><td>{h.at}</td><td>{h.user}</td><td>{h.changes.map((c, i) => <div key={i}><b>{c.field}</b>: {String(c.before || '—')} → {String(c.after || '—')}</div>)}</td></tr>)}
                          {!history.length && <tr><td colSpan="3" className="hint">История пока пустая.</td></tr>}
                        </tbody></table></div>
                        <div className="action-row" style={{marginTop:12}}><button className="ghost small" onClick={() => setEmployeeInfoId('')}>Закрыть карточку</button></div>
                      </div></td></tr>}
                    </React.Fragment>
                  })}
                </tbody>
              </table>
            </div>
            <div className="hint bad" style={{textAlign:'right', marginTop:8}}>Итого к оплате по филиалу: <b>{fmt(groupToPay)} AZN</b></div>
            {group.rows.length > 1 && <button className="ghost small" onClick={() => setExpandedSalaryGroups(s => ({...s, [group.id]: !expanded}))}>{expanded ? 'Свернуть' : `Показать всех (${group.rows.length})`}</button>}
          </div>
        })}
        {!salaryGroups.length && <p className="hint">Нет сотрудников в выбранном фильтре.</p>}
        <div className="hint bad" style={{textAlign:'right', marginTop:12, fontSize:16}}>Общая сумма к оплате: <b>{fmt(moneyVisibleRows.reduce((s, r) => s + parseNum(r.final_balance), 0))} AZN</b></div>
      </div>


      <div className="card span-2">
        <h3>Архив уволенных сотрудников</h3>
        <p className="hint">Уволенные сотрудники остаются в архиве. Их можно редактировать через карточку сотрудника.</p>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал / группа</th><th>Должность</th><th>Сотрудник</th><th>Дата приёма</th><th>Дата увольнения</th><th>Выплачено</th><th>Статус</th><th>Инфо</th></tr></thead>
          <tbody>{archiveRows.map(r => {
            const isInfoOpen = employeeInfoId === r.employee_id
            const history = isInfoOpen ? getEmployeeHistory(r.employee_id) : []
            return <React.Fragment key={`archive-${r.employee_id}`}>
              <tr>
                <td>{employeeGroupName(r.employees)}</td>
                <td>{r.employees?.position || '—'}</td>
                <td><b>{r.employees?.full_name}</b> <span className="bad">Уволен</span></td>
                <td>{r.employees?.hired_at || '—'}</td>
                <td>{r.employees?.terminated_at || '—'}</td>
                <td><b>{fmt(employeePaidAmount(r.employee_id))}</b></td>
                <td><span className="bad">Уволен</span></td>
                <td><button className="ghost small" onClick={() => setEmployeeInfoId(isInfoOpen ? '' : r.employee_id)}>i</button></td>
              </tr>
              {isInfoOpen && <tr><td colSpan="8"><div className="notice">
                <div className="card-head">
                  <div><h3>Карточка уволенного сотрудника: {r.employees?.full_name}</h3><p className="hint">Редактирование и история изменений.</p></div>
                  <div className="action-row">
                    <button className="small primary" onClick={() => updateEmployeeDetails(r, { employment_status: 'active', is_active: true, terminated_at: null })}>Вернуть в активные</button>
                    <button className="ghost small" onClick={() => setEmployeeInfoId('')}>Закрыть</button>
                  </div>
                </div>
                <div className="form-grid compact">
                  <label><span>Ф.И.О.</span><input defaultValue={r.employees?.full_name || ''} onBlur={e => updateEmployeeDetails(r, { full_name: e.target.value.trim() || r.employees?.full_name })} /></label>
                  <label><span>Должность</span><select value={r.employees?.position || ''} onChange={e => updateEmployeeDetails(r, { position: e.target.value || null })}><option value="">—</option>{EMPLOYEE_POSITION_OPTIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}</select></label>
                  <label><span>Месячная ставка</span><input inputMode="decimal" defaultValue={r.employees?.monthly_salary || r.monthly_salary || ''} onBlur={e => updateEmployeeDetails(r, { monthly_salary: e.target.value }, true)} /></label>
                  <label><span>Тип расчёта</span><select defaultValue={r.employees?.salary_type || 'monthly'} onBlur={e => updateEmployeeDetails(r, { salary_type: e.target.value }, true)}><option value="monthly">Фикс</option><option value="daily">По дням</option></select></label>
                  <label><span>Дата приёма</span><input type="date" defaultValue={r.employees?.hired_at || ''} onBlur={e => updateEmployeeDetails(r, { hired_at: e.target.value || null })} /></label>
                  <label><span>Дата увольнения</span><input type="date" defaultValue={r.employees?.terminated_at || ''} onBlur={e => updateEmployeeDetails(r, { terminated_at: e.target.value || null, employment_status: e.target.value ? 'terminated' : 'active', is_active: e.target.value ? false : true })} /></label>
                </div>
                <h3>История изменений</h3>
                <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Пользователь</th><th>Изменение</th></tr></thead><tbody>
                  {history.map((h, idx) => <tr key={idx}><td>{h.at}</td><td>{h.user}</td><td>{h.changes.map((c, i) => <div key={i}><b>{c.field}</b>: {String(c.before || '—')} → {String(c.after || '—')}</div>)}</td></tr>)}
                  {!history.length && <tr><td colSpan="3" className="hint">История пока пустая.</td></tr>}
                </tbody></table></div>
                <div className="action-row" style={{marginTop:12}}><button className="ghost small" onClick={() => setEmployeeInfoId('')}>Закрыть карточку</button></div>
              </div></td></tr>}
            </React.Fragment>
          })}{!archiveRows.length && <tr><td colSpan="8" className="hint">Архив пуст.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Журнал выплат зарплаты за выбранный месяц</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Дата выплаты</th><th>Сотрудник</th><th>Способ</th><th>Сумма</th><th>Комментарий</th><th>Статус</th><th></th></tr></thead>
          <tbody>{salaryPayments.slice(0, showAllSalaryPayments ? salaryPayments.length : 5).map(p => {
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
          })}{!salaryPayments.length && <tr><td colSpan="8" className="hint">Выплат за выбранный месяц пока нет.</td></tr>}</tbody>
        </table></div>
        {salaryPayments.length > 5 && <div className="action-row" style={{marginTop:12}}>
          <button className="ghost small" onClick={() => setShowAllSalaryPayments(v => !v)}>
            {showAllSalaryPayments ? 'Свернуть журнал' : `Показать все выплаты (${salaryPayments.length})`}
          </button>
          {!showAllSalaryPayments && <span className="hint">Показаны последние 5 записей.</span>}
        </div>}
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
  const isMonthClosingDay = todayISO() === monthEnd

  async function load() {
    setMessage('')
    const empQ = supabase.from('employees').select('*, branches(name)').order('branch_id').order('position').order('full_name')
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
  const [openingDebtForm, setOpeningDebtForm] = useState({ supplier_id: '', debt_date: todayISO(), amount: '', invoice_notes: '', comment: '' })
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
    if (!paymentForm.supplier_id && suppliers[0]) setPaymentForm(f => ({ ...f, supplier_id: suppliers[0].id }))
    if (!openingDebtForm.supplier_id && suppliers[0]) setOpeningDebtForm(f => ({ ...f, supplier_id: suppliers[0].id }))
    if (!purchaseForm.legal_entity_id && legalEntities[0]) setPurchaseForm(f => ({ ...f, legal_entity_id: legalEntities[0].id }))
    if (!purchaseForm.branch_id && branches[0]) setPurchaseForm(f => ({ ...f, branch_id: branches[0].id }))
  }, [suppliers, legalEntities, branches])

  async function load() {
    const isInternal = Boolean(getInternalSessionStorage()?.rms_internal)

    if (isInternal) {
      const { data: ws, error } = await fetchRmsSuppliersWorkspace()
      if (!error && ws) {
        setLegalEntities(ws.legal_entities || [])
        setSuppliers(ws.suppliers || [])
        setProducts(ws.supplier_products || [])
        setBalances(ws.supplier_balances || [])
        setPurchases(ws.supplier_purchases || [])
        setPayments(ws.supplier_payments || [])
        setProfiles(ws.user_profiles || [])
        return
      }
      setMessage(error?.message || 'Нет доступа к поставщикам')
    }

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
  function productPriceTrend(productId) {
    const rows = []
    ;(purchases || []).forEach(p => {
      ;(p.supplier_purchase_items || []).forEach(i => {
        if (i.product_id === productId) {
          rows.push({
            date: p.purchase_date || p.created_at || '',
            invoice: p.invoice_number || '',
            price: parseNum(i.price_per_base_unit || i.unit_price),
            unit_price: parseNum(i.unit_price),
            total: parseNum(i.total_amount)
          })
        }
      })
    })
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    const current = rows[0]
    const previous = rows[1]
    if (!current) return { label: 'нет закупки', className: 'hint' }
    if (!previous || !previous.price) return { label: `${fmt(current.price)} · первая цена`, className: 'hint' }
    const diff = current.price - previous.price
    const pctChange = previous.price ? diff / previous.price * 100 : 0
    const sign = diff > 0 ? '+' : ''
    return {
      label: `${fmt(current.price)} / ${current.invoice || current.date} · ${sign}${fmt(diff)} (${sign}${pct(pctChange)})`,
      className: diff > 0 ? 'bad' : diff < 0 ? 'good' : 'hint'
    }
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
    const stopProgress = startGlobalProgress('Сохранение товара...')
    const { error } = await supabase.from('supplier_products').insert({ name: productForm.name.trim(), category: productForm.category, base_unit: productForm.base_unit })
    stopProgress()
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
    if (!window.confirm('Удалить поступление? Оно будет зачёркнуто и не будет учитываться в финансах.')) return
    const { data: authData } = await supabase.auth.getUser()
    const { error } = await supabase.from('supplier_purchases').update({
      deleted_at: new Date().toISOString(),
      deleted_by: authData?.user?.id || null
    }).eq('id', id)
    if (error) setMessage(error.message); else { await load(); setMessage(t('saved')) }
  }
  function startPayment(supplierId) { setPaymentForm({ supplier_id: supplierId, payment_date: todayISO(), amount: '', invoice_notes: '', comment: '' }) }
  async function addOpeningDebt() {
    setMessage('')
    if (!openingDebtForm.supplier_id) return setMessage('Выберите поставщика')
    const amount = parseNum(openingDebtForm.amount)
    if (!amount) return setMessage('Введите сумму долга')
    const stopProgress = startGlobalProgress('Добавление стартового долга...')
    try {
      const { error } = await supabase.rpc('rms_add_supplier_opening_debt', {
        p_supplier_id: openingDebtForm.supplier_id,
        p_debt_date: openingDebtForm.debt_date,
        p_amount: amount,
        p_invoice_notes: openingDebtForm.invoice_notes || null,
        p_comment: openingDebtForm.comment || null
      })
      if (error) throw error
      setOpeningDebtForm({ supplier_id: openingDebtForm.supplier_id, debt_date: todayISO(), amount: '', invoice_notes: '', comment: '' })
      await load()
      setMessage('Стартовый долг поставщику добавлен')
    } catch (e) {
      setMessage(e.message)
    } finally {
      stopProgress()
    }
  }

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
      <div className="card span-2 supplier-opening-debt-card">
        <div className="card-head"><div><h3>Долг поставщику за предыдущий период</h3><p className="hint">Используйте при запуске программы с нуля, чтобы перенести старый долг в баланс поставщика.</p></div></div>
        <div className="form-grid compact">
          <label><span>Поставщик</span><select value={openingDebtForm.supplier_id} onChange={e => setOpeningDebtForm({...openingDebtForm, supplier_id: e.target.value})}><option value="">Выберите поставщика</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label><span>Дата долга</span><input type="date" value={openingDebtForm.debt_date} onChange={e => setOpeningDebtForm({...openingDebtForm, debt_date: e.target.value})} /></label>
          <label><span>Сумма долга</span><input inputMode="decimal" value={openingDebtForm.amount} onChange={e => setOpeningDebtForm({...openingDebtForm, amount: e.target.value})} /></label>
          <label><span>Фактура / отметка</span><input value={openingDebtForm.invoice_notes} onChange={e => setOpeningDebtForm({...openingDebtForm, invoice_notes: e.target.value})} /></label>
          <label><span>Комментарий</span><input value={openingDebtForm.comment} onChange={e => setOpeningDebtForm({...openingDebtForm, comment: e.target.value})} /></label>
        </div><button className="small primary" onClick={addOpeningDebt}>+ Добавить долг</button>
      </div>

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
            <p className="hint">Сначала открывается просмотр накладной. Редактирование и удаление доступны внутри накладной.</p>
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
                              <button className="remove" onClick={() => softDeletePurchase(p.id)}>Удалить</button>
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
  const [productSearch, setProductSearch] = useState('')
  const [productSort, setProductSort] = useState('name_asc')
  const [transactionType, setTransactionType] = useState('purchases')
  const [transactionPeriod, setTransactionPeriod] = useState('month')
  const [transactionDate, setTransactionDate] = useState(todayISO())
  const [expandedEntities, setExpandedEntities] = useState({})
  const [detailPurchaseId, setDetailPurchaseId] = useState('')
  const [message, setMessage] = useState('')
  const [ledgerSupplierId, setLedgerSupplierId] = useState('all')
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [ledgerPageSize, setLedgerPageSize] = useState(10)
  const [ledgerPage, setLedgerPage] = useState(1)

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

  const productPriceRows = useMemo(() => {
    const rowsByProduct = new Map()
    filteredPurchases.forEach(p => {
      ;(p.supplier_purchase_items || []).forEach(i => {
        const product = i.supplier_products
        const id = i.product_id || product?.name || i.id
        const purchasePrice = parseNum(i.unit_price)
        if (!id || !purchasePrice) return
        if (!rowsByProduct.has(id)) rowsByProduct.set(id, {
          id,
          name: product?.name || '—',
          category: product?.category || '—',
          unit: i.unit || '',
          purchases: []
        })
        rowsByProduct.get(id).purchases.push({
          date: p.purchase_date,
          createdAt: p.created_at,
          invoice: p.invoice_number || '—',
          price: purchasePrice,
          unit: i.unit || '',
          quantity: parseNum(i.quantity),
          supplier: p.suppliers?.name || '—'
        })
      })
    })
    const q = productSearch.trim().toLowerCase()
    const result = Array.from(rowsByProduct.values()).map(row => {
      const sorted = row.purchases.sort((a,b) => {
        const bd = new Date(b.date || b.createdAt || 0).getTime()
        const ad = new Date(a.date || a.createdAt || 0).getTime()
        if (bd !== ad) return bd - ad
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
      const latest = sorted[0]
      const previous = sorted[1]
      const changeAmount = previous?.price ? latest.price - previous.price : null
      const changePct = previous?.price ? (changeAmount / previous.price) * 100 : null
      return { ...row, latest, previous, changeAmount, changePct }
    }).filter(row => !q || row.name.toLowerCase().includes(q) || row.category.toLowerCase().includes(q))
    result.sort((a,b) => {
      if (productSort === 'name_desc') return b.name.localeCompare(a.name, 'ru')
      if (productSort === 'change_asc') return parseNum(a.changePct) - parseNum(b.changePct)
      if (productSort === 'change_desc') return parseNum(b.changePct) - parseNum(a.changePct)
      if (productSort === 'price_asc') return parseNum(a.latest?.price) - parseNum(b.latest?.price)
      if (productSort === 'price_desc') return parseNum(b.latest?.price) - parseNum(a.latest?.price)
      return a.name.localeCompare(b.name, 'ru')
    })
    return result
  }, [filteredPurchases, productSearch, productSort])

  const normalizedLedgerSearch = String(ledgerSearch || '').trim().toLowerCase()
  const normalizedInvoiceSearch = String(invoiceSearch || '').trim().toLowerCase()
  const searchedSuppliers = suppliers
    .filter(s => {
      const haystack = `${s.name || ''} ${s.voen || ''}`.toLowerCase()
      return !normalizedLedgerSearch || haystack.includes(normalizedLedgerSearch)
    })
    .slice(0, 25)

  const ledgerSupplierIds = new Set(searchedSuppliers.map(s => s.id))
  const ledgerBaseRows = [
    ...purchases.map(p => ({
      id: `p-${p.id}`,
      supplier_id: p.supplier_id,
      suppliers: p.suppliers,
      transaction_date: p.purchase_date,
      invoice: p.invoice_number || '',
      comment: p.invoice_number ? `E-qaimə / фактура ${p.invoice_number}` : 'Поступление',
      debit: parseNum(p.total_amount),
      credit: 0
    })),
    ...payments.map(p => ({
      id: `pay-${p.id}`,
      supplier_id: p.supplier_id,
      suppliers: p.suppliers,
      transaction_date: p.payment_date,
      invoice: p.invoice_notes || '',
      comment: p.comment || p.invoice_notes || 'Оплата',
      debit: 0,
      credit: parseNum(p.amount)
    }))
  ]
    .filter(r => ledgerSupplierId === 'all' || r.supplier_id === ledgerSupplierId)
    .filter(r => !normalizedLedgerSearch || ledgerSupplierIds.has(r.supplier_id) || String(r.suppliers?.name || '').toLowerCase().includes(normalizedLedgerSearch))
    .filter(r => !normalizedInvoiceSearch || String(r.invoice || '').toLowerCase().includes(normalizedInvoiceSearch) || String(r.comment || '').toLowerCase().includes(normalizedInvoiceSearch))
    .sort((a, b) => String(a.transaction_date || '').localeCompare(String(b.transaction_date || '')))

  let runningSupplierBalance = 0
  const supplierLedgerRows = ledgerBaseRows.map(r => {
    runningSupplierBalance += parseNum(r.debit) - parseNum(r.credit)
    return { ...r, balance: runningSupplierBalance }
  })
  const ledgerTotals = supplierLedgerRows.reduce((acc, r) => {
    acc.debit += parseNum(r.debit)
    acc.credit += parseNum(r.credit)
    acc.balance = parseNum(r.balance)
    return acc
  }, { debit: 0, credit: 0, balance: 0 })
  const ledgerTotalPages = Math.max(1, Math.ceil(supplierLedgerRows.length / parseNum(ledgerPageSize || 10)))
  const safeLedgerPage = Math.min(Math.max(1, parseNum(ledgerPage) || 1), ledgerTotalPages)
  const pagedSupplierLedgerRows = supplierLedgerRows.slice((safeLedgerPage - 1) * parseNum(ledgerPageSize || 10), safeLedgerPage * parseNum(ledgerPageSize || 10))
  const ledgerDebtClass = ledgerTotals.balance > 0 ? 'bad' : ledgerTotals.balance < 0 ? 'good' : 'neutral'
  const ledgerDebtText = ledgerTotals.balance > 0 ? 'Долг поставщику' : ledgerTotals.balance < 0 ? 'Поставщик должен нам' : 'Долга нет'

  function printSupplierLedger() {
    const supplierName = ledgerSupplierId === 'all' ? 'Все поставщики' : suppliers.find(s => s.id === ledgerSupplierId)?.name || 'Поставщик'
    const filters = `${normalizedLedgerSearch ? 'Поиск поставщика: ' + ledgerSearch + ' · ' : ''}${normalizedInvoiceSearch ? 'E-qaimə: ' + invoiceSearch : ''}`
    const rowsHtml = supplierLedgerRows.map(r => `<tr><td>${r.transaction_date || ''}</td><td>${r.suppliers?.name || ''}</td><td>${r.invoice || ''}</td><td>${r.comment || ''}</td><td>${fmt(r.debit)}</td><td>${fmt(r.credit)}</td><td>${fmt(r.balance)}</td></tr>`).join('')
    const debtClass = ledgerTotals.balance > 0 ? 'bad' : ledgerTotals.balance < 0 ? 'good' : 'neutral'
    const debtText = ledgerTotals.balance > 0 ? 'Долг поставщику' : ledgerTotals.balance < 0 ? 'Поставщик должен нам' : 'Долга нет'
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Supplier Ledger</title><style>body{font-family:Arial;padding:24px;color:#17251d}h2{margin:0 0 6px}.muted{color:#777;margin-bottom:18px}.summary{display:flex;gap:12px;margin:16px 0}.box{border:1px solid #ddd;border-radius:12px;padding:10px 14px}.box b{display:block;font-size:18px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#f4eddf}.footer-total{margin-top:18px;border-radius:14px;padding:14px 18px;border:1px solid #ddd;background:#f7f7f7;font-size:16px}.footer-total b{font-size:22px}.bad{color:#b91c1c}.good{color:#15803d}.neutral{color:#6b7280}</style></head><body><h2>Баланс поставщика: ${supplierName}</h2><div class="muted">${filters}</div><div class="summary"><div class="box">Приход / долг<b>${fmt(ledgerTotals.debit)}</b></div><div class="box">Оплата<b>${fmt(ledgerTotals.credit)}</b></div><div class="box">Остаток<b>${fmt(ledgerTotals.balance)}</b></div></div><table><thead><tr><th>Дата</th><th>Поставщик</th><th>E-qaimə</th><th>Операция</th><th>Приход / долг</th><th>Оплата</th><th>Остаток</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="footer-total ${debtClass}">${debtText}: <b>${fmt(ledgerTotals.balance)} AZN</b></div></body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

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

      <div className="card span-2 supplier-transactions-panel">
        <div className="card-head"><div><h3>Баланс поставщика</h3><p className="hint">Поиск поставщика, поиск по E-qaimə / фактуре, приход/долг, оплата и остаток.</p></div><button className="small primary" onClick={printSupplierLedger}>PDF/Print</button></div>
        <div className="form-grid compact">
          <label><span>Поиск поставщика</span><input value={ledgerSearch} onChange={e => { setLedgerSearch(e.target.value); setLedgerPage(1) }} placeholder="Название или VOEN" /></label>
          <label><span>Поставщик</span><select value={ledgerSupplierId} onChange={e => { setLedgerSupplierId(e.target.value); setLedgerPage(1) }}><option value="all">Все найденные / все поставщики</option>{searchedSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label><span>Поиск E-qaimə / фактуры</span><input value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setLedgerPage(1) }} placeholder="Номер фактуры" /></label>
        </div>
        <div className="mini-grid">
          <div className="metric"><span>Приход / долг</span><strong>{fmt(ledgerTotals.debit)}</strong></div>
          <div className="metric"><span>Оплата</span><strong>{fmt(ledgerTotals.credit)}</strong></div>
          <div className="metric"><span>Остаток</span><strong className={ledgerDebtClass === 'bad' ? 'bad' : ledgerDebtClass === 'good' ? 'good' : 'hint'}>{fmt(ledgerTotals.balance)}</strong></div>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Поставщик</th><th>E-qaimə</th><th>Операция</th><th>Приход / долг</th><th>Оплата</th><th>Остаток</th></tr></thead><tbody>{pagedSupplierLedgerRows.map(r => <tr key={r.id}><td>{r.transaction_date}</td><td>{r.suppliers?.name || '—'}</td><td>{r.invoice || '—'}</td><td>{r.comment}</td><td>{fmt(r.debit)}</td><td>{fmt(r.credit)}</td><td className={r.balance > 0 ? 'bad' : r.balance < 0 ? 'good' : 'hint'}><b>{fmt(r.balance)}</b></td></tr>)}{!supplierLedgerRows.length && <tr><td colSpan="7" className="hint">Операции не найдены.</td></tr>}</tbody></table></div>
        <div className="action-row" style={{margin:'12px 0'}}>
          <label style={{display:'flex',alignItems:'center',gap:8}}><span className="hint">Показать</span><select value={ledgerPageSize} onChange={e => { setLedgerPageSize(Number(e.target.value)); setLedgerPage(1) }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label>
          <button className="ghost small" disabled={safeLedgerPage <= 1} onClick={() => setLedgerPage(p => Math.max(1, parseNum(p) - 1))}>← Пред.</button>
          <span className="hint">Страница {safeLedgerPage} / {ledgerTotalPages} · всего {supplierLedgerRows.length}</span>
          <button className="ghost small" disabled={safeLedgerPage >= ledgerTotalPages} onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, parseNum(p) + 1))}>След. →</button>
        </div>
        <div className={`hint ${ledgerDebtClass === 'bad' ? 'bad' : ledgerDebtClass === 'good' ? 'good' : ''}`} style={{marginTop:10}}>{ledgerDebtText}: <b>{fmt(ledgerTotals.balance)} AZN</b></div>
      </div>

      {activeSupplierId && <div className="card span-2 supplier-transactions-panel"><div className="card-head"><div><h3>Транзакции: {activeSupplier?.name}</h3><p className="hint">Поступления и оплаты показаны отдельно, чтобы не смешивать операции.</p></div><button className="ghost small" onClick={() => setActiveSupplierId('')}>Закрыть</button></div>
        <div className="form-grid compact"><label><span>Тип операций</span><select value={transactionType} onChange={e => { setTransactionType(e.target.value); setDetailPurchaseId('') }}><option value="purchases">Поступления</option><option value="payments">Оплаты</option><option value="products">Товары / цены</option></select></label><label><span>Период</span><select value={transactionPeriod} onChange={e => setTransactionPeriod(e.target.value)}><option value="day">За день</option><option value="month">За месяц</option><option value="year">За год</option><option value="all">Весь период</option></select></label>{transactionPeriod !== 'all' && <label><span>Дата периода</span><input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} /></label>}</div>
        {transactionType === 'purchases' ? <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Фактура</th><th>Наш VOEN</th><th>Филиал</th><th>Сумма</th><th>Комментарий</th><th></th></tr></thead><tbody>{filteredPurchases.map(p => <React.Fragment key={p.id}><tr><td>{p.purchase_date}</td><td>{p.invoice_number || '—'}</td><td>{p.legal_entities?.name || '—'}<br /><span className="hint">{p.legal_entities?.voen || ''}</span></td><td>{p.branches?.name || '—'}</td><td><strong className="bad">{fmt(p.total_amount)}</strong></td><td>{p.comment || '—'}</td><td><button className="small" onClick={() => setDetailPurchaseId(detailPurchaseId === p.id ? '' : p.id)}>{detailPurchaseId === p.id ? 'Скрыть' : 'Детали'}</button></td></tr>{detailPurchaseId === p.id && <tr><td colSpan="7"><div className="table-wrap"><table><thead><tr><th>Категория</th><th>Товар</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>{(p.supplier_purchase_items || []).map(i => <tr key={i.id}><td>{i.supplier_products?.category || '—'}</td><td>{i.supplier_products?.name || '—'}</td><td>{fmt(i.quantity)}</td><td>{i.unit}</td><td>{fmt(i.unit_price)}</td><td>{fmt(i.total_amount)}</td></tr>)}{!(p.supplier_purchase_items || []).length && <tr><td colSpan="6" className="hint">Товары не найдены</td></tr>}</tbody></table></div></td></tr>}</React.Fragment>)}{!filteredPurchases.length && <tr><td colSpan="7" className="hint">Нет поступлений за выбранный период</td></tr>}</tbody></table></div> : transactionType === 'products' ? <div><div className="form-grid compact" style={{marginTop:12}}><label><span>Поиск товара</span><input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Например: молоко, кофе" /></label><label><span>Сортировка</span><select value={productSort} onChange={e => setProductSort(e.target.value)}><option value="name_asc">Наименование A → Z</option><option value="name_desc">Наименование Z → A</option><option value="change_desc">Изменение цены: рост сверху</option><option value="change_asc">Изменение цены: снижение сверху</option><option value="price_desc">Последняя цена: убывание</option><option value="price_asc">Последняя цена: возрастание</option></select></label></div><div className="table-wrap"><table><thead><tr><th>Тип</th><th>Товар</th><th>Последняя цена закупа</th><th>Предыдущая цена закупа</th><th>Разница</th><th>Изменение</th><th>Последняя закупка</th><th>Фактура</th></tr></thead><tbody>{productPriceRows.map(row => <tr key={row.id}><td>{row.category}</td><td><b>{row.name}</b></td><td>{fmt(row.latest?.price)} / {row.latest?.unit || row.unit}</td><td>{row.previous ? `${fmt(row.previous.price)} / ${row.previous.unit || row.unit}` : '—'}</td><td>{row.changeAmount == null ? <span className="hint">—</span> : <strong className={row.changeAmount > 0 ? 'bad' : row.changeAmount < 0 ? 'good' : ''}>{row.changeAmount > 0 ? '+' : ''}{fmt(row.changeAmount)} AZN</strong>}</td><td>{row.changePct == null ? <span className="hint">—</span> : <strong className={row.changePct > 0 ? 'bad' : row.changePct < 0 ? 'good' : ''}>{row.changePct > 0 ? '+' : ''}{pct(row.changePct)}</strong>}</td><td>{row.latest?.date || '—'}</td><td>{row.latest?.invoice || '—'}</td></tr>)}{!productPriceRows.length && <tr><td colSpan="8" className="hint">Товары не найдены за выбранный период</td></tr>}</tbody></table></div></div> : <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Отметки / фактуры</th><th>Сумма</th><th>Комментарий</th></tr></thead><tbody>{filteredPayments.map(p => <tr key={p.id}><td>{p.payment_date}</td><td>{p.invoice_notes || '—'}</td><td><strong className="good">{fmt(p.amount)}</strong></td><td>{p.comment || '—'}</td></tr>)}{!filteredPayments.length && <tr><td colSpan="4" className="hint">Нет оплат за выбранный период</td></tr>}</tbody></table></div>}
      </div>}

      {!activeSupplierId && <div className="card span-2"><div className="card-head"><div><h3>Последние поступления и оплаты</h3><p className="hint">Последние 10 операций по всем поставщикам.</p></div></div><div className="table-wrap"><table><thead><tr><th>Дата</th><th>Поставщик</th><th>Тип</th><th>Фактура/отметки</th><th>Сумма</th><th>Комментарий</th></tr></thead><tbody>{lastOps.map(r => <tr key={r.id}><td>{r.date}</td><td>{r.supplier}</td><td>{r.type}</td><td>{r.invoice}</td><td className={r.amount >= 0 ? 'bad' : 'good'}>{fmt(Math.abs(r.amount))}</td><td>{r.comment || '—'}</td></tr>)}{!lastOps.length && <tr><td colSpan="6" className="hint">—</td></tr>}</tbody></table></div></div>}
    </section>
  </section>
}



const AIKO_SALES_REPORTS_KEY = 'rms_aiko_sales_reports_v1'
const AIKO_BRANCH_MAP_KEY = 'rms_aiko_branch_map_v1'
const AIKO_HIDDEN_SALES_ITEMS_KEY = 'rms_aiko_hidden_sales_items_v1'
const AIKO_SALES_NAME_ALIASES_KEY = 'rms_aiko_sales_name_aliases_v1'
const AIKO_SALES_REPORTS_CLOUD_TABLE = 'rms_sales_reports'

const readAikoSalesReports = () => readJsonStorage(AIKO_SALES_REPORTS_KEY, []) || []
const writeAikoSalesReports = (reports) => writeJsonStorage(AIKO_SALES_REPORTS_KEY, reports || [])
const readAikoBranchMap = () => readJsonStorage(AIKO_BRANCH_MAP_KEY, {}) || {}
const writeAikoBranchMap = (value) => writeJsonStorage(AIKO_BRANCH_MAP_KEY, value || {})
const readAikoHiddenSalesKeys = () => readJsonStorage(AIKO_HIDDEN_SALES_ITEMS_KEY, []) || []
const writeAikoHiddenSalesKeys = (value) => writeJsonStorage(AIKO_HIDDEN_SALES_ITEMS_KEY, Array.from(new Set(value || [])))
const readAikoSalesNameAliases = () => readJsonStorage(AIKO_SALES_NAME_ALIASES_KEY, {}) || {}
const writeAikoSalesNameAliases = (value) => writeJsonStorage(AIKO_SALES_NAME_ALIASES_KEY, value || {})

function mergeAikoReports(localReports, cloudReports) {
  const map = new Map()
  ;[...(cloudReports || []), ...(localReports || [])].forEach(report => {
    if (!report?.id) return
    map.set(report.id, { ...(map.get(report.id) || {}), ...report })
  })
  return Array.from(map.values()).sort((a, b) => String(b.imported_at || '').localeCompare(String(a.imported_at || '')))
}

async function readAikoSalesReportsCloud() {
  const { data, error } = await supabase
    .from(AIKO_SALES_REPORTS_CLOUD_TABLE)
    .select('id, imported_at, report_json')
    .order('imported_at', { ascending: false })
    .limit(500)
  if (error) return { data: [], error }
  return { data: (data || []).map(r => r.report_json || r).filter(Boolean), error: null }
}

async function writeAikoSalesReportsCloud(reports) {
  const rows = (reports || []).filter(r => r?.id).map(r => ({
    id: r.id,
    imported_at: r.imported_at || new Date().toISOString(),
    source_file: r.source_file || '',
    period_start: r.period_start || null,
    period_end: r.period_end || null,
    branch_id: r.branch_id || null,
    department: r.department || null,
    report_json: r
  }))
  if (!rows.length) return { error: null }
  const { error } = await supabase.from(AIKO_SALES_REPORTS_CLOUD_TABLE).upsert(rows, { onConflict: 'id' })
  return { error }
}

async function deleteAikoSalesReportCloud(id) {
  const { error } = await supabase.from(AIKO_SALES_REPORTS_CLOUD_TABLE).delete().eq('id', id)
  return { error }
}

const normalizeSalesName = (value) => String(value || '').trim().replace(/\s+/g, ' ')
const normalizeSalesKey = (value) => normalizeSalesName(value).toLowerCase()
const resolveSalesNameAlias = (name, aliases = {}) => {
  const key = normalizeSalesKey(name)
  const alias = aliases?.[key]
  if (!alias) return normalizeSalesName(name)
  return normalizeSalesName(typeof alias === 'string' ? alias : alias.name) || normalizeSalesName(name)
}
const parseAikoNumber = (value) => parseNum(String(value || '').replace(/\u00a0/g, ' '))
const AIKO_MODIFIER_PATTERNS = [
  /модификатор/i,
  /modifier/i,
  /^[-+]/,
  /^без\s+/i,
  /^no\s+/i,
  /extra/i,
  /add/i,
  /добав/i,
  /доп\.?\s*/i,
  /сироп/i,
  /альтернативное\s+молоко/i,
  /растительное\s+молоко/i,
  /oat\s+milk/i,
  /almond\s+milk/i,
  /soy\s+milk/i,
  /coconut\s+milk/i,
  /размер/i,
  /порция/i
]

function isAikoModifierRow(name, sourceCategory = '') {
  const n = normalizeSalesName(name)
  const c = normalizeSalesName(sourceCategory)
  if (!n) return true
  const haystack = `${c} ${n}`
  if (AIKO_MODIFIER_PATTERNS.some(rx => rx.test(haystack))) return true
  // Частые AIKO-модификаторы попадают без категории: сахар, лёд, молоко, добавки, прожарка и т.п.
  const compact = haystack.toLowerCase()
  if (/^(sugar|ice|milk|hot|cold)$/i.test(n)) return true
  if (/(сахар|лед|л[её]д|молоко|корица|сливки|прожарка|соус отдельно)/i.test(compact) && parseInt(String(n).length, 10) < 32) return true
  return false
}


const decodeAikoFileName = (value) => String(value || '').replace(/#U([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
const normalizeAikoAlias = (value) => decodeAikoFileName(value)
  .toLowerCase()
  .replace(/ə/g, 'e')
  .replace(/ё/g, 'е')
  .replace(/[^a-zа-я0-9]+/g, '')

const AIKO_DEFAULT_BRANCH_CODES = {
  xeqani: 'B1',
  rb: 'B3',
  ch: 'B4',
  cresent: 'B5',
  nizami: 'B2'
}

const AIKO_BRANCH_PATTERNS = [
  { key: 'xeqani', name: 'Xəqani', defaultBranchCode: 'B1', patterns: ['xeqani', 'xaqani', 'khagani', 'хагани'] },
  { key: 'rb', name: 'R.B', defaultBranchCode: 'B3', patterns: ['rb', 'r.b', 'r b', '28mall', '28 mall'] },
  { key: 'ch', name: 'C.H', defaultBranchCode: 'B4', patterns: ['ch', 'c.h', 'c h'] },
  { key: 'cresent', name: 'Cresent', defaultBranchCode: 'B5', patterns: ['cresent', 'crescent'] },
  { key: 'nizami', name: 'Nizami', defaultBranchCode: 'B2', patterns: ['nizami', 'низами'] }
]

function branchCodeOf(branch) {
  const name = String(branch?.name || '').trim()
  const codeMatch = name.match(/\bB\s*([1-5])\b/i) || name.match(/\bBC\s*([1-5])\b/i)
  return codeMatch ? `B${codeMatch[1]}` : normalizeAikoAlias(name).toUpperCase()
}

function findBranchByCode(branches, code) {
  const expected = String(code || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!expected) return null
  return (branches || []).find(b => branchCodeOf(b).replace(/\s+/g, '') === expected || normalizeAikoAlias(b.name) === normalizeAikoAlias(expected)) || null
}

function resolveDefaultAikoBranch(branches, aikoKey) {
  return findBranchByCode(branches, AIKO_DEFAULT_BRANCH_CODES[aikoKey])
}

function getAikoBranchToken(text, fileName = '') {
  const decodedFile = decodeAikoFileName(fileName)
  const warehouseLine = String(text || '').replace(/\u00a0/g, ' ').split(/\r?\n/).find(l => /^\s*Склад\(ы\):/i.test(l)) || ''
  const source = `${decodedFile} ${warehouseLine}`
  const normalized = normalizeAikoAlias(source)
  const direct = AIKO_BRANCH_PATTERNS.find(item => item.patterns.some(pattern => normalized.includes(normalizeAikoAlias(pattern))))
  if (direct) return { key: direct.key, name: direct.name }

  let guessed = decodedFile
    .replace(/отчет\s*о\s*продажах/gi, '')
    .replace(/report\s*of\s*sales/gi, '')
    .replace(/\b(bar|kitchen|кухня|бар)\b/gi, '')
    .replace(/\.pdf|\.txt|\.csv/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!guessed && warehouseLine) guessed = warehouseLine.replace(/^\s*Склад\(ы\):\s*/i, '').trim()
  const key = normalizeAikoAlias(guessed)
  return key ? { key, name: guessed || key } : { key: '', name: '' }
}

function findBranchById(branches, id) {
  return (branches || []).find(b => String(b.id) === String(id)) || null
}

function inferAikoDepartment(text, fileName = '') {
  const decodedFile = decodeAikoFileName(fileName || '').toLowerCase()
  const value = decodeAikoFileName(`${text || ''} ${fileName || ''}`).toLowerCase()
  // Важно: сначала Kitchen, потому что в PDF могут встречаться слова bar в служебных строках.
  if (/kitchen|kuxna|кухн/.test(decodedFile) || /kitchen|kuxna|кухн/.test(value)) return 'Кухня'
  if (/bar|бар/.test(decodedFile) || /bar|бар/.test(value)) return 'Бар'
  return 'Смешанный'
}

function inferAikoMenuCategory(row, department) {
  const sourceCategory = String(row?.source_category || '').toLowerCase()
  const name = String(row?.name || '').toLowerCase()
  if (department === 'Бар' || sourceCategory.includes('бар') || sourceCategory.includes('чай')) {
    if (sourceCategory.includes('чай') || name.includes('tea') || name.includes('coffee') || name.includes('espresso') || name.includes('cappuccino') || name.includes('latte') || name.includes('americano') || name.includes('raf')) return 'Кофе'
    return 'Напитки'
  }
  if (name.includes('burger') || name.includes('sandwich') || name.includes('toast') || name.includes('bagel')) return 'Бургеры / Сэндвичи'
  if (name.includes('pizza') || name.includes('pasta')) return name.includes('pasta') ? 'Паста' : 'Основные блюда'
  if (name.includes('salad')) return 'Салаты'
  if (name.includes('cake') || name.includes('cheesecake') || name.includes('fondant') || name.includes('dessert') || name.includes('eclair')) return 'Десерты'
  if (name.includes('croissant') || name.includes('pancake') || name.includes('syrniki') || name.includes('omelette') || name.includes('breakfast') || name.includes('oatmeal') || name.includes('granola')) return 'Завтраки'
  return department === 'Кухня' ? 'Основные блюда' : 'Прочее'
}

function guessAikoBranch(text, fileName, branches, branchMap = {}) {
  const token = getAikoBranchToken(text, fileName)
  const mappedBranch = token.key ? findBranchById(branches, branchMap[token.key]) : null
  if (mappedBranch) return mappedBranch
  const defaultMappedBranch = token.key ? resolveDefaultAikoBranch(branches, token.key) : null
  if (defaultMappedBranch) return defaultMappedBranch

  const source = decodeAikoFileName(`${text || ''} ${fileName || ''}`).toLowerCase()
  const clean = (v) => String(v || '').toLowerCase().replace(/ə/g, 'e').replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim()
  const sourceClean = clean(source)
  const direct = (branches || []).find(b => {
    const name = clean(b.name)
    if (!name) return false
    const compactName = normalizeAikoAlias(name)
    if (sourceClean.includes(name) || normalizeAikoAlias(sourceClean).includes(compactName)) return true
    return name.split(' ').filter(Boolean).some(part => part.length >= 3 && sourceClean.includes(part))
  })
  if (direct) return direct
  return null
}

function parseAikoSalesText(text, meta = {}) {
  const lines = String(text || '').replace(/\u00a0/g, ' ').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const firstLine = lines.find(l => /Отчет о продажах/i.test(l)) || ''
  const periodMatch = firstLine.match(/с\s*(\d{2}\.\d{2}\.\d{4})\s*по\s*(\d{2}\.\d{2}\.\d{4})/i) || String(text || '').match(/За период:\s*с\s*(\d{2}\.\d{2}\.\d{4})\s*по\s*(\d{2}\.\d{2}\.\d{4})/i)
  const toIso = (d) => d ? d.split('.').reverse().join('-') : ''
  const warehouseLine = lines.find(l => /^Склад\(ы\):/i.test(l)) || ''
  const warehouse = warehouseLine.replace(/^Склад\(ы\):\s*/i, '').trim()
  const aikoBranch = meta.aiko_branch || getAikoBranchToken(`${warehouse}\n${text}`, meta.fileName)
  const department = meta.department || inferAikoDepartment(`${warehouse}\n${text}`, meta.fileName)
  let currentCategory = department
  const rows = []
  const rowRegex = /^(.+?)\s+(-?[\d\s]+,\d{3})\s+(-?[\d\s]+,\d{2})\s+(-?[\d\s]+,\d{2})\s+(-?[\d\s]+,\d{2})$/

  for (const line of lines) {
    const categoryMatch = line.match(/^Категория:\s*(.+)$/i)
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim()
      continue
    }
    if (/^(Итого|Всего):/i.test(line) || line.includes('Элемент номенклатуры') || line.includes('Выручка, manat')) continue
    const match = line.match(rowRegex)
    if (!match) continue
    const name = normalizeSalesName(match[1])
    if (!name || /^(итого|категория|отчет)/i.test(name)) continue
    if (isAikoModifierRow(name, currentCategory)) continue
    const qty = parseAikoNumber(match[2])
    const revenue = parseAikoNumber(match[3])
    const cost = parseAikoNumber(match[4])
    const avgPrice = parseAikoNumber(match[5])
    rows.push({
      id: `${Date.now()}-${rows.length}-${Math.random().toString(16).slice(2)}`,
      name,
      quantity: qty,
      revenue,
      cost,
      avg_price: avgPrice,
      source_category: currentCategory,
      department,
      menu_category: inferAikoMenuCategory({ name, source_category: currentCategory }, department)
    })
  }

  return {
    id: `aiko-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source_file: meta.fileName || 'AIKO report',
    imported_at: new Date().toISOString(),
    period_start: toIso(periodMatch?.[1]) || meta.period_start || '',
    period_end: toIso(periodMatch?.[2]) || meta.period_end || '',
    warehouse,
    department,
    aiko_branch_key: aikoBranch.key || '',
    aiko_branch_name: aikoBranch.name || '',
    branch_id: meta.branch_id || '',
    branch_name: meta.branch_name || '',
    rows,
    totals: rows.reduce((acc, r) => {
      acc.quantity += parseNum(r.quantity)
      acc.revenue += parseNum(r.revenue)
      acc.cost += parseNum(r.cost)
      return acc
    }, { quantity: 0, revenue: 0, cost: 0 })
  }
}

function aggregateSalesRows(reports, options = {}) {
  const includeBranch = options.includeBranch !== false
  const hiddenKeys = new Set(options.hiddenKeys || [])
  const recipeCostMap = options.recipeCostMap || {}
  const aliases = options.aliases || {}
  const map = new Map()
  ;(reports || []).forEach(report => {
    ;(report.rows || []).forEach(row => {
      const originalKey = normalizeSalesKey(row.name)
      const displayName = resolveSalesNameAlias(row.name, aliases)
      const itemKey = normalizeSalesKey(displayName)
      if (!itemKey || hiddenKeys.has(originalKey) || hiddenKeys.has(itemKey)) return
      const dept = row.department || report.department || ''
      const branchKey = includeBranch ? (report.branch_id || report.branch_name || '') : 'all'
      const key = `${itemKey}|${branchKey}|${dept}`
      const recipeUnitCostRaw = recipeCostMap[itemKey]
      const unitCost = Number.isFinite(Number(recipeUnitCostRaw)) ? parseNum(recipeUnitCostRaw) : 0
      const cost = parseNum(row.quantity) * unitCost
      const existing = map.get(key) || {
        name: displayName,
        original_names: new Set(),
        branch_id: includeBranch ? (report.branch_id || '') : '',
        branch_name: includeBranch ? (report.branch_name || '') : '',
        department: dept,
        source_category: row.source_category || '',
        menu_category: row.menu_category || 'Прочее',
        quantity: 0,
        revenue: 0,
        cost: 0
      }
      existing.original_names.add(normalizeSalesName(row.name))
      existing.quantity += parseNum(row.quantity)
      existing.revenue += parseNum(row.revenue)
      existing.cost += cost
      map.set(key, existing)
    })
  })
  return Array.from(map.values()).map(row => ({
    ...row,
    original_names: Array.from(row.original_names || []),
    margin: row.revenue ? ((row.revenue - row.cost) / row.revenue) * 100 : 0,
    profit: row.revenue - row.cost,
    avg_price: row.quantity ? row.revenue / row.quantity : 0
  }))
}
async function extractPdfTextWithPdfJs(file) {
  const pdfjsLib = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs'
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const allLines = []
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo)
    const content = await page.getTextContent()
    const groups = new Map()
    ;(content.items || []).forEach(item => {
      const y = Math.round((item.transform?.[5] || 0) / 3) * 3
      const x = item.transform?.[4] || 0
      const arr = groups.get(y) || []
      arr.push({ x, text: item.str || '' })
      groups.set(y, arr)
    })
    Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        const line = items.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()
        if (line) allLines.push(line)
      })
  }
  return allLines.join('\n')
}

async function explodeZipFile(file) {
  const mod = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')
  const JSZip = mod.default || mod
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const files = []
  const entries = Object.values(zip.files || {})
  for (const entry of entries) {
    if (entry.dir) continue
    if (!/\.(pdf|txt|csv)$/i.test(entry.name)) continue
    const blob = await entry.async('blob')
    files.push(new File([blob], entry.name, { type: entry.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain' }))
  }
  return files
}

function Reports({ t }) {
  const branches = useBranches()
  const [reports, setReports] = useState(() => readAikoSalesReports())
  const [branchMap, setBranchMap] = useState(() => readAikoBranchMap())
  const [reportsTab, setReportsTab] = useState('sales')
  const [branchFilter, setBranchFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [salesSort, setSalesSort] = useState({ field: 'revenue', dir: 'desc' })
  const [importBranchId, setImportBranchId] = useState('auto')
  const [importText, setImportText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [expandedSalesRows, setExpandedSalesRows] = useState(false)
  const [expandedReportsTable, setExpandedReportsTable] = useState(false)
  const [expandedAiTables, setExpandedAiTables] = useState({})
  const [aiTopLimit, setAiTopLimit] = useState(10)
  const [aiOutsiderLimit, setAiOutsiderLimit] = useState(10)
  const [salesAiQuery, setSalesAiQuery] = useState('')
  const [hiddenSalesKeys, setHiddenSalesKeys] = useState(() => readAikoHiddenSalesKeys())
  const [salesNameAliases, setSalesNameAliases] = useState(() => readAikoSalesNameAliases())
  const [showHiddenSalesItems, setShowHiddenSalesItems] = useState(false)
  const [recipeCostMap, setRecipeCostMap] = useState({})
  const [cloudSyncStatus, setCloudSyncStatus] = useState('')

  useEffect(() => { writeAikoSalesReports(reports) }, [reports])
  useEffect(() => { writeAikoBranchMap(branchMap) }, [branchMap])
  useEffect(() => {
    writeAikoHiddenSalesKeys(hiddenSalesKeys)
    writeRmsAppSetting(RMS_HIDDEN_SALES_KEYS_SETTING, Array.from(new Set(hiddenSalesKeys || [])))
  }, [hiddenSalesKeys])

  useEffect(() => {
    writeAikoSalesNameAliases(salesNameAliases)
    writeRmsAppSetting(RMS_SALES_NAME_ALIASES_SETTING, salesNameAliases || {})
  }, [salesNameAliases])

  useEffect(() => {
    let cancelled = false
    async function loadSalesAliasesCloud() {
      const cloudAliases = await readRmsAppSetting(RMS_SALES_NAME_ALIASES_SETTING, {})
      if (cancelled || !cloudAliases || typeof cloudAliases !== 'object') return
      setSalesNameAliases(prev => ({ ...(cloudAliases || {}), ...(prev || {}) }))
    }
    loadSalesAliasesCloud()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadHiddenKeysCloud() {
      const cloudKeys = await readRmsAppSetting(RMS_HIDDEN_SALES_KEYS_SETTING, [])
      if (cancelled || !Array.isArray(cloudKeys) || !cloudKeys.length) return
      setHiddenSalesKeys(prev => Array.from(new Set([...(prev || []), ...cloudKeys])))
    }
    loadHiddenKeysCloud()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadCloudReports() {
      const { data, error } = await readAikoSalesReportsCloud()
      if (cancelled) return
      if (error) {
        setCloudSyncStatus('Внимание: таблица rms_sales_reports в Supabase не найдена/недоступна. Отчёты временно хранятся только в браузере и могут пропасть при открытии нового Vercel preview-домена. Для постоянного хранения создайте таблицу rms_sales_reports.')
        return
      }
      if (data?.length) {
        setReports(prev => mergeAikoReports(prev, data))
        setCloudSyncStatus('Отчёты синхронизированы с Supabase')
      } else if (reports.length) {
        const saved = await writeAikoSalesReportsCloud(reports)
        if (!saved.error && !cancelled) setCloudSyncStatus('Локальные отчёты отправлены в Supabase')
      }
    }
    loadCloudReports()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    async function loadRecipeCosts() {
      try {
        let menuItems = []
        let recipeRows = []
        let costs = []
        const workspace = await fetchRmsRecipesWorkspace()
        if (workspace.data) {
          menuItems = workspace.data.menu_items || []
          recipeRows = workspace.data.recipe_items || []
          costs = workspace.data.latest_product_costs || []
        } else {
          const [{ data: items }, { data: rows }, { data: latest }] = await Promise.all([
            supabase.from('menu_items').select('id,name').eq('is_active', true),
            supabase.from('recipe_items').select('menu_item_id,product_id,quantity,waste_percent'),
            supabase.from('latest_product_costs').select('product_id,price_per_base_unit')
          ])
          menuItems = items || []
          recipeRows = rows || []
          costs = latest || []
        }
        const costByProduct = new Map((costs || []).map(c => [String(c.product_id), parseNum(c.price_per_base_unit)]))
        const map = {}
        ;(menuItems || []).forEach(item => {
          const recipeCost = (recipeRows || [])
            .filter(row => String(row.menu_item_id) === String(item.id))
            .reduce((sum, row) => sum + parseNum(row.quantity) * parseNum(costByProduct.get(String(row.product_id))) * (1 + parseNum(row.waste_percent) / 100), 0)
          map[normalizeSalesKey(item.name)] = recipeCost > 0 ? recipeCost : 0
        })
        Object.entries(salesNameAliases || {}).forEach(([oldKey, canonicalName]) => {
          const targetKey = normalizeSalesKey(canonicalName)
          if (targetKey && Object.prototype.hasOwnProperty.call(map, targetKey)) map[oldKey] = map[targetKey]
        })
        setRecipeCostMap(map)
      } catch (_e) {
        setRecipeCostMap({})
      }
    }
    loadRecipeCosts()
  }, [salesNameAliases])

  useEffect(() => {
    if (!branches.length) return
    const nextMap = { ...(branchMap || {}) }
    let changed = false
    Object.entries(AIKO_DEFAULT_BRANCH_CODES).forEach(([aikoKey, code]) => {
      if (nextMap[aikoKey]) return
      const branch = findBranchByCode(branches, code)
      if (!branch) return
      nextMap[aikoKey] = branch.id
      changed = true
    })
    if (changed) setBranchMap(nextMap)
  }, [branches])

  useEffect(() => {
    if (!branches.length || !reports.length) return
    let changed = false
    const nextReports = reports.map(report => {
      const token = reportAikoToken(report)
      const branch = token.key ? findBranchById(branches, branchMap[token.key]) || resolveDefaultAikoBranch(branches, token.key) : null
      const correctedDept = inferAikoDepartment(`${report.warehouse || ''} ${report.source_file || ''}`, report.source_file || '')
      const deptChanged = correctedDept !== 'Смешанный' && correctedDept !== report.department
      if (!branch && !deptChanged && report.branch_id) return report
      if (!branch && !deptChanged) return report
      changed = true
      const nextRows = deptChanged ? (report.rows || []).map(row => ({ ...row, department: correctedDept, menu_category: inferAikoMenuCategory(row, correctedDept) })) : (report.rows || [])
      return {
        ...report,
        branch_id: branch?.id || report.branch_id || '',
        branch_name: branch?.name || report.branch_name || '',
        aiko_branch_key: token.key || report.aiko_branch_key || '',
        aiko_branch_name: token.name || report.aiko_branch_name || '',
        department: deptChanged ? correctedDept : report.department,
        rows: nextRows
      }
    })
    if (changed) saveReports(nextReports)
  }, [branches, branchMap])

  const reportMonthValue = (report) => String(report?.period_start || report?.period_end || '').slice(0, 7) || 'unknown'
  const monthOptions = useMemo(() => {
    const map = new Map()
    ;(reports || []).forEach(r => {
      const key = reportMonthValue(r)
      if (!key || key === 'unknown') return
      map.set(key, key)
    })
    return Array.from(map.keys()).sort().reverse()
  }, [reports])

  const filteredReports = useMemo(() => reports.filter(r => {
    const branchOk = branchFilter === 'all' || String(r.branch_id || r.branch_name) === String(branchFilter)
    const deptOk = departmentFilter === 'all' || r.department === departmentFilter
    const monthOk = monthFilter === 'all' || reportMonthValue(r) === monthFilter
    return branchOk && deptOk && monthOk
  }), [reports, branchFilter, departmentFilter, monthFilter])

  const isNetworkSalesView = branchFilter === 'all'
  const rows = useMemo(() => aggregateSalesRows(filteredReports, { includeBranch: !isNetworkSalesView, hiddenKeys: hiddenSalesKeys, recipeCostMap, aliases: salesNameAliases }), [filteredReports, isNetworkSalesView, hiddenSalesKeys, recipeCostMap, salesNameAliases])
  const totals = useMemo(() => rows.reduce((acc, r) => {
    acc.quantity += parseNum(r.quantity)
    acc.revenue += parseNum(r.revenue)
    acc.cost += parseNum(r.cost)
    acc.profit += parseNum(r.profit)
    return acc
  }, { quantity: 0, revenue: 0, cost: 0, profit: 0 }), [rows])

  const previousMonthKey = (value) => {
    if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return ''
    const [year, month] = String(value).split('-').map(Number)
    const d = new Date(year, month - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const previousMonthRows = useMemo(() => {
    if (monthFilter === 'all') return []
    const prevMonth = previousMonthKey(monthFilter)
    if (!prevMonth) return []
    const prevReports = reports.filter(r => {
      const branchOk = branchFilter === 'all' || String(r.branch_id || r.branch_name) === String(branchFilter)
      const deptOk = departmentFilter === 'all' || r.department === departmentFilter
      return branchOk && deptOk && reportMonthValue(r) === prevMonth
    })
    return aggregateSalesRows(prevReports, { includeBranch: !isNetworkSalesView, hiddenKeys: hiddenSalesKeys, recipeCostMap, aliases: salesNameAliases })
  }, [reports, monthFilter, branchFilter, departmentFilter, isNetworkSalesView, hiddenSalesKeys, recipeCostMap, salesNameAliases])

  const previousMonthTotals = useMemo(() => previousMonthRows.reduce((acc, r) => {
    acc.quantity += parseNum(r.quantity)
    acc.revenue += parseNum(r.revenue)
    acc.cost += parseNum(r.cost)
    acc.profit += parseNum(r.profit)
    return acc
  }, { quantity: 0, revenue: 0, cost: 0, profit: 0 }), [previousMonthRows])

  const changePct = (current, previous) => parseNum(previous) > 0 ? ((parseNum(current) - parseNum(previous)) / parseNum(previous)) * 100 : null
  const formatChangePct = (current, previous) => {
    const value = changePct(current, previous)
    if (value === null) return '—'
    return `${value >= 0 ? '+' : ''}${pct(value)}`
  }
  const changeClass = (current, previous) => {
    const value = changePct(current, previous)
    if (value === null) return ''
    return value >= 0 ? 'good' : 'bad'
  }

  const previousRowsByName = useMemo(() => {
    const map = new Map()
    previousMonthRows.forEach(r => {
      const branchPart = isNetworkSalesView ? 'all' : (r.branch_id || r.branch_name || '')
      const deptPart = r.department || ''
      const keys = new Set([normalizeSalesKey(r.name), ...(r.original_names || []).map(normalizeSalesKey)])
      keys.forEach(nameKey => {
        if (nameKey) map.set(`${nameKey}|${deptPart}|${branchPart}`, r)
      })
    })
    return map
  }, [previousMonthRows, isNetworkSalesView])

  const salesRowChange = (row, field = 'revenue') => {
    if (monthFilter === 'all') return null
    const key = `${normalizeSalesKey(row.name)}|${row.department || ''}|${isNetworkSalesView ? 'all' : (row.branch_id || row.branch_name || '')}`
    const prev = previousRowsByName.get(key)
    return changePct(row[field], prev?.[field])
  }

  const renderRowChange = (row, field = 'revenue') => {
    const value = salesRowChange(row, field)
    if (value === null) return <span className="hint">—</span>
    return <span className={value >= 0 ? 'good' : 'bad'}>{value >= 0 ? '+' : ''}{pct(value)}</span>
  }

  const departmentTotals = useMemo(() => {
    const base = { Бар: { quantity: 0, revenue: 0, cost: 0, profit: 0 }, Кухня: { quantity: 0, revenue: 0, cost: 0, profit: 0 } }
    rows.forEach(r => {
      const dept = r.department === 'Кухня' ? 'Кухня' : r.department === 'Бар' ? 'Бар' : ''
      if (!dept) return
      base[dept].quantity += parseNum(r.quantity)
      base[dept].revenue += parseNum(r.revenue)
      base[dept].cost += parseNum(r.cost)
      base[dept].profit += parseNum(r.profit)
    })
    return base
  }, [rows])

  const sortRowsByField = (list, sort) => [...(list || [])].sort((a, b) => {
    const field = sort.field || 'revenue'
    const dir = sort.dir === 'asc' ? 1 : -1
    const av = parseNum(field === 'margin' ? a.margin : a[field])
    const bv = parseNum(field === 'margin' ? b.margin : b[field])
    return (av - bv) * dir
  })
  const sortedSalesRows = useMemo(() => sortRowsByField(rows, salesSort), [rows, salesSort])
  const visibleSalesRows = expandedSalesRows ? sortedSalesRows : sortedSalesRows.slice(0, 10)
  const visibleReports = expandedReportsTable ? reports : reports.slice(0, 10)

  const ai = useMemo(() => {
    const withRevenue = rows.filter(r => parseNum(r.revenue) > 0)
    const withCost = withRevenue.filter(r => parseNum(r.cost) > 0)
    return {
      topSales: [...withRevenue].sort((a, b) => parseNum(b.revenue) - parseNum(a.revenue)),
      topQty: [...withRevenue].sort((a, b) => parseNum(b.quantity) - parseNum(a.quantity)),
      outsiders: [...withRevenue].sort((a, b) => parseNum(a.quantity) - parseNum(b.quantity) || parseNum(a.revenue) - parseNum(b.revenue)),
      highMargin: [...withCost].sort((a, b) => parseNum(b.margin) - parseNum(a.margin) || parseNum(b.revenue) - parseNum(a.revenue)),
      lowMargin: [...withRevenue].sort((a, b) => parseNum(a.margin) - parseNum(b.margin))
    }
  }, [rows])

  function saveReports(next) {
    setReports(next)
    writeAikoSalesReports(next)
    writeAikoSalesReportsCloud(next).then(({ error }) => {
      if (!error) setCloudSyncStatus('Отчёты сохранены в Supabase')
    }).catch(() => {})
  }

  async function textFromFile(file) {
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') return extractPdfTextWithPdfJs(file)
    return file.text()
  }

  async function importParsedReports(parsedReports) {
    const cleaned = parsedReports.map(r => {
      const rows = (r.rows || []).filter(row => {
        const originalKey = normalizeSalesKey(row.name)
        const canonicalKey = normalizeSalesKey(resolveSalesNameAlias(row.name, salesNameAliases))
        return !isAikoModifierRow(row.name, row.source_category) && !hiddenSalesKeys.includes(originalKey) && !hiddenSalesKeys.includes(canonicalKey)
      })
      const totals = rows.reduce((acc, row) => {
        acc.quantity += parseNum(row.quantity)
        acc.revenue += parseNum(row.revenue)
        acc.cost += parseNum(row.cost)
        return acc
      }, { quantity: 0, revenue: 0, cost: 0 })
      return { ...r, rows, totals }
    })
    const valid = cleaned.filter(r => (r.rows || []).length)
    if (!valid.length) return setMessage('Не удалось найти строки продаж без модификаторов. Проверьте PDF или вставьте текст отчёта AIKO вручную.')
    const next = [...valid, ...reports].slice(0, 120)
    saveReports(next)
    const allRows = valid.flatMap(r => r.rows || [])
    const created = await syncMenuItemsFromSalesRows(allRows)
    const withoutBranch = valid.filter(r => !r.branch_id).length
    const branchHint = withoutBranch ? ` Не распределено по филиалам: ${withoutBranch}. Проверьте подменю “Импорт”.` : ''
    setMessage(`Импортировано отчётов: ${valid.length}. Строк продаж без модификаторов: ${allRows.length}. В техкарты добавлено новых позиций меню: ${created}.${branchHint}`)
  }

  async function syncMenuItemsFromSalesRows(salesRows) {
    const unique = []
    const seen = new Set()
    ;(salesRows || []).forEach(row => {
      if (isAikoModifierRow(row.name, row.source_category) || hiddenSalesKeys.includes(normalizeSalesKey(row.name))) return
      const canonicalName = resolveSalesNameAlias(row.name, salesNameAliases)
      const key = normalizeSalesKey(canonicalName)
      if (!key || seen.has(key)) return
      seen.add(key)
      unique.push({ ...row, name: canonicalName })
    })
    if (!unique.length) return 0
    const { data: existing, error: existingError } = await supabase.from('menu_items').select('id,name')
    if (existingError) {
      setMessage(existingError.message)
      return 0
    }
    const existingNames = new Set((existing || []).map(i => normalizeSalesKey(i.name)))
    const toInsert = unique
      .filter(row => !existingNames.has(normalizeSalesKey(row.name)))
      .map(row => ({
        name: row.name,
        category: row.menu_category || inferAikoMenuCategory(row, row.department),
        sale_price: parseNum(row.avg_price),
        target_food_cost_percent: 30,
        is_active: true
      }))
    if (!toInsert.length) return 0
    const { error } = await supabase.from('menu_items').insert(toInsert)
    if (error) {
      setMessage(error.message)
      return 0
    }
    return toInsert.length
  }

  async function handleFiles(filesLike) {
    const files = Array.from(filesLike || [])
    if (!files.length) return
    setBusy(true)
    setMessage('')
    try {
      const expandedFiles = []
      for (const file of files) {
        if (/\.zip$/i.test(file.name)) expandedFiles.push(...await explodeZipFile(file))
        else expandedFiles.push(file)
      }
      const parsed = []
      for (const file of expandedFiles) {
        const text = await textFromFile(file)
        const aikoBranch = getAikoBranchToken(text, file.name)
        const guessedBranch = guessAikoBranch(text, file.name, branches, branchMap)
        const selectedBranch = importBranchId !== 'auto' ? branches.find(b => String(b.id) === String(importBranchId)) : guessedBranch
        const department = inferAikoDepartment(text, file.name)
        const report = parseAikoSalesText(text, {
          fileName: decodeAikoFileName(file.name),
          aiko_branch: aikoBranch,
          department,
          branch_id: selectedBranch?.id || '',
          branch_name: selectedBranch?.name || ''
        })
        parsed.push(report)
      }
      await importParsedReports(parsed)
    } catch (e) {
      setMessage(e?.message || 'Ошибка импорта отчёта')
    } finally {
      setBusy(false)
    }
  }

  async function importFromText() {
    if (!importText.trim()) return setMessage('Вставьте текст отчёта AIKO')
    setBusy(true)
    setMessage('')
    try {
      const aikoBranch = getAikoBranchToken(importText, 'manual text')
      const guessedBranch = guessAikoBranch(importText, 'manual text', branches, branchMap)
      const selectedBranch = importBranchId !== 'auto' ? branches.find(b => String(b.id) === String(importBranchId)) : guessedBranch
      await importParsedReports([parseAikoSalesText(importText, {
        fileName: 'Вставленный текст AIKO',
        aiko_branch: aikoBranch,
        department: inferAikoDepartment(importText, 'manual text'),
        branch_id: selectedBranch?.id || '',
        branch_name: selectedBranch?.name || ''
      })])
      setImportText('')
    } catch (e) {
      setMessage(e?.message || 'Ошибка импорта текста')
    } finally {
      setBusy(false)
    }
  }

  function removeReport(id) {
    const report = reports.find(r => r.id === id)
    if (!report) return
    if (!window.confirm(`Удалить импорт “${report.source_file}”?`)) return
    saveReports(reports.filter(r => r.id !== id))
    deleteAikoSalesReportCloud(id).catch(() => {})
    setMessage('Импорт удалён')
  }

  function clearReports() {
    if (!window.confirm('Очистить все импортированные отчёты продаж AIKO в этом браузере?')) return
    reports.forEach(r => deleteAikoSalesReportCloud(r.id).catch(() => {}))
    saveReports([])
    setMessage('Отчёты очищены')
  }

  function reportAikoToken(report) {
    if (report?.aiko_branch_key) return { key: report.aiko_branch_key, name: report.aiko_branch_name || report.aiko_branch_key }
    return getAikoBranchToken(`${report?.warehouse || ''}`, report?.source_file || '')
  }

  const detectedAikoBranches = useMemo(() => {
    const map = new Map()
    ;(reports || []).forEach(report => {
      const token = reportAikoToken(report)
      if (!token.key) return
      if (!map.has(token.key)) map.set(token.key, { ...token, count: 0 })
      map.get(token.key).count += 1
    })
    return Array.from(map.values())
  }, [reports])

  function setAikoBranchMapping(aikoKey, branchId) {
    const nextMap = { ...(branchMap || {}), [aikoKey]: branchId || '' }
    if (!branchId) delete nextMap[aikoKey]
    setBranchMap(nextMap)
    const branch = findBranchById(branches, branchId)
    const nextReports = reports.map(report => {
      const token = reportAikoToken(report)
      if (token.key !== aikoKey) return report
      return {
        ...report,
        aiko_branch_key: token.key,
        aiko_branch_name: token.name,
        branch_id: branch?.id || '',
        branch_name: branch?.name || ''
      }
    })
    saveReports(nextReports)
    setMessage(branch ? `AIKO ${aikoKey} привязан к филиалу ${branch.name}` : `Привязка AIKO ${aikoKey} очищена`)
  }

  function updateReportBranch(reportId, branchId, applyToSameAikoBranch = false) {
    const report = reports.find(r => r.id === reportId)
    const branch = findBranchById(branches, branchId)
    const token = reportAikoToken(report)
    let nextMap = branchMap
    if (applyToSameAikoBranch && token.key) {
      nextMap = { ...(branchMap || {}), [token.key]: branch?.id || '' }
      if (!branch?.id) delete nextMap[token.key]
      setBranchMap(nextMap)
    }
    const nextReports = reports.map(r => {
      const rToken = reportAikoToken(r)
      const shouldUpdate = r.id === reportId || (applyToSameAikoBranch && token.key && rToken.key === token.key)
      if (!shouldUpdate) return r
      return {
        ...r,
        aiko_branch_key: rToken.key || r.aiko_branch_key || '',
        aiko_branch_name: rToken.name || r.aiko_branch_name || '',
        branch_id: branch?.id || '',
        branch_name: branch?.name || ''
      }
    })
    saveReports(nextReports)
    setMessage(applyToSameAikoBranch && token.key ? `Филиал обновлён для всех отчётов ${token.name || token.key}` : 'Филиал отчёта обновлён')
  }

  function applySavedBranchMappings() {
    const nextReports = reports.map(report => {
      const token = reportAikoToken(report)
      const branch = token.key ? findBranchById(branches, branchMap[token.key]) || resolveDefaultAikoBranch(branches, token.key) : null
      const department = inferAikoDepartment(`${report.warehouse || ''} ${report.source_file || ''}`, report.source_file || '')
      const nextRows = department !== 'Смешанный' ? (report.rows || []).map(row => ({ ...row, department, menu_category: inferAikoMenuCategory(row, department) })) : (report.rows || [])
      if (!branch && department === 'Смешанный') return report
      return { ...report, aiko_branch_key: token.key, aiko_branch_name: token.name, branch_id: branch?.id || report.branch_id || '', branch_name: branch?.name || report.branch_name || '', department: department !== 'Смешанный' ? department : report.department, rows: nextRows }
    })
    saveReports(nextReports)
    setMessage('Сопоставления AIKO и типы Бар/Кухня применены к импортированным отчётам')
  }

  function hideSalesItem(name) {
    const key = normalizeSalesKey(name)
    if (!key) return
    setHiddenSalesKeys(prev => Array.from(new Set([...(prev || []), key])))
    setMessage(`Позиция “${name}” скрыта из отчётов и не будет показываться при следующих импортах`)
  }

  async function renameSalesItem(name) {
    const currentName = resolveSalesNameAlias(name, salesNameAliases)
    const nextName = normalizeSalesName(window.prompt('Новое название блюда / напитка для отчётов и техкарт:', currentName) || '')
    if (!nextName || nextName === currentName) return
    const sourceNames = new Set([normalizeSalesName(name), currentName])
    ;(reports || []).forEach(report => (report.rows || []).forEach(row => {
      if (resolveSalesNameAlias(row.name, salesNameAliases) === currentName || normalizeSalesKey(row.name) === normalizeSalesKey(name)) sourceNames.add(normalizeSalesName(row.name))
    }))
    const nextAliases = { ...(salesNameAliases || {}) }
    sourceNames.forEach(sourceName => {
      const key = normalizeSalesKey(sourceName)
      if (key) nextAliases[key] = nextName
    })
    setSalesNameAliases(nextAliases)
    setRecipeCostMap(prev => {
      const nextMap = { ...(prev || {}) }
      const nextKey = normalizeSalesKey(nextName)
      const oldKeys = Array.from(sourceNames).map(normalizeSalesKey)
      const oldCostKey = oldKeys.find(k => Object.prototype.hasOwnProperty.call(nextMap, k))
      if (nextKey && oldCostKey && !Object.prototype.hasOwnProperty.call(nextMap, nextKey)) nextMap[nextKey] = nextMap[oldCostKey]
      return nextMap
    })
    try {
      const { data: menuItems } = await supabase.from('menu_items').select('id,name')
      const oldKeys = Array.from(sourceNames).map(normalizeSalesKey)
      const target = (menuItems || []).find(item => normalizeSalesKey(item.name) === normalizeSalesKey(nextName))
      const oldItem = (menuItems || []).find(item => oldKeys.includes(normalizeSalesKey(item.name)))
      if (oldItem && !target) await supabase.from('menu_items').update({ name: nextName }).eq('id', oldItem.id)
      if (!oldItem && !target) await supabase.from('menu_items').insert({ name: nextName, category: 'Прочее', sale_price: 0, target_food_cost_percent: 30, is_active: true })
    } catch (_e) {}
    setMessage(`Название “${currentName}” заменено на “${nextName}”. Старые и будущие AIKO-строки будут объединяться под новым названием.`)
  }

  function restoreSalesItem(key) {
    setHiddenSalesKeys(prev => (prev || []).filter(x => x !== key))
    setMessage('Позиция возвращена в отчёты')
  }

  function exportAikoReportsBackup() {
    const payload = { reports, hiddenSalesKeys, salesNameAliases, branchMap, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rms-aiko-sales-backup-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function importAikoReportsBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      const nextReports = mergeAikoReports(reports, payload.reports || [])
      saveReports(nextReports)
      if (Array.isArray(payload.hiddenSalesKeys)) setHiddenSalesKeys(prev => Array.from(new Set([...(prev || []), ...payload.hiddenSalesKeys])))
      if (payload.branchMap && typeof payload.branchMap === 'object') setBranchMap(prev => ({ ...(prev || {}), ...payload.branchMap }))
      if (payload.salesNameAliases && typeof payload.salesNameAliases === 'object') setSalesNameAliases(prev => ({ ...(prev || {}), ...payload.salesNameAliases }))
      setMessage('Бэкап отчётов восстановлен')
    } catch (e) {
      setMessage(e?.message || 'Не удалось восстановить бэкап отчётов')
    } finally {
      event.target.value = ''
    }
  }

  const branchOptions = [
    ...branches.map(b => ({ id: b.id, name: b.name })),
    ...reports.filter(r => !r.branch_id && r.branch_name).map(r => ({ id: r.branch_name, name: r.branch_name }))
  ].filter((item, index, arr) => item.id && arr.findIndex(x => String(x.id) === String(item.id)) === index)

  const sortHeader = (field, label) => <button className="ghost small" style={{padding:'4px 6px'}} onClick={() => setSalesSort(s => ({ field, dir: s.field === field && s.dir === 'desc' ? 'asc' : 'desc' }))}>{label}{salesSort.field === field ? (salesSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}</button>

  const limitOptions = [10, 20, 30]
  const aiLimitForTitle = (title) => title.includes('Топ продаж') ? aiTopLimit : title.includes('аутсайдер') ? aiOutsiderLimit : 10

  const renderAiTable = (title, list, sortLabel = 'Выручка') => {
    const limit = aiLimitForTitle(title)
    const expanded = !!expandedAiTables[title]
    const cappedList = (list || []).slice(0, 30)
    const visible = expanded ? cappedList : cappedList.slice(0, limit)
    const isHideableTop = title.includes('низкомаржин') || title.includes('аутсайдер')
    return <div className="card span-2" style={{overflow:'hidden'}}>
      <div className="card-head"><div><h3>{title}</h3><p className="hint">Компактный TOP-блок без внутреннего скролла. На экране максимум {limit} позиций. Полный TOP всегда ограничен 30 позициями.</p></div><div className="action-row">{isHideableTop && <button className="ghost small" onClick={() => setShowHiddenSalesItems(v => !v)}>{showHiddenSalesItems ? 'Скрыть список скрытых' : `Скрытые позиции (${hiddenSalesKeys.length})`}</button>}{(title.includes('Топ продаж') || title.includes('аутсайдер')) && <label className="compact-select"><span className="hint">Показать TOP</span><select value={title.includes('Топ продаж') ? aiTopLimit : aiOutsiderLimit} onChange={e => title.includes('Топ продаж') ? setAiTopLimit(Number(e.target.value)) : setAiOutsiderLimit(Number(e.target.value))}>{limitOptions.map(n => <option key={n} value={n}>{n}</option>)}</select></label>}</div></div>
      {isHideableTop && showHiddenSalesItems && <div className="table-wrap" style={{marginBottom:12}}><table><thead><tr><th>Скрытая позиция</th><th></th></tr></thead><tbody>
        {hiddenSalesKeys.map(key => <tr key={key}><td><b>{key}</b></td><td><button className="ghost small" onClick={() => restoreSalesItem(key)}>Вернуть</button></td></tr>)}
        {!hiddenSalesKeys.length && <tr><td colSpan="2" className="hint">Скрытых позиций нет. Ненужные позиции скрываются из топа аутсайдеров / низкомаржинальных товаров.</td></tr>}
      </tbody></table></div>}
      <table style={{width:'100%', tableLayout:'fixed'}}><thead><tr><th>Позиция</th><th style={{width:90}}>Тип</th><th style={{width:110}}>Кол-во / цена</th><th style={{width:110}}>Выручка</th><th style={{width:90}}>Food cost</th><th style={{width:90}}>Маржа</th>{isHideableTop && <th style={{width:90}}></th>}</tr></thead><tbody>
        {visible.map((r, idx) => <tr key={`${title}-${idx}-${r.name}`}><td><b>{r.name}</b>{!isNetworkSalesView && <><br /><span className="hint">{r.branch_name || '—'}</span></>}</td><td><span className={r.department === 'Бар' ? 'pill good' : r.department === 'Кухня' ? 'pill warn' : 'pill'}>{r.department === 'Кухня' ? 'Кухня' : r.department === 'Бар' ? 'Бар' : '—'}</span></td><td>{fmt(r.quantity)}<br /><span className="hint">цена {fmt(r.avg_price)}</span></td><td>{fmt(r.revenue)}</td><td>{r.revenue ? pct((r.cost / r.revenue) * 100) : '0.0%'}</td><td className={r.margin < 20 ? 'bad' : r.margin > 65 ? 'good' : ''}><b>{pct(r.margin)}</b></td>{isHideableTop && <td><button className="ghost small" onClick={() => hideSalesItem(r.name)}>Скрыть</button></td>}</tr>)}
        {!visible.length && <tr><td colSpan={isHideableTop ? 7 : 6} className="hint">Нет данных</td></tr>}
      </tbody></table>
      {cappedList.length > limit && <button className="ghost small" style={{marginTop:10}} onClick={() => setExpandedAiTables(v => ({...v, [title]: !expanded}))}>{expanded ? 'Свернуть' : `Показать до 30 (${Math.min(list.length, 30)})`}</button>}
    </div>
  }

  const renderDepartmentSummaryRow = (dept) => {
    const item = departmentTotals[dept] || { quantity: 0, revenue: 0, cost: 0, profit: 0 }
    return <tr key={dept}><td><b>{dept}</b></td><td>{fmt(item.quantity)}</td><td>{fmt(item.revenue)}</td><td>{fmt(item.cost)}</td><td className={item.profit >= 0 ? 'good' : 'bad'}>{fmt(item.profit)}</td><td>{item.revenue ? pct((item.cost / item.revenue) * 100) : '0.0%'}</td></tr>
  }

  const parseAiSalesQuery = (query) => {
    const q = String(query || '').toLowerCase().replace(/ё/g, 'е')
    const now = new Date()
    let mode = 'filtered'
    let targetMonth = ''
    let targetYear = ''
    if (q.includes('этот месяц') || q.includes('текущий месяц') || q.includes('bu ay')) {
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      mode = 'month'
    } else if (q.includes('прошлый месяц')) {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      mode = 'month'
    }
    const yearMatch = q.match(/20\d{2}/)
    if (q.includes('год') || q.includes('year') || q.includes('il')) {
      targetYear = yearMatch?.[0] || String(now.getFullYear())
      mode = 'year'
    }
    const monthNames = [
      ['01', /январ|january|yanvar/], ['02', /феврал|february|fevral/], ['03', /март|march/], ['04', /апрел|april/], ['05', /май|may/], ['06', /июн|june|iyun/],
      ['07', /июл|july|iyul/], ['08', /август|august/], ['09', /сентябр|september|sentyabr/], ['10', /октябр|october|oktyabr/], ['11', /ноябр|november|noyabr/], ['12', /декабр|december|dekabr/]
    ]
    const foundMonth = monthNames.find(([, rx]) => rx.test(q))
    if (foundMonth) {
      const y = yearMatch?.[0] || String(now.getFullYear())
      targetMonth = `${y}-${foundMonth[0]}`
      mode = 'month'
    }
    const stop = new Set(['покажи','продажи','продажу','за','этот','текущий','месяц','год','и','по','все','всех','товары','товаров','блюда','напитки','сколько','выручка','выручку','this','month','year','sales','show'])
    const tokens = q.split(/[^a-zа-я0-9]+/i).map(x => x.trim()).filter(x => x.length >= 3 && !stop.has(x) && !/^20\d{2}$/.test(x))
    return { tokens, mode, targetMonth, targetYear }
  }

  const aiSearchResult = useMemo(() => {
    const query = salesAiQuery.trim()
    if (!query) return null
    const parsed = parseAiSalesQuery(query)
    let baseReports = reports.filter(r => {
      const branchOk = branchFilter === 'all' || String(r.branch_id || r.branch_name) === String(branchFilter)
      const deptOk = departmentFilter === 'all' || r.department === departmentFilter
      const ym = reportMonthValue(r)
      if (parsed.mode === 'month') return branchOk && deptOk && ym === parsed.targetMonth
      if (parsed.mode === 'year') return branchOk && deptOk && ym.startsWith(parsed.targetYear)
      return branchOk && deptOk && (monthFilter === 'all' || ym === monthFilter)
    })
    let resultRows = aggregateSalesRows(baseReports, { includeBranch: branchFilter !== 'all', hiddenKeys: hiddenSalesKeys, recipeCostMap, aliases: salesNameAliases })
    if (parsed.tokens.length) {
      resultRows = resultRows.filter(r => {
        const hay = `${r.name || ''} ${r.menu_category || ''} ${r.source_category || ''}`.toLowerCase().replace(/ё/g, 'е')
        return parsed.tokens.some(token => hay.includes(token))
      })
    }
    resultRows = resultRows.sort((a, b) => parseNum(b.revenue) - parseNum(a.revenue))
    const totals = resultRows.reduce((acc, r) => {
      acc.quantity += parseNum(r.quantity)
      acc.revenue += parseNum(r.revenue)
      acc.cost += parseNum(r.cost)
      acc.profit += parseNum(r.profit)
      return acc
    }, { quantity: 0, revenue: 0, cost: 0, profit: 0 })
    return { ...parsed, rows: resultRows, totals, reports: baseReports.length }
  }, [salesAiQuery, reports, branchFilter, departmentFilter, monthFilter, hiddenSalesKeys, recipeCostMap, salesNameAliases])

  const SalesTableBlock = <div className="card span-2">
    <div className="card-head"><div><h3>Общая таблица продаж</h3><p className="hint">В общем режиме продажи агрегируются по всей сети без разбивки по филиалам. Себестоимость считается только из техкарт. Если техкарта пока не заполнена, себестоимость остаётся 0.</p></div></div>
    <div className="form-grid compact">
      <label><span>Месяц</span><select value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setExpandedSalesRows(false) }}><option value="all">Все месяцы</option>{monthOptions.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
      <label><span>Филиал</span><select value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setExpandedSalesRows(false) }}><option value="all">Все филиалы</option>{branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label><span>Тип</span><select value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setExpandedSalesRows(false) }}><option value="all">Бар + Кухня</option><option value="Бар">Бар</option><option value="Кухня">Кухня</option></select></label>
    </div>
    <div className="mini-grid">
      <div className="metric"><span>Выручка</span><strong>{fmt(totals.revenue)}</strong>{monthFilter !== 'all' && <small className={changeClass(totals.revenue, previousMonthTotals.revenue)}>к прошлому месяцу {formatChangePct(totals.revenue, previousMonthTotals.revenue)}</small>}</div>
      <div className="metric"><span>Себестоимость</span><strong>{fmt(totals.cost)}</strong>{monthFilter !== 'all' && <small className={changeClass(totals.cost, previousMonthTotals.cost)}>к прошлому месяцу {formatChangePct(totals.cost, previousMonthTotals.cost)}</small>}</div>
      <div className="metric"><span>Валовая прибыль</span><strong className={totals.profit >= 0 ? 'good' : 'bad'}>{fmt(totals.profit)}</strong>{monthFilter !== 'all' && <small className={changeClass(totals.profit, previousMonthTotals.profit)}>к прошлому месяцу {formatChangePct(totals.profit, previousMonthTotals.profit)}</small>}</div>
      <div className="metric"><span>Food cost</span><strong>{totals.revenue ? pct((totals.cost / totals.revenue) * 100) : '0.0%'}</strong>{monthFilter !== 'all' && <small className="hint">пред. месяц {previousMonthTotals.revenue ? pct((previousMonthTotals.cost / previousMonthTotals.revenue) * 100) : '0.0%'}</small>}</div>
    </div>
    <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Раздел</th><th>Кол-во</th><th>Выручка</th><th>Себестоимость</th><th>Прибыль</th><th>Food cost</th></tr></thead><tbody>{['Бар', 'Кухня'].map(renderDepartmentSummaryRow)}</tbody></table></div>
    <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Позиция</th>{!isNetworkSalesView && <th>Филиал</th>}<th>Тип</th><th>Категория</th><th>{sortHeader('quantity', 'Кол-во')}</th><th>{sortHeader('revenue', 'Выручка')}</th>{monthFilter !== 'all' && <th>Динамика кол-ва</th>}<th>{sortHeader('cost', 'Себестоимость')}</th><th>{sortHeader('profit', 'Прибыль')}</th><th>{sortHeader('margin', 'Маржа')}</th><th></th></tr></thead><tbody>
      {visibleSalesRows.map((r, idx) => <tr key={`${r.name}-${idx}`}><td><b>{r.name}</b>{r.original_names?.length > 1 && <><br /><span className="hint">AIKO: {r.original_names.slice(0, 3).join(', ')}{r.original_names.length > 3 ? '…' : ''}</span></>}</td>{!isNetworkSalesView && <td>{r.branch_name || '—'}</td>}<td><span className={r.department === 'Бар' ? 'pill good' : r.department === 'Кухня' ? 'pill warn' : 'pill'}>{r.department === 'Кухня' ? 'Кухня' : r.department === 'Бар' ? 'Бар' : '—'}</span></td><td>{r.menu_category || r.source_category || '—'}</td><td>{fmt(r.quantity)}</td><td>{fmt(r.revenue)}</td>{monthFilter !== 'all' && <td>{renderRowChange(r, 'quantity')}</td>}<td>{fmt(r.cost)}</td><td className={r.profit >= 0 ? 'good' : 'bad'}>{fmt(r.profit)}</td><td>{pct(r.margin)}</td><td><button className="ghost small" onClick={() => renameSalesItem(r.name)}>Переименовать</button></td></tr>)}
      {!rows.length && <tr><td colSpan={(isNetworkSalesView ? 9 : 10) + (monthFilter !== 'all' ? 1 : 0)} className="hint">Нет данных</td></tr>}
    </tbody></table></div>
    {rows.length > 10 && <button className="ghost small" style={{marginTop:10}} onClick={() => setExpandedSalesRows(v => !v)}>{expandedSalesRows ? 'Свернуть' : `Показать все позиции (${rows.length})`}</button>}
  </div>

  const AiSearchBlock = <div className="card span-2">
    <div className="card-head"><div><h3>ИИ-поиск по продажам</h3><p className="hint">Пример: “Покажи продажи пиццы за этот месяц и за год”. Поиск учитывает текущие фильтры филиала и Бар/Кухня.</p></div></div>
    <div className="form-grid compact"><label><span>Запрос</span><input value={salesAiQuery} onChange={e => setSalesAiQuery(e.target.value)} placeholder="Покажи продажи пиццы за этот месяц / за год" /></label></div>
    {aiSearchResult && <>
      <div className="mini-grid">
        <div className="metric"><span>Отчётов</span><strong>{aiSearchResult.reports}</strong></div>
        <div className="metric"><span>Найдено позиций</span><strong>{aiSearchResult.rows.length}</strong></div>
        <div className="metric"><span>Кол-во</span><strong>{fmt(aiSearchResult.totals.quantity)}</strong></div>
        <div className="metric"><span>Выручка</span><strong>{fmt(aiSearchResult.totals.revenue)}</strong></div>
        <div className="metric"><span>Себестоимость</span><strong>{fmt(aiSearchResult.totals.cost)}</strong></div>
        <div className="metric"><span>Прибыль</span><strong className={aiSearchResult.totals.profit >= 0 ? 'good' : 'bad'}>{fmt(aiSearchResult.totals.profit)}</strong></div>
      </div>
      <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Позиция</th>{!isNetworkSalesView && <th>Филиал</th>}<th>Тип</th><th>Кол-во</th><th>Выручка</th><th>Прибыль</th></tr></thead><tbody>
        {aiSearchResult.rows.slice(0, 20).map((r, idx) => <tr key={`ai-search-${idx}`}><td><b>{r.name}</b></td>{!isNetworkSalesView && <td>{r.branch_name || '—'}</td>}<td>{r.department === 'Кухня' ? 'Кухня' : r.department === 'Бар' ? 'Бар' : '—'}</td><td>{fmt(r.quantity)}</td><td>{fmt(r.revenue)}</td><td className={r.profit >= 0 ? 'good' : 'bad'}>{fmt(r.profit)}</td></tr>)}
        {!aiSearchResult.rows.length && <tr><td colSpan={isNetworkSalesView ? 5 : 6} className="hint">По запросу ничего не найдено.</td></tr>}
      </tbody></table></div>
    </>}
  </div>

  return <section>
    <section className="topbar"><div><h2>Отчёты</h2><p>Импорт продаж AIKO по филиалам, общая сводка и AI-аналитика ассортимента.</p></div></section>
    <div className="settings-tabs"><button className={reportsTab === 'sales' ? 'active' : ''} onClick={() => setReportsTab('sales')}>Отчёт по продажам</button><button className={reportsTab === 'import' ? 'active' : ''} onClick={() => setReportsTab('import')}>Импорт</button></div>

    {reportsTab === 'import' && <section className="grid">
      <div className="card span-2">
        <div className="card-head"><div><h3>Импорт отчёта продаж AIKO</h3><p className="hint">Поддерживаются PDF из AIKO, ZIP с PDF, TXT/CSV и ручная вставка текста. Модификаторы автоматически исключаются из продаж и из техкарт.</p></div></div>
        <div className="form-grid compact">
          <label><span>Филиал для импорта</span><select value={importBranchId} onChange={e => setImportBranchId(e.target.value)}><option value="auto">Авто по названию склада / файла</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>Загрузить файлы</span><input type="file" multiple accept=".pdf,.zip,.txt,.csv,application/pdf,application/zip" onChange={e => handleFiles(e.target.files)} /></label>
        </div>
        <label><span>Или вставьте текст отчёта AIKO</span><textarea rows={7} value={importText} onChange={e => setImportText(e.target.value)} placeholder="Отчет о продажах с 01.04.2026 по 30.04.2026..." /></label>
        <div className="action-row"><button className="small primary" disabled={busy} onClick={importFromText}>{busy ? 'Импорт...' : 'Импортировать текст'}</button><button className="ghost small" onClick={exportAikoReportsBackup}>Скачать бэкап отчётов</button><label className="ghost small" style={{display:'inline-flex',alignItems:'center',cursor:'pointer'}}>Восстановить бэкап<input type="file" accept="application/json,.json" style={{display:'none'}} onChange={importAikoReportsBackup} /></label><button className="ghost small" onClick={clearReports}>Очистить отчёты</button></div>
        {cloudSyncStatus && <p className="hint">{cloudSyncStatus}</p>}
        {message && <p className={`hint ${message.includes('Импортировано') || message.includes('добавлено') || message.includes('очищ') || message.includes('удал') || message.includes('сохран') || message.includes('восстанов') ? 'good' : 'bad'}`}>{message}</p>}
      </div>

      <div className="card span-2">
        <div className="card-head"><div><h3>Сопоставление AIKO → филиалы RMS</h3><p className="hint">По умолчанию уже зашито: Xəqani→B1, R.B→B3, C.H→B4, Cresent→B5, Nizami→B2.</p></div><button className="ghost small" onClick={applySavedBranchMappings}>Применить</button></div>
        <div className="table-wrap"><table><thead><tr><th>Название в AIKO</th><th>Отчётов</th><th>Филиал RMS</th></tr></thead><tbody>
          {detectedAikoBranches.map(item => <tr key={item.key}><td><b>{item.name || item.key}</b><br /><span className="hint">ключ: {item.key}</span></td><td>{item.count}</td><td><select value={branchMap[item.key] || ''} onChange={e => setAikoBranchMapping(item.key, e.target.value)}><option value="">Не выбран</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td></tr>)}
          {!detectedAikoBranches.length && <tr><td colSpan="3" className="hint">После импорта здесь появятся названия филиалов из AIKO.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card span-2" style={{marginTop:20}}>
        <div className="card-head"><div><h3>Импортированные отчёты</h3><p className="hint">Список находится в подменю “Импорт” и отображается внизу страницы одной полосой. Каждый PDF/файл сохраняется отдельным импортом.</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Файл</th><th>Период</th><th>Филиал</th><th>Тип</th><th>Строк</th><th>Выручка</th><th>Себестоимость</th><th></th></tr></thead><tbody>
          {visibleReports.map(r => { const token = reportAikoToken(r); return <tr key={r.id}><td><b>{r.source_file}</b><br /><span className="hint">AIKO: {token.name || '—'} · {r.warehouse || '—'}</span></td><td>{r.period_start || '—'} — {r.period_end || '—'}</td><td><select value={r.branch_id || ''} onChange={e => updateReportBranch(r.id, e.target.value, false)}><option value="">Не выбран</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>{token.key && <button className="ghost small" style={{marginTop:6}} onClick={() => updateReportBranch(r.id, r.branch_id || '', true)}>Применить к {token.name}</button>}</td><td>{r.department}</td><td>{(r.rows || []).length}</td><td>{fmt(r.totals?.revenue)}</td><td>{fmt(r.totals?.cost)}</td><td><button className="remove" onClick={() => removeReport(r.id)}>×</button></td></tr> })}
          {!reports.length && <tr><td colSpan="8" className="hint">Загрузите отчёты AIKO для анализа.</td></tr>}
        </tbody></table></div>
        {reports.length > 10 && <button className="ghost small" style={{marginTop:10}} onClick={() => setExpandedReportsTable(v => !v)}>{expandedReportsTable ? 'Свернуть' : `Показать все отчёты (${reports.length})`}</button>}
      </div>
    </section>}

    {reportsTab === 'sales' && <section className="grid">
      {SalesTableBlock}
      {AiSearchBlock}
      {renderAiTable('Топ продаж по выручке', ai.topSales, 'Выручка')}
      {renderAiTable('Топ продаж по количеству', ai.topQty, 'Выручка')}
      {renderAiTable('Топ аутсайдеров', ai.outsiders, 'Выручка')}
      {renderAiTable('Топ высокомаржинальных товаров', ai.highMargin, 'Маржа %')}
      {renderAiTable('Топ низкомаржинальных товаров', ai.lowMargin, 'Маржа %')}
    </section>}
  </section>
}

function Settings({ session, t, theme, setTheme }) {
  const [users, setUsers] = useState([])
  const [permissions, setPermissions] = useState([])
  const [legalEntities, setLegalEntities] = useState([])
  const [branches, setBranches] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [newExpenseCategoryName, setNewExpenseCategoryName] = useState('')
  const [serviceBranchId, setServiceBranchId] = useState('')
  const [serviceSettings, setServiceSettings] = useState({ enabled: false, service_percent: '10', staff_cost_percent: '4' })
  const [fullName, setFullName] = useState('')
  const [legalForm, setLegalForm] = useState({ name: '', voen: '' })
  const [newUser, setNewUser] = useState({ login: '', password: '', full_name: '' })
  const [passwordEdits, setPasswordEdits] = useState({})
  const [clearConfirm, setClearConfirm] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [employeeImportText, setEmployeeImportText] = useState('')
  const [employeeImportRows, setEmployeeImportRows] = useState([])
  const [employeeImportBusy, setEmployeeImportBusy] = useState(false)
  const [employeeImportReport, setEmployeeImportReport] = useState(null)
  const [attendanceImportText, setAttendanceImportText] = useState('')
  const [attendanceImportRows, setAttendanceImportRows] = useState([])
  const [attendanceImportBusy, setAttendanceImportBusy] = useState(false)
  const [attendanceImportReport, setAttendanceImportReport] = useState(null)
  const [attendanceImportYear, setAttendanceImportYear] = useState('2026')
  const [attendanceImportMonth, setAttendanceImportMonth] = useState('4')
  const [advanceImportText, setAdvanceImportText] = useState('')
  const [advanceImportRows, setAdvanceImportRows] = useState([])
  const [advanceImportBusy, setAdvanceImportBusy] = useState(false)
  const [advanceImportReport, setAdvanceImportReport] = useState(null)
  const [advanceImportYear, setAdvanceImportYear] = useState('2026')
  const [advanceImportMonth, setAdvanceImportMonth] = useState('4')
  const [msg, setMsg] = useState('')
  const [settingsTab, setSettingsTab] = useState('branches')
  const [customLogoPreview, setCustomLogoPreview] = useState(() => {
    try { return localStorage.getItem('rms_custom_logo') || sessionStorage.getItem('rms_custom_logo') || '' } catch (_e) { return '' }
  })
  const editableSections = SECTIONS.filter(s => s.id !== 'settings')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: u }, { data: le }, { data: perms }, { data: br }, { data: cats }] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at'),
      supabase.from('legal_entities').select('*').order('name'),
      supabase.from('user_permissions').select('*'),
      supabase.from('branches').select('id,name,service_charge_enabled,service_charge_percent,service_staff_cost_percent').eq('is_active', true).order('name'),
      supabase.from('expense_categories').select('*').order('name')
    ])

    const internalUsers = Object.values(getInternalUsers()).map(u => ({
      id: u.id,
      email: `${u.login}@rms.internal`,
      login_name: u.login,
      full_name: u.full_name || u.login,
      role: 'employee',
      is_active: u.is_active !== false,
      hide_manager_salary: Boolean(u.hide_manager_salary || u.hide_manager_salaries),
      hide_manager_salaries: Boolean(u.hide_manager_salary || u.hide_manager_salaries),
      ui_theme: u.ui_theme || 'classic',
      rms_internal: true
    }))

    const supabaseUsers = u || []
    const allUsers = [
      ...supabaseUsers,
      ...internalUsers.filter(iu => !supabaseUsers.some(su => su.id === iu.id || normalizeInternalLogin(su.login_name || su.email) === iu.login_name))
    ]

    setUsers(allUsers)
    setLegalEntities(le || [])
    setPermissions([...(perms || []), ...internalUsers.flatMap(iu => makeInternalPermissionRows(iu.id))])
    setBranches(br || [])
    setExpenseCategories(cats || [])
    if (!serviceBranchId && br?.[0]) setServiceBranchId(br[0].id)
  }

  async function addExpenseCategory() {
    const name = newExpenseCategoryName.trim()
    if (!name) return setMsg('Введите название статьи расходов')
    const { error } = await supabase.from('expense_categories').insert({ name, is_active: true })
    if (error) return setMsg(error.message)
    setNewExpenseCategoryName('')
    await load()
    setMsg('Статья расходов добавлена')
  }

  async function updateExpenseCategory(id, patch) {
    const payload = { ...patch }
    if ('name' in payload) {
      payload.name = String(payload.name || '').trim()
      if (!payload.name) return setMsg('Название статьи не может быть пустым')
    }
    const { error } = await supabase.from('expense_categories').update(payload).eq('id', id)
    if (error) return setMsg(error.message)
    setExpenseCategories(prev => prev.map(c => c.id === id ? { ...c, ...payload } : c))
    setMsg('Статья расходов обновлена')
  }

  async function createProfileForCurrentUser() {
    await supabase.from('user_profiles').upsert({ id: session.user.id, email: session.user.email, login_name: (session.user.email || '').split('@')[0], full_name: fullName || session.user.email, role: 'admin', ui_theme: theme })
    setMsg(t('saved'))
    load()
  }

  async function addUser() {
    setMsg('')
    const login = normalizeInternalLogin(newUser.login)
    if (!login) return setMsg('Введите login пользователя')
    if (!/^[a-z0-9._-]{3,40}$/.test(login)) return setMsg('Login: только латиница, цифры, точка, дефис или подчёркивание, минимум 3 символа')
    const password = String(newUser.password || '').trim()
    if (!password || password.length < 6) return setMsg('Пароль должен быть минимум 6 символов')

    const internalUsers = getInternalUsers()
    const existing = internalUsers[login]
    const userId = existing?.id || `rms-${login}-${Date.now()}`
    internalUsers[login] = {
      id: userId,
      login,
      password,
      full_name: newUser.full_name || existing?.full_name || login,
      is_active: existing?.is_active !== false,
      hide_manager_salary: Boolean(existing?.hide_manager_salary || existing?.hide_manager_salaries),
      hide_manager_salaries: Boolean(existing?.hide_manager_salary || existing?.hide_manager_salaries),
      ui_theme: existing?.ui_theme || theme || 'classic'
    }
    setInternalUsers(internalUsers)

    const allPerms = getInternalPermissions()
    if (!allPerms[userId]) {
      allPerms[userId] = {}
      editableSections.forEach(sec => { allPerms[userId][sec.id] = 'read' })
      setInternalPermissions(allPerms)
    }

    setNewUser({ login: '', password: '', full_name: '' })
    setMsg(`Пользователь ${login} добавлен. Вход: ${login}`)
    window.dispatchEvent(new Event('rms-user-settings-updated'))
    await load()
  }

  async function changeUserPassword(userId, loginName) {
    setMsg('')
    const password = String(passwordEdits[userId] || '').trim()
    if (!password || password.length < 6) return setMsg('Пароль должен быть минимум 6 символов')

    const internalUsers = getInternalUsers()
    const localLogin = Object.keys(internalUsers).find(k => internalUsers[k]?.id === userId || k === normalizeInternalLogin(loginName))
    if (localLogin) {
      internalUsers[localLogin] = { ...internalUsers[localLogin], password }
      setInternalUsers(internalUsers)
      setPasswordEdits(p => ({ ...p, [userId]: '' }))
      setMsg(`Пароль пользователя ${localLogin} изменён`)
      window.dispatchEvent(new Event('rms-user-settings-updated'))
      await load()
      return
    }

    setMsg('Пароль можно менять только у внутренних RMS-пользователей. Для admin используйте Supabase Auth.')
  }

  async function updateUser(id, patch) {
    const internalUsers = getInternalUsers()
    const localLogin = Object.keys(internalUsers).find(k => internalUsers[k]?.id === id)
    if (localLogin) {
      const normalizedPatch = { ...patch }
      if ('hide_manager_salary' in normalizedPatch) normalizedPatch.hide_manager_salaries = normalizedPatch.hide_manager_salary
      if ('hide_manager_salaries' in normalizedPatch) normalizedPatch.hide_manager_salary = normalizedPatch.hide_manager_salaries
      internalUsers[localLogin] = { ...internalUsers[localLogin], ...normalizedPatch }
      setInternalUsers(internalUsers)
      setMsg(t('saved'))
      window.dispatchEvent(new Event('rms-user-settings-updated'))
      await load()
      return
    }

    const { error } = await supabase.from('user_profiles').update(patch).eq('id', id)
    if (error) setMsg(error.message); else { setMsg(t('saved')); load() }
  }

  const getPermission = (userId, section) => {
    const local = getInternalPermissions()
    if (local[userId]) return local[userId]?.[section] || 'none'
    return permissions.find(p => p.user_id === userId && p.section === section)?.access || 'none'
  }

  async function updatePermission(userId, section, access) {
    const local = getInternalPermissions()
    if (local[userId]) {
      local[userId] = { ...(local[userId] || {}), [section]: access }
      setInternalPermissions(local)
      setMsg(t('saved'))
      window.dispatchEvent(new Event('rms-user-settings-updated'))
      await load()
      return
    }

    if (access === 'none') {
      const { error } = await supabase.from('user_permissions').delete().eq('user_id', userId).eq('section', section)
      if (error) setMsg(error.message); else { setMsg(t('saved')); load() }
      return
    }

    const { error } = await supabase.from('user_permissions').upsert({ user_id: userId, section, access }, { onConflict: 'user_id,section' })
    if (error) setMsg(error.message); else { setMsg(t('saved')); load() }
  }

  async function deleteUser(user) {
    const login = normalizeInternalLogin(user?.login_name || user?.email)
    const internalUsers = getInternalUsers()
    const localLogin = internalUsers[login] ? login : Object.keys(internalUsers).find(k => internalUsers[k]?.id === user.id)
    if (!localLogin) return setMsg('Удалять через RMS можно только внутренних пользователей.')
    if (!window.confirm(`Удалить пользователя ${localLogin}?`)) return

    const userId = internalUsers[localLogin].id
    delete internalUsers[localLogin]
    setInternalUsers(internalUsers)

    const allPerms = getInternalPermissions()
    delete allPerms[userId]
    setInternalPermissions(allPerms)

    const active = getInternalSessionStorage()
    if (active?.user?.id === userId) setInternalSessionStorage(null)

    setMsg(`Пользователь ${localLogin} удалён`)
    window.dispatchEvent(new Event('rms-user-settings-updated'))
    await load()
  }

  async function updateTheme(value) {
    setTheme(value)
    await supabase.from('user_profiles').update({ ui_theme: value }).eq('id', session.user.id)
    setMsg(t('saved'))
  }

  function notifyLogoUpdate() {
    window.dispatchEvent(new Event('rms-logo-updated'))
  }

  useEffect(() => {
    let cancelled = false
    async function loadLogoForSettings() {
      const cloudLogo = await readRmsAppSetting(RMS_CUSTOM_LOGO_KEY, '')
      if (cancelled || !cloudLogo) return
      try {
        localStorage.setItem('rms_custom_logo', cloudLogo)
        sessionStorage.setItem('rms_custom_logo', cloudLogo)
      } catch (_e) {}
      setCustomLogoPreview(cloudLogo)
      notifyLogoUpdate()
    }
    loadLogoForSettings()
    return () => { cancelled = true }
  }, [])

  function handleCustomLogoSelect(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setMsg('Лого должно быть не больше 4 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const raw = String(reader.result || '')
      const img = new Image()
      img.onload = () => {
        const source = document.createElement('canvas')
        source.width = img.width
        source.height = img.height
        const sctx = source.getContext('2d')
        sctx.clearRect(0, 0, source.width, source.height)
        sctx.drawImage(img, 0, 0)

        let minX = source.width
        let minY = source.height
        let maxX = 0
        let maxY = 0
        const data = sctx.getImageData(0, 0, source.width, source.height).data

        for (let y = 0; y < source.height; y += 1) {
          for (let x = 0; x < source.width; x += 1) {
            const i = (y * source.width + x) * 4
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const a = data[i + 3]
            const notTransparent = a > 20
            const notWhite = !(r > 244 && g > 244 && b > 244)
            if (notTransparent && notWhite) {
              if (x < minX) minX = x
              if (y < minY) minY = y
              if (x > maxX) maxX = x
              if (y > maxY) maxY = y
            }
          }
        }

        if (maxX <= minX || maxY <= minY) {
          minX = 0
          minY = 0
          maxX = source.width
          maxY = source.height
        }

        const pad = 12
        minX = Math.max(0, minX - pad)
        minY = Math.max(0, minY - pad)
        maxX = Math.min(source.width, maxX + pad)
        maxY = Math.min(source.height, maxY + pad)

        const cropW = Math.max(1, maxX - minX)
        const cropH = Math.max(1, maxY - minY)
        const maxW = 560
        const maxH = 260
        const canvas = document.createElement('canvas')
        canvas.width = maxW
        canvas.height = maxH
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, maxW, maxH)

        const scale = Math.min((maxW * 0.88) / cropW, (maxH * 0.82) / cropH)
        const drawW = Math.max(1, Math.round(cropW * scale))
        const drawH = Math.max(1, Math.round(cropH * scale))
        ctx.drawImage(source, minX, minY, cropW, cropH, Math.round((maxW - drawW) / 2), Math.round((maxH - drawH) / 2), drawW, drawH)

        setCustomLogoPreview(canvas.toDataURL('image/png'))
        setMsg('Лого автоматически обрезано от лишних полей и сжато под входное меню. Нажмите “Сохранить лого”.')
      }
      img.onerror = () => {
        setCustomLogoPreview(raw)
        setMsg('Лого загружено. Если размер выглядит некорректно, используйте PNG/SVG на прозрачном фоне.')
      }
      img.src = raw
    }
    reader.readAsDataURL(file)
  }

  async function saveCustomLogo() {
    if (!customLogoPreview) return setMsg('Сначала выберите файл лого')
    localStorage.setItem('rms_custom_logo', customLogoPreview)
    try { sessionStorage.setItem('rms_custom_logo', customLogoPreview) } catch (_e) {}
    const { error } = await writeRmsAppSetting(RMS_CUSTOM_LOGO_KEY, customLogoPreview)
    notifyLogoUpdate()
    setMsg(error ? 'Лого сохранено локально, но не удалось сохранить в Supabase. Создайте таблицу rms_app_settings, чтобы лого не слетало после замены файла.' : 'Лого сохранено в Supabase. Оно не должно слетать после замены JSX.')
  }

  async function removeCustomLogo() {
    localStorage.removeItem('rms_custom_logo')
    try { sessionStorage.removeItem('rms_custom_logo') } catch (_e) {}
    await deleteRmsAppSetting(RMS_CUSTOM_LOGO_KEY)
    setCustomLogoPreview('')
    notifyLogoUpdate()
    setMsg('Пользовательское лого удалено')
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

  function normalizeImportValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/g, '')
  }

  function splitImportLine(line) {
    if (line.includes('\t')) return line.split('\t').map(v => v.trim())
    if (line.includes(';')) return line.split(';').map(v => v.trim())
    return line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
  }

  function cleanImportEmployeeName(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*\((?:1|2|3|4|5|6)\)\s*$/i, '')
      .replace(/\s+4\)\s*$/i, '')
      .trim()
  }

  function parseEmployeeImport(textValue = employeeImportText) {
    const source = String(textValue || '').replace(/^\uFEFF/, '')
    const lines = source.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const parsed = []
    let currentBranch = ''

    if (!lines.length) {
      setEmployeeImportRows([])
      setEmployeeImportReport({ errors: ['Нет данных для распознавания'] })
      return []
    }

    const first = splitImportLine(lines[0]).map(x => normalizeImportValue(x))
    const hasCsvHeader = first.includes('branch') && first.includes('position') && first.includes('name') && first.includes('salary')

    if (hasCsvHeader) {
      const header = splitImportLine(lines[0]).map(h => normalizeImportValue(h))
      const idxBranch = header.indexOf('branch')
      const idxPosition = header.indexOf('position')
      const idxName = header.indexOf('name')
      const idxSalary = header.indexOf('salary')
      lines.slice(1).forEach((line, idx) => {
        const cells = splitImportLine(line)
        const branch = cells[idxBranch] || ''
        const position = cells[idxPosition] || ''
        const name = cleanImportEmployeeName(cells[idxName] || '')
        const salary = parseNum(cells[idxSalary])
        if (branch && position && name && salary > 0) parsed.push({ branch, position, name, salary, line: idx + 2 })
      })
    } else {
      lines.forEach((line, idx) => {
        const cells = splitImportLine(line)
        const nonEmpty = cells.filter(Boolean)
        if (!nonEmpty.length) return
        const c0 = String(cells[0] || '').trim()
        const c1 = String(cells[1] || '').trim()
        const c2 = String(cells[2] || '').trim()
        const norm0 = normalizeImportValue(c0)

        const looksLikeBranch = nonEmpty.length === 1 && (norm0.includes('managers') || norm0.includes('bistronomia') || /^b\d/.test(norm0) || /^bc\d/.test(norm0))
        if (looksLikeBranch) { currentBranch = c0; return }
        if (norm0.includes('должность') || norm0.includes('повара') || norm0.includes('барсервис') || norm0.includes('стюард')) return

        const salary = parseNum(c2)
        if (currentBranch && c0 && c1 && salary > 0) {
          parsed.push({ branch: currentBranch, position: c0, name: cleanImportEmployeeName(c1), salary, line: idx + 1 })
        }
      })
    }

    setEmployeeImportRows(parsed)
    setEmployeeImportReport({ errors: parsed.length ? [] : ['Не удалось распознать сотрудников. Нужны колонки branch, position, name, salary или табличный текст с филиалами.'] })
    return parsed
  }

  function findImportBranch(branchName) {
    const raw = String(branchName || '').trim()
    const norm = normalizeImportValue(raw)
    if (!norm || norm.includes('manager')) return { branch_id: null, branchName: 'Менеджеры', matched: true }

    const exact = branches.find(b => normalizeImportValue(b.name) === norm)
    if (exact) return { branch_id: exact.id, branchName: exact.name, matched: true }

    const digit = (raw.match(/b\s*[- ]?(\d+)/i) || raw.match(/bc\s*[- ]?(\d+)/i))?.[1]
    if (digit) {
      const byDigit = branches.find(b => {
        const n = normalizeImportValue(b.name)
        return n.includes(`bc${digit}`) || n.includes(`b${digit}`) || n.endsWith(String(digit))
      })
      if (byDigit) return { branch_id: byDigit.id, branchName: byDigit.name, matched: true }
    }

    const partial = branches.find(b => norm.includes(normalizeImportValue(b.name)) || normalizeImportValue(b.name).includes(norm))
    if (partial) return { branch_id: partial.id, branchName: partial.name, matched: true }

    return { branch_id: null, branchName: raw, matched: false }
  }

  async function handleEmployeeImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const text = await file.text()
    setEmployeeImportText(text)
    setEmployeeImportReport(null)
    setTimeout(() => parseEmployeeImport(text), 0)
  }

  function normalizeEmployeeMatchName(value) {
    return normalizeImportValue(cleanImportEmployeeName(value))
      .replace(/помощник|помошник|заготовщик|заг|повар|бариста|сервис|сервиз|стюарт|стьюарт|steward|service|chef|barista|менеджер|бн|bn|cy|су/g, '')
  }

  function firstImportNameToken(value) {
    return normalizeImportValue(cleanImportEmployeeName(value).split(/\s+/)[0] || '')
  }

  function importPositionMatch(a, b) {
    const pa = positionGroup(a)
    const pb = positionGroup(b)
    if (pa === 'Другое' || pb === 'Другое') return true
    return pa === pb
  }

  function findEmployeeForAttendance(existingEmployees, row, branchId) {
    const branchKey = branchId || null
    const rawName = normalizeImportValue(row.name)
    const cleanName = normalizeEmployeeMatchName(row.name)
    const firstToken = firstImportNameToken(row.name)
    const sameBranch = (existingEmployees || []).filter(e => (e.branch_id || null) === branchKey)

    const exact = sameBranch.find(e => normalizeImportValue(e.full_name) === rawName || normalizeImportValue(cleanImportEmployeeName(e.full_name)) === rawName)
    if (exact) return exact

    const cleanExact = sameBranch.find(e => normalizeEmployeeMatchName(e.full_name) === cleanName && importPositionMatch(e.position, row.position))
    if (cleanExact) return cleanExact

    const contains = sameBranch.find(e => {
      const n = normalizeEmployeeMatchName(e.full_name)
      if (!n || !cleanName || !importPositionMatch(e.position, row.position)) return false
      return (n.length >= 4 && cleanName.includes(n)) || (cleanName.length >= 4 && n.includes(cleanName))
    })
    if (contains) return contains

    if (firstToken.length >= 3) {
      const byFirstAndPosition = sameBranch.find(e => {
        const n = normalizeImportValue(e.full_name)
        return n.includes(firstToken) && importPositionMatch(e.position, row.position)
      })
      if (byFirstAndPosition) return byFirstAndPosition
    }

    const globalExact = (existingEmployees || []).find(e => normalizeEmployeeMatchName(e.full_name) === cleanName && importPositionMatch(e.position, row.position))
    if (globalExact) return globalExact

    if (firstToken.length >= 3) {
      const globalFirst = (existingEmployees || []).find(e => normalizeImportValue(e.full_name).includes(firstToken) && importPositionMatch(e.position, row.position))
      if (globalFirst) return globalFirst
    }

    return null
  }

  function parseAttendanceImport(textValue = attendanceImportText) {
    const source = String(textValue || '').replace(/^\uFEFF/, '')
    const lines = source.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const parsed = []
    let currentBranch = ''

    if (!lines.length) {
      setAttendanceImportRows([])
      setAttendanceImportReport({ errors: ['Нет данных для распознавания'] })
      return []
    }

    const first = splitImportLine(lines[0]).map(x => normalizeImportValue(x))
    const hasCsvHeader = first.includes('branch') && first.includes('position') && first.includes('name') && (first.includes('workeddays') || first.includes('worked') || first.includes('workedday'))

    if (hasCsvHeader) {
      const header = splitImportLine(lines[0]).map(h => normalizeImportValue(h))
      const idxBranch = header.indexOf('branch')
      const idxPosition = header.indexOf('position')
      const idxName = header.indexOf('name')
      const idxWorked = header.findIndex(h => h === 'workeddays' || h === 'worked' || h === 'workedday')
      const dayIndexes = Array.from({ length: 31 }, (_, i) => header.findIndex(h => h === `day${i + 1}` || h === String(i + 1)))

      lines.slice(1).forEach((line, idx) => {
        const cells = splitImportLine(line)
        const branch = cells[idxBranch] || ''
        const position = cells[idxPosition] || ''
        const name = cleanImportEmployeeName(cells[idxName] || '')
        const days = dayIndexes.map(dayIdx => {
          if (dayIdx < 0) return ''
          const value = String(cells[dayIdx] || '').trim().replace(',', '.')
          return value === '1' || value === '0.5' || value === '0' ? value : ''
        })
        const workedDays = parseNum(cells[idxWorked]) || days.reduce((s, v) => s + parseNum(v), 0)
        if (branch && name) parsed.push({ branch, position, name, days, workedDays, line: idx + 2 })
      })
    } else {
      lines.forEach((line, idx) => {
        const cells = line.split('\t')
        const nonEmpty = cells.map(c => String(c || '').trim()).filter(Boolean)
        if (!nonEmpty.length) return

        const c0 = String(cells[0] || '').trim()
        const c1 = String(cells[1] || '').trim()
        const norm0 = normalizeImportValue(c0)

        const looksLikeBranch = nonEmpty.length === 1 && (norm0.includes('managers') || norm0.includes('bistronomia') || /^b\d/.test(norm0) || /^bc\d/.test(norm0))
        if (looksLikeBranch) { currentBranch = c0; return }
        if (norm0.includes('должность') || norm0.includes('повара') || norm0.includes('барсервис') || norm0.includes('стюард') || norm0 === '0' || norm0 === '1') return
        if (!currentBranch || !c1) return

        const days = []
        for (let i = 2; i < 33; i++) {
          const value = String(cells[i] || '').trim().replace(',', '.')
          days.push(value === '1' || value === '0.5' || value === '0' ? value : '')
        }

        let workedDays = 0
        for (let i = cells.length - 1; i >= 33; i--) {
          const raw = String(cells[i] || '').trim().replace(',', '.')
          if (/^-?\d+(\.\d+)?$/.test(raw)) {
            workedDays = parseNum(raw)
            break
          }
        }
        if (!workedDays) workedDays = days.reduce((s, v) => s + parseNum(v), 0)

        parsed.push({ branch: currentBranch, position: c0, name: cleanImportEmployeeName(c1), days, workedDays, line: idx + 1 })
      })
    }

    setAttendanceImportRows(parsed)
    setAttendanceImportReport({ errors: parsed.length ? [] : ['Не удалось распознать табель. Нужен CSV branch,position,name,day_1...day_31,worked_days или табличный текст с филиалами.'] })
    return parsed
  }

  async function handleAttendanceImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const text = await file.text()
    setAttendanceImportText(text)
    setAttendanceImportReport(null)
    setTimeout(() => parseAttendanceImport(text), 0)
  }

  async function importAttendanceToRms() {
    setMsg('')
    const rows = attendanceImportRows.length ? attendanceImportRows : parseAttendanceImport()
    if (!rows.length) return setMsg('Нет распознанных строк табеля для импорта')
    const year = Number(attendanceImportYear)
    const month = Number(attendanceImportMonth)
    if (!year || !month) return setMsg('Укажите год и месяц для импорта табеля')
    const monthDate = monthStart(year, month)
    const dim = daysInMonth(year, month)
    if (!window.confirm(`Импортировать табель за ${I18N.ru.months[month - 1]} ${year}: ${rows.length} сотрудников?`)) return

    setAttendanceImportBusy(true)
    const report = { imported: 0, skipped: 0, createdEmployees: 0, attendanceRows: 0, salaryRows: 0, errors: [] }

    try {
      const { data: existingEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, branch_id, position, monthly_salary, daily_rate, salary_type, is_active, employment_status')
      if (empError) throw empError

      for (const row of rows) {
        const branch = findImportBranch(row.branch)
        if (!branch.matched) {
          report.skipped += 1
          report.errors.push(`Строка ${row.line}: филиал не найден — ${row.branch}`)
          continue
        }

        let employee = findEmployeeForAttendance(existingEmployees || [], row, branch.branch_id)

        if (!employee) {
          const createPayload = {
            full_name: cleanImportEmployeeName(row.name),
            position: row.position || null,
            branch_id: branch.branch_id || null,
            salary_type: 'monthly',
            monthly_salary: 0,
            daily_rate: 0,
            is_active: true,
            employment_status: 'active'
          }
          const { data: createdEmployee, error: createEmployeeError } = await supabase
            .from('employees')
            .insert(createPayload)
            .select('id, full_name, branch_id, position, monthly_salary, daily_rate, salary_type, is_active, employment_status')
            .single()
          if (createEmployeeError) {
            report.skipped += 1
            report.errors.push(`Строка ${row.line}: сотрудник не найден и не создан — ${row.name}: ${createEmployeeError.message}`)
            continue
          }
          employee = createdEmployee
          existingEmployees.push(createdEmployee)
          report.createdEmployees += 1
          report.errors.push(`Создан сотрудник без оклада: ${row.name} / ${branch.branchName}. После этого импортируйте/обновите оклады сотрудников.`)
        }

        const attendancePayload = []
        for (let d = 1; d <= Math.min(31, dim); d++) {
          const value = row.days[d - 1]
          const workDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          await supabase.from('employee_attendance').delete().eq('employee_id', employee.id).eq('work_date', workDate)
          if (value !== '' && value !== null && value !== undefined) {
            attendancePayload.push({
              employee_id: employee.id,
              branch_id: employee.branch_id || branch.branch_id || null,
              work_date: workDate,
              value: parseNum(value)
            })
          }
        }

        if (attendancePayload.length) {
          const { error: attError } = await supabase.from('employee_attendance').upsert(attendancePayload, { onConflict: 'employee_id,work_date' })
          if (attError) {
            report.skipped += 1
            report.errors.push(`${row.name}: ${attError.message}`)
            continue
          }
        }

        const worked = row.workedDays || attendancePayload.reduce((s, r) => s + parseNum(r.value), 0)
        const gross = calcGrossSalary(employee, worked)
        const start = monthDate
        const end = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
        const [{ data: existingSalary }, { data: advanceRows }] = await Promise.all([
          supabase.from('salary_periods').select('*').eq('employee_id', employee.id).eq('salary_month', monthDate).maybeSingle(),
          supabase.from('salary_advances').select('amount').eq('employee_id', employee.id).gte('advance_date', start).lte('advance_date', end).or('is_cancelled.is.null,is_cancelled.eq.false')
        ])
        const advance = (advanceRows || []).reduce((s, a) => s + parseNum(a.amount), 0)
        const deduction = parseNum(existingSalary?.deduction_amount)
        const net = gross - advance - deduction

        const { error: salaryError } = await supabase.from('salary_periods').upsert({
          employee_id: employee.id,
          branch_id: employee.branch_id || branch.branch_id || null,
          salary_month: monthDate,
          worked_days: worked,
          salary_gross: gross,
          salary_net: net,
          advance_amount: advance,
          deduction_amount: deduction,
          card_payment: parseNum(existingSalary?.card_payment),
          cash_payment: parseNum(existingSalary?.cash_payment),
          comment: existingSalary?.comment || `Импорт табеля: ${worked} дн.`
        }, { onConflict: 'employee_id,salary_month' })
        if (salaryError) {
          report.skipped += 1
          report.errors.push(`${row.name}: ${salaryError.message}`)
          continue
        }

        report.imported += 1
        report.attendanceRows += attendancePayload.length
        report.salaryRows += 1
      }

      setAttendanceImportReport(report)
      setMsg(`Импорт табеля завершён. Сотрудников: ${report.imported}, создано новых: ${report.createdEmployees || 0}, строк посещаемости: ${report.attendanceRows}, зарплатных периодов: ${report.salaryRows}, пропущено: ${report.skipped}.`)
    } catch (e) {
      setMsg(e.message || String(e))
      setAttendanceImportReport({ ...report, errors: [...report.errors, e.message || String(e)] })
    } finally {
      setAttendanceImportBusy(false)
    }
  }

  function parseAdvanceImport(textValue = advanceImportText) {
    const source = String(textValue || '').replace(/^\uFEFF/, '')
    const lines = source.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const parsed = []
    let currentBranch = 'Managers'

    if (!lines.length) {
      setAdvanceImportRows([])
      setAdvanceImportReport({ errors: ['Нет данных для распознавания'] })
      return []
    }

    const first = splitImportLine(lines[0]).map(x => normalizeImportValue(x))
    const hasCsvHeader = first.includes('branch') && first.includes('name') && first.includes('amount')

    if (hasCsvHeader) {
      const header = splitImportLine(lines[0]).map(h => normalizeImportValue(h))
      const idxBranch = header.indexOf('branch')
      const idxName = header.indexOf('name')
      const idxDate = header.indexOf('advancedate') >= 0 ? header.indexOf('advancedate') : header.indexOf('date')
      const idxAmount = header.indexOf('amount')
      const idxComment = header.indexOf('comment')

      lines.slice(1).forEach((line, idx) => {
        const cells = splitImportLine(line)
        const branch = cells[idxBranch] || ''
        const name = cleanImportEmployeeName(cells[idxName] || '')
        const amount = parseNum(cells[idxAmount])
        const advanceDate = idxDate >= 0 && cells[idxDate] ? String(cells[idxDate]).trim() : ''
        const comment = idxComment >= 0 ? String(cells[idxComment] || '') : ''
        if (branch && name && amount > 0) parsed.push({ branch, name, advanceDate, amount, comment, line: idx + 2 })
      })
    } else {
      lines.forEach((line, idx) => {
        const cells = line.split('\t')
        const nonEmpty = cells.map(c => String(c || '').trim()).filter(Boolean)
        if (!nonEmpty.length) return

        const c0 = String(cells[0] || '').trim()
        const c1 = String(cells[1] || '').trim()
        const norm0 = normalizeImportValue(c0)

        const looksLikeBranch = nonEmpty.length === 1 && (norm0.includes('managers') || norm0.includes('bistronomia') || /^b\d/.test(norm0) || /^bc\d/.test(norm0))
        if (looksLikeBranch) { currentBranch = c0; return }
        if (norm0.includes('повара') || norm0.includes('барсервис') || norm0.includes('стюардинг') || norm0.includes('стюард') || norm0 === 'summ') return
        if (!c1) return

        const last = String(cells[cells.length - 1] || '').trim().replace(',', '.')
        const amount = /^-?\d+(\.\d+)?$/.test(last) ? parseNum(last) : 0
        if (amount > 0) {
          parsed.push({
            branch: currentBranch,
            name: cleanImportEmployeeName(c1),
            advanceDate: '',
            amount,
            comment: 'Импорт авансов за месяц',
            line: idx + 1
          })
        }
      })
    }

    setAdvanceImportRows(parsed)
    setAdvanceImportReport({ errors: parsed.length ? [] : ['Не удалось распознать авансы. Нужен CSV branch,name,advance_date,amount,comment или табличный текст с филиалами.'] })
    return parsed
  }

  async function handleAdvanceImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const text = await file.text()
    setAdvanceImportText(text)
    setAdvanceImportReport(null)
    setTimeout(() => parseAdvanceImport(text), 0)
  }

  function normalizeImportDateValue(value, year, month) {
    const fallback = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`
    if (!value) return fallback
    const s = String(value || '').trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const parts = s.split(/[./-]/).map(x => x.trim())
    if (parts.length === 3) {
      const [d, m, y] = parts
      if (String(y).length === 4) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return fallback
  }

  async function importAdvancesToRms() {
    setMsg('')
    const rows = advanceImportRows.length ? advanceImportRows : parseAdvanceImport()
    if (!rows.length) return setMsg('Нет распознанных авансов для импорта')
    const year = Number(advanceImportYear)
    const month = Number(advanceImportMonth)
    if (!year || !month) return setMsg('Укажите год и месяц для импорта авансов')
    const monthDate = monthStart(year, month)
    const dim = daysInMonth(year, month)
    const monthEndDate = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
    if (!window.confirm(`Импортировать авансы за ${I18N.ru.months[month - 1]} ${year}: ${rows.length} сотрудников?`)) return

    setAdvanceImportBusy(true)
    const report = { imported: 0, skipped: 0, createdEmployees: 0, total: 0, errors: [] }

    try {
      const { data: existingEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, branch_id, position, monthly_salary, daily_rate, salary_type, is_active, employment_status')
      if (empError) throw empError

      for (const row of rows) {
        const branch = findImportBranch(row.branch)
        if (!branch.matched) {
          report.skipped += 1
          report.errors.push(`Строка ${row.line}: филиал не найден — ${row.branch}`)
          continue
        }

        let employee = findEmployeeForAttendance(existingEmployees || [], { ...row, position: '' }, branch.branch_id)
        if (!employee) {
          const createPayload = {
            full_name: cleanImportEmployeeName(row.name),
            position: null,
            branch_id: branch.branch_id || null,
            salary_type: 'monthly',
            monthly_salary: 0,
            daily_rate: 0,
            is_active: true,
            employment_status: 'active'
          }
          const { data: createdEmployee, error: createEmployeeError } = await supabase
            .from('employees')
            .insert(createPayload)
            .select('id, full_name, branch_id, position, monthly_salary, daily_rate, salary_type, is_active, employment_status')
            .single()
          if (createEmployeeError) {
            report.skipped += 1
            report.errors.push(`Строка ${row.line}: сотрудник не найден и не создан — ${row.name}: ${createEmployeeError.message}`)
            continue
          }
          employee = createdEmployee
          existingEmployees.push(createdEmployee)
          report.createdEmployees += 1
          report.errors.push(`Создан сотрудник без оклада: ${row.name} / ${branch.branchName}. После этого импортируйте/обновите оклады сотрудников.`)
        }

        const amount = parseNum(row.amount)
        const advanceDate = normalizeImportDateValue(row.advanceDate, year, month)
        const { data: oldRows } = await supabase
          .from('salary_advances')
          .select('id, amount, comment')
          .eq('employee_id', employee.id)
          .eq('advance_date', advanceDate)
          .ilike('comment', 'Импорт авансов%')
          .or('is_cancelled.is.null,is_cancelled.eq.false')
        if (oldRows?.length) {
          await supabase.from('salary_advances').update({ is_cancelled: true, comment: 'Отменено перед повторным импортом авансов' }).in('id', oldRows.map(r => r.id))
        }

        const { error: advError } = await supabase.from('salary_advances').insert({
          employee_id: employee.id,
          branch_id: employee.branch_id || branch.branch_id || null,
          advance_date: advanceDate || monthEndDate,
          amount,
          comment: row.comment || `Импорт авансов за ${I18N.ru.months[month - 1]} ${year}`
        })
        if (advError) {
          report.skipped += 1
          report.errors.push(`${row.name}: ${advError.message}`)
          continue
        }

        const start = monthDate
        const end = monthEndDate
        const [{ data: existingSalary }, { data: advanceRows }, { data: attendanceRows }] = await Promise.all([
          supabase.from('salary_periods').select('*').eq('employee_id', employee.id).eq('salary_month', monthDate).maybeSingle(),
          supabase.from('salary_advances').select('amount').eq('employee_id', employee.id).gte('advance_date', start).lte('advance_date', end).or('is_cancelled.is.null,is_cancelled.eq.false'),
          supabase.from('employee_attendance').select('value').eq('employee_id', employee.id).gte('work_date', start).lte('work_date', end)
        ])
        const worked = (attendanceRows || []).reduce((s, a) => s + parseNum(a.value), 0) || parseNum(existingSalary?.worked_days)
        const gross = parseNum(existingSalary?.salary_gross) || calcGrossSalary(employee, worked)
        const advance = (advanceRows || []).reduce((s, a) => s + parseNum(a.amount), 0)
        const deduction = parseNum(existingSalary?.deduction_amount)
        const net = gross - advance - deduction

        await supabase.from('salary_periods').upsert({
          employee_id: employee.id,
          branch_id: employee.branch_id || branch.branch_id || null,
          salary_month: monthDate,
          worked_days: worked,
          salary_gross: gross,
          salary_net: net,
          advance_amount: advance,
          deduction_amount: deduction,
          card_payment: parseNum(existingSalary?.card_payment),
          cash_payment: parseNum(existingSalary?.cash_payment),
          comment: existingSalary?.comment || `Импорт авансов: ${fmt(advance)} AZN`
        }, { onConflict: 'employee_id,salary_month' })

        report.imported += 1
        report.total += amount
      }

      setAdvanceImportReport(report)
      setMsg(`Импорт авансов завершён. Сотрудников: ${report.imported}, сумма: ${fmt(report.total)} AZN, создано новых: ${report.createdEmployees || 0}, пропущено: ${report.skipped}.`)
    } catch (e) {
      setMsg(e.message || String(e))
      setAdvanceImportReport({ ...report, errors: [...report.errors, e.message || String(e)] })
    } finally {
      setAdvanceImportBusy(false)
    }
  }

  async function importEmployeesToRms() {
    setMsg('')
    const rows = employeeImportRows.length ? employeeImportRows : parseEmployeeImport()
    if (!rows.length) return setMsg('Нет распознанных сотрудников для импорта')
    if (!window.confirm(`Импортировать/обновить ${rows.length} сотрудников?`)) return

    setEmployeeImportBusy(true)
    const report = { created: 0, updated: 0, skipped: 0, errors: [] }

    try {
      const { data: existingEmployees, error: empError } = await supabase.from('employees').select('id, full_name, branch_id')
      if (empError) throw empError

      for (const row of rows) {
        const branch = findImportBranch(row.branch)
        if (!branch.matched) {
          report.skipped += 1
          report.errors.push(`Строка ${row.line}: филиал не найден — ${row.branch}`)
          continue
        }

        const nameKey = normalizeImportValue(row.name)
        const exists = (existingEmployees || []).find(e => normalizeImportValue(e.full_name) === nameKey && ((e.branch_id || null) === (branch.branch_id || null)))
        const payload = {
          full_name: row.name,
          position: row.position || null,
          branch_id: branch.branch_id,
          salary_type: 'monthly',
          monthly_salary: parseNum(row.salary),
          daily_rate: parseNum(row.salary) / 26,
          is_active: true,
          employment_status: 'active'
        }

        if (exists) {
          const { error } = await supabase.from('employees').update(payload).eq('id', exists.id)
          if (error) { report.skipped += 1; report.errors.push(`${row.name}: ${error.message}`); continue }
          report.updated += 1
        } else {
          const { data: created, error } = await supabase.from('employees').insert(payload).select('id').single()
          if (error) { report.skipped += 1; report.errors.push(`${row.name}: ${error.message}`); continue }
          report.created += 1
          await supabase.from('employee_assignments').insert({
            employee_id: created.id,
            branch_id: branch.branch_id,
            position: row.position || null,
            salary_type: 'monthly',
            monthly_salary: parseNum(row.salary),
            daily_rate: parseNum(row.salary) / 26,
            start_date: todayISO(),
            comment: 'Импорт сотрудников из настроек'
          })
        }
      }

      setEmployeeImportReport(report)
      setMsg(`Импорт сотрудников завершён. Добавлено: ${report.created}, обновлено: ${report.updated}, пропущено: ${report.skipped}.`)
    } catch (e) {
      setMsg(e.message || String(e))
      setEmployeeImportReport({ ...report, errors: [...report.errors, e.message || String(e)] })
    } finally {
      setEmployeeImportBusy(false)
    }
  }

  return (
    <section>
      <section className="topbar"><div><h2>{t('settings_tab')}</h2><p>{t('settings_subtitle')}</p></div></section>
      <div className="settings-tabs">
        <button className={settingsTab === 'branches' ? 'active' : ''} onClick={() => setSettingsTab('branches')}>Настройки интерфейса и филиалов</button>
        <button className={settingsTab === 'users' ? 'active' : ''} onClick={() => setSettingsTab('users')}>Пользователи</button>
        <button className={settingsTab === 'voen' ? 'active' : ''} onClick={() => setSettingsTab('voen')}>Наши VOEN / юрлица</button>
        <button className={settingsTab === 'backup' ? 'active' : ''} onClick={() => setSettingsTab('backup')}>Бэкап и очистка данных</button>
        <button className={settingsTab === 'import' ? 'active' : ''} onClick={() => setSettingsTab('import')}>Импорт данных</button>
      </div>
      <section className="grid">
        {settingsTab === 'branches' && <>
          <div className="card span-2"><h3>Настройки интерфейса и филиалов</h3><p className="hint">Тема интерфейса и service charge филиалов.</p></div>
          <div className="card span-2"><div className="card-head"><h3>Интерфейс</h3></div><p className="hint">Добавлен новый светлый Dashboard-вариант, визуально ближе к присланным референсам.</p><div className="form-grid compact"><label><span>Вид интерфейса</span><select value={theme} onChange={e => updateTheme(e.target.value)}>{THEMES.map(th => <option key={th.id} value={th.id}>{th.name}</option>)}</select></label></div>{msg && <p className="hint good">{msg}</p>}</div>
          <div className="card span-2"><div className="card-head"><div><h3>Лого стартовой страницы</h3><p className="hint">Теперь можно самостоятельно загрузить логотип без правки кода. Сохраняется в Supabase, а локально используется как быстрый кэш.</p></div></div><div className="logo-uploader"><div className="logo-preview-wrap">{customLogoPreview ? <img src={customLogoPreview} alt="Предпросмотр лого" /> : <div className="empty-logo">LOGO</div>}<div><b>Предпросмотр</b><p className="hint">Файл будет автоматически сжат под стартовую страницу. Лучше использовать PNG/SVG на прозрачном фоне.</p></div></div><div className="form-grid compact"><label><span>Выбрать файл</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleCustomLogoSelect} /></label></div><div className="action-row"><button className="small primary" onClick={saveCustomLogo}>Сохранить лого</button><button className="ghost small" onClick={removeCustomLogo}>Удалить лого</button></div></div></div>
          <div className="card span-2">
            <div className="card-head">
              <div>
                <h3>Статьи расходов</h3>
                <p className="hint">Добавление и редактирование названий статей, которые используются в “Расходы за выбранную дату”.</p>
              </div>
              <button className="small primary" onClick={addExpenseCategory}>+ Добавить статью</button>
            </div>
            <div className="form-grid compact">
              <label><span>Новая статья расходов</span><input value={newExpenseCategoryName} onChange={e => setNewExpenseCategoryName(e.target.value)} placeholder="Например: Ремонт, Базар, Упаковка" /></label>
            </div>
            <div className="table-wrap" style={{marginTop:12}}>
              <table>
                <thead><tr><th>Название статьи</th><th>Активна</th></tr></thead>
                <tbody>
                  {expenseCategories.map(c => <tr key={c.id}>
                    <td><input defaultValue={c.name} onBlur={e => updateExpenseCategory(c.id, { name: e.target.value })} /></td>
                    <td><select value={String(c.is_active !== false)} onChange={e => updateExpenseCategory(c.id, { is_active: e.target.value === 'true' })}><option value="true">Да</option><option value="false">Нет</option></select></td>
                  </tr>)}
                  {!expenseCategories.length && <tr><td colSpan="2" className="hint">Статей расходов пока нет.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card span-2"><div className="card-head"><div><h3>Настройка service charge филиала</h3><p className="hint">Выберите филиал и один раз включите service charge. В разделе “Выручка” сумма для персонала будет считаться автоматически в конце строки.</p></div><button className="small primary" onClick={saveBranchServiceSettings}>Сохранить</button></div><div className="form-grid compact"><label><span>Филиал</span><select value={serviceBranchId} onChange={e => setServiceBranchId(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={serviceSettings.enabled} onChange={e => setServiceSettings(s => ({...s, enabled: e.target.checked}))} /> Учитывать service charge</label><MoneyInput label="Service charge % в счёте" value={serviceSettings.service_percent} onChange={v => setServiceSettings(s => ({...s, service_percent: v}))} /><MoneyInput label="% затрат персоналу от базы" value={serviceSettings.staff_cost_percent} onChange={v => setServiceSettings(s => ({...s, staff_cost_percent: v}))} /></div></div>
        </>}

        {settingsTab === 'users' && <>
          <div className="card span-2"><h3>Пользователи</h3><p className="hint">Добавление пользователей и права доступа.</p></div>
          <div className="card span-2"><div className="card-head"><h3>Добавить пользователя</h3></div><p className="hint">Пользователь входит по login. Система создаёт внутренний email вида login@rms.local.az, поэтому email-рассылка не используется.</p><div className="form-grid compact"><label><span>Login</span><input value={newUser.login} onChange={e => setNewUser({...newUser, login: e.target.value})} placeholder="" /></label><label><span>Временный пароль</span><input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></label><label><span>Имя</span><input value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} /></label></div><button className="small" onClick={addUser}>+ Добавить пользователя</button>{msg && <p className="hint good">{msg}</p>}</div>
          <div className="card span-2"><div className="card-head"><h3>Права доступа</h3></div><p className="hint">Внутренние пользователи RMS входят по login/password без Supabase Auth. Раздел с доступом “Нет доступа” полностью скрывается из меню.</p><div className="table-wrap"><table><thead><tr><th>Пользователь</th><th>Login</th><th>Активен</th><th>Пароль</th><th>Зарплаты</th><th>Разделы</th><th>Действия</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td><b>{u.full_name || u.login_name || u.id}</b></td><td><span className="hint">{u.login_name || (u.email || '').split('@')[0] || u.id}</span></td><td><select value={String(u.is_active !== false)} onChange={e => updateUser(u.id, { is_active: e.target.value === 'true' })}><option value="true">Да</option><option value="false">Нет</option></select></td><td><div className="inline-edit"><input type="password" value={passwordEdits[u.id] || ''} onChange={e => setPasswordEdits(p => ({...p, [u.id]: e.target.value}))} placeholder="Новый пароль" /><button className="small" onClick={() => changeUserPassword(u.id, u.login_name || (u.email || '').split('@')[0])}>Изменить</button></div></td><td><label className="checkbox-row"><input type="checkbox" checked={Boolean(u.hide_manager_salary)} onChange={e => updateUser(u.id, { hide_manager_salary: e.target.checked })} /> Скрыть зарплаты менеджеров</label></td><td><div className="permission-grid">{editableSections.map(sec => <React.Fragment key={`${u.id}-${sec.id}`}><b>{t(sec.key)}</b><select value={getPermission(u.id, sec.id)} onChange={e => updatePermission(u.id, sec.id, e.target.value)}><option value="none">Нет доступа</option><option value="read">Readonly</option><option value="edit">Editor</option></select></React.Fragment>)}</div></td><td>{u.rms_internal ? <button className="small danger" onClick={() => deleteUser(u)}>Удалить</button> : <span className="hint">admin</span>}</td></tr>)}</tbody></table></div></div>
        </>}

        {settingsTab === 'voen' && <div className="card span-2"><div className="card-head"><h3>Наши VOEN / юрлица</h3></div><p className="hint">Используются в разделе “Поставщики”.</p><div className="form-grid compact"><label><span>Имя / компания</span><input value={legalForm.name} onChange={e => setLegalForm({...legalForm, name: e.target.value})} placeholder="Ruslan Rasulov" /></label><label><span>VOEN</span><input value={legalForm.voen} onChange={e => setLegalForm({...legalForm, voen: e.target.value})} /></label></div><button className="small" onClick={addLegalEntity}>+ Добавить VOEN</button>{msg && <p className="hint good">{msg}</p>}<div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Имя / компания</th><th>VOEN</th><th>Активен</th></tr></thead><tbody>{legalEntities.map(le => <tr key={le.id}><td><input defaultValue={le.name} onBlur={e => updateLegalEntity(le.id, { name: e.target.value.trim() })} /></td><td><input defaultValue={le.voen} onBlur={e => updateLegalEntity(le.id, { voen: e.target.value.trim() })} /></td><td><select defaultValue={String(le.is_active !== false)} onChange={e => updateLegalEntity(le.id, { is_active: e.target.value === 'true' })}><option value="true">Да</option><option value="false">Нет</option></select></td></tr>)}{!legalEntities.length && <tr><td colSpan="3" className="hint">—</td></tr>}</tbody></table></div></div>}

        {settingsTab === 'backup' && <div className="card span-2"><div className="card-head"><div><h3>Бэкап и очистка данных</h3><p className="hint">Очищаются только операционные данные: выручка, расходы, приходы, касса, поступления/оплаты поставщиков, авансы, выплаты зарплаты, табель и журналы. Справочники, сотрудники, поставщики, товары, филиалы, VOEN и настройки остаются.</p></div></div><div className="form-grid compact"><label><span>Бэкап данных</span><button type="button" className="small primary" disabled={backupBusy} onClick={exportBackup}>{backupBusy ? 'Выполняется...' : 'Скачать бэкап JSON'}</button></label><label><span>Восстановить из бэкапа</span><input type="file" accept="application/json,.json" disabled={backupBusy} onChange={importBackup} /></label><label><span>Очистка</span><input value={clearConfirm} onChange={e => setClearConfirm(e.target.value)} placeholder="Введите ОЧИСТИТЬ" /></label></div><button type="button" className="danger" disabled={backupBusy} onClick={clearOperationalData}>Очистить всю операционную информацию</button><p className="hint">Перед очисткой сначала скачай бэкап. Восстановление принимает JSON-файл, созданный этой кнопкой.</p>{msg && <p className="hint good">{msg}</p>}</div>}

        {settingsTab === 'import' && <>
          <div className="card span-2"><div className="card-head"><div><h3>Импорт сотрудников</h3><p className="hint">Импортирует только постоянные данные: филиал, должность, имя сотрудника и оклад. Начисления, авансы, остатки и рабочие дни не импортируются.</p></div><button className="small primary" disabled={employeeImportBusy || !employeeImportRows.length} onClick={importEmployeesToRms}>{employeeImportBusy ? 'Импорт...' : 'Импортировать сотрудников'}</button></div><div className="form-grid compact"><label><span>CSV / TXT файл</span><input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={employeeImportBusy} onChange={handleEmployeeImportFile} /></label><label><span>Распознать вставленный текст</span><button type="button" className="small" disabled={employeeImportBusy} onClick={() => parseEmployeeImport()}>Распознать</button></label></div><label><span>Вставить список сотрудников</span><textarea rows="8" value={employeeImportText} onChange={e => { setEmployeeImportText(e.target.value); setEmployeeImportReport(null) }} placeholder={"branch,position,name,salary\nB1-Xaqani,Повар,Элвин,700"} /></label><div className="mini-grid"><div className="metric"><span>Распознано</span><strong>{employeeImportRows.length}</strong></div><div className="metric"><span>Будет импортировано</span><strong>{employeeImportRows.length}</strong></div><div className="metric"><span>Режим</span><strong>Сотрудники</strong></div></div>{msg && <p className="hint good">{msg}</p>}{employeeImportReport?.errors?.length > 0 && <div className="notice"><b>Ошибки / предупреждения</b>{employeeImportReport.errors.slice(0, 12).map((e, i) => <p key={i} className="bad">{e}</p>)}{employeeImportReport.errors.length > 12 && <p className="hint">Показаны первые 12 ошибок из {employeeImportReport.errors.length}</p>}</div>}{employeeImportRows.length > 0 && <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Филиал</th><th>Должность</th><th>Сотрудник</th><th>Оклад</th></tr></thead><tbody>{employeeImportRows.slice(0, 80).map((r, idx) => <tr key={`${r.line}-${idx}`}><td>{r.branch}</td><td>{r.position}</td><td><b>{r.name}</b></td><td>{fmt(r.salary)}</td></tr>)}{employeeImportRows.length > 80 && <tr><td colSpan="4" className="hint">Показаны первые 80 строк из {employeeImportRows.length}</td></tr>}</tbody></table></div>}<p className="hint">Если сотрудник уже есть в этом филиале, будут обновлены должность и оклад. Если сотрудника нет — он будет создан.</p></div>

          <div className="card span-2">
            <div className="card-head">
              <div>
                <h3>Импорт посещаемости</h3>
                <p className="hint">Импортирует табель по дням за выбранный месяц в employee_attendance и пересчитывает salary_periods. Сотрудники должны уже существовать в RMS.</p>
              </div>
              <button className="small primary" disabled={attendanceImportBusy || !attendanceImportRows.length} onClick={importAttendanceToRms}>{attendanceImportBusy ? 'Импорт...' : 'Импортировать посещаемость'}</button>
            </div>
            <div className="form-grid compact">
              <label><span>Год</span><input value={attendanceImportYear} onChange={e => setAttendanceImportYear(e.target.value)} /></label>
              <label><span>Месяц</span><select value={attendanceImportMonth} onChange={e => setAttendanceImportMonth(e.target.value)}>{I18N.ru.months.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}</select></label>
              <label><span>CSV / TXT файл</span><input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={attendanceImportBusy} onChange={handleAttendanceImportFile} /></label>
              <label><span>Распознать вставленный текст</span><button type="button" className="small" disabled={attendanceImportBusy} onClick={() => parseAttendanceImport()}>Распознать табель</button></label>
            </div>
            <label><span>Вставить табель посещаемости</span><textarea rows="8" value={attendanceImportText} onChange={e => { setAttendanceImportText(e.target.value); setAttendanceImportReport(null) }} placeholder={"branch,position,name,day_1,day_2,...,day_31,worked_days\nB1-Xaqani,Повар,Элвин,1,1,0,...,25"} /></label>
            <div className="mini-grid">
              <div className="metric"><span>Распознано</span><strong>{attendanceImportRows.length}</strong></div>
              <div className="metric"><span>Месяц</span><strong>{I18N.ru.months[Number(attendanceImportMonth) - 1]} {attendanceImportYear}</strong></div>
              <div className="metric"><span>Режим</span><strong>Посещаемость</strong></div>
            </div>
            {attendanceImportReport?.errors?.length > 0 && <div className="notice"><b>Ошибки / предупреждения</b>{attendanceImportReport.errors.slice(0, 12).map((e, i) => <p key={i} className="bad">{e}</p>)}{attendanceImportReport.errors.length > 12 && <p className="hint">Показаны первые 12 ошибок из {attendanceImportReport.errors.length}</p>}</div>}
            {attendanceImportRows.length > 0 && <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Филиал</th><th>Должность</th><th>Сотрудник</th><th>Отработано дней</th><th>Дни 1–31</th></tr></thead><tbody>{attendanceImportRows.slice(0, 80).map((r, idx) => <tr key={`${r.line}-${idx}`}><td>{r.branch}</td><td>{r.position || '—'}</td><td><b>{r.name}</b></td><td>{fmt(r.workedDays)}</td><td>{r.days.map((v, i) => v ? `${i + 1}:${v}` : '').filter(Boolean).join(' · ')}</td></tr>)}{attendanceImportRows.length > 80 && <tr><td colSpan="5" className="hint">Показаны первые 80 строк из {attendanceImportRows.length}</td></tr>}</tbody></table></div>}
            <p className="hint">Импорт посещаемости сначала очищает значения по сотруднику за дни выбранного месяца, затем загружает новые 1 / 0.5 / 0 и обновляет расчёт зарплаты.</p>

          <div className="card span-2">
            <div className="card-head">
              <div>
                <h3>Импорт авансов</h3>
                <p className="hint">Импортирует суммы авансов в salary_advances и пересчитывает salary_periods за выбранный месяц. По умолчанию сумма ставится последним днём месяца.</p>
              </div>
              <button className="small primary" disabled={advanceImportBusy || !advanceImportRows.length} onClick={importAdvancesToRms}>{advanceImportBusy ? 'Импорт...' : 'Импортировать авансы'}</button>
            </div>
            <div className="form-grid compact">
              <label><span>Год</span><input value={advanceImportYear} onChange={e => setAdvanceImportYear(e.target.value)} /></label>
              <label><span>Месяц</span><select value={advanceImportMonth} onChange={e => setAdvanceImportMonth(e.target.value)}>{I18N.ru.months.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}</select></label>
              <label><span>CSV / TXT файл</span><input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={advanceImportBusy} onChange={handleAdvanceImportFile} /></label>
              <label><span>Распознать вставленный текст</span><button type="button" className="small" disabled={advanceImportBusy} onClick={() => parseAdvanceImport()}>Распознать авансы</button></label>
            </div>
            <label><span>Вставить авансы</span><textarea rows="8" value={advanceImportText} onChange={e => { setAdvanceImportText(e.target.value); setAdvanceImportReport(null) }} placeholder={"branch,name,advance_date,amount,comment\nB1-Xaqani,Элвин,2026-04-30,250,Импорт авансов"} /></label>
            <div className="mini-grid">
              <div className="metric"><span>Распознано</span><strong>{advanceImportRows.length}</strong></div>
              <div className="metric"><span>Сумма</span><strong>{fmt(advanceImportRows.reduce((s, r) => s + parseNum(r.amount), 0))}</strong></div>
              <div className="metric"><span>Режим</span><strong>Авансы</strong></div>
            </div>
            {advanceImportReport?.errors?.length > 0 && <div className="notice"><b>Ошибки / предупреждения</b>{advanceImportReport.errors.slice(0, 12).map((e, i) => <p key={i} className={String(e).startsWith('Создан') ? 'hint' : 'bad'}>{e}</p>)}{advanceImportReport.errors.length > 12 && <p className="hint">Показаны первые 12 ошибок из {advanceImportReport.errors.length}</p>}</div>}
            {advanceImportRows.length > 0 && <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Филиал</th><th>Сотрудник</th><th>Дата</th><th>Аванс</th></tr></thead><tbody>{advanceImportRows.slice(0, 80).map((r, idx) => <tr key={`${r.line}-${idx}`}><td>{r.branch}</td><td><b>{r.name}</b></td><td>{r.advanceDate || `${advanceImportYear}-${String(advanceImportMonth).padStart(2, '0')}-${String(daysInMonth(advanceImportYear, advanceImportMonth)).padStart(2, '0')}`}</td><td>{fmt(r.amount)}</td></tr>)}{advanceImportRows.length > 80 && <tr><td colSpan="4" className="hint">Показаны первые 80 строк из {advanceImportRows.length}</td></tr>}</tbody></table></div>}
            <p className="hint">При повторном импорте старые строки “Импорт авансов...” за эту дату отменяются, чтобы не было дублей.</p>
          </div>
          </div>
        </>}      </section>
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

Warning: truncated output (original token count: 861661)
... 2398067 bytes omitted ...



/* v389 reports products: global unit helpers for Reports -> Products */
function supplierProductUnitMultiplier(fromUnit, toUnit) {
  const normalizeUnit = (value) => {
    const u = String(value || '').trim().toLowerCase()
    if (['кг', 'kilogram', 'kilograms'].includes(u)) return 'kg'
    if (['гр', 'г', 'gram', 'grams'].includes(u)) return 'g'
    if (['литр', 'литры', 'liter', 'liters'].includes(u)) return 'l'
    if (['мл', 'milliliter', 'milliliters'].includes(u)) return 'ml'
    if (['шт', 'штук', 'piece', 'pieces', 'pcs'].includes(u)) return 'pcs'
    return u || 'unit'
  }

  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)

  if (!from || !to || from === to) return 1

  if (from === 'kg' && to === 'g') return 1000
  if (from === 'g' && to === 'kg') return 0.001

  if (from === 'l' && to === 'ml') return 1000
  if (from === 'ml' && to === 'l') return 0.001

  return 1
}

function supplierProductBaseUnitPrice(price, fromUnit, baseUnit) {
  const multiplier = supplierProductUnitMultiplier(fromUnit, baseUnit)
  const numericPrice = Number(price || 0)
  return multiplier ? numericPrice / multiplier : numericPrice
}

// v257 — Animated backup and restore progress (0–100%)

// v132 Tech Cards RPC helpers


async function rmsTechRecipeItemSaveSecure({ id, payload, fallback, comment }) {
  return rmsTechSafeMutation({
    label: id ? 'recipe item update' : 'recipe item create',
    rpc: async () => id
      ? await rmsTechRecipeItemUpdateRpc(id, payload, comment || 'recipe item update')
      : await rmsTechRecipeItemCreateRpc(payload, comment || 'recipe item create'),
    fallback,
  })
}

async function rmsTechRecipeItemDeleteSecure({ id, fallback, comment }) {
  return rmsTechSafeMutation({
    label: 'recipe item cancel',
    rpc: async () => await rmsTechRecipeItemCancelRpc(id, comment || 'recipe item cancel'),
    fallback,
  })
}

async function rmsTechSemiItemSaveSecure({ id, payload, fallback, comment }) {
  return rmsTechSafeMutation({
    label: id ? 'semi item update' : 'semi item create',
    rpc: async () => id
      ? await rmsTechSemiFinishedItemUpdateRpc(id, payload, comment || 'semi item update')
      : await rmsTechSemiFinishedItemCreateRpc(payload, comment || 'semi item create'),
    fallback,
  })
}

async function rmsTechSemiItemDeleteSecure({ id, fallback, comment }) {
  return rmsTechSafeMutation({
    label: 'semi item cancel',
    rpc: async () => await rmsTechSemiFinishedItemCancelRpc(id, comment || 'semi item cancel'),
    fallback,
  })
}

async function rmsTechFinalComponentSaveSecure({ id, payload, fallback, comment }) {
  return rmsTechSafeMutation({
    label: id ? 'final recipe component update' : 'final recipe component create',
    rpc: async () => await rmsTechFinalRecipeComponentSaveRpc({ id, payload, comment }),
    fallback,
  })
}

async function rmsTechFinalComponentDeleteSecure({ id, fallback, comment }) {
  return rmsTechSafeMutation({
    label: 'final recipe component cancel',
    rpc: async () => await rmsTechFinalRecipeComponentCancelRpc(id, comment || 'final recipe component cancel'),
    fallback,
  })
}


async function rmsTechMenuItemUpdateRpc(id, patch, comment = '') {
  return rmsTechCardRpcCall('rms_tech_menu_item_update_secure', {
    p_id: id,
    p_patch: patch || {},
    p_comment: comment || null,
  })
}

async function rmsTechMenuItemCreateRpc(payload, comment = '') {
  return rmsTechCardRpcCall('rms_tech_menu_item_create_secure', {
    p_payload: payload || {},
    p_comment: comment || null,
  })
}

async function rmsTechMenuItemCancelRpc(id, comment = '') {
  return rmsTechCardRpcCall('rms_tech_menu_item_cancel_secure', {
    p_id: id,
    p_comment: comment || null,
  })
}

async function rmsTechSemiFinishedCreateRpc(payload, comment = '') {
  return rmsTechCardRpcCall('rms_tech_semi_finished_create_secure', {
    p_payload: payload || {},
    p_comment: comment || null,
  })
}

async function rmsTechSemiFinishedCancelRpc(id, comment = '') {
  return rmsTechCardRpcCall('rms_tech_semi_finished_cancel_secure', {
    p_id: id,
    p_comment: comment || null,
  })
}

async function rmsTechSemiFinishedItemCancelRpc(id, comment = '') {
  return rmsTechCardRpcCall('rms_tech_semi_finished_item_cancel_secure', {
    p_id: id,
    p_comment: comment || null,
  })
}

async function rmsTechFinalRecipeComponentSaveRpc({ id, payload, comment = '' }) {
  return id
    ? rmsTechCardRpcCall('rms_tech_final_recipe_component_update_secure', { p_id: id, p_patch: payload || {}, p_comment: comment || null })
    : rmsTechCardRpcCall('rms_tech_final_recipe_component_create_secure', { p_payload: payload || {}, p_comment: comment || null })
}

async function rmsTechFinalRecipeComponentCancelRpc(id, comment = '') {
  return rmsTechCardRpcCall('rms_tech_final_recipe_component_cancel_secure', {
    p_id: id,
    p_comment: comment || null,
  })
}



// v138 Tech Cards RPC switch runtime flags
const RMS_TECH_RPC_SWITCH_ENABLED = true
const RMS_TECH_RPC_LOCKDOWN_READY = false

async function rmsTechSafeMutation({ rpc, fallback, label }) {
  if (!RMS_TECH_RPC_SWITCH_ENABLED || typeof rpc !== 'function') {
    if (typeof fallback === 'function') return await fallback()
    return null
  }
  try {
    return await rpc()
  } catch (err) {
    console.warn(`[TechCards RPC fallback] ${label || 'mutation'}:`, err)
    if (typeof fallback === 'function') return await fallback(err)
    throw err
  }
}

function rmsTechPatchFromValues(values = {}) {
  const patch = {}
  Object.entries(values || {}).forEach(([k, v]) => {
    if (v !== undefined) patch[k] = v
  })
  return patch
}



// v141 Inventory Foundation helpers
async function rmsInventoryRpcCall(name, payload = {}) {
  if (!supabase?.rpc) throw new Error('Supabase RPC недоступен')
  const { data, error } = await supabase.rpc(name, payload)
  if (error) throw error
  return data
}


// v152 Inventory supplier backfill helpers
async function rmsInventorySupplierLinkHealth() {
  return rmsInventoryRpcCall('rms_inventory_supplier_link_health', {})
}

async function rmsInventoryBackfillSupplierPurchases(locationId = null, limit = 100) {
  return rmsInventoryRpcCall('rms_inventory_backfill_supplier_purchase_items', {
    p_location_id: locationId || null,
    p_limit: limit || 100,
  })
}


// v153 Inventory supplier auto-link prep helpers

// v154 Inventory auto-link validation helpers

// v155 Inventory consolidated helpers

// v157 Supplier Purchases -> Inventory Auto Stock Sync helpers

// v161 Bazar -> Inventory Stock Sync helpers

// v162 iiko Sales -> Inventory Consumption Prep helpers

// v163 iiko Sales Mapping -> Recipe Consumption Preview helpers

// v164 iiko Sales Consumption Consolidated Pack helpers

// v165 iiko Import Parser Fix helpers

// v166 iiko Import + Sales Consumption Forward Pack helpers

// v169 iiko Import + Consumption + Inventory UX Consolidated helpers

// v170 iiko Consumption Operational Pack helpers

// v171 iiko Import Operational Hardening helpers
async function rmsIikoImportOperationalAudit() {
  return rmsInventoryRpcCall('rms_iiko_import_operational_audit', {})
}

async function rmsIikoBranchDateQuality() {
  return rmsInventoryRpcCall('rms_iiko_branch_date_quality', {})
}

async function rmsIikoCleanupImportProblems() {
  return rmsInventoryRpcCall('rms_iiko_cleanup_import_problems', {})
}

async function rmsIikoConsumptionOperationalHealth() {
  return rmsInventoryRpcCall('rms_iiko_consumption_operational_health', {})
}

async function rmsInventoryApplyLatestConsumptionBatch() {
  return rmsInventoryRpcCall('rms_inventory_sales_consumption_apply_latest_batch', {})
}

async function rmsInventoryCancelLatestConsumptionBatch() {
  return rmsInventoryRpcCall('rms_inventory_sales_consumption_cancel_latest_batch', {})
}

async function rmsInventoryMenuAliasHealth() {
  return rmsInventoryRpcCall('rms_inventory_menu_alias_health', {})
}

async function rmsIikoLatestImportDashboard() {
  return rmsInventoryRpcCall('rms_iiko_latest_import_dashboard', {})
}

async function rmsIikoDeduplicateSalesItems() {
  return rmsInventoryRpcCall('rms_iiko_deduplicate_sales_items', {})
}

async function rmsInventoryConsumptionDraftReadiness() {
  return rmsInventoryRpcCall('rms_inventory_consumption_draft_readiness', {})
}

async function rmsIikoImportConsolidatedHealth() {
  return rmsInventoryRpcCall('rms_iiko_import_consolidated_health', {})
}

async function rmsIikoNormalizeImportedRows() {
  return rmsInventoryRpcCall('rms_iiko_normalize_imported_rows', {})
}

async function rmsInventorySalesUnmappedReport() {
  return rmsInventoryRpcCall('rms_inventory_sales_unmapped_report', {})
}

async function rmsIikoImportHealth() {
  return rmsInventoryRpcCall('rms_iiko_import_health', {})
}
async function rmsIikoCleanupEmptySalesRows() {
  return rmsInventoryRpcCall('rms_iiko_cleanup_empty_sales_rows', {})
}

async function rmsInventorySalesConsumptionConsolidatedHealth() {
  return rmsInventoryRpcCall('rms_inventory_sales_consumption_consolidated_health', {})
}

async function rmsInventorySalesConsumptionCreateDraft(periodStart = null, periodEnd = null, branchText = null) {
  return rmsInventoryRpcCall('rms_inventory_sales_consumption_create_draft_from_preview', {
    p_period_start: periodStart || null,
    p_period_end: periodEnd || null,
    p_branch_text: branchText || null,
    p_comment: 'Created from RMS inventory UI preview'
  })
}

async function rmsInventorySalesConsumptionPreview() {
  return rmsInventoryRpcCall('rms_inventory_sales_consumption_preview_health', {})
}

async function rmsInventorySalesRecipeMappingHealth() {
  return rmsInventoryRpcCall('rms_inventory_sales_recipe_mapping_health', {})
}

async function rmsInventorySalesConsumptionReadiness() {
  return rmsInventoryRpcCall('rms_inventory_sales_consumption_readiness', {})
}

async function rmsInventorySalesConsumptionHealth() {
  return rmsInventoryRpcCall('rms_inventory_sales_consumption_health', {})
}

async function rmsInventoryBazarStockSyncHealth() {
  return rmsInventoryRpcCall('rms_inventory_bazar_stock_sync_health', {})
}

async function rmsInventorySupplierStockSyncHealth() {
  return rmsInventoryRpcCall('rms_inventory_supplier_stock_sync_health', {})
}

async function rmsInventoryDashboardReport() {
  return rmsInventoryRpcCall('rms_inventory_dashboard_report', {})
}

async function rmsInventoryProductionPreview() {
  return rmsInventoryRpcCall('rms_inventory_production_readiness', {})
}

async function rmsInventoryWriteOffReport() {
  return rmsInventoryRpcCall('rms_inventory_writeoff_report', {})
}

async function rmsInventorySafeValidation() {
  const health = await rmsInventoryRpcCall('rms_inventory_supplier_auto_link_health', {})
  return health
}

async function rmsInventoryAutoLinkHealth() {
  return rmsInventoryRpcCall('rms_inventory_supplier_auto_link_health', {})
}

async function rmsInventoryBackfillDryRun() {
  return rmsInventoryRpcCall('rms_inventory_supplier_purchase_items_backfill_dry_run', {})
}

async function rmsInventoryBackfillPreview() {
  return rmsInventoryRpcCall('rms_inventory_supplier_purchase_items_backfill_preview', {})
}

async function rmsInventoryMovementCreate(payload = {}) {
  return rmsInventoryRpcCall('rms_inventory_movement_create_secure', {
    p_payload: payload || {},
  })
}

async function rmsInventorySnapshot() {
  const { data, error } = await supabase
    .from('rms_inventory_stock_balance_view')
    .select('*')
    .limit(500)
  if (error) throw error
  return data || []
}


async function rmsTechCardRpcCall(name, payload = {}) {
  if (!supabase?.rpc) throw new Error('Supabase RPC недоступен')
  const { data, error } = await supabase.rpc(name, payload)
  if (error) throw error
  return data
}


async function rmsTechRecipeItemCreateRpc(payload, comment = '') {
  return rmsTechCardRpcCall('rms_tech_recipe_item_create_secure', {
    p_payload: payload || {},
    p_comment: comment || null,
  })
}

async function rmsTechSemiFinishedItemCreateRpc(payload, comment = '') {
  return rmsTechCardRpcCall('rms_tech_semi_finished_item_create_secure', {
    p_payload: payload || {},
    p_comment: comment || null,
  })
}

async function rmsTechRecipeItemUpdateRpc(id, patch, comment = '') {
  return rmsTechCardRpcCall('rms_tech_recipe_item_update_secure', {
    p_id: id,
    p_patch: patch || {},
    p_comment: comment || null,
  })
}

async function rmsTechRecipeItemCancelRpc(id, comment = '') {
  return rmsTechCardRpcCall('rms_tech_recipe_item_cancel_secure', {
    p_id: id,
    p_comment: comment || null,
  })
}

async function rmsTechSemiFinishedUpdateRpc(id, patch, comment = '') {
  return rmsTechCardRpcCall('rms_tech_semi_finished_update_secure', {
    p_id: id,
    p_patch: patch || {},
    p_comment: comment || null,
  })
}

async function rmsTechSemiFinishedItemUpdateRpc(id, patch, comment = '') {
  return rmsTechCardRpcCall('rms_tech_semi_finished_item_update_secure', {
    p_id: id,
    p_patch: patch || {},
    p_comment: comment || null,
  })
}


async function rmsTechRpcWithFallback(rpcCall, fallbackCall, label = 'tech rpc') {
  try {
    return await rpcCall()
  } catch (err) {
    console.warn(`${label} failed, fallback used:`, err)
    if (typeof fallbackCall === 'function') return await fallbackCall(err)
    throw err
  }
}


async function rmsTechSaveRecipeItemWithFallback({ id, payload, fallback, comment }) {
  return rmsTechRpcWithFallback(
    async () => id
      ? await rmsTechRecipeItemUpdateRpc(id, payload, comment || 'recipe item update')
      : await rmsTechRecipeItemCreateRpc(payload, comment || 'recipe item create'),
    fallback,
    id ? 'recipe item update rpc' : 'recipe item create rpc'
  )
}

async function rmsTechDeleteRecipeItemWithFallback({ id, fallback, comment }) {
  return rmsTechRpcWithFallback(
    async () => await rmsTechRecipeItemCancelRpc(id, comment || 'recipe item cancel'),
    fallback,
    'recipe item cancel rpc'
  )
}

async function rmsTechSaveSemiFinishedItemWithFallback({ id, payload, fallback, comment }) {
  return rmsTechRpcWithFallback(
    async () => id
      ? await rmsTechSemiFinishedItemUpdateRpc(id, payload, comment || 'semi finished item update')
      : await rmsTechSemiFinishedItemCreateRpc(payload, comment || 'semi finished item create'),
    fallback,
    id ? 'semi finished item update rpc' : 'semi finished item create rpc'
  )
}

function rmsBuildTechPatchFromForm(form = {}) {
  const patch = {}
  Object.entries(form || {}).forEach(([key, value]) => {
    if (value !== undefined) patch[key] = value
  })
  return patch
}

async function rmsTechCardsReadinessCheck() {
  return rmsTechCardRpcCall('rms_tech_cards_rpc_readiness_check', {})
}

async function rmsTechCardAuditRecent(limit = 50) {
  const { data, error } = await supabase
    .from('rms_tech_card_audit_recent')
    .select('*')
    .limit(limit)
  if (error) throw error
  return data || []
}



// RMS v56.1 Supplier Enterprise Hardened - Supplier writes via secure RPC only
/* RMS v81 Finance Real User View - hides synthetic model charts from user finance screen */
/* RMS v63 Supplier Payment Calendar - payment calendar, due reminders and follow-up control persistence */
/* RMS v43 SUPPLIERS FINAL CLEAN SINGLE E-QAIME FORM - no payment term fields inside purchase e-qaime block */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { supabase } from './supabase'
import './styles.css'
import './rms_dashboard_chart.css'
import QRMenu from './QRMenu'
import './QRMenu.css'
import RMSQRMenuAdmin from './RMSQRMenuAdmin'
import RMSLoyalty from './RMSLoyalty'


// v278 — unified operation notifications for create/update/delete/save actions
const RMS_TOAST_EVENT = 'rms:operation-toast'
let rmsLastToastKey = ''
let rmsLastToastAt = 0

function rmsInferToastType(message = '') {
  const value = String(message || '').toLowerCase()
  if (!value) return 'info'
  if (/error|ошиб|не удалось|невозможно|failed|xəta|mümkün deyil|Введите|выберите|требуется|минимум|yalnış/.test(value)) return 'error'
  if (/удален|удалён|деактив|очищ|silin|ləğv|deaktiv/.test(value)) return 'warning'
  if (/сохран|добав|создан|обнов|измен|восстанов|импорт|скачан|готов|успеш|saved|added|created|updated|yadda saxlan|əlavə|yaradıl|yenilən|uğurla/.test(value)) return 'success'
  return 'info'
}

function rmsShowOperationToast(message, type) {
  const clean = String(message || '').trim()
  if (!clean || typeof window === 'undefined') return
  const toastType = type || rmsInferToastType(clean)
  const key = `${toastType}:${clean}`
  const now = Date.now()
  if (key === rmsLastToastKey && now - rmsLastToastAt < 1200) return
  rmsLastToastKey = key
  rmsLastToastAt = now
  window.dispatchEvent(new CustomEvent(RMS_TOAST_EVENT, { detail: { message: clean, type: toastType } }))
}

function useRmsStatusToast(message, type) {
  const previousRef = useRef('')
  useEffect(() => {
    const clean = String(message || '').trim()
    if (!clean || clean === previousRef.current) return
    previousRef.current = clean
    rmsShowOperationToast(clean, type)
  }, [message, type])
}

function RMSOperationToastCenter() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const handler = event => {
      const detail = event?.detail || {}
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message: String(detail.message || ''),
        type: detail.type || 'info'
      }
      setItems(prev => [...prev.slice(-3), item])
      const delay = item.type === 'error' ? 7000 : 4200
      window.setTimeout(() => setItems(prev => prev.filter(x => x.id !== item.id)), delay)
    }
    window.addEventListener(RMS_TOAST_EVENT, handler)
    return () => window.removeEventListener(RMS_TOAST_EVENT, handler)
  }, [])
  if (!items.length) return null
  return <div className="rms-operation-toast-stack" role="status" aria-live="polite">
    {items.map(item => <div key={item.id} className={`rms-operation-toast ${item.type}`}>
      <div className="rms-operation-toast-icon">{item.type === 'success' ? '✓' : item.type === 'error' ? '!' : item.type === 'warning' ? '!' : 'i'}</div>
      <div className="rms-operation-toast-copy">
        <strong>{item.type === 'success' ? 'Готово' : item.type === 'error' ? 'Ошибка' : item.type === 'warning' ? 'Внимание' : 'Статус'}</strong>
        <span>{item.message}</span>
      </div>
      <button type="button" aria-label="Закрыть" onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))}>×</button>
    </div>)}
  </div>
}

const I18N = {
  ru: {
    system_title:'RMS', system_short_title:'RMS', system_subtitle:'Выручка · Финансы · Персонал · Поставщики', dashboard_tab:'Dashboard', pos_tab:'POS / Продажи',
    brand_subtitle:'Restaurant Management System', language_label:'Язык интерфейса', login_label:'Login', password_label:'Пароль',
    login_button:'Войти', login_hint:'Вход по внутреннему login. Допустим вход по логину без домена.', login_error:'Неверный логин или пароль', show_password:'Показать пароль',
    logout:'Выйти', revenue_tab:'Выручка', finance_tab:'Финансы', reports_tab:'Отчёты', recipes_tab:'Тех. карты', salaries_tab:'Зарплаты',
    attendance_tab:'Посещаемость', advances_tab:'Авансы', suppliers_tab:'Поставщики', debts_payments_tab:'Долги и оплаты', qr_menu_tab:'QR Menu', loyalty_tab:'Loyalty', settings_tab:'Настройки', inventory_tab:'Склад',
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
    system_title:'RMS', system_short_title:'RMS', system_subtitle:'Dövriyyə · Maliyyə · Personal · Təchizatçılar', dashboard_tab:'Dashboard', pos_tab:'POS / Satış',
    brand_subtitle:'Restaurant Management System', language_label:'İnterfeys dili', login_label:'Login', password_label:'Parol',
    login_button:'Daxil ol', login_hint:'Daxili login ilə giriş. Domen yazmadan login istifadə etmək olar.', login_error:'Login və ya parol yanlışdır', show_password:'Parolu göstər',
    logout:'Çıxış', revenue_tab:'Dövriyyə', finance_tab:'Maliyyə', reports_tab:'Hesabatlar', recipes_tab:'Tex. kartlar', salaries_tab:'Maaşlar',
    attendance_tab:'Davamiyyət', advances_tab:'Avanslar', suppliers_tab:'Təchizatçılar', debts_payments_tab:'Borclar və ödənişlər', qr_menu_tab:'QR Menu', loyalty_tab:'Loyalty', settings_tab:'Ayarlar',
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
  { id: 'inventory', key: 'inventory_tab' },
  { id: 'salaries', key: 'salaries_tab' },
  { id: 'suppliers', key: 'suppliers_tab' },
  { id: 'debts', key: 'debts_payments_tab' },
  { id: 'qrmenu', key: 'qr_menu_tab' },
  { id: 'loyalty', key: 'loyalty_tab' },
  { id: 'settings', key: 'settings_tab' }
]

const REPORTS_ACCESS_TABS = [
  { id: 'overview', label: 'Обзор', icon: '▣' },
  { id: 'profitability', label: 'Рентабельность', icon: '◉' },
  { id: 'sales', label: 'Продажи', icon: '↗' },
  { id: 'revenue', label: 'Выручка', icon: '◷' },
  { id: 'expenses', label: 'Расходы', icon: '▥' },
  { id: 'categories', label: 'По статьям', icon: '☷' },
  { id: 'purchases', label: 'Закупки', icon: '▤' },
  { id: 'products', label: 'Товары', icon: '◇' },
  { id: 'suppliers', label: 'Поставщики', icon: '▱' },
  { id: 'bazar', label: 'Базар', icon: '⌂' },
  { id: 'export', label: 'Экспорт', icon: '⇩' },
  { id: 'import', label: 'Импорт', icon: '⇧' }
]

const REPORT_PERMISSION_PREFIX = 'reports:'
const reportPermissionSection = (tabId) => `${REPORT_PERMISSION_PREFIX}${tabId}`

const ACCESS_LEVELS = ['none', 'read', 'edit', 'admin']
const THEMES = [
  { id: 'classic', name: 'Классический' },
  { id: 'modern', name: 'Современный' },
  { id: 'dashboard', name: 'Dashboard / Light Pro' },
  { id: 'executive', name: 'Graphite / Soft Pro' }
]

const RMS_PRO_NAV_GROUPS = [
  { title: 'МЕНЮ', ids: ['dashboard', 'revenue', 'finance', 'recipes', 'inventory', 'salaries', 'suppliers', 'debts'] },
  { title: 'АНАЛИТИКА', ids: ['reports'] },
  { title: 'ИНСТРУМЕНТЫ', ids: ['qrmenu', 'loyalty', 'settings'] }
]

function RmsIcon({ type }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const icons = {
    dashboard: <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9 20v-6h6v6"/></svg>,
    revenue: <svg {...common}><path d="M4 18V6"/><path d="M4 18h16"/><path d="m7 15 4-4 3 3 5-7"/><path d="M16 7h3v3"/></svg>,
    finance: <svg {...common}><rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7 9h10"/><path d="M8 14h.01"/><path d="M12 14h4"/></svg>,
    reports: <svg {...common}><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="11" width="2.5" height="5" rx=".6"/><rect x="11" y="8" width="2.5" height="8" rx=".6"/><rect x="15" y="6" width="2.5" height="10" rx=".6"/></svg>,
    recipes: <svg {...common}><path d="M6 3.8h9.5L19 7.3V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5.3A1.5 1.5 0 0 1 6.5 3.8Z"/><path d="M15 4v4h4"/><path d="M8 12h8"/><path d="M8 16h6"/></svg>,
    inventory: <svg {...common}><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z"/><path d="M4 12l8 4.5 8-4.5"/><path d="M4 16.5 12 21l8-4.5"/></svg>,
    suppliers: <svg {...common}><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"/><path d="M4 13l8 4.5 8-4.5"/><path d="M4 17l8 4.5 8-4.5"/></svg>,
    debts: <svg {...common}><path d="M4 7h16"/><path d="M6 7V5h12v2"/><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M9 12h6"/><path d="M9 15h4"/></svg>,
    qrmenu: <svg {...common}><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h2.5"/><path d="M19 14h1"/><path d="M14 17h6"/><path d="M17 20h3"/><path d="M14 20h.01"/></svg>,
    loyalty: <svg {...common}><path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8L3.6 9.1l5.8-.8L12 3Z"/></svg>,
    salaries: <svg {...common}><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.5"/><path d="M17 8h4"/><path d="M19 6v4"/><path d="M18 14.5h3"/><path d="M18 18h3"/></svg>,
    settings: <svg {...common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.07a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.04A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 0 1 4 0v.04a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 0 1 0 4h-.04A1.7 1.7 0 0 0 19.4 15Z"/></svg>
  }
  return icons[type] || <svg {...common}><circle cx="12" cy="12" r="3"/></svg>
}

const RMS_PRO_SECTION_ICONS = {
  dashboard: <RmsIcon type="dashboard" />,
  revenue: <RmsIcon type="revenue" />,
  finance: <RmsIcon type="finance" />,
  reports: <RmsIcon type="reports" />,
  recipes: <RmsIcon type="recipes" />,
  inventory: <RmsIcon type="inventory" />,
  salaries: <RmsIcon type="salaries" />,
  suppliers: <RmsIcon type="suppliers" />,
  debts: <RmsIcon type="debts" />,
  qrmenu: <RmsIcon type="qrmenu" />,
  loyalty: <RmsIcon type="loyalty" />,
  settings: <RmsIcon type="settings" />
}

const RmsBellIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const RmsHelpIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.7 2.7 0 0 1 5.2 1c0 2-3 2.2-3 4"/><path d="M12 17h.01"/></svg>

function rmsProSectionTitle(section, t) {
  const map = {
    dashboard: t('dashboard_tab'),
    revenue: t('revenue_tab'),
    finance: t('finance_tab'),
    reports: t('reports_tab'),
    recipes: t('recipes_tab'),
    inventory: t('inventory_tab'),
    salaries: t('salaries_tab'),
    suppliers: t('suppliers_tab'),
    debts: t('debts_payments_tab'),
    qrmenu: t('qr_menu_tab'),
    loyalty: t('loyalty_tab'),
    settings: t('settings_tab')
  }
  return map[section] || 'RMS Pro'
}

function RMSProInterfaceStyles() {
  return <style>{`
    :root {
      --rms-pro-sidebar: #07162b;
      --rms-pro-sidebar-2: #0b1d38;
      --rms-pro-blue: #2563eb;
      --rms-pro-line: rgba(226,232,240,.92);
      --rms-pro-card: rgba(255,255,255,.94);
      --rms-pro-muted: #64748b;
      --rms-pro-ink: #0f172a;
    }

    .app.rms-pro-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 250px 1fr;
      background: #f5f7fb;
      color: var(--rms-pro-ink);
    }

    .rms-pro-shell .sidebar.rms-pro-sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      width: 250px;
      padding: 22px 14px 18px;
      background:
        radial-gradient(circle at 20% 0%, rgba(59,130,246,.32), transparent 28%),
        linear-gradient(180deg, #07162b 0%, #08182f 48%, #061426 100%);
      color: #e5edff;
      border-right: 1px solid rgba(148,163,184,.16);
      box-shadow: 16px 0 38px rgba(15,23,42,.18);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      z-index: 20;
    }

    .rms-pro-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 30px;
      padding: 0 8px;
    }

    .rms-pro-logo {
      width: 46px;
      height: 46px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      color: white;
      font-weight: 900;
      letter-spacing: -.04em;
      background: linear-gradient(135deg, #6366f1, #38bdf8);
      box-shadow: 0 14px 34px rgba(37,99,235,.34);
      overflow: hidden;
    }

    .rms-pro-brand h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      line-height: 1;
      letter-spacing: -.04em;
    }

    .rms-pro-brand p {
      margin: 4px 0 0;
      color: rgba(226,232,240,.72);
      font-size: 10px;
      line-height: 1.15;
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .rms-pro-nav {
      display: flex;
      flex-direction: column;
      gap: 22px;
      flex: 1;
    }

    .rms-pro-nav-group-title {
      margin: 0 0 9px;
      padding: 0 8px;
      color: rgba(226,232,240,.62);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .rms-pro-nav-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .rms-pro-nav-item {
      min-height: 44px;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid transparent;
      border-radius: 11px;
      padding: 0 12px;
      color: rgba(226,232,240,.92);
      background: transparent;
      font-size: 15px;
      font-weight: 700;
      text-align: left;
      cursor: pointer;
      transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease;
    }

    .rms-pro-nav-item:hover {
      background: rgba(255,255,255,.07);
      border-color: rgba(148,163,184,.20);
    }

    .rms-pro-nav-item.active {
      color: #60a5fa;
      background: linear-gradient(135deg, rgba(37,99,235,.30), rgba(37,99,235,.10));
      border-color: rgba(96,165,250,.40);
      box-shadow: inset 3px 0 0 #2563eb;
    }

    .rms-pro-nav-icon {
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      color: currentColor;
      font-size: 15px;
      font-weight: 900;
    }

    .rms-pro-sidebar-bottom {
      margin-top: 26px;
      padding-top: 14px;
      border-top: 1px solid rgba(148,163,184,.15);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .rms-pro-restaurant-select {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border: 1px solid rgba(148,163,184,.22);
      border-radius: 11px;
      padding: 11px 13px;
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      background: rgba(255,255,255,.04);
    }

    .rms-pro-user-card {
      display: flex;
      align-items: center;
      gap: 11px;
      border: 1px solid rgba(148,163,184,.14);
      border-radius: 12px;
      padding: 11px;
      background: rgba(255,255,255,.03);
    }

    .rms-pro-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #0f172a;
      background: #e2e8f0;
      font-weight: 900;
      position: relative;
    }

    .rms-pro-avatar::after {
      content: '';
      position: absolute;
      right: 0;
      bottom: 1px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid #07162b;
    }

    .rms-pro-user-name {
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.1;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rms-pro-user-role {
      color: rgba(226,232,240,.66);
      font-size: 11px;
      margin-top: 3px;
    }

    .rms-pro-logout {
      border: 1px solid rgba(148,163,184,.18);
      border-radius: 11px;
      background: rgba(255,255,255,.04);
      color: rgba(226,232,240,.86);
      font-weight: 800;
      padding: 10px 12px;
      cursor: pointer;
    }

    .rms-pro-shell .main.rms-pro-main {
      padding: 0;
      min-width: 0;
      background: #f6f8fc;
      overflow-x: hidden;
    }

    .rms-pro-topbar {
      height: 74px;
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255,255,255,.90);
      border-bottom: 1px solid rgba(226,232,240,.95);
      backdrop-filter: blur(18px);
      position: sticky;
      top: 0;
      z-index: 12;
    }

    .rms-pro-topbar-title {
      display: flex;
      align-items: center;
      gap: 14px;
      color: #0f172a;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -.03em;
    }

    .rms-pro-back {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 0;
      background: transparent;
      color: #334155;
      font-size: 30px;
      line-height: 1;
      cursor: pointer;
    }

    .rms-pro-topbar-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      color: #334155;
    }

    .rms-pro-top-icon {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 0;
      background: transparent;
      color: #334155;
      font-size: 20px;
    }

    .rms-pro-top-user {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #0f172a;
      font-weight: 800;
    }

    .rms-pro-top-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      background: #334155;
      font-weight: 900;
    }

    .rms-pro-content {
      padding: 24px 24px 34px;
      max-width: 1580px;
      margin: 0 auto;
    }

    .rms-pro-content > .topbar:first-child {
      margin-top: 0;
    }

    .rms-pro-shell .card,
    .rms-pro-shell .finance-line-chart-wrap,
    .rms-pro-shell .market-intelligence .mi-section,
    .rms-pro-shell .market-intelligence .mi-card,
    .rms-pro-shell .table-wrap,
    .rms-pro-shell .settings-card,
    .rms-pro-shell .qr-card {
      background: rgba(255,255,255,.96) !important;
      border: 1px solid rgba(226,232,240,.95) !important;
      border-radius: 20px !important;
      box-shadow: 0 18px 42px rgba(15,23,42,.055) !important;
    }

    .rms-pro-shell .topbar {
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin-bottom: 18px !important;
    }

    .rms-pro-shell .topbar h2,
    .rms-pro-shell h2 {
      color: #0f172a;
      letter-spacing: -.04em;
      font-weight: 900;
    }

    .rms-pro-shell .hint,
    .rms-pro-shell .muted,
    .rms-pro-shell .subtle {
      color: #64748b !important;
    }

    .rms-pro-shell .kpi,
    .rms-pro-shell .metric,
    .rms-pro-shell .mini-card {
      border-radius: 16px !important;
      border: 1px solid rgba(226,232,240,.9) !important;
      background: linear-gradient(180deg, #ffffff, #fbfdff) !important;
    }

    .rms-pro-shell .finance-line-chart-wrap {
      padding: 22px 30px 26px !important;
    }

    .rms-pro-shell .finance-line-chart-svg {
      height: 330px !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric {
      min-height: 138px !important;
      padding: 18px 20px 20px !important;
      justify-content: flex-start !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric-title {
      color: #071327 !important;
      font-weight: 850 !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric-number {
      font-size: 31px !important;
      color: #071327 !important;
      font-weight: 900 !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric-currency {
      font-size: 13px !important;
      color: #475569 !important;
      align-self: flex-end !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric:nth-child(3) {
      border-color: rgba(74,222,128,.65) !important;
      box-shadow: 0 14px 34px rgba(34,197,94,.10) !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric-title b,
    .rms-pro-shell .finance-line-chart-summary .metric-title strong {
      font-weight: 850 !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric-weekday {
      font-weight: 900 !important;
    }

    .rms-pro-shell .finance-line-chart-summary .metric:nth-child(5) .metric-weekday {
      color: #dc2626 !important;
    }


    .rms-pro-shell button:not(.rms-pro-nav-item):not(.rms-pro-back):not(.rms-pro-top-icon):not(.rms-pro-logout),
    .rms-pro-shell .btn {
      border-radius: 12px;
    }



/* RMS Pro UI v4 — render-match corrections */
.app.rms-pro-shell{
  grid-template-columns:232px 1fr!important;
  font-family:Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif!important;
  background:#f5f7fb!important;
}
.rms-pro-shell .sidebar.rms-pro-sidebar{
  width:232px!important;
  min-width:232px!important;
  height:100vh!important;
  min-height:100vh!important;
  overflow:hidden!important;
  padding:18px 12px 14px!important;
  background:
    radial-gradient(circle at 18% 0%,rgba(59,130,246,.30),transparent 30%),
    linear-gradient(180deg,#071932 0%,#06172d 50%,#041325 100%)!important;
  box-shadow:16px 0 42px rgba(15,23,42,.16)!important;
}
.rms-pro-brand{
  gap:10px!important;
  margin-bottom:18px!important;
  padding:0 8px 14px!important;
  border-bottom:1px solid rgba(148,163,184,.14)!important;
}
.rms-pro-logo{
  width:43px!important;
  height:43px!important;
  border-radius:13px!important;
  box-shadow:0 12px 28px rgba(37,99,235,.32)!important;
}
.rms-pro-brand h1{
  font-size:22px!important;
  font-weight:780!important;
  letter-spacing:-.035em!important;
}
.rms-pro-brand p{
  font-size:9.5px!important;
  line-height:1.15!important;
  letter-spacing:.045em!important;
}
.rms-pro-nav{
  gap:13px!important;
  flex:0 1 auto!important;
  min-height:0!important;
}
.rms-pro-nav-group-title{
  margin:0 0 6px!important;
  padding:0 8px!important;
  color:rgba(203,213,225,.72)!important;
  font-size:11px!important;
  font-weight:800!important;
  letter-spacing:.055em!important;
}
.rms-pro-nav-list{
  gap:5px!important;
}
.rms-pro-nav-item{
  min-height:38px!important;
  height:38px!important;
  padding:0 10px!important;
  border-radius:10px!important;
  gap:10px!important;
  color:rgba(241,245,249,.90)!important;
  font-size:14px!important;
  font-weight:690!important;
  line-height:1.05!important;
  letter-spacing:-.01em!important;
  background:transparent!important;
  border-color:transparent!important;
  box-shadow:none!important;
  transform:none!important;
}
.rms-pro-nav-item:hover{
  background:rgba(59,130,246,.09)!important;
  border-color:rgba(96,165,250,.20)!important;
  color:#dbeafe!important;
  transform:none!important;
  box-shadow:none!important;
}
.rms-pro-nav-item.active{
  color:#60a5fa!important;
  background:rgba(37,99,235,.18)!important;
  border-color:rgba(96,165,250,.35)!important;
  box-shadow:inset 3px 0 0 #2563eb!important;
}
.rms-pro-nav-icon{
  width:22px!important;
  height:22px!important;
  min-width:22px!important;
  border-radius:8px!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  background:rgba(255,255,255,.045)!important;
  color:currentColor!important;
  font-size:0!important;
}
.rms-pro-nav-icon svg{
  width:18px!important;
  height:18px!important;
  display:block!important;
}
.rms-pro-sidebar-bottom{
  margin-top:auto!important;
  padding-top:10px!important;
  gap:8px!important;
  border-top:1px solid rgba(148,163,184,.12)!important;
}
.rms-pro-restaurant-select{
  min-height:42px!important;
  padding:0 12px!important;
  border-radius:10px!important;
  font-size:12px!important;
  background:rgba(15,23,42,.22)!important;
}
.rms-pro-user-card{
  padding:9px!important;
  gap:9px!important;
  border-radius:12px!important;
  background:rgba(15,23,42,.18)!important;
}
.rms-pro-avatar{
  width:35px!important;
  height:35px!important;
}
.rms-pro-user-name{
  font-size:12px!important;
  font-weight:800!important;
  max-width:130px!important;
}
.rms-pro-user-role{
  font-size:10.5px!important;
}
.rms-pro-logout{
  display:none!important;
}
.rms-pro-topbar{
  height:74px!important;
  background:rgba(255,255,255,.86)!important;
}
.rms-pro-topbar-title{
  font-size:20px!important;
  font-weight:800!important;
  letter-spacing:-.025em!important;
}
.rms-pro-topbar-actions{
  gap:18px!important;
}
.rms-pro-top-icon{
  color:#334155!important;
  font-size:0!important;
}
.rms-pro-top-icon svg{
  width:22px!important;
  height:22px!important;
}
.rms-pro-top-user{
  font-size:14px!important;
  font-weight:750!important;
}
.rms-pro-top-avatar{
  width:38px!important;
  height:38px!important;
  font-weight:800!important;
}
.rms-pro-content{
  max-width:none!important;
  padding:24px 24px 34px!important;
}
.rms-pro-shell .topbar h2,
.rms-pro-shell h2{
  font-weight:780!important;
  letter-spacing:-.035em!important;
}
.rms-pro-shell .card,
.rms-pro-shell .finance-line-chart-wrap,
.rms-pro-shell .table-wrap{
  border-radius:22px!important;
  box-shadow:0 16px 44px rgba(15,23,42,.052)!important;
}

    @media (max-width: 960px) {
      .app.rms-pro-shell {
        display: block;
      }
      .rms-pro-shell .sidebar.rms-pro-sidebar {
        position: relative;
        width: 100%;
        height: auto;
        min-height: auto;
        border-radius: 0 0 20px 20px;
      }
      .rms-pro-nav {
        gap: 12px;
      }
      .rms-pro-nav-list {
        flex-direction: row;
        overflow-x: auto;
      }
      .rms-pro-nav-item {
        min-width: max-content;
      }
      .rms-pro-sidebar-bottom {
        display: none;
      }
      .rms-pro-topbar {
        padding: 0 16px;
      }
      .rms-pro-content {
        padding: 16px;
      }
      .rms-pro-topbar-title {
        font-size: 17px;
      }
      .rms-pro-topbar-actions {
        gap: 6px;
      }
    }
  

/* v88 Finance & Dashboard Professional Cleanup */
/* v89 Finance Management Export & Health Pack */
.finance-pro-kpis { grid-template-columns: repeat(7, minmax(150px, 1fr)); }
.finance-pro-kpis .dash-kpi em { letter-spacing: .01em; }
.finance-head-main { display:flex; flex-direction:column; gap:8px; }
.finance-health-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:2px; }
.finance-health-pill { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800; border:1px solid rgba(15,23,42,.10); background:#f8fafc; color:#334155; }
.finance-health-pill.ok { background:#ecfdf5; color:#047857; border-color:#a7f3d0; }
.finance-health-pill.warn { background:#fffbeb; color:#92400e; border-color:#fde68a; }
.finance-health-pill.bad { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
.finance-head-actions { display:flex; gap:8px; justify-content:flex-end; align-items:end; flex-wrap:wrap; margin-top:8px; }
.finance-report-btn { white-space:nowrap; }
.finance-expense-row.food td:first-child::before,
.finance-expense-row.salary td:first-child::before,
.finance-expense-row.rent td:first-child::before,
.finance-expense-row.tax td:first-child::before { content: ''; display:inline-block; width:7px; height:7px; border-radius:999px; margin-right:8px; vertical-align:middle; }
.finance-expense-row.food td:first-child::before { background:#10b981; }
.finance-expense-row.salary td:first-child::before { background:#8b5cf6; }
.finance-expense-row.rent td:first-child::before { background:#f97316; }
.finance-expense-row.tax td:first-child::before { background:#ef4444; }
.table-actions { text-align:right; white-space:nowrap; }
@media (max-width: 1320px) { .finance-pro-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .finance-pro-kpis { grid-template-columns: 1fr; } }
`}</style>
}

const accessRank = (value) => ACCESS_LEVELS.indexOf(value || 'none')
const canReadAccess = (value) => accessRank(value) >= accessRank('read')

const fmt = (n) => Number(n || 0).toFixed(2)
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`
const parseNum = (v) => Number(String(v ?? '0').replace(',', '.').replace(/\s/g, '')) || 0
const supplierEntityKey = (supplierId, legalEntityId) => `${supplierId || ''}::${legalEntityId || ''}`
const normalizeExpenseText = (value) => String(value || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')
const isBazarExpenseName = (value) => {
  const name = normalizeExpenseText(value)
  return name === 'базар' || name === 'bazar' || name.includes('базар')
}

const isDsmfExpenseName = (value) => {
  const name = normalizeExpenseText(value)
  return name.includes('dsmf') || name.includes('dmsf') || name.includes('дсмф') || name.includes('дмсф') || name.includes('соц') || name.includes('sosial') || name.includes('social')
}
const isSalaryExpenseName = (value) => {
  const name = normalizeExpenseText(value)
  return name.includes('зарплат') || name.includes('salary') || name.includes('emek haqq') || name.includes('əmək haqq')
}
const RMS_LOGIN_GUARD_KEY = 'rms_login_guard_v1'
const RMS_LOGIN_MAX_FAILED_ATTEMPTS = 5
const RMS_LOGIN_LOCK_MS = 5 * 60 * 1000

const rmsLoginGuardLoginKey = (login) => normalizeInternalLogin(login) || String(login || '').trim().toLowerCase()
const rmsReadLoginGuard = () => readJsonStorage(RMS_LOGIN_GUARD_KEY, {}) || {}
const rmsWriteLoginGuard = (value) => writeJsonStorage(RMS_LOGIN_GUARD_KEY, value || {})
const rmsFormatLockTime = (ms) => {
  const totalSeconds = Math.max(1, Math.ceil(parseNum(ms) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds)}`
}
const rmsGetLoginGuardState = (login) => {
  const key = rmsLoginGuardLoginKey(login)
  const guard = rmsReadLoginGuard()
  const row = guard[key] || { attempts: 0, locked_until: 0 }
  const lockedUntil = parseNum(row.locked_until)
  const now = Date.now()
  if (lockedUntil > now) return { key, locked: true, attempts: parseNum(row.attempts), lockedUntil, remainingMs: lockedUntil - now }
  if (lockedUntil && lockedUntil <= now) {
    delete guard[key]
    rmsWriteLoginGuard(guard)
    return { key, locked: false, attempts: 0, lockedUntil: 0, remainingMs: 0 }
  }
  return { key, locked: false, attempts: parseNum(row.attempts), lockedUntil: 0, remainingMs: 0 }
}
const rmsRegisterFailedLogin = (login) => {
  const key = rmsLoginGuardLoginKey(login)
  const guard = rmsReadLoginGuard()
  const previous = guard[key] || { attempts: 0, locked_until: 0 }
  const now = Date.now()
  const activeLock = parseNum(previous.locked_until) > now
  if (activeLock) return rmsGetLoginGuardState(login)
  const attempts = parseNum(previous.attempts) + 1
  const lockedUntil = attempts >= RMS_LOGIN_MAX_FAILED_ATTEMPTS ? now + RMS_LOGIN_LOCK_MS : 0
  guard[key] = { attempts, locked_until: lockedUntil, updated_at: new Date().toISOString() }
  rmsWriteLoginGuard(guard)
  return rmsGetLoginGuardState(login)
}
const rmsClearLoginGuard = (login) => {
  const key = rmsLoginGuardLoginKey(login)
  const guard = rmsReadLoginGuard()
  if (guard[key]) {
    delete guard[key]
    rmsWriteLoginGuard(guard)
  }
}

const rmsFinanceExpenseGroupName = (name) => {
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

const rmsFinanceSupplierProductGroup = (product = {}) => {
  const value = normalizeExpenseText(`${product?.category || ''} ${product?.name || ''}`)
  if (value.includes('упаков') || value.includes('тара') || value.includes('однораз') || value.includes('стакан') || value.includes('крыш') || value.includes('контейнер') || value.includes('пакет') || value.includes('салфет') || value.includes('take away') || value.includes('takeaway') || value.includes('packaging')) return 'packaging'
  if (value.includes('хоз') || value.includes('хим') || value.includes('перчат') || value.includes('тряп') || value.includes('губк') || value.includes('моющ') || value.includes('уборк') || value.includes('cleaning')) return 'household'
  if (value.includes('бар') || value.includes('кухня') || value.includes('кофе') || value.includes('напит') || value.includes('food') || value.includes('продукт') || value.includes('мяс') || value.includes('рыб') || value.includes('овощ') || value.includes('молоч') || value.includes('бакале') || value.includes('соус') || value.includes('специ')) return 'food'
  return 'other'
}

const rmsFinancePurchaseTotalsByGroup = (rows = []) => (rows || []).reduce((totals, p) => {
  const items = p.supplier_purchase_items || []
  if (items.length) {
    items.forEach(i => {
      const group = rmsFinanceSupplierProductGroup(i.supplier_products || {})
      totals[group] = parseNum(totals[group]) + parseNum(i.total_amount)
    })
  } else {
    totals.food = parseNum(totals.food) + parseNum(p.total_amount)
  }
  return totals
}, { food: 0, packaging: 0, household: 0, other: 0 })

const rmsFinanceAllocatedSupplierTotals = (purchaseRows = [], share = 1) => {
  // Пока не делим поставщиков на кухня / бар / хозтовары / упаковку.
  // Вся сумма приходов поставщиков входит в FoodCost как “Поставщики”.
  const total = (purchaseRows || []).reduce((sum, p) => sum + parseNum(p.total_amount), 0)
  return {
    food: total * parseNum(share),
    packaging: 0,
    household: 0,
    other: 0
  }
}

const rmsFinanceOfficialDaysByEmployee = () => {
  try { return JSON.parse(localStorage.getItem('rms_employee_official_days') || '{}') } catch (_e) { return {} }
}
const rmsFinanceOfficialSalaryByEmployee = () => {
  try { return JSON.parse(localStorage.getItem('rms_employee_official_salary') || '{}') } catch (_e) { return {} }
}
const rmsFinancePayrollBaseByEmployee = (employeeRows = []) => {
  const officialDays = rmsFinanceOfficialDaysByEmployee()
  const officialSalary = rmsFinanceOfficialSalaryByEmployee()
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
const rmsFinancePayrollDetailsForScope = (employeeRows = [], selectedBranchId = 'all', revenueShareMap = new Map()) => {
  const baseMap = rmsFinancePayrollBaseByEmployee(employeeRows)
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
    } else if (selectedBranchId === 'all' || e.branch_id === selectedBranchId) {
      directSalary += base
      directDsmf += charges
    }
  })
  const branchShares = Array.from(revenueShareMap.values()).reduce((sum, value) => sum + parseNum(value), 0)
  const share = selectedBranchId === 'all' ? 1 : parseNum(revenueShareMap.get(selectedBranchId)) || (branchShares ? 0 : 0)
  const allocatedManagersSalary = selectedBranchId === 'all' ? managersSalary : managersSalary * share
  const allocatedManagersDsmf = selectedBranchId === 'all' ? managersDsmf : managersDsmf * share
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
const pad2 = (value) => String(value).padStart(2, '0')
const toLocalISODate = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
const todayISO = () => toLocalISODate(new Date())
const normalizeISODate = (value, fallback = todayISO()) => {
  const raw = String(value || '').trim()
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`
  const slash = raw.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/)
  if (slash) {
    // RMS uses Azerbaijani/Russian business date format: DD/MM/YYYY.
    // Do not auto-guess MM/DD/YYYY, because 08/06/2026 must mean 8 June, not 6 August.
    const day = Number(slash[1])
    const month = Number(slash[2])
    const y = slash[3]
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${y}-${pad2(month)}-${pad2(day)}`
  }
  return fallback
}
const parseISODateLocal = (value, fallback = todayISO()) => {
  const iso = normalizeISODate(value, fallback)
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const monthRangeFromISODate = (value = todayISO()) => {
  const anchor = parseISODateLocal(value)
  const year = anchor.getFullYear()
  const month = anchor.getMonth() + 1
  const from = `${year}-${pad2(month)}-01`
  const to = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`
  const toExclusive = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`
  return { from, to, toExclusive, year, month }
}
const sameISODate = (a, b) => normalizeISODate(a) === normalizeISODate(b)
const sameISOMonth = (a, b) => normalizeISODate(a).slice(0, 7) === normalizeISODate(b).slice(0, 7)
const sameISOYear = (a, b) => normalizeISODate(a).slice(0, 4) === normalizeISODate(b).slice(0, 4)
const RMS_SUPPLIERS_UPDATED_EVENT = 'rms:suppliers-updated'
function notifySuppliersUpdated() {
  try { window.dispatchEvent(new CustomEvent(RMS_SUPPLIERS_UPDATED_EVENT)) } catch (_) {}
}

const ADVANCE_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const canEditAdvance = (row) => row?.created_at ? (Date.now() - new Date(row.created_at).getTime()) <= ADVANCE_EDIT_WINDOW_MS : true
const canEditWithinWeek = (row) => row?.created_at ? (Date.now() - new Date(row.created_at).getTime()) <= EDIT_WINDOW_MS : true
const formatDateDMY = (value) => {
  if (!value) return '—'
  const raw = String(value).trim()
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${pad2(iso[3])}/${pad2(iso[2])}/${iso[1]}`
  const dmy = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (dmy) return `${pad2(dmy[1])}/${pad2(dmy[2])}/${dmy[3]}`
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return raw
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`
}
const formatDT = (value) => {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`
}
const dmyToISODate = (value) => {
  const raw = String(value || '').trim()
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`
  const dmy = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${dmy[3]}-${pad2(month)}-${pad2(day)}`
  }
  return ''
}
function DateInput({ value, onChange, className = '', placeholder = 'дд/мм/гггг', ...props }) {
  const nativeDateRef = useRef(null)
  const [displayValue, setDisplayValue] = useState(formatDateDMY(value))
  useEffect(() => { setDisplayValue(formatDateDMY(value)) }, [value])

  const commitISO = (isoValue) => {
    if (!isoValue) return
    const pretty = formatDateDMY(isoValue)
    setDisplayValue(pretty === '—' ? '' : pretty)
    if (onChange) onChange({ target: { value: isoValue } })
  }

  const emitISOIfComplete = (rawValue, force = false) => {
    const raw = String(rawValue || '').trim()
    const completeDMY = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.test(raw)
    const completeISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.test(raw)
    if (!raw) {
      if (force && onChange) onChange({ target: { value: '' } })
      return
    }
    if (!completeDMY && !completeISO) return
    const isoValue = dmyToISODate(raw)
    if (isoValue) commitISO(isoValue)
  }

  const openNativePicker = () => {
    const el = nativeDateRef.current
    if (!el) return
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker()
      } else {
        el.focus()
        el.click()
      }
    } catch (_e) {
      el.focus()
      el.click()
    }
  }

  return <span className="date-dmy-wrap">
    <input
      {...props}
      type="text"
      inputMode="numeric"
      className={`date-dmy-input ${className || ''}`.trim()}
      placeholder={placeholder}
      value={displayValue === '—' ? '' : displayValue}
      onClick={openNativePicker}
      onFocus={openNativePicker}
      onChange={e => {
        setDisplayValue(e.target.value)
        emitISOIfComplete(e.target.value, false)
      }}
      onBlur={e => {
        const isoValue = dmyToISODate(e.target.value)
        if (isoValue) {
          commitISO(isoValue)
        } else {
          setDisplayValue(formatDateDMY(value))
        }
      }}
    />
    <button type="button" className="date-dmy-picker-btn" onClick={openNativePicker} title="Выбрать дату" aria-label="Выбрать дату">📅</button>
    <input
      ref={nativeDateRef}
      type="date"
      className="date-dmy-native"
      tabIndex={-1}
      value={normalizeISODate(value || todayISO())}
      onChange={e => commitISO(e.target.value)}
      aria-hidden="true"
    />
  </span>
}

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
const monthStart = (year, month) => `${year}-${pad2(month)}-01`
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
  const p = String(position || '').trim().toLowerCase()
  if (p.includes('менедж') || p.includes('управ') || p.includes('директор') || p.includes('админ') || p.includes('закуп') || p.includes('smm') || p.includes('шеф-бар') || p.includes('шеф бар') || p.includes('brand') || p.includes('manager') || p.includes('director') || p.includes('admin')) return 'Менеджеры'
  if (p.includes('повар') || p.includes('кух') || p.includes('кухар') || p.includes('су-шеф') || p.includes('су шеф') || p.includes('шеф-повар') || p.includes('шеф повар') || p.includes('chef') || p.includes('cook') || p.includes('kitchen') || p.includes('aşpaz') || p.includes('ashpaz') || p.includes('povar')) return 'Повар'
  if (p.includes('бар') || p.includes('бариста') || p.includes('бармен') || p.includes('сервис') || p.includes('servis') || p.includes('service') || p.includes('barista') || p.includes('barmen')) return 'Бар'
  if (p.includes('стюард') || p.includes('стьюард') || p.includes('стюарт') || p.includes('стьюарт') || p.includes('stew')) return 'Стьюарт'
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

  const [snapshots, setSnapshots] = useState([])
  const [snapshotLoading, setSnapshotLoading] = useState(false)

  const loadSnapshots = async () => {
    try {
      const { data, error } = await supabase.rpc('rms_list_snapshots')
      if (error) throw error
      setSnapshots(data || [])
    } catch (e) {
      console.error('loadSnapshots error', e)
    }
  }

  const createSnapshot = async () => {
    try {
      setSnapshotLoading(true)
      const { data, error } = await supabase.rpc('rms_create_operational_snapshot', {
        p_snapshot_type: 'manual_ui'
      })
      if (error) throw error
      alert('Snapshot created: ' + data)
      await loadSnapshots()
    } catch (e) {
      console.error('createSnapshot error', e)
      alert(e.message || 'Snapshot error')
    } finally {
      setSnapshotLoading(false)
    }
  }

  const setLang = (value) => {
    localStorage.setItem('rms_lang', value)
    setLangState(value)
  }
  return [lang, setLang, (key) => I18N[lang]?.[key] || I18N.ru[key] || key]
}


const RMS_INTERNAL_USERS_KEY = 'rms_internal_users_v2'
const RMS_INTERNAL_PERMISSIONS_KEY = 'rms_internal_permissions_v2'
const RMS_INTERNAL_USERS_SETTING = 'internal_users_v2'
const RMS_INTERNAL_PERMISSIONS_SETTING = 'internal_permissions_v2'
const RMS_INTERNAL_SESSION_KEY = 'rms_internal_session_v2'
const RMS_LOGIN_GUARD_SETTING = 'internal_login_guard_v1'

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

const setInternalUsers = (users) => {
  const payload = users || {}
  writeJsonStorage(RMS_INTERNAL_USERS_KEY, payload)
  try { writeRmsAppSetting(RMS_INTERNAL_USERS_SETTING, payload) } catch (_e) {}
}

const getInternalPermissions = () =>
  readJsonStorage(RMS_INTERNAL_PERMISSIONS_KEY, null) ||
  readJsonStorage('rms_internal_permissions_v1', null) ||
  {}

const setInternalPermissions = (perms) => {
  const payload = perms || {}
  writeJsonStorage(RMS_INTERNAL_PERMISSIONS_KEY, payload)
  try { writeRmsAppSetting(RMS_INTERNAL_PERMISSIONS_SETTING, payload) } catch (_e) {}
}

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
const RMS_BRANCH_RENT_FORECAST_SETTING = 'branch_rent_forecast_v1'
const RMS_BRANCH_TAX_RATE_SETTING = 'branch_tax_rate_v1'
const RMS_HIDDEN_SALES_KEYS_SETTING = 'hidden_sales_keys'
const RMS_SALES_NAME_ALIASES_SETTING = 'sales_name_aliases'

const RMS_SOURCE_VERSION = 'main_v402_products_report_backup_style_loader_ring_fix'
const RMS_FULL_BACKUP_TABLES = [
  'branches',
  'expense_categories',
  'legal_entities',
  'user_profiles',
  'user_permissions',
  'employees',
  'employee_assignments',
  'employee_attendance',
  'employee_files',
  'salary_periods',
  'salary_advances',
  'salary_payments',
  'suppliers',
  'supplier_products',
  'supplier_purchases',
  'supplier_purchase_items',
  'supplier_payments',
  'supplier_balances',
  'supplier_balances_v2',
  'latest_product_costs',
  'daily_revenue',
  'daily_revenue_entries',
  'pos_orders',
  'pos_order_items',
  'daily_expenses',
  'daily_cash_register',
  'daily_cash_inflows',
  'monthly_branch_revenue',
  'monthly_branch_expenses',
  'monthly_branch_salary',
  'monthly_branch_service_charge_cost',
  'finance_operation_log',
  'menu_items',
  'recipe_items',
  'rms_sales_reports',
  'rms_app_settings'
]
const RMS_FULL_BACKUP_CHILD_FIRST_TABLES = [
  'recipe_items',
  'supplier_purchase_items',
  'supplier_payments',
  'supplier_purchases',
  'supplier_balances',
  'supplier_balances_v2',
  'latest_product_costs',
  'salary_payments',
  'salary_advances',
  'salary_periods',
  'employee_attendance',
  'employee_files',
  'employee_assignments',
  'pos_order_items',
  'pos_orders',
  'daily_revenue_entries',
  'daily_expenses',
  'daily_cash_register',
  'daily_cash_inflows',
  'monthly_branch_revenue',
  'monthly_branch_expenses',
  'monthly_branch_salary',
  'monthly_branch_service_charge_cost',
  'finance_operation_log',
  'menu_items',
  'supplier_products',
  'suppliers',
  'employees',
  'branches',
  'expense_categories',
  'legal_entities',
  'user_permissions',
  'user_profiles',
  'rms_sales_reports',
  'rms_app_settings'
]
const RMS_FULL_BACKUP_TABLE_KEY = (table) => table === 'rms_app_settings' ? 'key' : 'id'
const RMS_FULL_BACKUP_LOCAL_KEYS = [
  RMS_INTERNAL_USERS_KEY,
  RMS_INTERNAL_PERMISSIONS_KEY,
  RMS_INTERNAL_SESSION_KEY,
  RMS_INTERNAL_USERS_SETTING,
  RMS_INTERNAL_PERMISSIONS_SETTING,
  'rms_lang',
  'rms_theme',
  'rms_custom_logo',
  'rms_sales_reports_v1',
  'rms_sales_reports_v2',
  'rms_hidden_sales_keys',
  'rms_sales_name_aliases'
]


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
    const direct = await supabase
      .from(RMS_APP_SETTINGS_TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (!direct.error) return { error: null }

    const isRlsError = /row-level security|violates row-level security|permission denied/i.test(String(direct.error?.message || direct.error || ''))
    if (!isRlsError) return { error: direct.error }

    const rpc = await supabase.rpc('rms_app_setting_write_secure', {
      p_key: key,
      p_value: value
    })
    return { error: rpc.error || null, data: rpc.data || null }
  } catch (error) {
    try {
      const rpc = await supabase.rpc('rms_app_setting_write_secure', {
        p_key: key,
        p_value: value
      })
      return { error: rpc.error || null, data: rpc.data || null }
    } catch (rpcError) {
      return { error: rpcError || error }
    }
  }
}

async function deleteRmsAppSetting(key) {
  try {
    const direct = await supabase
      .from(RMS_APP_SETTINGS_TABLE)
      .delete()
      .eq('key', key)

    if (!direct.error) return { error: null }

    const isRlsError = /row-level security|violates row-level security|permission denied/i.test(String(direct.error?.message || direct.error || ''))
    if (!isRlsError) return { error: direct.error }

    const rpc = await supabase.rpc('rms_app_setting_delete_secure', { p_key: key })
    return { error: rpc.error || null, data: rpc.data || null }
  } catch (error) {
    try {
      const rpc = await supabase.rpc('rms_app_setting_delete_secure', { p_key: key })
      return { error: rpc.error || null, data: rpc.data || null }
    } catch (rpcError) {
      return { error: rpcError || error }
    }
  }
}

async function hydrateRmsInternalAuthFromCloud() {
  try {
    const [cloudUsers, cloudPerms] = await Promise.all([
      readRmsAppSetting(RMS_INTERNAL_USERS_SETTING, null),
      readRmsAppSetting(RMS_INTERNAL_PERMISSIONS_SETTING, null)
    ])

    const localUsers = getInternalUsers()
    const localPerms = getInternalPermissions()

    const cloudUsersObj = (cloudUsers && typeof cloudUsers === 'object' && !Array.isArray(cloudUsers)) ? cloudUsers : {}
    const cloudPermsObj = (cloudPerms && typeof cloudPerms === 'object' && !Array.isArray(cloudPerms)) ? cloudPerms : {}
    const localUsersObj = (localUsers && typeof localUsers === 'object' && !Array.isArray(localUsers)) ? localUsers : {}
    const localPermsObj = (localPerms && typeof localPerms === 'object' && !Array.isArray(localPerms)) ? localPerms : {}

    const hasCloudUsers = Object.keys(cloudUsersObj).length > 0
    const hasCloudPerms = Object.keys(cloudPermsObj).length > 0

    // v290: cloud is authoritative. A stale browser cache must never overwrite
    // a newer password, user state or permissions saved from another computer.
    const nextUsers = hasCloudUsers ? cloudUsersObj : localUsersObj
    const nextPerms = hasCloudPerms ? cloudPermsObj : localPermsObj

    if (Object.keys(nextUsers).length) writeJsonStorage(RMS_INTERNAL_USERS_KEY, nextUsers)
    if (Object.keys(nextPerms).length) writeJsonStorage(RMS_INTERNAL_PERMISSIONS_KEY, nextPerms)

    // Upload local data only when the cloud setting does not exist yet.
    if (!hasCloudUsers && Object.keys(localUsersObj).length) {
      await writeRmsAppSetting(RMS_INTERNAL_USERS_SETTING, localUsersObj)
    }
    if (!hasCloudPerms && Object.keys(localPermsObj).length) {
      await writeRmsAppSetting(RMS_INTERNAL_PERMISSIONS_SETTING, localPermsObj)
    }

    return { users: nextUsers, permissions: nextPerms, error: null }
  } catch (error) {
    return { users: getInternalUsers(), permissions: getInternalPermissions(), error }
  }
}


async function rmsReadSharedLoginGuard() {
  const cloud = await readRmsAppSetting(RMS_LOGIN_GUARD_SETTING, null)
  if (cloud && typeof cloud === 'object' && !Array.isArray(cloud)) {
    rmsWriteLoginGuard(cloud)
    return cloud
  }
  return rmsReadLoginGuard()
}

async function rmsGetSharedLoginGuardState(login) {
  const key = rmsLoginGuardLoginKey(login)
  const guard = await rmsReadSharedLoginGuard()
  const row = guard[key] || { attempts: 0, locked_until: 0 }
  const lockedUntil = parseNum(row.locked_until)
  const now = Date.now()
  if (lockedUntil > now) return { key, locked: true, attempts: parseNum(row.attempts), lockedUntil, remainingMs: lockedUntil - now }
  if (lockedUntil && lockedUntil <= now) {
    delete guard[key]
    rmsWriteLoginGuard(guard)
    await writeRmsAppSetting(RMS_LOGIN_GUARD_SETTING, guard)
  }
  return { key, locked: false, attempts: 0, lockedUntil: 0, remainingMs: 0 }
}

async function rmsRegisterSharedFailedLogin(login) {
  const key = rmsLoginGuardLoginKey(login)
  const guard = await rmsReadSharedLoginGuard()
  const previous = guard[key] || { attempts: 0, locked_until: 0 }
  const now = Date.now()
  if (parseNum(previous.locked_until) > now) return rmsGetSharedLoginGuardState(login)
  const attempts = parseNum(previous.attempts) + 1
  const lockedUntil = attempts >= RMS_LOGIN_MAX_FAILED_ATTEMPTS ? now + RMS_LOGIN_LOCK_MS : 0
  guard[key] = { attempts, locked_until: lockedUntil, updated_at: new Date().toISOString() }
  rmsWriteLoginGuard(guard)
  await writeRmsAppSetting(RMS_LOGIN_GUARD_SETTING, guard)
  return rmsGetSharedLoginGuardState(login)
}

async function rmsClearSharedLoginGuard(login) {
  const key = rmsLoginGuardLoginKey(login)
  const guard = await rmsReadSharedLoginGuard()
  delete guard[key]
  rmsWriteLoginGuard(guard)
  await writeRmsAppSetting(RMS_LOGIN_GUARD_SETTING, guard)
}

async function persistInternalUsersShared(users) {
  const payload = users || {}
  writeJsonStorage(RMS_INTERNAL_USERS_KEY, payload)
  const result = await writeRmsAppSetting(RMS_INTERNAL_USERS_SETTING, payload)
  if (result?.error) throw result.error
  return payload
}

async function persistInternalPermissionsShared(perms) {
  const payload = perms || {}
  writeJsonStorage(RMS_INTERNAL_PERMISSIONS_KEY, payload)
  const result = await writeRmsAppSetting(RMS_INTERNAL_PERMISSIONS_SETTING, payload)
  if (result?.error) throw result.error
  return payload
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

class RmsSectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error, info) {
    console.error('RMS section render error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return <section className="card span-2">
      <h3>Раздел временно не загрузился</h3>
      <p className="hint">Обновите страницу и попробуйте открыть раздел ещё раз.</p>
      <button type="button" className="small" onClick={() => this.setState({ error: null })}>Повторить</button>
    </section>
  }
}


function BackupProgressOverlay({ state }) {
  if (!state?.active) return null
  const progress = Math.max(0, Math.min(100, Math.round(Number(state.progress) || 0)))
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress / 100)
  const isError = state.status === 'error'
  const isSuccess = state.status === 'success'

  return <div className="backup-progress-overlay" role="status" aria-live="polite" aria-label={`${state.title || 'Операция с данными'}: ${progress}%`}>
    <div className={`backup-progress-card ${isError ? 'is-error' : ''} ${isSuccess ? 'is-success' : ''}`}>
      <div className="backup-progress-ring-wrap">
        <svg className="backup-progress-ring" viewBox="0 0 128 128" aria-hidden="true">
          <circle className="backup-progress-ring-bg" cx="64" cy="64" r={radius} fill="none" />
          <circle
            className="backup-progress-ring-value"
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="backup-progress-percent"><strong>{progress}</strong><span>%</span></div>
      </div>
      <div className="backup-progress-copy">
        <span className="backup-progress-eyebrow">RMS DATA CENTER</span>
        <h3>{state.title || 'Выполняется операция'}</h3>
        <p>{state.detail || 'Подготовка данных…'}</p>
        <div className="backup-progress-track"><div style={{ width: `${progress}%` }} /></div>
        <div className="backup-progress-footer">
          <span>{state.step || (isSuccess ? 'Операция завершена' : isError ? 'Операция остановлена' : 'Не закрывайте страницу')}</span>
          <b>{progress} / 100</b>
        </div>
      </div>
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
    role: localUser.role || (login === 'admin' ? 'admin' : 'employee'),
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




function SecurityRecoveryCenter({ embedded = false } = {}) {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  useRmsStatusToast(message)

  useEffect(() => () => {
    if (purchaseItemsSaveProgressTimerRef.current) clearInterval(purchaseItemsSaveProgressTimerRef.current)
    if (purchaseItemsSaveProgressHideTimerRef.current) clearTimeout(purchaseItemsSaveProgressHideTimerRef.current)
  }, [])
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [compareResult, setCompareResult] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreResult, setRestoreResult] = useState(null)
  const [supplierAuditRows, setSupplierAuditRows] = useState([])
  const [supplierAuditLoading, setSupplierAuditLoading] = useState(false)
  const [showSupplierAuditDetails, setShowSupplierAuditDetails] = useState(false)
  const [financeFormulaDiagnostics, setFinanceFormulaDiagnostics] = useState([])
  const [financeForecastDiagnostics, setFinanceForecastDiagnostics] = useState([])
  const [showFinanceDiagnosticsDetails, setShowFinanceDiagnosticsDetails] = useState(false)
  const [revenueAuditRows, setRevenueAuditRows] = useState([])
  const [revenueAuditLoading, setRevenueAuditLoading] = useState(false)
  const [showRevenueAuditDetails, setShowRevenueAuditDetails] = useState(false)

  const loadFinanceDiagnostics = () => {
    try {
      const formula = JSON.parse(localStorage.getItem('rms_finance_formula_audit_v78') || '[]')
      const forecast = JSON.parse(localStorage.getItem('rms_finance_forecast_audit_v78') || '[]')
      setFinanceFormulaDiagnostics(Array.isArray(formula) ? formula : [])
      setFinanceForecastDiagnostics(Array.isArray(forecast) ? forecast : [])
    } catch (_) {
      setFinanceFormulaDiagnostics([])
      setFinanceForecastDiagnostics([])
    }
  }

  const loadSupplierEnterpriseAudit = async () => {
    setSupplierAuditLoading(true)
    try {
      const { data, error } = await supabase.from('supplier_enterprise_audit_view').select('*')
      if (error) throw error
      setSupplierAuditRows(data || [])
    } catch (e) {
      setSupplierAuditRows([])
      setMessage(e?.message || 'Не удалось загрузить supplier audit')
    } finally {
      setSupplierAuditLoading(false)
    }
  }

  const loadRevenueDiagnostics = async () => {
    setRevenueAuditLoading(true)
    try {
      const { data, error } = await supabase
        .from('revenue_enterprise_audit_view')
        .select('*')
        .order('audit_date', { ascending: false })
        .limit(300)
      if (error) throw error
      setRevenueAuditRows(data || [])
    } catch (e) {
      setRevenueAuditRows([])
      setMessage(e?.message || 'Не удалось загрузить revenue audit')
    } finally {
      setRevenueAuditLoading(false)
    }
  }

  const revenueAuditProblemRows = (revenueAuditRows || []).filter(r => (r.status || 'ok') !== 'ok' || Math.abs(parseNum(r.diff)) > 0.01)
  const revenueAuditTotals = (revenueAuditRows || []).reduce((acc, r) => {
    acc.source += parseNum(r.source_amount)
    acc.aggregate += parseNum(r.aggregate_amount)
    acc.diff += parseNum(r.diff)
    return acc
  }, { source: 0, aggregate: 0, diff: 0 })
  const revenueAuditOk = !revenueAuditProblemRows.length && Math.abs(parseNum(revenueAuditTotals.diff)) <= 0.01

  const supplierAuditCriticalRows = (supplierAuditRows || []).filter(r => (r.issue_type || 'ok') !== 'ok' || Math.abs(parseNum(r.diff)) > 0.01)
  const supplierAuditTotals = (supplierAuditRows || []).reduce((acc, r) => {
    acc.source += parseNum(r.source_balance)
    acc.ledger += parseNum(r.ledger_balance)
    acc.diff += parseNum(r.diff)
    return acc
  }, { source: 0, ledger: 0, diff: 0 })
  const supplierAuditOk = !supplierAuditCriticalRows.length && Math.abs(parseNum(supplierAuditTotals.diff)) <= 0.01

  const loadSnapshots = async () => {
    setLoading(true)
    setMessage('')
    try {
      const { data, error } = await supabase.rpc('rms_list_snapshots')
      if (error) throw error
      setSnapshots(data || [])
    } catch (e) {
      setMessage(e?.message || 'Не удалось загрузить snapshots')
    } finally {
      setLoading(false)
    }
  }

  const previewSnapshot = async (id) => {
    setPreviewLoading(true)
    try {
      const { data, error } = await supabase.rpc('rms_get_snapshot_details', {
        p_snapshot_id: id
      })
      if (error) throw error
      setPreview(data || null)
    } catch (e) {
      alert(e?.message || 'Preview error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const compareSnapshot = async (id) => {
    setCompareLoading(true)
    try {
      const { data, error } = await supabase.rpc('rms_compare_snapshot_with_current', {
        p_snapshot_id: id
      })
      if (error) throw error
      setCompareResult(data || null)
    } catch (e) {
      alert(e?.message || 'Compare error')
    } finally {
      setCompareLoading(false)
    }
  }


  const restoreMissingSnapshot = async (id) => {
    const confirmed = window.confirm(
      'Restore ONLY missing rows from this snapshot? Current data will NOT be deleted.'
    )

    if (!confirmed) return

    setRestoreLoading(true)

    try {
      const { data, error } = await supabase.rpc(
        'rms_restore_snapshot_missing_operational',
        {
          p_snapshot_id: id,
          p_scope: 'operational'
        }
      )

      if (error) throw error

      setRestoreResult(data || null)

      alert(
        `Restore complete. Revenue restored: ${data?.revenue_restored || 0}, Expenses restored: ${data?.expense_restored || 0}`
      )
    } catch (e) {
      alert(e?.message || 'Restore failed')
    } finally {
      setRestoreLoading(false)
    }
  }


  const createSnapshot = async () => {
    setLoading(true)
    setMessage('')
    try {
      const { data, error } = await supabase.rpc('rms_create_operational_snapshot', {
        p_snapshot_type: 'manual_ui'
      })
      if (error) throw error
      setMessage(`Snapshot создан: ${data}`)
      await loadSnapshots()
    } catch (e) {
      setMessage(e?.message || 'Не удалось создать snapshot')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSnapshots(); loadSupplierEnterpriseAudit(); loadFinanceDiagnostics(); loadRevenueDiagnostics() }, [])

  return (
    <section className={`space-y-6 ${embedded ? 'security-center-embedded' : ''}`}>
      <section className={embedded ? 'card security-center-header' : 'topbar'}>
        <div>
          <h2>Безопасность и диагностика</h2>
          <p>Снимки данных, аудит, восстановление и контроль целостности операций.</p>
        </div>
        <button className="primary" onClick={createSnapshot} disabled={loading}>
          {loading ? 'Создание...' : 'Create Snapshot'}
        </button>
      </section>

      {message ? <p className="hint">{message}</p> : null}

      <section className="card span-2">
        <div className="card-head">
          <div>
            <h3>Operational Snapshots</h3>
            <p className="hint">Снимки operational data: выручка, расходы, ledger и ERP events.</p>
          </div>
          <button className="small" onClick={loadSnapshots} disabled={loading}>Обновить</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Type</th>
                <th>Scope</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Ledger</th>
                <th>Events</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(snapshots || []).map((s) => (
                <tr key={s.id}>
                  <td>{String(s.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                  <td>{s.snapshot_type}</td>
                  <td>{s.snapshot_scope}</td>
                  <td>{s.revenue_rows}</td>
                  <td>{s.expense_rows}</td>
                  <td>{s.ledger_rows}</td>
                  <td>{s.event_rows}</td>
                  <td>
                    <div style={{display:'flex',gap:8}}>
                      <button className="small" onClick={() => previewSnapshot(s.id)}>
                        Preview
                      </button>

                      <button className="small" onClick={() => compareSnapshot(s.id)}>
                        Compare
                      </button>

                      <button
                        className="small"
                        onClick={() => restoreMissingSnapshot(s.id)}
                        disabled={restoreLoading}
                      >
                        {restoreLoading ? 'Restoring...' : 'Restore Missing'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!snapshots?.length && (
                <tr>
                  <td colSpan="8" className="hint">Snapshots пока нет.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card span-2 supplier-enterprise-audit-card">
        <div className="card-head">
          <div>
            <h3>Diagnostics Center · Supplier audit</h3>
            <p className="hint">Техническая сверка: стартовый долг + поступления − оплаты против supplier_ledger.</p>
          </div>
          <div className="action-row">
            <button className="ghost small" onClick={() => setShowSupplierAuditDetails(v => !v)}>{showSupplierAuditDetails ? 'Скрыть детали' : 'Показать детали'}</button>
            <button className="ghost small" onClick={loadSupplierEnterpriseAudit} disabled={supplierAuditLoading}>{supplierAuditLoading ? 'Обновление...' : 'Обновить'}</button>
          </div>
        </div>
        <div className={supplierAuditOk ? 'enterprise-audit-banner audit-ok' : 'enterprise-audit-banner audit-bad'}>
          <strong>{supplierAuditOk ? 'Enterprise OK' : 'Требуется проверка'}</strong>
          <span>{supplierAuditOk ? 'Источник операций и supplier_ledger совпадают.' : 'Найдены расхождения supplier ledger.'}</span>
        </div>
        <div className="mini-grid">
          <div className="metric"><span>Source balance</span><strong>{fmt(supplierAuditTotals.source)}</strong></div>
          <div className="metric"><span>Ledger balance</span><strong>{fmt(supplierAuditTotals.ledger)}</strong></div>
          <div className="metric"><span>Разница</span><strong className={Math.abs(supplierAuditTotals.diff) > 0.01 ? 'bad' : 'good'}>{fmt(supplierAuditTotals.diff)}</strong></div>
        </div>
        {(showSupplierAuditDetails || !supplierAuditOk) && <div className="table-wrap"><table><thead><tr><th>Статус</th><th>Поставщик</th><th>VOEN</th><th>Source</th><th>Ledger</th><th>Diff</th></tr></thead><tbody>{supplierAuditCriticalRows.slice(0, 30).map(r => <tr key={`${r.supplier_id || 'none'}-${r.legal_entity_id || 'none'}`}><td><span className={r.issue_type === 'ok' ? 'good' : 'bad'}>{r.issue_type || 'ok'}</span></td><td>{r.supplier_name || '—'}</td><td>{r.legal_entity_name || '—'}<br /><span className="hint">{r.legal_entity_voen || ''}</span></td><td>{fmt(r.source_balance)}</td><td>{fmt(r.ledger_balance)}</td><td className={Math.abs(parseNum(r.diff)) > 0.01 ? 'bad' : 'good'}><b>{fmt(r.diff)}</b></td></tr>)}{!supplierAuditCriticalRows.length && <tr><td colSpan="6" className="good">Расхождений не найдено</td></tr>}</tbody></table></div>}
      </section>

      <section className="card span-2 supplier-enterprise-audit-card">
        <div className="card-head">
          <div>
            <h3>Diagnostics Center · Finance audit</h3>
            <p className="hint">Техническая сверка формулы прибыли и прогноза Dashboard / Finance.</p>
          </div>
          <div className="action-row">
            <button className="ghost small" onClick={() => setShowFinanceDiagnosticsDetails(v => !v)}>{showFinanceDiagnosticsDetails ? 'Скрыть детали' : 'Показать детали'}</button>
            <button className="ghost small" onClick={loadFinanceDiagnostics}>Обновить</button>
          </div>
        </div>
        <div className="mini-grid">
          <div className="metric"><span>Formula audit</span><strong>{financeFormulaDiagnostics.length ? 'OK' : 'Пока нет данных'}</strong></div>
          <div className="metric"><span>Forecast audit</span><strong>{financeForecastDiagnostics.length ? 'OK' : 'Пока нет данных'}</strong></div>
          <div className="metric"><span>Статус</span><strong className={(financeFormulaDiagnostics.length || financeForecastDiagnostics.length) ? 'good' : ''}>{(financeFormulaDiagnostics.length || financeForecastDiagnostics.length) ? 'Данные загружены' : 'Откройте Финансы'}</strong></div>
        </div>
        {showFinanceDiagnosticsDetails && <>
          <div className="table-wrap"><table><thead><tr><th colSpan="3">Finance formula audit</th></tr><tr><th>Показатель</th><th>Сумма</th><th>Источник / логика</th></tr></thead><tbody>{financeFormulaDiagnostics.map(row => <tr key={row.name}><td><b>{row.name}</b></td><td className={row.name.includes('Расхождения') || row.name.includes('Контроль') ? (Math.abs(parseNum(row.amount)) > 0.01 ? 'bad' : 'good') : ''}>{fmt(row.amount)}</td><td className="hint">{row.note}</td></tr>)}{!financeFormulaDiagnostics.length && <tr><td colSpan="3" className="hint">Пока нет данных. Откройте раздел “Финансы”, чтобы обновить расчёт.</td></tr>}</tbody></table></div>
          <div className="table-wrap"><table><thead><tr><th colSpan="3">Dashboard / Finance forecast parity</th></tr><tr><th>Показатель</th><th>Сумма</th><th>Источник / логика</th></tr></thead><tbody>{financeForecastDiagnostics.map(row => <tr key={row.name}><td><b>{row.name}</b></td><td className={row.name.includes('Контроль') ? (Math.abs(parseNum(row.amount)) > 0.01 ? 'bad' : 'good') : ''}>{fmt(row.amount)}</td><td className="hint">{row.note}</td></tr>)}{!financeForecastDiagnostics.length && <tr><td colSpan="3" className="hint">Пока нет данных. Откройте раздел “Финансы”, чтобы обновить расчёт.</td></tr>}</tbody></table></div>
        </>}
      </section>

      <section className="card span-2 supplier-enterprise-audit-card">
        <div className="card-head">
          <div>
            <h3>Diagnostics Center · Revenue audit</h3>
            <p className="hint">Техническая сверка: строки выручки против агрегированной daily_revenue.</p>
          </div>
          <div className="action-row">
            <button className="ghost small" onClick={() => setShowRevenueAuditDetails(v => !v)}>{showRevenueAuditDetails ? 'Скрыть детали' : 'Показать детали'}</button>
            <button className="ghost small" onClick={loadRevenueDiagnostics} disabled={revenueAuditLoading}>{revenueAuditLoading ? 'Обновление...' : 'Обновить'}</button>
          </div>
        </div>
        <div className={revenueAuditOk ? 'enterprise-audit-banner audit-ok' : 'enterprise-audit-banner audit-bad'}>
          <strong>{revenueAuditOk ? 'Revenue OK' : 'Требуется проверка'}</strong>
          <span>{revenueAuditOk ? 'Строки выручки и daily_revenue совпадают.' : 'Найдены расхождения агрегированной выручки.'}</span>
        </div>
        <div className="mini-grid">
          <div className="metric"><span>Entries total</span><strong>{fmt(revenueAuditTotals.source)}</strong></div>
          <div className="metric"><span>Daily revenue</span><strong>{fmt(revenueAuditTotals.aggregate)}</strong></div>
          <div className="metric"><span>Разница</span><strong className={Math.abs(revenueAuditTotals.diff) > 0.01 ? 'bad' : 'good'}>{fmt(revenueAuditTotals.diff)}</strong></div>
        </div>
        {(showRevenueAuditDetails || !revenueAuditOk) && <div className="table-wrap"><table><thead><tr><th>Статус</th><th>Дата</th><th>Филиал</th><th>Entries</th><th>Daily</th><th>Diff</th></tr></thead><tbody>{revenueAuditProblemRows.slice(0, 50).map(r => <tr key={`${r.audit_type || 'revenue'}-${r.branch_id || 'none'}-${r.audit_date || 'none'}`}><td><span className={(r.status || 'ok') === 'ok' ? 'good' : 'bad'}>{r.status || 'ok'}</span></td><td>{r.audit_date || '—'}</td><td>{r.branch_name || '—'}</td><td>{fmt(r.source_amount)}</td><td>{fmt(r.aggregate_amount)}</td><td className={Math.abs(parseNum(r.diff)) > 0.01 ? 'bad' : 'good'}><b>{fmt(r.diff)}</b></td></tr>)}{!revenueAuditProblemRows.length && <tr><td colSpan="6" className="good">Расхождений не найдено</td></tr>}</tbody></table></div>}
      </section>

      {restoreResult && (
        <section className="card span-2">
          <div className="card-head">
            <div>
              <h3>Restore Result</h3>
              <p className="hint">
                Missing rows restored safely without TRUNCATE or DELETE.
              </p>
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <h3>Revenue Restored</h3>
              <p style={{fontSize:28,fontWeight:800}}>
                {restoreResult.revenue_restored || 0}
              </p>
            </div>

            <div className="card">
              <h3>Expenses Restored</h3>
              <p style={{fontSize:28,fontWeight:800}}>
                {restoreResult.expense_restored || 0}
              </p>
            </div>

            <div className="card">
              <h3>Scope</h3>
              <p style={{fontSize:20,fontWeight:700}}>
                {restoreResult.scope}
              </p>
            </div>

            <div className="card">
              <h3>Event ID</h3>
              <p className="hint" style={{wordBreak:'break-all'}}>
                {restoreResult.event_id}
              </p>
            </div>
          </div>
        </section>
      )}


{compareResult && (
        <section className="card span-2">
          <div className="card-head">
            <div>
              <h3>Snapshot Compare Result</h3>
              <p className="hint">
                Current database vs selected snapshot.
              </p>
            </div>
          </div>

          {compareLoading && <p className="hint">Comparing...</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Snapshot Rows</th>
                  <th>Current Rows</th>
                  <th>Missing From Current</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>daily_revenue</td>
                  <td>{compareResult.daily_revenue?.snapshot_rows}</td>
                  <td>{compareResult.daily_revenue?.current_rows}</td>
                  <td>{(compareResult.daily_revenue?.missing_from_current || []).length}</td>
                </tr>

                <tr>
                  <td>daily_expenses</td>
                  <td>{compareResult.daily_expenses?.snapshot_rows}</td>
                  <td>{compareResult.daily_expenses?.current_rows}</td>
                  <td>{(compareResult.daily_expenses?.missing_from_current || []).length}</td>
                </tr>

                <tr>
                  <td>finance_ledger</td>
                  <td>{compareResult.finance_ledger?.snapshot_rows}</td>
                  <td>{compareResult.finance_ledger?.current_rows}</td>
                  <td>{(compareResult.finance_ledger?.missing_from_current || []).length}</td>
                </tr>

                <tr>
                  <td>erp_events</td>
                  <td>{compareResult.erp_events?.snapshot_rows}</td>
                  <td>{compareResult.erp_events?.current_rows}</td>
                  <td>{(compareResult.erp_events?.missing_from_current || []).length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}


{preview && (
        <section className="card span-2">
          <div className="card-head">
            <div>
              <h3>Snapshot Preview</h3>
              <p className="hint">
                {preview.snapshot_type} · {String(preview.created_at || '').slice(0,19).replace('T',' ')}
              </p>
            </div>
          </div>

          {previewLoading && <p className="hint">Loading...</p>}

          <div className="grid">
            <div className="card">
              <h3>Revenue Rows</h3>
              <p style={{fontSize:28,fontWeight:800}}>
                {(preview.daily_revenue || []).length}
              </p>
            </div>

            <div className="card">
              <h3>Expense Rows</h3>
              <p style={{fontSize:28,fontWeight:800}}>
                {(preview.daily_expenses || []).length}
              </p>
            </div>

            <div className="card">
              <h3>Ledger Rows</h3>
              <p style={{fontSize:28,fontWeight:800}}>
                {(preview.finance_ledger || []).length}
              </p>
            </div>

            <div className="card">
              <h3>ERP Events</h3>
              <p style={{fontSize:28,fontWeight:800}}>
                {(preview.erp_events || []).length}
              </p>
            </div>
          </div>

          <div className="card span-2">
            <div className="card-head">
              <div>
                <h3>Revenue Preview</h3>
                <p className="hint">Последние строки выручки внутри snapshot.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Cash</th>
                    <th>Bank</th>
                    <th>Wolt</th>
                    <th>Deleted</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.daily_revenue || []).slice(-20).reverse().map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td>{r.revenue_date}</td>
                      <td>{r.branch_id}</td>
                      <td>{r.cash_amount}</td>
                      <td>{r.bank_amount}</td>
                      <td>{r.wolt_amount}</td>
                      <td>{r.deleted_at ? 'yes' : 'no'}</td>
                      <td>{r.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card span-2">
            <div className="card-head">
              <div>
                <h3>Expenses Preview</h3>
                <p className="hint">Последние расходы внутри snapshot.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Deleted</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.daily_expenses || []).slice(-20).reverse().map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td>{r.expense_date}</td>
                      <td>{r.branch_id}</td>
                      <td>{r.custom_category || r.category_id}</td>
                      <td>{r.amount}</td>
                      <td>{r.deleted_at ? 'yes' : 'no'}</td>
                      <td>{r.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card span-2">
            <div className="card-head">
              <div>
                <h3>Finance Ledger Preview</h3>
                <p className="hint">Последние бухгалтерские записи snapshot.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entry</th>
                    <th>Entity</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.finance_ledger || []).slice(-20).reverse().map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td>{r.ledger_date}</td>
                      <td>{r.entry_type}</td>
                      <td>{r.entity_type}</td>
                      <td>{r.debit_amount}</td>
                      <td>{r.credit_amount}</td>
                      <td>{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card span-2">
            <div className="card-head">
              <div>
                <h3>ERP Events Preview</h3>
                <p className="hint">Последние события immutable event log.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Event</th>
                    <th>Entity</th>
                    <th>Source</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.erp_events || []).slice(-20).reverse().map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td>{String(r.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                      <td>{r.event_type}</td>
                      <td>{r.entity_type}</td>
                      <td>{r.action_source}</td>
                      <td>{r.user_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </section>
  )
}





// v167 iiko Frontend Import Parser Pack helpers
function rmsIikoNormalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function rmsIikoPick(row, keys) {
  if (!row || typeof row !== 'object') return ''
  const normalized = {}
  Object.keys(row).forEach(k => { normalized[rmsIikoNormalizeKey(k)] = row[k] })
  for (const key of keys) {
    const nk = rmsIikoNormalizeKey(key)
    if (Object.prototype.hasOwnProperty.call(normalized, nk)) return normalized[nk]
  }
  return ''
}

function rmsIikoToNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value)
    .replace(/\s/g, '')
    .replace(/AZN|₼|ман|руб|₽/gi, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function rmsIikoToDate(value) {
  if (!value) return null
  const s = String(value).trim()
  if (!s) return null
  const iso = Date.parse(s)
  if (!Number.isNaN(iso)) return new Date(iso).toISOString().slice(0, 10)
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/)
  if (m) {
    const dd = String(m[1]).padStart(2, '0')
    const mm = String(m[2]).padStart(2, '0')
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${yy}-${mm}-${dd}`
  }
  return null
}

function rmsIikoMapRawRowToPayload(row = {}, fallback = {}) {
  const productName = rmsIikoPick(row, [
    'product_name','name','item_name','dish_name','menu_item_name','product','nomenclature',
    'Наименование','Название','Блюдо','Товар','Номенклатура','Dish','Item','Product'
  ])
  const categoryName = rmsIikoPick(row, [
    'category_name','category','group','parent','Группа','Категория','Раздел','Category'
  ])
  const qty = rmsIikoToNumber(rmsIikoPick(row, [
    'qty','quantity','count','amount','sold_qty','qty_sold','sales_qty',
    'Кол-во','Количество','Количество продаж','Qty','Quantity'
  ]))
  const price = rmsIikoToNumber(rmsIikoPick(row, [
    'price','unit_price','Цена','Цена без скидки','Price'
  ]))
  const discount = rmsIikoToNumber(rmsIikoPick(row, [
    'discount','discount_sum','Скидка','Discount'
  ]))
  const total = rmsIikoToNumber(rmsIikoPick(row, [
    'total','sum','amount_total','revenue','Сумма','Итого','Выручка','Total','Sum'
  ])) || Math.max(qty * price - discount, 0)
  const branchName = rmsIikoPick(row, [
    'branch_name','branch','restaurant','restaurant_name','Филиал','Ресторан','Outlet'
  ]) || fallback.branch_name || ''
  const businessDate = rmsIikoToDate(rmsIikoPick(row, [
    'business_date','date','Дата','Дата продажи','Sale date'
  ]) || fallback.business_date)

  return {
    branch_name: branchName,
    business_date: businessDate,
    sale_datetime: rmsIikoPick(row, ['sale_datetime','datetime','Дата/время','DateTime']) || null,
    iiko_order_id: rmsIikoPick(row, ['iiko_order_id','order_id','Order ID','Заказ']) || '',
    iiko_cheque_id: rmsIikoPick(row, ['iiko_cheque_id','cheque_id','check_id','Чек']) || '',
    iiko_product_id: rmsIikoPick(row, ['iiko_product_id','product_id','id товара','Product ID']) || '',
    product_name: String(productName || '').trim(),
    category_name: String(categoryName || '').trim(),
    qty,
    price,
    discount,
    total,
    payment_type: rmsIikoPick(row, ['payment_type','payment','Оплата','Тип оплаты']) || '',
    table_name: rmsIikoPick(row, ['table_name','table','Стол']) || '',
    waiter_name: rmsIikoPick(row, ['waiter_name','waiter','Официант']) || '',
    is_refund: String(rmsIikoPick(row, ['is_refund','refund','Возврат']) || '').toLowerCase().includes('true'),
    raw_row: row,
  }
}

async function rmsIikoImportParsedRows(fileName, rows, fallback = {}) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Нет строк для импорта')
  const importRes = await supabase.rpc('rms_iiko_sales_import_create', {
    p_file_name: fileName || 'iiko import',
    p_comment: 'Frontend parsed import'
  })
  if (importRes.error) throw importRes.error
  const importId = importRes.data?.id || importRes.data?.import_id || importRes.data?.id

  let inserted = 0
  let skipped = 0
  for (const raw of rows) {
    const payload = rmsIikoMapRawRowToPayload(raw, fallback)
    if (!payload.product_name || !payload.qty) {
      skipped += 1
      continue
    }
    const r = await supabase.rpc('rms_iiko_sales_item_insert_secure', {
      p_import_id: importId,
      p_payload: payload
    })
    if (r.error || r.data?.status === 'error') skipped += 1
    else inserted += 1
  }

  const finalRes = await supabase.rpc('rms_iiko_sales_import_finalize', { p_import_id: importId })
  if (finalRes.error) throw finalRes.error
  return { import_id: importId, inserted, skipped, finalize: finalRes.data }
}


function InventoryModule({ t, branches = [] }) {
  const today = todayISO()
  const [activeTab, setActiveTab] = React.useState('overview')
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  useRmsStatusToast(message)

  const [balances, setBalances] = React.useState([])
  const [movements, setMovements] = React.useState([])
  const [locations, setLocations] = React.useState([])
  const [supplierProducts, setSupplierProducts] = React.useState([])
  const [latestCosts, setLatestCosts] = React.useState([])
  const [semis, setSemis] = React.useState([])
  const [semiItems, setSemiItems] = React.useState([])
  const [documents, setDocuments] = React.useState([])
  const [itemSettings, setItemSettings] = React.useState([])
  const [workspaceReady, setWorkspaceReady] = React.useState(true)
  const [systemHealth, setSystemHealth] = React.useState(null)

  const [stockSearch, setStockSearch] = React.useState('')
  const [stockLocationFilter, setStockLocationFilter] = React.useState('all')
  const [stockStatusFilter, setStockStatusFilter] = React.useState('all')
  const [movementSearch, setMovementSearch] = React.useState('')
  const [movementTypeFilter, setMovementTypeFilter] = React.useState('all')
  const [documentStatusFilter, setDocumentStatusFilter] = React.useState('all')
  const [minStockDraft, setMinStockDraft] = React.useState({})

  const emptyLine = { catalog_key: '', quantity: '', unit_cost: '', comment: '' }

  const [receiptDraft, setReceiptDraft] = React.useState({
    document_date: today,
    target_location_id: '',
    reason: 'Начальные остатки',
    comment: '',
    items: []
  })
  const [receiptLine, setReceiptLine] = React.useState({
    ...emptyLine,
    catalog_key: '',
    manual_name: '',
    manual_unit: 'kg',
    manual_type: 'product'
  })

  const [transferDraft, setTransferDraft] = React.useState({
    document_date: today,
    source_location_id: '',
    target_location_id: '',
    comment: '',
    items: []
  })
  const [transferLine, setTransferLine] = React.useState({ ...emptyLine })

  const [writeoffDraft, setWriteoffDraft] = React.useState({
    document_date: today,
    source_location_id: '',
    reason: 'Порча',
    comment: '',
    items: []
  })
  const [writeoffLine, setWriteoffLine] = React.useState({ ...emptyLine })

  const [productionForm, setProductionForm] = React.useState({
    document_date: today,
    location_id: '',
    semi_id: '',
    output_qty: '',
    comment: ''
  })

  const [stocktakeForm, setStocktakeForm] = React.useState({
    document_date: today,
    location_id: '',
    comment: '',
    rows: []
  })

  const locationById = React.useMemo(
    () => Object.fromEntries((locations || []).map(row => [String(row.id), row])),
    [locations]
  )
  const transferLocations = React.useMemo(() => {
    const allowedNames = new Set(['bc1', 'bc2', 'bc3', 'bc4', 'bc5', 'bistro'])
    return (locations || []).filter(row =>
      row.is_active !== false &&
      (
        String(row.location_type || '').toLowerCase() === 'central' ||
        String(row.name || '').trim().toLowerCase() === 'central warehouse' ||
        (row.branch_id && allowedNames.has(String(row.name || '').trim().toLowerCase()))
      )
    )
  }, [locations])
  const transferTargetLocations = React.useMemo(
    () => transferLocations.filter(row =>
      String(row.id || '') !== String(transferDraft.source_location_id || '')
    ),
    [transferLocations, transferDraft.source_location_id]
  )
  const costByProductId = React.useMemo(
    () => Object.fromEntries((latestCosts || []).map(row => [String(row.product_id), parseNum(row.last_unit_cost || row.unit_cost || row.price)])),
    [latestCosts]
  )
  const semiById = React.useMemo(
    () => Object.fromEntries((semis || []).map(row => [String(row.id), row])),
    [semis]
  )
  const settingsByKey = React.useMemo(() => {
    const map = {}
    ;(itemSettings || []).forEach(row => {
      map[`${row.location_id}||${row.item_name}||${row.unit}`] = row
    })
    return map
  }, [itemSettings])

  const normalizeWorkspace = payload => {
    if (!payload) return { documents: [], settings: [] }
    if (typeof payload === 'string') {
      try { return JSON.parse(payload) } catch (_error) { return { documents: [], settings: [] } }
    }
    return payload
  }

  const loadInventory = React.useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      let bootstrapData = null
      const bootstrapRes = await supabase.rpc('rms_inventory_bootstrap_secure')
      if (!bootstrapRes.error) bootstrapData = normalizeWorkspace(bootstrapRes.data)

      const [
        balanceRes,
        movementRes,
        locationRes,
        productRes,
        costRes,
        semiRes,
        semiItemRes,
        workspaceRes
      ] = await Promise.all([
        supabase.from('rms_inventory_stock_balance_view').select('*').order('item_name', { ascending: true }).limit(3000),
        supabase.from('rms_stock_movements').select('*').is('deleted_at', null).order('movement_date', { ascending: false }).order('created_at', { ascending: false }).limit(2000),
        supabase.from('rms_inventory_locations').select('*').eq('is_active', true).order('name', { ascending: true }).limit(300),
        supabase.from('supplier_products').select('id,name,category,base_unit,is_active').eq('is_active', true).order('name').limit(5000),
        supabase.from('latest_product_costs').select('*').limit(5000),
        supabase.from('rms_semi_finished').select('*').eq('is_active', true).order('name').limit(1500),
        supabase.from('rms_semi_finished_items').select('*').order('created_at').limit(7000),
        supabase.rpc('rms_inventory_workspace_secure', { p_limit: 800 })
      ])

      if (balanceRes.error) throw balanceRes.error
      if (movementRes.error) throw movementRes.error
      if (costRes.error) throw costRes.error

      const bootstrapLocations = Array.isArray(bootstrapData?.locations) ? bootstrapData.locations : []
      const bootstrapProducts = Array.isArray(bootstrapData?.products) ? bootstrapData.products : []
      const bootstrapSemis = Array.isArray(bootstrapData?.semis) ? bootstrapData.semis : []
      const bootstrapSemiItems = Array.isArray(bootstrapData?.semi_items) ? bootstrapData.semi_items : []

      let resolvedLocations = bootstrapLocations.length
        ? bootstrapLocations
        : (!locationRes.error ? (locationRes.data || []) : [])

      let resolvedProducts = bootstrapProducts.length
        ? bootstrapProducts
        : (!productRes.error ? (productRes.data || []) : [])

      let resolvedSemis = bootstrapSemis.length
        ? bootstrapSemis
        : (!semiRes.error ? (semiRes.data || []) : [])

      let resolvedSemiItems = bootstrapSemiItems.length
        ? bootstrapSemiItems
        : (!semiItemRes.error ? (semiItemRes.data || []) : [])

      if (!resolvedProducts.length) {
        try {
          const wsResult = await fetchRmsSuppliersWorkspace()
          const ws = normalizeWorkspace(wsResult?.data)
          if (!wsResult?.error && Array.isArray(ws?.supplier_products)) {
            resolvedProducts = ws.supplier_products.filter(row => row.is_active !== false)
          }
        } catch (_error) {}
      }

      setBalances(balanceRes.data || [])
      setMovements(movementRes.data || [])
      setLocations(resolvedLocations)
      setSupplierProducts(resolvedProducts)
      setLatestCosts(costRes.data || [])
      setSemis(resolvedSemis)
      setSemiItems(resolvedSemiItems)

      if (workspaceRes.error) {
        setWorkspaceReady(false)
        setDocuments([])
        setItemSettings([])
      } else {
        const workspace = normalizeWorkspace(workspaceRes.data)
        setWorkspaceReady(true)
        setDocuments(Array.isArray(workspace?.documents) ? workspace.documents : [])
        setItemSettings(Array.isArray(workspace?.settings) ? workspace.settings : [])
      }

      if (!bootstrapData && !resolvedLocations.length) {
        setMessage('Складские локации не найдены. Выполните SQL v421 для автоматического создания филиалов.')
      } else if (!resolvedProducts.length && !resolvedSemis.length) {
        setMessage('Справочник товаров пуст. Добавьте товары у поставщиков или создайте позицию вручную при оприходовании.')
      }
    } catch (error) {
      console.error('inventory operational load error', error)
      setMessage(error?.message || 'Не удалось загрузить склад')
    } finally {
      setLoading(false)
    }
  }, [branches])

  React.useEffect(() => { loadInventory() }, [loadInventory])

  const catalog = React.useMemo(() => {
    const map = new Map()

    ;(balances || []).forEach(row => {
      const unit = row.unit || 'unit'
      const key = `stock::${row.item_name}::${unit}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          item_name: row.item_name || 'Без названия',
          unit,
          item_type: row.item_type || 'product',
          supplier_product_id: row.supplier_product_id || null,
          semi_finished_id: row.semi_finished_id || null,
          category: row.category || '',
          source: 'stock'
        })
      }
    })

    ;(supplierProducts || []).forEach(row => {
      const unit = row.base_unit || 'unit'
      const key = `product::${row.id}::${unit}`
      map.set(key, {
        key,
        item_name: row.name,
        unit,
        item_type: 'product',
        supplier_product_id: row.id,
        semi_finished_id: null,
        category: row.category || '',
        source: 'supplier_product'
      })
    })

    ;(semis || []).forEach(row => {
      const unit = row.output_unit || 'unit'
      const key = `semi::${row.id}::${unit}`
      map.set(key, {
        key,
        item_name: row.name,
        unit,
        item_type: 'semi_finished',
        supplier_product_id: null,
        semi_finished_id: row.id,
        category: 'Полуфабрикаты',
        source: 'semi'
      })
    })

    return Array.from(map.values()).sort((a, b) =>
      String(a.item_name || '').localeCompare(String(b.item_name || ''), 'ru')
    )
  }, [balances, supplierProducts, semis])

  const findCatalogItem = key => catalog.find(row => row.key === key) || null

  const balanceFor = (locationId, itemName, unit) => {
    return (balances || []).find(row =>
      String(row.location_id || '') === String(locationId || '') &&
      String(row.item_name || '').trim().toLowerCase() === String(itemName || '').trim().toLowerCase() &&
      String(row.unit || 'unit').trim().toLowerCase() === String(unit || 'unit').trim().toLowerCase()
    )
  }

  const unitCostFor = (locationId, item) => {
    const balance = balanceFor(locationId, item?.item_name, item?.unit)
    const qty = parseNum(balance?.balance_qty)
    if (qty > 0) return parseNum(balance?.balance_cost) / qty
    if (item?.supplier_product_id) return parseNum(costByProductId[String(item.supplier_product_id)])
    return 0
  }

  const documentTypeLabel = type => ({
    transfer: 'Перемещение',
    writeoff: 'Списание',
    production: 'Производство',
    inventory_count: 'Инвентаризация',
    adjustment: 'Оприходование / корректировка'
  }[type] || type || 'Документ')

  const documentStatusLabel = status => ({
    draft: 'Черновик',
    posted: 'Проведён',
    cancelled: 'Отменён',
    posting: 'Проводится'
  }[status] || status || '—')

  const movementTypeLabel = type => ({
    purchase: 'Приход',
    write_off: 'Списание',
    transfer_in: 'Перемещение +',
    transfer_out: 'Перемещение −',
    production_in: 'Производство +',
    production_out: 'Производство −',
    adjustment_in: 'Корректировка +',
    adjustment_out: 'Корректировка −',
    sales_consumption: 'Продажи / расход',
    consumption: 'Расход'
  }[type] || type || '—')

  const createInventoryDocument = async payload => {
    const { data, error } = await supabase.rpc('rms_inventory_document_create_secure', { p_payload: payload })
    if (error) throw error
    const normalized = normalizeWorkspace(data)
    if (normalized?.document) return { ...normalized.document, items: normalized.items || [] }
    return normalized
  }

  const markDocumentPosted = async (documentId, result = {}) => {
    const { data, error } = await supabase.rpc('rms_inventory_document_mark_posted_secure', {
      p_document_id: documentId,
      p_result: result
    })
    if (error) throw error
    return data
  }

  const markDocumentCancelled = async (documentId, comment = '') => {
    const { data, error } = await supabase.rpc('rms_inventory_document_cancel_secure', {
      p_document_id: documentId,
      p_comment: comment || null
    })
    if (error) throw error
    return data
  }

  const movementPayload = (doc, item, locationId, type, quantity) => ({
    movement_date: doc.document_date || today,
    location_id: locationId,
    item_name: item.item_name,
    unit: item.unit || 'unit',
    quantity: Math.abs(parseNum(quantity)),
    unit_cost: parseNum(item.unit_cost),
    movement_type: type,
    comment: `[${doc.document_number || 'Склад'}] ${doc.comment || documentTypeLabel(doc.document_type)}${item.comment ? ` · ${item.comment}` : ''}`,
    source: 'inventory_document',
    source_id: doc.id,
    supplier_product_id: item.supplier_product_id || null,
    semi_finished_id: item.semi_finished_id || null,
    item_type: item.item_type || 'product'
  })

  const postDocument = async doc => {
    if (!doc?.id) throw new Error('Документ не найден')
    if (doc.status === 'posted') return
    const items = Array.isArray(doc.items) ? doc.items : []
    if (!items.length) throw new Error('В документе нет строк')

    const movementsCreated = []
    if (doc.document_type === 'transfer') {
      const { data, error } = await supabase.rpc('rms_inventory_transfer_post_secure', {
        p_document_id: doc.id
      })
      if (error) throw error
      const result = normalizeWorkspace(data)
      const movementPairs = Array.isArray(result?.movements) ? result.movements.length : items.length
      setMessage(`Перемещение проведено: ${doc.document_number || ''} · позиций: ${movementPairs}`)
      await loadInventory()
      return result
    } else if (doc.document_type === 'writeoff') {
      if (!doc.source_location_id) throw new Error('Не указан склад списания')
      for (const item of items) {
        const quantity = parseNum(item.quantity)
        if (!(quantity > 0)) continue
        const sourceBalance = balanceFor(doc.source_location_id, item.item_name, item.unit)
        if (parseNum(sourceBalance?.balance_qty) < quantity) {
          throw new Error(`Недостаточный остаток: ${item.item_name}. Доступно ${fmt(sourceBalance?.balance_qty)} ${item.unit}`)
        }
        await rmsInventoryMovementCreate(movementPayload(doc, item, doc.source_location_id, 'write_off', quantity))
        movementsCreated.push({ item: item.item_name, type: 'write_off', quantity })
      }
    } else if (doc.document_type === 'production') {
      const locationId = doc.source_location_id || doc.target_location_id
      if (!locationId) throw new Error('Не указан склад производства')
      for (const item of items.filter(row => row.movement_role === 'input')) {
        const quantity = parseNum(item.quantity)
        if (!(quantity > 0)) continue
        const sourceBalance = balanceFor(locationId, item.item_name, item.unit)
        if (parseNum(sourceBalance?.balance_qty) < quantity) {
          throw new Error(`Недостаточно для производства: ${item.item_name}. Доступно ${fmt(sourceBalance?.balance_qty)} ${item.unit}`)
        }
        await rmsInventoryMovementCreate(movementPayload(doc, item, locationId, 'production_out', quantity))
        movementsCreated.push({ item: item.item_name, type: 'production_out', quantity })
      }
      for (const item of items.filter(row => row.movement_role === 'output')) {
        const quantity = parseNum(item.quantity)
        if (!(quantity > 0)) continue
        await rmsInventoryMovementCreate(movementPayload(doc, item, locationId, 'production_in', quantity))
        movementsCreated.push({ item: item.item_name, type: 'production_in', quantity })
      }
    } else if (doc.document_type === 'adjustment') {
      const locationId = doc.target_location_id || doc.source_location_id
      if (!locationId) throw new Error('Не указан склад оприходования')
      const direction = String(doc.metadata?.adjustment_direction || 'in')
      for (const item of items) {
        const quantity = parseNum(item.quantity)
        if (!(quantity > 0)) continue
        if (direction === 'out') {
          const sourceBalance = balanceFor(locationId, item.item_name, item.unit)
          if (parseNum(sourceBalance?.balance_qty) < quantity) {
            throw new Error(`Недостаточный остаток: ${item.item_name}. Доступно ${fmt(sourceBalance?.balance_qty)} ${item.unit}`)
          }
        }
        const movementType = direction === 'out' ? 'adjustment_out' : 'adjustment_in'
        await rmsInventoryMovementCreate(movementPayload(doc, item, locationId, movementType, quantity))
        movementsCreated.push({ item: item.item_name, type: movementType, quantity })
      }
    } else if (doc.document_type === 'inventory_count') {
      const locationId = doc.source_location_id
      if (!locationId) throw new Error('Не указан склад инвентаризации')
      for (const item of items) {
        const difference = parseNum(item.difference_qty)
        if (!difference) continue
        const type = difference > 0 ? 'adjustment_in' : 'adjustment_out'
        await rmsInventoryMovementCreate(movementPayload(doc, item, locationId, type, Math.abs(difference)))
        movementsCreated.push({ item: item.item_name, type, quantity: Math.abs(difference) })
      }
    } else {
      throw new Error(`Неподдерживаемый тип документа: ${doc.document_type}`)
    }

    await markDocumentPosted(doc.id, { movements_created: movementsCreated })
    setMessage(`${documentTypeLabel(doc.document_type)} проведено: ${doc.document_number || ''}`)
    await loadInventory()
  }

  const reverseDocument = async doc => {
    if (!doc?.id) throw new Error('Документ не найден')
    const items = Array.isArray(doc.items) ? doc.items : []
    const suffix = `Отмена ${doc.document_number || ''}`

    if (doc.status === 'draft') {
      await markDocumentCancelled(doc.id, suffix)
      setMessage(`Черновик отменён: ${doc.document_number || ''}`)
      await loadInventory()
      return
    }

    if (doc.status !== 'posted') throw new Error('Отменить можно только черновик или проведённый документ')

    if (doc.document_type === 'transfer') {
      for (const item of items) {
        const quantity = parseNum(item.quantity)
        if (!(quantity > 0)) continue
        await rmsInventoryMovementCreate({
          ...movementPayload({ ...doc, comment: suffix }, item, doc.target_location_id, 'transfer_out', quantity)
        })
        await rmsInventoryMovementCreate({
          ...movementPayload({ ...doc, comment: suffix }, item, doc.source_location_id, 'transfer_in', quantity)
        })
      }
    } else if (doc.document_type === 'writeoff') {
      for (const item of items) {
        const quantity = parseNum(item.quantity)
        if (!(quantity > 0)) continue
        await rmsInventoryMovementCreate(movementPayload({ ...doc, comment: suffix }, item, doc.source_location_id, 'adjustment_in', quantity))
      }
    } else if (doc.document_type === 'production') {
      const locationId = doc.source_location_id || doc.target_location_id
      for (const item of items.filter(row => row.movement_role === 'output')) {
        await rmsInventoryMovementCreate(movementPayload({ ...doc, comment: suffix }, item, locationId, 'production_out', item.quantity))
      }
      for (const item of items.filter(row => row.movement_role === 'input')) {
        await rmsInventoryMovementCreate(movementPayload({ ...doc, comment: suffix }, item, locationId, 'adjustment_in', item.quantity))
      }
    } else if (doc.document_type === 'adjustment') {
      const locationId = doc.target_location_id || doc.source_location_id
      const direction = String(doc.metadata?.adjustment_direction || 'in')
      for (const item of items) {
        const quantity = parseNum(item.quantity)
        if (!(quantity > 0)) continue
        const reverseType = direction === 'out' ? 'adjustment_in' : 'adjustment_out'
        await rmsInventoryMovementCreate(movementPayload({ ...doc, comment: suffix }, item, locationId, reverseType, quantity))
      }
    } else if (doc.document_type === 'inventory_count') {
      for (const item of items) {
        const difference = parseNum(item.difference_qty)
        if (!difference) continue
        const type = difference > 0 ? 'adjustment_out' : 'adjustment_in'
        await rmsInventoryMovementCreate(movementPayload({ ...doc, comment: suffix }, item, doc.source_location_id, type, Math.abs(difference)))
      }
    }

    await markDocumentCancelled(doc.id, suffix)
    setMessage(`Документ отменён обратными движениями: ${doc.document_number || ''}`)
    await loadInventory()
  }

  const saveOrPostDocument = async (payload, postNow) => {
    if (!workspaceReady) throw new Error('Сначала выполните SQL v420')
    const doc = await createInventoryDocument(payload)
    if (postNow) await postDocument(doc)
    else {
      setMessage(`Черновик сохранён: ${doc.document_number || ''}`)
      await loadInventory()
    }
    return doc
  }

  const addDraftLine = (kind) => {
    const isTransfer = kind === 'transfer'
    const line = isTransfer ? transferLine : writeoffLine
    const draft = isTransfer ? transferDraft : writeoffDraft
    const setDraft = isTransfer ? setTransferDraft : setWriteoffDraft
    const setLine = isTransfer ? setTransferLine : setWriteoffLine
    const locationId = draft.source_location_id
    const item = findCatalogItem(line.catalog_key)

    if (!item) return setMessage('Выберите товар или полуфабрикат')
    const quantity = parseNum(line.quantity)
    if (!(quantity > 0)) return setMessage('Укажите количество больше 0')
    if (!locationId) return setMessage('Выберите склад')

    const balance = balanceFor(locationId, item.item_name, item.unit)
    const alreadyAdded = isTransfer
      ? (draft.items || []).reduce((sum, row) => {
          const sameProduct = String(row.supplier_product_id || '') === String(item.supplier_product_id || '')
          const sameName = String(row.item_name || '').trim().toLowerCase() === String(item.item_name || '').trim().toLowerCase()
          const sameUnit = String(row.unit || 'unit').trim().toLowerCase() === String(item.unit || 'unit').trim().toLowerCase()
          return sameProduct && sameName && sameUnit ? sum + parseNum(row.quantity) : sum
        }, 0)
      : 0
    if (parseNum(balance?.balance_qty) < alreadyAdded + quantity) {
      return setMessage(`Недостаточный остаток: доступно ${fmt(balance?.balance_qty)} ${item.unit}`)
    }

    const unitCost = parseNum(line.unit_cost) || unitCostFor(locationId, item)
    const row = {
      item_name: item.item_name,
      item_type: item.item_type,
      supplier_product_id: item.supplier_product_id,
      semi_finished_id: item.semi_finished_id,
      unit: item.unit,
      quantity,
      unit_cost: unitCost,
      total_cost: quantity * unitCost,
      comment: line.comment || ''
    }

    setDraft({ ...draft, items: [...draft.items, row] })
    setLine({ ...emptyLine })
    setMessage('')
  }

  const removeDraftLine = (kind, index) => {
    if (kind === 'receipt') {
      setReceiptDraft(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
    } else if (kind === 'transfer') {
      setTransferDraft(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
    } else {
      setWriteoffDraft(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
    }
  }

  const addReceiptLine = () => {
    if (!receiptDraft.target_location_id) return setMessage('Выберите филиал или склад')
    const quantity = parseNum(receiptLine.quantity)
    if (!(quantity > 0)) return setMessage('Укажите количество больше 0')

    let item = null
    if (receiptLine.catalog_key === '__manual__') {
      const manualName = String(receiptLine.manual_name || '').trim()
      if (!manualName) return setMessage('Введите название нового товара')
      item = {
        item_name: manualName,
        unit: String(receiptLine.manual_unit || 'unit').trim() || 'unit',
        item_type: receiptLine.manual_type || 'product',
        supplier_product_id: null,
        semi_finished_id: null,
        category: receiptLine.manual_type === 'semi_finished' ? 'Полуфабрикаты' : 'Новый товар'
      }
    } else {
      item = findCatalogItem(receiptLine.catalog_key)
      if (!item) return setMessage('Выберите товар или полуфабрикат')
    }

    const unitCost = parseNum(receiptLine.unit_cost) || unitCostFor(receiptDraft.target_location_id, item)
    const row = {
      item_name: item.item_name,
      item_type: item.item_type,
      supplier_product_id: item.supplier_product_id || null,
      semi_finished_id: item.semi_finished_id || null,
      unit: item.unit || 'unit',
      quantity,
      unit_cost: unitCost,
      total_cost: quantity * unitCost,
      comment: receiptLine.comment || receiptDraft.reason || 'Оприходование'
    }

    setReceiptDraft(prev => ({ ...prev, items: [...prev.items, row] }))
    setReceiptLine({
      ...emptyLine,
      catalog_key: '',
      manual_name: '',
      manual_unit: 'kg',
      manual_type: 'product'
    })
    setMessage('')
  }

  const submitReceipt = async postNow => {
    setBusy(true)
    setMessage('')
    try {
      if (!receiptDraft.target_location_id) throw new Error('Выберите филиал или склад')
      if (!receiptDraft.items.length) throw new Error('Добавьте хотя бы один товар')
      await saveOrPostDocument({
        document_type: 'adjustment',
        document_date: receiptDraft.document_date,
        target_location_id: receiptDraft.target_location_id,
        reason: receiptDraft.reason,
        comment: receiptDraft.comment || receiptDraft.reason || 'Оприходование товаров',
        metadata: {
          adjustment_direction: 'in',
          operation: receiptDraft.reason === 'Начальные остатки' ? 'opening_balance' : 'receipt'
        },
        items: receiptDraft.items
      }, postNow)

      setReceiptDraft({
        document_date: today,
        target_location_id: receiptDraft.target_location_id,
        reason: receiptDraft.reason,
        comment: '',
        items: []
      })
      setReceiptLine({
        ...emptyLine,
        catalog_key: '',
        manual_name: '',
        manual_unit: 'kg',
        manual_type: 'product'
      })
    } catch (error) {
      setMessage(error?.message || 'Не удалось сохранить оприходование')
    } finally {
      setBusy(false)
    }
  }

  const submitTransfer = async postNow => {
    setBusy(true)
    setMessage('')
    try {
      if (!transferDraft.source_location_id || !transferDraft.target_location_id) throw new Error('Выберите источник и получателя')
      if (transferDraft.source_location_id === transferDraft.target_location_id) throw new Error('Источник и получатель должны отличаться')
      if (!transferDraft.items.length) throw new Error('Добавьте хотя бы один товар')
      await saveOrPostDocument({
        document_type: 'transfer',
        document_date: transferDraft.document_date,
        source_location_id: transferDraft.source_location_id,
        target_location_id: transferDraft.target_location_id,
        comment: transferDraft.comment || 'Перемещение товаров',
        items: transferDraft.items
      }, postNow)
      setTransferDraft({
        document_date: today,
        source_location_id: transferDraft.source_location_id,
        target_location_id: '',
        comment: '',
        items: []
      })
      setTransferLine({ ...emptyLine })
    } catch (error) {
      setMessage(error?.message || 'Не удалось сохранить перемещение')
    } finally {
      setBusy(false)
    }
  }

  const submitWriteoff = async postNow => {
    setBusy(true)
    setMessage('')
    try {
      if (!writeoffDraft.source_location_id) throw new Error('Выберите склад')
      if (!writeoffDraft.items.length) throw new Error('Добавьте хотя бы один товар')
      await saveOrPostDocument({
        document_type: 'writeoff',
        document_date: writeoffDraft.document_date,
        source_location_id: writeoffDraft.source_location_id,
        reason: writeoffDraft.reason,
        comment: writeoffDraft.comment || `Списание: ${writeoffDraft.reason}`,
        items: writeoffDraft.items
      }, postNow)
      setWriteoffDraft({
        document_date: today,
        source_location_id: writeoffDraft.source_location_id,
        reason: 'Порча',
        comment: '',
        items: []
      })
      setWriteoffLine({ ...emptyLine })
    } catch (error) {
      setMessage(error?.message || 'Не удалось сохранить списание')
    } finally {
      setBusy(false)
    }
  }

  const productionPreview = React.useMemo(() => {
    const semi = semiById[String(productionForm.semi_id)]
    const outputQty = parseNum(productionForm.output_qty)
    if (!semi || !(outputQty > 0)) return { semi: null, inputs: [], output: null, totalCost: 0 }

    const baseOutput = parseNum(semi.output_qty) || 1
    const scale = outputQty / baseOutput
    const rows = (semiItems || []).filter(row => String(row.semi_id) === String(semi.id))
    let totalCost = 0

    const inputs = rows.map(row => {
      const quantity = parseNum(row.qty) * scale * (1 + parseNum(row.waste_percent) / 100)
      const itemType = row.component_type === 'semi' ? 'semi_finished' : 'product'
      const supplierProductId = row.component_type === 'product' ? row.product_id : null
      const semiFinishedId = row.component_type === 'semi' ? row.semi_id_ref : null
      const item = {
        item_name: row.item_name || 'Компонент',
        item_type: itemType,
        supplier_product_id: supplierProductId,
        semi_finished_id: semiFinishedId,
        unit: row.unit || 'unit'
      }
      const unitCost = row.component_type === 'manual'
        ? parseNum(row.manual_unit_cost)
        : unitCostFor(productionForm.location_id, item)
      const lineCost = quantity * unitCost
      totalCost += lineCost
      return {
        ...item,
        movement_role: 'input',
        quantity,
        unit_cost: unitCost,
        total_cost: lineCost,
        comment: `Расход на ${semi.name}`
      }
    })

    const output = {
…182152 tokens truncated…:#eff6ff!important;
  color:#1d4ed8!important;
  border-color:#bfdbfe!important;
}
.rms-pro-shell .supplier-products-action-menu{
  display:grid!important;
  position:absolute!important;
  right:0!important;
  left:auto!important;
  top:38px!important;
  width:168px!important;
  z-index:400!important;
  visibility:visible!important;
  opacity:1!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,33fr) minmax(0,22fr) minmax(0,22fr) minmax(132px,23fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th,
  .rms-pro-shell .supplier-products-pricebook-table td{
    padding-left:5px!important;
    padding-right:5px!important;
  }
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-toolbar{
    grid-template-columns:minmax(0,1fr) 126px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,38fr) minmax(0,26fr) minmax(0,36fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
    display:none!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table td:nth-child(4){
    display:block!important;
  }
  .rms-pro-shell .supplier-products-trend-slot{
    display:none!important;
  }
  .rms-pro-shell .supplier-products-price-action-inner{
    grid-template-columns:34px!important;
    justify-content:end!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v349 supplier pricebook: no text wrapping + fixed chart grouping */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v349-supplier-pricebook-nowrap-chart-fix'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,33fr) minmax(0,22fr) minmax(0,22fr) minmax(142px,23fr)!important;
}
.rms-pro-shell .supplier-products-pricebook-table th,
.rms-pro-shell .supplier-products-pricebook-table td{
  padding-left:6px!important;
  padding-right:6px!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(1) b,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) b,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) b,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) .hint,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) .hint{
  display:block!important;
  max-width:100%!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(1) b{
  font-size:13.5px!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) b{
  font-size:13.2px!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) b{
  font-size:13px!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) .hint,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) .hint{
  font-size:11.4px!important;
}
.rms-pro-shell .supplier-products-price-action-inner{
  grid-template-columns:minmax(0,1fr) 34px!important;
  gap:5px!important;
}
.rms-pro-shell .supplier-products-trend-slot{
  min-width:0!important;
  overflow:hidden!important;
}
.rms-pro-shell .supplier-product-price-trend{
  max-width:100%!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-products-menu-shell{
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  width:32px!important;
  min-width:32px!important;
  max-width:32px!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,32fr) minmax(0,21fr) minmax(0,21fr) minmax(138px,26fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th,
  .rms-pro-shell .supplier-products-pricebook-table td{
    padding-left:5px!important;
    padding-right:5px!important;
  }
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,38fr) minmax(0,26fr) minmax(0,36fr)!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v350 supplier pricebook: use available empty space, do not compress visible values */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v350-supplier-pricebook-use-space-no-truncate'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-wrap,
.rms-pro-shell .supplier-products-admin-list,
.rms-pro-shell .supplier-products-pricebook-note,
.rms-pro-shell .supplier-products-pagination{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-admin-list table.supplier-products-pricebook-table,
.rms-pro-shell table.supplier-products-pricebook-table{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
  table-layout:auto!important;
  border-collapse:separate!important;
  border-spacing:0!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead,
.rms-pro-shell .supplier-products-pricebook-table tbody{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  display:grid!important;
  grid-template-columns:minmax(0,35fr) minmax(0,23fr) minmax(0,23fr) minmax(150px,19fr)!important;
  column-gap:0!important;
  align-items:center!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  border-bottom:1px solid #e5e7eb!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead tr{
  min-height:38px!important;
  background:#f8fafc!important;
  border-top:1px solid #e5e7eb!important;
}
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  min-height:76px!important;
  background:#fff!important;
}
.rms-pro-shell .supplier-products-pricebook-table tbody tr:nth-child(even){
  background:#fbfdff!important;
}
.rms-pro-shell .supplier-products-pricebook-table th,
.rms-pro-shell .supplier-products-pricebook-table td,
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(1),
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(1),
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(2),
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2),
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(3),
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3),
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4),
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(4){
  display:block!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding:9px 7px!important;
  border:0!important;
  overflow:visible!important;
  vertical-align:middle!important;
}
.rms-pro-shell .supplier-products-pricebook-table th{
  font-size:11px!important;
  line-height:1.08!important;
  letter-spacing:.02em!important;
  color:#64748b!important;
  font-weight:950!important;
  text-transform:uppercase!important;
}
.rms-pro-shell .supplier-products-pricebook-table td{
  font-size:13px!important;
  line-height:1.18!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(1) b,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) b,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) b,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) .hint,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) .hint{
  display:block!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(1) b{
  font-size:13.8px!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) b{
  font-size:13.4px!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) b{
  font-size:13.2px!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(2) .hint,
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(3) .hint{
  font-size:11.6px!important;
  margin-top:4px!important;
}
.rms-pro-shell .supplier-pricebook-product-meta{
  display:inline-flex!important;
  width:auto!important;
  max-width:none!important;
  margin-top:5px!important;
  padding:2px 7px!important;
  font-size:10px!important;
  line-height:1.05!important;
  white-space:nowrap!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
.rms-pro-shell .supplier-products-price-action-cell{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-price-action-inner{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 34px!important;
  gap:8px!important;
  align-items:center!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-trend-slot{
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-product-price-trend{
  display:inline-flex!important;
  max-width:none!important;
  min-width:0!important;
  width:auto!important;
  height:28px!important;
  padding:0 8px!important;
  font-size:11px!important;
  border-radius:999px!important;
  white-space:nowrap!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
.rms-pro-shell .supplier-products-menu-shell{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  position:relative!important;
  width:34px!important;
  height:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  align-items:center!important;
  justify-content:flex-end!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  width:32px!important;
  min-width:32px!important;
  max-width:32px!important;
  height:32px!important;
  padding:0!important;
  margin:0!important;
  border:1px solid #e2e8f0!important;
  border-radius:11px!important;
  background:#f8fafc!important;
  color:#334155!important;
  align-items:center!important;
  justify-content:center!important;
  font-size:22px!important;
  font-weight:950!important;
  line-height:1!important;
  box-shadow:0 1px 2px rgba(15,23,42,.05)!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-ellipsis:hover,
.rms-pro-shell .supplier-products-ellipsis.is-open{
  background:#eff6ff!important;
  color:#1d4ed8!important;
  border-color:#bfdbfe!important;
}
.rms-pro-shell .supplier-products-action-menu{
  display:grid!important;
  position:absolute!important;
  right:0!important;
  left:auto!important;
  top:38px!important;
  width:168px!important;
  z-index:450!important;
  visibility:visible!important;
  opacity:1!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,34fr) minmax(0,22fr) minmax(0,22fr) minmax(142px,22fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th,
  .rms-pro-shell .supplier-products-pricebook-table td{
    padding-left:5px!important;
    padding-right:5px!important;
  }
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,42fr) minmax(0,28fr) minmax(0,30fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
    display:none!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table td:nth-child(4){
    display:block!important;
  }
  .rms-pro-shell .supplier-products-trend-slot{
    display:none!important;
  }
  .rms-pro-shell .supplier-products-price-action-inner{
    grid-template-columns:34px!important;
    justify-content:end!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v351 supplier pricebook: real visible text, wider dynamic cell, no overlap */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v351-supplier-pricebook-text-visible-no-overlap'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  display:grid!important;
  grid-template-columns:minmax(0,34fr) minmax(0,24fr) minmax(0,22fr) minmax(176px,20fr)!important;
  column-gap:0!important;
  align-items:center!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-products-pricebook-table th,
.rms-pro-shell .supplier-products-pricebook-table td{
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding-left:7px!important;
  padding-right:7px!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-main-text,
.rms-pro-shell .supplier-pricebook-price-main,
.rms-pro-shell .supplier-pricebook-supplier-main{
  display:inline-block!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
  vertical-align:bottom!important;
  line-height:1.2!important;
  font-weight:950!important;
  color:#0f172a!important;
}
.rms-pro-shell .supplier-pricebook-main-text{
  font-size:13.8px!important;
}
.rms-pro-shell .supplier-pricebook-price-main{
  font-size:13.6px!important;
}
.rms-pro-shell .supplier-pricebook-supplier-main{
  font-size:13.3px!important;
}
.rms-pro-shell .supplier-pricebook-price-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint{
  display:inline-block!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
  font-size:11.6px!important;
  margin-top:4px!important;
}
.rms-pro-shell .supplier-pricebook-product-meta{
  display:inline-flex!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  margin-top:5px!important;
}
.rms-pro-shell .supplier-products-price-action-cell{
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-price-action-inner{
  display:grid!important;
  grid-template-columns:minmax(92px,1fr) 36px!important;
  gap:10px!important;
  align-items:center!important;
  justify-content:stretch!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-trend-slot{
  display:flex!important;
  justify-content:flex-start!important;
  align-items:center!important;
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-product-price-trend{
  position:relative!important;
  z-index:1!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:auto!important;
  min-width:72px!important;
  max-width:100%!important;
  height:28px!important;
  padding:0 9px!important;
  font-size:11px!important;
  white-space:nowrap!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
.rms-pro-shell .supplier-products-menu-shell{
  position:relative!important;
  z-index:3!important;
  width:36px!important;
  min-width:36px!important;
  max-width:36px!important;
  height:34px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  width:32px!important;
  min-width:32px!important;
  max-width:32px!important;
  height:32px!important;
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  align-items:center!important;
  justify-content:center!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,33fr) minmax(0,23fr) minmax(0,21fr) minmax(168px,23fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th,
  .rms-pro-shell .supplier-products-pricebook-table td{
    padding-left:5px!important;
    padding-right:5px!important;
  }
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,42fr) minmax(0,28fr) minmax(0,30fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
    display:none!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table td:nth-child(4){
    display:block!important;
  }
  .rms-pro-shell .supplier-products-trend-slot{
    display:none!important;
  }
  .rms-pro-shell .supplier-products-price-action-inner{
    grid-template-columns:36px!important;
    justify-content:end!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v352 supplier pricebook: wider supplier column, full supplier names */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v352-supplier-pricebook-supplier-names-fit'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,30fr) minmax(0,21fr) minmax(0,30fr) minmax(174px,19fr)!important;
}
.rms-pro-shell .supplier-pricebook-supplier-cell{
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint{
  display:inline-block!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-pricebook-supplier-main{
  font-size:13.4px!important;
  font-weight:950!important;
  line-height:1.2!important;
}
.rms-pro-shell .supplier-pricebook-supplier-cell .hint{
  font-size:11.6px!important;
  line-height:1.2!important;
  margin-top:4px!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,29fr) minmax(0,20fr) minmax(0,31fr) minmax(166px,20fr)!important;
  }
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,38fr) minmax(0,24fr) minmax(0,38fr)!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v353 Reports -> Products purchase statistics */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v353-reports-products-purchase-stats'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-v353-products-section .reports-v43-module-card{
  overflow:visible!important;
}
.rms-pro-shell .reports-v353-product-filters{
  display:grid!important;
  grid-template-columns:160px 160px 190px 220px minmax(260px,1fr) auto!important;
  gap:10px!important;
  align-items:end!important;
  margin-top:14px!important;
}
.rms-pro-shell .reports-v353-product-filters label{
  min-width:0!important;
}
.rms-pro-shell .reports-v353-product-filters input,
.rms-pro-shell .reports-v353-product-filters select{
  width:100%!important;
  min-width:0!important;
}
.rms-pro-shell .reports-v353-products-search{
  min-width:260px!important;
}
.rms-pro-shell .reports-v353-products-filter-actions{
  display:flex!important;
  align-items:end!important;
  justify-content:flex-end!important;
}
.rms-pro-shell .reports-v353-period-note{
  margin-top:10px!important;
  color:#64748b!important;
  font-size:13px!important;
  font-weight:750!important;
}
.rms-pro-shell .reports-v353-products-kpis{
  display:grid!important;
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  gap:10px!important;
  margin-top:14px!important;
}
.rms-pro-shell .reports-v353-products-split{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:12px!important;
  margin-top:14px!important;
}
.rms-pro-shell .reports-v353-mini-card{
  border:1px solid rgba(226,232,240,.92)!important;
  border-radius:18px!important;
  background:#fbfdff!important;
  padding:14px!important;
}
.rms-pro-shell .reports-v353-mini-card h4,
.rms-pro-shell .reports-v353-detail-head h4{
  margin:0!important;
  color:#0f172a!important;
  font-size:16px!important;
  font-weight:950!important;
}
.rms-pro-shell .reports-v353-mini-card p,
.rms-pro-shell .reports-v353-detail-head p{
  margin:4px 0 0!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:700!important;
}
.rms-pro-shell .reports-v353-rank-row{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto!important;
  gap:8px 12px!important;
  align-items:center!important;
  padding:9px 0!important;
  border-top:1px solid #e5e7eb!important;
}
.rms-pro-shell .reports-v353-rank-row:first-of-type{
  border-top:0!important;
}
.rms-pro-shell .reports-v353-rank-row span{
  color:#0f172a!important;
  font-size:13px!important;
  font-weight:900!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
.rms-pro-shell .reports-v353-rank-row b{
  color:#0f172a!important;
  font-size:13px!important;
  font-weight:950!important;
  white-space:nowrap!important;
}
.rms-pro-shell .reports-v353-rank-row small{
  grid-column:1 / -1!important;
  color:#64748b!important;
  font-size:11px!important;
  font-weight:750!important;
}
.rms-pro-shell .reports-v353-products-table-wrap,
.rms-pro-shell .reports-v353-detail-table-wrap{
  overflow:auto!important;
  border-radius:18px!important;
}
.rms-pro-shell .reports-v353-products-table{
  min-width:1180px!important;
}
.rms-pro-shell .reports-v353-detail-table{
  min-width:1080px!important;
}
.rms-pro-shell .reports-v353-products-table th,
.rms-pro-shell .reports-v353-products-table td,
.rms-pro-shell .reports-v353-detail-table th,
.rms-pro-shell .reports-v353-detail-table td{
  vertical-align:top!important;
  white-space:nowrap!important;
}
.rms-pro-shell .reports-v353-products-table td:first-child,
.rms-pro-shell .reports-v353-detail-table td:nth-child(2){
  white-space:normal!important;
  min-width:220px!important;
}
.rms-pro-shell .reports-v353-sort-btn{
  border:0!important;
  background:transparent!important;
  color:#64748b!important;
  font:inherit!important;
  font-weight:950!important;
  text-transform:uppercase!important;
  cursor:pointer!important;
  padding:0!important;
}
.rms-pro-shell .reports-v353-products-pager{
  justify-content:space-between!important;
  margin-top:10px!important;
}
.rms-pro-shell .reports-v353-detail-head{
  display:flex!important;
  justify-content:space-between!important;
  align-items:flex-end!important;
  gap:12px!important;
  margin-top:18px!important;
  margin-bottom:10px!important;
}
@media(max-width:1300px){
  .rms-pro-shell .reports-v353-product-filters{
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
  }
  .rms-pro-shell .reports-v353-products-search{
    grid-column:1 / span 2!important;
  }
  .rms-pro-shell .reports-v353-products-kpis{
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
  }
}
@media(max-width:900px){
  .rms-pro-shell .reports-v353-product-filters,
  .rms-pro-shell .reports-v353-products-split{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .reports-v353-products-search{
    grid-column:auto!important;
  }
  .rms-pro-shell .reports-v353-products-kpis{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .reports-v353-detail-head{
    align-items:flex-start!important;
    flex-direction:column!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v355 Reports -> Products: unit mismatch warning instead of auto-merge */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v355-reports-products-unit-mismatch-warning'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-v355-unit-warning{
  margin-top:14px!important;
  padding:14px!important;
  border:1px solid rgba(239,68,68,.28)!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,rgba(254,242,242,.92),rgba(255,255,255,.96))!important;
}
.rms-pro-shell .reports-v355-unit-warning-head{
  display:flex!important;
  justify-content:space-between!important;
  align-items:flex-start!important;
  gap:14px!important;
  margin-bottom:12px!important;
}
.rms-pro-shell .reports-v355-unit-warning-head h4{
  margin:0!important;
  color:#991b1b!important;
  font-size:16px!important;
  font-weight:950!important;
}
.rms-pro-shell .reports-v355-unit-warning-head p{
  margin:5px 0 0!important;
  max-width:920px!important;
  color:#7f1d1d!important;
  font-size:12.5px!important;
  line-height:1.35!important;
  font-weight:750!important;
}
.rms-pro-shell .reports-v355-unit-warning-head strong{
  white-space:nowrap!important;
  color:#991b1b!important;
  background:#fee2e2!important;
  border:1px solid #fecaca!important;
  border-radius:999px!important;
  padding:7px 10px!important;
  font-size:12px!important;
  font-weight:950!important;
}
.rms-pro-shell .reports-v355-unit-warning-table-wrap{
  overflow:auto!important;
  border-radius:14px!important;
  border:1px solid rgba(254,202,202,.9)!important;
}
.rms-pro-shell .reports-v355-unit-warning-table{
  min-width:980px!important;
}
.rms-pro-shell .reports-v355-unit-warning-table th,
.rms-pro-shell .reports-v355-unit-warning-table td{
  white-space:nowrap!important;
  vertical-align:top!important;
}
.rms-pro-shell .reports-v355-unit-warning-table td:first-child{
  white-space:normal!important;
  min-width:220px!important;
}
.rms-pro-shell .reports-v355-unit-warning .pill.bad{
  background:#fee2e2!important;
  color:#991b1b!important;
  border:1px solid #fecaca!important;
}
`
    document.head.appendChild(style)
  }
}


/* v356 supplier journal: aligned filters + supplier period total */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v356-supplier-journal-aligned-filters-total'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-journal-filterbar{
  display:grid!important;
  grid-template-columns:repeat(4,minmax(160px,1fr)) auto 104px!important;
  align-items:end!important;
  gap:10px!important;
  width:100%!important;
  max-width:100%!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-journal-period-modern{
  grid-column:1 / -1!important;
  min-width:0!important;
  width:100%!important;
  display:grid!important;
  grid-template-columns:110px minmax(360px,520px) minmax(360px,1fr)!important;
  gap:10px!important;
  align-items:end!important;
}
.rms-pro-shell .supplier-journal-period-modern > span{
  align-self:center!important;
  padding-bottom:0!important;
}
.rms-pro-shell .supplier-period-pills{
  height:52px!important;
  align-items:center!important;
  padding:6px!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-period-pills button{
  height:38px!important;
}
.rms-pro-shell .supplier-custom-period{
  height:52px!important;
  min-width:0!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-custom-period summary{
  height:0!important;
  min-height:0!important;
  padding:0!important;
  overflow:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
}
.rms-pro-shell .supplier-custom-period summary::after{
  content:''!important;
}
.rms-pro-shell .supplier-custom-period > div{
  height:52px!important;
  padding:6px 10px!important;
  box-sizing:border-box!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr)!important;
  align-items:center!important;
}
.rms-pro-shell .supplier-custom-period input{
  height:40px!important;
}
.rms-pro-shell .supplier-journal-filterbar label{
  min-width:0!important;
  width:100%!important;
}
.rms-pro-shell .supplier-journal-filterbar label span{
  min-height:16px!important;
  display:flex!important;
  align-items:flex-end!important;
}
.rms-pro-shell .supplier-journal-filterbar input,
.rms-pro-shell .supplier-journal-filterbar select{
  width:100%!important;
  min-width:0!important;
  height:42px!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-journal-filterbar > button.ghost.small{
  height:42px!important;
  align-self:end!important;
  white-space:nowrap!important;
}
.rms-pro-shell .supplier-journal-filter-summary{
  height:42px!important;
  align-self:end!important;
}
.rms-pro-shell .supplier-journal-pagination{
  justify-content:space-between!important;
  gap:12px!important;
  flex-wrap:wrap!important;
}
.rms-pro-shell .supplier-journal-total-card{
  display:grid!important;
  grid-template-columns:minmax(0,1.3fr) minmax(0,.9fr) minmax(260px,1fr)!important;
  gap:12px!important;
  margin-top:12px!important;
  padding:14px!important;
  border:1px solid rgba(37,99,235,.18)!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#ffffff,#f8fbff)!important;
  box-shadow:0 12px 28px rgba(15,23,42,.035)!important;
}
.rms-pro-shell .supplier-journal-total-card > div{
  padding:12px!important;
  border:1px solid rgba(226,232,240,.9)!important;
  border-radius:14px!important;
  background:#fff!important;
}
.rms-pro-shell .supplier-journal-total-card span{
  display:block!important;
  color:#64748b!important;
  font-size:11.5px!important;
  line-height:1.2!important;
  font-weight:850!important;
  margin-bottom:6px!important;
}
.rms-pro-shell .supplier-journal-total-card strong{
  display:block!important;
  color:#0f172a!important;
  font-size:18px!important;
  line-height:1.1!important;
  font-weight:950!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-journal-total-card small{
  display:block!important;
  margin-top:7px!important;
  color:#64748b!important;
  font-size:11.5px!important;
  line-height:1.25!important;
  font-weight:750!important;
}
.rms-pro-shell .supplier-journal-total-amount{
  border-color:rgba(37,99,235,.28)!important;
  background:#eff6ff!important;
}
.rms-pro-shell .supplier-journal-total-amount strong{
  color:#1d4ed8!important;
  font-size:22px!important;
}
@media(max-width:1400px){
  .rms-pro-shell .supplier-journal-filterbar{
    grid-template-columns:repeat(2,minmax(0,1fr)) auto 104px!important;
  }
  .rms-pro-shell .supplier-journal-period-modern{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .supplier-journal-total-card{
    grid-template-columns:1fr 1fr!important;
  }
  .rms-pro-shell .supplier-journal-total-amount{
    grid-column:1 / -1!important;
  }
}
@media(max-width:900px){
  .rms-pro-shell .supplier-journal-filterbar,
  .rms-pro-shell .supplier-journal-total-card{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .supplier-journal-total-amount{
    grid-column:auto!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v357 Supplier journal: period display box in right top field */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v357-supplier-journal-period-display-box'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-journal-filterbar{
  display:grid!important;
  grid-template-columns:repeat(12,minmax(0,1fr))!important;
  gap:10px!important;
  align-items:end!important;
}
.rms-pro-shell .supplier-journal-period-modern{
  grid-column:1 / span 7!important;
  min-width:0!important;
}
.rms-pro-shell .supplier-journal-period-display-box{
  grid-column:8 / span 5!important;
  min-width:0!important;
  min-height:58px!important;
  display:grid!important;
  align-content:center!important;
  gap:3px!important;
  padding:10px 16px!important;
  border:1px solid rgba(203,213,225,.92)!important;
  border-radius:15px!important;
  background:linear-gradient(180deg,#ffffff,#f8fafc)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.82)!important;
}
.rms-pro-shell .supplier-journal-period-display-box span{
  color:#64748b!important;
  font-size:11px!important;
  line-height:1.1!important;
  font-weight:850!important;
}
.rms-pro-shell .supplier-journal-period-display-box strong{
  color:#0f172a!important;
  font-size:15px!important;
  line-height:1.15!important;
  font-weight:950!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-journal-period-display-box small{
  color:#2563eb!important;
  font-size:12px!important;
  line-height:1.15!important;
  font-weight:900!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-journal-filterbar > label{
  grid-column:span 2!important;
  min-width:0!important;
}
.rms-pro-shell .supplier-journal-filterbar > button{
  grid-column:span 2!important;
  width:100%!important;
  min-width:0!important;
}
.rms-pro-shell .supplier-journal-filter-summary{
  grid-column:span 2!important;
  width:100%!important;
  min-width:0!important;
}
@media(max-width:1500px){
  .rms-pro-shell .supplier-journal-filterbar{
    grid-template-columns:repeat(6,minmax(0,1fr))!important;
  }
  .rms-pro-shell .supplier-journal-period-modern{
    grid-column:1 / span 3!important;
  }
  .rms-pro-shell .supplier-journal-period-display-box{
    grid-column:4 / span 3!important;
  }
  .rms-pro-shell .supplier-journal-filterbar > label,
  .rms-pro-shell .supplier-journal-filterbar > button,
  .rms-pro-shell .supplier-journal-filter-summary{
    grid-column:span 2!important;
  }
}
@media(max-width:900px){
  .rms-pro-shell .supplier-journal-filterbar{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .supplier-journal-period-modern,
  .rms-pro-shell .supplier-journal-period-display-box,
  .rms-pro-shell .supplier-journal-filterbar > label,
  .rms-pro-shell .supplier-journal-filterbar > button,
  .rms-pro-shell .supplier-journal-filter-summary{
    grid-column:1 / -1!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v358 Supplier journal: period field same height + dates selectable */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v358-supplier-journal-period-same-height-selectable'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-journal-period-display-box{
  display:none!important;
}
.rms-pro-shell .supplier-journal-filterbar{
  display:grid!important;
  grid-template-columns:repeat(4,minmax(160px,1fr)) auto 104px!important;
  align-items:end!important;
  gap:10px!important;
  width:100%!important;
  max-width:100%!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-journal-period-modern{
  grid-column:1 / -1!important;
  width:100%!important;
  min-width:0!important;
  display:grid!important;
  grid-template-columns:110px minmax(360px,440px) minmax(430px,1fr)!important;
  gap:10px!important;
  align-items:end!important;
}
.rms-pro-shell .supplier-journal-period-modern > span{
  align-self:center!important;
  padding-bottom:0!important;
}
.rms-pro-shell .supplier-period-pills{
  height:52px!important;
  align-items:center!important;
  padding:6px!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-period-pills button{
  height:38px!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible{
  height:52px!important;
  min-width:0!important;
  width:100%!important;
  display:grid!important;
  grid-template-columns:150px minmax(0,1fr)!important;
  align-items:center!important;
  gap:10px!important;
  padding:6px 10px!important;
  box-sizing:border-box!important;
  border:1px solid rgba(203,213,225,.92)!important;
  border-radius:15px!important;
  background:linear-gradient(180deg,#ffffff,#f8fafc)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.82)!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible strong{
  color:#0f172a!important;
  font-size:14px!important;
  line-height:1.15!important;
  font-weight:950!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible > div{
  height:40px!important;
  min-width:0!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr)!important;
  align-items:center!important;
  gap:8px!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible input{
  height:40px!important;
  width:100%!important;
  min-width:0!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible em{
  display:flex!important;
  justify-content:center!important;
  color:#94a3b8!important;
  font-style:normal!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-journal-filterbar > label{
  min-width:0!important;
  width:100%!important;
}
.rms-pro-shell .supplier-journal-filterbar > button.ghost.small{
  height:42px!important;
  align-self:end!important;
}
.rms-pro-shell .supplier-journal-filter-summary{
  height:42px!important;
  align-self:end!important;
}
@media(max-width:1500px){
  .rms-pro-shell .supplier-journal-filterbar{
    grid-template-columns:repeat(2,minmax(0,1fr)) auto 104px!important;
  }
  .rms-pro-shell .supplier-journal-period-modern{
    grid-template-columns:110px minmax(320px,420px) minmax(360px,1fr)!important;
  }
}
@media(max-width:1100px){
  .rms-pro-shell .supplier-journal-period-modern{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .supplier-custom-period.supplier-custom-period-visible{
    grid-template-columns:1fr!important;
    height:auto!important;
  }
}
@media(max-width:900px){
  .rms-pro-shell .supplier-journal-filterbar{
    grid-template-columns:1fr!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v359 Supplier journal: polished compact period row */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v359-supplier-journal-period-polished'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-journal-period-modern{
  grid-column:1 / -1!important;
  width:100%!important;
  min-width:0!important;
  display:grid!important;
  grid-template-columns:110px minmax(420px,520px) minmax(460px,1fr)!important;
  gap:12px!important;
  align-items:center!important;
}
.rms-pro-shell .supplier-journal-period-modern > span{
  align-self:center!important;
  padding:0!important;
  color:#64748b!important;
  font-size:13px!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-period-pills{
  height:52px!important;
  min-width:0!important;
  width:100%!important;
  display:grid!important;
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
  align-items:center!important;
  gap:6px!important;
  padding:6px!important;
  box-sizing:border-box!important;
  border:1px solid rgba(203,213,225,.92)!important;
  border-radius:16px!important;
  background:#fff!important;
}
.rms-pro-shell .supplier-period-pills button{
  height:40px!important;
  min-width:0!important;
  padding:0 12px!important;
  border-radius:12px!important;
  white-space:nowrap!important;
  font-size:13px!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible{
  height:52px!important;
  min-height:52px!important;
  width:100%!important;
  min-width:0!important;
  display:grid!important;
  grid-template-columns:96px minmax(0,1fr)!important;
  align-items:center!important;
  gap:10px!important;
  padding:6px 10px!important;
  box-sizing:border-box!important;
  border:1px solid rgba(203,213,225,.92)!important;
  border-radius:16px!important;
  background:#fff!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.85)!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible strong{
  display:flex!important;
  align-items:center!important;
  height:40px!important;
  color:#64748b!important;
  font-size:12px!important;
  line-height:1!important;
  font-weight:950!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible > div{
  height:40px!important;
  min-width:0!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 20px minmax(0,1fr)!important;
  align-items:center!important;
  gap:8px!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible input{
  height:40px!important;
  width:100%!important;
  min-width:0!important;
  border-radius:12px!important;
  padding:0 12px!important;
  box-sizing:border-box!important;
  font-size:13px!important;
  font-weight:900!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible em{
  height:40px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  color:#94a3b8!important;
  font-style:normal!important;
  font-weight:950!important;
}
@media(max-width:1380px){
  .rms-pro-shell .supplier-journal-period-modern{
    grid-template-columns:90px minmax(360px,440px) minmax(430px,1fr)!important;
    gap:10px!important;
  }
  .rms-pro-shell .supplier-custom-period.supplier-custom-period-visible{
    grid-template-columns:82px minmax(0,1fr)!important;
  }
}
@media(max-width:1100px){
  .rms-pro-shell .supplier-journal-period-modern{
    grid-template-columns:1fr!important;
    align-items:stretch!important;
  }
  .rms-pro-shell .supplier-journal-period-modern > span{
    display:none!important;
  }
  .rms-pro-shell .supplier-custom-period.supplier-custom-period-visible{
    grid-template-columns:1fr!important;
    height:auto!important;
    min-height:52px!important;
  }
  .rms-pro-shell .supplier-custom-period.supplier-custom-period-visible strong{
    height:auto!important;
    padding:2px 2px 0!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v360 Supplier journal: remove inner date fields inside range box */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v360-supplier-journal-period-no-inner-fields'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible{
  height:52px!important;
  min-height:52px!important;
  overflow:hidden!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible > div{
  height:40px!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr)!important;
  align-items:center!important;
  gap:8px!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible .date-dmy-wrap{
  min-height:40px!important;
  height:40px!important;
  width:100%!important;
  min-width:0!important;
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
  border-radius:0!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible .date-dmy-input{
  min-height:40px!important;
  height:40px!important;
  width:100%!important;
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
  outline:none!important;
  border-radius:0!important;
  padding:0 34px 0 4px!important;
  color:#0f172a!important;
  font-size:13.5px!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible .date-dmy-input:focus{
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
  outline:none!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible .date-dmy-picker-btn{
  right:0!important;
  width:30px!important;
  height:30px!important;
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
  font-size:15px!important;
  opacity:.9!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible .date-dmy-picker-btn:hover{
  background:rgba(37,99,235,.08)!important;
  border-radius:9px!important;
}
.rms-pro-shell .supplier-custom-period.supplier-custom-period-visible em{
  height:40px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  color:#94a3b8!important;
  font-style:normal!important;
  font-weight:950!important;
}
`
    document.head.appendChild(style)
  }
}


/* v363 supplier invoice save progress */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v363-supplier-invoice-save-progress'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-purchase-save-inline-progress{
  display:grid!important;
  grid-template-columns:48px minmax(0,1fr)!important;
  gap:12px!important;
  align-items:center!important;
  margin:12px 0!important;
  padding:12px 14px!important;
  border:1px solid rgba(37,99,235,.18)!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#ffffff,#f8fbff)!important;
  box-shadow:0 14px 28px rgba(15,23,42,.045)!important;
}
.rms-pro-shell .supplier-purchase-save-inline-ring{
  width:48px!important;
  height:48px!important;
  border-radius:999px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  background:conic-gradient(#2563eb calc(var(--progress, 0) * 1%), #e2e8f0 0)!important;
  position:relative!important;
}
.rms-pro-shell .supplier-purchase-save-inline-ring::before{
  content:''!important;
  position:absolute!important;
  inset:5px!important;
  border-radius:999px!important;
  background:#fff!important;
}
.rms-pro-shell .supplier-purchase-save-inline-ring span{
  position:relative!important;
  z-index:1!important;
  color:#0f172a!important;
  font-size:11px!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-purchase-save-inline-progress b{
  display:block!important;
  color:#0f172a!important;
  font-size:14px!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-purchase-save-inline-progress p{
  margin:3px 0!important;
  color:#475569!important;
  font-size:12px!important;
  font-weight:800!important;
}
.rms-pro-shell .supplier-purchase-save-inline-progress small{
  display:block!important;
  color:#2563eb!important;
  font-size:11px!important;
  font-weight:900!important;
}
.rms-pro-shell .existing-purchase-items-footer button:disabled{
  opacity:.55!important;
  cursor:not-allowed!important;
}
`
    document.head.appendChild(style)
  }
}


/* v365 supplier pricebook: keep actions visible on smaller screens */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v365-supplier-pricebook-mobile-dots-visible'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
@media(max-width:1500px){
  .rms-pro-shell .supplier-products-pricebook-wrap,
  .rms-pro-shell .supplier-products-pricebook-table,
  .rms-pro-shell .supplier-products-pricebook-table thead,
  .rms-pro-shell .supplier-products-pricebook-table tbody{
    overflow:visible!important;
    max-width:100%!important;
    min-width:0!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    display:grid!important;
    grid-template-columns:minmax(0,36fr) minmax(0,23fr) minmax(0,33fr) 46px!important;
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    column-gap:0!important;
    align-items:center!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
    display:block!important;
    width:46px!important;
    max-width:46px!important;
    min-width:46px!important;
    padding-left:0!important;
    padding-right:4px!important;
    overflow:hidden!important;
    color:transparent!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4)::after{
    content:'•••'!important;
    color:#64748b!important;
    display:block!important;
    text-align:right!important;
    letter-spacing:1px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table td:nth-child(4),
  .rms-pro-shell .supplier-products-price-action-cell{
    display:flex!important;
    width:46px!important;
    max-width:46px!important;
    min-width:46px!important;
    padding-left:0!important;
    padding-right:4px!important;
    justify-content:flex-end!important;
    align-items:center!important;
    overflow:visible!important;
    position:relative!important;
    z-index:20!important;
  }
  .rms-pro-shell .supplier-products-trend-slot{
    display:none!important;
  }
  .rms-pro-shell .supplier-products-price-action-inner{
    display:flex!important;
    width:36px!important;
    min-width:36px!important;
    max-width:36px!important;
    justify-content:flex-end!important;
    align-items:center!important;
    overflow:visible!important;
    gap:0!important;
  }
  .rms-pro-shell .supplier-products-menu-shell{
    display:flex!important;
    visibility:visible!important;
    opacity:1!important;
    width:36px!important;
    min-width:36px!important;
    max-width:36px!important;
    height:34px!important;
    justify-content:flex-end!important;
    align-items:center!important;
    position:relative!important;
    overflow:visible!important;
    z-index:30!important;
  }
  .rms-pro-shell .supplier-products-ellipsis{
    display:inline-flex!important;
    visibility:visible!important;
    opacity:1!important;
    width:32px!important;
    min-width:32px!important;
    max-width:32px!important;
    height:32px!important;
    padding:0!important;
    margin:0!important;
    align-items:center!important;
    justify-content:center!important;
    border:1px solid #e2e8f0!important;
    border-radius:11px!important;
    background:#f8fafc!important;
    color:#334155!important;
    font-size:22px!important;
    font-weight:950!important;
    line-height:1!important;
    box-shadow:0 1px 2px rgba(15,23,42,.05)!important;
    cursor:pointer!important;
  }
  .rms-pro-shell .supplier-products-action-menu{
    right:0!important;
    left:auto!important;
    top:36px!important;
    z-index:500!important;
  }
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,40fr) minmax(0,25fr) minmax(0,35fr) 44px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table td:nth-child(4),
  .rms-pro-shell .supplier-products-price-action-cell,
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
    display:flex!important;
    width:44px!important;
    max-width:44px!important;
    min-width:44px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
    display:block!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v366 supplier pricebook: fixed visible actions column */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v366-supplier-pricebook-actions-column-fixed'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-wrap,
.rms-pro-shell .supplier-products-admin-list table.supplier-products-pricebook-table,
.rms-pro-shell table.supplier-products-pricebook-table,
.rms-pro-shell .supplier-products-pricebook-table thead,
.rms-pro-shell .supplier-products-pricebook-table tbody{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
  table-layout:auto!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  display:grid!important;
  grid-template-columns:minmax(0,35fr) minmax(0,23fr) minmax(0,32fr) 52px!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  column-gap:0!important;
  align-items:center!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-products-pricebook-table th,
.rms-pro-shell .supplier-products-pricebook-table td{
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  overflow:visible!important;
  padding-left:7px!important;
  padding-right:7px!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  width:52px!important;
  min-width:52px!important;
  max-width:52px!important;
  padding-left:0!important;
  padding-right:8px!important;
  justify-content:flex-end!important;
  align-items:center!important;
  color:transparent!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4)::after{
  content:'•••'!important;
  display:block!important;
  color:#64748b!important;
  font-weight:950!important;
  letter-spacing:1px!important;
  text-align:right!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(4),
.rms-pro-shell .supplier-products-price-action-cell{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  width:52px!important;
  min-width:52px!important;
  max-width:52px!important;
  padding-left:0!important;
  padding-right:8px!important;
  align-items:center!important;
  justify-content:flex-end!important;
  overflow:visible!important;
  position:relative!important;
  z-index:40!important;
}
.rms-pro-shell .supplier-products-price-action-inner{
  display:flex!important;
  width:36px!important;
  min-width:36px!important;
  max-width:36px!important;
  height:36px!important;
  align-items:center!important;
  justify-content:flex-end!important;
  gap:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-trend-slot{
  display:none!important;
}
.rms-pro-shell .supplier-products-menu-shell{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  position:relative!important;
  width:36px!important;
  min-width:36px!important;
  max-width:36px!important;
  height:36px!important;
  align-items:center!important;
  justify-content:flex-end!important;
  overflow:visible!important;
  z-index:60!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  padding:0!important;
  margin:0!important;
  align-items:center!important;
  justify-content:center!important;
  border:1px solid #dbe3ee!important;
  border-radius:12px!important;
  background:#f8fafc!important;
  color:#334155!important;
  font-size:22px!important;
  font-weight:950!important;
  line-height:1!important;
  box-shadow:0 1px 2px rgba(15,23,42,.05)!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-ellipsis:hover,
.rms-pro-shell .supplier-products-ellipsis.is-open{
  background:#eff6ff!important;
  color:#1d4ed8!important;
  border-color:#bfdbfe!important;
}
.rms-pro-shell .supplier-products-action-menu{
  display:grid!important;
  position:absolute!important;
  right:0!important;
  left:auto!important;
  top:40px!important;
  width:168px!important;
  z-index:700!important;
  visibility:visible!important;
  opacity:1!important;
}
.rms-pro-shell .supplier-pricebook-main-text,
.rms-pro-shell .supplier-pricebook-price-main,
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-price-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint{
  max-width:100%!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
@media(max-width:1100px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,40fr) minmax(0,25fr) minmax(0,35fr) 52px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th,
  .rms-pro-shell .supplier-products-pricebook-table td{
    padding-left:5px!important;
    padding-right:5px!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v367 supplier pricebook: actions by clicking product name */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v367-supplier-pricebook-click-name-actions'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,38fr) minmax(0,24fr) minmax(0,30fr) minmax(0,8fr)!important;
}
.rms-pro-shell .supplier-pricebook-product-click-cell{
  position:relative!important;
  overflow:visible!important;
  z-index:20!important;
}
.rms-pro-shell .supplier-pricebook-name-action-shell{
  position:relative!important;
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-name-action{
  display:inline-block!important;
  width:auto!important;
  max-width:100%!important;
  padding:0!important;
  margin:0!important;
  border:0!important;
  background:transparent!important;
  color:#0f172a!important;
  font-size:13.8px!important;
  line-height:1.2!important;
  font-weight:950!important;
  text-align:left!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-pricebook-name-action:hover,
.rms-pro-shell .supplier-pricebook-name-action.is-open{
  color:#2563eb!important;
  text-decoration:underline!important;
  text-underline-offset:3px!important;
}
.rms-pro-shell .supplier-products-name-action-menu{
  position:absolute!important;
  left:0!important;
  right:auto!important;
  top:30px!important;
  width:172px!important;
  z-index:900!important;
  display:grid!important;
  visibility:visible!important;
  opacity:1!important;
}
.rms-pro-shell .supplier-products-price-action-cell{
  display:none!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
  display:none!important;
}
@media(max-width:1500px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,40fr) minmax(0,25fr) minmax(0,35fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th:nth-child(4),
  .rms-pro-shell .supplier-products-pricebook-table td:nth-child(4){
    display:none!important;
  }
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-name-action-menu{
    width:164px!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v368 supplier pricebook: product-name actions open inline, not as overlay */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v368-supplier-pricebook-inline-name-actions'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  align-items:center!important;
}
.rms-pro-shell .supplier-pricebook-product-click-cell,
.rms-pro-shell .supplier-pricebook-name-action-shell{
  position:relative!important;
  overflow:visible!important;
  z-index:auto!important;
}
.rms-pro-shell .supplier-pricebook-name-action{
  display:inline-block!important;
  max-width:100%!important;
  color:#0f172a!important;
  font-size:13.8px!important;
  font-weight:950!important;
  line-height:1.2!important;
  text-align:left!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-pricebook-name-action:hover,
.rms-pro-shell .supplier-pricebook-name-action.is-open{
  color:#2563eb!important;
  text-decoration:underline!important;
  text-underline-offset:3px!important;
}
.rms-pro-shell .supplier-products-name-action-menu{
  position:static!important;
  left:auto!important;
  right:auto!important;
  top:auto!important;
  z-index:auto!important;
  display:flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  gap:6px!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  margin-top:8px!important;
  padding:8px!important;
  border:1px solid rgba(203,213,225,.9)!important;
  border-radius:14px!important;
  background:#ffffff!important;
  box-shadow:0 8px 20px rgba(15,23,42,.08)!important;
  visibility:visible!important;
  opacity:1!important;
}
.rms-pro-shell .supplier-products-name-action-menu button{
  width:auto!important;
  min-width:0!important;
  height:30px!important;
  padding:0 10px!important;
  border:1px solid #e2e8f0!important;
  border-radius:10px!important;
  background:#f8fafc!important;
  color:#0f172a!important;
  font-size:11.5px!important;
  font-weight:900!important;
  line-height:1!important;
  white-space:nowrap!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-name-action-menu button:hover{
  background:#eff6ff!important;
  border-color:#bfdbfe!important;
  color:#1d4ed8!important;
}
.rms-pro-shell .supplier-products-name-action-menu button.danger{
  background:#fff1f2!important;
  border-color:#fecdd3!important;
  color:#b91c1c!important;
}
.rms-pro-shell .supplier-products-name-action-menu button.danger:hover{
  background:#ffe4e6!important;
  color:#991b1b!important;
}
.rms-pro-shell .supplier-products-name-action-menu button:disabled{
  opacity:.45!important;
  cursor:not-allowed!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4),
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(4),
.rms-pro-shell .supplier-products-price-action-cell{
  display:none!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,40fr) minmax(0,25fr) minmax(0,35fr)!important;
}
@media(max-width:980px){
  .rms-pro-shell .supplier-products-name-action-menu{
    gap:5px!important;
    padding:7px!important;
  }
  .rms-pro-shell .supplier-products-name-action-menu button{
    height:29px!important;
    padding:0 8px!important;
    font-size:11px!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v369 supplier pricebook: restore 4 columns, no aggressive compression/wrapping */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v369-supplier-pricebook-four-columns-no-compress'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-wrap{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow-x:auto!important;
  overflow-y:visible!important;
}
.rms-pro-shell .supplier-products-admin-list table.supplier-products-pricebook-table,
.rms-pro-shell table.supplier-products-pricebook-table{
  display:block!important;
  width:100%!important;
  min-width:940px!important;
  max-width:none!important;
  table-layout:auto!important;
  border-collapse:separate!important;
  border-spacing:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead,
.rms-pro-shell .supplier-products-pricebook-table tbody{
  display:block!important;
  width:100%!important;
  min-width:940px!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  display:grid!important;
  grid-template-columns:minmax(260px,34fr) minmax(190px,22fr) minmax(230px,25fr) minmax(150px,19fr)!important;
  column-gap:0!important;
  align-items:center!important;
  width:100%!important;
  min-width:940px!important;
  box-sizing:border-box!important;
  border-bottom:1px solid #e5e7eb!important;
}
.rms-pro-shell .supplier-products-pricebook-table th,
.rms-pro-shell .supplier-products-pricebook-table td{
  display:block!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding:10px 12px!important;
  border:0!important;
  overflow:visible!important;
  vertical-align:middle!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4){
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  color:#64748b!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  padding:10px 12px!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4)::after{
  content:none!important;
}
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(4),
.rms-pro-shell .supplier-products-price-action-cell{
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  padding:10px 12px!important;
  overflow:visible!important;
  position:relative!important;
  z-index:auto!important;
}
.rms-pro-shell .supplier-products-price-action-inner{
  display:flex!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  height:auto!important;
  align-items:center!important;
  justify-content:flex-start!important;
  gap:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-trend-slot{
  display:flex!important;
  justify-content:flex-start!important;
  align-items:center!important;
  width:auto!important;
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-product-price-trend{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:auto!important;
  min-width:72px!important;
  max-width:none!important;
  height:28px!important;
  padding:0 10px!important;
  white-space:nowrap!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
.rms-pro-shell .supplier-pricebook-name-action,
.rms-pro-shell .supplier-pricebook-main-text,
.rms-pro-shell .supplier-pricebook-price-main,
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-price-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint,
.rms-pro-shell .supplier-pricebook-product-meta{
  max-width:none!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-pricebook-name-action{
  color:#0f172a!important;
  text-decoration:none!important;
}
.rms-pro-shell .supplier-pricebook-name-action:hover,
.rms-pro-shell .supplier-pricebook-name-action.is-open{
  color:#2563eb!important;
  text-decoration:underline!important;
  text-underline-offset:3px!important;
}
.rms-pro-shell .supplier-products-name-action-menu{
  position:static!important;
  display:flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  gap:6px!important;
  width:max-content!important;
  max-width:100%!important;
  margin-top:8px!important;
  padding:8px!important;
  border:1px solid rgba(203,213,225,.9)!important;
  border-radius:14px!important;
  background:#fff!important;
  box-shadow:0 8px 20px rgba(15,23,42,.08)!important;
}
.rms-pro-shell .supplier-products-menu-shell,
.rms-pro-shell .supplier-products-ellipsis{
  display:none!important;
}
@media(max-width:1100px){
  .rms-pro-shell .supplier-products-admin-list table.supplier-products-pricebook-table,
  .rms-pro-shell .supplier-products-pricebook-table thead,
  .rms-pro-shell .supplier-products-pricebook-table tbody,
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    min-width:900px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(250px,34fr) minmax(180px,22fr) minmax(220px,25fr) minmax(140px,19fr)!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v370 supplier pricebook: 4 columns fit container, no cut / no forced horizontal shift */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v370-supplier-pricebook-four-columns-fit-no-cut'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-wrap,
.rms-pro-shell .supplier-products-admin-list,
.rms-pro-shell .supplier-products-admin-list table.supplier-products-pricebook-table,
.rms-pro-shell table.supplier-products-pricebook-table,
.rms-pro-shell .supplier-products-pricebook-table thead,
.rms-pro-shell .supplier-products-pricebook-table tbody{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-admin-list table.supplier-products-pricebook-table,
.rms-pro-shell table.supplier-products-pricebook-table{
  display:block!important;
  table-layout:auto!important;
  border-collapse:separate!important;
  border-spacing:0!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead,
.rms-pro-shell .supplier-products-pricebook-table tbody{
  display:block!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  display:grid!important;
  grid-template-columns:minmax(0,34fr) minmax(0,23fr) minmax(0,29fr) minmax(112px,14fr)!important;
  column-gap:0!important;
  align-items:center!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  border-bottom:1px solid #e5e7eb!important;
}
.rms-pro-shell .supplier-products-pricebook-table th,
.rms-pro-shell .supplier-products-pricebook-table td{
  display:block!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding:10px 8px!important;
  border:0!important;
  overflow:visible!important;
  vertical-align:middle!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4),
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(4),
.rms-pro-shell .supplier-products-price-action-cell{
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  color:inherit!important;
  overflow:visible!important;
  padding-left:8px!important;
  padding-right:8px!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4)::after{
  content:none!important;
}
.rms-pro-shell .supplier-products-price-action-inner{
  display:flex!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  align-items:center!important;
  justify-content:flex-start!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-trend-slot{
  display:flex!important;
  width:auto!important;
  min-width:0!important;
  max-width:100%!important;
  align-items:center!important;
  justify-content:flex-start!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-product-price-trend{
  display:inline-flex!important;
  width:auto!important;
  min-width:72px!important;
  max-width:100%!important;
  height:28px!important;
  padding:0 9px!important;
  align-items:center!important;
  justify-content:center!important;
  white-space:nowrap!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
.rms-pro-shell .supplier-pricebook-name-action,
.rms-pro-shell .supplier-pricebook-main-text,
.rms-pro-shell .supplier-pricebook-price-main,
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-price-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint,
.rms-pro-shell .supplier-pricebook-product-meta{
  display:inline-block!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
  vertical-align:bottom!important;
}
.rms-pro-shell .supplier-pricebook-name-action{
  border:0!important;
  background:transparent!important;
  padding:0!important;
  margin:0!important;
  color:#0f172a!important;
  font-size:13.8px!important;
  font-weight:950!important;
  line-height:1.2!important;
  text-align:left!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-pricebook-name-action:hover,
.rms-pro-shell .supplier-pricebook-name-action.is-open{
  color:#2563eb!important;
  text-decoration:underline!important;
  text-underline-offset:3px!important;
}
.rms-pro-shell .supplier-products-name-action-menu{
  position:static!important;
  display:flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  gap:6px!important;
  width:max-content!important;
  max-width:100%!important;
  margin-top:8px!important;
  padding:8px!important;
  border:1px solid rgba(203,213,225,.9)!important;
  border-radius:14px!important;
  background:#fff!important;
  box-shadow:0 8px 20px rgba(15,23,42,.08)!important;
}
.rms-pro-shell .supplier-products-menu-shell,
.rms-pro-shell .supplier-products-ellipsis{
  display:none!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,35fr) minmax(0,23fr) minmax(0,30fr) minmax(104px,12fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th,
  .rms-pro-shell .supplier-products-pricebook-table td{
    padding-left:6px!important;
    padding-right:6px!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v372 supplier pricebook: no dynamic column, ellipsis inside supplier cell */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v372-supplier-pricebook-supplier-cell-ellipsis'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-wrap,
.rms-pro-shell .supplier-products-admin-list table.supplier-products-pricebook-table,
.rms-pro-shell table.supplier-products-pricebook-table,
.rms-pro-shell .supplier-products-pricebook-table thead,
.rms-pro-shell .supplier-products-pricebook-table tbody{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  display:grid!important;
  grid-template-columns:minmax(0,36fr) minmax(0,28fr) minmax(0,36fr)!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  column-gap:0!important;
  align-items:center!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-products-pricebook-table th,
.rms-pro-shell .supplier-products-pricebook-table td{
  display:block!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding:10px 10px!important;
  border:0!important;
  overflow:visible!important;
  white-space:normal!important;
}
.rms-pro-shell .supplier-products-pricebook-table th:nth-child(4),
.rms-pro-shell .supplier-products-pricebook-table td:nth-child(4),
.rms-pro-shell .supplier-products-price-action-cell,
.rms-pro-shell .supplier-products-trend-slot,
.rms-pro-shell .supplier-product-price-trend,
.rms-pro-shell .supplier-products-name-action-menu{
  display:none!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-cell{
  overflow:visible!important;
  position:relative!important;
  z-index:30!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-grid{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 42px!important;
  gap:8px!important;
  align-items:center!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-supplier-text{
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-action-cell-wrap{
  position:relative!important;
  display:flex!important;
  justify-content:flex-end!important;
  align-items:center!important;
  width:42px!important;
  min-width:42px!important;
  max-width:42px!important;
  overflow:visible!important;
  z-index:50!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  align-items:center!important;
  justify-content:center!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  padding:0!important;
  margin:0!important;
  border-radius:12px!important;
  border:1px solid #dbe2ea!important;
  background:#fff!important;
  color:#334155!important;
  font-size:24px!important;
  font-weight:950!important;
  line-height:1!important;
  box-shadow:0 2px 10px rgba(15,23,42,.05)!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-ellipsis:hover,
.rms-pro-shell .supplier-products-ellipsis.is-open{
  border-color:#93c5fd!important;
  color:#2563eb!important;
  background:#eff6ff!important;
}
.rms-pro-shell .supplier-products-row-action-menu{
  position:absolute!important;
  top:40px!important;
  right:0!important;
  left:auto!important;
  width:170px!important;
  z-index:900!important;
  display:grid!important;
  visibility:visible!important;
  opacity:1!important;
}
.rms-pro-shell .supplier-pricebook-main-text,
.rms-pro-shell .supplier-pricebook-price-main,
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-price-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint,
.rms-pro-shell .supplier-pricebook-product-meta{
  display:inline-block!important;
  max-width:none!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,36fr) minmax(0,28fr) minmax(0,36fr)!important;
  }
  .rms-pro-shell .supplier-products-pricebook-table th,
  .rms-pro-shell .supplier-products-pricebook-table td{
    padding-left:7px!important;
    padding-right:7px!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v373 fix: show row action menu above table rows */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v373-supplier-pricebook-menu-visible'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-wrap,
.rms-pro-shell .supplier-products-pricebook-table,
.rms-pro-shell .supplier-products-pricebook-table thead,
.rms-pro-shell .supplier-products-pricebook-table tbody,
.rms-pro-shell .supplier-products-pricebook-table tr,
.rms-pro-shell .supplier-products-pricebook-table td{
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  position:relative!important;
  z-index:1!important;
}
.rms-pro-shell .supplier-products-pricebook-table tbody tr.supplier-product-row-menu-open{
  z-index:500!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-cell,
.rms-pro-shell .supplier-products-action-cell-wrap{
  position:relative!important;
  overflow:visible!important;
  z-index:600!important;
}
.rms-pro-shell .supplier-products-row-action-menu,
.rms-pro-shell .supplier-products-action-menu.supplier-products-row-action-menu{
  position:absolute!important;
  top:calc(100% + 8px)!important;
  right:0!important;
  left:auto!important;
  min-width:180px!important;
  width:180px!important;
  display:grid!important;
  gap:0!important;
  padding:8px!important;
  border-radius:16px!important;
  background:#fff!important;
  border:1px solid #dbe2ea!important;
  box-shadow:0 20px 50px rgba(15,23,42,.18)!important;
  z-index:99999!important;
  visibility:visible!important;
  opacity:1!important;
  transform:none!important;
}
.rms-pro-shell .supplier-products-row-action-menu button{
  position:relative!important;
  z-index:100000!important;
  display:flex!important;
  align-items:center!important;
  width:100%!important;
  padding:11px 12px!important;
  border:0!important;
  background:transparent!important;
  text-align:left!important;
  font-weight:800!important;
  color:#0f172a!important;
  border-radius:10px!important;
}
.rms-pro-shell .supplier-products-row-action-menu button:hover{
  background:#f8fafc!important;
}
.rms-pro-shell .supplier-products-row-action-menu button.danger{
  color:#dc2626!important;
}
`
    document.head.appendChild(style)
  }
}


/* v374 supplier pricebook: ellipsis opens inline action bar, no popup/z-index dependency */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v374-supplier-pricebook-inline-ellipsis-actions'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-pricebook-supplier-action-grid{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 42px!important;
  gap:8px!important;
  align-items:center!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-inline-row-actions{
  grid-column:1 / -1!important;
  display:flex!important;
  flex-wrap:wrap!important;
  gap:6px!important;
  align-items:center!important;
  justify-content:flex-start!important;
  margin-top:8px!important;
  padding:8px!important;
  border:1px solid rgba(203,213,225,.95)!important;
  border-radius:14px!important;
  background:#fff!important;
  box-shadow:0 8px 22px rgba(15,23,42,.08)!important;
  width:100%!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  position:static!important;
  visibility:visible!important;
  opacity:1!important;
  z-index:auto!important;
}
.rms-pro-shell .supplier-products-inline-row-actions button{
  height:30px!important;
  padding:0 10px!important;
  border:1px solid #e2e8f0!important;
  border-radius:10px!important;
  background:#f8fafc!important;
  color:#0f172a!important;
  font-size:11.5px!important;
  font-weight:900!important;
  line-height:1!important;
  white-space:nowrap!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-inline-row-actions button:hover{
  background:#eff6ff!important;
  border-color:#bfdbfe!important;
  color:#1d4ed8!important;
}
.rms-pro-shell .supplier-products-inline-row-actions button.danger{
  background:#fff1f2!important;
  border-color:#fecdd3!important;
  color:#b91c1c!important;
}
.rms-pro-shell .supplier-products-inline-row-actions button.danger:hover{
  background:#ffe4e6!important;
  color:#991b1b!important;
}
.rms-pro-shell .supplier-products-inline-row-actions button:disabled{
  opacity:.45!important;
  cursor:not-allowed!important;
}
.rms-pro-shell .supplier-products-row-action-menu,
.rms-pro-shell .supplier-products-action-menu.supplier-products-row-action-menu{
  display:none!important;
}
.rms-pro-shell .supplier-products-pricebook-table tbody tr.supplier-product-row-menu-open{
  z-index:auto!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  align-items:center!important;
  justify-content:center!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  padding:0!important;
  margin:0!important;
  border-radius:12px!important;
  border:1px solid #dbe2ea!important;
  background:#fff!important;
  color:#334155!important;
  font-size:24px!important;
  font-weight:950!important;
  line-height:1!important;
  box-shadow:0 2px 10px rgba(15,23,42,.05)!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-ellipsis:hover,
.rms-pro-shell .supplier-products-ellipsis.is-open{
  border-color:#93c5fd!important;
  color:#2563eb!important;
  background:#eff6ff!important;
}
`
    document.head.appendChild(style)
  }
}


/* v375 supplier pricebook: full-width action row instead of tall supplier-cell menu */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v375-supplier-pricebook-full-width-action-row'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-inline-row-actions{
  display:none!important;
}
.rms-pro-shell .supplier-products-pricebook-table tbody tr.supplier-products-full-action-row{
  display:grid!important;
  grid-template-columns:1fr!important;
  min-height:auto!important;
  background:#f8fbff!important;
  border-bottom:1px solid #e5e7eb!important;
}
.rms-pro-shell .supplier-products-pricebook-table tbody tr.supplier-products-full-action-row td{
  display:block!important;
  grid-column:1 / -1!important;
  width:100%!important;
  max-width:100%!important;
  padding:8px 10px 12px!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-products-full-action-panel{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-start!important;
  gap:8px!important;
  width:100%!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding:9px 10px!important;
  border:1px solid rgba(203,213,225,.95)!important;
  border-radius:15px!important;
  background:#fff!important;
  box-shadow:0 8px 22px rgba(15,23,42,.055)!important;
  overflow:hidden!important;
}
.rms-pro-shell .supplier-products-full-action-panel span{
  min-width:0!important;
  max-width:42%!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:850!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-products-full-action-panel span b{
  color:#0f172a!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-products-full-action-panel button{
  height:32px!important;
  padding:0 11px!important;
  border:1px solid #e2e8f0!important;
  border-radius:10px!important;
  background:#f8fafc!important;
  color:#0f172a!important;
  font-size:11.5px!important;
  font-weight:900!important;
  line-height:1!important;
  white-space:nowrap!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-full-action-panel button:hover{
  background:#eff6ff!important;
  border-color:#bfdbfe!important;
  color:#1d4ed8!important;
}
.rms-pro-shell .supplier-products-full-action-panel button.danger{
  margin-left:auto!important;
  background:#fff1f2!important;
  border-color:#fecdd3!important;
  color:#b91c1c!important;
}
.rms-pro-shell .supplier-products-full-action-panel button.danger:hover{
  background:#ffe4e6!important;
  color:#991b1b!important;
}
.rms-pro-shell .supplier-products-full-action-panel button:disabled{
  opacity:.45!important;
  cursor:not-allowed!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-grid{
  align-items:center!important;
}
@media(max-width:900px){
  .rms-pro-shell .supplier-products-full-action-panel{
    flex-wrap:wrap!important;
  }
  .rms-pro-shell .supplier-products-full-action-panel span{
    flex-basis:100%!important;
    max-width:100%!important;
  }
  .rms-pro-shell .supplier-products-full-action-panel button.danger{
    margin-left:0!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v376 supplier pricebook: do not shorten product / supplier names */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v376-supplier-pricebook-names-not-shortened'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,34fr) minmax(0,26fr) minmax(0,40fr)!important;
}
.rms-pro-shell .supplier-pricebook-product-cell,
.rms-pro-shell .supplier-pricebook-price-cell,
.rms-pro-shell .supplier-pricebook-supplier-cell,
.rms-pro-shell .supplier-pricebook-supplier-action-cell,
.rms-pro-shell .supplier-pricebook-supplier-text{
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-main-text,
.rms-pro-shell .supplier-pricebook-price-main,
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-product-meta,
.rms-pro-shell .supplier-pricebook-price-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint{
  display:inline-block!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-grid{
  grid-template-columns:minmax(0,1fr) 42px!important;
  gap:10px!important;
}
.rms-pro-shell .supplier-products-full-action-panel span{
  max-width:none!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,34fr) minmax(0,25fr) minmax(0,41fr)!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v377 supplier pricebook: full supplier name before ellipsis button */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v377-supplier-pricebook-supplier-full-name'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,33fr) minmax(0,25fr) minmax(0,42fr)!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-cell{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-grid{
  display:inline-grid!important;
  grid-template-columns:max-content 42px!important;
  width:auto!important;
  min-width:0!important;
  max-width:none!important;
  gap:10px!important;
  align-items:center!important;
  justify-content:center!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-supplier-text{
  display:block!important;
  width:max-content!important;
  min-width:max-content!important;
  max-width:none!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-text .hint{
  display:inline-block!important;
  width:auto!important;
  min-width:max-content!important;
  max-width:none!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-products-action-cell-wrap{
  width:42px!important;
  min-width:42px!important;
  max-width:42px!important;
  display:flex!important;
  justify-content:flex-end!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  flex:0 0 34px!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,32fr) minmax(0,25fr) minmax(0,43fr)!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v378 supplier pricebook: full supplier name + dots stay inside supplier column */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v378-supplier-pricebook-supplier-name-and-dots-fit'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,32fr) minmax(0,24fr) minmax(0,44fr)!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-cell{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-pricebook-supplier-action-grid{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 42px!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  gap:10px!important;
  align-items:center!important;
  justify-content:stretch!important;
  overflow:visible!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-pricebook-supplier-text{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-text .hint{
  display:inline-block!important;
  width:auto!important;
  max-width:none!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-products-action-cell-wrap{
  display:flex!important;
  justify-content:flex-end!important;
  align-items:center!important;
  width:42px!important;
  min-width:42px!important;
  max-width:42px!important;
  overflow:visible!important;
  justify-self:end!important;
}
.rms-pro-shell .supplier-products-ellipsis{
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  flex:0 0 34px!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  margin:0!important;
  transform:none!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,31fr) minmax(0,23fr) minmax(0,46fr)!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v379 supplier pricebook: hard stop ellipsis for supplier name/date */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v379-supplier-pricebook-stop-supplier-ellipsis'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-table thead tr,
.rms-pro-shell .supplier-products-pricebook-table tbody tr{
  grid-template-columns:minmax(0,31fr) minmax(0,24fr) minmax(0,45fr)!important;
}
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell,
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-action-cell{
  overflow:visible!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
}
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell .supplier-pricebook-supplier-action-grid{
  display:grid!important;
  grid-template-columns:minmax(max-content,1fr) 42px!important;
  gap:10px!important;
  align-items:center!important;
  justify-content:stretch!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell .supplier-pricebook-supplier-text{
  display:block!important;
  width:auto!important;
  min-width:max-content!important;
  max-width:none!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell .supplier-pricebook-supplier-text span.supplier-pricebook-supplier-main{
  display:inline!important;
  width:auto!important;
  min-width:0!important;
  max-width:none!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell .supplier-pricebook-supplier-text .hint,
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell span.hint{
  display:inline-block!important;
  width:auto!important;
  min-width:0!important;
  max-width:none!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
}
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell .supplier-products-action-cell-wrap{
  justify-self:end!important;
  width:42px!important;
  min-width:42px!important;
  max-width:42px!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-pricebook-table td.supplier-pricebook-supplier-cell .supplier-products-ellipsis{
  display:inline-flex!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  flex:0 0 34px!important;
  overflow:visible!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-table tbody tr{
    grid-template-columns:minmax(0,30fr) minmax(0,23fr) minmax(0,47fr)!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v380 supplier pricebook: clean table, separate fixed actions column */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v380-supplier-pricebook-clean-actions-column'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-products-pricebook-wrap{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow-x:hidden!important;
  overflow-y:visible!important;
  border-radius:18px!important;
}
.rms-pro-shell table.supplier-products-pricebook-clean-table,
.rms-pro-shell .supplier-products-pricebook-clean-table thead,
.rms-pro-shell .supplier-products-pricebook-clean-table tbody{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
  table-layout:auto!important;
  border-collapse:separate!important;
  border-spacing:0!important;
}
.rms-pro-shell .supplier-products-pricebook-clean-table thead tr,
.rms-pro-shell .supplier-products-pricebook-clean-table tbody tr{
  display:grid!important;
  grid-template-columns:minmax(0,35fr) minmax(0,28fr) minmax(0,31fr) 56px!important;
  align-items:center!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  column-gap:0!important;
  box-sizing:border-box!important;
  border-bottom:1px solid #e5e7eb!important;
}
.rms-pro-shell .supplier-products-pricebook-clean-table th,
.rms-pro-shell .supplier-products-pricebook-clean-table td{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  padding:11px 10px!important;
  border:0!important;
  overflow:visible!important;
  vertical-align:middle!important;
}
.rms-pro-shell .supplier-products-pricebook-clean-table th:nth-child(4),
.rms-pro-shell .supplier-products-pricebook-clean-table td:nth-child(4){
  width:56px!important;
  min-width:56px!important;
  max-width:56px!important;
  padding-left:4px!important;
  padding-right:8px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-main-text,
.rms-pro-shell .supplier-pricebook-price-main,
.rms-pro-shell .supplier-pricebook-supplier-main,
.rms-pro-shell .supplier-pricebook-product-meta,
.rms-pro-shell .supplier-pricebook-price-cell .hint,
.rms-pro-shell .supplier-pricebook-supplier-cell .hint{
  display:inline-block!important;
  width:auto!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  word-break:normal!important;
  line-height:1.25!important;
}
.rms-pro-shell .supplier-pricebook-product-cell,
.rms-pro-shell .supplier-pricebook-price-cell,
.rms-pro-shell .supplier-pricebook-supplier-cell{
  overflow:visible!important;
}
.rms-pro-shell .supplier-products-clean-action-cell{
  position:relative!important;
  overflow:visible!important;
  z-index:30!important;
}
.rms-pro-shell .supplier-products-clean-ellipsis{
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  align-items:center!important;
  justify-content:center!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  padding:0!important;
  margin:0!important;
  border-radius:12px!important;
  border:1px solid #dbe2ea!important;
  background:#fff!important;
  color:#334155!important;
  font-size:24px!important;
  font-weight:950!important;
  line-height:1!important;
  box-shadow:0 2px 10px rgba(15,23,42,.05)!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-clean-ellipsis:hover,
.rms-pro-shell .supplier-products-clean-ellipsis.is-open{
  border-color:#93c5fd!important;
  color:#2563eb!important;
  background:#eff6ff!important;
}
.rms-pro-shell .supplier-products-pricebook-clean-table tbody tr.supplier-products-full-action-row{
  display:grid!important;
  grid-template-columns:1fr!important;
  min-height:auto!important;
  background:#f8fbff!important;
}
.rms-pro-shell .supplier-products-pricebook-clean-table tbody tr.supplier-products-full-action-row td{
  display:block!important;
  grid-column:1 / -1!important;
  width:100%!important;
  max-width:100%!important;
  padding:8px 10px 12px!important;
}
.rms-pro-shell .supplier-products-full-action-panel{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-start!important;
  gap:8px!important;
  width:100%!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding:9px 10px!important;
  border:1px solid rgba(203,213,225,.95)!important;
  border-radius:15px!important;
  background:#fff!important;
  box-shadow:0 8px 22px rgba(15,23,42,.055)!important;
  overflow:hidden!important;
}
.rms-pro-shell .supplier-products-full-action-panel span{
  min-width:0!important;
  max-width:42%!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:850!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-products-full-action-panel span b{
  color:#0f172a!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-products-full-action-panel button{
  height:32px!important;
  padding:0 11px!important;
  border:1px solid #e2e8f0!important;
  border-radius:10px!important;
  background:#f8fafc!important;
  color:#0f172a!important;
  font-size:11.5px!important;
  font-weight:900!important;
  line-height:1!important;
  white-space:nowrap!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-products-full-action-panel button:hover{
  background:#eff6ff!important;
  border-color:#bfdbfe!important;
  color:#1d4ed8!important;
}
.rms-pro-shell .supplier-products-full-action-panel button.danger{
  margin-left:auto!important;
  background:#fff1f2!important;
  border-color:#fecdd3!important;
  color:#b91c1c!important;
}
.rms-pro-shell .supplier-products-full-action-panel button.danger:hover{
  background:#ffe4e6!important;
  color:#991b1b!important;
}
.rms-pro-shell .supplier-products-action-menu,
.rms-pro-shell .supplier-products-row-action-menu,
.rms-pro-shell .supplier-products-inline-row-actions,
.rms-pro-shell .supplier-products-name-action-menu,
.rms-pro-shell .supplier-products-trend-slot,
.rms-pro-shell .supplier-product-price-trend{
  display:none!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-products-pricebook-clean-table thead tr,
  .rms-pro-shell .supplier-products-pricebook-clean-table tbody tr{
    grid-template-columns:minmax(0,34fr) minmax(0,27fr) minmax(0,31fr) 54px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-clean-table th,
  .rms-pro-shell .supplier-products-pricebook-clean-table td{
    padding-left:8px!important;
    padding-right:8px!important;
  }
  .rms-pro-shell .supplier-products-pricebook-clean-table th:nth-child(4),
  .rms-pro-shell .supplier-products-pricebook-clean-table td:nth-child(4){
    width:54px!important;
    min-width:54px!important;
    max-width:54px!important;
    padding-right:7px!important;
  }
}
@media(max-width:900px){
  .rms-pro-shell .supplier-products-full-action-panel{
    flex-wrap:wrap!important;
  }
  .rms-pro-shell .supplier-products-full-action-panel span{
    flex-basis:100%!important;
    max-width:100%!important;
  }
  .rms-pro-shell .supplier-products-full-action-panel button.danger{
    margin-left:0!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v382 supplier pricebook final: isolated grid, stable dots */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v382-supplier-pricebook-grid-final-dots'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-pricebook-final-grid{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  overflow:visible!important;
  border:1px solid #e2e8f0!important;
  border-radius:18px!important;
  background:#fff!important;
}
.rms-pro-shell .supplier-pricebook-final-head,
.rms-pro-shell .supplier-pricebook-final-row{
  display:grid!important;
  grid-template-columns:minmax(0,36fr) minmax(0,29fr) minmax(0,35fr)!important;
  align-items:center!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-pricebook-final-head{
  min-height:44px!important;
  border-bottom:1px solid #e2e8f0!important;
  background:#f8fafc!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:950!important;
  text-transform:uppercase!important;
  letter-spacing:.03em!important;
}
.rms-pro-shell .supplier-pricebook-final-head > div{
  padding:10px 12px!important;
  min-width:0!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-pricebook-final-row{
  min-height:86px!important;
  border-bottom:1px solid #e5e7eb!important;
  background:#fff!important;
}
.rms-pro-shell .supplier-pricebook-final-row:nth-child(even){
  background:#fbfdff!important;
}
.rms-pro-shell .supplier-pricebook-final-product,
.rms-pro-shell .supplier-pricebook-final-price,
.rms-pro-shell .supplier-pricebook-final-supplier{
  min-width:0!important;
  max-width:100%!important;
  padding:12px!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-pricebook-final-product,
.rms-pro-shell .supplier-pricebook-final-price{
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-final-product strong,
.rms-pro-shell .supplier-pricebook-final-price strong,
.rms-pro-shell .supplier-pricebook-final-supplier-text strong{
  display:block!important;
  width:max-content!important;
  max-width:none!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  color:#0f172a!important;
  font-size:15px!important;
  line-height:1.22!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-pricebook-final-product span,
.rms-pro-shell .supplier-pricebook-final-price span,
.rms-pro-shell .supplier-pricebook-final-supplier-text span{
  display:block!important;
  width:max-content!important;
  max-width:none!important;
  margin-top:5px!important;
  overflow:visible!important;
  text-overflow:clip!important;
  white-space:nowrap!important;
  color:#64748b!important;
  font-size:12.5px!important;
  line-height:1.2!important;
  font-weight:800!important;
}
.rms-pro-shell .supplier-pricebook-final-product > span{
  display:inline-flex!important;
  width:auto!important;
  padding:4px 9px!important;
  border-radius:999px!important;
  background:#f1f5f9!important;
}
.rms-pro-shell .supplier-pricebook-final-supplier{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 38px!important;
  align-items:center!important;
  gap:10px!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-final-supplier-text{
  min-width:0!important;
  overflow:visible!important;
}
.rms-pro-shell .supplier-pricebook-final-dots{
  display:inline-flex!important;
  visibility:visible!important;
  opacity:1!important;
  justify-self:end!important;
  align-items:center!important;
  justify-content:center!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  padding:0!important;
  margin:0!important;
  border-radius:12px!important;
  border:1px solid #dbe2ea!important;
  background:#fff!important;
  color:#334155!important;
  font-size:24px!important;
  font-weight:950!important;
  line-height:1!important;
  box-shadow:0 2px 10px rgba(15,23,42,.05)!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-pricebook-final-dots:hover,
.rms-pro-shell .supplier-pricebook-final-dots.is-open{
  border-color:#93c5fd!important;
  color:#2563eb!important;
  background:#eff6ff!important;
}
.rms-pro-shell .supplier-pricebook-final-action-row{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  padding:8px 10px 12px!important;
  border-bottom:1px solid #e5e7eb!important;
  background:#f8fbff!important;
  box-sizing:border-box!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-start!important;
  gap:8px!important;
  width:100%!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  padding:9px 10px!important;
  border:1px solid rgba(203,213,225,.95)!important;
  border-radius:15px!important;
  background:#fff!important;
  box-shadow:0 8px 22px rgba(15,23,42,.055)!important;
  overflow:hidden!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel span{
  min-width:0!important;
  max-width:42%!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:850!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel span b{
  color:#0f172a!important;
  font-weight:950!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel button{
  height:32px!important;
  padding:0 11px!important;
  border:1px solid #e2e8f0!important;
  border-radius:10px!important;
  background:#f8fafc!important;
  color:#0f172a!important;
  font-size:11.5px!important;
  font-weight:900!important;
  line-height:1!important;
  white-space:nowrap!important;
  cursor:pointer!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel button:hover{
  background:#eff6ff!important;
  border-color:#bfdbfe!important;
  color:#1d4ed8!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel button.danger{
  margin-left:auto!important;
  background:#fff1f2!important;
  border-color:#fecdd3!important;
  color:#b91c1c!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel button.danger:hover{
  background:#ffe4e6!important;
  color:#991b1b!important;
}
.rms-pro-shell .supplier-pricebook-final-edit-actions{
  display:flex!important;
  gap:6px!important;
  justify-content:flex-end!important;
}
.rms-pro-shell .supplier-pricebook-final-empty{
  padding:18px!important;
  color:#64748b!important;
  font-weight:800!important;
}
@media(max-width:1180px){
  .rms-pro-shell .supplier-pricebook-final-head,
  .rms-pro-shell .supplier-pricebook-final-row{
    grid-template-columns:minmax(0,35fr) minmax(0,28fr) minmax(0,37fr)!important;
  }
  .rms-pro-shell .supplier-pricebook-final-product,
  .rms-pro-shell .supplier-pricebook-final-price,
  .rms-pro-shell .supplier-pricebook-final-supplier{
    padding-left:10px!important;
    padding-right:10px!important;
  }
}
@media(max-width:900px){
  .rms-pro-shell .supplier-pricebook-final-action-panel{
    flex-wrap:wrap!important;
  }
  .rms-pro-shell .supplier-pricebook-final-action-panel span{
    flex-basis:100%!important;
    max-width:100%!important;
  }
  .rms-pro-shell .supplier-pricebook-final-action-panel button.danger{
    margin-left:0!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v383 supplier pricebook: lighter text, keep bold only for product name */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v383-supplier-pricebook-font-and-statistics-label'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-pricebook-final-product strong{
  font-weight:950!important;
}
.rms-pro-shell .supplier-pricebook-final-price strong,
.rms-pro-shell .supplier-pricebook-final-supplier-text strong{
  font-weight:760!important;
}
.rms-pro-shell .supplier-pricebook-final-price span,
.rms-pro-shell .supplier-pricebook-final-supplier-text span{
  font-weight:650!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel span{
  font-weight:650!important;
}
.rms-pro-shell .supplier-pricebook-final-action-panel span b{
  font-weight:850!important;
}
`
    document.head.appendChild(style)
  }
}


/* v385 Reports Products: purchase price dynamics */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v385-reports-products-price-dynamics'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-v385-price-dynamics-card{
  margin-top:14px!important;
  padding:14px!important;
  border:1px solid #dbeafe!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#f8fbff,#ffffff)!important;
  box-shadow:0 10px 26px rgba(15,23,42,.045)!important;
}
.rms-pro-shell .reports-v385-price-dynamics-head{
  align-items:flex-start!important;
  gap:12px!important;
}
.rms-pro-shell .reports-v385-price-dynamics-head h4{
  margin:0 0 4px!important;
  font-size:17px!important;
  font-weight:900!important;
  color:#0f172a!important;
}
.rms-pro-shell .reports-v385-price-dynamics-head p{
  max-width:880px!important;
  margin:0!important;
  color:#64748b!important;
  font-size:13px!important;
  font-weight:650!important;
  line-height:1.35!important;
}
.rms-pro-shell .reports-v385-mode-switch{
  display:flex!important;
  gap:8px!important;
  flex-wrap:wrap!important;
  justify-content:flex-end!important;
}
.rms-pro-shell .reports-v385-price-dynamics-note{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:10px!important;
  margin:10px 0 12px!important;
  padding:9px 11px!important;
  border:1px solid #e2e8f0!important;
  border-radius:13px!important;
  background:#fff!important;
  color:#64748b!important;
  font-size:12.5px!important;
  font-weight:750!important;
}
.rms-pro-shell .reports-v385-price-dynamics-note b{
  color:#0f172a!important;
  font-weight:900!important;
}
.rms-pro-shell .reports-v385-price-dynamics-note .bad{
  color:#b91c1c!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis{
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:10px!important;
  margin-bottom:12px!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button{
  display:flex!important;
  flex-direction:column!important;
  align-items:flex-start!important;
  justify-content:center!important;
  min-height:78px!important;
  padding:12px!important;
  border:1px solid #e2e8f0!important;
  border-radius:15px!important;
  background:#fff!important;
  text-align:left!important;
  cursor:pointer!important;
  box-shadow:0 6px 18px rgba(15,23,42,.035)!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button:disabled{
  cursor:not-allowed!important;
  opacity:.55!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button.active{
  border-color:#93c5fd!important;
  box-shadow:0 0 0 3px rgba(59,130,246,.12)!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button span{
  color:#64748b!important;
  font-size:12px!important;
  font-weight:850!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button b{
  margin-top:3px!important;
  color:#0f172a!important;
  font-size:24px!important;
  font-weight:950!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button small{
  margin-top:3px!important;
  color:#64748b!important;
  font-size:11.5px!important;
  font-weight:750!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button.bad b,
.rms-pro-shell .reports-v385-price-dynamics-table .bad,
.rms-pro-shell .reports-v385-price-dynamics-table .bad b{
  color:#dc2626!important;
}
.rms-pro-shell .reports-v385-price-dynamics-kpis button.good b,
.rms-pro-shell .reports-v385-price-dynamics-table .good,
.rms-pro-shell .reports-v385-price-dynamics-table .good b{
  color:#059669!important;
}
.rms-pro-shell .reports-v385-price-dynamics-table-wrap{
  max-height:520px!important;
  overflow:auto!important;
  border-radius:15px!important;
  border:1px solid #e2e8f0!important;
  background:#fff!important;
}
.rms-pro-shell .reports-v385-price-dynamics-table{
  width:100%!important;
  border-collapse:separate!important;
  border-spacing:0!important;
  min-width:980px!important;
}
.rms-pro-shell .reports-v385-price-dynamics-table th{
  position:sticky!important;
  top:0!important;
  z-index:2!important;
  background:#f8fafc!important;
  color:#64748b!important;
  font-size:11px!important;
  font-weight:950!important;
  text-transform:uppercase!important;
  letter-spacing:.03em!important;
  padding:10px!important;
  border-bottom:1px solid #e2e8f0!important;
  text-align:left!important;
}
.rms-pro-shell .reports-v385-price-dynamics-table td{
  padding:10px!important;
  border-bottom:1px solid #edf2f7!important;
  color:#0f172a!important;
  font-size:12.5px!important;
  font-weight:700!important;
  vertical-align:middle!important;
}
.rms-pro-shell .reports-v385-price-dynamics-table td b{
  font-weight:900!important;
}
.rms-pro-shell .reports-v385-price-dynamics-table .hint{
  color:#64748b!important;
  font-size:11.5px!important;
  font-weight:650!important;
}
@media(max-width:1000px){
  .rms-pro-shell .reports-v385-price-dynamics-head{
    flex-direction:column!important;
  }
  .rms-pro-shell .reports-v385-mode-switch{
    justify-content:flex-start!important;
  }
  .rms-pro-shell .reports-v385-price-dynamics-kpis{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .reports-v385-price-dynamics-note{
    flex-direction:column!important;
    align-items:flex-start!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v386 reports open fix: selectedProductPeriodLabel declared before price dynamics label */


/* v387 reports open final fix: selectedProductPeriodLabel is declared before productPriceDynamicsModeLabel */


/* v388 reports products: product placeholder is connected to real ReportsProductsView; supports product tab aliases */


/* v390 supplier invoice items: price before row amount */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v390-supplier-invoice-items-price-before-sum'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .suppliers-purchase-price-table th:nth-child(5),
.rms-pro-shell .suppliers-purchase-price-table td:nth-child(5){
  width:190px!important;
}
.rms-pro-shell .suppliers-purchase-price-table th:nth-child(6),
.rms-pro-shell .suppliers-purchase-price-table td:nth-child(6){
  width:160px!important;
  text-align:left!important;
}
.rms-pro-shell .suppliers-purchase-price-table td:nth-child(5) .supplier-auto-unit-price{
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
}
`
    document.head.appendChild(style)
  }
}


/* v391 Reports access per user */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v391-reports-access-per-user'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-access-control-card{
  border-color:#dbeafe!important;
  background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)!important;
}
.rms-pro-shell .reports-access-control-grid{
  display:grid!important;
  grid-template-columns:repeat(auto-fit,minmax(280px,1fr))!important;
  gap:10px!important;
  margin-top:12px!important;
}
.rms-pro-shell .reports-access-control-row{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 160px 118px!important;
  align-items:center!important;
  gap:10px!important;
  padding:11px!important;
  border:1px solid #e2e8f0!important;
  border-radius:16px!important;
  background:#fff!important;
  box-shadow:0 8px 24px rgba(15,23,42,.04)!important;
}
.rms-pro-shell .reports-access-control-row>div{
  min-width:0!important;
}
.rms-pro-shell .reports-access-control-row strong{
  display:block!important;
  color:#0f172a!important;
  font-size:13.5px!important;
  line-height:1.2!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .reports-access-control-row span{
  display:block!important;
  margin-top:3px!important;
  color:#64748b!important;
  font-size:11.5px!important;
  font-weight:750!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.rms-pro-shell .reports-access-control-row select{
  height:36px!important;
  width:100%!important;
  border-radius:12px!important;
  font-size:12px!important;
  font-weight:850!important;
}
.rms-pro-shell .reports-access-control-row em{
  display:inline-flex!important;
  justify-content:center!important;
  align-items:center!important;
  height:28px!important;
  padding:0 9px!important;
  border-radius:999px!important;
  font-style:normal!important;
  font-size:10.5px!important;
  font-weight:950!important;
  white-space:nowrap!important;
}
.rms-pro-shell .reports-access-control-row.is-open em{
  color:#166534!important;
  background:#dcfce7!important;
}
.rms-pro-shell .reports-access-control-row.is-closed em{
  color:#991b1b!important;
  background:#fee2e2!important;
}
@media(max-width:760px){
  .rms-pro-shell .reports-access-control-row{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .reports-access-control-row em{
    justify-content:flex-start!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v391 reports access: new users do not receive Reports by default; dedicated Settings control added */


/* v392 browser tab branding: RMS Pro instead of NMS Cloud Pro */
if (typeof document !== 'undefined') {
  const RMS_BROWSER_TITLE = 'RMS Pro'

  const applyRmsBrowserBranding = () => {
    if (document.title !== RMS_BROWSER_TITLE) {
      document.title = RMS_BROWSER_TITLE
    }

    const upsertMeta = (selector, attrName, attrValue, contentValue) => {
      let meta = document.head.querySelector(selector)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute(attrName, attrValue)
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', contentValue)
    }

    upsertMeta('meta[name="application-name"]', 'name', 'application-name', RMS_BROWSER_TITLE)
    upsertMeta('meta[name="apple-mobile-web-app-title"]', 'name', 'apple-mobile-web-app-title', RMS_BROWSER_TITLE)
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', RMS_BROWSER_TITLE)
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', RMS_BROWSER_TITLE)
  }

  applyRmsBrowserBranding()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyRmsBrowserBranding, { once: true })
  }

  const rmsTitleObserver = new MutationObserver(() => {
    if (document.title !== RMS_BROWSER_TITLE) {
      applyRmsBrowserBranding()
    }
  })

  const titleNode = document.head.querySelector('title')
  if (titleNode) {
    rmsTitleObserver.observe(titleNode, { childList: true, characterData: true, subtree: true })
  }

  window.addEventListener('load', applyRmsBrowserBranding)
  setTimeout(applyRmsBrowserBranding, 500)
  setTimeout(applyRmsBrowserBranding, 1500)
}


/* v393 supplier journal: supplier can be edited in invoice view */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v393-supplier-journal-edit-supplier'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-invoice-summary-edit-grid{
  grid-template-columns:repeat(auto-fit,minmax(190px,1fr))!important;
}
.rms-pro-shell .supplier-invoice-summary-edit-grid label select{
  width:100%!important;
  min-width:0!important;
}
.rms-pro-shell .supplier-invoice-summary-edit-grid label span{
  white-space:nowrap!important;
}
`
    document.head.appendChild(style)
  }
}


/* v393 supplier journal: invoice supplier is editable from the invoice details card */


/* v394 report type permissions */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v394-report-type-permissions'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-type-access-card{
  border-color:#dbeafe!important;
  background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)!important;
}
.rms-pro-shell .reports-type-access-grid{
  display:grid!important;
  grid-template-columns:repeat(auto-fit,minmax(360px,1fr))!important;
  gap:12px!important;
  margin-top:12px!important;
}
.rms-pro-shell .reports-type-access-user{
  padding:12px!important;
  border:1px solid #e2e8f0!important;
  border-radius:18px!important;
  background:#fff!important;
  box-shadow:0 8px 24px rgba(15,23,42,.04)!important;
}
.rms-pro-shell .reports-type-access-user.is-section-closed{
  background:#fffafa!important;
  border-color:#fecaca!important;
}
.rms-pro-shell .reports-type-access-user-head{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:12px!important;
  margin-bottom:10px!important;
}
.rms-pro-shell .reports-type-access-user-head strong{
  display:block!important;
  color:#0f172a!important;
  font-size:14px!important;
  font-weight:950!important;
  line-height:1.2!important;
}
.rms-pro-shell .reports-type-access-user-head span{
  display:block!important;
  margin-top:3px!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:750!important;
}
.rms-pro-shell .reports-type-access-user-head em{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  min-width:86px!important;
  height:28px!important;
  padding:0 10px!important;
  border-radius:999px!important;
  font-style:normal!important;
  color:#1d4ed8!important;
  background:#dbeafe!important;
  font-size:11px!important;
  font-weight:950!important;
  white-space:nowrap!important;
}
.rms-pro-shell .reports-type-access-user.is-section-closed .reports-type-access-user-head em{
  color:#991b1b!important;
  background:#fee2e2!important;
}
.rms-pro-shell .reports-type-access-chip-grid{
  display:grid!important;
  grid-template-columns:repeat(auto-fit,minmax(132px,1fr))!important;
  gap:8px!important;
}
.rms-pro-shell .reports-type-access-chip{
  display:flex!important;
  align-items:center!important;
  gap:8px!important;
  min-height:36px!important;
  padding:7px 9px!important;
  border:1px solid #e2e8f0!important;
  border-radius:13px!important;
  background:#f8fafc!important;
  cursor:pointer!important;
  user-select:none!important;
}
.rms-pro-shell .reports-type-access-chip input{
  width:16px!important;
  height:16px!important;
  margin:0!important;
  accent-color:#2563eb!important;
}
.rms-pro-shell .reports-type-access-chip span{
  color:#64748b!important;
  font-size:13px!important;
  font-weight:900!important;
}
.rms-pro-shell .reports-type-access-chip b{
  color:#334155!important;
  font-size:12px!important;
  font-weight:850!important;
  line-height:1.1!important;
}
.rms-pro-shell .reports-type-access-chip.is-allowed{
  border-color:#bfdbfe!important;
  background:#eff6ff!important;
}
.rms-pro-shell .reports-type-access-chip.is-allowed b,
.rms-pro-shell .reports-type-access-chip.is-allowed span{
  color:#1d4ed8!important;
}
.rms-pro-shell .reports-type-access-chip.is-denied{
  opacity:.68!important;
}
.rms-pro-shell .reports-type-access-empty{
  grid-column:1 / -1!important;
  width:100%!important;
}
@media(max-width:760px){
  .rms-pro-shell .reports-type-access-grid{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .reports-type-access-chip-grid{
    grid-template-columns:1fr 1fr!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v394: per-report-type permissions inside Reports; removed duplicated general reports access card */


/* v395 Reports -> Products: restricted users load product purchases through secure RPC with direct/workspace fallback */


/* v396 Reports -> Products: All dates auto-compares latest purchase month with previous month for price dynamics */


/* v397 supplier product editor: liter is a real base unit and select has enough width */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v397-supplier-product-base-unit-liter'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .supplier-pricebook-product-edit > div{
  grid-template-columns:minmax(0,1fr) 132px!important;
}
.rms-pro-shell .supplier-pricebook-product-edit select{
  min-width:0!important;
}
.rms-pro-shell .supplier-pricebook-product-edit select:last-child{
  width:132px!important;
  min-width:132px!important;
}
`
    document.head.appendChild(style)
  }
}


/* v397 supplier products: BASE_UNITS includes liter (l); normalizeSupplierBaseUnit no longer converts l to ml */


/* v398 Reports -> Products: main report and unit mismatch use selected period; auto month compare is isolated to price dynamics only */


/* v399 Reports Products: backup-style animated loading progress */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v399-reports-products-loading-progress'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-v399-products-loading-panel{
  display:grid!important;
  grid-template-columns:44px minmax(0,1fr) 58px!important;
  align-items:center!important;
  gap:14px!important;
  margin:12px 0!important;
  padding:14px 16px!important;
  border:1px solid #bfdbfe!important;
  border-radius:18px!important;
  background:linear-gradient(135deg,#eff6ff 0%,#ffffff 58%,#f8fbff 100%)!important;
  box-shadow:0 12px 32px rgba(37,99,235,.09)!important;
}
.rms-pro-shell .reports-v399-products-loading-spinner{
  width:38px!important;
  height:38px!important;
  border-radius:50%!important;
  border:4px solid rgba(37,99,235,.14)!important;
  border-top-color:#2563eb!important;
  animation:rms-v399-products-spin .82s linear infinite!important;
}
.rms-pro-shell .reports-v399-products-loading-panel b{
  display:block!important;
  color:#0f172a!important;
  font-size:13.5px!important;
  font-weight:900!important;
  line-height:1.25!important;
}
.rms-pro-shell .reports-v399-products-loading-panel span{
  display:block!important;
  margin-top:3px!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:750!important;
  line-height:1.25!important;
}
.rms-pro-shell .reports-v399-products-loading-panel strong{
  justify-self:end!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:52px!important;
  height:32px!important;
  border-radius:999px!important;
  color:#1d4ed8!important;
  background:#dbeafe!important;
  font-size:12px!important;
  font-weight:950!important;
}
@keyframes rms-v399-products-spin{
  from{transform:rotate(0deg)}
  to{transform:rotate(360deg)}
}
`
    document.head.appendChild(style)
  }
}


/* v399: supplier product liter base unit requires SQL v399; Reports Products uses animated BackupProgressOverlay */


/* v400 Reports Products: compact loader, no full-screen black circle */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v400-products-report-compact-loader'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-v399-products-loading-panel{
  display:none!important;
}
.rms-pro-shell .reports-v400-products-loading-panel{
  display:grid!important;
  grid-template-columns:64px minmax(0,1fr)!important;
  align-items:center!important;
  gap:16px!important;
  margin:14px 0!important;
  padding:16px 18px!important;
  border:1px solid #bfdbfe!important;
  border-radius:20px!important;
  background:linear-gradient(135deg,#eff6ff 0%,#ffffff 62%,#f8fbff 100%)!important;
  box-shadow:0 14px 34px rgba(37,99,235,.10)!important;
  overflow:hidden!important;
}
.rms-pro-shell .reports-v400-products-loading-ring{
  position:relative!important;
  width:56px!important;
  height:56px!important;
  min-width:56px!important;
  border-radius:50%!important;
  background:conic-gradient(#2563eb 0deg,#2563eb 92deg,rgba(37,99,235,.13) 92deg 360deg)!important;
  animation:rms-v400-products-ring 1.15s linear infinite!important;
}
.rms-pro-shell .reports-v400-products-loading-ring:after{
  content:''!important;
  position:absolute!important;
  inset:6px!important;
  border-radius:50%!important;
  background:#fff!important;
  box-shadow:inset 0 0 0 1px rgba(191,219,254,.9)!important;
}
.rms-pro-shell .reports-v400-products-loading-ring span{
  position:absolute!important;
  z-index:2!important;
  inset:0!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  color:#1d4ed8!important;
  font-size:11px!important;
  font-weight:950!important;
  animation:rms-v400-products-ring-text 1.15s linear infinite reverse!important;
}
.rms-pro-shell .reports-v400-products-loading-body{
  min-width:0!important;
}
.rms-pro-shell .reports-v400-products-loading-body b{
  display:block!important;
  color:#0f172a!important;
  font-size:14px!important;
  font-weight:950!important;
  line-height:1.25!important;
}
.rms-pro-shell .reports-v400-products-loading-body span{
  display:block!important;
  margin-top:4px!important;
  color:#475569!important;
  font-size:12.5px!important;
  font-weight:750!important;
  line-height:1.35!important;
}
.rms-pro-shell .reports-v400-products-loading-track{
  position:relative!important;
  height:8px!important;
  margin-top:10px!important;
  border-radius:999px!important;
  background:#dbeafe!important;
  overflow:hidden!important;
}
.rms-pro-shell .reports-v400-products-loading-track i{
  display:block!important;
  height:100%!important;
  min-width:6%!important;
  border-radius:999px!important;
  background:linear-gradient(90deg,#60a5fa,#2563eb,#60a5fa)!important;
  background-size:200% 100%!important;
  animation:rms-v400-products-bar 1.1s ease-in-out infinite!important;
  transition:width .28s ease!important;
}
.rms-pro-shell .reports-v400-products-loading-body em{
  display:block!important;
  margin-top:7px!important;
  color:#64748b!important;
  font-style:normal!important;
  font-size:11.5px!important;
  font-weight:850!important;
}
@keyframes rms-v400-products-ring{
  from{transform:rotate(0deg)}
  to{transform:rotate(360deg)}
}
@keyframes rms-v400-products-ring-text{
  from{transform:rotate(0deg)}
  to{transform:rotate(360deg)}
}
@keyframes rms-v400-products-bar{
  0%{background-position:0% 50%}
  100%{background-position:200% 50%}
}
@media(max-width:720px){
  .rms-pro-shell .reports-v400-products-loading-panel{
    grid-template-columns:1fr!important;
  }
  .rms-pro-shell .reports-v400-products-loading-ring{
    justify-self:start!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v400: Reports Products uses compact inline loader; removes full-screen BackupProgressOverlay and reuses all-date purchase load */


/* v403 global RMS progress overlay: backup-style loader works outside Backup tab */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v403-global-backup-style-progress-overlay'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.backup-progress-overlay,
.rms-pro-shell .backup-progress-overlay{
  position:fixed!important;
  inset:0!important;
  z-index:12000!important;
  display:grid!important;
  place-items:center!important;
  padding:20px!important;
  background:rgba(15,23,42,.52)!important;
  backdrop-filter:blur(7px)!important;
  animation:backupOverlayIn .18s ease-out!important;
}
.backup-progress-card,
.rms-pro-shell .backup-progress-card{
  width:min(620px,calc(100vw - 32px))!important;
  display:grid!important;
  grid-template-columns:168px minmax(0,1fr)!important;
  align-items:center!important;
  gap:24px!important;
  padding:28px!important;
  border:1px solid rgba(148,163,184,.28)!important;
  border-radius:24px!important;
  background:rgba(255,255,255,.98)!important;
  box-shadow:0 28px 80px rgba(15,23,42,.28)!important;
  animation:backupCardIn .24s cubic-bezier(.2,.8,.2,1)!important;
}
.backup-progress-ring-wrap,
.rms-pro-shell .backup-progress-ring-wrap{
  position:relative!important;
  width:150px!important;
  height:150px!important;
  display:grid!important;
  place-items:center!important;
}
.backup-progress-ring,
.rms-pro-shell .backup-progress-ring{
  width:150px!important;
  height:150px!important;
  transform:rotate(-90deg)!important;
  overflow:visible!important;
}
.backup-progress-ring circle,
.rms-pro-shell .backup-progress-ring circle{
  fill:none!important;
  stroke-width:10!important;
}
.backup-progress-ring-bg,
.rms-pro-shell .backup-progress-ring-bg{
  stroke:#e2e8f0!important;
}
.backup-progress-ring-value,
.rms-pro-shell .backup-progress-ring-value{
  stroke:#2563eb!important;
  stroke-linecap:round!important;
  transition:stroke-dashoffset .35s ease, stroke .25s ease!important;
  filter:drop-shadow(0 0 5px rgba(37,99,235,.28))!important;
}
.backup-progress-card.is-success .backup-progress-ring-value,
.rms-pro-shell .backup-progress-card.is-success .backup-progress-ring-value{
  stroke:#16a34a!important;
}
.backup-progress-card.is-error .backup-progress-ring-value,
.rms-pro-shell .backup-progress-card.is-error .backup-progress-ring-value{
  stroke:#dc2626!important;
}
.backup-progress-percent,
.rms-pro-shell .backup-progress-percent{
  position:absolute!important;
  inset:0!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:2px!important;
  color:#0f172a!important;
}
.backup-progress-percent strong,
.rms-pro-shell .backup-progress-percent strong{
  font-size:42px!important;
  line-height:1!important;
  font-weight:900!important;
  letter-spacing:-2px!important;
}
.backup-progress-percent span,
.rms-pro-shell .backup-progress-percent span{
  align-self:center!important;
  margin-top:13px!important;
  font-size:15px!important;
  font-weight:800!important;
  color:#64748b!important;
}
.backup-progress-copy,
.rms-pro-shell .backup-progress-copy{
  min-width:0!important;
}
.backup-progress-eyebrow,
.rms-pro-shell .backup-progress-eyebrow{
  display:block!important;
  margin-bottom:7px!important;
  font-size:10px!important;
  font-weight:900!important;
  letter-spacing:.18em!important;
  color:#2563eb!important;
}
.backup-progress-copy h3,
.rms-pro-shell .backup-progress-copy h3{
  margin:0!important;
  color:#0f172a!important;
  font-size:26px!important;
  line-height:1.08!important;
  font-weight:850!important;
  letter-spacing:-.04em!important;
}
.backup-progress-copy p,
.rms-pro-shell .backup-progress-copy p{
  min-height:22px!important;
  margin:13px 0 22px!important;
  color:#64748b!important;
  font-size:14px!important;
  font-weight:500!important;
  line-height:1.4!important;
}
.backup-progress-track,
.rms-pro-shell .backup-progress-track{
  height:10px!important;
  width:100%!important;
  overflow:hidden!important;
  border-radius:999px!important;
  background:#e2e8f0!important;
}
.backup-progress-track>div,
.rms-pro-shell .backup-progress-track>div{
  height:100%!important;
  border-radius:999px!important;
  background:linear-gradient(90deg,#2563eb,#38bdf8)!important;
  transition:width .28s ease!important;
}
.backup-progress-card.is-success .backup-progress-track>div,
.rms-pro-shell .backup-progress-card.is-success .backup-progress-track>div{
  background:linear-gradient(90deg,#16a34a,#4ade80)!important;
}
.backup-progress-card.is-error .backup-progress-track>div,
.rms-pro-shell .backup-progress-card.is-error .backup-progress-track>div{
  background:linear-gradient(90deg,#dc2626,#fb7185)!important;
}
.backup-progress-footer,
.rms-pro-shell .backup-progress-footer{
  display:flex!important;
  justify-content:space-between!important;
  gap:16px!important;
  margin-top:12px!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:750!important;
}
.backup-progress-footer b,
.rms-pro-shell .backup-progress-footer b{
  color:#0f172a!important;
  font-weight:900!important;
}
@keyframes backupOverlayIn{
  from{opacity:0}
  to{opacity:1}
}
@keyframes backupCardIn{
  from{opacity:0;transform:translateY(10px) scale(.985)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
@media(max-width:620px){
  .backup-progress-card,
  .rms-pro-shell .backup-progress-card{
    grid-template-columns:1fr!important;
    text-align:center!important;
    padding:22px!important;
  }
  .backup-progress-ring-wrap,
  .rms-pro-shell .backup-progress-ring-wrap{
    margin:auto!important;
  }
  .backup-progress-footer,
  .rms-pro-shell .backup-progress-footer{
    text-align:left!important;
  }
  .backup-progress-copy p,
  .rms-pro-shell .backup-progress-copy p{
    min-height:0!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v403: backup-progress CSS is injected globally, so Reports loader is styled like Backup screen */


/* v404 Wolt settlement workflow */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v404-wolt-settlement-workflow'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .revenue-wolt-settlement-note{
  grid-column:1/-1;
  display:grid;
  gap:4px;
  margin:12px 0 2px;
  padding:12px 14px;
  border:1px solid #bfdbfe;
  border-radius:14px;
  background:#eff6ff;
}
.rms-pro-shell .revenue-wolt-settlement-note b{
  color:#1e3a8a;
  font-size:12.5px;
  font-weight:900;
}
.rms-pro-shell .revenue-wolt-settlement-note span{
  color:#475569;
  font-size:12px;
  font-weight:650;
  line-height:1.4;
}
`
    document.head.appendChild(style)
  }
}


/* v404: Wolt only BC1/BC3/Bistronomia; settlement-period gross revenue + separate Wolt Comission expense */


/* v405: no dedicated Wolt button; Wolt Comission is selected from the standard expense article dropdown */


/* v406 Dashboard branch revenue: base revenue + visually separated Wolt */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v406-dashboard-wolt-revenue-bars'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .dashboard-chart-card-wolt .card-head{
  align-items:flex-start!important;
}
.rms-pro-shell .dash-wolt-legend{
  display:flex!important;
  align-items:center!important;
  flex-wrap:wrap!important;
  gap:22px!important;
  margin-top:12px!important;
  color:#64748b!important;
  font-size:12px!important;
  font-weight:750!important;
}
.rms-pro-shell .dash-wolt-legend span{
  display:inline-flex!important;
  align-items:center!important;
  gap:8px!important;
}
.rms-pro-shell .dash-wolt-legend i{
  width:14px!important;
  height:14px!important;
  border-radius:4px!important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)!important;
}
.rms-pro-shell .dash-wolt-legend-base{
  background:linear-gradient(180deg,#64748b,#475569)!important;
}
.rms-pro-shell .dash-wolt-legend-wolt{
  background:linear-gradient(180deg,#22c1f1,#0284c7)!important;
}
.rms-pro-shell .dashboard-chart-card-wolt .dash-bars{
  gap:4px!important;
}
.rms-pro-shell .dash-bar-row-wolt{
  align-items:center!important;
  min-height:40px!important;
}
.rms-pro-shell .dash-bar-track-stacked{
  position:relative!important;
  height:18px!important;
  overflow:hidden!important;
  border-radius:999px!important;
  background:#dce3ed!important;
  box-shadow:inset 0 1px 2px rgba(15,23,42,.08)!important;
}
.rms-pro-shell .dash-bar-stack-base,
.rms-pro-shell .dash-bar-stack-wolt{
  position:absolute!important;
  top:0!important;
  bottom:0!important;
  transition:width .45s ease,left .45s ease!important;
}
.rms-pro-shell .dash-bar-stack-base{
  left:0!important;
  border-radius:999px 0 0 999px!important;
  background:linear-gradient(180deg,#64748b,#526176)!important;
}
.rms-pro-shell .dash-bar-stack-base:only-child{
  border-radius:999px!important;
}
.rms-pro-shell .dash-bar-stack-wolt{
  border-radius:0 999px 999px 0!important;
  background:linear-gradient(180deg,#22c1f1,#0295d1)!important;
  box-shadow:-1px 0 0 rgba(255,255,255,.22)!important;
}
.rms-pro-shell .dash-bar-value-wolt{
  display:flex!important;
  flex-direction:column!important;
  align-items:flex-end!important;
  justify-content:center!important;
  gap:3px!important;
  line-height:1.12!important;
}
.rms-pro-shell .dash-bar-value-main{
  display:flex!important;
  align-items:baseline!important;
  justify-content:flex-end!important;
  gap:10px!important;
  width:100%!important;
}
.rms-pro-shell .dash-bar-value-wolt small{
  display:block!important;
  color:#64748b!important;
  font-size:10.5px!important;
  font-weight:750!important;
  white-space:nowrap!important;
}
.rms-pro-shell .dash-bar-value-wolt.dash-bar-value-no-wolt{
  gap:0!important;
}
@media(max-width:900px){
  .rms-pro-shell .dash-bar-row-wolt{
    grid-template-columns:72px minmax(120px,1fr) minmax(132px,auto)!important;
  }
  .rms-pro-shell .dash-bar-value-main{
    gap:5px!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v406: Dashboard revenue bars split base revenue and Wolt; secondary line shows total with Wolt */


/* v407: reduced vertical spacing between branch revenue rows in Wolt chart only */



/* v408: hide zero-Wolt labels and persist active top-level RMS section in localStorage */


/* v409: fixes Vite build error from raw CSS; zero-Wolt and section persistence logic retained */


/* v410: dashboard main figure is total revenue including Wolt; small line shows Wolt only; Finance daily chart is cash + bank only */


/* v411: Reports Overview rebuilt as a relevant RMS management summary using actual revenue and expenses */


/* v413: Reports Overview returned to v411 and now switches only between Revenue and Expenses */


/* v414: Suppliers report rebuilt with period analytics, supplier drill-down, purchases, products and price changes */


/* v415: fixes DateInput handlers, applies supplier/search filters to KPIs and hides irrelevant Type filter */


/* v416: final supplier analytics build; fixes hook dependency order and removes empty supplier ids */


/* v417: new Reports -> Branch Profitability with Food Cost, payroll, service charge, tax and Wolt analysis */


/* v418: profitability employees query uses existing schema columns only */


/* v419 Products report: purchase amount change vs analogous previous-month period */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'rms-v419-products-purchase-amount-dynamics'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.rms-pro-shell .reports-v419-amount-dynamics-note{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:18px!important;
  margin-top:14px!important;
  padding:12px 14px!important;
  border:1px solid #dbe4ef!important;
  border-radius:15px!important;
  background:linear-gradient(135deg,#f8fafc,#ffffff)!important;
}
.rms-pro-shell .reports-v419-amount-dynamics-note div{
  min-width:0!important;
}
.rms-pro-shell .reports-v419-amount-dynamics-note b{
  display:block!important;
  color:#0f172a!important;
  font-size:12px!important;
  font-weight:950!important;
}
.rms-pro-shell .reports-v419-amount-dynamics-note span{
  display:block!important;
  margin-top:3px!important;
  color:#475569!important;
  font-size:10.5px!important;
  font-weight:750!important;
}
.rms-pro-shell .reports-v419-amount-dynamics-note small{
  max-width:480px!important;
  color:#64748b!important;
  font-size:10px!important;
  font-weight:650!important;
  line-height:1.35!important;
  text-align:right!important;
}
.rms-pro-shell .reports-v419-amount-delta{
  min-width:158px!important;
  line-height:1.2!important;
}
.rms-pro-shell .reports-v419-amount-delta b,
.rms-pro-shell .reports-v419-amount-delta span,
.rms-pro-shell .reports-v419-amount-delta small{
  display:block!important;
}
.rms-pro-shell .reports-v419-amount-delta b{
  font-size:10.8px!important;
  font-weight:950!important;
  white-space:nowrap!important;
}
.rms-pro-shell .reports-v419-amount-delta span{
  margin-top:2px!important;
  font-size:10px!important;
  font-weight:900!important;
}
.rms-pro-shell .reports-v419-amount-delta small{
  margin-top:4px!important;
  color:#64748b!important;
  font-size:9.5px!important;
  font-weight:700!important;
  white-space:nowrap!important;
}
.rms-pro-shell .reports-v419-amount-delta.up b,
.rms-pro-shell .reports-v419-amount-delta.up span{
  color:#dc2626!important;
}
.rms-pro-shell .reports-v419-amount-delta.down b,
.rms-pro-shell .reports-v419-amount-delta.down span{
  color:#059669!important;
}
.rms-pro-shell .reports-v419-amount-delta.new b{
  color:#2563eb!important;
}
.rms-pro-shell .reports-v419-amount-delta.flat b{
  color:#475569!important;
}
@media(max-width:850px){
  .rms-pro-shell .reports-v419-amount-dynamics-note{
    align-items:flex-start!important;
    flex-direction:column!important;
  }
  .rms-pro-shell .reports-v419-amount-dynamics-note small{
    max-width:none!important;
    text-align:left!important;
  }
}
`
    document.head.appendChild(style)
  }
}


/* v419: product rows show purchase-amount growth/fall against the analogous previous-month period */


/* v420: Inventory rebuilt as full operational warehouse with documents, transfers, write-offs, production and stocktakes */


/* v421: branches bootstrap as warehouse locations; supplier products selectable before stock exists; initial receipt added */


/* v422: restores RMS_AZ_EXTRA_TRANSLATIONS removed during InventoryModule replacement */

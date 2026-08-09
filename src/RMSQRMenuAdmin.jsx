import React, { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Languages,
  Plus,
  QrCode,
  Search,
  Store,
  Trash2,
  X,
  Pencil
} from 'lucide-react'
import { supabase } from './supabase'
import { localizeProduct } from './qrMenuTranslations'
import './RMSQRMenuAdmin.css'

const fmt = (n) => Number(n || 0).toFixed(2)
const appOrigin = () => window.location.origin
const imageBucket = 'qr-menu-images'
const DEFAULT_QR_BRANCHES = ['BC1', 'BC2', 'BC3', 'BC4', 'BC5', 'Bistro']
const QR_MENU_BRANCHES = ['BC1', 'BC2', 'BC4', 'BC5']
const APPROVED_MENU_BRANCH = 'BC1'
const BRANCH_MENU_CONFIG_TABLE = '__QR_BRANCH_MENU_V1__'

const QR_ADMIN_TEXT = {
  ru: {
    title: 'QR Menu', subtitle: 'Филиалы, QR-коды и состав меню на основе подтверждённого каталога.', refresh: 'Обновить', loading: 'Загрузка...',
    tables: 'QR и столы', menu: 'Филиалы и меню', recommendations: 'Рекомендации', ratings: 'Рейтинги', bills: 'Счета / оплаты', ads: 'Реклама', calls: 'Вызовы', cart: 'Shared Cart', status: 'Kitchen Status', info: 'Инфо',
    branchMenus: 'QR Menu по филиалам', sharedCatalog: 'Эталон: Rashid Behbudova', sharedHint: 'BC1 / Rashid Behbudova — подтверждённый каталог. В меню других филиалов можно добавлять только позиции из этого каталога и удалять их независимо.',
    connected: 'Подключено', source: 'Эталон', items: 'позиций', manage: 'Управлять', open: 'Открыть меню', copy: 'Копировать ссылку', copied: 'Ссылка скопирована',
    catalogue: 'Меню выбранного филиала', catalogueHint: 'Название, фото, цена и переводы RU / AZ / EN берутся из подтверждённого QR Menu Rashid Behbudova.',
    allCategories: 'Все категории', allStatuses: 'Все статусы', active: 'Активные', stopped: 'Stop-list', hidden: 'Скрытые', search: 'Поиск по названию, описанию или переводу',
    addItem: 'Добавить позицию', addFromApproved: 'Добавить из Rashid Behbudova', total: 'В филиале', approved: 'Подтверждено в BC1', availableToAdd: 'Можно добавить', withoutPhoto: 'Без фото', languages: 'Языки', edit: 'Изменить', delete: 'Удалить', removeFromBranch: 'Убрать из филиала', noItems: 'Позиции не найдены.',
    pickerTitle: 'Подтверждённые позиции Rashid Behbudova', pickerHint: 'Выберите позицию — она сразу появится только в меню выбранного филиала.', allApprovedAdded: 'Все подтверждённые позиции уже добавлены в этот филиал.', masterHint: 'Состав BC1 является эталонным. Добавление и удаление выполняется в меню остальных филиалов.', migrationRequired: 'Настройки филиальных меню временно недоступны.',
    addedToBranch: 'Позиция добавлена в меню филиала', removedFromBranch: 'Позиция удалена из меню филиала', confirmRemove: 'Убрать позицию из меню выбранного филиала?',
    editItem: 'Редактирование позиции', addItemTitle: 'Новая позиция', russianSource: 'Русский · основной', autoTranslation: 'AZ и EN · перевод гостевого меню',
    translationHint: 'Азербайджанский и английский варианты автоматически берутся из подтверждённого словаря QR Menu.', name: 'Название', category: 'Категория', description: 'Описание', price: 'Цена', image: 'Изображение', imageLink: 'Ссылка изображения',
    save: 'Сохранить', cancel: 'Отмена', upload: 'Загрузить фото', enabled: 'Активна', available: 'Доступна', stop: 'Stop', preview: 'Предпросмотр', noDescription: 'Описание не заполнено',
    branchPrefix: 'Barista&Chef'
  },
  az: {
    title: 'QR Menu', subtitle: 'Filiallar, QR-kodlar və təsdiqlənmiş kataloq əsasında menyu tərkibi.', refresh: 'Yenilə', loading: 'Yüklənir...',
    tables: 'QR və masalar', menu: 'Filiallar və menyu', recommendations: 'Tövsiyələr', ratings: 'Reytinqlər', bills: 'Hesablar / ödənişlər', ads: 'Reklam', calls: 'Çağırışlar', cart: 'Shared Cart', status: 'Kitchen Status', info: 'Məlumat',
    branchMenus: 'Filiallar üzrə QR Menu', sharedCatalog: 'Etalon: Rashid Behbudova', sharedHint: 'BC1 / Rashid Behbudova təsdiqlənmiş kataloqdur. Digər filialların menyusuna yalnız bu kataloqdakı mövqeləri əlavə etmək və onları ayrıca silmək olar.',
    connected: 'Qoşulub', source: 'Etalon', items: 'mövqe', manage: 'İdarə et', open: 'Menyunu aç', copy: 'Linki köçür', copied: 'Link köçürüldü',
    catalogue: 'Seçilmiş filialın menyusu', catalogueHint: 'Ad, foto, qiymət və RU / AZ / EN tərcümələri Rashid Behbudova-nın təsdiqlənmiş QR Menu-sundan götürülür.',
    allCategories: 'Bütün kateqoriyalar', allStatuses: 'Bütün statuslar', active: 'Aktiv', stopped: 'Stop-list', hidden: 'Gizli', search: 'Ad, təsvir və ya tərcümə üzrə axtarış',
    addItem: 'Mövqe əlavə et', addFromApproved: 'Rashid Behbudova-dan əlavə et', total: 'Filialda', approved: 'BC1-də təsdiqlənib', availableToAdd: 'Əlavə etmək olar', withoutPhoto: 'Fotosuz', languages: 'Dillər', edit: 'Dəyiş', delete: 'Sil', removeFromBranch: 'Filialdan sil', noItems: 'Mövqe tapılmadı.',
    pickerTitle: 'Rashid Behbudova-nın təsdiqlənmiş mövqeləri', pickerHint: 'Mövqeni seçin — o, dərhal yalnız seçilmiş filialın menyusuna əlavə olunacaq.', allApprovedAdded: 'Bütün təsdiqlənmiş mövqelər artıq bu filiala əlavə edilib.', masterHint: 'BC1-in tərkibi etalondur. Əlavə etmə və silmə digər filialların menyusunda aparılır.', migrationRequired: 'Filial menyusu sazlamaları müvəqqəti əlçatan deyil.',
    addedToBranch: 'Mövqe filialın menyusuna əlavə edildi', removedFromBranch: 'Mövqe filialın menyusundan silindi', confirmRemove: 'Mövqe seçilmiş filialın menyusundan silinsin?',
    editItem: 'Mövqenin redaktəsi', addItemTitle: 'Yeni mövqe', russianSource: 'Rus dili · əsas', autoTranslation: 'AZ və EN · qonaq menyusunun tərcüməsi',
    translationHint: 'Azərbaycan və ingilis variantları QR Menu-nun təsdiqlənmiş lüğətindən avtomatik götürülür.', name: 'Ad', category: 'Kateqoriya', description: 'Təsvir', price: 'Qiymət', image: 'Şəkil', imageLink: 'Şəkil linki',
    save: 'Yadda saxla', cancel: 'Ləğv et', upload: 'Foto yüklə', enabled: 'Aktivdir', available: 'Mövcuddur', stop: 'Stop', preview: 'Önizləmə', noDescription: 'Təsvir doldurulmayıb',
    branchPrefix: 'Barista&Chef'
  },
  en: {
    title: 'QR Menu', subtitle: 'Branches, QR codes and branch menus based on the approved catalogue.', refresh: 'Refresh', loading: 'Loading...',
    tables: 'QR & tables', menu: 'Branches & menu', recommendations: 'Recommendations', ratings: 'Ratings', bills: 'Bills / payments', ads: 'Advertising', calls: 'Calls', cart: 'Shared Cart', status: 'Kitchen Status', info: 'Info',
    branchMenus: 'QR Menu by branch', sharedCatalog: 'Source: Rashid Behbudova', sharedHint: 'BC1 / Rashid Behbudova is the approved catalogue. Other branches may add only items from this catalogue and remove them independently.',
    connected: 'Connected', source: 'Source', items: 'items', manage: 'Manage', open: 'Open menu', copy: 'Copy link', copied: 'Link copied',
    catalogue: 'Selected branch menu', catalogueHint: 'Names, photos, prices and RU / AZ / EN translations come from the approved Rashid Behbudova QR Menu.',
    allCategories: 'All categories', allStatuses: 'All statuses', active: 'Active', stopped: 'Stop list', hidden: 'Hidden', search: 'Search by name, description or translation',
    addItem: 'Add item', addFromApproved: 'Add from Rashid Behbudova', total: 'In branch', approved: 'Approved in BC1', availableToAdd: 'Available to add', withoutPhoto: 'Without photo', languages: 'Languages', edit: 'Edit', delete: 'Delete', removeFromBranch: 'Remove from branch', noItems: 'No items found.',
    pickerTitle: 'Approved Rashid Behbudova items', pickerHint: 'Select an item and it will be added immediately to this branch only.', allApprovedAdded: 'All approved items are already included in this branch.', masterHint: 'BC1 is the source catalogue. Add and remove items in the other branch menus.', migrationRequired: 'Branch-menu settings are temporarily unavailable.',
    addedToBranch: 'Item added to the branch menu', removedFromBranch: 'Item removed from the branch menu', confirmRemove: 'Remove this item from the selected branch menu?',
    editItem: 'Edit item', addItemTitle: 'New item', russianSource: 'Russian · source', autoTranslation: 'AZ & EN · guest-menu translations',
    translationHint: 'Azerbaijani and English copy is taken automatically from the approved QR Menu dictionary.', name: 'Name', category: 'Category', description: 'Description', price: 'Price', image: 'Image', imageLink: 'Image URL',
    save: 'Save', cancel: 'Cancel', upload: 'Upload photo', enabled: 'Active', available: 'Available', stop: 'Stop', preview: 'Preview', noDescription: 'No description',
    branchPrefix: 'Barista&Chef'
  }
}

const normalizeAdminLanguage = (value) => ['ru', 'az', 'en'].includes(value) ? value : 'ru'

function productForLanguage(product, language) {
  return localizeProduct({
    ...product,
    translationKey: product.name,
    sourceName: product.name,
    sourceDescription: product.description || '',
    sourceOptions: Array.isArray(product.options) ? product.options : []
  }, language)
}

function safeFileName(file) {
  const ext = (file?.name || 'image.jpg').split('.').pop() || 'jpg'
  return `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadImageFile(file, folder = 'menu') {
  if (!file) return ''
  const path = `${folder}/${safeFileName(file)}`
  const uploaded = await supabase.storage.from(imageBucket).upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
  if (!uploaded.error) {
    const { data } = supabase.storage.from(imageBucket).getPublicUrl(path)
    if (data?.publicUrl) return data.publicUrl
  }
  return fileToDataUrl(file)
}

const defaultInfo = {
  branch_id: 'BC1',
  wifi_name: '',
  wifi_password: '',
  working_hours: '',
  phone: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  website: '',
  address: ''
}

export default function RMSQRMenuAdmin({ lang = localStorage.getItem('rms_lang') || localStorage.getItem('nms_lang') || 'ru' }) {
  const adminLanguage = normalizeAdminLanguage(lang)
  const ui = QR_ADMIN_TEXT[adminLanguage]
  const [tab, setTab] = useState('menu')
  const [showWifiPassword, setShowWifiPassword] = useState(false)

  const [tables, setTables] = useState([])
  const [products, setProducts] = useState([])
  const [branchMenuLinks, setBranchMenuLinks] = useState([])
  const [branchMenuReady, setBranchMenuReady] = useState(false)
  const [branches, setBranches] = useState([])
  const [ratings, setRatings] = useState([])
  const [ads, setAds] = useState([])
  const [bills, setBills] = useState([])
  const [info, setInfo] = useState(defaultInfo)
  const [recommendations, setRecommendations] = useState([])
  const [calls, setCalls] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [statuses, setStatuses] = useState([])

  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [tableForm, setTableForm] = useState({ branch_id: 'BC1', from: 1, to: 10, prefix: '' })
  const [branchQrForm, setBranchQrForm] = useState({ branch_id: 'BC1' })
  const [selectedMenuBranch, setSelectedMenuBranch] = useState('BC1')
  const [menuLanguage, setMenuLanguage] = useState(adminLanguage)
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCategory, setMenuCategory] = useState('all')
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [activeBranchProducts, setActiveBranchProducts] = useState(null)
  const [selectedBranchConfig, setSelectedBranchConfig] = useState({})
  const [editingProduct, setEditingProduct] = useState(null)
  const [productDraft, setProductDraft] = useState(null)
  const [infoBranchName, setInfoBranchName] = useState('')
  const [adForm, setAdForm] = useState({ title: '', text: '', image_url: '', is_active: true })
  const [recForm, setRecForm] = useState({ product_id: '', product_name: '', recommended_product_id: '', recommended_product_name: '' })
  const [statusForm, setStatusForm] = useState({ branch_id: 'BC1', table_number: '1', status: 'preparing', status_label: 'Готовится', comment: '' })

  const branchOptions = useMemo(() => {
    const base = (branches && branches.length ? branches : DEFAULT_QR_BRANCHES.map(id => ({ id, name: id })))
    const seen = new Set()
    return base.filter(b => {
      const id = String(b.id || '').trim()
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [branches])

  const assignedProductIds = useMemo(() => {
    if (selectedMenuBranch === APPROVED_MENU_BRANCH || !branchMenuReady) return new Set(products.map(product => String(product.id)))
    return new Set(
      branchMenuLinks
        .filter(link => String(link.branch_code || '').toUpperCase() === selectedMenuBranch)
        .map(link => String(link.menu_item_id))
    )
  }, [branchMenuLinks, branchMenuReady, products, selectedMenuBranch])

  const branchProducts = useMemo(
    () => activeBranchProducts || products.filter(product => assignedProductIds.has(String(product.id))),
    [activeBranchProducts, assignedProductIds, products]
  )

  const productsAvailableToAdd = useMemo(
    () => selectedMenuBranch === APPROVED_MENU_BRANCH
      ? []
      : products.filter(product => !assignedProductIds.has(String(product.id))),
    [assignedProductIds, products, selectedMenuBranch]
  )

  const pickerProducts = useMemo(() => {
    const needle = pickerSearch.trim().toLocaleLowerCase('ru-RU')
    if (!needle) return productsAvailableToAdd
    return productsAvailableToAdd.filter(product => {
      const translations = ['ru', 'az', 'en'].map(language => productForLanguage(product, language))
      return translations.some(item => `${item.name || ''} ${item.description || ''} ${product.category || ''}`.toLocaleLowerCase('ru-RU').includes(needle))
    })
  }, [pickerSearch, productsAvailableToAdd])

  const menuCategories = useMemo(() => Array.from(new Set(branchProducts.map(product => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')), [branchProducts])

  const filteredProducts = useMemo(() => {
    const needle = menuSearch.trim().toLocaleLowerCase('ru-RU')
    return branchProducts.filter(product => {
      if (menuCategory !== 'all' && product.category !== menuCategory) return false
      if (!needle) return true
      const translations = ['ru', 'az', 'en'].map(language => productForLanguage(product, language))
      return translations.some(item => `${item.name || ''} ${item.description || ''} ${product.category || ''}`.toLocaleLowerCase('ru-RU').includes(needle))
    })
  }, [branchProducts, menuCategory, menuSearch])

  const menuSummary = useMemo(() => ({
    total: branchProducts.length,
    approved: products.length,
    availableToAdd: productsAvailableToAdd.length,
    withoutPhoto: branchProducts.filter(product => !product.image_url).length
  }), [branchProducts, products.length, productsAvailableToAdd.length])

  useEffect(() => {
    setMenuLanguage(adminLanguage)
  }, [adminLanguage])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const approvedProducts = await loadProducts()
    await Promise.all([
      loadBranches(),
      loadTables(),
      loadBranchMenuLinks(approvedProducts),
      loadRatings(),
      loadAds(),
      loadBills(),
      loadInfo(),
      loadRecommendations(),
      loadCalls(),
      loadCart(),
      loadStatuses()
    ])
    setLoading(false)
  }

  async function loadBranches() {
    const { data, error } = await supabase.from('branches').select('id,name').eq('is_active', true).order('name', { ascending: true })
    if (!error && Array.isArray(data) && data.length) {
      setBranches(data.map(b => ({ id: String(b.id), name: b.name || b.id })))
      return
    }
    const fromTables = Array.from(new Set((tables || []).map(t => t.branch_id).filter(Boolean)))
    const ids = fromTables.length ? fromTables : DEFAULT_QR_BRANCHES
    setBranches(ids.map(id => ({ id, name: id })))
  }

  async function loadTables() {
    const { data, error } = await supabase.from('rms_qr_tables').select('*').order('branch_id').order('table_number')
    if (!error) setTables((data || []).filter(row => String(row.table_number) !== BRANCH_MENU_CONFIG_TABLE))
  }

  async function loadProducts() {
    const { data, error } = await supabase.rpc('qr_get_public_menu', { p_branch_code: APPROVED_MENU_BRANCH })
    if (error) {
      setMsg(error.message)
      return []
    }
    const approvedProducts = (data || []).map(normalizeProduct)
    setProducts(approvedProducts)
    return approvedProducts
  }

  function defaultBranchMenuLinks(approvedProducts = []) {
    return QR_MENU_BRANCHES
      .filter(branchId => branchId !== APPROVED_MENU_BRANCH)
      .flatMap(branchId => approvedProducts.map(product => ({ branch_code: branchId, menu_item_id: String(product.id) })))
  }

  function linksFromBranchMenuRows(rows, approvedProducts = []) {
    const idsByBranch = new Map()
    ;(rows || []).forEach(row => {
      try {
        const parsed = JSON.parse(String(row.qr_code_url || ''))
        if (Array.isArray(parsed?.ids)) idsByBranch.set(String(row.branch_id).toUpperCase(), parsed.ids.map(String))
      } catch (_error) {}
    })
    return QR_MENU_BRANCHES
      .filter(branchId => branchId !== APPROVED_MENU_BRANCH)
      .flatMap(branchId => {
        const ids = idsByBranch.has(branchId) ? idsByBranch.get(branchId) : approvedProducts.map(product => String(product.id))
        return ids.map(menuItemId => ({ branch_code: branchId, menu_item_id: String(menuItemId) }))
      })
  }

  function branchMenuRowsFromLinks(links) {
    return QR_MENU_BRANCHES
      .filter(branchId => branchId !== APPROVED_MENU_BRANCH)
      .map(branchId => {
        const ids = links
          .filter(link => String(link.branch_code || '').toUpperCase() === branchId)
          .map(link => String(link.menu_item_id))
        return {
          branch_id: branchId,
          table_number: BRANCH_MENU_CONFIG_TABLE,
          qr_code_url: JSON.stringify({ version: 1, source_branch: APPROVED_MENU_BRANCH, ids }),
          is_active: false
        }
      })
  }

  async function loadBranchMenuLinks(approvedProducts = []) {
    const { data, error } = await supabase
      .from('rms_qr_tables')
      .select('branch_id,qr_code_url')
      .eq('table_number', BRANCH_MENU_CONFIG_TABLE)
      .in('branch_id', QR_MENU_BRANCHES.filter(branchId => branchId !== APPROVED_MENU_BRANCH))

    if (error) {
      setBranchMenuReady(false)
      setBranchMenuLinks(defaultBranchMenuLinks(approvedProducts))
      return
    }

    setBranchMenuReady(true)
    setBranchMenuLinks(linksFromBranchMenuRows(data || [], approvedProducts))
  }

  async function saveBranchMenuLinks(nextLinks) {
    const { error } = await supabase
      .from('rms_qr_tables')
      .upsert(branchMenuRowsFromLinks(nextLinks), { onConflict: 'branch_id,table_number' })
    if (error) return error

    setBranchMenuReady(true)
    setBranchMenuLinks(nextLinks)
    return null
  }

  function normalizeProduct(p) {
    return {
      ...p,
      id: String(p.id),
      name: p.name || p.product_name || p.title || 'Unnamed item',
      category: p.category_name || p.category || 'Menu',
      description: p.description || p.desc || '',
      price: Number(p.price ?? p.sale_price ?? p.menu_price ?? 0),
      image_url: p.image_url || p.photo_url || p.image || '',
      is_active: p.is_active !== false,
      is_available: p.is_available !== false,
      is_stop: p.is_stop === true
    }
  }

  async function loadRatings() {
    const { data, error } = await supabase.from('rms_qr_dish_ratings').select('*').order('created_at', { ascending: false }).limit(300)
    if (!error) setRatings(data || [])
  }

  async function loadAds() {
    const { data, error } = await supabase.from('rms_qr_ads').select('*').order('created_at', { ascending: false })
    if (!error) setAds(data || [])
  }

  async function loadBills() {
    const { data, error } = await supabase.from('rms_qr_live_bills').select('*').order('created_at', { ascending: false }).limit(100)
    if (!error) setBills(data || [])
  }

  async function loadInfo(branchId = info.branch_id || 'BC1') {
    const branchCode = String(branchId || 'BC1')
    const [{ data, error }, configResult] = await Promise.all([
      supabase.from('rms_qr_info').select('*').eq('branch_id', branchCode).maybeSingle(),
      supabase.from('rms_qr_tables').select('qr_code_url').eq('branch_id', branchCode).eq('table_number', BRANCH_MENU_CONFIG_TABLE).maybeSingle()
    ])
    if (!error) setInfo({ ...defaultInfo, ...(data || {}), branch_id: branchCode })
    let config = {}
    try { config = JSON.parse(String(configResult.data?.qr_code_url || '')) || {} } catch (_error) {}
    const branchRow = branchOptions.find(item => String(item.id) === branchCode)
    setInfoBranchName(String(config.branch_name || branchRow?.name || branchCode))
  }

  async function loadRecommendations() {
    const { data, error } = await supabase.from('rms_qr_recommendations').select('*').order('created_at', { ascending: false })
    if (!error) setRecommendations(data || [])
  }

  async function loadCalls() {
    const { data, error } = await supabase.from('rms_qr_waiter_calls').select('*').order('created_at', { ascending: false }).limit(100)
    if (!error) setCalls(data || [])
  }

  async function loadCart() {
    const { data, error } = await supabase.from('rms_qr_live_cart').select('*').order('created_at', { ascending: false }).limit(200)
    if (!error) setCartItems(data || [])
  }

  async function loadStatuses() {
    const { data, error } = await supabase.from('rms_qr_order_status').select('*').order('created_at', { ascending: false }).limit(100)
    if (!error) setStatuses(data || [])
  }

  function qrUrl(branchId, tableNumber = '') {
    const base = `${appOrigin()}/?qr=menu&branch=${encodeURIComponent(branchId)}`
    return tableNumber ? `${base}&table=${encodeURIComponent(tableNumber)}` : base
  }

  function qrImageUrl(branchId, tableNumber = '') {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(qrUrl(branchId, tableNumber))}`
  }

  async function generateTables() {
    const from = Number(tableForm.from || 1)
    const to = Number(tableForm.to || from)

    if (!tableForm.branch_id || to < from) {
      setMsg('Проверь филиал и диапазон столов')
      return
    }

    const rows = []

    for (let i = from; i <= to; i++) {
      const tableNumber = `${tableForm.prefix || ''}${i}`
      rows.push({
        branch_id: tableForm.branch_id,
        table_number: tableNumber,
        qr_code_url: qrUrl(tableForm.branch_id, tableNumber),
        is_active: true
      })
    }

    const { error } = await supabase.from('rms_qr_tables').upsert(rows, { onConflict: 'branch_id,table_number' })

    if (error) {
      setMsg(error.message)
      return
    }

    await loadTables()
    setMsg(`QR-столы созданы: ${rows.length}`)
  }

  async function updateTable(row, patch) {
    const next = { ...patch }

    if (patch.branch_id || patch.table_number) {
      const branch = patch.branch_id || row.branch_id
      const table = patch.table_number || row.table_number
      next.qr_code_url = qrUrl(branch, table)
    }

    const { error } = await supabase.from('rms_qr_tables').update(next).eq('id', row.id)

    if (error) setMsg(error.message)
    else {
      await loadTables()
      setMsg('Стол обновлён')
    }
  }

  function branchDisplayName(branchId) {
    const branch = branchOptions.find(option => String(option.id).toUpperCase() === String(branchId).toUpperCase())
    const rawName = String(branch?.name || '').trim()
    if (rawName && rawName.toUpperCase() !== String(branchId).toUpperCase()) return rawName
    if (String(branchId).toUpperCase() === APPROVED_MENU_BRANCH) return 'Barista&Chef R. Behbudov'
    return `${ui.branchPrefix} · ${branchId}`
  }

  function branchItemCount(branchId) {
    if (String(branchId) === String(selectedMenuBranch) && activeBranchProducts) return activeBranchProducts.length
    if (branchId === APPROVED_MENU_BRANCH || !branchMenuReady) return products.length
    return branchMenuLinks.filter(link => String(link.branch_code || '').toUpperCase() === branchId).length
  }

  function parseBranchMenuConfig(value) {
    try {
      const parsed = JSON.parse(String(value || ''))
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (_error) {
      return {}
    }
  }

  async function loadBranchMenuForEditing(branchId) {
    setLoading(true)
    const [menuResult, configResult] = await Promise.all([
      supabase.rpc('qr_get_public_menu', { p_branch_code: branchId }),
      supabase.from('rms_qr_tables').select('qr_code_url').eq('branch_id', branchId).eq('table_number', BRANCH_MENU_CONFIG_TABLE).maybeSingle()
    ])
    if (menuResult.error) {
      setMsg(menuResult.error.message)
      setActiveBranchProducts([])
      setLoading(false)
      return
    }
    const config = parseBranchMenuConfig(configResult.data?.qr_code_url)
    const overrides = config.overrides && typeof config.overrides === 'object' ? config.overrides : {}
    const rows = (menuResult.data || []).map(normalizeProduct).map(product => {
      const custom = overrides[String(product.id)]
      if (!custom || typeof custom !== 'object') return product
      const customRu = custom.translations?.ru || {}
      return {
        ...product,
        ...custom,
        name: customRu.name || custom.name || product.name,
        description: customRu.description || custom.description || product.description,
        image_url: custom.image_url || custom.image || product.image_url,
        translations: custom.translations || product.translations
      }
    })
    setSelectedBranchConfig(config)
    setActiveBranchProducts(rows)
    setLoading(false)
  }

  function manageBranchMenu(branchId) {
    setSelectedMenuBranch(branchId)
    setBranchQrForm({ branch_id: branchId })
    setTableForm(current => ({ ...current, branch_id: branchId }))
    setShowProductPicker(false)
    setPickerSearch('')
    setMenuCategory('all')
    setMenuSearch('')
    setEditingProduct(null)
    setProductDraft(null)
    loadBranchMenuForEditing(branchId)
  }

  function openProductEditor(product) {
    const translations = product.translations && typeof product.translations === 'object' ? product.translations : {}
    setEditingProduct(product)
    setProductDraft({
      id: String(product.id),
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: Number(product.price || 0),
      image_url: product.image_url || '',
      options_text: Array.isArray(product.options) ? product.options.join('\n') : '',
      translations: {
        ru: { name: translations.ru?.name || product.name || '', description: translations.ru?.description || product.description || '' },
        az: { name: translations.az?.name || '', description: translations.az?.description || '' },
        en: { name: translations.en?.name || '', description: translations.en?.description || '' }
      }
    })
  }

  async function handleProductImage(file) {
    if (!file) return
    setMsg('Загружаю фото позиции...')
    const image_url = await uploadImageFile(file, 'menu')
    setProductDraft(current => current ? { ...current, image_url } : current)
    setMsg('Фото добавлено. Нажмите «Сохранить позицию».')
  }

  async function saveProductOverride() {
    if (!productDraft?.id) return
    const { data, error: readError } = await supabase
      .from('rms_qr_tables')
      .select('qr_code_url')
      .eq('branch_id', selectedMenuBranch)
      .eq('table_number', BRANCH_MENU_CONFIG_TABLE)
      .maybeSingle()
    if (readError) {
      setMsg(readError.message)
      return
    }
    const config = parseBranchMenuConfig(data?.qr_code_url)
    const currentItems = activeBranchProducts || []
    const currentIds = new Set(currentItems.map(product => String(product.id)))
    const savedIds = Array.isArray(config.ids) ? config.ids.map(String).filter(id => currentIds.has(id)) : []
    const ids = savedIds.length ? savedIds : currentItems.map(product => String(product.id))
    const overrides = { ...(config.overrides || {}) }
    overrides[String(productDraft.id)] = {
      name: productDraft.translations?.ru?.name || productDraft.name || '',
      description: productDraft.translations?.ru?.description || productDraft.description || '',
      category: productDraft.category || 'Menu',
      price: Number(productDraft.price || 0),
      image_url: productDraft.image_url || '',
      options: String(productDraft.options_text || '').split('\n').map(value => value.trim()).filter(Boolean),
      translations: productDraft.translations || {}
    }
    const nextConfig = { ...config, version: 2, source_branch: selectedMenuBranch, ids, overrides }
    const { error } = await supabase.from('rms_qr_tables').upsert({
      branch_id: selectedMenuBranch,
      table_number: BRANCH_MENU_CONFIG_TABLE,
      qr_code_url: JSON.stringify(nextConfig),
      is_active: false
    }, { onConflict: 'branch_id,table_number' })
    if (error) {
      setMsg(error.message)
      return
    }
    setSelectedBranchConfig(nextConfig)
    setActiveBranchProducts(current => (current || []).map(product => String(product.id) === String(productDraft.id) ? {
      ...product,
      ...overrides[String(productDraft.id)],
      image_url: overrides[String(productDraft.id)].image_url || product.image_url
    } : product))
    setEditingProduct(null)
    setProductDraft(null)
    setMsg('Позиция сохранена для выбранного филиала')
  }

  async function addProductToBranch(product) {
    if (!branchMenuReady) {
      setMsg(ui.migrationRequired)
      return
    }
    if (!product?.id || selectedMenuBranch === APPROVED_MENU_BRANCH) return

    const payload = {
      branch_code: selectedMenuBranch,
      menu_item_id: String(product.id)
    }
    const exists = branchMenuLinks.some(link => link.branch_code === selectedMenuBranch && String(link.menu_item_id) === String(product.id))
    const nextLinks = exists ? branchMenuLinks : [...branchMenuLinks, payload]
    const error = await saveBranchMenuLinks(nextLinks)

    if (error) {
      setMsg(error.message)
      return
    }

    setMsg(`${ui.addedToBranch}: ${productForLanguage(product, menuLanguage).name || product.name}`)
  }

  async function removeProductFromBranch(product) {
    if (!branchMenuReady) {
      setMsg(ui.migrationRequired)
      return
    }
    if (!product?.id || selectedMenuBranch === APPROVED_MENU_BRANCH) return
    if (!window.confirm(`${ui.confirmRemove}\n${productForLanguage(product, menuLanguage).name || product.name}`)) return

    const nextLinks = branchMenuLinks.filter(link => !(link.branch_code === selectedMenuBranch && String(link.menu_item_id) === String(product.id)))
    const error = await saveBranchMenuLinks(nextLinks)

    if (error) {
      setMsg(error.message)
      return
    }

    setMsg(`${ui.removedFromBranch}: ${productForLanguage(product, menuLanguage).name || product.name}`)
  }

  async function copyBranchUrl(branchId) {
    try {
      await navigator.clipboard.writeText(qrUrl(branchId))
      setMsg(`${ui.copied}: ${branchId}`)
    } catch {
      setMsg(qrUrl(branchId))
    }
  }

  async function saveInfo() {
    const { error } = await supabase.from('rms_qr_info').upsert(info, { onConflict: 'branch_id' })
    if (error) {
      setMsg(error.message)
      return
    }
    const { data: configRow } = await supabase.from('rms_qr_tables').select('qr_code_url').eq('branch_id', info.branch_id).eq('table_number', BRANCH_MENU_CONFIG_TABLE).maybeSingle()
    const config = parseBranchMenuConfig(configRow?.qr_code_url)
    const { error: configError } = await supabase.from('rms_qr_tables').upsert({
      branch_id: info.branch_id,
      table_number: BRANCH_MENU_CONFIG_TABLE,
      qr_code_url: JSON.stringify({ ...config, version: 2, branch_name: String(infoBranchName || info.branch_id).trim() || info.branch_id }),
      is_active: false
    }, { onConflict: 'branch_id,table_number' })
    setMsg(configError ? configError.message : 'Информация QR Menu сохранена')
  }

  async function changeInfoBranch(branchId) {
    setShowWifiPassword(false)
    await loadInfo(branchId)
  }

  async function handleAdImage(file) {
    if (!file) return
    setMsg('Загружаю изображение рекламы...')
    const url = await uploadImageFile(file, 'ads')
    setAdForm(prev => ({ ...prev, image_url: url }))
    setMsg('Изображение рекламы добавлено')
  }

  async function saveAd() {
    if (!adForm.title.trim()) {
      setMsg('Введите название рекламы')
      return
    }

    const { error } = await supabase.from('rms_qr_ads').insert(adForm)

    if (error) {
      setMsg(error.message)
      return
    }

    setAdForm({ title: '', text: '', image_url: '', is_active: true })
    await loadAds()
    setMsg('Реклама добавлена')
  }

  async function toggleAd(row) {
    const { error } = await supabase.from('rms_qr_ads').update({ is_active: !row.is_active }).eq('id', row.id)

    if (error) setMsg(error.message)
    else {
      await loadAds()
      setMsg('Статус рекламы обновлён')
    }
  }

  async function saveRecommendation() {
    if (!recForm.product_id || !recForm.recommended_product_name) {
      setMsg('Выберите блюдо и рекомендацию')
      return
    }

    const source = products.find(p => p.id === recForm.product_id)

    const payload = {
      ...recForm,
      product_name: recForm.product_name || source?.name || '',
      is_active: true
    }

    const { error } = await supabase.from('rms_qr_recommendations').insert(payload)

    if (error) {
      setMsg(error.message)
      return
    }

    setRecForm({ product_id: '', product_name: '', recommended_product_id: '', recommended_product_name: '' })
    await loadRecommendations()
    setMsg('Рекомендация добавлена')
  }

  async function deleteRecommendation(id) {
    const { error } = await supabase.from('rms_qr_recommendations').delete().eq('id', id)

    if (error) setMsg(error.message)
    else {
      await loadRecommendations()
      setMsg('Рекомендация удалена')
    }
  }

  async function updateCall(id, status) {
    const { error } = await supabase.from('rms_qr_waiter_calls').update({
      status,
      updated_at: new Date().toISOString()
    }).eq('id', id)

    if (error) setMsg(error.message)
    else {
      await loadCalls()
      setMsg('Статус вызова обновлён')
    }
  }

  async function updateCartStatus(branchId, tableNumber, status) {
    const { error } = await supabase
      .from('rms_qr_live_cart')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('branch_id', branchId)
      .eq('table_number', tableNumber)
      .eq('status', 'draft')

    if (error) setMsg(error.message)
    else {
      await loadCart()
      setMsg('Shared cart обновлён')
    }
  }

  async function addStatus() {
    const { error } = await supabase.from('rms_qr_order_status').insert(statusForm)

    if (error) setMsg(error.message)
    else {
      await loadStatuses()
      setMsg('Статус кухни добавлен')
    }
  }

  const ratingSummary = useMemo(() => {
    const grouped = {}

    ratings.forEach(r => {
      const key = String(r.product_id)
      if (!grouped[key]) grouped[key] = { product_name: r.product_name, sum: 0, count: 0 }
      grouped[key].sum += Number(r.rating || 0)
      grouped[key].count += 1
    })

    return Object.entries(grouped).map(([product_id, value]) => ({
      product_id,
      product_name: value.product_name,
      avg: value.sum / value.count,
      count: value.count
    }))
  }, [ratings])

  const cartsByTable = useMemo(() => {
    const grouped = {}

    cartItems.forEach(item => {
      const key = `${item.branch_id} · ${item.table_number}`

      if (!grouped[key]) {
        grouped[key] = {
          branch_id: item.branch_id,
          table_number: item.table_number,
          items: [],
          total: 0
        }
      }

      grouped[key].items.push(item)
      grouped[key].total += Number(item.total || 0)
    })

    return Object.values(grouped)
  }, [cartItems])

  return (
    <section className="qr-admin">
      <section className="topbar">
        <div>
          <h2>{ui.title}</h2>
          <p>{ui.subtitle}</p>
        </div>
        <button className="small primary" onClick={loadAll}>{loading ? ui.loading : ui.refresh}</button>
      </section>

      <div className="settings-tabs qr-admin-tabs">
        <button className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>{ui.menu}</button>
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>{ui.tables}</button>
        <button className={tab === 'recommendations' ? 'active' : ''} onClick={() => setTab('recommendations')}>{ui.recommendations}</button>
        <button className={tab === 'ratings' ? 'active' : ''} onClick={() => setTab('ratings')}>{ui.ratings}</button>
        <button className={tab === 'bills' ? 'active' : ''} onClick={() => setTab('bills')}>{ui.bills}</button>
        <button className={tab === 'ads' ? 'active' : ''} onClick={() => setTab('ads')}>{ui.ads}</button>
        <button className={tab === 'calls' ? 'active' : ''} onClick={() => setTab('calls')}>{ui.calls}</button>
        <button className={tab === 'cart' ? 'active' : ''} onClick={() => setTab('cart')}>{ui.cart}</button>
        <button className={tab === 'status' ? 'active' : ''} onClick={() => setTab('status')}>{ui.status}</button>
        <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>{ui.info}</button>
      </div>

      {msg ? <p className="hint good">{msg}</p> : null}

      <section className="grid">
        {tab === 'tables' && (
          <>
            <div className="card span-2">
              <h3>Общее QR Menu филиала</h3>
              <p className="hint">Общая ссылка меню без привязки к столу. Подходит для Instagram, Google Maps, стойки входа или доставки.</p>
              <div className="form-grid compact">
                <label><span>Филиал</span><select value={branchQrForm.branch_id} onChange={e => setBranchQrForm({ branch_id: e.target.value })}>{branchOptions.map(b => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}</select></label>
                <label><span>Ссылка</span><input value={qrUrl(branchQrForm.branch_id || 'BC1')} readOnly /></label>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <img src={qrImageUrl(branchQrForm.branch_id || 'BC1')} alt="QR филиала" style={{ width: 120, height: 120, borderRadius: 10, background: '#fff' }} />
                <a className="small primary" href={qrUrl(branchQrForm.branch_id || 'BC1')} target="_blank" rel="noreferrer">Открыть общее меню</a>
              </div>
            </div>

            <div className="card span-2">
              <h3>Генерация QR для столов</h3>
              <p className="hint">Создаёт QR-ссылку для каждого стола выбранного филиала. QR ведёт на гостевое меню конкретного стола.</p>

              <div className="form-grid compact">
                <label><span>Филиал</span><select value={tableForm.branch_id} onChange={e => setTableForm({ ...tableForm, branch_id: e.target.value })}>{branchOptions.map(b => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}</select></label>
                <label><span>С</span><input type="number" value={tableForm.from} onChange={e => setTableForm({ ...tableForm, from: e.target.value })} /></label>
                <label><span>По</span><input type="number" value={tableForm.to} onChange={e => setTableForm({ ...tableForm, to: e.target.value })} /></label>
                <label><span>Префикс</span><input value={tableForm.prefix} onChange={e => setTableForm({ ...tableForm, prefix: e.target.value })} placeholder="VIP-" /></label>
              </div>

              <button className="small primary" onClick={generateTables}>Сгенерировать QR-столы</button>
            </div>

            <div className="card span-2">
              <h3>QR по столам</h3>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>QR</th>
                      <th>Филиал</th>
                      <th>Стол</th>
                      <th>Ссылка</th>
                      <th>Активен</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map(row => (
                      <tr key={row.id}>
                        <td><img src={qrImageUrl(row.branch_id, row.table_number)} alt="QR" style={{ width: 86, height: 86, borderRadius: 8, background: '#fff' }} /></td>
                        <td><input defaultValue={row.branch_id} onBlur={e => updateTable(row, { branch_id: e.target.value.trim() })} /></td>
                        <td><input defaultValue={row.table_number} onBlur={e => updateTable(row, { table_number: e.target.value.trim() })} /></td>
                        <td><a href={qrUrl(row.branch_id, row.table_number)} target="_blank" rel="noreferrer">Открыть</a></td>
                        <td>
                          <select defaultValue={String(row.is_active !== false)} onChange={e => updateTable(row, { is_active: e.target.value === 'true' })}>
                            <option value="true">Да</option>
                            <option value="false">Нет</option>
                          </select>
                        </td>
                      </tr>
                    ))}

                    {!tables.length && <tr><td colSpan="5" className="hint">QR-столы пока не созданы.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'menu' && (
          <>
            <div className="card span-2 qr-branch-menu-card">
              <div className="qr-admin-card-head">
                <div>
                  <span className="qr-admin-eyebrow"><Store size={14} /> {ui.sharedCatalog}</span>
                  <h3>{ui.branchMenus}</h3>
                  <p>{ui.sharedHint}</p>
                </div>
                <div className="qr-language-badge"><Languages size={16} /><b>RU</b><span>·</span><b>AZ</b><span>·</span><b>EN</b></div>
              </div>

              <div className="qr-branch-grid">
                {QR_MENU_BRANCHES.map(branchId => (
                  <article className={`qr-branch-card ${selectedMenuBranch === branchId ? 'selected' : ''}`} key={branchId}>
                    <div className="qr-branch-card-top">
                      <div className="qr-branch-code"><Store size={16} /><b>{branchId}</b></div>
                      <span className={`qr-status-chip ${branchId === APPROVED_MENU_BRANCH ? 'source' : ''}`}><Check size={13} /> {branchId === APPROVED_MENU_BRANCH ? ui.source : ui.connected}</span>
                    </div>
                    <div className="qr-branch-card-main">
                      <img src={qrImageUrl(branchId)} alt={`QR ${branchId}`} />
                      <div>
                        <h4>{branchDisplayName(branchId)}</h4>
                        <p>{branchItemCount(branchId)} {ui.items}</p>
                        <small>RU · AZ · EN</small>
                      </div>
                    </div>
                    <div className="qr-branch-actions">
                      <button type="button" className="qr-branch-manage" onClick={() => manageBranchMenu(branchId)}>{ui.manage}</button>
                      <a href={qrUrl(branchId)} target="_blank" rel="noreferrer" title={ui.open}><ExternalLink size={16} /></a>
                      <button type="button" onClick={() => copyBranchUrl(branchId)} title={ui.copy}><Copy size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {editingProduct && productDraft && (
              <div className="card span-2 qr-product-editor-card">
                <div className="qr-admin-card-head">
                  <div>
                    <span className="qr-admin-eyebrow"><Pencil size={14} /> {branchDisplayName(selectedMenuBranch)}</span>
                    <h3>{ui.editItem}</h3>
                    <p>Изменения применяются только к QR Menu выбранного филиала и не затрагивают техкарту или меню других филиалов.</p>
                  </div>
                  <button type="button" className="qr-icon-button" onClick={() => { setEditingProduct(null); setProductDraft(null) }} aria-label={ui.cancel}><X size={18} /></button>
                </div>
                <div className="form-grid compact">
                  <label><span>Категория</span><input value={productDraft.category || ''} onChange={e => setProductDraft(current => ({ ...current, category: e.target.value }))} /></label>
                  <label><span>Цена, ₼</span><input type="number" min="0" step="0.01" value={productDraft.price ?? ''} onChange={e => setProductDraft(current => ({ ...current, price: e.target.value }))} /></label>
                  <label><span>Фото</span><input type="file" accept="image/*" onChange={e => handleProductImage(e.target.files?.[0])} /></label>
                  <label><span>Ссылка на фото</span><input value={productDraft.image_url || ''} onChange={e => setProductDraft(current => ({ ...current, image_url: e.target.value }))} /></label>
                  <label className="span-2"><span>Состав / варианты (каждая строка отдельно)</span><textarea rows="3" value={productDraft.options_text || ''} onChange={e => setProductDraft(current => ({ ...current, options_text: e.target.value }))} /></label>
                </div>
                <div className="qr-translation-editor">
                  {['ru', 'az', 'en'].map(language => (
                    <div className="qr-translation-editor-column" key={language}>
                      <b>{language.toUpperCase()}</b>
                      <label><span>{ui.name}</span><input value={productDraft.translations?.[language]?.name || ''} onChange={e => setProductDraft(current => ({ ...current, translations: { ...current.translations, [language]: { ...current.translations?.[language], name: e.target.value } } }))} /></label>
                      <label><span>{ui.description}</span><textarea rows="3" value={productDraft.translations?.[language]?.description || ''} onChange={e => setProductDraft(current => ({ ...current, translations: { ...current.translations, [language]: { ...current.translations?.[language], description: e.target.value } } }))} /></label>
                    </div>
                  ))}
                </div>
                <div className="qr-editor-actions">
                  <button type="button" className="small" onClick={() => { setEditingProduct(null); setProductDraft(null) }}>{ui.cancel}</button>
                  <button type="button" className="small primary" onClick={saveProductOverride}>{ui.save}</button>
                </div>
              </div>
            )}

            {showProductPicker && selectedMenuBranch !== APPROVED_MENU_BRANCH && (
              <div className="card span-2 qr-picker-card">
                <div className="qr-admin-card-head compact">
                  <div>
                    <span className="qr-admin-eyebrow"><Plus size={14} /> {branchDisplayName(selectedMenuBranch)}</span>
                    <h3>{ui.pickerTitle}</h3>
                    <p>{ui.pickerHint}</p>
                  </div>
                  <button className="qr-icon-button" type="button" onClick={() => setShowProductPicker(false)} aria-label={ui.cancel}><X size={18} /></button>
                </div>
                <label className="qr-search-box qr-picker-search"><Search size={17} /><input value={pickerSearch} onChange={event => setPickerSearch(event.target.value)} placeholder={ui.search} /></label>
                {!branchMenuReady && <div className="qr-setup-warning">{ui.migrationRequired}</div>}
                <div className="qr-picker-list">
                  {pickerProducts.map(product => {
                    const translated = productForLanguage(product, menuLanguage)
                    return (
                      <article className="qr-picker-row" key={product.id}>
                        <div className="qr-product-photo">{product.image_url ? <img src={product.image_url} alt="" /> : <ImagePlus size={22} />}</div>
                        <div className="qr-picker-copy"><h4>{translated.name || product.name}</h4><p>{product.category} · {fmt(product.price)} ₼</p></div>
                        <button type="button" className="small primary" disabled={!branchMenuReady} onClick={() => addProductToBranch(product)}><Plus size={15} /> {ui.addItem}</button>
                      </article>
                    )
                  })}
                  {!pickerProducts.length && <div className="qr-empty-list">{ui.allApprovedAdded}</div>}
                </div>
              </div>
            )}

            <div className="card span-2 qr-catalogue-card">
              <div className="qr-admin-card-head">
                <div>
                  <span className="qr-admin-eyebrow"><QrCode size={14} /> {branchDisplayName(selectedMenuBranch)}</span>
                  <h3>{ui.catalogue}</h3>
                  <p>{selectedMenuBranch === APPROVED_MENU_BRANCH ? ui.masterHint : ui.catalogueHint}</p>
                </div>
                {selectedMenuBranch !== APPROVED_MENU_BRANCH && selectedMenuBranch !== 'BC5' && (
                  <button type="button" className="small primary qr-add-product" onClick={() => setShowProductPicker(current => !current)}><Plus size={16} /> {ui.addFromApproved}</button>
                )}
              </div>

              <div className="qr-menu-summary">
                <article><span>{ui.total}</span><b>{menuSummary.total}</b></article>
                <article className="good"><span>{ui.approved}</span><b>{menuSummary.approved}</b></article>
                <article className="warn"><span>{ui.availableToAdd}</span><b>{menuSummary.availableToAdd}</b></article>
                <article><span>{ui.withoutPhoto}</span><b>{menuSummary.withoutPhoto}</b></article>
              </div>

              <div className="qr-catalogue-toolbar">
                <label className="qr-search-box"><Search size={17} /><input value={menuSearch} onChange={event => setMenuSearch(event.target.value)} placeholder={ui.search} /></label>
                <select value={menuCategory} onChange={event => setMenuCategory(event.target.value)}>
                  <option value="all">{ui.allCategories}</option>
                  {menuCategories.map(categoryName => <option key={categoryName} value={categoryName}>{categoryName}</option>)}
                </select>
                <div className="qr-language-switch" aria-label={ui.languages}>
                  {['ru', 'az', 'en'].map(language => <button type="button" className={menuLanguage === language ? 'active' : ''} onClick={() => setMenuLanguage(language)} key={language}>{language.toUpperCase()}</button>)}
                </div>
              </div>

              <div className="qr-product-list">
                {filteredProducts.map(product => {
                  const translated = productForLanguage(product, menuLanguage)
                  return (
                    <article className="qr-product-row" key={product.id}>
                      <div className="qr-product-photo">
                        {product.image_url ? <img src={product.image_url} alt="" /> : <ImagePlus size={22} />}
                      </div>
                      <div className="qr-product-copy">
                        <div className="qr-product-heading"><h4>{translated.name || product.name}</h4><b>{fmt(product.price)} ₼</b></div>
                        <p>{translated.description || ui.noDescription}</p>
                        <div className="qr-product-meta"><span>{product.category}</span><span>{menuLanguage.toUpperCase()}</span></div>
                      </div>
                      <div className="qr-product-actions">
                        <button type="button" onClick={() => openProductEditor(product)} title={ui.edit}><Pencil size={17} /></button>
                        {selectedMenuBranch !== APPROVED_MENU_BRANCH && selectedMenuBranch !== 'BC5' && (
                          <button type="button" className="danger" onClick={() => removeProductFromBranch(product)} title={ui.removeFromBranch}><Trash2 size={17} /></button>
                        )}
                      </div>
                    </article>
                  )
                })}
                {!filteredProducts.length && <div className="qr-empty-list">{ui.noItems}</div>}
              </div>
            </div>

          </>
        )}

        {tab === 'recommendations' && (
          <>
            <div className="card span-2">
              <h3>Добавить рекомендацию / smart upsell</h3>
              <p className="hint">Например: к Cappuccino рекомендовать Basque Cheesecake или Croissant.</p>

              <div className="form-grid compact">
                <label>
                  <span>Основная позиция</span>
                  <select value={recForm.product_id} onChange={e => {
                    const p = products.find(x => x.id === e.target.value)
                    setRecForm(s => ({ ...s, product_id: e.target.value, product_name: p?.name || '' }))
                  }}>
                    <option value="">Выбрать</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>

                <label>
                  <span>Рекомендуемая позиция</span>
                  <select value={recForm.recommended_product_id} onChange={e => {
                    const p = products.find(x => x.id === e.target.value)
                    setRecForm(s => ({ ...s, recommended_product_id: e.target.value, recommended_product_name: p?.name || '' }))
                  }}>
                    <option value="">Выбрать</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              </div>

              <button className="small primary" onClick={saveRecommendation}>+ Добавить рекомендацию</button>
            </div>

            <div className="card span-2">
              <h3>Список рекомендаций</h3>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>К позиции</th><th>Рекомендуем</th><th>Статус</th><th></th></tr></thead>
                  <tbody>
                    {recommendations.map(r => (
                      <tr key={r.id}>
                        <td>{r.product_name || r.product_id}</td>
                        <td><b>{r.recommended_product_name || r.recommended_product_id}</b></td>
                        <td>{r.is_active ? 'Активна' : 'Откл.'}</td>
                        <td><button className="small danger" onClick={() => deleteRecommendation(r.id)}>Удалить</button></td>
                      </tr>
                    ))}

                    {!recommendations.length && <tr><td colSpan="4" className="hint">Рекомендаций пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'ratings' && (
          <div className="card span-2">
            <h3>Рейтинги блюд</h3>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Блюдо</th><th>Средний рейтинг</th><th>Голосов</th></tr></thead>
                <tbody>
                  {ratingSummary.map(r => (
                    <tr key={r.product_id}>
                      <td>{r.product_name}</td>
                      <td><b>★ {fmt(r.avg)}</b></td>
                      <td>{r.count}</td>
                    </tr>
                  ))}

                  {!ratingSummary.length && <tr><td colSpan="3" className="hint">Оценок пока нет.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'bills' && (
          <div className="card span-2">
            <h3>Счета / оплаты QR Menu</h3>
            <p className="hint">Здесь отображаются live-счета, которые гость видит по QR. Полная интеграция с POS будет следующим этапом.</p>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Филиал</th><th>Стол</th><th>Статус</th><th>Оплата</th><th>Итого</th><th>Создан</th></tr></thead>
                <tbody>
                  {bills.map(b => (
                    <tr key={b.id}>
                      <td>{b.branch_id}</td>
                      <td>{b.table_number}</td>
                      <td>{b.status}</td>
                      <td>{b.payment_status}</td>
                      <td><b>{fmt(b.total)} AZN</b></td>
                      <td>{new Date(b.created_at).toLocaleString()}</td>
                    </tr>
                  ))}

                  {!bills.length && <tr><td colSpan="6" className="hint">Счетов пока нет.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'ads' && (
          <>
            <div className="card span-2">
              <h3>Добавить рекламу / popup</h3>

              <div className="form-grid compact">
                <label><span>Заголовок</span><input value={adForm.title} onChange={e => setAdForm({ ...adForm, title: e.target.value })} /></label>
                <label><span>Текст</span><input value={adForm.text} onChange={e => setAdForm({ ...adForm, text: e.target.value })} /></label>
                <label><span>Изображение</span><input type="file" accept="image/*" onChange={e => handleAdImage(e.target.files?.[0])} /></label>
                <label className="span-2"><span>Текущее изображение</span><input value={adForm.image_url || ''} onChange={e => setAdForm({ ...adForm, image_url: e.target.value })} placeholder="Можно вставить ссылку или загрузить файл выше" /></label>
                <label>
                  <span>Активна</span>
                  <select value={String(adForm.is_active)} onChange={e => setAdForm({ ...adForm, is_active: e.target.value === 'true' })}>
                    <option value="true">Да</option>
                    <option value="false">Нет</option>
                  </select>
                </label>
              </div>

              <button className="small primary" onClick={saveAd}>+ Добавить рекламу</button>
            </div>

            <div className="card span-2">
              <h3>Активные рекламы</h3>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Фото</th><th>Заголовок</th><th>Текст</th><th>Активна</th><th></th></tr></thead>
                  <tbody>
                    {ads.map(a => (
                      <tr key={a.id}>
                        <td>{a.image_url ? <img src={a.image_url} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 10 }} /> : '—'}</td>
                        <td><b>{a.title}</b></td>
                        <td>{a.text}</td>
                        <td>{a.is_active ? 'Да' : 'Нет'}</td>
                        <td><button className="small" onClick={() => toggleAd(a)}>{a.is_active ? 'Отключить' : 'Включить'}</button></td>
                      </tr>
                    ))}

                    {!ads.length && <tr><td colSpan="5" className="hint">Рекламы пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'calls' && (
          <div className="card span-2">
            <h3>Вызовы официанта</h3>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Филиал</th><th>Стол</th><th>Тип</th><th>Комментарий</th><th>Статус</th><th>Время</th><th></th></tr></thead>
                <tbody>
                  {calls.map(c => (
                    <tr key={c.id}>
                      <td>{c.branch_id}</td>
                      <td>{c.table_number}</td>
                      <td>{c.call_type}</td>
                      <td>{c.comment}</td>
                      <td>{c.status}</td>
                      <td>{new Date(c.created_at).toLocaleString()}</td>
                      <td><button className="small" onClick={() => updateCall(c.id, c.status === 'done' ? 'new' : 'done')}>{c.status === 'done' ? 'Вернуть' : 'Выполнено'}</button></td>
                    </tr>
                  ))}

                  {!calls.length && <tr><td colSpan="7" className="hint">Вызовов пока нет.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'cart' && (
          <div className="card span-2">
            <h3>Shared Cart по столам</h3>

            {cartsByTable.map(group => (
              <div className="card" key={`${group.branch_id}-${group.table_number}`}>
                <h3>{group.branch_id} · стол {group.table_number}</h3>
                <p><b>{fmt(group.total)} AZN</b></p>

                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Позиция</th><th>Категория</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Статус</th></tr></thead>
                    <tbody>
                      {group.items.map(i => (
                        <tr key={i.id}>
                          <td>{i.product_name}</td>
                          <td>{i.category}</td>
                          <td>{i.qty}</td>
                          <td>{fmt(i.price)}</td>
                          <td>{fmt(i.total)}</td>
                          <td>{i.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button className="small primary" onClick={() => updateCartStatus(group.branch_id, group.table_number, 'confirmed')}>Подтвердить заказ</button>
              </div>
            ))}

            {!cartsByTable.length && <p className="hint">Shared cart пока пустой.</p>}
          </div>
        )}

        {tab === 'status' && (
          <>
            <div className="card span-2">
              <h3>Добавить kitchen status</h3>

              <div className="form-grid compact">
                <label><span>Филиал</span><select value={statusForm.branch_id} onChange={e => setStatusForm({ ...statusForm, branch_id: e.target.value })}>{branchOptions.map(b => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}</select></label>
                <label><span>Стол</span><input value={statusForm.table_number} onChange={e => setStatusForm({ ...statusForm, table_number: e.target.value })} /></label>
                <label>
                  <span>Статус</span>
                  <select value={statusForm.status} onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}>
                    <option value="requested">Requested</option>
                    <option value="accepted">Accepted</option>
                    <option value="preparing">Preparing</option>
                    <option value="almost_ready">Almost ready</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                  </select>
                </label>
                <label><span>Текст</span><input value={statusForm.status_label} onChange={e => setStatusForm({ ...statusForm, status_label: e.target.value })} /></label>
                <label className="span-2"><span>Комментарий</span><input value={statusForm.comment} onChange={e => setStatusForm({ ...statusForm, comment: e.target.value })} /></label>
              </div>

              <button className="small primary" onClick={addStatus}>Добавить статус</button>
            </div>

            <div className="card span-2">
              <h3>История статусов</h3>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Филиал</th><th>Стол</th><th>Статус</th><th>Текст</th><th>Комментарий</th><th>Время</th></tr></thead>
                  <tbody>
                    {statuses.map(s => (
                      <tr key={s.id}>
                        <td>{s.branch_id}</td>
                        <td>{s.table_number}</td>
                        <td>{s.status}</td>
                        <td>{s.status_label}</td>
                        <td>{s.comment}</td>
                        <td>{new Date(s.created_at).toLocaleString()}</td>
                      </tr>
                    ))}

                    {!statuses.length && <tr><td colSpan="6" className="hint">Статусов пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'info' && (
          <div className="card span-2">
            <h3>Информация для гостей</h3>

            <div className="form-grid compact">
              <label><span>Филиал</span><select value={info.branch_id} onChange={e => changeInfoBranch(e.target.value)}>{branchOptions.map(b => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}</select></label>
              <label><span>Название филиала в QR Menu</span><input value={infoBranchName || ''} onChange={e => setInfoBranchName(e.target.value)} /></label>
              <label><span>Wi‑Fi</span><input value={info.wifi_name || ''} onChange={e => setInfo({ ...info, wifi_name: e.target.value })} /></label>
              <label><span>Пароль Wi‑Fi</span><div className="rms-wifi-password-field"><input type={showWifiPassword ? 'text' : 'password'} value={info.wifi_password || ''} onChange={e => setInfo({ ...info, wifi_password: e.target.value })} autoComplete="new-password" /><button type="button" className="small" onClick={() => setShowWifiPassword(value => !value)}>{showWifiPassword ? 'Скрыть' : 'Показать'}</button></div></label>
              <label><span>Рабочие часы</span><input value={info.working_hours || ''} onChange={e => setInfo({ ...info, working_hours: e.target.value })} /></label>
              <label><span>Телефон</span><input value={info.phone || ''} onChange={e => setInfo({ ...info, phone: e.target.value })} /></label>
              <label><span>Instagram</span><input value={info.instagram || ''} onChange={e => setInfo({ ...info, instagram: e.target.value })} /></label>
              <label><span>Facebook</span><input value={info.facebook || ''} onChange={e => setInfo({ ...info, facebook: e.target.value })} /></label>
              <label><span>TikTok</span><input value={info.tiktok || ''} onChange={e => setInfo({ ...info, tiktok: e.target.value })} /></label>
              <label><span>Website</span><input value={info.website || ''} onChange={e => setInfo({ ...info, website: e.target.value })} /></label>
              <label><span>Адрес</span><input value={info.address || ''} onChange={e => setInfo({ ...info, address: e.target.value })} /></label>
            </div>

            <button className="small primary" onClick={saveInfo}>Сохранить информацию</button>
          </div>
        )}
      </section>
    </section>
  )
}

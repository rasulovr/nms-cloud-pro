import React, { useEffect, useMemo, useState } from 'react'
import {
  Ban,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  ImagePlus,
  Languages,
  Plus,
  QrCode,
  Search,
  Store,
  Trash2,
  X
} from 'lucide-react'
import { supabase } from './supabase'
import { localizeProduct } from './qrMenuTranslations'
import './RMSQRMenuAdmin.css'

const fmt = (n) => Number(n || 0).toFixed(2)
const appOrigin = () => window.location.origin
const imageBucket = 'qr-menu-images'
const DEFAULT_QR_BRANCHES = ['BC1', 'BC2', 'BC3', 'BC4', 'BC5', 'Bistro']
const SHARED_MENU_BRANCHES = ['BC1', 'BC2', 'BC4', 'BC5']

const QR_ADMIN_TEXT = {
  ru: {
    title: 'QR Menu', subtitle: 'Филиалы, QR-коды, позиции меню, переводы, фото и stop-list.', refresh: 'Обновить', loading: 'Загрузка...',
    tables: 'QR и столы', menu: 'Филиалы и меню', recommendations: 'Рекомендации', ratings: 'Рейтинги', bills: 'Счета / оплаты', ads: 'Реклама', calls: 'Вызовы', cart: 'Shared Cart', status: 'Kitchen Status', info: 'Инфо',
    branchMenus: 'QR Menu по филиалам', sharedCatalog: 'Единый каталог', sharedHint: 'BC1, BC2, BC4 и BC5 используют одно меню без расхождений. Изменение позиции, цены, фото или stop-list применяется ко всем четырём филиалам.',
    connected: 'Подключено', items: 'позиций', manage: 'Управлять', open: 'Открыть меню', copy: 'Копировать ссылку', copied: 'Ссылка скопирована',
    catalogue: 'Каталог QR Menu', catalogueHint: 'Компактный список вместо широкой таблицы. Выберите язык предпросмотра и редактируйте позицию в отдельной форме.',
    allCategories: 'Все категории', allStatuses: 'Все статусы', active: 'Активные', stopped: 'Stop-list', hidden: 'Скрытые', search: 'Поиск по названию, описанию или переводу',
    addItem: 'Добавить позицию', total: 'Всего', withoutPhoto: 'Без фото', languages: 'Языки', edit: 'Изменить', delete: 'Удалить', noItems: 'Позиции не найдены.',
    editItem: 'Редактирование позиции', addItemTitle: 'Новая позиция', russianSource: 'Русский · основной', autoTranslation: 'AZ и EN · перевод гостевого меню',
    translationHint: 'Азербайджанский и английский варианты автоматически берутся из подтверждённого словаря QR Menu.', name: 'Название', category: 'Категория', description: 'Описание', price: 'Цена', image: 'Изображение', imageLink: 'Ссылка изображения',
    save: 'Сохранить', cancel: 'Отмена', upload: 'Загрузить фото', enabled: 'Активна', available: 'Доступна', stop: 'Stop', preview: 'Предпросмотр', noDescription: 'Описание не заполнено',
    branchPrefix: 'Barista&Chef'
  },
  az: {
    title: 'QR Menu', subtitle: 'Filiallar, QR-kodlar, menyu mövqeləri, tərcümələr, fotolar və stop-list.', refresh: 'Yenilə', loading: 'Yüklənir...',
    tables: 'QR və masalar', menu: 'Filiallar və menyu', recommendations: 'Tövsiyələr', ratings: 'Reytinqlər', bills: 'Hesablar / ödənişlər', ads: 'Reklam', calls: 'Çağırışlar', cart: 'Shared Cart', status: 'Kitchen Status', info: 'Məlumat',
    branchMenus: 'Filiallar üzrə QR Menu', sharedCatalog: 'Vahid kataloq', sharedHint: 'BC1, BC2, BC4 və BC5 heç bir fərq olmadan eyni menyudan istifadə edir. Mövqe, qiymət, foto və ya stop-list dəyişikliyi bütün dörd filiala tətbiq olunur.',
    connected: 'Qoşulub', items: 'mövqe', manage: 'İdarə et', open: 'Menyunu aç', copy: 'Linki köçür', copied: 'Link köçürüldü',
    catalogue: 'QR Menu kataloqu', catalogueHint: 'Geniş cədvəl əvəzinə kompakt siyahı. Önizləmə dilini seçin və mövqeni ayrıca formadan redaktə edin.',
    allCategories: 'Bütün kateqoriyalar', allStatuses: 'Bütün statuslar', active: 'Aktiv', stopped: 'Stop-list', hidden: 'Gizli', search: 'Ad, təsvir və ya tərcümə üzrə axtarış',
    addItem: 'Mövqe əlavə et', total: 'Cəmi', withoutPhoto: 'Fotosuz', languages: 'Dillər', edit: 'Dəyiş', delete: 'Sil', noItems: 'Mövqe tapılmadı.',
    editItem: 'Mövqenin redaktəsi', addItemTitle: 'Yeni mövqe', russianSource: 'Rus dili · əsas', autoTranslation: 'AZ və EN · qonaq menyusunun tərcüməsi',
    translationHint: 'Azərbaycan və ingilis variantları QR Menu-nun təsdiqlənmiş lüğətindən avtomatik götürülür.', name: 'Ad', category: 'Kateqoriya', description: 'Təsvir', price: 'Qiymət', image: 'Şəkil', imageLink: 'Şəkil linki',
    save: 'Yadda saxla', cancel: 'Ləğv et', upload: 'Foto yüklə', enabled: 'Aktivdir', available: 'Mövcuddur', stop: 'Stop', preview: 'Önizləmə', noDescription: 'Təsvir doldurulmayıb',
    branchPrefix: 'Barista&Chef'
  },
  en: {
    title: 'QR Menu', subtitle: 'Branches, QR codes, menu items, translations, photos and stop list.', refresh: 'Refresh', loading: 'Loading...',
    tables: 'QR & tables', menu: 'Branches & menu', recommendations: 'Recommendations', ratings: 'Ratings', bills: 'Bills / payments', ads: 'Advertising', calls: 'Calls', cart: 'Shared Cart', status: 'Kitchen Status', info: 'Info',
    branchMenus: 'QR Menu by branch', sharedCatalog: 'Shared catalogue', sharedHint: 'BC1, BC2, BC4 and BC5 use the exact same menu. Changes to an item, price, photo or stop list apply to all four branches.',
    connected: 'Connected', items: 'items', manage: 'Manage', open: 'Open menu', copy: 'Copy link', copied: 'Link copied',
    catalogue: 'QR Menu catalogue', catalogueHint: 'A compact list replaces the wide table. Choose the preview language and edit each item in a dedicated form.',
    allCategories: 'All categories', allStatuses: 'All statuses', active: 'Active', stopped: 'Stop list', hidden: 'Hidden', search: 'Search by name, description or translation',
    addItem: 'Add item', total: 'Total', withoutPhoto: 'Without photo', languages: 'Languages', edit: 'Edit', delete: 'Delete', noItems: 'No items found.',
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

const defaultProduct = {
  name: '',
  category: '',
  description: '',
  price: '',
  image_url: '',
  is_active: true,
  is_available: true,
  is_stop: false
}

export default function RMSQRMenuAdmin({ lang = localStorage.getItem('rms_lang') || localStorage.getItem('nms_lang') || 'ru' }) {
  const adminLanguage = normalizeAdminLanguage(lang)
  const ui = QR_ADMIN_TEXT[adminLanguage]
  const [tab, setTab] = useState('menu')
  const [showWifiPassword, setShowWifiPassword] = useState(false)

  const [tables, setTables] = useState([])
  const [products, setProducts] = useState([])
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
  const [productForm, setProductForm] = useState(defaultProduct)
  const [selectedMenuBranch, setSelectedMenuBranch] = useState('BC1')
  const [menuLanguage, setMenuLanguage] = useState(adminLanguage)
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCategory, setMenuCategory] = useState('all')
  const [menuStatus, setMenuStatus] = useState('all')
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [editingDraft, setEditingDraft] = useState(null)
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

  const menuCategories = useMemo(() => Array.from(new Set(products.map(product => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')), [products])

  const filteredProducts = useMemo(() => {
    const needle = menuSearch.trim().toLocaleLowerCase('ru-RU')
    return products.filter(product => {
      if (menuCategory !== 'all' && product.category !== menuCategory) return false
      if (menuStatus === 'active' && (product.is_active === false || product.is_stop === true)) return false
      if (menuStatus === 'stopped' && product.is_stop !== true) return false
      if (menuStatus === 'hidden' && product.is_active !== false) return false
      if (!needle) return true
      const translations = ['ru', 'az', 'en'].map(language => productForLanguage(product, language))
      return translations.some(item => `${item.name || ''} ${item.description || ''} ${product.category || ''}`.toLocaleLowerCase('ru-RU').includes(needle))
    })
  }, [menuCategory, menuSearch, menuStatus, products])

  const menuSummary = useMemo(() => ({
    total: products.length,
    active: products.filter(product => product.is_active !== false && product.is_stop !== true).length,
    stopped: products.filter(product => product.is_stop === true).length,
    withoutPhoto: products.filter(product => !product.image_url).length
  }), [products])

  useEffect(() => {
    setMenuLanguage(adminLanguage)
  }, [adminLanguage])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      loadBranches(),
      loadTables(),
      loadProducts(),
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
    if (!error) setTables(data || [])
  }

  async function loadProducts() {
    const { data, error } = await supabase.from('rms_menu_products').select('*').order('name', { ascending: true })
    if (error) return
    setProducts((data || []).map(normalizeProduct))
  }

  function normalizeProduct(p) {
    return {
      ...p,
      id: String(p.id),
      name: p.name || p.product_name || p.title || 'Unnamed item',
      category: p.category || p.category_name || 'Menu',
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

  async function loadInfo() {
    const { data, error } = await supabase.from('rms_qr_info').select('*').eq('branch_id', info.branch_id || 'BC1').maybeSingle()
    if (!error && data) setInfo({ ...defaultInfo, ...data })
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

  async function addProduct() {
    if (!productForm.name.trim()) {
      setMsg('Введите название позиции')
      return
    }

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category.trim() || 'Menu',
      description: productForm.description.trim(),
      price: Number(productForm.price || 0),
      image_url: productForm.image_url.trim(),
      is_active: productForm.is_active,
      is_available: productForm.is_available,
      is_stop: productForm.is_stop
    }

    const { error } = await supabase.from('rms_menu_products').insert(payload)

    if (error) setMsg(error.message)
    else {
      setProductForm(defaultProduct)
      setShowCreateProduct(false)
      await loadProducts()
      setMsg('Позиция добавлена')
    }
  }

  async function handleProductImage(file) {
    if (!file) return
    setMsg('Загружаю изображение...')
    const url = await uploadImageFile(file, 'menu')
    setProductForm(prev => ({ ...prev, image_url: url }))
    setMsg('Изображение позиции добавлено')
  }

  async function deleteProduct(id, name) {
    if (!window.confirm(`Удалить позицию QR Menu: ${name || ''}?`)) return
    const { error } = await supabase.from('rms_menu_products').delete().eq('id', id)
    if (error) setMsg(error.message)
    else {
      setProducts(prev => prev.filter(p => p.id !== String(id)))
      setMsg('Позиция удалена')
    }
  }

  async function updateProduct(id, patch) {
    const { error } = await supabase.from('rms_menu_products').update(patch).eq('id', id)

    if (error) {
      setMsg(error.message)
      return false
    }

    setProducts(prev => prev.map(p => p.id === String(id) ? { ...p, ...patch } : p))
    setMsg('Позиция сохранена')
    return true
  }

  function branchDisplayName(branchId) {
    const branch = branchOptions.find(option => String(option.id).toUpperCase() === String(branchId).toUpperCase())
    const rawName = String(branch?.name || '').trim()
    if (rawName && rawName.toUpperCase() !== String(branchId).toUpperCase()) return rawName
    return `${ui.branchPrefix} · ${branchId}`
  }

  function manageBranchMenu(branchId) {
    setSelectedMenuBranch(branchId)
    setBranchQrForm({ branch_id: branchId })
    setTableForm(current => ({ ...current, branch_id: branchId }))
  }

  async function copyBranchUrl(branchId) {
    try {
      await navigator.clipboard.writeText(qrUrl(branchId))
      setMsg(`${ui.copied}: ${branchId}`)
    } catch {
      setMsg(qrUrl(branchId))
    }
  }

  function startEditingProduct(product) {
    setEditingDraft({
      ...product,
      price: String(product.price ?? ''),
      description: product.description || '',
      image_url: product.image_url || ''
    })
  }

  async function saveEditingProduct() {
    if (!editingDraft?.id || !String(editingDraft.name || '').trim()) return
    const saved = await updateProduct(editingDraft.id, {
      name: String(editingDraft.name || '').trim(),
      category: String(editingDraft.category || '').trim() || 'Menu',
      description: String(editingDraft.description || '').trim(),
      price: Number(editingDraft.price || 0),
      image_url: String(editingDraft.image_url || '').trim(),
      is_active: editingDraft.is_active !== false,
      is_available: editingDraft.is_available !== false,
      is_stop: editingDraft.is_stop === true
    })
    if (saved) setEditingDraft(null)
  }

  async function handleEditingImage(file) {
    if (!file || !editingDraft?.id) return
    setMsg('Загружаю изображение...')
    const imageUrl = await uploadImageFile(file, 'menu')
    setEditingDraft(current => current ? { ...current, image_url: imageUrl } : current)
    setMsg('Изображение подготовлено. Нажмите «Сохранить».')
  }

  async function saveInfo() {
    const { error } = await supabase.from('rms_qr_info').upsert(info, { onConflict: 'branch_id' })
    setMsg(error ? error.message : 'Информация QR Menu сохранена')
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
                {SHARED_MENU_BRANCHES.map(branchId => (
                  <article className={`qr-branch-card ${selectedMenuBranch === branchId ? 'selected' : ''}`} key={branchId}>
                    <div className="qr-branch-card-top">
                      <div className="qr-branch-code"><Store size={16} /><b>{branchId}</b></div>
                      <span className="qr-status-chip"><Check size={13} /> {ui.connected}</span>
                    </div>
                    <div className="qr-branch-card-main">
                      <img src={qrImageUrl(branchId)} alt={`QR ${branchId}`} />
                      <div>
                        <h4>{branchDisplayName(branchId)}</h4>
                        <p>{products.length} {ui.items}</p>
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

            {showCreateProduct && (
              <div className="card span-2 qr-create-card">
                <div className="qr-admin-card-head compact">
                  <div><span className="qr-admin-eyebrow"><Plus size={14} /> {ui.addItemTitle}</span><h3>{ui.russianSource}</h3></div>
                  <button className="qr-icon-button" type="button" onClick={() => setShowCreateProduct(false)} aria-label={ui.cancel}><X size={18} /></button>
                </div>
                <div className="qr-editor-grid">
                  <div className="qr-editor-fields">
                    <label><span>{ui.name}</span><input value={productForm.name} onChange={event => setProductForm({ ...productForm, name: event.target.value })} /></label>
                    <div className="qr-two-fields">
                      <label><span>{ui.category}</span><input value={productForm.category} onChange={event => setProductForm({ ...productForm, category: event.target.value })} /></label>
                      <label><span>{ui.price}</span><input inputMode="decimal" value={productForm.price} onChange={event => setProductForm({ ...productForm, price: event.target.value })} /></label>
                    </div>
                    <label><span>{ui.description}</span><textarea rows="4" value={productForm.description} onChange={event => setProductForm({ ...productForm, description: event.target.value })} /></label>
                    <label><span>{ui.imageLink}</span><input value={productForm.image_url || ''} onChange={event => setProductForm({ ...productForm, image_url: event.target.value })} /></label>
                    <label className="qr-upload-button"><ImagePlus size={17} /><span>{ui.upload}</span><input type="file" accept="image/*" onChange={event => handleProductImage(event.target.files?.[0])} /></label>
                  </div>
                  <div className="qr-translation-preview">
                    <span className="qr-admin-eyebrow"><Languages size={14} /> {ui.autoTranslation}</span>
                    <p>{ui.translationHint}</p>
                    {['az', 'en'].map(language => {
                      const translated = productForLanguage(productForm, language)
                      return <article key={language}><b>{language.toUpperCase()}</b><h4>{translated.name || '—'}</h4><p>{translated.description || ui.noDescription}</p></article>
                    })}
                  </div>
                </div>
                <div className="qr-form-actions">
                  <button className="small" type="button" onClick={() => setShowCreateProduct(false)}>{ui.cancel}</button>
                  <button className="small primary" type="button" onClick={addProduct}>{ui.addItem}</button>
                </div>
              </div>
            )}

            <div className="card span-2 qr-catalogue-card">
              <div className="qr-admin-card-head">
                <div>
                  <span className="qr-admin-eyebrow"><QrCode size={14} /> {branchDisplayName(selectedMenuBranch)}</span>
                  <h3>{ui.catalogue}</h3>
                  <p>{ui.catalogueHint}</p>
                </div>
                <button type="button" className="small primary qr-add-product" onClick={() => setShowCreateProduct(true)}><Plus size={16} /> {ui.addItem}</button>
              </div>

              <div className="qr-menu-summary">
                <article><span>{ui.total}</span><b>{menuSummary.total}</b></article>
                <article className="good"><span>{ui.active}</span><b>{menuSummary.active}</b></article>
                <article className="warn"><span>{ui.stopped}</span><b>{menuSummary.stopped}</b></article>
                <article><span>{ui.withoutPhoto}</span><b>{menuSummary.withoutPhoto}</b></article>
              </div>

              <div className="qr-catalogue-toolbar">
                <label className="qr-search-box"><Search size={17} /><input value={menuSearch} onChange={event => setMenuSearch(event.target.value)} placeholder={ui.search} /></label>
                <select value={menuCategory} onChange={event => setMenuCategory(event.target.value)}>
                  <option value="all">{ui.allCategories}</option>
                  {menuCategories.map(categoryName => <option key={categoryName} value={categoryName}>{categoryName}</option>)}
                </select>
                <select value={menuStatus} onChange={event => setMenuStatus(event.target.value)}>
                  <option value="all">{ui.allStatuses}</option>
                  <option value="active">{ui.active}</option>
                  <option value="stopped">{ui.stopped}</option>
                  <option value="hidden">{ui.hidden}</option>
                </select>
                <div className="qr-language-switch" aria-label={ui.languages}>
                  {['ru', 'az', 'en'].map(language => <button type="button" className={menuLanguage === language ? 'active' : ''} onClick={() => setMenuLanguage(language)} key={language}>{language.toUpperCase()}</button>)}
                </div>
              </div>

              <div className="qr-product-list">
                {filteredProducts.map(product => {
                  const translated = productForLanguage(product, menuLanguage)
                  return (
                    <article className={`qr-product-row ${product.is_stop ? 'is-stopped' : ''} ${product.is_active === false ? 'is-hidden' : ''}`} key={product.id}>
                      <div className="qr-product-photo">
                        {product.image_url ? <img src={product.image_url} alt="" /> : <ImagePlus size={22} />}
                      </div>
                      <div className="qr-product-copy">
                        <div className="qr-product-heading"><h4>{translated.name || product.name}</h4><b>{fmt(product.price)} ₼</b></div>
                        <p>{translated.description || ui.noDescription}</p>
                        <div className="qr-product-meta"><span>{product.category}</span><span>{menuLanguage.toUpperCase()}</span>{product.is_stop && <span className="stop">STOP</span>}{product.is_active === false && <span className="hidden">{ui.hidden}</span>}</div>
                      </div>
                      <div className="qr-product-actions">
                        <button type="button" onClick={() => updateProduct(product.id, { is_stop: !product.is_stop })} className={product.is_stop ? 'active-stop' : ''} title={ui.stop}><Ban size={17} /></button>
                        <button type="button" onClick={() => startEditingProduct(product)} title={ui.edit}><Edit3 size={17} /></button>
                        <button type="button" className="danger" onClick={() => deleteProduct(product.id, product.name)} title={ui.delete}><Trash2 size={17} /></button>
                      </div>
                    </article>
                  )
                })}
                {!filteredProducts.length && <div className="qr-empty-list">{ui.noItems}</div>}
              </div>
            </div>

            {editingDraft && (
              <div className="qr-editor-backdrop" onMouseDown={event => event.currentTarget === event.target && setEditingDraft(null)}>
                <section className="qr-editor-panel" role="dialog" aria-modal="true" aria-label={ui.editItem}>
                  <div className="qr-editor-header">
                    <div><span className="qr-admin-eyebrow"><Edit3 size={14} /> {ui.editItem}</span><h3>{editingDraft.name}</h3></div>
                    <button className="qr-icon-button" type="button" onClick={() => setEditingDraft(null)} aria-label={ui.cancel}><X size={20} /></button>
                  </div>
                  <div className="qr-editor-grid">
                    <div className="qr-editor-fields">
                      <span className="qr-section-label">RU · {ui.russianSource}</span>
                      <label><span>{ui.name}</span><input value={editingDraft.name || ''} onChange={event => setEditingDraft({ ...editingDraft, name: event.target.value })} /></label>
                      <div className="qr-two-fields">
                        <label><span>{ui.category}</span><input value={editingDraft.category || ''} onChange={event => setEditingDraft({ ...editingDraft, category: event.target.value })} /></label>
                        <label><span>{ui.price}</span><input inputMode="decimal" value={editingDraft.price ?? ''} onChange={event => setEditingDraft({ ...editingDraft, price: event.target.value })} /></label>
                      </div>
                      <label><span>{ui.description}</span><textarea rows="5" value={editingDraft.description || ''} onChange={event => setEditingDraft({ ...editingDraft, description: event.target.value })} /></label>
                      <label><span>{ui.imageLink}</span><input value={editingDraft.image_url || ''} onChange={event => setEditingDraft({ ...editingDraft, image_url: event.target.value })} /></label>
                      <div className="qr-image-editor-row">
                        <div className="qr-editor-thumb">{editingDraft.image_url ? <img src={editingDraft.image_url} alt="" /> : <ImagePlus size={24} />}</div>
                        <label className="qr-upload-button"><ImagePlus size={17} /><span>{ui.upload}</span><input type="file" accept="image/*" onChange={event => handleEditingImage(event.target.files?.[0])} /></label>
                      </div>
                      <div className="qr-toggle-row">
                        <label><input type="checkbox" checked={editingDraft.is_active !== false} onChange={event => setEditingDraft({ ...editingDraft, is_active: event.target.checked })} /><span>{ui.enabled}</span></label>
                        <label><input type="checkbox" checked={editingDraft.is_available !== false} onChange={event => setEditingDraft({ ...editingDraft, is_available: event.target.checked })} /><span>{ui.available}</span></label>
                        <label><input type="checkbox" checked={editingDraft.is_stop === true} onChange={event => setEditingDraft({ ...editingDraft, is_stop: event.target.checked })} /><span>{ui.stop}</span></label>
                      </div>
                    </div>
                    <div className="qr-translation-preview">
                      <span className="qr-admin-eyebrow"><Languages size={14} /> {ui.autoTranslation}</span>
                      <p>{ui.translationHint}</p>
                      {['az', 'en'].map(language => {
                        const translated = productForLanguage(editingDraft, language)
                        return <article key={language}><b>{language.toUpperCase()}</b><h4>{translated.name || '—'}</h4><p>{translated.description || ui.noDescription}</p></article>
                      })}
                    </div>
                  </div>
                  <div className="qr-editor-footer">
                    <button className="small" type="button" onClick={() => setEditingDraft(null)}>{ui.cancel}</button>
                    <button className="small primary" type="button" onClick={saveEditingProduct}>{ui.save}</button>
                  </div>
                </section>
              </div>
            )}
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
              <label><span>Филиал</span><select value={info.branch_id} onChange={e => setInfo({ ...info, branch_id: e.target.value })}>{branchOptions.map(b => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}</select></label>
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

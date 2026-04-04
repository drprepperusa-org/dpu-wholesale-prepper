'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import BulkEditView from './BulkEditView'
import {
  Flame, Package, Zap, Users, ClipboardList, FolderOpen, Settings,
  Search, Ban, AlertTriangle, Trash2, Pencil, Check, X, GripVertical,
  LogOut, ChevronDown, ChevronRight, ChevronLeft, Camera, Eye,
  DollarSign, Trophy, BarChart3, Shield, Key, Heart, User,
  XCircle, CheckCircle, MoreHorizontal, Plus, LayoutGrid, AlignJustify,
  ArrowUpRight, Star, CheckCircle2, Boxes, Megaphone, ImageIcon, Type, Upload, Link, Download, FileSpreadsheet
} from 'lucide-react'

function AdminPortal({ onLogout, onSwitchToCustomer, currentUser }) {
  // ==================== STATE ====================
  const [activePage, setActivePage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_active_page')
      if (saved && ['catalog', 'bulk-edit', 'views', 'orders', 'categories', 'settings'].includes(saved)) return saved
    }
    return 'catalog'
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [viewsZoom, setViewsZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_views_zoom')
      if (saved) return parseInt(saved) || 100
    }
    return 100
  })
  const [sidebarFilter, setSidebarFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState('all')
  const [filterTitle, setFilterTitle] = useState('All Products')

  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [categoryTree, setCategoryTree] = useState([])
  const [categoryMetadata, setCategoryMetadata] = useState({})
  const [expandedSuperCats, setExpandedSuperCats] = useState({})
  const [expandedViewCats, setExpandedViewCats] = useState({})

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [custSearchQuery, setCustSearchQuery] = useState('')
  const [customerViewMode, setCustomerViewMode] = useState('full')

  const [isLoading, setIsLoading] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState({})

  // Modals state
  const [activeModal, setActiveModal] = useState(null)
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    weight: '',
    bags_per_case: '',
    cases_per_pallet: '',
    price: '',
    category_id: '',
    image_url: '',
    imageFile: null,
    showPrice: true
  })
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [productFormErrors, setProductFormErrors] = useState({})
  const [editProductErrors, setEditProductErrors] = useState({})
  const [editingProduct, setEditingProduct] = useState(null)

  const [newCustomerForm, setNewCustomerForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    preset: 'full'
  })
  const [customerFormErrors, setCustomerFormErrors] = useState({})

  // Saving states
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isDeletingProduct, setIsDeletingProduct] = useState(null)
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [isSavingEditProduct, setIsSavingEditProduct] = useState(false)

  // Registration and Activity log
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [priceVisibility, setPriceVisibility] = useState(true)
  const [promoBanner, setPromoBanner] = useState({ enabled: false, type: 'text', label: 'LIMITED TIME OFFER', headline: 'Free freight on orders over $2,000', subtitle: 'Use code SPRINGDEAL at checkout for an extra 5% off your first container order.', ctaText: 'Shop New Arrivals', ctaLink: '', imageUrl: '' })
  const [pendingRegistrations, setPendingRegistrations] = useState([])
  const [activityLog, setActivityLog] = useState([
    { customer: 'Happy Snacks Co.', message: 'Logged in', type: 'login', icon: 'key', time: 'just now' },
    { customer: 'Dragon Imports', message: "Favorited: Lay's Cheetos", type: 'favorite', icon: 'heart', time: '5 min' }
  ])
  const [activityCustFilter, setActivityCustFilter] = useState('all')
  const [activityTypeFilter, setActivityTypeFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [catReorderStatus, setCatReorderStatus] = useState('')

  // Pagination
  const [paginationPage, setPaginationPage] = useState(1)
  const [paginationTotal, setPaginationTotal] = useState(0)
  const [paginationPages, setPaginationPages] = useState(1)
  const paginationLimit = 50

  // Filters
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [superCatFilter, setSuperCatFilter] = useState('')

  // Bulk actions
  const [bulkConfirmVisible, setBulkConfirmVisible] = useState(false)
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null)
  const [bulkConfirmCount, setBulkConfirmCount] = useState(0)
  const [bulkConfirmTargets, setBulkConfirmTargets] = useState([])

  // Error toast
  const [errorToastVisible, setErrorToastVisible] = useState(false)
  const [errorToastMessage, setErrorToastMessage] = useState('')
  const [errorToastRetry, setErrorToastRetry] = useState(null)

  // Toast
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Categories management
  const [superCategoriesList, setSuperCategoriesList] = useState([])
  const [categoriesBySuper, setCategoriesBySuper] = useState({})
  const dragItemRef = useRef(null)
  const dragOverItemRef = useRef(null)
  const [dragContext, setDragContext] = useState(null)
  const [newSuperCatName, setNewSuperCatName] = useState('')
  const [editingSuperCatId, setEditingSuperCatId] = useState(null)
  const [editingSuperCatName, setEditingSuperCatName] = useState('')
  const [newSubCatName, setNewSubCatName] = useState({})
  const [editingSubCatId, setEditingSubCatId] = useState(null)
  const [editingSubCatName, setEditingSubCatName] = useState('')

  // Debounce
  const searchDebounceRef = useRef(null)
  const imageFileInputRef = useRef(null)
  const excelFileInputRef = useRef(null)
  const [excelUploading, setExcelUploading] = useState(false)
  const [excelResult, setExcelResult] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importExcelFile, setImportExcelFile] = useState(null)
  const [importImageFiles, setImportImageFiles] = useState([])
  const [importProgress, setImportProgress] = useState('')

  // ==================== COMPUTED ====================
  const hiddenCount = useMemo(() => products.filter(p => p.is_hidden).length, [products])
  const oosCount = useMemo(() => products.filter(p => p.is_oos).length, [products])
  const inStockCount = useMemo(() => products.filter(p => !p.is_oos && !p.is_hidden).length, [products])
  const newThisWeekCount = useMemo(() => products.filter(p => { if (!p.created_at) return false; return ((new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24)) <= 7 }).length, [products])

  const superCatNames = useMemo(() => categoryTree.map(c => c.name), [categoryTree])

  const groupedProducts = useMemo(() => {
    let filtered = products

    // Apply current filter
    if (currentFilter === 'hidden') {
      filtered = filtered.filter(p => p.is_hidden)
    } else if (currentFilter === 'oos') {
      filtered = filtered.filter(p => p.is_oos)
    } else if (currentFilter.startsWith('super:')) {
      const sc = currentFilter.substring(6)
      filtered = filtered.filter(p => p.super_category === sc)
    } else if (currentFilter.startsWith('cat:')) {
      const cat = currentFilter.substring(4)
      filtered = filtered.filter(p => p.category === cat)
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      )
    }

    // Group by super_category first, then by category
    const grouped = {}
    filtered.forEach(p => {
      const superCatKey = p.super_category || 'Other'
      const catKey = p.category || 'Uncategorized'
      if (!grouped[superCatKey]) grouped[superCatKey] = { total: 0, categories: {} }
      if (!grouped[superCatKey].categories[catKey]) grouped[superCatKey].categories[catKey] = []
      grouped[superCatKey].categories[catKey].push(p)
      grouped[superCatKey].total++
    })
    return grouped
  }, [products, currentFilter, searchQuery])

  const filteredCustomers = useMemo(() => {
    if (!custSearchQuery) return customers
    const q = custSearchQuery.toLowerCase()
    return customers.filter(c =>
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [customers, custSearchQuery])

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders
    return orders.filter(o => (o.status || '').toLowerCase() === orderFilter.toLowerCase())
  }, [orders, orderFilter])

  const filteredActivityLog = useMemo(() => {
    let logs = activityLog
    if (activityCustFilter !== 'all') {
      logs = logs.filter(l => l.customer === activityCustFilter)
    }
    if (activityTypeFilter !== 'all') {
      logs = logs.filter(l => l.type === activityTypeFilter)
    }
    return logs
  }, [activityLog, activityCustFilter, activityTypeFilter])

  const orderStats = useMemo(() => ({
    pending: orders.filter(o => o.status === 'Pending').length,
    processing: orders.filter(o => o.status === 'Processing').length,
    received: orders.filter(o => o.status === 'Received').length
  }), [orders])

  const customerVisibleCount = useMemo(() => {
    if (!selectedCustomer) return 0
    return products.filter(p => {
      if (p.is_hidden) return false
      if (selectedCustomer.catHidden?.includes(p.super_category)) return false
      if (selectedCustomer.customHidden?.includes(p.id)) return false
      return true
    }).length
  }, [products, selectedCustomer])

  const customerHiddenCount = products.length - customerVisibleCount

  const paginationInfo = useMemo(() => {
    const start = (paginationPage - 1) * paginationLimit + 1
    const end = Math.min(paginationPage * paginationLimit, paginationTotal)
    return `Showing ${start}\u2013${end} of ${paginationTotal}`
  }, [paginationPage, paginationLimit, paginationTotal])

  const selectedProductIds = useMemo(() =>
    Object.entries(selectedProducts).filter(([, v]) => v).map(([k]) => k),
    [selectedProducts]
  )

  const selectedProductCount = selectedProductIds.length

  const isProductFormValid = useMemo(() => {
    const f = newProductForm
    if (!f.name || f.name.trim().length === 0) return false
    if (f.name.trim().length > 255) return false
    if (!f.category_id) return false
    if (f.price !== '' && f.price !== null && f.price !== undefined) {
      const price = parseFloat(f.price)
      if (isNaN(price) || price < 0.01) return false
    }
    if (f.cases_per_pallet !== '' && f.cases_per_pallet !== null) {
      const val = parseInt(f.cases_per_pallet)
      if (isNaN(val) || val < 1) return false
    }
    return true
  }, [newProductForm])

  const isCustomerFormValid = useMemo(() => {
    const f = newCustomerForm
    if (!f.company_name || f.company_name.trim().length === 0) return false
    if (f.company_name.trim().length > 255) return false
    if (!f.email || f.email.trim().length === 0) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(f.email.trim())) return false
    if (!f.preset) return false
    return true
  }, [newCustomerForm])

  // ==================== HELPERS ====================

  const getSuperCategoryEmoji = useCallback((name) => {
    const emojis = {
      "Chips & Savory Snacks": "\u{1F954}",
      "Noodles & Rice": "\u{1F35C}",
      "Cookies & Wafers": "\u{1F36A}",
      "Candy & Jelly": "\u{1F36C}",
      "Korean Snacks": "\u{1F371}",
      "Beverages": "\u{1F964}",
      "Ice Cream": "\u{1F366}"
    }
    return emojis[name] || "\u{1F4E6}"
  }, [])

  const getAvatarColor = useCallback((name) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE']
    let hash = 0
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }, [])

  const formatDate = useCallback((dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString()
  }, [])

  const getCategoryCount = useCallback((cat) => {
    return products.filter(p => p.category === cat).length
  }, [products])

  const getProductsInCategory = useCallback((superCat) => {
    return products.filter(p => p.super_category === superCat)
  }, [products])

  const getCategoryItemCount = useCallback((categoryId, type) => {
    if (type === 'super') {
      return products.filter(p => p.super_category_id === categoryId).length
    } else if (type === 'cat') {
      return products.filter(p => p.category_id === categoryId).length
    }
    return 0
  }, [products])

  // ==================== DRAG & DROP REORDER ====================
  const handleDragStart = useCallback((e, index, listType, superId) => {
    dragItemRef.current = index
    setDragContext({ listType, superId })
    e.dataTransfer.effectAllowed = 'move'
    e.target.closest('.cat-item').classList.add('opacity-40')
  }, [])

  const handleDragEnter = useCallback((e, index, listType, superId) => {
    if (!dragContext || dragContext.listType !== listType || dragContext.superId !== superId) return
    dragOverItemRef.current = index
    e.preventDefault()
  }, [dragContext])

  const handleDragOver = useCallback((e, listType, superId) => {
    if (!dragContext || dragContext.listType !== listType || dragContext.superId !== superId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [dragContext])

  const handleDragEnd = useCallback((e) => {
    e.target.closest('.cat-item')?.classList.remove('opacity-40')
  }, [])

  const saveCategoryOrder = useCallback(async (endpoint, items) => {
    try {
      const token = localStorage.getItem('token')
      const updates = items.map((item, i) => ({ id: item.id, sort_order: i }))
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ updates })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCatReorderStatus('Order saved')
      setTimeout(() => setCatReorderStatus(''), 2500)
    } catch (err) {
      console.error('Reorder save failed:', err)
      setCatReorderStatus('')
    }
  }, [])

  const handleDrop = useCallback((e, listType, superId) => {
    e.preventDefault()
    document.querySelectorAll('.opacity-40').forEach(el => el.classList.remove('opacity-40'))
    if (!dragContext || dragContext.listType !== listType || dragContext.superId !== superId) return
    const from = dragItemRef.current
    const to = dragOverItemRef.current
    if (from === null || to === null || from === to) { setDragContext(null); return }

    if (listType === 'super') {
      const copy = [...superCategoriesList]
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      setSuperCategoriesList(copy)
      saveCategoryOrder('super-categories-reorder', copy)
    } else {
      const copy = [...(categoriesBySuper[superId] || [])]
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      setCategoriesBySuper(prev => ({ ...prev, [superId]: copy }))
      saveCategoryOrder('categories-reorder', copy)
    }
    dragItemRef.current = null
    dragOverItemRef.current = null
    setDragContext(null)
  }, [dragContext, superCategoriesList, categoriesBySuper, saveCategoryOrder])

  const getMonthOrders = useCallback(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return orders.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === month && d.getFullYear() === year
    }).length
  }, [orders])

  // ==================== TOAST ====================

  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setToastVisible(true)
    setTimeout(() => { setToastVisible(false) }, 3000)
  }, [])

  const showErrorToast = useCallback((msg, retryFn = null) => {
    setErrorToastMessage(msg)
    setErrorToastRetry(() => retryFn)
    setErrorToastVisible(true)
  }, [])

  const hideErrorToast = useCallback(() => {
    setErrorToastVisible(false)
    setErrorToastMessage('')
    setErrorToastRetry(null)
  }, [])

  const retryErrorAction = useCallback(() => {
    const fn = errorToastRetry
    hideErrorToast()
    if (fn) fn()
  }, [errorToastRetry, hideErrorToast])

  const logActivity = useCallback((message) => {
    setActivityLog(prev => {
      const newLog = [{
        customer: 'Admin',
        message,
        type: 'order',
        icon: 'settings',
        time: 'just now'
      }, ...prev]
      if (newLog.length > 100) newLog.pop()
      return newLog
    })
  }, [])

  // ==================== SUPER CATEGORY CRUD ====================
  const addSuperCategory = useCallback(async () => {
    if (!newSuperCatName.trim()) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/super-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: newSuperCatName.trim() })
      })
      const data = await res.json()
      if (!res.ok) { showToast((data.error || 'Failed to add')); return }
      setSuperCategoriesList(prev => [...prev, data.superCategory])
      setCategoriesBySuper(prev => ({ ...prev, [data.superCategory.id]: [] }))
      setNewSuperCatName('')
      showToast('Super category added')
    } catch (e) { showToast('Failed to add super category') }
  }, [newSuperCatName, showToast])

  const renameSuperCategory = useCallback(async (id) => {
    if (!editingSuperCatName.trim()) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/super-categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id, name: editingSuperCatName.trim() })
      })
      const data = await res.json()
      if (!res.ok) { showToast((data.error || 'Failed to rename')); return }
      setSuperCategoriesList(prev => prev.map(sc => sc.id === id ? { ...sc, name: data.superCategory.name } : sc))
      setEditingSuperCatId(null)
      setEditingSuperCatName('')
      showToast('Renamed')
    } catch (e) { showToast('Failed to rename') }
  }, [editingSuperCatName, showToast])

  const deleteSuperCategory = useCallback(async (id, name) => {
    if (!window.confirm(`Delete super category "${name}"? This cannot be undone.`)) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/super-categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id })
      })
      const data = await res.json()
      if (!res.ok) { showToast((data.error || 'Failed to delete')); return }
      setSuperCategoriesList(prev => prev.filter(sc => sc.id !== id))
      setCategoriesBySuper(prev => { const next = { ...prev }; delete next[id]; return next })
      showToast('Deleted')
    } catch (e) { showToast('Failed to delete') }
  }, [showToast])

  // ==================== SUBCATEGORY CRUD ====================
  const addSubCategory = useCallback(async (superId) => {
    const name = (newSubCatName[superId] || '').trim()
    if (!name) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, super_category_id: superId })
      })
      const data = await res.json()
      if (!res.ok) { showToast((data.error || 'Failed to add')); return }
      setCategoriesBySuper(prev => ({ ...prev, [superId]: [...(prev[superId] || []), data.category] }))
      setNewSubCatName(prev => ({ ...prev, [superId]: '' }))
      showToast('Subcategory added')
    } catch (e) { showToast('Failed to add subcategory') }
  }, [newSubCatName, showToast])

  const renameSubCategory = useCallback(async (id, superId) => {
    if (!editingSubCatName.trim()) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id, name: editingSubCatName.trim() })
      })
      const data = await res.json()
      if (!res.ok) { showToast((data.error || 'Failed to rename')); return }
      setCategoriesBySuper(prev => ({ ...prev, [superId]: (prev[superId] || []).map(c => c.id === id ? { ...c, name: data.category.name } : c) }))
      setEditingSubCatId(null)
      setEditingSubCatName('')
      showToast('Renamed')
    } catch (e) { showToast('Failed to rename') }
  }, [editingSubCatName, showToast])

  const deleteSubCategory = useCallback(async (id, superId, name) => {
    if (!window.confirm(`Delete subcategory "${name}"? This cannot be undone.`)) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id })
      })
      const data = await res.json()
      if (!res.ok) { showToast((data.error || 'Failed to delete')); return }
      setCategoriesBySuper(prev => ({ ...prev, [superId]: (prev[superId] || []).filter(c => c.id !== id) }))
      showToast('Deleted')
    } catch (e) { showToast('Failed to delete') }
  }, [showToast])

  // ==================== DATA LOADING ====================

  const buildCategoryTree = useCallback((prods) => {
    const categories = {}
    const metadata = {}

    prods.forEach(p => {
      const sc = p.super_category || 'Other'
      const c = p.category || 'Uncategorized'
      if (!categories[sc]) {
        categories[sc] = {
          name: sc,
          emoji: getSuperCategoryEmoji(sc),
          count: 0,
          subcats: new Set()
        }
      }
      categories[sc].count++
      if (p.category) {
        categories[sc].subcats.add(c)
        if (!metadata[c]) {
          metadata[c] = {
            id: p.category_id,
            is_hidden: p.category_is_hidden || false
          }
        }
      }
    })

    setCategoryTree(Object.values(categories).map(cat => ({
      ...cat,
      subcats: Array.from(cat.subcats)
    })))
    setCategoryMetadata(metadata)
  }, [getSuperCategoryEmoji])

  const loadProducts = useCallback(async (page = null) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      params.set('page', page !== null ? page : paginationPage)
      params.set('limit', 0)
      if (searchQuery) params.set('search', searchQuery)
      if (superCatFilter) params.set('super_category', superCatFilter)
      if (visibilityFilter !== 'all') params.set('visibility', visibilityFilter)
      if (stockFilter !== 'all') params.set('stock', stockFilter)

      const response = await fetch(`/api/products?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await response.json()
      const prods = Array.isArray(data) ? data : (data.products || [])
      setProducts(prods)
      if (data.pagination) {
        setPaginationTotal(data.pagination.total)
        setPaginationPages(data.pagination.pages)
      }
      buildCategoryTree(prods)
    } catch (e) {
      console.error('Failed to load products:', e)
      showErrorToast('Failed to load products', () => loadProducts())
    } finally {
      setIsLoading(false)
    }
  }, [paginationPage, searchQuery, superCatFilter, visibilityFilter, stockFilter, buildCategoryTree, showErrorToast])

  const loadProductsWithScrollPreserve = useCallback(async () => {
    const scrollY = window.scrollY
    await loadProducts()
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY)
    })
  }, [loadProducts])

  const loadCustomers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      const raw = Array.isArray(data) ? data : (data.customers || [])
      setCustomers(raw.map(c => ({
        ...c,
        company_name: c.company_name || 'Unknown',
        email: c.email || '',
        is_active: c.active !== undefined ? c.active : true,
        catHidden: c.catHidden || [],
        customHidden: c.customHidden || [],
        customOos: c.customOos || []
      })))
    } catch (e) {
      console.error('Failed to load customers:', e)
      showToast('Failed to load customers')
    }
  }, [showToast])

  // ==================== PENDING REGISTRATIONS ====================
  const loadPendingRegistrations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/pending-registrations', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.success) setPendingRegistrations(data.registrations || [])
    } catch (e) { console.error('Failed to load pending registrations:', e) }
  }, [])

  const processRegistration = useCallback(async (id, action, companyName) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/pending-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id, action })
      })
      const data = await res.json()
      if (!res.ok) { showToast((data.error || 'Failed')); return }
      showToast(`${companyName} ${action === 'approve' ? 'approved' : 'rejected'}`)
      loadPendingRegistrations()
      loadCustomers()
    } catch (e) { showToast('Failed to process registration') }
  }, [showToast, loadPendingRegistrations, loadCustomers])

  const loadOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      const rawOrders = Array.isArray(data) ? data : (data.orders || [])
      setOrders(rawOrders.map(o => ({
        ...o,
        customer_name: o.customer_name || o.company_name || 'Unknown',
        cases: o.cases || o.total_cases || 0,
        skus: o.skus || o.items?.length || 0,
        amount: o.items ? o.items.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.qty || 0)), 0).toFixed(2) : '0.00'
      })))
    } catch (e) {
      console.error('Failed to load orders:', e)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          const val = data.settings.allow_registration ?? data.settings.registration_enabled
          setRegistrationEnabled(val === undefined ? true : (val === 'true' || val === true))
          const priceVal = data.settings.show_prices
          setPriceVisibility(priceVal === undefined ? true : (priceVal === 'true' || priceVal === true))
          if (data.settings.promo_banner) {
            try {
              const parsed = JSON.parse(data.settings.promo_banner)
              setPromoBanner(prev => ({ ...prev, ...parsed, type: parsed.type || 'text' }))
            } catch(e) { console.error('Banner parse error:', e) }
          }
        }
      }
    } catch (e) {
      // Keep default if can't load settings
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/categories-tree', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data.success && data.superCategories && data.categories) {
        const sorted = data.superCategories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        setSuperCategoriesList(sorted)
        const bySuper = {}
        sorted.forEach(sc => {
          bySuper[sc.id] = data.categories
            .filter(c => c.super_category_id === sc.id)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        })
        setCategoriesBySuper(bySuper)
      }
    } catch (e) {
      console.error('Failed to load categories:', e)
    }
  }, [])

  // ==================== URL PARAMS ====================

  const updateURLParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    if (searchQuery) params.set('q', searchQuery); else params.delete('q')
    if (visibilityFilter !== 'all') params.set('vis', visibilityFilter); else params.delete('vis')
    if (stockFilter !== 'all') params.set('stock', stockFilter); else params.delete('stock')
    if (superCatFilter) params.set('sc', superCatFilter); else params.delete('sc')
    if (paginationPage > 1) params.set('page', paginationPage); else params.delete('page')
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newUrl)
  }, [searchQuery, visibilityFilter, stockFilter, superCatFilter, paginationPage])

  const loadFromURLParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('q')) setSearchQuery(params.get('q'))
    if (params.get('vis')) setVisibilityFilter(params.get('vis'))
    if (params.get('stock')) setStockFilter(params.get('stock'))
    if (params.get('sc')) setSuperCatFilter(params.get('sc'))
    if (params.get('page')) setPaginationPage(parseInt(params.get('page')) || 1)
  }, [])

  // ==================== INIT ====================

  useEffect(() => {
    loadFromURLParams()
    loadProducts()
    loadCustomers()
    loadOrders()
    loadSettings()
    loadCategories()
    loadPendingRegistrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ==================== NAVIGATION ====================

  const showPage = useCallback((page) => {
    setActivePage(page)
    setSidebarOpen(false)
    try { localStorage.setItem('admin_active_page', page) } catch(e) {}
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // ==================== SIDEBAR FILTER ====================

  const setFilter = useCallback((type, value) => {
    if (type === 'all') {
      setCurrentFilter('all')
      setFilterTitle('All Products')
    } else if (type === 'hidden') {
      setCurrentFilter('hidden')
      setFilterTitle('Hidden Products')
    } else if (type === 'oos') {
      setCurrentFilter('oos')
      setFilterTitle('Out of Stock')
    } else if (type === 'cat' && value) {
      setCurrentFilter(`cat:${value}`)
      setFilterTitle(value)
    }
    setSearchQuery('')
    setSelectedProducts({})
    setPaginationPage(1)
  }, [])

  const toggleSuperCat = useCallback((name) => {
    setExpandedSuperCats(prev => {
      const newState = { ...prev, [name]: !prev[name] }
      if (newState[name]) {
        setCurrentFilter(`super:${name}`)
        setFilterTitle(name)
      }
      return newState
    })
  }, [])

  // ==================== SEARCH ====================

  const onSearchInput = useCallback((e) => {
    const val = e.target.value
    setSearchQuery(val)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setPaginationPage(1)
      loadProducts(1)
    }, 300)
  }, [loadProducts])

  // ==================== PAGINATION ====================

  const changePage = useCallback((page) => {
    if (page < 1 || page > paginationPages) return
    setPaginationPage(page)
    loadProducts(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [paginationPages, loadProducts])

  // ==================== FILTER PILLS ====================

  const handleVisibilityFilter = useCallback((val) => {
    setVisibilityFilter(val)
    setPaginationPage(1)
  }, [])

  const handleStockFilter = useCallback((val) => {
    setStockFilter(val)
    setPaginationPage(1)
  }, [])

  const handleSuperCatFilter = useCallback((val) => {
    setSuperCatFilter(val)
    setPaginationPage(1)
  }, [])

  // Reload when filters change
  useEffect(() => {
    loadProducts(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityFilter, stockFilter, superCatFilter])

  // ==================== BULK SELECTION ====================

  const toggleProductSelect = useCallback((productId) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }, [])

  const toggleAllInCategory = useCallback((catProducts) => {
    const ids = catProducts.map(p => p.id)
    const allSelected = ids.every(id => selectedProducts[id])
    const update = {}
    ids.forEach(id => { update[id] = !allSelected })
    setSelectedProducts(prev => ({ ...prev, ...update }))
  }, [selectedProducts])

  const isCategoryAllSelected = useCallback((catProducts) => {
    if (!catProducts.length) return false
    return catProducts.every(p => selectedProducts[p.id])
  }, [selectedProducts])

  const isCategoryPartialSelected = useCallback((catProducts) => {
    const selected = catProducts.filter(p => selectedProducts[p.id]).length
    return selected > 0 && selected < catProducts.length
  }, [selectedProducts])

  const clearSelection = useCallback(() => {
    setSelectedProducts({})
  }, [])

  // ==================== BULK ACTIONS ====================

  const startBulkAction = useCallback((action) => {
    const ids = selectedProductIds
    if (!ids.length) return showToast('No products selected')
    setBulkConfirmAction(action)
    setBulkConfirmTargets(ids)
    setBulkConfirmCount(ids.length)
    setBulkConfirmVisible(true)
  }, [selectedProductIds, showToast])

  const cancelBulkAction = useCallback(() => {
    setBulkConfirmVisible(false)
    setBulkConfirmAction(null)
    setBulkConfirmTargets([])
    setBulkConfirmCount(0)
  }, [])

  const executeBulkAction = useCallback(async () => {
    const action = bulkConfirmAction
    const ids = bulkConfirmTargets
    setBulkConfirmVisible(false)
    const token = localStorage.getItem('token')

    try {
      if (action === 'delete') {
        const res = await fetch('/api/admin/bulk/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productIds: ids })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Bulk delete failed')
        showToast(`${data.deleted} products deleted`)
      } else {
        const is_hidden = action === 'hide'
        const res = await fetch('/api/admin/bulk/visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productIds: ids, is_hidden })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Bulk visibility update failed')
        showToast(`${data.updated} products ${is_hidden ? 'hidden' : 'shown'}`)
      }
      clearSelection()
      await loadProductsWithScrollPreserve()
    } catch (err) {
      console.error('Bulk action error:', err)
      showErrorToast(`Failed: ${err.message}`, () => executeBulkAction())
    }
  }, [bulkConfirmAction, bulkConfirmTargets, clearSelection, loadProductsWithScrollPreserve, showToast, showErrorToast])

  // ==================== PRODUCT CRUD ====================

  const editProduct = useCallback((product) => {
    setEditingProduct({ ...product })
    setEditProductErrors({})
    setActiveModal('editProdModal')
  }, [])

  const saveEditProduct = useCallback(async () => {
    if (!editingProduct) return

    const errors = {}
    if (!editingProduct.name || !editingProduct.name.trim()) {
      errors.name = 'Product name is required'
    } else if (editingProduct.name.trim().length > 255) {
      errors.name = 'Name must be 255 characters or less'
    }
    if (editingProduct.price !== '' && editingProduct.price !== null) {
      const price = parseFloat(editingProduct.price)
      if (isNaN(price) || price < 0.01) {
        errors.price = 'Price must be at least $0.01'
      }
    }
    if (Object.keys(errors).length > 0) {
      setEditProductErrors(errors)
      showToast('Please fix validation errors')
      return
    }

    setIsSavingEditProduct(true)
    try {
      const payload = {
        ...editingProduct,
        name: editingProduct.name.trim(),
        is_oos: Boolean(editingProduct.is_oos)
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        showToast('Not authorized - please log in again')
      } else if (response.status === 404) {
        showToast('Product not found')
      } else if (response.ok) {
        await loadProductsWithScrollPreserve()
        setActiveModal(null)
        setEditProductErrors({})
        showToast('Product updated')
        logActivity(`Updated product: ${editingProduct.name}`)
      } else {
        showToast((data.error || 'Failed to update product'))
      }
    } catch (e) {
      console.error('Save error:', e)
      showToast('Network error - check connection')
    } finally {
      setIsSavingEditProduct(false)
    }
  }, [editingProduct, loadProductsWithScrollPreserve, showToast, logActivity])

  const deleteProduct = useCallback(async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This cannot be undone.')) return
    setIsDeletingProduct(productId)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        showToast('Not authorized - please log in again')
      } else if (response.status === 404) {
        showToast('Product not found')
        await loadProductsWithScrollPreserve()
      } else if (response.ok) {
        await loadProductsWithScrollPreserve()
        showToast('Product deleted')
        logActivity('Deleted a product')
      } else {
        showToast((data.error || 'Failed to delete product'))
      }
    } catch (e) {
      console.error('Delete error:', e)
      showToast('Network error - check connection')
    } finally {
      setIsDeletingProduct(null)
    }
  }, [loadProductsWithScrollPreserve, showToast, logActivity])

  const toggleVisibility = useCallback(async (product) => {
    try {
      const newHiddenStatus = !product.is_hidden
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_hidden: newHiddenStatus })
      })

      if (response.ok) {
        await loadProductsWithScrollPreserve()
        showToast('Product visibility toggled')
        logActivity(`${newHiddenStatus ? 'Hidden' : 'Unhidden'}: ${product.name}`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Visibility toggle failed:', response.status, errorData)
        showErrorToast(`Failed to update (${response.status})`, () => toggleVisibility(product))
      }
    } catch (e) {
      console.error('Visibility toggle error:', e)
      showErrorToast('Failed to update visibility', () => toggleVisibility(product))
    }
  }, [loadProductsWithScrollPreserve, showToast, showErrorToast, logActivity])

  const toggleCategoryVisibility = useCallback(async (categoryName) => {
    try {
      const metadata = categoryMetadata[categoryName]
      if (!metadata || !metadata.id) {
        showToast('Category ID not found')
        return
      }

      const newHiddenStatus = !metadata.is_hidden
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/categories/${metadata.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_hidden: newHiddenStatus })
      })

      if (response.ok) {
        setCategoryMetadata(prev => ({
          ...prev,
          [categoryName]: { ...prev[categoryName], is_hidden: newHiddenStatus }
        }))
        showToast(newHiddenStatus ? 'Category Hidden' : 'Category Visible')
        logActivity(`${newHiddenStatus ? 'Hidden' : 'Unhidden'} category: ${categoryName}`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Category visibility toggle failed:', response.status, errorData)
        showToast(`Failed to update (${response.status})`)
      }
    } catch (e) {
      console.error('Category visibility toggle error:', e)
      showToast('Failed to update')
    }
  }, [categoryMetadata, showToast, logActivity])

  const toggleCategoryAllProductsVisibility = useCallback(async (catId, catName, isHide) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/categories/${catId}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_hidden: isHide })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      showToast(`${data.updated} products in "${catName}" ${isHide ? 'hidden' : 'shown'}`)
      await loadProducts()
    } catch (err) {
      showErrorToast(`Failed to update "${catName}": ${err.message}`, () => toggleCategoryAllProductsVisibility(catId, catName, isHide))
    }
  }, [loadProducts, showToast, showErrorToast])

  const toggleOosStatus = useCallback(async (product) => {
    try {
      const newOosStatus = !product.is_oos
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_oos: newOosStatus })
      })

      if (response.ok) {
        await loadProductsWithScrollPreserve()
        showToast(newOosStatus ? 'Out of Stock' : 'In Stock')
        logActivity(`Stock status updated: ${product.name} -> ${newOosStatus ? 'OOS' : 'In Stock'}`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('OOS toggle failed:', response.status, errorData)
        showToast(`Failed to update (${response.status})`)
      }
    } catch (e) {
      console.error('OOS toggle error:', e)
      showToast('Failed to update stock status')
    }
  }, [loadProductsWithScrollPreserve, showToast, logActivity])

  // ==================== IMAGE HANDLING ====================

  const processImageFile = useCallback((file) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Only JPG, PNG, or WebP images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be smaller than 5MB')
      return
    }
    setNewProductForm(prev => ({ ...prev, imageFile: file, image_url: '' }))
  }, [showToast])

  const handleImageDrop = useCallback((e) => {
    e.preventDefault()
    setIsDraggingImage(false)
    const files = e.dataTransfer.files
    if (files.length > 0) processImageFile(files[0])
  }, [processImageFile])

  const handleImageSelect = useCallback((e) => {
    const files = e.target.files
    if (files.length > 0) processImageFile(files[0])
  }, [processImageFile])

  const getImagePreview = useCallback(() => {
    if (newProductForm.imageFile) {
      return URL.createObjectURL(newProductForm.imageFile)
    }
    return ''
  }, [newProductForm.imageFile])

  const clearImage = useCallback(() => {
    setNewProductForm(prev => ({ ...prev, imageFile: null, image_url: '' }))
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = ''
    }
  }, [])

  // ==================== SAVE NEW PRODUCT ====================

  const saveNewProduct = useCallback(async () => {
    const errors = {}
    const f = newProductForm
    if (!f.name || !f.name.trim()) {
      errors.name = 'Product name is required'
    } else if (f.name.trim().length > 255) {
      errors.name = 'Name must be 255 characters or less'
    }
    if (!f.category_id) {
      errors.category_id = 'Category is required'
    }

    if (!superCategoriesList || superCategoriesList.length === 0) {
      errors.category_id = 'Categories are still loading. Please wait...'
    } else if (f.category_id) {
      let categoryFound = false
      for (const superCat of superCategoriesList) {
        const cats = categoriesBySuper[superCat.id] || []
        if (cats.some(c => c.id == f.category_id)) {
          categoryFound = true
          break
        }
      }
      if (!categoryFound) {
        errors.category_id = 'Selected category not found. Please reload categories.'
      }
    }

    if (f.price !== '' && f.price !== null && f.price !== undefined) {
      const price = parseFloat(f.price)
      if (isNaN(price) || price < 0.01) {
        errors.price = 'Price must be at least $0.01'
      }
    }
    if (f.cases_per_pallet !== '' && f.cases_per_pallet !== null && f.cases_per_pallet !== '') {
      const val = parseInt(f.cases_per_pallet)
      if (isNaN(val) || val < 1) {
        errors.cases_per_pallet = 'Cases per pallet must be a whole number >= 1'
      }
    }
    if (Object.keys(errors).length > 0) {
      setProductFormErrors(errors)
      showToast('Please fix validation errors')
      return
    }

    setIsSavingProduct(true)
    try {
      let imageUrl = f.image_url || null

      if (f.imageFile) {
        const formData = new FormData()
        formData.append('image', f.imageFile)

        const token = localStorage.getItem('token')
        const uploadResponse = await fetch('/api/products/upload-image', {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          imageUrl = uploadData.url
        } else {
          throw new Error('Failed to upload image')
        }
      }

      let super_category_id = null
      for (const superCat of superCategoriesList) {
        const cat = (categoriesBySuper[superCat.id] || []).find(c => c.id == f.category_id)
        if (cat) {
          super_category_id = superCat.id
          break
        }
      }

      const payload = {
        name: f.name.trim(),
        sku: f.sku ? String(f.sku).trim() : null,
        weight: f.weight ? String(f.weight).trim() : null,
        bags_per_case: f.bags_per_case ? parseInt(f.bags_per_case) : null,
        cases_per_pallet: f.cases_per_pallet ? parseInt(f.cases_per_pallet) : null,
        price: f.price ? parseFloat(f.price) : null,
        category_id: f.category_id,
        super_category_id: super_category_id,
        show_price: f.showPrice === true
      }

      if (imageUrl) {
        payload.image_url = imageUrl
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        showToast('Not authorized - please log in again')
      } else if (response.status === 409) {
        setProductFormErrors(prev => ({ ...prev, sku: data.error || 'SKU already exists' }))
        showToast((data.error || 'Duplicate entry'))
      } else if (response.status === 422) {
        if (data.errors) {
          setProductFormErrors(prev => ({ ...prev, ...data.errors }))
          const errorFields = Object.keys(data.errors).join(', ')
          showToast('Please fix: ' + errorFields)
        } else {
          showToast((data.error || 'Validation failed'))
        }
      } else if (response.ok) {
        await loadProducts()
        setActiveModal(null)
        setNewProductForm({ name: '', sku: '', weight: '', bags_per_case: '', cases_per_pallet: '', price: '', category_id: '', image_url: '', imageFile: null, showPrice: true })
        setProductFormErrors({})
        showToast('Product added')
        logActivity(`Added new product: ${payload.name}`)
      } else {
        showToast((data.error || 'Failed to add product'))
      }
    } catch (e) {
      console.error('Add error:', e)
      showToast((e.message || 'Network error - check connection'))
    } finally {
      setIsSavingProduct(false)
    }
  }, [newProductForm, superCategoriesList, categoriesBySuper, loadProducts, showToast, logActivity])

  // ==================== CUSTOMER MANAGEMENT ====================

  const selectCustomer = useCallback(async (cust) => {
    const initialized = {
      ...cust,
      catHidden: cust.catHidden ? [...cust.catHidden] : [],
      customHidden: cust.customHidden ? [...cust.customHidden] : [],
      customOos: cust.customOos ? [...cust.customOos] : []
    }
    setSelectedCustomer(initialized)
    setExpandedViewCats({})
    setCustomerViewMode('custom')
    // Load view overrides from API
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/customers/${cust.id}/view`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSelectedCustomer(prev => ({
            ...prev,
            catHidden: data.catHidden || [],
            customHidden: data.customHidden || [],
            customOos: data.customOos || [],
            showPrices: data.showPrices !== false
          }))
        }
      }
    } catch (e) { console.error('Failed to load customer view:', e) }
  }, [])

  const addCustomer = useCallback(async () => {
    const errors = {}
    const f = newCustomerForm
    if (!f.company_name || !f.company_name.trim()) {
      errors.company_name = 'Company name is required'
    } else if (f.company_name.trim().length > 255) {
      errors.company_name = 'Company name must be 255 characters or less'
    }
    if (!f.email || !f.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(f.email.trim())) {
        errors.email = 'Please enter a valid email address'
      }
    }
    if (f.phone && f.phone.trim()) {
      const phoneClean = f.phone.replace(/[\s\-\(\)\.]/g, '')
      if (phoneClean.length < 7 || phoneClean.length > 15 || !/^\+?\d+$/.test(phoneClean)) {
        errors.phone = 'Please enter a valid phone number'
      }
    }
    if (!f.preset) {
      errors.preset = 'View preset is required'
    }
    if (Object.keys(errors).length > 0) {
      setCustomerFormErrors(errors)
      showToast('Please fix validation errors')
      return
    }

    setIsSavingCustomer(true)
    try {
      const companyName = f.company_name.trim()
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          company_name: f.company_name.trim(),
          contact_name: f.contact_name ? f.contact_name.trim() : '',
          email: f.email.trim(),
          phone: f.phone ? f.phone.trim() : '',
          preset: f.preset
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        showToast('Not authorized - please log in again')
      } else if (response.status === 409) {
        setCustomerFormErrors(prev => ({ ...prev, email: data.error || 'Email already exists' }))
        showToast((data.error || 'Email already registered'))
      } else if (response.ok) {
        await loadCustomers()
        setActiveModal(null)
        setNewCustomerForm({ company_name: '', contact_name: '', email: '', phone: '', preset: 'full' })
        setCustomerFormErrors({})
        showToast('Customer added')
        logActivity(`Added customer: ${companyName}`)
      } else {
        showToast(`${data.error || 'Failed to add customer'}`)
      }
    } catch (e) {
      console.error('Add customer error:', e)
      showToast('Network error - check connection')
    } finally {
      setIsSavingCustomer(false)
    }
  }, [newCustomerForm, loadCustomers, showToast, logActivity])

  const saveCustomerView = useCallback(async () => {
    if (!selectedCustomer) return
    try {
      const token = localStorage.getItem('token')
      const catHiddenIds = (selectedCustomer.catHidden || []).map(name => {
        const sc = superCategoriesList.find(s => s.name === name)
        return sc ? sc.id : name
      }).filter(Boolean)
      const response = await fetch(`/api/admin/customers/${selectedCustomer.id}/view`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          catHidden: catHiddenIds,
          customHidden: selectedCustomer.customHidden || [],
          customOos: selectedCustomer.customOos || [],
          showPrices: selectedCustomer.showPrices !== false
        })
      })
      if (response.ok) {
        showToast('View saved')
        logActivity(`Updated view for: ${selectedCustomer.company_name}`)
      } else {
        const errData = await response.json().catch(() => ({}))
        showToast(`${errData.error || 'Failed to save view'}`)
      }
    } catch (e) {
      showToast('Saved locally (no connection)')
      logActivity(`Updated view for: ${selectedCustomer.company_name}`)
    }
  }, [selectedCustomer, superCategoriesList, showToast, logActivity])

  const applyViewPreset = useCallback((preset) => {
    if (!selectedCustomer) return
    setCustomerViewMode(preset)

    const ALL = [
      'Chips & Savory Snacks',
      'Noodles & Rice',
      'Cookies & Wafers',
      'Candy & Jelly',
      'Korean Snacks',
      'Beverages',
      'Ice Cream'
    ]

    if (preset === 'full') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: [], customHidden: [] }))
      showToast('Full catalog restored')
    } else if (preset === 'chips') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Chips & Savory Snacks') }))
      showToast('Chips preset applied')
    } else if (preset === 'noodles') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Noodles & Rice') }))
      showToast('Noodles preset applied')
    } else if (preset === 'korean') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Korean Snacks') }))
      showToast('Korean preset applied')
    } else if (preset === 'icecream') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Ice Cream') }))
      showToast('Ice Cream preset applied')
    } else if (preset === 'custom') {
      showToast('Custom mode - adjust manually')
    }
  }, [selectedCustomer, showToast])

  const toggleCatExpand = useCallback((superCat) => {
    setExpandedViewCats(prev => ({ ...prev, [superCat]: !prev[superCat] }))
  }, [])

  const isCatHiddenForCust = useCallback((superCat) => {
    return selectedCustomer?.catHidden?.includes(superCat) || false
  }, [selectedCustomer])

  const toggleCatVisForCust = useCallback((superCat) => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => {
      const arr = prev.catHidden || []
      const idx = arr.indexOf(superCat)
      const newArr = idx >= 0 ? arr.filter(c => c !== superCat) : [...arr, superCat]
      return { ...prev, catHidden: newArr }
    })
    setCustomerViewMode('custom')
  }, [selectedCustomer])

  const hideAllForCust = useCallback(() => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => ({ ...prev, catHidden: [...superCatNames] }))
    setCustomerViewMode('custom')
    showToast('All categories hidden for this customer')
  }, [selectedCustomer, superCatNames, showToast])

  const showAllForCust = useCallback(() => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => ({ ...prev, catHidden: [], customHidden: [] }))
    setCustomerViewMode('full')
    showToast('Full catalog restored')
  }, [selectedCustomer, showToast])

  const showOnlyForCust = useCallback((superCat) => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => ({
      ...prev,
      catHidden: superCatNames.filter(c => c !== superCat),
      customHidden: []
    }))
    setCustomerViewMode('custom')
    showToast(`Only showing: ${superCat}`)
  }, [selectedCustomer, superCatNames, showToast])

  const resetCustomerView = useCallback(() => {
    if (!selectedCustomer) return
    if (!window.confirm(`Reset all visibility settings for ${selectedCustomer.company_name}?`)) return
    setSelectedCustomer(prev => ({ ...prev, catHidden: [], customHidden: [], customOos: [] }))
    setCustomerViewMode('full')
    showToast('View reset - full catalog')
  }, [selectedCustomer, showToast])

  const isProductVisibleForCustomer = useCallback((productId) => {
    if (!selectedCustomer) return true
    return !(selectedCustomer.customHidden?.includes(productId))
  }, [selectedCustomer])

  const toggleProductForCustomer = useCallback((productId) => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => {
      const arr = prev.customHidden || []
      const idx = arr.indexOf(productId)
      const newArr = idx >= 0 ? arr.filter(id => id !== productId) : [...arr, productId]
      return { ...prev, customHidden: newArr }
    })
    setCustomerViewMode('custom')
  }, [selectedCustomer])

  const isProductOosForCustomer = useCallback((productId) => {
    return selectedCustomer?.customOos?.includes(productId) || false
  }, [selectedCustomer])

  const toggleOosForCustomer = useCallback((productId) => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => {
      const arr = prev.customOos || []
      const idx = arr.indexOf(productId)
      const newArr = idx >= 0 ? arr.filter(id => id !== productId) : [...arr, productId]
      return { ...prev, customOos: newArr }
    })
  }, [selectedCustomer])

  // ==================== ORDERS ====================

  const setOrderFilterCb = useCallback((filter) => {
    setOrderFilter(filter)
  }, [])

  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        showToast('Order status updated')
        logActivity(`Updated order ${orderId} to ${newStatus}`)
      } else {
        showToast('Failed to update order status')
      }
    } catch (e) {
      console.error('Update order error:', e)
      showToast('Error updating order')
    }
  }, [showToast, logActivity])

  // ==================== SETTINGS ====================

  const toggleRegistration = useCallback(async () => {
    const newVal = !registrationEnabled
    setRegistrationEnabled(newVal)
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/settings/allow_registration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ value: newVal ? 'true' : 'false' })
      })
      showToast(newVal ? 'Registration enabled' : 'Registration disabled')
    } catch (e) {
      showToast(newVal ? 'Registration enabled (local)' : 'Registration disabled (local)')
    }
  }, [registrationEnabled, showToast])

  const togglePriceVisibility = useCallback(async () => {
    const newVal = !priceVisibility
    setPriceVisibility(newVal)
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/settings/show_prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ value: newVal ? 'true' : 'false' })
      })
      showToast(newVal ? 'Prices visible to customers' : 'Prices hidden from customers')
    } catch (e) { showToast('Failed to update setting') }
  }, [priceVisibility, showToast])

  const savePromoBanner = useCallback(async (banner) => {
    setPromoBanner(banner)
    const jsonValue = JSON.stringify(banner)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not logged in')
      const res = await fetch('/api/settings/promo_banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ value: jsonValue })
      })
      if (!res.ok) {
        const errData = await res.text()
        throw new Error(`HTTP ${res.status}: ${errData}`)
      }
      showToast(`${banner.type === 'image' ? 'Image' : 'Text'} banner ${banner.enabled ? 'saved & enabled' : 'disabled'}`)
    } catch (e) {
      console.error('Banner save error:', e)
      showToast('Save failed: ' + e.message, 'error')
    }
  }, [showToast])

  const uploadBannerImage = useCallback(async (file) => {
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData(); fd.append('image', file);
      const res = await fetch('/api/admin/banner', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Upload failed') }
      const data = await res.json();
      return data.url;
    } catch (err) { showToast('Failed to upload: ' + err.message, 'error'); return null }
  }, [showToast])

  const removeBannerImage = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/admin/banner', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setPromoBanner(p => ({ ...p, imageUrl: '' }));
      showToast('Banner image removed');
    } catch (err) { showToast('Failed to remove image', 'error') }
  }, [showToast])

  const downloadExcel = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/products/excel', { headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `products-${new Date().toISOString().split('T')[0]}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      showToast('Excel downloaded')
    } catch (e) { showToast('Download failed: ' + e.message, 'error') }
  }, [showToast])

  const runImport = useCallback(async () => {
    if (!importExcelFile) { showToast('Please select an Excel file', 'error'); return }
    setExcelUploading(true); setExcelResult(null); setImportProgress('Uploading images...')
    try {
      const token = localStorage.getItem('token')
      // Step 1: Upload all image files and build a filename→URL map
      const imageMap = {}
      if (importImageFiles.length > 0) {
        for (let i = 0; i < importImageFiles.length; i++) {
          const img = importImageFiles[i]
          setImportProgress(`Uploading image ${i + 1}/${importImageFiles.length}: ${img.name}`)
          const fd = new FormData(); fd.append('image', img)
          const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
          if (res.ok) {
            const data = await res.json()
            // Map by full name and name without extension
            imageMap[img.name.toLowerCase()] = data.url
            const nameNoExt = img.name.replace(/\.[^.]+$/, '').toLowerCase()
            imageMap[nameNoExt] = data.url
          }
        }
      }

      // Step 2: Upload Excel with the image URL map
      setImportProgress('Processing Excel...')
      const fd = new FormData()
      fd.append('file', importExcelFile)
      fd.append('imageMap', JSON.stringify(imageMap))
      const res = await fetch('/api/admin/products/excel', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setExcelResult(data)
      showToast(`Imported: ${data.created} created, ${data.updated} updated`)
      setImportModalOpen(false); setImportExcelFile(null); setImportImageFiles([])
      loadProducts(1)
    } catch (e) { showToast('Import failed: ' + e.message, 'error') }
    finally { setExcelUploading(false); setImportProgress('') }
  }, [importExcelFile, importImageFiles, showToast])

  useEffect(() => {
    try { localStorage.setItem('admin_views_zoom', String(viewsZoom)); } catch(e) {}
  }, [viewsZoom])

  const clearActivityLog = useCallback(() => {
    if (window.confirm('Clear all activity logs?')) {
      setActivityLog([])
      showToast('Log cleared')
    }
  }, [showToast])

  // ==================== MODAL & UI ====================

  const openModal = useCallback((modal) => {
    setActiveModal(modal)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  const logout = useCallback(() => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
      localStorage.removeItem('authToken')
      localStorage.removeItem('userInfo')
      window.location.href = '/login'
    }
  }, [onLogout])

  // ==================== RENDER HELPERS ====================

  const renderActivityIcon = (log) => {
    const iconMap = {
      key: <Key className="w-4 h-4" />,
      heart: <Heart className="w-4 h-4" />,
      settings: <Settings className="w-4 h-4" />,
    }
    return iconMap[log.icon] || <Settings className="w-4 h-4" />
  }

  const renderPaginationButtons = () => {
    const buttons = []
    for (let p = 1; p <= paginationPages; p++) {
      if (Math.abs(p - paginationPage) <= 2 || p === 1 || p === paginationPages) {
        buttons.push(
          <button
            key={p}
            className={`min-w-[32px] px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-all ${p === paginationPage ? 'bg-indigo-500 border-indigo-500 text-white font-semibold' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`}
            onClick={() => changePage(p)}
          >{p}</button>
        )
      } else if (p === paginationPage - 3 || p === paginationPage + 3) {
        buttons.push(<span key={`e${p}`} className="px-1 text-slate-400"><MoreHorizontal className="w-4 h-4 inline" /></span>)
      }
    }
    return buttons
  }

  // ==================== RENDER ====================

  const pendingCount = pendingRegistrations.filter(r => r.status === 'pending').length
  const pendingOrderCount = orders.filter(o => (o.status || '').toLowerCase() === 'pending').length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* NAV */}
      <nav className="bg-white border-b border-slate-200 px-5 h-14 max-sm:h-12 grid grid-cols-[auto_1fr_auto] max-sm:grid-cols-[auto_1fr] items-center gap-3 max-sm:gap-1.5 sticky top-0 z-[300] max-sm:fixed max-sm:left-0 max-sm:right-0 max-sm:z-[1000] max-sm:px-2.5 shadow-sm">
        <div className="flex items-center gap-2.5 max-sm:gap-1.5">
          <button className={`w-[34px] h-[34px] border-none bg-transparent cursor-pointer flex flex-col gap-1 items-center justify-center rounded-lg transition-colors hover:bg-slate-100`} onClick={toggleSidebar}>
            <span className={`block w-[18px] h-0.5 bg-slate-500 rounded-sm transition-all ${sidebarOpen ? 'translate-y-[6px] rotate-45 !bg-indigo-500' : ''}`}></span>
            <span className={`block w-[18px] h-0.5 bg-slate-500 rounded-sm transition-all ${sidebarOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-[18px] h-0.5 bg-slate-500 rounded-sm transition-all ${sidebarOpen ? '-translate-y-[6px] -rotate-45 !bg-indigo-500' : ''}`}></span>
          </button>
          <div className="flex items-center gap-2 max-sm:gap-1">
            <div className="w-[30px] h-[30px] max-sm:w-7 max-sm:h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base max-sm:text-sm text-slate-800"><span className="text-indigo-500">DR</span> Prepper</span>
          </div>
          <span className="bg-indigo-50 border border-indigo-200 text-indigo-500 text-[10px] max-sm:text-[8px] font-semibold tracking-wider uppercase px-2.5 max-sm:px-1.5 py-0.5 rounded-full">Admin</span>
        </div>
        <div className="flex items-center justify-center max-sm:!hidden">
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-[3px] border border-slate-200">
            <button className={`px-3.5 py-1.5 rounded-md border-none text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap ${activePage === 'catalog' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`} onClick={() => showPage('catalog')}><Package className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Catalog</button>
            <button className={`px-3.5 py-1.5 rounded-md border-none text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap ${activePage === 'bulk-edit' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`} onClick={() => showPage('bulk-edit')}><Zap className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Bulk Edit</button>
            <button className={`px-3.5 py-1.5 rounded-md border-none text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap ${activePage === 'views' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`} onClick={() => showPage('views')}><Users className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Customer Views</button>
            <button className={`px-3.5 py-1.5 rounded-md border-none text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap relative ${activePage === 'orders' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`} onClick={() => showPage('orders')}><ClipboardList className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Orders{pendingOrderCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-px rounded-full ml-1 min-w-[16px] text-center inline-block leading-4">{pendingOrderCount}</span>}</button>
            <button className={`px-3.5 py-1.5 rounded-md border-none text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap ${activePage === 'categories' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`} onClick={() => showPage('categories')}><FolderOpen className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Categories</button>
            <button className={`px-3.5 py-1.5 rounded-md border-none text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap relative ${activePage === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`} onClick={() => showPage('settings')}><Settings className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Settings{pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-px rounded-full ml-1 min-w-[16px] text-center inline-block leading-4">{pendingCount}</span>}</button>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="relative">
            <div className="flex items-center gap-2 cursor-pointer p-1 px-2 rounded-lg transition-colors hover:bg-slate-100" onClick={() => setAdminMenuOpen(!adminMenuOpen)}>
              <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">{(currentUser?.email || 'A').charAt(0).toUpperCase()}</div>
              <span className="text-[13px] font-medium text-slate-800 max-sm:hidden">{currentUser?.companyName || currentUser?.email || 'Admin'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 max-sm:hidden" />
            </div>
            {adminMenuOpen && (
              <>
                <div className="fixed inset-0 z-[999]" onClick={() => setAdminMenuOpen(false)}></div>
                <div className="absolute top-11 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-[1000] min-w-[200px] overflow-hidden animate-[popIn_0.15s_ease]">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-800">{currentUser?.companyName || 'DR Prepper'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{currentUser?.email || 'admin'}</div>
                  </div>
                  {onSwitchToCustomer && <button className="flex items-center gap-2 w-full px-4 py-2.5 border-none bg-transparent text-[13px] text-slate-800 cursor-pointer transition-colors hover:bg-slate-50" onClick={() => { onSwitchToCustomer(); setAdminMenuOpen(false); }}><Users className="w-4 h-4" /> Customer View</button>}
                  <button className="items-center gap-2 w-full px-4 py-2.5 border-none bg-transparent text-[13px] text-slate-800 cursor-pointer transition-colors hover:bg-slate-50 hidden max-sm:!flex" onClick={() => { showPage('settings'); setAdminMenuOpen(false); }}><Settings className="w-4 h-4" /> Settings{pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-px rounded-full ml-1">{pendingCount}</span>}</button>
                  <div className="h-px bg-slate-200"></div>
                  <div className="flex items-center justify-between px-4 py-2 text-[13px] text-slate-800" onClick={e => e.stopPropagation()}>
                    <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> Zoom</span>
                    <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-md p-0.5">
                      <button className="w-6 h-6 border-none bg-transparent cursor-pointer text-sm font-semibold text-slate-500 rounded flex items-center justify-center transition-all hover:bg-white hover:text-indigo-500" onClick={() => setViewsZoom(prev => Math.max(70, prev - 10))}>-</button>
                      <span className="text-[10px] text-slate-400 min-w-[32px] text-center font-medium">{viewsZoom}%</span>
                      <button className="w-6 h-6 border-none bg-transparent cursor-pointer text-sm font-semibold text-slate-500 rounded flex items-center justify-center transition-all hover:bg-white hover:text-indigo-500" onClick={() => setViewsZoom(prev => Math.min(150, prev + 10))}>+</button>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200"></div>
                  <button className="flex items-center gap-2 w-full px-4 py-2.5 border-none bg-transparent text-[13px] text-red-500 cursor-pointer transition-colors hover:bg-slate-50" onClick={logout}><LogOut className="w-4 h-4" /> Sign out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ========== CATALOG PAGE ========== */}
      <div className={`${activePage === 'catalog' ? 'flex flex-col' : 'hidden'} flex-1 min-h-0 overflow-hidden max-sm:mt-12 max-sm:pb-[60px] max-sm:overflow-y-auto`} style={{ zoom: viewsZoom / 100 }}>
        <div className="flex flex-1 min-h-0 overflow-hidden max-sm:flex-col max-sm:overflow-x-hidden">
          {/* Sidebar overlay */}
          <div className={`fixed inset-0 bg-black/20 z-[150] top-14 max-sm:top-12 ${sidebarOpen ? 'max-sm:block' : ''} hidden`} onClick={closeSidebar}></div>
          {/* Sidebar */}
          <aside className={`w-[236px] min-w-[236px] bg-white border-r border-slate-200 overflow-y-auto h-[calc(100vh-56px)] sticky top-14 transition-all duration-300 z-[160] flex-shrink-0 max-sm:fixed max-sm:left-0 max-sm:top-12 max-sm:bottom-[60px] max-sm:h-auto max-sm:w-[240px] max-sm:min-w-0 max-sm:z-[160] max-sm:overflow-y-auto max-sm:overscroll-contain ${!sidebarOpen ? '-ml-[236px] max-sm:!ml-0 max-sm:-translate-x-[242px]' : 'max-sm:translate-x-0 max-sm:shadow-xl'}`}>
            <div className="px-3.5 pt-3.5 pb-1.5">
              <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-2">Categories</div>
            </div>
            <div className="px-2.5 pb-2.5">
              <input type="text" placeholder="Search..." value={sidebarFilter} onChange={e => setSidebarFilter(e.target.value)} className="w-full py-[7px] px-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[13px] outline-none focus:border-indigo-400 placeholder:text-slate-400 box-border" />
            </div>
            <div className={`flex items-center gap-2.5 px-3.5 py-3.5 cursor-pointer text-sm font-medium transition-all border-b border-slate-200 ${currentFilter === 'all' ? 'text-indigo-500 bg-indigo-50' : 'text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800'}`} onClick={() => { setFilter('all'); loadProducts(1); }}>
              <Package className="w-3.5 h-3.5" /> All Products
              <span className="ml-auto text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{products.length}</span>
            </div>
            <div className="h-px bg-slate-200"></div>

            {superCategoriesList.filter(sc => !sidebarFilter || sc.name.toLowerCase().includes(sidebarFilter.toLowerCase()) || (categoriesBySuper[sc.id] || []).some(c => c.name.toLowerCase().includes(sidebarFilter.toLowerCase()))).map(superCat => (
              <React.Fragment key={superCat.id}>
                <button
                  className={`w-full flex items-center gap-2.5 px-3.5 py-3.5 border-none cursor-pointer text-sm font-medium text-left transition-all border-b border-slate-200 ${currentFilter === `super:${superCat.name}` ? 'text-indigo-500 bg-indigo-50' : 'text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800'}`}
                  onClick={() => toggleSuperCat(superCat.name)}
                >
                  <span className="text-base w-5 text-center flex-shrink-0">{getSuperCategoryEmoji(superCat.name)}</span>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{superCat.name}</span>
                  <span className="text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{products.filter(p => p.super_category_id === superCat.id).length}</span>
                  <ChevronRight className={`w-2.5 h-2.5 text-slate-300 transition-transform flex-shrink-0 ${expandedSuperCats[superCat.name] ? 'rotate-90' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedSuperCats[superCat.name] ? 'max-h-[700px]' : 'max-h-0'}`}>
                  {(categoriesBySuper[superCat.id] || []).filter(c => !sidebarFilter || c.name.toLowerCase().includes(sidebarFilter.toLowerCase())).map(cat => (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 pl-11 cursor-pointer text-[13px] transition-all border-b border-slate-100 ${currentFilter === `cat:${cat.name}` ? 'text-indigo-500 bg-indigo-50 font-medium' : 'text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-800'}`}
                      onClick={() => { setFilter('cat', cat.name); loadProducts(1); }}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[11px] text-slate-400">{products.filter(p => p.category_id === cat.id).length}</span>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            ))}

            <div className="h-px bg-slate-200"></div>
            <div className={`flex items-center justify-between px-3.5 py-2 cursor-pointer text-xs transition-all ${currentFilter === 'hidden' ? 'text-indigo-500 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`} onClick={() => { setFilter('hidden'); loadProducts(1); }}>
              <span className="flex items-center gap-1.5"><Ban className="w-3.5 h-3.5" /> Hidden</span>
              <span className="text-[10px] bg-slate-50 px-1.5 py-px rounded-full border border-slate-200">{hiddenCount}</span>
            </div>
            <div className={`flex items-center justify-between px-3.5 py-2 cursor-pointer text-xs transition-all ${currentFilter === 'oos' ? 'text-indigo-500 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`} onClick={() => { setFilter('oos'); loadProducts(1); }}>
              <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Out of Stock</span>
              <span className="text-[10px] bg-slate-50 px-1.5 py-px rounded-full border border-slate-200">{oosCount}</span>
            </div>
          </aside>

          <div className="flex-1 p-5 px-6 max-sm:p-3 overflow-y-auto min-w-0 max-sm:w-full max-sm:max-w-[100vw] max-sm:overflow-x-hidden max-sm:box-border" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>

            {/* Excel Import Result */}
            {excelResult && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 mb-1">Excel Import Complete</div>
                  <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                    <span><span className="font-semibold text-emerald-600">{excelResult.created}</span> created</span>
                    <span><span className="font-semibold text-indigo-600">{excelResult.updated}</span> updated</span>
                    {excelResult.skipped > 0 && <span><span className="font-semibold text-amber-600">{excelResult.skipped}</span> skipped</span>}
                  </div>
                  {excelResult.errors?.length > 0 && (
                    <div className="mt-2 text-[11px] text-red-500 max-h-[60px] overflow-y-auto">
                      {excelResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                  )}
                </div>
                <button onClick={() => setExcelResult(null)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-3 mb-5 max-sm:mb-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm">
                <div className="w-9 h-9 max-sm:w-7 max-sm:h-7 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 max-sm:mb-2">
                  <Boxes className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5 text-indigo-500" />
                </div>
                <div className="text-2xl max-sm:text-xl font-bold text-slate-800">{products.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">Total Products</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm">
                <div className="w-9 h-9 max-sm:w-7 max-sm:h-7 rounded-lg bg-amber-50 flex items-center justify-center mb-3 max-sm:mb-2">
                  <ClipboardList className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl max-sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  {pendingOrderCount}
                  {pendingOrderCount > 0 && <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{pendingOrderCount} new</span>}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Pending Orders</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm">
                <div className="w-9 h-9 max-sm:w-7 max-sm:h-7 rounded-lg bg-emerald-50 flex items-center justify-center mb-3 max-sm:mb-2">
                  <CheckCircle2 className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl max-sm:text-xl font-bold text-slate-800">{inStockCount}</div>
                <div className="text-xs text-slate-400 mt-0.5">In Stock</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm">
                <div className="w-9 h-9 max-sm:w-7 max-sm:h-7 rounded-lg bg-rose-50 flex items-center justify-center mb-3 max-sm:mb-2">
                  <Star className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5 text-rose-400" />
                </div>
                <div className="text-2xl max-sm:text-xl font-bold text-slate-800">{newThisWeekCount}</div>
                <div className="text-xs text-slate-400 mt-0.5">New This Week</div>
              </div>
            </div>

            {/* Title + Search + Add */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:mb-3">
              <div>
                <h2 className="text-xl max-sm:text-lg font-bold text-slate-800 m-0">{filterTitle}</h2>
                <p className="text-xs text-slate-400 mt-0.5 m-0">Showing {products.length} items across all categories</p>
              </div>
              <div className="flex items-center gap-2 max-sm:flex-col max-sm:gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3 bg-white border border-slate-200 rounded-lg shadow-sm h-9 max-sm:w-full">
                  <Search className="w-3.5 h-3.5 text-slate-300" />
                  <input type="text" placeholder="Search products, SKUs, ID..." value={searchQuery} onChange={onSearchInput} className="border-none bg-transparent outline-none text-[13px] text-slate-800 w-[170px] max-sm:w-full placeholder:text-slate-300" />
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-semibold text-[12px] cursor-pointer transition-all hover:border-indigo-300 hover:text-indigo-500 whitespace-nowrap h-9 flex items-center gap-1.5" onClick={downloadExcel} title="Download all products as Excel">
                    <Download className="w-3.5 h-3.5" /> <span className="max-sm:hidden">Export</span>
                  </button>
                  <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-semibold text-[12px] cursor-pointer transition-all hover:border-indigo-300 hover:text-indigo-500 whitespace-nowrap h-9 flex items-center gap-1.5"
                    onClick={() => setImportModalOpen(true)} title="Import products from Excel">
                    <Upload className="w-3.5 h-3.5" /> <span className="max-sm:hidden">Import</span>
                  </button>
                </div>
                <button className="px-4 py-2 bg-indigo-500 border-none rounded-lg text-white font-semibold text-[13px] cursor-pointer transition-all hover:bg-indigo-600 whitespace-nowrap h-9 max-sm:w-full max-sm:py-3" onClick={() => openModal('addProdModal')}><Plus className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Add Product</button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap p-2.5 px-4 bg-white border-b border-slate-200 mb-4 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Visibility:</span>
              <button className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${visibilityFilter === 'all' ? 'bg-indigo-500 border-indigo-500 text-white font-semibold' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => handleVisibilityFilter('all')}>All</button>
              <button className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${visibilityFilter === 'visible' ? 'bg-indigo-500 border-indigo-500 text-white font-semibold' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => handleVisibilityFilter('visible')}>Visible</button>
              <button className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${visibilityFilter === 'hidden' ? 'bg-indigo-500 border-indigo-500 text-white font-semibold' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => handleVisibilityFilter('hidden')}>Hidden</button>
              <span className="text-slate-200 text-sm mx-0.5">|</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Stock:</span>
              <button className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${stockFilter === 'all' ? 'bg-indigo-500 border-indigo-500 text-white font-semibold' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => handleStockFilter('all')}>All</button>
              <button className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${stockFilter === 'in-stock' ? 'bg-indigo-500 border-indigo-500 text-white font-semibold' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => handleStockFilter('in-stock')}>In Stock</button>
              <button className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${stockFilter === 'oos' ? 'bg-indigo-500 border-indigo-500 text-white font-semibold' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => handleStockFilter('oos')}>OOS</button>
              {superCatNames.length > 0 && <span className="text-slate-200 text-sm mx-0.5">|</span>}
              {superCatNames.map(sc => (
                <button key={sc} className={`px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all whitespace-nowrap capitalize ${superCatFilter === sc ? 'bg-emerald-500 border-emerald-500 text-white font-semibold' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => handleSuperCatFilter(superCatFilter === sc ? '' : sc)}>{sc}</button>
              ))}
            </div>

            {/* Bulk Action Bar */}
            {selectedProductCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 px-4 bg-amber-50 border-b-2 border-amber-300 sticky top-0 z-[100] mb-4 rounded-lg">
                <span className="text-[13px] font-semibold text-amber-600 mr-1">{selectedProductCount} selected</span>
                <button className="px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 text-xs font-semibold cursor-pointer transition-all hover:bg-emerald-100" onClick={() => startBulkAction('show')}><Eye className="w-3 h-3 inline mr-1 -mt-px" /> Show all</button>
                <button className="px-3.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 text-xs font-semibold cursor-pointer transition-all hover:bg-red-100" onClick={() => startBulkAction('hide')}><Ban className="w-3 h-3 inline mr-1 -mt-px" /> Hide all</button>
                <button className="px-3.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 text-xs font-semibold cursor-pointer transition-all hover:bg-red-100" onClick={() => startBulkAction('delete')}><Trash2 className="w-3 h-3 inline mr-1 -mt-px" /> Delete all</button>
                <button className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold cursor-pointer transition-all hover:text-slate-800 ml-auto" onClick={clearSelection}><X className="w-3 h-3 inline mr-1 -mt-px" /> Clear</button>
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center gap-3.5 py-20 text-slate-400 text-sm">
                <div className="w-9 h-9 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                <span>Loading products...</span>
              </div>
            )}

            <div className="flex flex-col gap-6" style={{ display: isLoading ? 'none' : 'flex' }}>
              {/* No results state */}
              {!isLoading && products.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                  <Search className="w-10 h-10 text-slate-300 mb-1" />
                  <div className="text-lg font-bold text-slate-800">No products found</div>
                  <div className="text-sm text-slate-400">Try adjusting your search or filters</div>
                  <button className="mt-3 px-5 py-2 bg-indigo-500 text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-indigo-600" onClick={() => {
                    setSearchQuery('')
                    setVisibilityFilter('all')
                    setStockFilter('all')
                    setSuperCatFilter('')
                    loadProducts(1)
                  }}>Clear filters</button>
                </div>
              )}

              {/* Super Category Loop */}
              {Object.entries(groupedProducts).map(([superCat, superCatData]) => (
                <div key={superCat} className="mb-10 border-b-2 border-slate-200 pb-8">
                  <div className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-3">
                    <span className="uppercase tracking-wide">{superCat}</span>
                    <span className="inline-block bg-indigo-500 text-white font-semibold px-2.5 py-1 rounded-xl text-xs ml-auto">{superCatData.total}</span>
                  </div>

                  {Object.entries(superCatData.categories).map(([catName, catProds]) => (
                    <div key={catName} className="mb-7">
                      <div className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-slate-200">
                        <label className="inline-flex items-center cursor-pointer mr-1" title={isCategoryAllSelected(catProds) ? 'Deselect all' : 'Select all'}>
                          <input
                            type="checkbox"
                            checked={isCategoryAllSelected(catProds)}
                            ref={el => {
                              if (el) el.indeterminate = isCategoryPartialSelected(catProds)
                            }}
                            onChange={() => toggleAllInCategory(catProds)}
                            className="cursor-pointer accent-indigo-500 w-3.5 h-3.5"
                          />
                        </label>
                        {catName}
                        <span className="bg-slate-50 border border-slate-200 text-slate-400 text-[10px] px-[7px] py-px rounded-full font-medium tracking-normal">{catProds.length}</span>
                        {categoryMetadata[catName] && (
                          <button
                            className="bg-transparent border-none cursor-pointer text-xs p-1 px-1.5 rounded transition-all text-slate-400 hover:bg-slate-200 hover:text-slate-800 ml-auto"
                            onClick={() => toggleCategoryVisibility(catName)}
                            title={categoryMetadata[catName].is_hidden ? 'Show category' : 'Hide category'}
                          >
                            {categoryMetadata[catName].is_hidden ? <Ban className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {categoryMetadata[catName] && (
                          <>
                            <button className="ml-1.5 px-2.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-medium cursor-pointer transition-all hover:border-indigo-300 hover:text-slate-800" onClick={() => toggleCategoryAllProductsVisibility(categoryMetadata[catName].id, catName, true)} title="Hide all products in this category">Hide all</button>
                            <button className="px-2.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-medium cursor-pointer transition-all hover:border-indigo-300 hover:text-slate-800" onClick={() => toggleCategoryAllProductsVisibility(categoryMetadata[catName].id, catName, false)} title="Show all products in this category">Show all</button>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] max-sm:grid-cols-2 gap-2.5 max-sm:gap-2">
                        {catProds.map(prod => (
                          <div key={prod.id} className={`bg-white border-[1.5px] rounded-xl p-3 max-sm:p-2 relative transition-all shadow-sm hover:border-indigo-300 hover:shadow-md ${prod.is_hidden ? 'opacity-50 border-dashed border-slate-300 bg-slate-50' : 'border-slate-200'} ${prod.is_oos ? '!border-amber-300' : ''} ${selectedProducts[prod.id] ? 'outline-2 outline-indigo-500 outline-offset-[-2px] !bg-indigo-50' : ''}`}>
                            <div className="flex items-center gap-2 mb-2 max-sm:gap-1 max-sm:mb-1">
                              <label className="flex items-center cursor-pointer flex-shrink-0 m-0 p-0 leading-none">
                                <input type="checkbox" checked={!!selectedProducts[prod.id]} onChange={() => toggleProductSelect(prod.id)} className="w-4 h-4 cursor-pointer accent-indigo-500 m-0" />
                              </label>
                              <div className="flex gap-1 flex-wrap items-center">
                                {prod.is_hidden && <div className="px-[7px] py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase bg-slate-50 text-slate-400 border border-slate-200">Hidden</div>}
                                {prod.is_oos && <div className="px-[7px] py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase bg-amber-100 text-amber-600 border border-amber-200">OOS</div>}
                                {!prod.is_hidden && <div className="px-[7px] py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-600 border border-emerald-200">Visible</div>}
                              </div>
                            </div>
                            <img src={prod.image_url} className="w-20 h-20 max-sm:h-[100px] object-contain rounded-lg bg-white block mx-auto mb-2.5 border border-slate-100" alt={prod.name} />
                            <div className="flex-1 flex flex-col gap-1.5">
                              <div className="text-[11px] max-sm:text-xs text-slate-800 font-medium leading-snug h-[30px] overflow-hidden mb-0.5">{prod.name}</div>
                              <div className="text-[10px] max-sm:text-[9px] text-slate-400 mb-0.5">{prod.category}</div>
                              <div className="text-[10px] max-sm:text-[9px] text-slate-300 font-mono mb-2.5">{prod.sku || 'N/A'}</div>
                              <div className="flex gap-[5px] max-sm:gap-[3px] flex-wrap">
                                <button className="flex-1 min-w-[46px] py-[5px] px-[3px] rounded-md border border-slate-200 bg-transparent text-slate-500 text-[10px] max-sm:text-[9px] font-medium cursor-pointer transition-all text-center whitespace-nowrap hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50" onClick={() => editProduct(prod)} disabled={isDeletingProduct === prod.id}><Pencil className="w-2.5 h-2.5 inline -mt-px" /></button>
                                <button className="flex-1 min-w-[46px] py-[5px] px-[3px] rounded-md border border-slate-200 bg-transparent text-slate-500 text-[10px] max-sm:text-[9px] font-medium cursor-pointer transition-all text-center whitespace-nowrap hover:border-red-300 hover:text-red-500 hover:bg-red-50" onClick={() => deleteProduct(prod.id)} disabled={isDeletingProduct === prod.id}>
                                  {isDeletingProduct === prod.id ? <MoreHorizontal className="w-3 h-3 inline animate-pulse" /> : <Trash2 className="w-2.5 h-2.5 inline -mt-px" />}
                                </button>
                                <button className="flex-1 min-w-[46px] py-[5px] px-[3px] rounded-md border border-slate-200 bg-transparent text-slate-500 text-[10px] max-sm:text-[9px] font-medium cursor-pointer transition-all text-center whitespace-nowrap hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50" onClick={() => toggleVisibility(prod)} title="Toggle visibility" disabled={isDeletingProduct === prod.id}>{prod.is_hidden ? <Eye className="w-2.5 h-2.5 inline -mt-px" /> : <Ban className="w-2.5 h-2.5 inline -mt-px" />}</button>
                                <button className={`flex-1 min-w-[46px] py-[5px] px-[3px] rounded-md border text-[10px] max-sm:text-[9px] font-medium cursor-pointer transition-all text-center whitespace-nowrap ${prod.is_oos ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-slate-200 bg-transparent text-slate-500 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50'}`} onClick={() => toggleOosStatus(prod)} title="Toggle out of stock" disabled={isDeletingProduct === prod.id}>{prod.is_oos ? <AlertTriangle className="w-2.5 h-2.5 inline -mt-px" /> : <Check className="w-2.5 h-2.5 inline -mt-px" />}</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Pagination Controls */}
              {paginationLimit > 0 && paginationTotal > paginationLimit && (
                <div className="flex items-center justify-between gap-3 p-4 px-5 border-t border-slate-200 flex-wrap">
                  <span className="text-[13px] text-slate-500">{paginationInfo}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button className="min-w-[32px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-[13px] cursor-pointer transition-all hover:border-indigo-300 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed" disabled={paginationPage <= 1} onClick={() => changePage(paginationPage - 1)}><ChevronLeft className="w-3 h-3 inline" /> Prev</button>
                    {renderPaginationButtons()}
                    <button className="min-w-[32px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-[13px] cursor-pointer transition-all hover:border-indigo-300 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed" disabled={paginationPage >= paginationPages} onClick={() => changePage(paginationPage + 1)}>Next <ChevronRight className="w-3 h-3 inline" /></button>
                    <input
                      className="w-[70px] py-1.5 px-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50 ml-1"
                      type="number"
                      min={1}
                      max={paginationPages}
                      placeholder="Go to..."
                      onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                          changePage(parseInt(e.target.value))
                          e.target.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== BULK EDIT PAGE ========== */}
      <div className={`${activePage === 'bulk-edit' ? 'flex flex-col' : 'hidden'} flex-1 min-h-0 max-sm:mt-12 max-sm:pb-[60px]`} style={{ zoom: viewsZoom / 100 }}>
        <BulkEditView
          initialCustomers={customers}
          initialProducts={products}
          superCategories={superCategoriesList}
          categoriesBySuper={categoriesBySuper}
          onLoadProducts={loadProducts}
        />
      </div>

      {/* ========== CUSTOMER VIEWS PAGE ========== */}
      <div className={`${activePage === 'views' ? 'flex flex-col' : 'hidden'} flex-1 min-h-0 max-sm:mt-12 max-sm:pb-[60px]`} style={{ zoom: viewsZoom / 100 }}>
        <div className="flex flex-1 min-h-0 max-sm:flex-col max-sm:h-[calc(100vh-48px-60px)] max-sm:overflow-hidden">
          <div className="w-[268px] min-w-[268px] max-sm:w-full max-sm:min-w-0 bg-white border-r border-slate-200 max-sm:border-r-0 max-sm:border-b flex flex-col h-[calc(100vh-56px)] sticky top-14 max-sm:static max-sm:max-h-[45vh] max-sm:overflow-y-auto max-sm:flex-shrink-0 max-sm:overscroll-contain">
            <div className="px-4 py-3.5 max-sm:px-3 max-sm:py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="text-base max-sm:text-[15px] font-semibold text-slate-800">Customers</span>
              <button className="px-3 py-1.5 bg-indigo-500 border-none rounded-lg text-white text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-600" onClick={() => openModal('addCustModal')}><Plus className="w-3 h-3 inline mr-0.5 -mt-px" /> Add</button>
            </div>
            <div className="px-3.5 py-2.5 max-sm:px-3 max-sm:py-1.5 border-b border-slate-200">
              <input type="text" placeholder="Search..." value={custSearchQuery} onChange={e => setCustSearchQuery(e.target.value)} className="w-full py-[7px] px-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[13px] max-sm:!text-base outline-none focus:border-indigo-400 box-border" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredCustomers.map(cust => (
                <div key={cust.id} className={`px-3.5 py-[11px] max-sm:px-3 max-sm:py-2.5 cursor-pointer border-b border-slate-100 transition-all flex items-center gap-2.5 ${selectedCustomer?.id === cust.id ? 'bg-indigo-50 border-r-2 border-r-indigo-500 max-sm:border-r-0 max-sm:border-l-[3px] max-sm:border-l-indigo-500' : 'hover:bg-slate-50'}`} onClick={() => selectCustomer(cust)}>
                  <div className="w-[34px] h-[34px] max-sm:w-9 max-sm:h-9 rounded-full flex items-center justify-center font-bold text-[13px] max-sm:text-sm text-white flex-shrink-0" style={{ background: getAvatarColor(cust.company_name) }}>{cust.company_name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="text-[13px] max-sm:text-sm text-slate-800 font-medium max-sm:font-semibold">{cust.company_name}</div>
                    <div className="text-[11px] text-slate-400">{cust.email}</div>
                    <div className="flex gap-[5px] mt-0.5">
                      <span className={`text-[9px] px-[7px] py-px rounded-full font-medium ${cust.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{cust.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {selectedCustomer ? (
            <div className="flex-1 overflow-y-auto p-[22px] max-sm:p-3 max-sm:min-h-0 max-sm:overscroll-contain">
              <div className="flex items-start justify-between mb-4 max-sm:mb-3 pb-4 max-sm:pb-2.5 border-b border-slate-200 max-sm:flex-col max-sm:gap-2">
                <div>
                  <div className="text-[22px] max-sm:text-lg font-semibold text-slate-800 tracking-tight">{selectedCustomer.company_name}</div>
                  <div className="text-[13px] text-slate-400 mt-0.5">{selectedCustomer.email}</div>
                </div>
                <div className="flex gap-[7px] flex-shrink-0 max-sm:w-full max-sm:justify-end max-sm:gap-1.5">
                  <button className="px-3.5 py-[7px] max-sm:px-2.5 max-sm:py-1.5 bg-white border border-amber-300 rounded-lg text-amber-600 text-xs max-sm:text-[11px] font-medium cursor-pointer transition-all hover:border-red-500 hover:text-red-500 hover:bg-red-50" onClick={resetCustomerView}>Reset All</button>
                  <button className="px-4 py-[7px] max-sm:px-3.5 max-sm:py-1.5 bg-indigo-500 border-none rounded-lg text-white text-[13px] max-sm:text-xs font-semibold cursor-pointer hover:bg-indigo-600" onClick={saveCustomerView}>Save View</button>
                  <button className="w-7 h-7 max-sm:w-6 max-sm:h-6 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center transition-all hover:bg-indigo-500 hover:border-indigo-500 hover:text-white flex-shrink-0" onClick={() => setSelectedCustomer(null)}><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex gap-[5px] max-sm:gap-1 items-center mb-4 max-sm:mb-2.5 flex-wrap">
                <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide">Presets:</span>
                {['full', 'chips', 'noodles', 'korean', 'icecream', 'custom'].map(p => (
                  <button key={p} className={`px-3.5 max-sm:px-2.5 py-[5px] max-sm:py-1 rounded-full border text-xs max-sm:text-[11px] font-medium cursor-pointer transition-all ${customerViewMode === p ? 'border-indigo-500 text-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-slate-800'}`} onClick={() => applyViewPreset(p)}>{p === 'full' ? 'Full Catalog' : p === 'chips' ? 'Chips Only' : p === 'noodles' ? 'Noodles Only' : p === 'korean' ? 'Korean Only' : p === 'icecream' ? 'Ice Cream Only' : 'Custom'}</button>
                ))}
              </div>
              <div className="flex gap-[5px] max-sm:gap-1 items-center flex-wrap mb-3 max-sm:mb-2 p-2 px-3 max-sm:p-1.5 max-sm:px-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <button className="px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-600 text-[11px] max-sm:text-[10px] font-medium cursor-pointer transition-all hover:border-red-500 hover:text-red-500 hover:bg-red-50 whitespace-nowrap" onClick={hideAllForCust}><Ban className="w-3 h-3 inline mr-0.5 -mt-px" /> Hide All</button>
                <button className="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 text-[11px] max-sm:text-[10px] font-medium cursor-pointer transition-all hover:border-emerald-400 whitespace-nowrap" onClick={showAllForCust}><Eye className="w-3 h-3 inline mr-0.5 -mt-px" /> Show All</button>
                <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide ml-2">Only:</span>
                {superCatNames.map(sc => (
                  <button key={sc} className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-500 text-[11px] max-sm:text-[10px] font-medium cursor-pointer transition-all hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 whitespace-nowrap" onClick={() => showOnlyForCust(sc)}>{sc}</button>
                ))}
              </div>
              <div className="flex items-center gap-2.5 p-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-3">
                <span className="text-[13px] font-semibold text-slate-800"><DollarSign className="w-3.5 h-3.5 inline mr-1 -mt-px" /> Show Prices</span>
                <button
                  className={`w-9 h-5 rounded-full border-none cursor-pointer relative transition-colors flex-shrink-0 ${selectedCustomer.showPrices !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  onClick={() => setSelectedCustomer(prev => ({ ...prev, showPrices: prev.showPrices === false ? true : false }))}
                >
                  <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-[left] ${selectedCustomer.showPrices !== false ? 'left-[19px]' : 'left-[3px]'}`}></span>
                </button>
                <span className="text-xs text-slate-400">{selectedCustomer.showPrices !== false ? 'Prices visible' : 'Prices hidden'}</span>
              </div>
              <div className="text-xs text-slate-500 p-2.5 px-3 bg-slate-50 rounded-lg border-l-[3px] border-l-indigo-500 mb-4 max-sm:mb-2 max-sm:text-[11px]">Toggle visibility per category or product. Changes only affect this customer.</div>

              <div className="flex gap-1.5 items-center mb-3.5 p-2 px-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-semibold text-emerald-600">{customerVisibleCount} visible</span>
                <span className="text-slate-300">&middot;</span>
                <span className="font-semibold text-slate-400">{customerHiddenCount} hidden</span>
                <span className="text-slate-300">&middot;</span>
                <span className="font-semibold text-slate-800">{products.length} total</span>
              </div>

              {categoryTree.map(superCat => (
                <div key={superCat.name} className={`bg-white border border-slate-200 rounded-xl mb-2.5 overflow-hidden shadow-sm ${isCatHiddenForCust(superCat.name) ? '[&>div:first-child]:opacity-65 [&>div:first-child]:bg-slate-50' : ''}`}>
                  <div className="px-4 max-sm:px-3 py-[11px] max-sm:py-2 flex items-center gap-2.5 cursor-pointer border-b border-slate-200 bg-slate-50/70" onClick={() => toggleCatExpand(superCat.name)}>
                    <span className="text-[15px]">{superCat.emoji}</span>
                    <span className="flex-1 text-sm max-sm:text-[13px] font-semibold text-slate-800">{superCat.name}</span>
                    <span className="text-[11px] text-slate-400">{superCat.count}</span>
                    {isCatHiddenForCust(superCat.name) && <span className="text-[9px] font-semibold px-[7px] py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200 uppercase tracking-wide">Hidden</span>}
                    <button
                      className={`w-[30px] h-4 rounded-lg border-none cursor-pointer relative transition-colors flex-shrink-0 mr-1 ${!isCatHiddenForCust(superCat.name) ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      onClick={(e) => { e.stopPropagation(); toggleCatVisForCust(superCat.name); }}
                      title="Toggle category visibility for this customer"
                    >
                      <span className={`absolute top-[2px] w-3 h-3 rounded-full bg-white shadow-sm transition-[left] ${!isCatHiddenForCust(superCat.name) ? 'left-[16px]' : 'left-[2px]'}`}></span>
                    </button>
                    <ChevronRight className={`w-3 h-3 text-slate-300 cursor-pointer transition-transform ${expandedViewCats[superCat.name] ? 'rotate-90' : ''}`} />
                  </div>
                  <div className={`p-2.5 px-3 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-[7px] ${!expandedViewCats[superCat.name] ? 'hidden' : ''}`}>
                    {getProductsInCategory(superCat.name).map(prod => (
                      <div key={prod.id} className={`bg-slate-50 border-[1.5px] border-slate-200 rounded-lg p-2 flex items-center gap-2 transition-all hover:border-indigo-300 ${(!isProductVisibleForCustomer(prod.id) || prod.is_hidden) ? 'opacity-45 border-dashed' : ''} ${(isProductOosForCustomer(prod.id) || prod.is_oos) ? '!border-amber-300' : ''}`}>
                        <img src={prod.image_url} className="w-9 h-9 object-contain rounded-[5px] bg-white flex-shrink-0 border border-slate-200" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-slate-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{prod.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono">{prod.sku || 'N/A'}</div>
                        </div>
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            className={`w-[30px] h-4 rounded-lg border-none cursor-pointer relative transition-colors ${isProductVisibleForCustomer(prod.id) ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            onClick={() => toggleProductForCustomer(prod.id)}
                            title="Toggle visibility"
                          >
                            <span className={`absolute top-[2px] w-3 h-3 rounded-full bg-white shadow-sm transition-[left] ${isProductVisibleForCustomer(prod.id) ? 'left-[16px]' : 'left-[2px]'}`}></span>
                          </button>
                          <button
                            className={`w-[30px] h-4 rounded border text-[8px] font-bold text-center leading-[14px] p-0 cursor-pointer transition-all ${isProductOosForCustomer(prod.id) ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500'}`}
                            onClick={() => toggleOosForCustomer(prod.id)}
                            title="Toggle OOS for this customer"
                          >
                            {isProductOosForCustomer(prod.id) ? 'OOS' : 'OK'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-[22px]">
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2.5 min-h-[300px]">
                <Users className="w-10 h-10 opacity-20" />
                <div>Select a customer to configure their view</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== ORDERS PAGE ========== */}
      <div className={`${activePage === 'orders' ? 'flex flex-col' : 'hidden'} flex-1 min-h-0 max-sm:mt-12 max-sm:pb-[60px]`} style={{ zoom: viewsZoom / 100 }}>
        <div className="flex-1 p-[22px] max-sm:p-3 overflow-y-auto">
          <div className="flex justify-between items-center mb-5">
            <div className="text-[22px] font-semibold text-slate-800 tracking-tight">All Orders</div>
            <div className="flex gap-[5px]">
              {['all', 'pending', 'processing', 'received'].map(f => (
                <button key={f} className={`px-3.5 py-[5px] rounded-lg border text-xs font-medium cursor-pointer transition-all max-sm:text-[10px] max-sm:px-2 max-sm:py-1 capitalize ${orderFilter === f ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-500'}`} onClick={() => setOrderFilterCb(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-3 max-sm:gap-2 mb-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm"><div className="text-[10px] font-semibold tracking-wide uppercase text-slate-400 mb-[7px]">Total Orders</div><div className="text-[28px] max-sm:text-[22px] font-semibold text-indigo-500">{orders.length}</div></div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm"><div className="text-[10px] font-semibold tracking-wide uppercase text-slate-400 mb-[7px]">Pending</div><div className="text-[28px] max-sm:text-[22px] font-semibold text-amber-500">{orderStats.pending}</div></div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm"><div className="text-[10px] font-semibold tracking-wide uppercase text-slate-400 mb-[7px]">Processing</div><div className="text-[28px] max-sm:text-[22px] font-semibold text-blue-500">{orderStats.processing}</div></div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 max-sm:p-3 shadow-sm"><div className="text-[10px] font-semibold tracking-wide uppercase text-slate-400 mb-[7px]">Received</div><div className="text-[28px] max-sm:text-[22px] font-semibold text-emerald-500">{orderStats.received}</div></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-sm:overflow-x-auto max-sm:rounded-xl">
            <div className="grid grid-cols-[90px_1fr_90px_60px_50px_80px_90px_110px] max-sm:grid-cols-[80px_120px_80px_50px_40px_70px_80px_90px] max-sm:min-w-[610px] bg-slate-50 border-b border-slate-200">
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">Order #</div>
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">Customer</div>
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">Date</div>
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">Cases</div>
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">SKUs</div>
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">Amount</div>
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">Status</div>
              <div className="px-3.5 max-sm:px-1.5 py-2.5 max-sm:py-2 text-[10px] max-sm:text-[9px] font-semibold tracking-wide uppercase text-slate-400">Update</div>
            </div>
            <div className="max-sm:min-w-[610px]">
              {filteredOrders.map(order => (
                <React.Fragment key={order.id}>
                  <div className={`grid grid-cols-[90px_1fr_90px_60px_50px_80px_90px_110px] max-sm:grid-cols-[80px_120px_80px_50px_40px_70px_80px_90px] border-b border-slate-100 transition-colors bg-white hover:bg-slate-50 cursor-pointer ${expandedOrderId === order.id ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' : ''}`} onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center"><span className="font-semibold text-[13px] max-sm:text-[11px] text-indigo-500">#{(order.id || '').substring(0, 8).toUpperCase()}</span></div>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center">{order.customer_name}</div>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center">{formatDate(order.created_at)}</div>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center">{order.cases}</div>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center">{order.skus}</div>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center">${order.amount || '0.00'}</div>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center">
                      <span className={`px-2.5 max-sm:px-1.5 py-[3px] rounded-full text-[10px] max-sm:text-[9px] font-semibold tracking-wide ${(order.status || '').toLowerCase() === 'received' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : (order.status || '').toLowerCase() === 'processing' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-amber-100 text-amber-600 border border-amber-200'}`}>{order.status}</span>
                    </div>
                    <div className="px-3.5 max-sm:px-1.5 py-[13px] max-sm:py-2.5 text-xs max-sm:text-[11px] flex items-center" onClick={e => e.stopPropagation()}>
                      <select className="bg-white border border-slate-200 rounded-lg text-slate-500 text-[11px] max-sm:text-[10px] px-2 max-sm:px-1 py-1 cursor-pointer focus:outline-none focus:border-indigo-400" value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                        <option>Pending</option>
                        <option>Processing</option>
                        <option>Received</option>
                      </select>
                    </div>
                  </div>
                  {expandedOrderId === order.id && (
                    <div className="p-4 max-sm:p-3 px-5 bg-slate-50 border-b border-slate-200 animate-[slideDown_0.2s_ease]">
                      <div className="grid grid-cols-2 max-sm:!grid-cols-1 gap-5 max-sm:gap-3.5">
                        <div className="flex flex-col gap-1.5">
                          <div className="text-xs max-sm:text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1"><User className="w-3 h-3 inline mr-1 -mt-px" /> Customer Info</div>
                          <div className="flex gap-2 text-[13px] max-sm:text-xs"><span className="text-slate-400 min-w-[70px] max-sm:min-w-0 flex-shrink-0">Company</span><span className="text-slate-800 font-medium">{order.company_name || '\u2014'}</span></div>
                          <div className="flex gap-2 text-[13px] max-sm:text-xs"><span className="text-slate-400 min-w-[70px] max-sm:min-w-0 flex-shrink-0">Contact</span><span className="text-slate-800 font-medium">{order.contact_name || '\u2014'}</span></div>
                          <div className="flex gap-2 text-[13px] max-sm:text-xs"><span className="text-slate-400 min-w-[70px] max-sm:min-w-0 flex-shrink-0">Email</span><span className="text-slate-800 font-medium">{order.email || '\u2014'}</span></div>
                          <div className="flex gap-2 text-[13px] max-sm:text-xs"><span className="text-slate-400 min-w-[70px] max-sm:min-w-0 flex-shrink-0">Phone</span><span className="text-slate-800 font-medium">{order.phone || '\u2014'}</span></div>
                          {order.alt_phone && <div className="flex gap-2 text-[13px] max-sm:text-xs"><span className="text-slate-400 min-w-[70px] max-sm:min-w-0 flex-shrink-0">Alt Phone</span><span className="text-slate-800 font-medium">{order.alt_phone}</span></div>}
                          {(order.address_line1 || order.city) && (
                            <div className="flex gap-2 text-[13px] max-sm:text-xs flex-wrap"><span className="text-slate-400 min-w-[70px] max-sm:min-w-0 flex-shrink-0">Address</span><span className="text-slate-800 font-medium">{[order.address_line1, order.address_line2, order.city, order.state, order.zip, order.country].filter(Boolean).join(', ')}</span></div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="text-xs max-sm:text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1"><Package className="w-3 h-3 inline mr-1 -mt-px" /> Order Items</div>
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs max-sm:text-[11px] py-1 border-b border-slate-100 last:border-b-0 flex-wrap max-sm:gap-1">
                              <span className="flex-1 text-slate-800 font-medium min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-sm:whitespace-normal max-sm:text-xs">{item.name}</span>
                              <span className="text-slate-400 text-[11px]">{item.sku || ''}</span>
                              <span className="text-slate-500 whitespace-nowrap">{item.qty} cases</span>
                              <span className="text-slate-400 whitespace-nowrap">${parseFloat(item.price || 0).toFixed(2)}</span>
                              <span className="text-slate-800 font-semibold whitespace-nowrap min-w-[60px] max-sm:min-w-0 text-right">${(parseFloat(item.price || 0) * (item.qty || 0)).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 text-sm max-sm:text-[13px] font-bold text-indigo-500">
                            <span>Total</span>
                            <span>${order.amount || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            {filteredOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-[60px] text-center border-t border-dashed border-slate-200">
                <ClipboardList className="w-9 h-9 text-slate-300 opacity-50 mb-1" />
                <div className="text-[15px] font-semibold text-slate-800">No orders yet</div>
                <div className="text-[13px] text-slate-400">Orders from customers will appear here</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== CATEGORIES PAGE ========== */}
      <div className={`${activePage === 'categories' ? 'flex flex-col' : 'hidden'} flex-1 min-h-0 max-sm:mt-12 max-sm:pb-[60px]`} style={{ zoom: viewsZoom / 100 }}>
        <div className="flex flex-col gap-6 max-sm:gap-3.5 p-6 max-sm:p-3 max-w-[900px] mx-auto w-full overflow-y-auto">
          <div className="text-center mb-3">
            <h1 className="text-[28px] max-sm:text-xl font-bold mb-2 text-slate-800"><FolderOpen className="w-7 h-7 inline mr-2 -mt-1" /> Categories & Organization</h1>
            <p className="text-[13px] max-sm:text-xs text-slate-400">Manage categories and super-categories. Changes update immediately for all users.</p>
          </div>

          <div className="flex flex-col gap-3 mb-0">
            <div className="text-sm font-semibold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-200">Super Categories</div>
            <div className="flex gap-2 mb-1 max-sm:flex-col max-sm:gap-1.5">
              <input
                type="text"
                className="flex-1 py-2 px-3 border border-slate-200 rounded-lg text-[13px] max-sm:text-sm text-slate-800 bg-white outline-none focus:border-indigo-400 placeholder:text-slate-400"
                placeholder="New super category name..."
                value={newSuperCatName}
                onChange={e => setNewSuperCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSuperCategory()}
              />
              <button className="px-4 py-2 bg-indigo-500 border-none rounded-lg text-white font-semibold text-[13px] cursor-pointer transition-all hover:bg-indigo-600 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed" onClick={addSuperCategory} disabled={!newSuperCatName.trim()}><Plus className="w-3.5 h-3.5 inline mr-0.5 -mt-px" /> Add</button>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-3 border border-slate-200">
              <div className="flex flex-col gap-2" onDragOver={(e) => handleDragOver(e, 'super', null)} onDrop={(e) => handleDrop(e, 'super', null)}>
                {superCategoriesList.map((element, index) => (
                  <div key={element.id} className={`cat-item flex items-center gap-3 max-sm:gap-2 p-3 max-sm:p-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg transition-all hover:border-indigo-400 ${dragContext?.listType === 'super' && dragOverItemRef.current === index && dragItemRef.current !== index ? '!border-indigo-500 shadow-[0_-2px_0_0_theme(colors.indigo.500)]' : ''}`}
                    draggable={editingSuperCatId !== element.id}
                    onDragStart={(e) => handleDragStart(e, index, 'super', null)}
                    onDragEnter={(e) => handleDragEnter(e, index, 'super', null)}
                    onDragEnd={handleDragEnd}
                  >
                    <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0 cursor-grab active:cursor-grabbing" title="Drag to reorder" />
                    <div className="flex flex-col flex-1 min-w-0">
                      {editingSuperCatId === element.id ? (
                        <input
                          type="text"
                          className="py-1 px-2 border border-indigo-500 rounded-md text-sm text-slate-800 bg-white outline-none w-full"
                          value={editingSuperCatName}
                          onChange={e => setEditingSuperCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameSuperCategory(element.id); if (e.key === 'Escape') setEditingSuperCatId(null); }}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="text-sm max-sm:text-[13px] font-medium text-slate-800">{element.name}</span>
                          <span className="text-[11px] text-slate-400">Position: {index + 1}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs max-sm:text-[11px] text-slate-500 bg-white/50 px-2.5 max-sm:px-2 py-1 rounded-xl whitespace-nowrap flex-shrink-0">{getCategoryItemCount(element.id, 'super')} products</span>
                    <div className="flex gap-1 max-sm:gap-0.5 flex-shrink-0">
                      {editingSuperCatId === element.id ? (
                        <>
                          <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-emerald-500 bg-white text-emerald-500 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:bg-emerald-50" onClick={() => renameSuperCategory(element.id)} title="Save"><Check className="w-3.5 h-3.5" /></button>
                          <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-slate-200 bg-white text-slate-400 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:border-red-500 hover:text-red-500" onClick={() => setEditingSuperCatId(null)} title="Cancel"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-slate-200 bg-white text-slate-400 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:border-indigo-500 hover:text-indigo-500" onClick={() => { setEditingSuperCatId(element.id); setEditingSuperCatName(element.name); }} title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                          <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-slate-200 bg-white text-slate-400 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:border-red-500 hover:text-red-500 hover:bg-red-50" onClick={() => deleteSuperCategory(element.id, element.name)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {superCategoriesList.map(superCat => (
            <div key={`cats-${superCat.id}`} className="flex flex-col gap-3 mb-0">
              <div className="text-sm max-sm:text-xs font-semibold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-200">{superCat.name} &mdash; Subcategories</div>
              <div className="flex gap-2 mb-1 max-sm:flex-col max-sm:gap-1.5">
                <input
                  type="text"
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-lg text-[13px] max-sm:text-sm text-slate-800 bg-white outline-none focus:border-indigo-400 placeholder:text-slate-400"
                  placeholder={`New subcategory in ${superCat.name}...`}
                  value={newSubCatName[superCat.id] || ''}
                  onChange={e => setNewSubCatName(prev => ({ ...prev, [superCat.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addSubCategory(superCat.id)}
                />
                <button className="px-4 py-2 bg-indigo-500 border-none rounded-lg text-white font-semibold text-[13px] cursor-pointer transition-all hover:bg-indigo-600 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => addSubCategory(superCat.id)} disabled={!(newSubCatName[superCat.id] || '').trim()}><Plus className="w-3.5 h-3.5 inline mr-0.5 -mt-px" /> Add</button>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-3 border border-slate-200">
                <div className="flex flex-col gap-2" onDragOver={(e) => handleDragOver(e, 'sub', superCat.id)} onDrop={(e) => handleDrop(e, 'sub', superCat.id)}>
                  {(categoriesBySuper[superCat.id] || []).map((element, index) => (
                    <div key={element.id} className={`cat-item flex items-center gap-3 max-sm:gap-2 p-3 max-sm:p-2.5 bg-slate-50 border border-slate-200 rounded-lg transition-all hover:border-indigo-400 ${dragContext?.listType === 'sub' && dragContext?.superId === superCat.id && dragOverItemRef.current === index && dragItemRef.current !== index ? '!border-indigo-500 shadow-[0_-2px_0_0_theme(colors.indigo.500)]' : ''}`}
                      draggable={editingSubCatId !== element.id}
                      onDragStart={(e) => handleDragStart(e, index, 'sub', superCat.id)}
                      onDragEnter={(e) => handleDragEnter(e, index, 'sub', superCat.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0 cursor-grab active:cursor-grabbing" title="Drag to reorder" />
                      <div className="flex flex-col flex-1 min-w-0">
                        {editingSubCatId === element.id ? (
                          <input
                            type="text"
                            className="py-1 px-2 border border-indigo-500 rounded-md text-sm text-slate-800 bg-white outline-none w-full"
                            value={editingSubCatName}
                            onChange={e => setEditingSubCatName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') renameSubCategory(element.id, superCat.id); if (e.key === 'Escape') setEditingSubCatId(null); }}
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="text-sm max-sm:text-[13px] font-medium text-slate-800">{element.name}</span>
                            <span className="text-[11px] text-slate-400">Position: {index + 1}</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs max-sm:text-[11px] text-slate-500 bg-white/50 px-2.5 max-sm:px-2 py-1 rounded-xl whitespace-nowrap flex-shrink-0">{getCategoryItemCount(element.id, 'cat')} products</span>
                      <div className="flex gap-1 max-sm:gap-0.5 flex-shrink-0">
                        {editingSubCatId === element.id ? (
                          <>
                            <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-emerald-500 bg-white text-emerald-500 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:bg-emerald-50" onClick={() => renameSubCategory(element.id, superCat.id)} title="Save"><Check className="w-3.5 h-3.5" /></button>
                            <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-slate-200 bg-white text-slate-400 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:border-red-500 hover:text-red-500" onClick={() => setEditingSubCatId(null)} title="Cancel"><X className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-slate-200 bg-white text-slate-400 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:border-indigo-500 hover:text-indigo-500" onClick={() => { setEditingSubCatId(element.id); setEditingSubCatName(element.name); }} title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                            <button className="w-7 h-7 max-sm:w-[26px] max-sm:h-[26px] rounded-md border border-slate-200 bg-white text-slate-400 text-[13px] max-sm:text-xs cursor-pointer flex items-center justify-center transition-all hover:border-red-500 hover:text-red-500 hover:bg-red-50" onClick={() => deleteSubCategory(element.id, superCat.id, element.name)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-3">
            {catReorderStatus && <span className="text-[13px] text-emerald-600 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200 animate-[fadeIn_0.3s]"><CheckCircle className="w-3.5 h-3.5 inline mr-1 -mt-px" /> {catReorderStatus}</span>}
          </div>
        </div>
      </div>

      {/* ========== SETTINGS PAGE ========== */}
      <div className={`${activePage === 'settings' ? 'flex flex-col' : 'hidden'} flex-1 min-h-0 max-sm:mt-12 max-sm:pb-[60px]`} style={{ zoom: viewsZoom / 100 }}>
        <div className="p-7 max-sm:p-3 max-w-[780px] max-sm:max-w-full mx-auto overflow-y-auto max-sm:overscroll-contain">
          <div className="bg-white border border-slate-200 rounded-[14px] mb-[22px] overflow-hidden">
            <div className="text-sm max-sm:text-[13px] font-semibold text-slate-800 px-5 max-sm:px-3.5 py-4 max-sm:py-3 border-b border-slate-100 tracking-tight"><Shield className="w-4 h-4 inline mr-1.5 -mt-px" /> Customer Registration</div>
            <div className="flex items-center max-sm:flex-col max-sm:items-start gap-5 max-sm:gap-2 px-5 max-sm:px-3.5 py-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800 mb-0.5">Allow "Create Account" on login page</div>
                <div className="text-xs text-slate-400 leading-relaxed">When enabled, customers will see a "Create account" link on the login page.</div>
              </div>
              <button className={`w-9 h-5 rounded-full border-none cursor-pointer relative transition-colors flex-shrink-0 ${registrationEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={toggleRegistration}>
                <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-[left] ${registrationEnabled ? 'left-[19px]' : 'left-[3px]'}`}></span>
              </button>
            </div>
            <div className="flex items-center max-sm:flex-col max-sm:items-start gap-5 max-sm:gap-2 px-5 max-sm:px-3.5 py-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800 mb-0.5">Show prices to customers</div>
                <div className="text-xs text-slate-400 leading-relaxed">When disabled, product prices will be hidden from all customer accounts site-wide. Admin can still see prices.</div>
              </div>
              <button className={`w-9 h-5 rounded-full border-none cursor-pointer relative transition-colors flex-shrink-0 ${priceVisibility ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={togglePriceVisibility}>
                <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-[left] ${priceVisibility ? 'left-[19px]' : 'left-[3px]'}`}></span>
              </button>
            </div>
          </div>

          {/* Promo Banner Editor */}
          <div className="bg-white border border-slate-200 rounded-[14px] mb-[22px] overflow-hidden">
            <div className="text-sm max-sm:text-[13px] font-semibold text-slate-800 px-5 max-sm:px-3.5 py-4 max-sm:py-3 border-b border-slate-100 tracking-tight"><Megaphone className="w-4 h-4 inline mr-1.5 -mt-px" /> Promo Banner</div>
            <div className="px-5 max-sm:px-3.5 py-4">
              {/* Enable toggle */}
              <div className="flex items-center gap-5 mb-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800 mb-0.5">Enable promo banner</div>
                  <div className="text-xs text-slate-400 leading-relaxed">Show a promotional banner at the top of the customer catalog page.</div>
                </div>
                <button className={`w-9 h-5 rounded-full border-none cursor-pointer relative transition-colors flex-shrink-0 ${promoBanner.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  onClick={() => savePromoBanner({ ...promoBanner, enabled: !promoBanner.enabled })}>
                  <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-[left] ${promoBanner.enabled ? 'left-[19px]' : 'left-[3px]'}`}></span>
                </button>
              </div>

              {/* Banner type toggle */}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Banner Type</div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-4">
                <button className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border-none rounded-md text-xs font-medium cursor-pointer transition-all ${(promoBanner.type || 'text') === 'text' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => { const updated = { ...promoBanner, type: 'text', enabled: true }; savePromoBanner(updated); }}><Type className="w-3.5 h-3.5" /> Use Text Banner</button>
                <button className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border-none rounded-md text-xs font-medium cursor-pointer transition-all ${promoBanner.type === 'image' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => { const updated = { ...promoBanner, type: 'image', enabled: true }; savePromoBanner(updated); }}><ImageIcon className="w-3.5 h-3.5" /> Use Image Banner</button>
              </div>

              {/* Preview */}
              {(promoBanner.type || 'text') === 'text' ? (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 mb-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative flex items-center justify-between gap-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-indigo-400 text-[11px] font-bold tracking-widest uppercase mb-2">
                        <span className="w-5 h-0.5 bg-indigo-400 rounded"></span>
                        {promoBanner.label || 'LIMITED TIME OFFER'}
                      </div>
                      <div className="text-white text-lg font-bold leading-tight mb-2">{promoBanner.headline || 'Your headline here'}</div>
                      <div className="text-slate-400 text-xs leading-relaxed">{promoBanner.subtitle || 'Your subtitle text here.'}</div>
                    </div>
                    {promoBanner.ctaText && (
                      <span className="inline-flex items-center gap-1.5 bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shrink-0">{promoBanner.ctaText} →</span>
                    )}
                  </div>
                  {!promoBanner.enabled && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-slate-400 text-xs font-semibold">DISABLED</div>}
                </div>
              ) : (
                <div className="rounded-xl mb-4 relative overflow-hidden border border-slate-200 bg-slate-50">
                  {promoBanner.imageUrl ? (
                    <img src={promoBanner.imageUrl} alt="Banner preview" className="w-full max-h-[200px] object-cover rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                      <span className="text-xs">No image uploaded yet</span>
                    </div>
                  )}
                  {promoBanner.ctaLink && promoBanner.imageUrl && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1"><Link className="w-3 h-3" /> {promoBanner.ctaLink}</div>
                  )}
                  {!promoBanner.enabled && <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-slate-400 text-xs font-semibold">DISABLED</div>}
                </div>
              )}

              {/* Text banner fields */}
              {(promoBanner.type || 'text') === 'text' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Label Tag</label>
                    <input type="text" value={promoBanner.label} onChange={e => setPromoBanner(p => ({ ...p, label: e.target.value }))} placeholder="e.g. LIMITED TIME OFFER"
                      className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none focus:border-indigo-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Headline</label>
                    <input type="text" value={promoBanner.headline} onChange={e => setPromoBanner(p => ({ ...p, headline: e.target.value }))} placeholder="e.g. Free freight on orders over $2,000"
                      className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none focus:border-indigo-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subtitle / Description</label>
                    <input type="text" value={promoBanner.subtitle} onChange={e => setPromoBanner(p => ({ ...p, subtitle: e.target.value }))} placeholder="e.g. Use code SPRINGDEAL for an extra 5% off"
                      className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none focus:border-indigo-400" />
                  </div>
                  <div className="flex gap-3 max-sm:flex-col">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Button Text</label>
                      <input type="text" value={promoBanner.ctaText} onChange={e => setPromoBanner(p => ({ ...p, ctaText: e.target.value }))} placeholder="e.g. Shop New Arrivals"
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none focus:border-indigo-400" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Button URL</label>
                      <input type="text" value={promoBanner.ctaLink || ''} onChange={e => setPromoBanner(p => ({ ...p, ctaLink: e.target.value }))} placeholder="e.g. https://example.com/sale"
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Image banner fields */}
              {promoBanner.type === 'image' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Banner Image</label>
                    <div className="flex gap-2 items-center">
                      <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition-colors hover:bg-slate-200">
                        <Upload className="w-3.5 h-3.5" /> Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const url = await uploadBannerImage(file);
                          if (url) {
                            const updated = { ...promoBanner, imageUrl: url };
                            setPromoBanner(updated);
                            await savePromoBanner(updated);
                          }
                          e.target.value = '';
                        }} />
                      </label>
                      {promoBanner.imageUrl && (
                        <button onClick={async () => {
                          await removeBannerImage();
                          const updated = { ...promoBanner, imageUrl: '' };
                          setPromoBanner(updated);
                          await savePromoBanner(updated);
                        }}
                          className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-500 cursor-pointer transition-colors hover:bg-red-100">
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                    {promoBanner.imageUrl && <div className="text-[11px] text-slate-400 truncate mt-1">{promoBanner.imageUrl}</div>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Click URL (where banner links to)</label>
                    <input type="text" value={promoBanner.ctaLink || ''} onChange={e => setPromoBanner(p => ({ ...p, ctaLink: e.target.value }))} placeholder="e.g. https://example.com/promo"
                      className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none focus:border-indigo-400" />
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4 flex-wrap">
                <button onClick={() => savePromoBanner({ ...promoBanner, enabled: true })}
                  className="px-5 py-2.5 bg-indigo-500 border-none rounded-lg text-white font-semibold text-[13px] cursor-pointer transition-colors hover:bg-indigo-600">
                  Save Changes
                </button>
                {promoBanner.enabled && (
                  <button onClick={() => savePromoBanner({ ...promoBanner, enabled: false })}
                    className="px-5 py-2.5 bg-transparent border border-slate-200 rounded-lg text-slate-500 font-semibold text-[13px] cursor-pointer transition-colors hover:border-red-300 hover:text-red-500">
                    Disable Banner
                  </button>
                )}
              </div>
              {promoBanner.enabled && (
                <div className="mt-3 text-xs text-emerald-500 font-medium flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Currently showing: {(promoBanner.type || 'text') === 'image' ? 'Image' : 'Text'} banner
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[14px] mb-[22px] overflow-hidden">
            <div className="text-sm max-sm:text-[13px] font-semibold text-slate-800 px-5 max-sm:px-3.5 py-4 max-sm:py-3 border-b border-slate-100 tracking-tight"><Shield className="w-4 h-4 inline mr-1.5 -mt-px" /> Customer Registration</div>
            <div className="flex items-center max-sm:flex-col max-sm:items-start gap-5 max-sm:gap-2 px-5 max-sm:px-3.5 py-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800 mb-0.5">Allow "Create Account" on login page</div>
                <div className="text-xs text-slate-400 leading-relaxed">When enabled, customers will see a "Create account" link on the login page.</div>
              </div>
              <button className={`w-9 h-5 rounded-full border-none cursor-pointer relative transition-colors flex-shrink-0 ${registrationEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={toggleRegistration}>
                <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-[left] ${registrationEnabled ? 'left-[19px]' : 'left-[3px]'}`}></span>
              </button>
            </div>
            <div className="flex items-center max-sm:flex-col max-sm:items-start gap-5 max-sm:gap-2 px-5 max-sm:px-3.5 py-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800 mb-0.5">Show prices to customers</div>
                <div className="text-xs text-slate-400 leading-relaxed">When disabled, product prices will be hidden from all customer accounts site-wide.</div>
              </div>
              <button className={`w-9 h-5 rounded-full border-none cursor-pointer relative transition-colors flex-shrink-0 ${priceVisibility ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={togglePriceVisibility}>
                <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-[left] ${priceVisibility ? 'left-[19px]' : 'left-[3px]'}`}></span>
              </button>
            </div>
            {pendingRegistrations.filter(r => r.status === 'pending').length > 0 && (
              <div className="px-5 max-sm:px-3.5 py-4 border-t border-slate-200">
                <div className="text-[13px] max-sm:text-xs font-semibold text-slate-800 mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4 inline" /> Pending Approvals <span className="bg-red-500 text-white text-[11px] font-semibold px-2 py-px rounded-full">{pendingRegistrations.filter(r => r.status === 'pending').length}</span></div>
                <div className="flex flex-col gap-2">
                  {pendingRegistrations.filter(r => r.status === 'pending').map(reg => (
                    <div key={reg.id} className="flex items-center max-sm:flex-col gap-4 max-sm:gap-2 p-3 px-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm max-sm:text-[13px] font-semibold text-slate-800">{reg.company_name}</div>
                        <div className="text-xs max-sm:text-[11px] text-slate-500 mt-0.5">{reg.contact_name} &bull; {reg.email} {reg.phone ? `\u2022 ${reg.phone}` : ''}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Registered {new Date(reg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 max-sm:w-full">
                        <button className="px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 text-xs font-semibold cursor-pointer transition-all hover:bg-emerald-500 hover:text-white max-sm:flex-1" onClick={() => processRegistration(reg.id, 'approve', reg.company_name)}><Check className="w-3 h-3 inline mr-0.5 -mt-px" /> Approve</button>
                        <button className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold cursor-pointer transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 max-sm:flex-1" onClick={() => processRegistration(reg.id, 'reject', reg.company_name)}><X className="w-3 h-3 inline mr-0.5 -mt-px" /> Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-[14px] mb-[22px] overflow-hidden">
            <div className="text-sm max-sm:text-[13px] font-semibold text-slate-800 px-5 max-sm:px-3.5 py-4 max-sm:py-3 border-b border-slate-100 tracking-tight"><BarChart3 className="w-4 h-4 inline mr-1.5 -mt-px" /> Customer Activity Log</div>
            <div className="flex gap-2.5 px-5 max-sm:px-3.5 py-3.5 border-b border-slate-100 flex-wrap items-center">
              <select className="py-[7px] px-2.5 border-[1.5px] border-slate-200 rounded-lg text-[13px] bg-slate-50 text-slate-800 outline-none cursor-pointer focus:border-indigo-400" value={activityCustFilter} onChange={e => setActivityCustFilter(e.target.value)}>
                <option value="all">All customers</option>
              </select>
              <select className="py-[7px] px-2.5 border-[1.5px] border-slate-200 rounded-lg text-[13px] bg-slate-50 text-slate-800 outline-none cursor-pointer focus:border-indigo-400" value={activityTypeFilter} onChange={e => setActivityTypeFilter(e.target.value)}>
                <option value="all">All activity</option>
                <option value="login">Logins / Logouts</option>
                <option value="favorite">Favorites</option>
                <option value="order">Orders</option>
              </select>
              <button className="py-[7px] px-3.5 border-[1.5px] border-slate-200 rounded-lg bg-white text-xs text-slate-400 cursor-pointer ml-auto hover:border-red-200 hover:text-red-500" onClick={clearActivityLog}><Trash2 className="w-3 h-3 inline mr-1 -mt-px" /> Clear log</button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {filteredActivityLog.map((log, idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 py-[11px] border-b border-slate-100 last:border-b-0 text-[13px] transition-colors hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[15px] flex-shrink-0 ${log.type === 'login' ? 'bg-blue-50 text-blue-500' : log.type === 'logout' ? 'bg-amber-50 text-amber-500' : log.type === 'favorite' ? 'bg-pink-50 text-pink-500' : 'bg-emerald-50 text-emerald-500'}`}>
                    {renderActivityIcon(log)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800">{log.customer}</span>{' '}
                    <span className="text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{log.message}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0">{log.time}</span>
                </div>
              ))}
              {filteredActivityLog.length === 0 && <div className="py-10 text-center text-slate-400 text-[13px]">No activity</div>}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[14px] mb-[22px] overflow-hidden">
            <div className="text-sm font-semibold text-slate-800 px-5 py-4 border-b border-slate-100 tracking-tight"><Trophy className="w-4 h-4 inline mr-1.5 -mt-px" /> Customer Insights</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5 p-4 px-5 pb-5">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 px-4">
                <div className="text-xs font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Total Products</div>
                <div className="flex justify-between items-center py-1 text-xs border-b border-slate-100"><span className="text-slate-400">All</span><span className="font-semibold text-slate-800">{products.length}</span></div>
                <div className="flex justify-between items-center py-1 text-xs"><span className="text-slate-400">Visible</span><span className="font-semibold text-slate-800">{products.filter(p => !p.is_hidden).length}</span></div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 px-4">
                <div className="text-xs font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Customers</div>
                <div className="flex justify-between items-center py-1 text-xs border-b border-slate-100"><span className="text-slate-400">Total</span><span className="font-semibold text-slate-800">{customers.length}</span></div>
                <div className="flex justify-between items-center py-1 text-xs"><span className="text-slate-400">Active</span><span className="font-semibold text-slate-800">{customers.filter(c => c.is_active).length}</span></div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 px-4">
                <div className="text-xs font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Orders</div>
                <div className="flex justify-between items-center py-1 text-xs border-b border-slate-100"><span className="text-slate-400">Total</span><span className="font-semibold text-slate-800">{orders.length}</span></div>
                <div className="flex justify-between items-center py-1 text-xs"><span className="text-slate-400">This Month</span><span className="font-semibold text-slate-800">{getMonthOrders()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== ADD PRODUCT MODAL ========== */}
      <div className={`fixed inset-0 bg-black/40 z-[2000] items-center justify-center p-5 max-sm:p-0 max-sm:items-end ${activeModal === 'addProdModal' ? 'flex' : 'hidden'}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="bg-white border border-slate-200 rounded-[14px] max-sm:rounded-b-none p-[26px] max-sm:p-3.5 max-w-[460px] w-[90%] max-sm:max-w-full max-sm:w-full animate-[popIn_0.2s_ease] shadow-xl max-h-[90vh] max-sm:max-h-[calc(100vh-48px)] overflow-y-auto">
          <h2 className="text-lg max-sm:text-[15px] font-semibold text-slate-800 mb-4 max-sm:mb-3 tracking-tight">Add New Product</h2>
          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Product Name <span className="text-red-500 text-xs ml-0.5">*</span></label>
          <input
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${productFormErrors.name ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            type="text"
            placeholder="e.g. Lay's Texas Grilled BBQ"
            value={newProductForm.name}
            onChange={e => { setNewProductForm(prev => ({ ...prev, name: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
          />
          {productFormErrors.name && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {productFormErrors.name}</div>}

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">SKU / Item ID</label>
          <input
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${productFormErrors.sku ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            type="text"
            placeholder="e.g. B02214"
            value={newProductForm.sku}
            onChange={e => { setNewProductForm(prev => ({ ...prev, sku: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.sku; return n; }); }}
          />
          {productFormErrors.sku && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {productFormErrors.sku}</div>}

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Weight</label>
          <input className="w-full py-[9px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400" type="text" placeholder="e.g. 70g" value={newProductForm.weight} onChange={e => setNewProductForm(prev => ({ ...prev, weight: e.target.value }))} />

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Pack Size (bags per case)</label>
          <input className="w-full py-[9px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400" type="text" placeholder="e.g. 22bags/cs" value={newProductForm.bags_per_case} onChange={e => setNewProductForm(prev => ({ ...prev, bags_per_case: e.target.value }))} />

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Cases per Pallet</label>
          <input
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${productFormErrors.cases_per_pallet ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            type="number"
            min="1"
            placeholder="e.g. 60"
            value={newProductForm.cases_per_pallet}
            onChange={e => { setNewProductForm(prev => ({ ...prev, cases_per_pallet: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.cases_per_pallet; return n; }); }}
          />
          {productFormErrors.cases_per_pallet && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {productFormErrors.cases_per_pallet}</div>}

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Price</label>
          <input
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${productFormErrors.price ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 25.00"
            value={newProductForm.price}
            onChange={e => { setNewProductForm(prev => ({ ...prev, price: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.price; return n; }); }}
          />
          {productFormErrors.price && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {productFormErrors.price}</div>}

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Category <span className="text-red-500 text-xs ml-0.5">*</span></label>
          <select
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${productFormErrors.category_id ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            value={newProductForm.category_id}
            onChange={e => { setNewProductForm(prev => ({ ...prev, category_id: e.target.value ? parseInt(e.target.value) : '' })); setProductFormErrors(prev => { const n = { ...prev }; delete n.category_id; return n; }); }}
          >
            <option value="">Select a category</option>
            {superCategoriesList.map(superCat => (
              <optgroup key={superCat.id} label={superCat.name}>
                {(categoriesBySuper[superCat.id] || []).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {productFormErrors.category_id && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {productFormErrors.category_id}</div>}

          <div className="flex items-center gap-2 my-3 max-sm:my-2 text-[13px] text-slate-500 cursor-pointer select-none">
            <input type="checkbox" id="showPrice" checked={newProductForm.showPrice} onChange={e => setNewProductForm(prev => ({ ...prev, showPrice: e.target.checked }))} className="w-[18px] h-[18px] min-w-[18px] cursor-pointer accent-indigo-500 m-0 flex-shrink-0" />
            <label htmlFor="showPrice" className="text-[13px] text-slate-500 cursor-pointer select-none">Show price on product cards</label>
          </div>

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Product Picture</label>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={imageFileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <div
              className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all min-h-[140px] flex items-center justify-center ${isDraggingImage ? 'border-indigo-500 bg-indigo-50' : newProductForm.imageFile ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-500 hover:bg-indigo-50/50'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingImage(false); }}
              onDrop={handleImageDrop}
              onClick={() => imageFileInputRef.current?.click()}
            >
              {!newProductForm.imageFile && !newProductForm.image_url ? (
                <div className="text-center flex flex-col items-center gap-2">
                  <Camera className="w-9 h-9 text-slate-300" />
                  <div className="flex flex-col gap-0.5">
                    <strong className="text-slate-800 text-sm">Drag & drop image here</strong>
                    <span className="text-slate-400 text-xs">or click to select</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={newProductForm.imageFile ? getImagePreview() : newProductForm.image_url}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-md"
                  />
                  <div className="flex gap-2 flex-col">
                    <button type="button" className="px-3 py-1.5 rounded-md text-xs font-semibold border-none cursor-pointer transition-all bg-slate-200 text-slate-800 hover:bg-slate-300" onClick={(e) => { e.stopPropagation(); imageFileInputRef.current?.click(); }}><FolderOpen className="w-3 h-3 inline mr-1 -mt-px" /> Change</button>
                    <button type="button" className="px-3 py-1.5 rounded-md text-xs font-semibold border-none cursor-pointer transition-all bg-red-100 text-red-500 hover:bg-red-200" onClick={(e) => { e.stopPropagation(); clearImage(); }}><X className="w-3 h-3 inline mr-0.5 -mt-px" /> Remove</button>
                  </div>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 leading-snug">JPG, PNG, or WebP. Max 5MB. Recommended: 400x400px</div>
          </div>

          <div className="flex gap-2 mt-4 max-sm:mt-3">
            <button className="flex-1 py-2.5 max-sm:py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold cursor-pointer transition-all hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" onClick={closeModal} disabled={isSavingProduct}>Cancel</button>
            <button className="flex-1 py-2.5 max-sm:py-2.5 rounded-lg bg-indigo-500 border-none text-white text-sm font-semibold cursor-pointer transition-all hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" onClick={saveNewProduct} disabled={isSavingProduct || !isProductFormValid}>
              {isSavingProduct ? <><MoreHorizontal className="w-4 h-4 inline animate-pulse mr-1" /> Saving...</> : 'Add Product'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== EDIT PRODUCT MODAL ========== */}
      <div className={`fixed inset-0 bg-black/40 z-[2000] items-center justify-center max-sm:items-end ${activeModal === 'editProdModal' ? 'flex' : 'hidden'}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="bg-white rounded-2xl max-sm:rounded-b-none p-7 max-sm:p-3.5 w-[min(480px,94vw)] max-sm:max-w-full max-sm:w-full max-h-[90vh] max-sm:max-h-[calc(100vh-48px)] overflow-y-auto shadow-xl">
          <h2 className="text-[17px] max-sm:text-[15px] font-bold mb-4 max-sm:mb-3 text-slate-800">Edit Product</h2>
          {editingProduct && (
            <div className="grid grid-cols-2 max-sm:!grid-cols-1 gap-3 max-sm:gap-2">
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px]">Product Name</label>
                <input type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))} className="w-full py-[9px] px-3 border-[1.5px] border-slate-200 rounded-[9px] text-[13px] max-sm:!text-sm bg-slate-50 text-slate-800 outline-none transition-colors box-border focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px]">Price</label>
                <input type="number" step="0.01" value={editingProduct.price || ''} onChange={e => setEditingProduct(prev => ({ ...prev, price: e.target.value }))} className="w-full py-[9px] px-3 border-[1.5px] border-slate-200 rounded-[9px] text-[13px] max-sm:!text-sm bg-slate-50 text-slate-800 outline-none transition-colors box-border focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px]">SKU</label>
                <input type="text" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({ ...prev, sku: e.target.value }))} className="w-full py-[9px] px-3 border-[1.5px] border-slate-200 rounded-[9px] text-[13px] max-sm:!text-sm bg-slate-50 text-slate-800 outline-none transition-colors box-border focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px]">Weight</label>
                <input type="text" value={editingProduct.weight || ''} onChange={e => setEditingProduct(prev => ({ ...prev, weight: e.target.value }))} className="w-full py-[9px] px-3 border-[1.5px] border-slate-200 rounded-[9px] text-[13px] max-sm:!text-sm bg-slate-50 text-slate-800 outline-none transition-colors box-border focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px]">Category</label>
                <select value={editingProduct.category_id || ''} onChange={e => {
                  const val = e.target.value
                  if (!val) { setEditingProduct(prev => ({ ...prev, category_id: '', category: '' })); return }
                  const catId = parseInt(val)
                  const allCats = Object.values(categoriesBySuper || {}).flat()
                  const cat = allCats.find(c => c.id === catId)
                  const superCat = (superCategoriesList || []).find(sc => sc.id === cat?.super_category_id)
                  setEditingProduct(prev => ({
                    ...prev,
                    category_id: catId,
                    category: cat?.name || prev.category,
                    super_category_id: cat?.super_category_id || prev.super_category_id,
                    super_category: superCat?.name || prev.super_category
                  }))
                }} className="w-full py-[9px] px-3 border-[1.5px] border-slate-200 rounded-[9px] text-[13px] max-sm:!text-sm bg-slate-50 text-slate-800 outline-none transition-colors box-border focus:border-indigo-400">
                  <option value="">Select a category</option>
                  {superCategoriesList.map(sc => (
                    <optgroup key={sc.id} label={sc.name}>
                      {(categoriesBySuper[sc.id] || []).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px]">Stock Status</label>
                <select value={editingProduct.is_oos ? 1 : 0} onChange={e => setEditingProduct(prev => ({ ...prev, is_oos: parseInt(e.target.value) }))} className="w-full py-[9px] px-3 border-[1.5px] border-slate-200 rounded-[9px] text-[13px] max-sm:!text-sm bg-slate-50 text-slate-800 outline-none transition-colors box-border focus:border-indigo-400">
                  <option value={0}>In Stock</option>
                  <option value={1}>Out of Stock</option>
                </select>
              </div>
              <div>
                <div className="flex items-center gap-2 my-3 max-sm:my-2 text-[13px] text-slate-500 cursor-pointer select-none">
                  <input type="checkbox" id="editShowPrice" checked={!!editingProduct.show_price} onChange={e => setEditingProduct(prev => ({ ...prev, show_price: e.target.checked }))} className="w-[18px] h-[18px] min-w-[18px] cursor-pointer accent-indigo-500 m-0 flex-shrink-0" />
                  <label htmlFor="editShowPrice" className="text-[13px] text-slate-500 cursor-pointer select-none">Show price on cards</label>
                </div>
              </div>
              <div className="col-span-full max-sm:col-span-1">
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px]">Image URL</label>
                <div className="flex gap-3 max-sm:flex-col max-sm:gap-2 items-start mb-1">
                  <div className="w-[72px] h-[72px] max-sm:w-[60px] max-sm:h-[60px] rounded-xl border-[1.5px] border-slate-200 bg-slate-50 flex items-center justify-center text-[22px] overflow-hidden flex-shrink-0">
                    {editingProduct.image_url ? (
                      <img src={editingProduct.image_url} alt="Preview" className="w-full h-full object-cover rounded-[10px]" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input
                      className="w-full py-2 px-[11px] border-[1.5px] border-slate-200 rounded-lg text-[13px] bg-slate-50 text-slate-800 outline-none box-border focus:border-indigo-400"
                      type="text"
                      placeholder="Image URL"
                      value={editingProduct.image_url || ''}
                      onChange={e => setEditingProduct(prev => ({ ...prev, image_url: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2.5 mt-5 max-sm:mt-3 justify-end max-sm:flex-row">
            <button className="px-5 max-sm:flex-1 py-[9px] max-sm:py-2.5 border-[1.5px] border-slate-200 rounded-[9px] bg-white text-slate-500 text-[13px] cursor-pointer" onClick={closeModal} disabled={isSavingEditProduct}>Cancel</button>
            <button className="px-[22px] max-sm:flex-1 py-[9px] max-sm:py-2.5 border-none rounded-[9px] bg-indigo-500 text-white text-[13px] font-semibold cursor-pointer hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" onClick={saveEditProduct} disabled={isSavingEditProduct}>
              {isSavingEditProduct ? <><MoreHorizontal className="w-4 h-4 inline animate-pulse mr-1" /> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== ADD CUSTOMER MODAL ========== */}
      <div className={`fixed inset-0 bg-black/40 z-[2000] items-center justify-center p-5 max-sm:p-0 max-sm:items-end ${activeModal === 'addCustModal' ? 'flex' : 'hidden'}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="bg-white border border-slate-200 rounded-[14px] max-sm:rounded-b-none p-[26px] max-sm:p-3.5 max-w-[460px] w-[90%] max-sm:max-w-full max-sm:w-full animate-[popIn_0.2s_ease] shadow-xl max-h-[90vh] max-sm:max-h-[calc(100vh-48px)] overflow-y-auto">
          <h2 className="text-lg max-sm:text-[15px] font-semibold text-slate-800 mb-4 max-sm:mb-3 tracking-tight">Add Customer</h2>
          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Company Name <span className="text-red-500 text-xs ml-0.5">*</span></label>
          <input
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${customerFormErrors.company_name ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            type="text"
            placeholder="e.g. Happy Snacks Co."
            value={newCustomerForm.company_name}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, company_name: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.company_name; return n; }); }}
          />
          {customerFormErrors.company_name && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {customerFormErrors.company_name}</div>}

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Contact Name</label>
          <input className="w-full py-[9px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400" type="text" placeholder="e.g. John Smith" value={newCustomerForm.contact_name} onChange={e => setNewCustomerForm(prev => ({ ...prev, contact_name: e.target.value }))} />

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Email <span className="text-red-500 text-xs ml-0.5">*</span></label>
          <input
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${customerFormErrors.email ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            type="email"
            placeholder="buyer@company.com"
            value={newCustomerForm.email}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, email: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.email; return n; }); }}
          />
          {customerFormErrors.email && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {customerFormErrors.email}</div>}

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">Phone <span className="text-slate-300 text-[11px] font-normal ml-1">(optional)</span></label>
          <input
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${customerFormErrors.phone ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            type="tel"
            placeholder="e.g. 213-555-0100"
            value={newCustomerForm.phone}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, phone: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
          />
          {customerFormErrors.phone && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {customerFormErrors.phone}</div>}

          <label className="block text-[10px] max-sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-[5px] mt-3">View Preset <span className="text-red-500 text-xs ml-0.5">*</span></label>
          <select
            className={`w-full py-[9px] px-3 bg-slate-50 border rounded-lg text-slate-800 text-[13px] max-sm:!text-sm outline-none transition-colors box-border focus:border-indigo-400 ${customerFormErrors.preset ? '!border-red-500 bg-red-50/50' : 'border-slate-200'}`}
            value={newCustomerForm.preset}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, preset: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.preset; return n; }); }}
          >
            <option value="full">Full Catalog</option>
            <option value="chips">Chips Only</option>
            <option value="korean">Korean Snacks Only</option>
            <option value="custom">Custom</option>
          </select>
          {customerFormErrors.preset && <div className="text-[11px] text-red-500 mt-0.5 mb-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {customerFormErrors.preset}</div>}

          <div className="flex gap-2 mt-4 max-sm:mt-3">
            <button className="flex-1 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold cursor-pointer transition-all hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" onClick={closeModal} disabled={isSavingCustomer}>Cancel</button>
            <button className="flex-1 py-2.5 rounded-lg bg-indigo-500 border-none text-white text-sm font-semibold cursor-pointer transition-all hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" onClick={addCustomer} disabled={isSavingCustomer || !isCustomerFormValid}>
              {isSavingCustomer ? <><MoreHorizontal className="w-4 h-4 inline animate-pulse mr-1" /> Saving...</> : 'Add Customer'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== BULK CONFIRM MODAL ========== */}
      {bulkConfirmVisible && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) cancelBulkAction(); }}>
          <div className="bg-white rounded-2xl p-7 px-8 shadow-xl max-w-[420px] border border-slate-200">
            <div className="text-lg font-bold text-slate-800">
              {bulkConfirmAction === 'delete' && <span><Trash2 className="w-5 h-5 inline mr-1.5 -mt-0.5 text-red-500" /> Delete {bulkConfirmCount} products?</span>}
              {bulkConfirmAction === 'hide' && <span><Ban className="w-5 h-5 inline mr-1.5 -mt-0.5 text-amber-500" /> Hide {bulkConfirmCount} products?</span>}
              {bulkConfirmAction === 'show' && <span><Eye className="w-5 h-5 inline mr-1.5 -mt-0.5 text-emerald-500" /> Show {bulkConfirmCount} products?</span>}
            </div>
            <p className="text-sm text-slate-500 leading-relaxed my-3 mb-6">
              {bulkConfirmAction === 'delete' && (
                <>This will permanently delete <strong>{bulkConfirmCount} product{bulkConfirmCount !== 1 ? 's' : ''}</strong>. This cannot be undone.</>
              )}
              {bulkConfirmAction === 'hide' && (
                <>This will hide <strong>{bulkConfirmCount} product{bulkConfirmCount !== 1 ? 's' : ''}</strong> from all customers.</>
              )}
              {bulkConfirmAction === 'show' && (
                <>This will make <strong>{bulkConfirmCount} product{bulkConfirmCount !== 1 ? 's' : ''}</strong> visible to customers.</>
              )}
            </p>
            <div className="flex gap-2.5 justify-end">
              <button className="px-5 py-[9px] border-[1.5px] border-slate-200 rounded-[9px] bg-white text-slate-500 text-[13px] cursor-pointer" onClick={cancelBulkAction}>Cancel</button>
              <button
                className={`px-6 py-2.5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all ${bulkConfirmAction === 'delete' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                onClick={executeBulkAction}
              >
                {bulkConfirmAction === 'delete' && <span>Delete {bulkConfirmCount}</span>}
                {bulkConfirmAction === 'hide' && <span>Hide {bulkConfirmCount}</span>}
                {bulkConfirmAction === 'show' && <span>Show {bulkConfirmCount}</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ERROR TOAST ========== */}
      {errorToastVisible && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-500 text-white rounded-xl py-3 px-4 flex items-center gap-3 z-[3000] shadow-xl max-w-[480px] min-w-[280px]">
          <span className="flex-1 text-[13px] font-medium"><XCircle className="w-4 h-4 inline mr-1 -mt-px" /> {errorToastMessage}</span>
          <div className="flex gap-2 items-center">
            {errorToastRetry && <button className="px-3 py-1 bg-white/20 border-none rounded-md text-white text-xs font-semibold cursor-pointer hover:bg-white/30" onClick={retryErrorAction}>Retry</button>}
            <button className="bg-transparent border-none text-white/60 cursor-pointer text-sm p-0.5 hover:text-white" onClick={hideErrorToast}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ========== IMPORT MODAL ========== */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-5 max-sm:p-3" onClick={() => { if (!excelUploading) setImportModalOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full overflow-hidden max-sm:max-w-full" style={{ animation: 'popIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 m-0 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-indigo-500" /> Import Products</h3>
              <button onClick={() => { if (!excelUploading) { setImportModalOpen(false); setImportExcelFile(null); setImportImageFiles([]); } }}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center cursor-pointer transition-colors hover:bg-indigo-500 hover:border-indigo-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {/* Step 1: Excel */}
              <div>
                <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  Select Excel File
                </div>
                <label className={`flex items-center gap-3 p-3.5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${importExcelFile ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300'}`}>
                  <FileSpreadsheet className={`w-7 h-7 shrink-0 ${importExcelFile ? 'text-indigo-500' : 'text-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    {importExcelFile ? (
                      <><div className="text-sm font-medium text-slate-800 truncate">{importExcelFile.name}</div><div className="text-[11px] text-slate-400">{(importExcelFile.size / 1024).toFixed(0)} KB</div></>
                    ) : (
                      <><div className="text-sm text-slate-500">Click to select .xlsx or .csv</div><div className="text-[11px] text-slate-400">Use Export to get the template first</div></>
                    )}
                  </div>
                  {importExcelFile && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { setImportExcelFile(e.target.files?.[0] || null); e.target.value = ''; }} />
                </label>
              </div>

              {/* Step 2: Images */}
              <div>
                <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  Select Product Images
                  <span className="text-slate-400 font-normal text-[11px]">(optional)</span>
                </div>
                <label className={`flex items-center gap-3 p-3.5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${importImageFiles.length > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300'}`}>
                  <Camera className={`w-7 h-7 shrink-0 ${importImageFiles.length > 0 ? 'text-indigo-500' : 'text-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    {importImageFiles.length > 0 ? (
                      <><div className="text-sm font-medium text-slate-800">{importImageFiles.length} image{importImageFiles.length > 1 ? 's' : ''} selected</div><div className="text-[11px] text-slate-400 truncate">{importImageFiles.map(f => f.name).join(', ')}</div></>
                    ) : (
                      <><div className="text-sm text-slate-500">Click to select images from your computer</div><div className="text-[11px] text-slate-400">Filenames must match the Image column in Excel (e.g. tea.jpg)</div></>
                    )}
                  </div>
                  {importImageFiles.length > 0 && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => { setImportImageFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
                </label>
              </div>

              {/* Progress */}
              {importProgress && (
                <div className="flex items-center gap-2 text-sm text-indigo-500 font-medium">
                  <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin shrink-0"></div>
                  {importProgress}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-slate-200">
              <button onClick={() => { setImportModalOpen(false); setImportExcelFile(null); setImportImageFiles([]); }} disabled={excelUploading}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold cursor-pointer hover:bg-slate-200 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={runImport} disabled={!importExcelFile || excelUploading}
                className="flex-1 py-2.5 rounded-lg bg-indigo-500 border-none text-white text-sm font-semibold cursor-pointer hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {excelUploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Importing...</> : <><Upload className="w-4 h-4" /> Import</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== TOAST ========== */}
      <div className={`fixed bottom-[22px] left-1/2 -translate-x-1/2 bg-emerald-500 text-white rounded-xl py-2.5 px-4 text-[13px] z-[3000] shadow-xl whitespace-nowrap transition-all pointer-events-none ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3.5'}`}>{toastMessage}</div>

      {/* ADMIN MOBILE NAV */}
      <div className="hidden max-sm:!flex fixed bottom-0 left-0 right-0 w-full h-[60px] bg-white border-t border-slate-200 z-[500] justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom,0)]">
        <button className={`flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer text-[10px] px-1.5 py-1.5 relative whitespace-nowrap ${activePage === 'catalog' ? 'text-indigo-500' : 'text-slate-400'}`} onClick={() => showPage('catalog')}><Package className="w-5 h-5" />Catalog</button>
        <button className={`flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer text-[10px] px-1.5 py-1.5 relative whitespace-nowrap ${activePage === 'bulk-edit' ? 'text-indigo-500' : 'text-slate-400'}`} onClick={() => showPage('bulk-edit')}><Zap className="w-5 h-5" />Bulk Edit</button>
        <button className={`flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer text-[10px] px-1.5 py-1.5 relative whitespace-nowrap ${activePage === 'views' ? 'text-indigo-500' : 'text-slate-400'}`} onClick={() => showPage('views')}><Users className="w-5 h-5" />Views</button>
        <button className={`flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer text-[10px] px-1.5 py-1.5 relative whitespace-nowrap ${activePage === 'orders' ? 'text-indigo-500' : 'text-slate-400'}`} onClick={() => showPage('orders')}><ClipboardList className="w-5 h-5" />Orders{pendingOrderCount > 0 && <span className="absolute top-0 -right-0.5 bg-red-500 text-white text-[8px] font-bold px-1 py-px rounded-lg min-w-[14px] text-center">{pendingOrderCount}</span>}</button>
        <button className={`flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer text-[10px] px-1.5 py-1.5 relative whitespace-nowrap ${activePage === 'categories' ? 'text-indigo-500' : 'text-slate-400'}`} onClick={() => showPage('categories')}><FolderOpen className="w-5 h-5" />Categories</button>
      </div>
    </div>
  )
}

export default AdminPortal

'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import BulkEditView from './BulkEditView'

function AdminPortal({ onLogout, onSwitchToCustomer, currentUser }) {
  // ==================== STATE ====================
  const [activePage, setActivePage] = useState('catalog')
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
  const [pendingRegistrations, setPendingRegistrations] = useState([])
  const [activityLog, setActivityLog] = useState([
    { customer: 'Happy Snacks Co.', message: 'Logged in', type: 'login', icon: '\u{1F511}', time: 'just now' },
    { customer: 'Dragon Imports', message: "Favorited: Lay's Cheetos", type: 'favorite', icon: '\u2764\uFE0F', time: '5 min' }
  ])
  const [activityCustFilter, setActivityCustFilter] = useState('all')
  const [activityTypeFilter, setActivityTypeFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
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

  // ==================== COMPUTED ====================
  const hiddenCount = useMemo(() => products.filter(p => p.is_hidden).length, [products])
  const oosCount = useMemo(() => products.filter(p => p.is_oos).length, [products])

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
    e.target.closest('.cat-item').classList.add('cat-dragging')
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
    e.target.closest('.cat-item')?.classList.remove('cat-dragging')
    document.querySelectorAll('.cat-drag-over').forEach(el => el.classList.remove('cat-drag-over'))
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
    document.querySelectorAll('.cat-dragging').forEach(el => el.classList.remove('cat-dragging'))
    document.querySelectorAll('.cat-drag-over').forEach(el => el.classList.remove('cat-drag-over'))
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
        icon: '\u2699\uFE0F',
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
      if (!res.ok) { showToast('\u274C ' + (data.error || 'Failed to add')); return }
      setSuperCategoriesList(prev => [...prev, data.superCategory])
      setCategoriesBySuper(prev => ({ ...prev, [data.superCategory.id]: [] }))
      setNewSuperCatName('')
      showToast('\u2705 Super category added')
    } catch (e) { showToast('\u274C Failed to add super category') }
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
      if (!res.ok) { showToast('\u274C ' + (data.error || 'Failed to rename')); return }
      setSuperCategoriesList(prev => prev.map(sc => sc.id === id ? { ...sc, name: data.superCategory.name } : sc))
      setEditingSuperCatId(null)
      setEditingSuperCatName('')
      showToast('\u2705 Renamed')
    } catch (e) { showToast('\u274C Failed to rename') }
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
      if (!res.ok) { showToast('\u274C ' + (data.error || 'Failed to delete')); return }
      setSuperCategoriesList(prev => prev.filter(sc => sc.id !== id))
      setCategoriesBySuper(prev => { const next = { ...prev }; delete next[id]; return next })
      showToast('\u2705 Deleted')
    } catch (e) { showToast('\u274C Failed to delete') }
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
      if (!res.ok) { showToast('\u274C ' + (data.error || 'Failed to add')); return }
      setCategoriesBySuper(prev => ({ ...prev, [superId]: [...(prev[superId] || []), data.category] }))
      setNewSubCatName(prev => ({ ...prev, [superId]: '' }))
      showToast('\u2705 Subcategory added')
    } catch (e) { showToast('\u274C Failed to add subcategory') }
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
      if (!res.ok) { showToast('\u274C ' + (data.error || 'Failed to rename')); return }
      setCategoriesBySuper(prev => ({ ...prev, [superId]: (prev[superId] || []).map(c => c.id === id ? { ...c, name: data.category.name } : c) }))
      setEditingSubCatId(null)
      setEditingSubCatName('')
      showToast('\u2705 Renamed')
    } catch (e) { showToast('\u274C Failed to rename') }
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
      if (!res.ok) { showToast('\u274C ' + (data.error || 'Failed to delete')); return }
      setCategoriesBySuper(prev => ({ ...prev, [superId]: (prev[superId] || []).filter(c => c.id !== id) }))
      showToast('\u2705 Deleted')
    } catch (e) { showToast('\u274C Failed to delete') }
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
      params.set('limit', 0) // Load all products (limit=0 means unlimited per API)
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
      showToast('\u274C Failed to load customers')
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
      if (!res.ok) { showToast('\u274C ' + (data.error || 'Failed')); return }
      showToast(`\u2705 ${companyName} ${action === 'approve' ? 'approved' : 'rejected'}`)
      loadPendingRegistrations()
      loadCustomers()
    } catch (e) { showToast('\u274C Failed to process registration') }
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
        skus: o.skus || o.items?.length || 0
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
        showToast(`\u2705 ${data.deleted} products deleted`)
      } else {
        const is_hidden = action === 'hide'
        const res = await fetch('/api/admin/bulk/visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productIds: ids, is_hidden })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Bulk visibility update failed')
        showToast(`\u2705 ${data.updated} products ${is_hidden ? 'hidden' : 'shown'}`)
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
      showToast('\u274C Please fix validation errors')
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
        showToast('\u274C Not authorized \u2014 please log in again')
      } else if (response.status === 404) {
        showToast('\u274C Product not found')
      } else if (response.ok) {
        await loadProductsWithScrollPreserve()
        setActiveModal(null)
        setEditProductErrors({})
        showToast('\u2705 Product updated')
        logActivity(`Updated product: ${editingProduct.name}`)
      } else {
        showToast('\u274C ' + (data.error || 'Failed to update product'))
      }
    } catch (e) {
      console.error('Save error:', e)
      showToast('\u274C Network error \u2014 check connection')
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
        showToast('\u274C Not authorized \u2014 please log in again')
      } else if (response.status === 404) {
        showToast('\u274C Product not found')
        await loadProductsWithScrollPreserve()
      } else if (response.ok) {
        await loadProductsWithScrollPreserve()
        showToast('\u2705 Product deleted')
        logActivity('Deleted a product')
      } else {
        showToast('\u274C ' + (data.error || 'Failed to delete product'))
      }
    } catch (e) {
      console.error('Delete error:', e)
      showToast('\u274C Network error \u2014 check connection')
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
        showToast('\u2705 Product visibility toggled')
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
        showToast('\u274C Category ID not found')
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
        showToast(newHiddenStatus ? '\u{1F6AB} Category Hidden' : '\u{1F441} Category Visible')
        logActivity(`${newHiddenStatus ? 'Hidden' : 'Unhidden'} category: ${categoryName}`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Category visibility toggle failed:', response.status, errorData)
        showToast(`\u274C Failed to update (${response.status})`)
      }
    } catch (e) {
      console.error('Category visibility toggle error:', e)
      showToast('\u274C Failed to update')
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
      showToast(`\u2705 ${data.updated} products in "${catName}" ${isHide ? 'hidden' : 'shown'}`)
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
        showToast(newOosStatus ? '\u26A0\uFE0F Out of Stock' : '\u2713 In Stock')
        logActivity(`Stock status updated: ${product.name} \u2192 ${newOosStatus ? 'OOS' : 'In Stock'}`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('OOS toggle failed:', response.status, errorData)
        showToast(`\u274C Failed to update (${response.status})`)
      }
    } catch (e) {
      console.error('OOS toggle error:', e)
      showToast('\u274C Failed to update stock status')
    }
  }, [loadProductsWithScrollPreserve, showToast, logActivity])

  // ==================== IMAGE HANDLING ====================

  const processImageFile = useCallback((file) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('\u274C Only JPG, PNG, or WebP images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('\u274C Image must be smaller than 5MB')
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
      showToast('\u274C Please fix validation errors')
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
        showToast('\u274C Not authorized \u2014 please log in again')
      } else if (response.status === 409) {
        setProductFormErrors(prev => ({ ...prev, sku: data.error || 'SKU already exists' }))
        showToast('\u274C ' + (data.error || 'Duplicate entry'))
      } else if (response.status === 422) {
        if (data.errors) {
          setProductFormErrors(prev => ({ ...prev, ...data.errors }))
          const errorFields = Object.keys(data.errors).join(', ')
          showToast('\u274C Please fix: ' + errorFields)
        } else {
          showToast('\u274C ' + (data.error || 'Validation failed'))
        }
      } else if (response.ok) {
        await loadProducts()
        setActiveModal(null)
        setNewProductForm({ name: '', sku: '', weight: '', bags_per_case: '', cases_per_pallet: '', price: '', category_id: '', image_url: '', imageFile: null, showPrice: true })
        setProductFormErrors({})
        showToast('\u2705 Product added')
        logActivity(`Added new product: ${payload.name}`)
      } else {
        showToast('\u274C ' + (data.error || 'Failed to add product'))
      }
    } catch (e) {
      console.error('Add error:', e)
      showToast('\u274C ' + (e.message || 'Network error \u2014 check connection'))
    } finally {
      setIsSavingProduct(false)
    }
  }, [newProductForm, superCategoriesList, categoriesBySuper, loadProducts, showToast, logActivity])

  // ==================== CUSTOMER MANAGEMENT ====================

  const selectCustomer = useCallback((cust) => {
    const initialized = {
      ...cust,
      catHidden: cust.catHidden ? [...cust.catHidden] : [],
      customHidden: cust.customHidden ? [...cust.customHidden] : [],
      customOos: cust.customOos ? [...cust.customOos] : []
    }
    setSelectedCustomer(initialized)
    setExpandedViewCats({})
    setCustomerViewMode('custom')
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
      showToast('\u274C Please fix validation errors')
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
        showToast('\u274C Not authorized \u2014 please log in again')
      } else if (response.status === 409) {
        setCustomerFormErrors(prev => ({ ...prev, email: data.error || 'Email already exists' }))
        showToast('\u274C ' + (data.error || 'Email already registered'))
      } else if (response.ok) {
        await loadCustomers()
        setActiveModal(null)
        setNewCustomerForm({ company_name: '', contact_name: '', email: '', phone: '', preset: 'full' })
        setCustomerFormErrors({})
        showToast('\u2705 Customer added')
        logActivity(`Added customer: ${companyName}`)
      } else {
        showToast(`\u274C ${data.error || 'Failed to add customer'}`)
      }
    } catch (e) {
      console.error('Add customer error:', e)
      showToast('\u274C Network error \u2014 check connection')
    } finally {
      setIsSavingCustomer(false)
    }
  }, [newCustomerForm, loadCustomers, showToast, logActivity])

  const saveCustomerView = useCallback(async () => {
    if (!selectedCustomer) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/customers/${selectedCustomer.id}/view`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          catHidden: selectedCustomer.catHidden || [],
          customHidden: selectedCustomer.customHidden || [],
          customOos: selectedCustomer.customOos || []
        })
      })
      if (response.ok) {
        showToast('\u2705 View saved')
        logActivity(`Updated view for: ${selectedCustomer.company_name}`)
      } else {
        const errData = await response.json().catch(() => ({}))
        showToast(`\u26A0\uFE0F ${errData.error || 'Failed to save view'}`)
      }
    } catch (e) {
      showToast('\u26A0\uFE0F Saved locally (no connection)')
      logActivity(`Updated view for: ${selectedCustomer.company_name}`)
    }
  }, [selectedCustomer, showToast, logActivity])

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
      showToast('\u{1F4E6} Full catalog restored')
    } else if (preset === 'chips') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Chips & Savory Snacks') }))
      showToast('\u{1F954} Chips preset applied')
    } else if (preset === 'noodles') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Noodles & Rice') }))
      showToast('\u{1F35C} Noodles preset applied')
    } else if (preset === 'korean') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Korean Snacks') }))
      showToast('\u{1F371} Korean preset applied')
    } else if (preset === 'icecream') {
      setSelectedCustomer(prev => ({ ...prev, catHidden: ALL.filter(c => c !== 'Ice Cream') }))
      showToast('\u{1F366} Ice Cream preset applied')
    } else if (preset === 'custom') {
      showToast('\u270F\uFE0F Custom mode \u2014 adjust manually')
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
    showToast('\u{1F6AB} All categories hidden for this customer')
  }, [selectedCustomer, superCatNames, showToast])

  const showAllForCust = useCallback(() => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => ({ ...prev, catHidden: [], customHidden: [] }))
    setCustomerViewMode('full')
    showToast('\u{1F441} Full catalog restored')
  }, [selectedCustomer, showToast])

  const showOnlyForCust = useCallback((superCat) => {
    if (!selectedCustomer) return
    setSelectedCustomer(prev => ({
      ...prev,
      catHidden: superCatNames.filter(c => c !== superCat),
      customHidden: []
    }))
    setCustomerViewMode('custom')
    showToast(`\u{1F441} Only showing: ${superCat}`)
  }, [selectedCustomer, superCatNames, showToast])

  const resetCustomerView = useCallback(() => {
    if (!selectedCustomer) return
    if (!window.confirm(`Reset all visibility settings for ${selectedCustomer.company_name}?`)) return
    setSelectedCustomer(prev => ({ ...prev, catHidden: [], customHidden: [], customOos: [] }))
    setCustomerViewMode('full')
    showToast('\u2705 View reset \u2014 full catalog')
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
        showToast('\u2705 Order status updated')
        logActivity(`Updated order ${orderId} to ${newStatus}`)
      } else {
        showToast('\u274C Failed to update order status')
      }
    } catch (e) {
      console.error('Update order error:', e)
      showToast('\u274C Error updating order')
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
      showToast(newVal ? '\u2705 Registration enabled' : '\u2705 Registration disabled')
    } catch (e) {
      showToast(newVal ? '\u2705 Registration enabled (local)' : '\u2705 Registration disabled (local)')
    }
  }, [registrationEnabled, showToast])

  const clearActivityLog = useCallback(() => {
    if (window.confirm('Clear all activity logs?')) {
      setActivityLog([])
      showToast('\u2705 Log cleared')
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

  const renderPaginationButtons = () => {
    const buttons = []
    for (let p = 1; p <= paginationPages; p++) {
      if (Math.abs(p - paginationPage) <= 2 || p === 1 || p === paginationPages) {
        buttons.push(
          <button
            key={p}
            className={`pg-btn ${p === paginationPage ? 'active' : ''}`}
            onClick={() => changePage(p)}
          >{p}</button>
        )
      } else if (p === paginationPage - 3 || p === paginationPage + 3) {
        buttons.push(<span key={`e${p}`} className="pg-ellipsis">{'\u2026'}</span>)
      }
    }
    return buttons
  }

  // ==================== RENDER ====================

  return (
    <div className="admin-wrapper">
      {/* NAV */}
      <nav className="topnav">
        <div className="nav-left">
          <button className={`burger ${sidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}>
            <span></span><span></span><span></span>
          </button>
          <div className="brand">
            <div className="brand-logo">{'\u{1F525}'}</div>
            <span className="brand-name"><span>DR</span> Prepper</span>
          </div>
          <span className="admin-pill">Admin</span>
        </div>
        <div className="nav-right">
          <div className="nav-tabs">
            <button className={`nav-tab ${activePage === 'catalog' ? 'active' : ''}`} onClick={() => showPage('catalog')}>{'\u{1F4E6}'} Catalog</button>
            <button className={`nav-tab ${activePage === 'bulk-edit' ? 'active' : ''}`} onClick={() => showPage('bulk-edit')}>{'\u26A1'} Bulk Edit</button>
            <button className={`nav-tab ${activePage === 'views' ? 'active' : ''}`} onClick={() => showPage('views')}>{'\u{1F465}'} Customer Views</button>
            <button className={`nav-tab ${activePage === 'orders' ? 'active' : ''}`} onClick={() => showPage('orders')}>{'\u{1F4CB}'} Orders</button>
            <button className={`nav-tab ${activePage === 'categories' ? 'active' : ''}`} onClick={() => showPage('categories')}>{'\u{1F4C2}'} Categories</button>
            <button className={`nav-tab ${activePage === 'settings' ? 'active' : ''}`} onClick={() => showPage('settings')}>{'\u2699'} Settings</button>
          </div>
          {onSwitchToCustomer && <button className="btn-customer-view" onClick={onSwitchToCustomer}>{'\u{1F465}'} Customer View</button>}
          <button className="btn-logout" onClick={logout}>Sign out</button>
        </div>
      </nav>

      {/* ========== CATALOG PAGE ========== */}
      <div className={`page ${activePage === 'catalog' ? 'active' : ''}`}>
        <div className="catalog-wrap">
          <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar}></div>
          <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''} ${sidebarOpen ? 'open-mobile' : ''}`}>
            <div className="sb-top"><div className="sb-label">Categories</div></div>
            <div className="sb-search">
              <input type="text" placeholder="Search..." value={sidebarFilter} onChange={e => setSidebarFilter(e.target.value)} />
            </div>
            <div className={`sb-all ${currentFilter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); loadProducts(1); }}>
              <span style={{ fontSize: '14px' }}>{'\u{1F4E6}'}</span> All Products
              <span className="a-count">{products.length}</span>
            </div>
            <div className="sb-divider"></div>

            {categoryTree.filter(sc => !sidebarFilter || sc.name.toLowerCase().includes(sidebarFilter.toLowerCase()) || sc.subcats.some(c => c.toLowerCase().includes(sidebarFilter.toLowerCase()))).map(superCat => (
              <React.Fragment key={superCat.name}>
                <button
                  className={`sb-super-btn ${currentFilter === `super:${superCat.name}` ? 'active' : ''} ${expandedSuperCats[superCat.name] ? 'open' : ''}`}
                  onClick={() => toggleSuperCat(superCat.name)}
                >
                  <span className="s-emoji">{superCat.emoji}</span>
                  <span className="s-label">{superCat.name}</span>
                  <span className="s-cnt">{superCat.count}</span>
                  <span className="s-arr">{'\u203A'}</span>
                </button>
                <div className={`sb-cats ${expandedSuperCats[superCat.name] ? 'open' : ''}`}>
                  {superCat.subcats.filter(c => !sidebarFilter || c.toLowerCase().includes(sidebarFilter.toLowerCase())).map(cat => (
                    <div
                      key={cat}
                      className={`sb-cat ${currentFilter === `cat:${cat}` ? 'active' : ''}`}
                      onClick={() => { setFilter('cat', cat); loadProducts(1); }}
                    >
                      <span>{cat}</span>
                      <span className="c-cnt">{getCategoryCount(cat)}</span>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            ))}

            <div className="sb-divider"></div>
            <div className={`sb-special ${currentFilter === 'hidden' ? 'active' : ''}`} onClick={() => { setFilter('hidden'); loadProducts(1); }}>
              {'\u{1F6AB}'} Hidden <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--bg)', padding: '1px 6px', borderRadius: '20px', border: '1px solid var(--border)' }}>{hiddenCount}</span>
            </div>
            <div className={`sb-special ${currentFilter === 'oos' ? 'active' : ''}`} onClick={() => { setFilter('oos'); loadProducts(1); }}>
              {'\u26A0\uFE0F'} Out of Stock <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--bg)', padding: '1px 6px', borderRadius: '20px', border: '1px solid var(--border)' }}>{oosCount}</span>
            </div>
          </aside>

          <div className="catalog-main">
            <div className="cat-bar">
              <span className="cat-bar-title">{filterTitle}</span>
              <div className="search-box">
                <span style={{ color: 'var(--faint)', fontSize: '13px' }}>{'\u{1F50D}'}</span>
                <input type="text" placeholder="Search products, SKUs, ID\u2026" value={searchQuery} onChange={onSearchInput} />
              </div>
              <button className="btn-add-prod" onClick={() => openModal('addProdModal')}>+ Add Product</button>
            </div>

            {/* Filter Pills */}
            <div className="filter-pills-bar">
              <span className="filter-pills-label">Visibility:</span>
              <button className={`filter-pill ${visibilityFilter === 'all' ? 'active' : ''}`} onClick={() => handleVisibilityFilter('all')}>All</button>
              <button className={`filter-pill ${visibilityFilter === 'visible' ? 'active' : ''}`} onClick={() => handleVisibilityFilter('visible')}>Visible</button>
              <button className={`filter-pill ${visibilityFilter === 'hidden' ? 'active' : ''}`} onClick={() => handleVisibilityFilter('hidden')}>Hidden</button>
              <span className="filter-pills-sep">|</span>
              <span className="filter-pills-label">Stock:</span>
              <button className={`filter-pill ${stockFilter === 'all' ? 'active' : ''}`} onClick={() => handleStockFilter('all')}>All</button>
              <button className={`filter-pill ${stockFilter === 'in-stock' ? 'active' : ''}`} onClick={() => handleStockFilter('in-stock')}>In Stock</button>
              <button className={`filter-pill ${stockFilter === 'oos' ? 'active' : ''}`} onClick={() => handleStockFilter('oos')}>OOS</button>
              {superCatNames.length > 0 && <span className="filter-pills-sep">|</span>}
              {superCatNames.map(sc => (
                <button key={sc} className={`filter-pill sc-pill ${superCatFilter === sc ? 'active' : ''}`} onClick={() => handleSuperCatFilter(superCatFilter === sc ? '' : sc)}>{sc}</button>
              ))}
            </div>

            {/* Bulk Action Bar */}
            {selectedProductCount > 0 && (
              <div className="bulk-action-bar">
                <span className="bulk-count">{selectedProductCount} selected</span>
                <button className="bulk-btn bulk-show" onClick={() => startBulkAction('show')}>{'\u{1F441}'} Show all</button>
                <button className="bulk-btn bulk-hide" onClick={() => startBulkAction('hide')}>{'\u{1F6AB}'} Hide all</button>
                <button className="bulk-btn bulk-delete" onClick={() => startBulkAction('delete')}>{'\u{1F5D1}'} Delete all</button>
                <button className="bulk-btn bulk-clear" onClick={clearSelection}>{'\u2715'} Clear</button>
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="catalog-loading">
                <div className="loading-spinner"></div>
                <span>Loading products{'\u2026'}</span>
              </div>
            )}

            <div className="admin-catalog-content" style={{ display: isLoading ? 'none' : 'flex' }}>
              {/* No results state */}
              {!isLoading && products.length === 0 && (
                <div className="no-results">
                  <div className="no-results-icon">{'\u{1F50D}'}</div>
                  <div className="no-results-title">No products found</div>
                  <div className="no-results-sub">Try adjusting your search or filters</div>
                  <button className="btn-clear-filters" onClick={() => {
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
                <div key={superCat} className="super-cat-section">
                  <div className="super-cat-hdr">
                    <span className="super-cat-name">{superCat}</span>
                    <span className="super-cat-count">{superCatData.total}</span>
                  </div>

                  {Object.entries(superCatData.categories).map(([catName, catProds]) => (
                    <div key={catName} className="cat-section">
                      <div className="cat-section-hdr">
                        <label className="cat-select-all" title={isCategoryAllSelected(catProds) ? 'Deselect all' : 'Select all'}>
                          <input
                            type="checkbox"
                            checked={isCategoryAllSelected(catProds)}
                            ref={el => {
                              if (el) el.indeterminate = isCategoryPartialSelected(catProds)
                            }}
                            onChange={() => toggleAllInCategory(catProds)}
                          />
                        </label>
                        {catName}
                        <span className="cat-count-badge">{catProds.length}</span>
                        {categoryMetadata[catName] && (
                          <button
                            className="cat-visibility-toggle"
                            onClick={() => toggleCategoryVisibility(catName)}
                            title={categoryMetadata[catName].is_hidden ? 'Show category' : 'Hide category'}
                          >
                            {categoryMetadata[catName].is_hidden ? '\u{1F6AB}' : '\u{1F441}'}
                          </button>
                        )}
                        {categoryMetadata[catName] && (
                          <>
                            <button className="cat-bulk-btn" onClick={() => toggleCategoryAllProductsVisibility(categoryMetadata[catName].id, catName, true)} title="Hide all products in this category">Hide all</button>
                            <button className="cat-bulk-btn" onClick={() => toggleCategoryAllProductsVisibility(categoryMetadata[catName].id, catName, false)} title="Show all products in this category">Show all</button>
                          </>
                        )}
                      </div>
                      <div className="admin-grid">
                        {catProds.map(prod => (
                          <div key={prod.id} className={`admin-card ${prod.is_hidden ? 'hidden-prod' : ''} ${prod.is_oos ? 'oos-prod' : ''} ${selectedProducts[prod.id] ? 'selected-prod' : ''}`}>
                            <div className="card-top-row">
                              <label className="card-select-check">
                                <input type="checkbox" checked={!!selectedProducts[prod.id]} onChange={() => toggleProductSelect(prod.id)} />
                              </label>
                              <div className="card-badges">
                                {prod.is_hidden && <div className="badge b-hidden">Hidden</div>}
                                {prod.is_oos && <div className="badge b-oos">OOS</div>}
                                {!prod.is_hidden && <div className="badge b-visible">Visible</div>}
                              </div>
                            </div>
                            <img src={prod.image_url} className="card-img" alt={prod.name} />
                            <div className="card-info">
                              <div className="card-name">{prod.name}</div>
                              <div className="card-meta">{prod.category}</div>
                              <div className="card-sku">{prod.sku || 'N/A'}</div>
                              <div className="card-actions">
                                <button className="ca-btn" onClick={() => editProduct(prod)} disabled={isDeletingProduct === prod.id}>Edit</button>
                                <button className="ca-btn" onClick={() => deleteProduct(prod.id)} disabled={isDeletingProduct === prod.id}>
                                  {isDeletingProduct === prod.id ? '\u23F3' : 'Delete'}
                                </button>
                                <button className="ca-btn" onClick={() => toggleVisibility(prod)} title="Toggle visibility" disabled={isDeletingProduct === prod.id}>{prod.is_hidden ? '\u{1F441}' : '\u{1F6AB}'}</button>
                                <button className={`ca-btn ${prod.is_oos ? 'oos' : ''}`} onClick={() => toggleOosStatus(prod)} title="Toggle out of stock" disabled={isDeletingProduct === prod.id}>{prod.is_oos ? '\u26A0\uFE0F' : '\u2713'}</button>
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
                <div className="pagination-bar">
                  <span className="pagination-info">{paginationInfo}</span>
                  <div className="pagination-controls">
                    <button className="pg-btn" disabled={paginationPage <= 1} onClick={() => changePage(paginationPage - 1)}>{'\u2039'} Prev</button>
                    {renderPaginationButtons()}
                    <button className="pg-btn" disabled={paginationPage >= paginationPages} onClick={() => changePage(paginationPage + 1)}>Next {'\u203A'}</button>
                    <input
                      className="pg-jump"
                      type="number"
                      min={1}
                      max={paginationPages}
                      placeholder="Go to\u2026"
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
      <div className={`page ${activePage === 'bulk-edit' ? 'active' : ''}`}>
        <BulkEditView
          initialCustomers={customers}
          initialProducts={products}
          superCategories={superCategoriesList}
          categoriesBySuper={categoriesBySuper}
          onLoadProducts={loadProducts}
        />
      </div>

      {/* ========== CUSTOMER VIEWS PAGE ========== */}
      <div className={`page ${activePage === 'views' ? 'active' : ''}`}>
        <div className="views-layout">
          <div className="customer-list">
            <div className="clist-head">
              <span className="clist-title">Customers</span>
              <button className="btn-add-cust" onClick={() => openModal('addCustModal')}>+ Add</button>
            </div>
            <div className="clist-search">
              <input type="text" placeholder="{'\u{1F50D}'} Search\u2026" value={custSearchQuery} onChange={e => setCustSearchQuery(e.target.value)} />
            </div>
            <div className="customer-rows">
              {filteredCustomers.map(cust => (
                <div key={cust.id} className={`cust-row ${selectedCustomer?.id === cust.id ? 'active' : ''}`} onClick={() => selectCustomer(cust)}>
                  <div className="c-avatar" style={{ background: getAvatarColor(cust.company_name) }}>{cust.company_name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="c-name">{cust.company_name}</div>
                    <div className="c-email">{cust.email}</div>
                    <div className="c-pills">
                      <span className={`c-pill ${cust.is_active ? 'active' : ''}`} style={{ background: cust.is_active ? 'var(--green-bg)' : 'var(--bg)', color: cust.is_active ? 'var(--green)' : 'var(--muted)' }}>{cust.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {selectedCustomer ? (
            <div className="view-editor">
              <div className="ve-head">
                <div>
                  <div className="ve-name">{selectedCustomer.company_name}</div>
                  <div className="ve-email">{selectedCustomer.email}</div>
                </div>
                <div className="ve-actions">
                  <button className="btn-reset-all" onClick={resetCustomerView}>Reset All</button>
                  <button className="btn-save" onClick={saveCustomerView}>Save View</button>
                  <button className="btn-close-ve" onClick={() => setSelectedCustomer(null)}>{'\u2715'}</button>
                </div>
              </div>
              <div className="ve-presets">
                <span className="ve-preset-label">Presets:</span>
                <button className={`preset-btn ${customerViewMode === 'full' ? 'active' : ''}`} onClick={() => applyViewPreset('full')}>Full Catalog</button>
                <button className={`preset-btn ${customerViewMode === 'chips' ? 'active' : ''}`} onClick={() => applyViewPreset('chips')}>Chips Only</button>
                <button className={`preset-btn ${customerViewMode === 'noodles' ? 'active' : ''}`} onClick={() => applyViewPreset('noodles')}>Noodles Only</button>
                <button className={`preset-btn ${customerViewMode === 'korean' ? 'active' : ''}`} onClick={() => applyViewPreset('korean')}>Korean Only</button>
                <button className={`preset-btn ${customerViewMode === 'icecream' ? 'active' : ''}`} onClick={() => applyViewPreset('icecream')}>Ice Cream Only</button>
                <button className={`preset-btn ${customerViewMode === 'custom' ? 'active' : ''}`} onClick={() => applyViewPreset('custom')}>Custom</button>
              </div>
              <div className="ve-quick-actions">
                <button className="qa-btn danger" onClick={hideAllForCust}>{'\u{1F6AB}'} Hide All</button>
                <button className="qa-btn success" onClick={showAllForCust}>{'\u{1F441}'} Show All</button>
                <span className="ve-preset-label" style={{ marginLeft: '8px' }}>Only:</span>
                {superCatNames.map(sc => (
                  <button key={sc} className="qa-btn" onClick={() => showOnlyForCust(sc)}>{sc}</button>
                ))}
              </div>
              <div className="ve-hint">Toggle visibility per category or product. Changes only affect this customer.</div>

              <div className="ve-summary-bar">
                <span className="vs-num green">{customerVisibleCount} visible</span>
                <span className="vs-sep">{'\u00B7'}</span>
                <span className="vs-num muted">{customerHiddenCount} hidden</span>
                <span className="vs-sep">{'\u00B7'}</span>
                <span className="vs-num">{products.length} total</span>
              </div>

              {categoryTree.map(superCat => (
                <div key={superCat.name} className={`ve-cat-block ${isCatHiddenForCust(superCat.name) ? 'cat-hidden-block' : ''}`}>
                  <div className="ve-cat-head" onClick={() => toggleCatExpand(superCat.name)}>
                    <span className="ve-emoji">{superCat.emoji}</span>
                    <span className="ve-cat-label">{superCat.name}</span>
                    <span className="ve-cnt">{superCat.count}</span>
                    {isCatHiddenForCust(superCat.name) && <span className="cat-hidden-badge">Hidden</span>}
                    <button
                      className={`mini-toggle cat-vis-toggle ${!isCatHiddenForCust(superCat.name) ? 'on' : 'off'}`}
                      onClick={(e) => { e.stopPropagation(); toggleCatVisForCust(superCat.name); }}
                      title="Toggle category visibility for this customer"
                    ></button>
                    <button className={`arr-btn ${expandedViewCats[superCat.name] ? 'open' : ''}`}>{'\u203A'}</button>
                  </div>
                  <div className={`ve-cat-items ${!expandedViewCats[superCat.name] ? 'collapsed' : ''}`}>
                    {getProductsInCategory(superCat.name).map(prod => (
                      <div key={prod.id} className={`mini-card ${(!isProductVisibleForCustomer(prod.id) || prod.is_hidden) ? 'prod-hidden' : ''} ${(isProductOosForCustomer(prod.id) || prod.is_oos) ? 'prod-oos' : ''}`}>
                        <img src={prod.image_url} className="mini-img" alt="" />
                        <div className="mini-info">
                          <div className="mini-name">{prod.name}</div>
                          <div className="mini-sku">{prod.sku || 'N/A'}</div>
                        </div>
                        <div className="mini-controls">
                          <button
                            className={`mini-toggle ${isProductVisibleForCustomer(prod.id) ? 'on' : 'off'}`}
                            onClick={() => toggleProductForCustomer(prod.id)}
                            title="Toggle visibility"
                          ></button>
                          <button
                            className={`mini-oos-btn ${isProductOosForCustomer(prod.id) ? 'active' : ''}`}
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
            <div className="view-editor">
              <div className="ve-empty">
                <div style={{ fontSize: '40px', opacity: 0.2 }}>{'\u{1F465}'}</div>
                <div>Select a customer to configure their view</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== ORDERS PAGE ========== */}
      <div className={`page ${activePage === 'orders' ? 'active' : ''}`}>
        <div className="orders-main">
          <div className="page-header">
            <div className="page-title">All Orders</div>
            <div className="filter-row">
              <button className={`filter-btn ${orderFilter === 'all' ? 'active' : ''}`} onClick={() => setOrderFilterCb('all')}>All</button>
              <button className={`filter-btn ${orderFilter === 'pending' ? 'active' : ''}`} onClick={() => setOrderFilterCb('pending')}>Pending</button>
              <button className={`filter-btn ${orderFilter === 'processing' ? 'active' : ''}`} onClick={() => setOrderFilterCb('processing')}>Processing</button>
              <button className={`filter-btn ${orderFilter === 'received' ? 'active' : ''}`} onClick={() => setOrderFilterCb('received')}>Received</button>
            </div>
          </div>
          <div className="stats-row">
            <div className="stat-card red"><div className="stat-label">Total Orders</div><div className="stat-val">{orders.length}</div></div>
            <div className="stat-card yellow"><div className="stat-label">Pending</div><div className="stat-val">{orderStats.pending}</div></div>
            <div className="stat-card"><div className="stat-label">Processing</div><div className="stat-val">{orderStats.processing}</div></div>
            <div className="stat-card green"><div className="stat-label">Received</div><div className="stat-val">{orderStats.received}</div></div>
          </div>
          <div className="orders-table">
            <div className="ot-head">
              <div className="ot-th">Order #</div><div className="ot-th">Customer</div><div className="ot-th">Date</div>
              <div className="ot-th">Cases</div><div className="ot-th">SKUs</div><div className="ot-th">Status</div><div className="ot-th">Update</div>
            </div>
            {filteredOrders.map(order => (
              <div key={order.id} className="ot-row">
                <div className="ot-cell" data-label="Order #"><span className="ot-id">{order.id}</span></div>
                <div className="ot-cell" data-label="Customer">{order.customer_name}</div>
                <div className="ot-cell" data-label="Date">{formatDate(order.created_at)}</div>
                <div className="ot-cell" data-label="Cases">{order.cases}</div>
                <div className="ot-cell" data-label="SKUs">{order.skus}</div>
                <div className="ot-cell" data-label="Status">
                  <span className={`order-status s-${(order.status || '').toLowerCase()}`}>{order.status}</span>
                </div>
                <div className="ot-cell" data-label="Update">
                  <select className="status-select" value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>Received</option>
                  </select>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">{'\u{1F4CB}'}</div>
                <div className="empty-state-title">No orders yet</div>
                <div className="empty-state-sub">Orders from customers will appear here</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== CATEGORIES PAGE ========== */}
      <div className={`page ${activePage === 'categories' ? 'active' : ''}`}>
        <div className="categories-main">
          <div className="cat-manage-header">
            <h1>{'\u{1F4C2}'} Categories & Organization</h1>
            <p className="cat-manage-desc">Manage categories and super-categories. Changes update immediately for all users.</p>
          </div>

          <div className="cat-section">
            <div className="cat-section-title">Super Categories</div>
            <div className="cat-add-row">
              <input
                type="text"
                className="cat-add-input"
                placeholder="New super category name..."
                value={newSuperCatName}
                onChange={e => setNewSuperCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSuperCategory()}
              />
              <button className="cat-add-btn" onClick={addSuperCategory} disabled={!newSuperCatName.trim()}>+ Add</button>
            </div>
            <div className="cat-list-wrap">
              <div className="cat-drag-list" onDragOver={(e) => handleDragOver(e, 'super', null)} onDrop={(e) => handleDrop(e, 'super', null)}>
                {superCategoriesList.map((element, index) => (
                  <div key={element.id} className={`cat-item cat-super-item${dragContext?.listType === 'super' && dragOverItemRef.current === index && dragItemRef.current !== index ? ' cat-drag-over' : ''}`}
                    draggable={editingSuperCatId !== element.id}
                    onDragStart={(e) => handleDragStart(e, index, 'super', null)}
                    onDragEnter={(e) => handleDragEnter(e, index, 'super', null)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="cat-drag-handle" title="Drag to reorder">{'\u22EE\u22EE'}</div>
                    <div className="cat-item-content">
                      {editingSuperCatId === element.id ? (
                        <input
                          type="text"
                          className="cat-edit-input"
                          value={editingSuperCatName}
                          onChange={e => setEditingSuperCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameSuperCategory(element.id); if (e.key === 'Escape') setEditingSuperCatId(null); }}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="cat-item-name">{element.name}</span>
                          <span className="cat-item-order">Position: {index + 1}</span>
                        </>
                      )}
                    </div>
                    <span className="cat-item-prod-count">{getCategoryItemCount(element.id, 'super')} products</span>
                    <div className="cat-item-actions">
                      {editingSuperCatId === element.id ? (
                        <>
                          <button className="cat-action-btn cat-save" onClick={() => renameSuperCategory(element.id)} title="Save">{'\u2713'}</button>
                          <button className="cat-action-btn cat-cancel" onClick={() => setEditingSuperCatId(null)} title="Cancel">{'\u2715'}</button>
                        </>
                      ) : (
                        <>
                          <button className="cat-action-btn cat-edit" onClick={() => { setEditingSuperCatId(element.id); setEditingSuperCatName(element.name); }} title="Rename">{'\u270E'}</button>
                          <button className="cat-action-btn cat-delete" onClick={() => deleteSuperCategory(element.id, element.name)} title="Delete">{'\u{1F5D1}'}</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {superCategoriesList.map(superCat => (
            <div key={`cats-${superCat.id}`} className="cat-section">
              <div className="cat-section-title">{superCat.name} {'\u2014'} Subcategories</div>
              <div className="cat-add-row">
                <input
                  type="text"
                  className="cat-add-input"
                  placeholder={`New subcategory in ${superCat.name}...`}
                  value={newSubCatName[superCat.id] || ''}
                  onChange={e => setNewSubCatName(prev => ({ ...prev, [superCat.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addSubCategory(superCat.id)}
                />
                <button className="cat-add-btn" onClick={() => addSubCategory(superCat.id)} disabled={!(newSubCatName[superCat.id] || '').trim()}>+ Add</button>
              </div>
              <div className="cat-list-wrap">
                <div className="cat-drag-list" onDragOver={(e) => handleDragOver(e, 'sub', superCat.id)} onDrop={(e) => handleDrop(e, 'sub', superCat.id)}>
                  {(categoriesBySuper[superCat.id] || []).map((element, index) => (
                    <div key={element.id} className={`cat-item${dragContext?.listType === 'sub' && dragContext?.superId === superCat.id && dragOverItemRef.current === index && dragItemRef.current !== index ? ' cat-drag-over' : ''}`}
                      draggable={editingSubCatId !== element.id}
                      onDragStart={(e) => handleDragStart(e, index, 'sub', superCat.id)}
                      onDragEnter={(e) => handleDragEnter(e, index, 'sub', superCat.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="cat-drag-handle" title="Drag to reorder">{'\u22EE\u22EE'}</div>
                      <div className="cat-item-content">
                        {editingSubCatId === element.id ? (
                          <input
                            type="text"
                            className="cat-edit-input"
                            value={editingSubCatName}
                            onChange={e => setEditingSubCatName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') renameSubCategory(element.id, superCat.id); if (e.key === 'Escape') setEditingSubCatId(null); }}
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="cat-item-name">{element.name}</span>
                            <span className="cat-item-order">Position: {index + 1}</span>
                          </>
                        )}
                      </div>
                      <span className="cat-item-prod-count">{getCategoryItemCount(element.id, 'cat')} products</span>
                      <div className="cat-item-actions">
                        {editingSubCatId === element.id ? (
                          <>
                            <button className="cat-action-btn cat-save" onClick={() => renameSubCategory(element.id, superCat.id)} title="Save">{'\u2713'}</button>
                            <button className="cat-action-btn cat-cancel" onClick={() => setEditingSubCatId(null)} title="Cancel">{'\u2715'}</button>
                          </>
                        ) : (
                          <>
                            <button className="cat-action-btn cat-edit" onClick={() => { setEditingSubCatId(element.id); setEditingSubCatName(element.name); }} title="Rename">{'\u270E'}</button>
                            <button className="cat-action-btn cat-delete" onClick={() => deleteSubCategory(element.id, superCat.id, element.name)} title="Delete">{'\u{1F5D1}'}</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="cat-manage-footer">
            {catReorderStatus && <span className="cat-manage-status">{'\u2705'} {catReorderStatus}</span>}
          </div>
        </div>
      </div>

      {/* ========== SETTINGS PAGE ========== */}
      <div className={`page ${activePage === 'settings' ? 'active' : ''}`}>
        <div className="settings-main">
          <div className="settings-section">
            <div className="settings-section-title">{'\u{1F510}'} Customer Registration</div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Allow "Create Account" on login page</div>
                <div className="settings-row-desc">When enabled, customers will see a "Create account" link on the login page.</div>
              </div>
              <button className={`toggle-sw ${registrationEnabled ? 'on' : 'off'}`} onClick={toggleRegistration}></button>
            </div>
            {pendingRegistrations.filter(r => r.status === 'pending').length > 0 && (
              <div className="pending-section">
                <div className="pending-title">{'\u{1F4CB}'} Pending Approvals <span className="pending-badge">{pendingRegistrations.filter(r => r.status === 'pending').length}</span></div>
                <div className="pending-list">
                  {pendingRegistrations.filter(r => r.status === 'pending').map(reg => (
                    <div key={reg.id} className="pending-row">
                      <div className="pending-info">
                        <div className="pending-company">{reg.company_name}</div>
                        <div className="pending-detail">{reg.contact_name} {'\u2022'} {reg.email} {reg.phone ? `\u2022 ${reg.phone}` : ''}</div>
                        <div className="pending-date">Registered {new Date(reg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="pending-actions">
                        <button className="pending-btn pending-approve" onClick={() => processRegistration(reg.id, 'approve', reg.company_name)}>{'\u2713'} Approve</button>
                        <button className="pending-btn pending-reject" onClick={() => processRegistration(reg.id, 'reject', reg.company_name)}>{'\u2715'} Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="settings-section">
            <div className="settings-section-title">{'\u{1F4CA}'} Customer Activity Log</div>
            <div className="settings-activity-bar">
              <select className="settings-filter-sel" value={activityCustFilter} onChange={e => setActivityCustFilter(e.target.value)}>
                <option value="all">All customers</option>
              </select>
              <select className="settings-filter-sel" value={activityTypeFilter} onChange={e => setActivityTypeFilter(e.target.value)}>
                <option value="all">All activity</option>
                <option value="login">Logins / Logouts</option>
                <option value="favorite">Favorites</option>
                <option value="order">Orders</option>
              </select>
              <button className="settings-clear-btn" onClick={clearActivityLog}>{'\u{1F5D1}'} Clear log</button>
            </div>
            <div className="activity-log-wrap">
              {filteredActivityLog.map((log, idx) => (
                <div key={idx} className="activity-row">
                  <div className={`act-icon ${log.type}`}>{log.icon}</div>
                  <div className="act-body">
                    <span className="act-cust">{log.customer}</span>{' '}
                    <span className="act-detail">{log.message}</span>
                  </div>
                  <span className="act-time">{log.time}</span>
                </div>
              ))}
              {filteredActivityLog.length === 0 && <div className="act-empty">No activity</div>}
            </div>
          </div>
          <div className="settings-section">
            <div className="settings-section-title">{'\u{1F3C6}'} Customer Insights</div>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-card-name">{'\u{1F4E6}'} Total Products</div>
                <div className="insight-stat-row">
                  <span className="insight-stat-label">All</span>
                  <span className="insight-stat-val">{products.length}</span>
                </div>
                <div className="insight-stat-row">
                  <span className="insight-stat-label">Visible</span>
                  <span className="insight-stat-val">{products.filter(p => !p.is_hidden).length}</span>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-card-name">{'\u{1F465}'} Customers</div>
                <div className="insight-stat-row">
                  <span className="insight-stat-label">Total</span>
                  <span className="insight-stat-val">{customers.length}</span>
                </div>
                <div className="insight-stat-row">
                  <span className="insight-stat-label">Active</span>
                  <span className="insight-stat-val">{customers.filter(c => c.is_active).length}</span>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-card-name">{'\u{1F4CB}'} Orders</div>
                <div className="insight-stat-row">
                  <span className="insight-stat-label">Total</span>
                  <span className="insight-stat-val">{orders.length}</span>
                </div>
                <div className="insight-stat-row">
                  <span className="insight-stat-label">This Month</span>
                  <span className="insight-stat-val">{getMonthOrders()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== ADD PRODUCT MODAL ========== */}
      <div className={`modal-wrap ${activeModal === 'addProdModal' ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal">
          <h2>Add New Product</h2>
          <label className="form-label">Product Name <span className="req-star">*</span></label>
          <input
            className={`form-input ${productFormErrors.name ? 'input-error' : ''}`}
            type="text"
            placeholder="e.g. Lay's Texas Grilled BBQ"
            value={newProductForm.name}
            onChange={e => { setNewProductForm(prev => ({ ...prev, name: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
          />
          {productFormErrors.name && <div className="field-error">{productFormErrors.name}</div>}

          <label className="form-label">SKU / Item ID</label>
          <input
            className={`form-input ${productFormErrors.sku ? 'input-error' : ''}`}
            type="text"
            placeholder="e.g. B02214"
            value={newProductForm.sku}
            onChange={e => { setNewProductForm(prev => ({ ...prev, sku: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.sku; return n; }); }}
          />
          {productFormErrors.sku && <div className="field-error">{productFormErrors.sku}</div>}

          <label className="form-label">Weight</label>
          <input className="form-input" type="text" placeholder="e.g. 70g" value={newProductForm.weight} onChange={e => setNewProductForm(prev => ({ ...prev, weight: e.target.value }))} />

          <label className="form-label">Pack Size (bags per case)</label>
          <input className="form-input" type="text" placeholder="e.g. 22bags/cs" value={newProductForm.bags_per_case} onChange={e => setNewProductForm(prev => ({ ...prev, bags_per_case: e.target.value }))} />

          <label className="form-label">Cases per Pallet</label>
          <input
            className={`form-input ${productFormErrors.cases_per_pallet ? 'input-error' : ''}`}
            type="number"
            min="1"
            placeholder="e.g. 60"
            value={newProductForm.cases_per_pallet}
            onChange={e => { setNewProductForm(prev => ({ ...prev, cases_per_pallet: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.cases_per_pallet; return n; }); }}
          />
          {productFormErrors.cases_per_pallet && <div className="field-error">{productFormErrors.cases_per_pallet}</div>}

          <label className="form-label">Price</label>
          <input
            className={`form-input ${productFormErrors.price ? 'input-error' : ''}`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 25.00"
            value={newProductForm.price}
            onChange={e => { setNewProductForm(prev => ({ ...prev, price: e.target.value })); setProductFormErrors(prev => { const n = { ...prev }; delete n.price; return n; }); }}
          />
          {productFormErrors.price && <div className="field-error">{productFormErrors.price}</div>}

          <label className="form-label">Category <span className="req-star">*</span></label>
          <select
            className={`form-input ${productFormErrors.category_id ? 'input-error' : ''}`}
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
          {productFormErrors.category_id && <div className="field-error">{productFormErrors.category_id}</div>}

          <div className="form-checkbox">
            <input type="checkbox" id="showPrice" checked={newProductForm.showPrice} onChange={e => setNewProductForm(prev => ({ ...prev, showPrice: e.target.checked }))} />
            <label htmlFor="showPrice">Show price on product cards</label>
          </div>

          <label className="form-label">Product Picture</label>
          <div className="img-upload-wrapper">
            <input
              type="file"
              ref={imageFileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <div
              className={`img-drag-drop ${isDraggingImage ? 'active' : ''} ${newProductForm.imageFile ? 'uploaded' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingImage(false); }}
              onDrop={handleImageDrop}
              onClick={() => imageFileInputRef.current?.click()}
            >
              {!newProductForm.imageFile && !newProductForm.image_url ? (
                <div className="drag-content">
                  <div className="drag-icon">{'\u{1F4F8}'}</div>
                  <div className="drag-text">
                    <strong>Drag & drop image here</strong>
                    <span>or click to select</span>
                  </div>
                </div>
              ) : (
                <div className="upload-preview">
                  <img
                    src={newProductForm.imageFile ? getImagePreview() : newProductForm.image_url}
                    alt="Preview"
                    className="preview-img"
                  />
                  <div className="preview-actions">
                    <button type="button" className="btn-change" onClick={(e) => { e.stopPropagation(); imageFileInputRef.current?.click(); }}>{'\u{1F4C1}'} Change</button>
                    <button type="button" className="btn-remove" onClick={(e) => { e.stopPropagation(); clearImage(); }}>{'\u2715'} Remove</button>
                  </div>
                </div>
              )}
            </div>
            <div className="img-hint">JPG, PNG, or WebP. Max 5MB. Recommended: 400x400px</div>
          </div>

          <div className="modal-btns">
            <button className="btn-mx" onClick={closeModal} disabled={isSavingProduct}>Cancel</button>
            <button className="btn-mc" onClick={saveNewProduct} disabled={isSavingProduct || !isProductFormValid}>
              {isSavingProduct ? '\u23F3 Saving\u2026' : 'Add Product'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== EDIT PRODUCT MODAL ========== */}
      <div className={`edit-modal-wrap ${activeModal === 'editProdModal' ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="edit-modal">
          <h2>Edit Product</h2>
          {editingProduct && (
            <div className="edit-field-grid">
              <div className="edit-field">
                <label>Product Name</label>
                <input type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="edit-field">
                <label>Price</label>
                <input type="number" step="0.01" value={editingProduct.price || ''} onChange={e => setEditingProduct(prev => ({ ...prev, price: e.target.value }))} />
              </div>
              <div className="edit-field">
                <label>SKU</label>
                <input type="text" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({ ...prev, sku: e.target.value }))} />
              </div>
              <div className="edit-field">
                <label>Weight</label>
                <input type="text" value={editingProduct.weight || ''} onChange={e => setEditingProduct(prev => ({ ...prev, weight: e.target.value }))} />
              </div>
              <div className="edit-field">
                <label>Category</label>
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
                }}>
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
              <div className="edit-field">
                <label>Stock Status</label>
                <select value={editingProduct.is_oos ? 1 : 0} onChange={e => setEditingProduct(prev => ({ ...prev, is_oos: parseInt(e.target.value) }))}>
                  <option value={0}>In Stock</option>
                  <option value={1}>Out of Stock</option>
                </select>
              </div>
              <div className="edit-field">
                <div className="form-checkbox">
                  <input type="checkbox" id="editShowPrice" checked={!!editingProduct.show_price} onChange={e => setEditingProduct(prev => ({ ...prev, show_price: e.target.checked }))} />
                  <label htmlFor="editShowPrice">Show price on cards</label>
                </div>
              </div>
              <div className="edit-field full">
                <label>Image URL</label>
                <div className="edit-img-row">
                  <div className="edit-img-preview">
                    {editingProduct.image_url ? (
                      <img src={editingProduct.image_url} alt="Preview" />
                    ) : (
                      <span>{'\u{1F4F7}'}</span>
                    )}
                  </div>
                  <div className="edit-img-controls">
                    <input
                      className="edit-img-url"
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
          <div className="edit-modal-btns">
            <button className="btn-cancel" onClick={closeModal} disabled={isSavingEditProduct}>Cancel</button>
            <button className="btn-save-edit" onClick={saveEditProduct} disabled={isSavingEditProduct}>
              {isSavingEditProduct ? '\u23F3 Saving\u2026' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== ADD CUSTOMER MODAL ========== */}
      <div className={`modal-wrap ${activeModal === 'addCustModal' ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal">
          <h2>Add Customer</h2>
          <label className="form-label">Company Name <span className="req-star">*</span></label>
          <input
            className={`form-input ${customerFormErrors.company_name ? 'input-error' : ''}`}
            type="text"
            placeholder="e.g. Happy Snacks Co."
            value={newCustomerForm.company_name}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, company_name: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.company_name; return n; }); }}
          />
          {customerFormErrors.company_name && <div className="field-error">{customerFormErrors.company_name}</div>}

          <label className="form-label">Contact Name</label>
          <input className="form-input" type="text" placeholder="e.g. John Smith" value={newCustomerForm.contact_name} onChange={e => setNewCustomerForm(prev => ({ ...prev, contact_name: e.target.value }))} />

          <label className="form-label">Email <span className="req-star">*</span></label>
          <input
            className={`form-input ${customerFormErrors.email ? 'input-error' : ''}`}
            type="email"
            placeholder="buyer@company.com"
            value={newCustomerForm.email}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, email: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.email; return n; }); }}
          />
          {customerFormErrors.email && <div className="field-error">{customerFormErrors.email}</div>}

          <label className="form-label">Phone <span className="opt-label">(optional)</span></label>
          <input
            className={`form-input ${customerFormErrors.phone ? 'input-error' : ''}`}
            type="tel"
            placeholder="e.g. 213-555-0100"
            value={newCustomerForm.phone}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, phone: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
          />
          {customerFormErrors.phone && <div className="field-error">{customerFormErrors.phone}</div>}

          <label className="form-label">View Preset <span className="req-star">*</span></label>
          <select
            className={`form-input ${customerFormErrors.preset ? 'input-error' : ''}`}
            value={newCustomerForm.preset}
            onChange={e => { setNewCustomerForm(prev => ({ ...prev, preset: e.target.value })); setCustomerFormErrors(prev => { const n = { ...prev }; delete n.preset; return n; }); }}
          >
            <option value="full">Full Catalog</option>
            <option value="chips">Chips Only</option>
            <option value="korean">Korean Snacks Only</option>
            <option value="custom">Custom</option>
          </select>
          {customerFormErrors.preset && <div className="field-error">{customerFormErrors.preset}</div>}

          <div className="modal-btns">
            <button className="btn-mx" onClick={closeModal} disabled={isSavingCustomer}>Cancel</button>
            <button className="btn-mc" onClick={addCustomer} disabled={isSavingCustomer || !isCustomerFormValid}>
              {isSavingCustomer ? '\u23F3 Saving\u2026' : 'Add Customer'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== BULK CONFIRM MODAL ========== */}
      {bulkConfirmVisible && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) cancelBulkAction(); }}>
          <div className="modal-box bulk-confirm-box">
            <div className="modal-title">
              {bulkConfirmAction === 'delete' && <span>{'\u{1F5D1}'} Delete {bulkConfirmCount} products?</span>}
              {bulkConfirmAction === 'hide' && <span>{'\u{1F6AB}'} Hide {bulkConfirmCount} products?</span>}
              {bulkConfirmAction === 'show' && <span>{'\u{1F441}'} Show {bulkConfirmCount} products?</span>}
            </div>
            <p className="bulk-confirm-desc">
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
            <div className="modal-actions">
              <button className="btn-cancel" onClick={cancelBulkAction}>Cancel</button>
              <button
                className={`btn-confirm ${bulkConfirmAction === 'delete' ? 'btn-danger' : 'btn-primary'}`}
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
        <div className="error-toast">
          <span className="error-toast-msg">{'\u274C'} {errorToastMessage}</span>
          <div className="error-toast-actions">
            {errorToastRetry && <button className="error-retry-btn" onClick={retryErrorAction}>Retry</button>}
            <button className="error-dismiss-btn" onClick={hideErrorToast}>{'\u2715'}</button>
          </div>
        </div>
      )}

      {/* ========== TOAST ========== */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toastMessage}</div>

      <style jsx>{`
/* ==================== CSS CUSTOM PROPERTIES ==================== */
.admin-wrapper {
  --bg: #f5f4f0;
  --surface: #fff;
  --border: #e2ddd8;
  --border2: #ede9e4;
  --red: #c0392b;
  --red-light: #f9eeec;
  --red-mid: #e8c5c0;
  --text: #1a1a18;
  --sub: #5a5750;
  --muted: #9a948c;
  --faint: #d4cfc9;
  --green: #2d7a4f;
  --green-bg: #edf6f1;
  --yellow: #a05c00;
  --yellow-bg: #fef6e8;
  --blue: #1a5fa8;
  --shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.14);
  --sidebar-w: 236px;
  --nav-h: 56px;
  --radius: 10px;

  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg);
  font-family: 'DM Sans', sans-serif;
  color: var(--text);
}
.page { display: none; flex: 1; min-height: 0; }
.page.active { display: flex; flex-direction: column; }
.admin-catalog-content { display: flex; flex-direction: column; gap: 24px; }

/* ==================== TOPNAV ==================== */
.topnav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 20px; height: var(--nav-h); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 300; box-shadow: var(--shadow); }
.nav-left { display: flex; align-items: center; gap: 10px; }
.burger { width: 34px; height: 34px; border: none; background: transparent; cursor: pointer; display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; border-radius: 7px; transition: background 0.15s; }
.burger:hover { background: var(--bg); }
.burger span { display: block; width: 18px; height: 2px; background: var(--sub); border-radius: 2px; transition: all 0.25s; }
.burger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); background: var(--red); }
.burger.open span:nth-child(2) { opacity: 0; }
.burger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); background: var(--red); }
.brand { display: flex; align-items: center; gap: 8px; }
.brand-logo { width: 30px; height: 30px; background: var(--red); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.brand-name { font-weight: 600; font-size: 16px; color: var(--text); }
.brand-name span { color: var(--red); }
.admin-pill { background: var(--red-light); border: 1px solid var(--red-mid); color: var(--red); font-size: 10px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; padding: 2px 9px; border-radius: 20px; }
.nav-right { display: flex; align-items: center; gap: 8px; }
.nav-tabs { display: flex; gap: 2px; background: var(--bg); border-radius: 8px; padding: 3px; border: 1px solid var(--border); }
.nav-tab { padding: 5px 14px; border-radius: 6px; border: none; background: transparent; color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.nav-tab.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
.nav-tab:hover:not(.active) { background: var(--border2); color: var(--text); }
.btn-logout { padding: 6px 13px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--sub); font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
.btn-logout:hover { border-color: var(--red); color: var(--red); }
.btn-customer-view { padding: 6px 13px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--sub); font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
.btn-customer-view:hover { border-color: var(--red); color: var(--red); }

/* ==================== SIDEBAR ==================== */
.catalog-wrap { display: flex; flex: 1; min-height: 0; }
.sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.2); z-index: 150; display: none; top: var(--nav-h); }
.sidebar-overlay.open { display: block; }
.sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; height: calc(100vh - var(--nav-h)); position: sticky; top: var(--nav-h); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); z-index: 160; flex-shrink: 0; }
.sidebar.collapsed { transform: translateX(calc(-1 * var(--sidebar-w) - 1px)); position: fixed; left: 0; top: var(--nav-h); box-shadow: var(--shadow-lg); }
.sidebar.open-mobile { transform: translateX(0); box-shadow: var(--shadow-lg); }
.sb-top { padding: 14px 14px 6px; }
.sb-label { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.sb-search { padding: 0 10px 10px; }
.sb-search input { width: 100%; padding: 7px 11px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; box-sizing: border-box; }
.sb-search input:focus { border-color: var(--red); }
.sb-search input::placeholder { color: var(--muted); }
.sb-all { display: flex; align-items: center; gap: 8px; padding: 8px 14px; cursor: pointer; font-size: 13px; color: var(--sub); font-weight: 500; transition: all 0.15s; border-left: 3px solid transparent; background: transparent; border: none; width: 100%; text-align: left; }
.sb-all:hover { background: var(--bg); color: var(--text); }
.sb-all.active { color: var(--red); border-left-color: var(--red); background: var(--red-light); }
.a-count { margin-left: auto; font-size: 11px; color: var(--muted); background: var(--bg); padding: 1px 7px; border-radius: 20px; border: 1px solid var(--border); }
.sb-divider { height: 1px; background: var(--border); margin: 6px 0; }
.sb-super-btn { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; background: transparent; color: var(--sub); cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; text-align: left; transition: background 0.15s; border-left: 3px solid transparent; }
.sb-super-btn:hover { background: var(--bg); color: var(--text); }
.sb-super-btn.active { color: var(--red); border-left-color: var(--red); background: var(--red-light); }
.sb-super-btn .s-emoji { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
.sb-super-btn .s-label { flex: 1; }
.sb-super-btn .s-cnt { font-size: 11px; color: var(--muted); background: var(--bg); padding: 1px 6px; border-radius: 20px; border: 1px solid var(--border); }
.sb-super-btn .s-arr { font-size: 10px; color: var(--faint); transition: transform 0.2s; }
.sb-super-btn.open .s-arr { transform: rotate(90deg); }
.sb-cats { overflow: hidden; max-height: 0; transition: max-height 0.25s ease; }
.sb-cats.open { max-height: 700px; }
.sb-cat { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px 6px 40px; cursor: pointer; font-size: 12px; color: var(--sub); border-left: 3px solid transparent; transition: all 0.15s; background: transparent; border: none; width: 100%; text-align: left; }
.sb-cat:hover { color: var(--text); background: var(--bg); }
.sb-cat.active { color: var(--red); border-left-color: var(--red); background: var(--red-light); font-weight: 500; }
.c-cnt { font-size: 10px; color: var(--faint); }
.sb-special { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; cursor: pointer; font-size: 12px; color: var(--sub); transition: all 0.15s; background: transparent; border: none; width: 100%; text-align: left; }
.sb-special:hover { background: var(--bg); color: var(--text); }
.sb-special.active { color: var(--red); background: var(--red-light); }

/* ==================== CATALOG MAIN ==================== */
.catalog-main { flex: 1; padding: 20px 24px; overflow-y: auto; min-width: 0; }
.cat-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.cat-bar-title { font-size: 18px; font-weight: 600; color: var(--text); flex: 1; letter-spacing: -0.3px; }
.search-box { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); box-sizing: border-box; height: 36px; }
.search-box input { border: none; background: transparent; outline: none; font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text); width: 170px; }
.search-box input::placeholder { color: var(--faint); }
.btn-add-prod { padding: 8px 16px; background: var(--red); border: none; border-radius: 8px; color: #fff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.15s; white-space: nowrap; box-sizing: border-box; height: 36px; }
.btn-add-prod:hover { background: #a93226; }

/* ==================== FILTER PILLS ==================== */
.filter-pills-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); margin-bottom: 16px; border-radius: 8px; }
.filter-pills-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.filter-pills-sep { color: var(--border); font-size: 14px; margin: 0 2px; }
.filter-pill { padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg); color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap; text-transform: capitalize; }
.filter-pill:hover:not(.active) { border-color: var(--red-mid); color: var(--text); }
.filter-pill.active { background: var(--red); border-color: var(--red); color: #fff; font-weight: 600; }
.filter-pill.sc-pill.active { background: #2d7a4f; border-color: #2d7a4f; }

/* ==================== BULK ACTION BAR ==================== */
.bulk-action-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fff8e8; border-bottom: 2px solid #f0d49a; position: sticky; top: 0; z-index: 100; margin-bottom: 16px; border-radius: 8px; }
.bulk-count { font-size: 13px; font-weight: 600; color: #a05c00; margin-right: 4px; }
.bulk-btn { padding: 5px 14px; border-radius: 8px; border: none; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.bulk-show { background: #edf6f1; color: #2d7a4f; border: 1px solid #b7dfca; }
.bulk-show:hover { background: #d5eee3; }
.bulk-hide { background: var(--red-light); color: var(--red); border: 1px solid var(--red-mid); }
.bulk-hide:hover { background: #f5d0ca; }
.bulk-delete { background: #fdf0ef; color: #c0392b; border: 1px solid #f0c5c0; }
.bulk-delete:hover { background: #f9dedd; }
.bulk-clear { background: var(--bg); color: var(--muted); border: 1px solid var(--border); margin-left: auto; }
.bulk-clear:hover { color: var(--text); }

/* ==================== LOADING / NO RESULTS ==================== */
.catalog-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 80px 20px; color: var(--muted); font-size: 14px; }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--red); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.no-results { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 80px 20px; text-align: center; }
.no-results-icon { font-size: 40px; margin-bottom: 4px; }
.no-results-title { font-size: 18px; font-weight: 700; color: var(--text); }
.no-results-sub { font-size: 14px; color: var(--muted); }
.btn-clear-filters { margin-top: 12px; padding: 8px 20px; background: var(--red); color: #fff; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-clear-filters:hover { background: #a93226; }

/* ==================== PRODUCT GRID ==================== */
.super-cat-section { margin-bottom: 40px; border-bottom: 2px solid var(--border); padding-bottom: 32px; }
.super-cat-hdr { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.super-cat-name { text-transform: uppercase; letter-spacing: 0.5px; }
.super-cat-count { display: inline-block; background: var(--red); color: white; font-weight: 600; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-left: auto; }
.cat-section { margin-bottom: 28px; }
.cat-section-hdr { font-size: 12px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.cat-section-hdr::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.cat-count-badge { background: var(--bg); border: 1px solid var(--border); color: var(--muted); font-size: 10px; padding: 1px 7px; border-radius: 20px; font-weight: 500; letter-spacing: 0; }
.cat-visibility-toggle { background: none; border: none; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 4px; transition: all 0.15s; color: var(--muted); margin-left: auto; }
.cat-visibility-toggle:hover { background: var(--border); color: var(--text); }
.cat-bulk-btn { margin-left: 6px; padding: 2px 9px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.12s; }
.cat-bulk-btn:hover { border-color: var(--red-mid); color: var(--text); }
.cat-select-all { display: inline-flex; align-items: center; cursor: pointer; margin-right: 4px; }
.cat-select-all input[type="checkbox"] { cursor: pointer; accent-color: var(--red); width: 14px; height: 14px; }
.admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.admin-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 12px; position: relative; transition: all 0.15s; box-shadow: var(--shadow); }
.admin-card:hover { border-color: var(--red-mid); box-shadow: var(--shadow-md); }
.admin-card.hidden-prod { opacity: 0.5; border-style: dashed; background: var(--bg); }
.admin-card.oos-prod { border-color: #f0d49a; }
.admin-card.selected-prod { outline: 2px solid var(--red); outline-offset: -2px; background: var(--red-light) !important; }
.card-top-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.card-select-check { display: flex; align-items: center; cursor: pointer; flex-shrink: 0; margin: 0; padding: 0; line-height: 1; }
.card-select-check input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--red); margin: 0; }
.card-badges { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
.badge { padding: 2px 7px; border-radius: 20px; font-size: 9px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; }
.b-hidden { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }
.b-oos { background: var(--yellow-bg); color: var(--yellow); border: 1px solid #f0d49a; }
.b-visible { background: var(--green-bg); color: var(--green); border: 1px solid #b7dfca; }
.card-img { width: 80px; height: 80px; object-fit: contain; border-radius: 7px; background: #fff; display: block; margin: 0 auto 9px; border: 1px solid var(--border2); }
.card-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.card-name { font-size: 11px; color: var(--text); font-weight: 500; line-height: 1.35; height: 30px; overflow: hidden; margin-bottom: 3px; }
.card-meta { font-size: 10px; color: var(--muted); margin-bottom: 3px; }
.card-sku { font-size: 10px; color: var(--faint); font-family: monospace; margin-bottom: 9px; }
.card-actions { display: flex; gap: 5px; flex-wrap: wrap; }
.ca-btn { flex: 1; min-width: 46px; padding: 5px 3px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--sub); font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.15s; text-align: center; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
.ca-btn:hover { border-color: var(--red-mid); color: var(--red); background: var(--red-light); }
.ca-btn.oos { border-color: #f0d49a; color: var(--yellow); background: var(--yellow-bg); }

/* ==================== PAGINATION ==================== */
.pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; }
.pagination-info { font-size: 13px; color: var(--sub); }
.pagination-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.pg-btn { min-width: 32px; padding: 5px 10px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface); color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.12s; }
.pg-btn:hover:not(:disabled):not(.active) { border-color: var(--red-mid); color: var(--text); }
.pg-btn.active { background: var(--red); border-color: var(--red); color: #fff; font-weight: 600; }
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-ellipsis { padding: 0 4px; color: var(--muted); }
.pg-jump { width: 70px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--text); background: var(--bg); margin-left: 4px; }

/* ==================== CUSTOMER VIEWS ==================== */
.views-layout { display: flex; flex: 1; min-height: 0; }
.customer-list { width: 268px; min-width: 268px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; height: calc(100vh - var(--nav-h)); position: sticky; top: var(--nav-h); }
.clist-head { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.clist-title { font-size: 16px; font-weight: 600; color: var(--text); }
.btn-add-cust { padding: 5px 12px; background: var(--red); border: none; border-radius: 7px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.btn-add-cust:hover { background: #a93226; }
.clist-search { padding: 9px 14px; border-bottom: 1px solid var(--border); }
.clist-search input { width: 100%; padding: 7px 11px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; box-sizing: border-box; }
.clist-search input:focus { border-color: var(--red); }
.customer-rows { flex: 1; overflow-y: auto; }
.cust-row { padding: 11px 14px; cursor: pointer; border-bottom: 1px solid var(--border2); transition: all 0.15s; display: flex; align-items: center; gap: 10px; }
.cust-row:hover { background: var(--bg); }
.cust-row.active { background: var(--red-light); border-right: 2px solid var(--red); }
.c-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0; }
.c-name { font-size: 13px; color: var(--text); font-weight: 500; }
.c-email { font-size: 11px; color: var(--muted); }
.c-pills { display: flex; gap: 5px; margin-top: 3px; }
.c-pill { font-size: 9px; padding: 1px 7px; border-radius: 20px; font-weight: 500; }

/* ==================== VIEW EDITOR ==================== */
.view-editor { flex: 1; overflow-y: auto; padding: 22px; }
.ve-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--muted); font-size: 14px; gap: 10px; min-height: 300px; }
.ve-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
.ve-name { font-size: 22px; font-weight: 600; color: var(--text); letter-spacing: -0.3px; }
.ve-email { font-size: 13px; color: var(--muted); margin-top: 2px; }
.ve-actions { display: flex; gap: 7px; flex-shrink: 0; }
.btn-save { padding: 7px 18px; background: var(--red); border: none; border-radius: 8px; color: #fff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; }
.btn-save:hover { background: #a93226; }
.btn-reset-all { padding: 7px 13px; background: var(--surface); border: 1px solid #f0d49a; border-radius: 8px; color: var(--yellow); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn-reset-all:hover { border-color: var(--red); color: var(--red); background: var(--red-light); }
.btn-close-ve { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
.btn-close-ve:hover { background: var(--red-light); border-color: var(--red-mid); color: var(--red); }
.ve-presets { display: flex; gap: 5px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.ve-preset-label { font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
.preset-btn { padding: 5px 13px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--sub); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
.preset-btn.active { border-color: var(--red); color: var(--red); background: var(--red-light); }
.preset-btn:hover:not(.active) { border-color: var(--red-mid); color: var(--text); }
.ve-quick-actions { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; padding: 8px 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); }
.qa-btn { padding: 4px 11px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.qa-btn:hover { border-color: var(--red-mid); color: var(--red); background: var(--red-light); }
.qa-btn.danger { border-color: #f0d49a; color: var(--yellow); background: var(--yellow-bg); }
.qa-btn.danger:hover { border-color: var(--red); color: var(--red); background: var(--red-light); }
.qa-btn.success { border-color: #b7dfca; color: var(--green); background: var(--green-bg); }
.qa-btn.success:hover { border-color: var(--green); }
.ve-hint { font-size: 12px; color: var(--sub); padding: 9px 12px; background: var(--bg); border-radius: 8px; border-left: 3px solid var(--red); margin-bottom: 16px; }
.ve-summary-bar { display: flex; gap: 6px; align-items: center; margin-bottom: 14px; padding: 8px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; font-size: 12px; }
.vs-num { font-weight: 600; color: var(--text); }
.vs-num.green { color: var(--green); }
.vs-num.muted { color: var(--muted); }
.vs-sep { color: var(--faint); }
.ve-cat-block { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 10px; overflow: hidden; box-shadow: var(--shadow); }
.ve-cat-head { padding: 11px 16px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid var(--border); background: #faf9f7; }
.ve-emoji { font-size: 15px; }
.ve-cat-label { flex: 1; font-size: 14px; font-weight: 600; color: var(--text); }
.ve-cnt { font-size: 11px; color: var(--muted); }
.cat-vis-toggle { margin-right: 4px; flex-shrink: 0; }
.cat-hidden-badge { font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 20px; background: var(--bg); color: var(--muted); border: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.3px; }
.cat-hidden-block > .ve-cat-head { opacity: 0.65; background: var(--bg); }
.arr-btn { background: none; border: none; color: var(--faint); font-size: 11px; cursor: pointer; transition: transform 0.2s; padding: 3px; }
.arr-btn.open { transform: rotate(90deg); }
.ve-cat-items { padding: 10px 12px 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 7px; }
.ve-cat-items.collapsed { display: none; }
.mini-card { background: var(--bg); border: 1.5px solid var(--border); border-radius: 8px; padding: 8px; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
.mini-card:hover { border-color: var(--red-mid); }
.mini-card.prod-hidden { opacity: 0.45; border-style: dashed; }
.mini-card.prod-oos { border-color: #f0d49a; }
.mini-img { width: 36px; height: 36px; object-fit: contain; border-radius: 5px; background: var(--surface); flex-shrink: 0; border: 1px solid var(--border); }
.mini-info { flex: 1; min-width: 0; }
.mini-name { font-size: 11px; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-sku { font-size: 9px; color: var(--muted); font-family: monospace; }
.mini-controls { display: flex; flex-direction: column; gap: 3px; flex-shrink: 0; }
.mini-toggle { width: 30px; height: 16px; border-radius: 8px; border: none; cursor: pointer; position: relative; transition: background 0.2s; }
.mini-toggle.on { background: var(--green); }
.mini-toggle.off { background: var(--faint); }
.mini-toggle::after { content: ''; position: absolute; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
.mini-toggle.on::after { left: 16px; }
.mini-toggle.off::after { left: 2px; }
.mini-oos-btn { width: 30px; height: 16px; border-radius: 4px; border: 1px solid var(--border); background: var(--surface); font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 700; color: var(--muted); cursor: pointer; text-align: center; line-height: 14px; padding: 0; transition: all 0.15s; }
.mini-oos-btn.active { background: var(--yellow-bg); border-color: #f0d49a; color: var(--yellow); }
.mini-oos-btn:hover { border-color: var(--red-mid); color: var(--red); }

/* ==================== ORDERS PAGE ==================== */
.orders-main { flex: 1; padding: 22px; overflow-y: auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 22px; font-weight: 600; color: var(--text); letter-spacing: -0.3px; }
.filter-row { display: flex; gap: 5px; }
.filter-btn { padding: 5px 13px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface); color: var(--sub); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
.filter-btn.active { background: var(--red); border-color: var(--red); color: #fff; }
.filter-btn:hover:not(.active) { border-color: var(--red-mid); color: var(--red); }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow); }
.stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 7px; }
.stat-val { font-size: 28px; font-weight: 600; color: var(--text); }
.stat-card.red .stat-val { color: var(--red); }
.stat-card.green .stat-val { color: var(--green); }
.stat-card.yellow .stat-val { color: var(--yellow); }
.orders-table { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
.ot-head { display: grid; grid-template-columns: 120px 1fr 130px 80px 70px 110px 110px; background: var(--bg); border-bottom: 1px solid var(--border); }
.ot-th { padding: 10px 14px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); }
.ot-row { display: grid; grid-template-columns: 120px 1fr 130px 80px 70px 110px 110px; border-bottom: 1px solid var(--border2); transition: background 0.12s; }
.ot-row:hover { background: var(--bg); }
.ot-row:last-child { border-bottom: none; }
.ot-cell { padding: 13px 14px; font-size: 12px; display: flex; align-items: center; }
.ot-id { font-weight: 600; font-size: 13px; color: var(--red); }
.order-status { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
.s-received { background: var(--green-bg); color: var(--green); border: 1px solid #b7dfca; }
.s-processing { background: var(--yellow-bg); color: var(--yellow); border: 1px solid #f0d49a; }
.s-pending { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }
.status-select { background: var(--surface); border: 1px solid var(--border); border-radius: 7px; color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 11px; padding: 4px 8px; cursor: pointer; }
.status-select:focus { outline: none; border-color: var(--red); }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 60px 20px; text-align: center; border-top: 1px dashed var(--border); }
.empty-state-icon { font-size: 36px; margin-bottom: 4px; opacity: 0.5; }
.empty-state-title { font-size: 15px; font-weight: 600; color: var(--text); }
.empty-state-sub { font-size: 13px; color: var(--muted); }

/* ==================== CATEGORIES PAGE ==================== */
.categories-main { display: flex; flex-direction: column; gap: 24px; padding: 24px; max-width: 900px; margin: 0 auto; width: 100%; overflow-y: auto; }
.cat-manage-header { text-align: center; margin-bottom: 12px; }
.cat-manage-header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; color: var(--text); }
.cat-manage-desc { font-size: 13px; color: var(--muted); }
.categories-main .cat-section { display: flex; flex-direction: column; gap: 12px; margin-bottom: 0; }
.categories-main .cat-section-title { font-size: 14px; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.cat-list-wrap { display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.02); border-radius: 10px; padding: 12px; border: 1px solid var(--border); }
.cat-drag-list { display: flex; flex-direction: column; gap: 8px; }
.cat-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; transition: all 0.15s; }
.cat-item:hover { border-color: var(--text); }
.cat-drag-handle { color: var(--muted); font-size: 14px; flex-shrink: 0; user-select: none; cursor: grab; }
.cat-drag-handle:active { cursor: grabbing; }
.cat-item[draggable="true"] { cursor: grab; }
.cat-item[draggable="true"]:active { cursor: grabbing; }
.cat-item.cat-dragging { opacity: 0.4; border-style: dashed; border-color: var(--red); }
.cat-item.cat-drag-over { border-color: var(--red); box-shadow: 0 -2px 0 0 var(--red); }
.cat-item-content { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.cat-item-name { font-size: 14px; font-weight: 500; color: var(--text); }
.cat-item-order { font-size: 11px; color: var(--muted); }
.cat-item-prod-count { font-size: 12px; color: var(--sub); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 12px; white-space: nowrap; flex-shrink: 0; }
.cat-super-item { background: var(--bg); border: 2px solid var(--border); }
.cat-super-item:hover { border-color: #c0392b; }
.cat-add-row { display: flex; gap: 8px; margin-bottom: 4px; }
.cat-add-input { flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text); background: var(--surface); outline: none; }
.cat-add-input:focus { border-color: var(--red); }
.cat-add-input::placeholder { color: var(--muted); }
.cat-add-btn { padding: 8px 16px; background: var(--red); border: none; border-radius: 8px; color: #fff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.cat-add-btn:hover { background: #a93226; }
.cat-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cat-edit-input { padding: 4px 8px; border: 1px solid var(--red); border-radius: 6px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); background: var(--surface); outline: none; width: 100%; }
.cat-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.cat-action-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.cat-action-btn:hover { border-color: var(--text); color: var(--text); }
.cat-action-btn.cat-save { border-color: var(--green); color: var(--green); }
.cat-action-btn.cat-save:hover { background: var(--green-bg); }
.cat-action-btn.cat-cancel:hover { border-color: var(--red); color: var(--red); }
.cat-action-btn.cat-edit:hover { border-color: var(--red); color: var(--red); }
.cat-action-btn.cat-delete { color: var(--muted); }
.cat-action-btn.cat-delete:hover { border-color: var(--red); color: var(--red); background: var(--red-light); }
.cat-manage-footer { display: flex; justify-content: center; margin-top: 12px; }
.cat-manage-status { font-size: 13px; color: #27ae60; padding: 8px 16px; background: rgba(39,174,96,0.1); border-radius: 20px; border: 1px solid rgba(39,174,96,0.3); animation: fadeIn 0.3s; }

/* ==================== SETTINGS PAGE ==================== */
.settings-main { padding: 28px; max-width: 780px; margin: 0 auto; overflow-y: auto; }
.settings-section { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 22px; overflow: hidden; }
.settings-section-title { font-size: 14px; font-weight: 600; color: var(--text); padding: 16px 20px; border-bottom: 1px solid #ede9e4; letter-spacing: -0.2px; }
.settings-row { display: flex; align-items: center; gap: 20px; padding: 16px 20px; }
.settings-row-info { flex: 1; }
.settings-row-label { font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 3px; }
.settings-row-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
.toggle-sw { width: 36px; height: 20px; border-radius: 10px; border: none; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
.toggle-sw.on { background: var(--green); }
.toggle-sw.off { background: var(--faint); }
.toggle-sw::after { content: ''; position: absolute; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.toggle-sw.on::after { left: 19px; }
.toggle-sw.off::after { left: 3px; }
.pending-section { padding: 16px 20px; border-top: 1px solid var(--border); }
.pending-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.pending-badge { background: var(--red); color: #fff; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 20px; }
.pending-list { display: flex; flex-direction: column; gap: 8px; }
.pending-row { display: flex; align-items: center; gap: 16px; padding: 12px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
.pending-info { flex: 1; min-width: 0; }
.pending-company { font-size: 14px; font-weight: 600; color: var(--text); }
.pending-detail { font-size: 12px; color: var(--sub); margin-top: 2px; }
.pending-date { font-size: 11px; color: var(--muted); margin-top: 2px; }
.pending-actions { display: flex; gap: 6px; flex-shrink: 0; }
.pending-btn { padding: 6px 14px; border-radius: 7px; border: none; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.pending-approve { background: var(--green-bg); color: var(--green); border: 1px solid #b7dfca; }
.pending-approve:hover { background: var(--green); color: #fff; }
.pending-reject { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }
.pending-reject:hover { background: var(--red-light); color: var(--red); border-color: var(--red-mid); }
.settings-activity-bar { display: flex; gap: 10px; padding: 14px 20px; border-bottom: 1px solid #ede9e4; flex-wrap: wrap; align-items: center; }
.settings-filter-sel { padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; background: var(--bg); color: var(--text); outline: none; cursor: pointer; }
.settings-filter-sel:focus { border-color: var(--red); }
.settings-clear-btn { padding: 7px 14px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--surface); font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--muted); cursor: pointer; margin-left: auto; }
.settings-clear-btn:hover { border-color: #e8b4b4; color: var(--red); }
.activity-log-wrap { max-height: 420px; overflow-y: auto; }
.activity-row { display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid #ede9e4; font-size: 13px; transition: background 0.1s; }
.activity-row:last-child { border-bottom: none; }
.activity-row:hover { background: var(--bg); }
.act-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.act-icon.login { background: #e8f4fd; color: #2980b9; }
.act-icon.logout { background: #fef6e8; color: #e67e22; }
.act-icon.favorite { background: #fde8f0; color: #e74c8c; }
.act-icon.order { background: var(--green-bg); color: var(--green); }
.act-body { flex: 1; min-width: 0; }
.act-cust { font-weight: 600; color: var(--text); }
.act-detail { color: var(--sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.act-time { font-size: 11px; color: var(--muted); white-space: nowrap; flex-shrink: 0; }
.act-empty { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }
.insights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; padding: 16px 20px 20px; }
.insight-card { background: var(--bg); border: 1px solid #ede9e4; border-radius: 11px; padding: 14px 16px; }
.insight-card-name { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.insight-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #ede9e4; }
.insight-stat-row:last-child { border-bottom: none; }
.insight-stat-label { color: var(--muted); }
.insight-stat-val { font-weight: 600; color: var(--text); }

/* ==================== MODALS ==================== */
.modal-wrap { position: fixed; inset: 0; background: rgba(26,26,24,0.4); z-index: 500; display: none; align-items: center; justify-content: center; padding: 20px; }
.modal-wrap.open { display: flex; }
.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 26px; max-width: 460px; width: 90%; animation: popIn 0.2s ease; box-shadow: var(--shadow-lg); max-height: 90vh; overflow-y: auto; }
@keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.modal h2 { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 16px; letter-spacing: -0.3px; }
.form-label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; margin-top: 12px; }
.form-input { width: 100%; padding: 9px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.form-input:focus { border-color: var(--red); }
.input-error { border-color: #e53e3e !important; background: rgba(229,62,62,0.05); }
.field-error { font-size: 11px; color: #e53e3e; margin-top: 3px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
.field-error::before { content: '\u26A0'; font-size: 10px; }
.req-star { color: #e53e3e; font-size: 12px; margin-left: 2px; }
.opt-label { color: var(--faint); font-size: 11px; font-weight: 400; margin-left: 4px; }
.form-checkbox { display: flex; align-items: center; gap: 8px; margin: 12px 0; font-size: 13px; color: var(--sub); cursor: pointer; user-select: none; }
.form-checkbox input[type="checkbox"] { width: 18px; height: 18px; min-width: 18px; cursor: pointer; accent-color: var(--red); margin: 0; flex-shrink: 0; }
.form-checkbox label { font-size: 13px; color: var(--sub); cursor: pointer; user-select: none; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.modal-btns { display: flex; gap: 8px; margin-top: 18px; }
.modal-btns button { flex: 1; padding: 10px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
.btn-mc { background: var(--red); color: #fff; }
.btn-mc:hover { background: #a93226; }
.btn-mx { background: var(--bg); border: 1px solid var(--border) !important; color: var(--sub); }
.btn-mx:hover { border-color: var(--red) !important; color: var(--red); }

/* Image upload */
.img-upload-wrapper { display: flex; flex-direction: column; gap: 8px; }
.img-drag-drop { border: 2px dashed var(--border); border-radius: 8px; padding: 24px; background: var(--bg); cursor: pointer; transition: all 0.2s; min-height: 140px; display: flex; align-items: center; justify-content: center; }
.img-drag-drop:hover { border-color: var(--red); background: rgba(192,57,43,0.05); }
.img-drag-drop.active { border-color: var(--red); background: rgba(192,57,43,0.1); }
.drag-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.drag-icon { font-size: 36px; line-height: 1; }
.drag-text { display: flex; flex-direction: column; gap: 2px; }
.drag-text strong { color: var(--text); font-size: 14px; }
.drag-text span { color: var(--muted); font-size: 12px; }
.upload-preview { display: flex; align-items: center; gap: 12px; width: 100%; }
.preview-img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; }
.preview-actions { display: flex; gap: 8px; flex-direction: column; }
.btn-change, .btn-remove { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
.btn-change { background: var(--border); color: var(--text); }
.btn-change:hover { background: #ddd; }
.btn-remove { background: rgba(192,57,43,0.2); color: var(--red); }
.btn-remove:hover { background: rgba(192,57,43,0.3); }
.img-hint { font-size: 11px; color: var(--muted); line-height: 1.4; }

/* Edit modal */
.edit-modal-wrap { display: none; position: fixed; inset: 0; background: rgba(26,26,24,0.5); z-index: 400; align-items: center; justify-content: center; }
.edit-modal-wrap.open { display: flex; }
.edit-modal { background: var(--surface); border-radius: 16px; padding: 28px 28px 20px; width: min(480px, 94vw); max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
.edit-modal h2 { font-size: 17px; font-weight: 700; margin-bottom: 18px; color: var(--text); }
.edit-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.edit-field-grid .full { grid-column: 1 / -1; }
.edit-field label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
.edit-field input, .edit-field select { width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; background: var(--bg); color: var(--text); outline: none; transition: border 0.15s; box-sizing: border-box; }
.edit-field input:focus, .edit-field select:focus { border-color: var(--red); }
.edit-img-row { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 4px; }
.edit-img-preview { width: 72px; height: 72px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 22px; overflow: hidden; flex-shrink: 0; }
.edit-img-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.edit-img-controls { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.edit-img-url { width: 100%; padding: 8px 11px; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; background: var(--bg); color: var(--text); outline: none; box-sizing: border-box; }
.edit-img-url:focus { border-color: var(--red); }
.edit-modal-btns { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
.edit-modal-btns .btn-cancel { padding: 9px 20px; border: 1.5px solid var(--border); border-radius: 9px; background: var(--surface); color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; }
.edit-modal-btns .btn-save-edit { padding: 9px 22px; border: none; border-radius: 9px; background: var(--red); color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
.edit-modal-btns .btn-save-edit:hover { background: #a93226; }

/* Bulk confirm modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(26,26,24,0.5); z-index: 600; display: flex; align-items: center; justify-content: center; }
.modal-box { background: var(--surface); border-radius: 16px; padding: 28px; box-shadow: var(--shadow-lg); }
.modal-title { font-size: 18px; font-weight: 700; color: var(--text); }
.bulk-confirm-box { max-width: 420px; padding: 28px 32px; border: 1px solid var(--border); }
.bulk-confirm-desc { font-size: 14px; color: var(--sub); line-height: 1.6; margin: 12px 0 24px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.modal-actions .btn-cancel { padding: 9px 20px; border: 1.5px solid var(--border); border-radius: 9px; background: var(--surface); color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; }
.btn-confirm { padding: 10px 24px; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.btn-primary { background: var(--red); color: #fff; }
.btn-primary:hover { background: #a93226; }
.btn-danger { background: #c0392b; color: #fff; }
.btn-danger:hover { background: #a93226; }

/* ==================== TOASTS ==================== */
.toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%) translateY(14px); background: var(--text); color: #fff; border-radius: 10px; padding: 10px 18px; font-size: 13px; z-index: 700; opacity: 0; transition: all 0.3s; pointer-events: none; box-shadow: var(--shadow-lg); white-space: nowrap; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.error-toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2d2d2d; color: #fff; border-radius: 10px; padding: 12px 18px; display: flex; align-items: center; gap: 12px; z-index: 800; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 480px; min-width: 280px; }
.error-toast-msg { flex: 1; font-size: 13px; font-weight: 500; }
.error-toast-actions { display: flex; gap: 8px; align-items: center; }
.error-retry-btn { padding: 4px 12px; background: var(--red); border: none; border-radius: 6px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; }
.error-retry-btn:hover { background: #a93226; }
.error-dismiss-btn { background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; padding: 2px 4px; }
.error-dismiss-btn:hover { color: #fff; }

/* ==================== ANIMATIONS ==================== */
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1024px) and (min-width: 641px) {
  .admin-wrapper { --sidebar-w: 200px; }
  .cat-bar-title { font-size: 16px; }
  .catalog-main { padding: 16px; }
  .admin-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .search-box input { width: 130px; }
  .nav-tab { padding: 4px 10px; font-size: 12px; }
  .btn-add-prod { padding: 7px 14px; font-size: 12px; }
}

@media (max-width: 640px) {
  .admin-wrapper { --nav-h: 52px; --sidebar-w: 220px; }
  .nav-tabs { gap: 1px; padding: 2px; background: var(--bg); border-radius: 6px; flex-wrap: wrap; display: flex !important; overflow-x: auto; overflow-y: hidden; }
  .btn-logout { display: none !important; }
  .topnav { padding: 0 8px; gap: 6px; }
  .nav-left { gap: 6px; flex: 1; min-width: 0; }
  .nav-right { gap: 4px; }
  .brand { gap: 4px; min-width: 0; }
  .brand-logo { width: 28px; height: 28px; font-size: 14px; flex-shrink: 0; }
  .brand-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brand-name span { display: none; }
  .admin-pill { font-size: 8px; padding: 1px 5px; flex-shrink: 0; }
  .nav-tab { padding: 4px 10px; font-size: 11px; flex-shrink: 0; }
  .sidebar { position: fixed !important; left: 0; top: var(--nav-h); height: calc(100vh - var(--nav-h)); width: var(--sidebar-w) !important; min-width: 0 !important; transform: translateX(calc(-1 * var(--sidebar-w) - 2px)); z-index: 160; box-shadow: none; border-right: 1px solid var(--border); }
  .sidebar.open-mobile { transform: translateX(0); box-shadow: var(--shadow-lg); }
  .catalog-main { padding: 12px; width: 100%; max-width: 100vw; overflow-x: hidden; box-sizing: border-box; flex: 1; }
  .cat-bar { flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 14px; }
  .cat-bar-title { font-size: 16px; font-weight: 600; flex: none; }
  .search-box { width: 100%; }
  .search-box input { width: 100%; }
  .btn-add-prod { width: 100%; padding: 12px 14px; font-size: 13px; }
  .admin-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .views-layout { flex-direction: column; }
  .customer-list { width: 100%; min-width: 0; border-right: none; border-bottom: 1px solid var(--border); max-height: 140px; height: auto; position: static; }
  .orders-main { padding: 12px; }
  .ot-head { display: none; }
  .ot-row { grid-template-columns: 1fr; gap: 8px; padding: 12px 0; border-left: 3px solid var(--border); padding-left: 12px; }
  .ot-cell { padding: 4px 0; font-size: 11px; }
  .settings-main { padding: 12px; max-width: 100%; }
  .modal-wrap { padding: 12px; align-items: flex-end; }
  .modal { max-width: 100%; width: 100%; border-radius: 16px 16px 0 0; padding: 20px; }
}
      `}</style>
    </div>
  )
}

export default AdminPortal

import React, { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import AdminPortal from './components/AdminPortal'
import BulkEditView from './components/BulkEditView'
import CartOverlay from './components/CartOverlay'
import CategorySidebar from './components/CategorySidebar'
import CategoryView from './components/CategoryView'
import ProductGrid from './components/ProductGrid'
import OrderConfirmModal from './components/OrderConfirmModal'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState('catalog')
  const [viewMode, setViewMode] = useState('customer')
  const [userRole, setUserRole] = useState('customer')
  const [currentUser, setCurrentUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [acctDropdownOpen, setAcctDropdownOpen] = useState(false)
  const [productSheetOpen, setProductSheetOpen] = useState(false)
  const [cartOverlayOpen, setCartOverlayOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [cardSize, setCardSize] = useState(1.0)
  const [cartItems, setCartItems] = useState([])
  const [favorites, setFavorites] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [historyFilter, setHistoryFilter] = useState('all')
  const [gridViewMode, setGridViewMode] = useState('grid')
  const [selectedUnit, setSelectedUnit] = useState('cases')
  const [sheetQty, setSheetQty] = useState(1)

  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'catalog', name: 'Order', icon: '🛍' },
    { id: 'favs', name: 'Favorites', icon: '♡' },
    { id: 'newItems', name: 'New Items', icon: '✨' },
    { id: 'history', name: 'History', icon: '📋' }
  ]

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken')
    const userData = localStorage.getItem('user') || localStorage.getItem('userInfo')
    const role = localStorage.getItem('userRole')

    if (token) {
      setIsLoggedIn(true)
      let parsedUser = null
      let parsedRole = role

      try {
        if (userData) {
          parsedUser = JSON.parse(userData)
          // If role wasn't in its own key, try to get it from the user object
          if (!parsedRole) parsedRole = parsedUser.role
        }
      } catch (e) {
        console.error('Session restoration error:', e)
      }

      const finalRole = parsedRole || 'customer'
      setUserRole(finalRole)
      setViewMode(finalRole === 'admin' ? 'admin' : 'customer')
      setCurrentUser(parsedUser)

      loadOrders()
      if (finalRole !== 'admin') loadFavorites()
    }
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      const prods = data.products || []
      setProducts(prods)

      const superCatMap = new Map()
      prods.forEach(p => {
        if (p.is_hidden) return
        const superKey = p.super_category || 'Other'
        const subKey = p.category || 'Uncategorized'
        if (!superCatMap.has(superKey)) {
          superCatMap.set(superKey, { super: superKey, name: superKey, count: 0, subcategories: new Map() })
        }
        const superCat = superCatMap.get(superKey)
        if (!superCat.subcategories.has(subKey)) {
          superCat.subcategories.set(subKey, { name: subKey, super: superKey, count: 0 })
        }
        superCat.subcategories.get(subKey).count++
        superCat.count++
      })

      setCategories(Array.from(superCatMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(sc => ({
          ...sc,
          subcategories: Array.from(sc.subcategories.values()).sort((a, b) => a.name.localeCompare(b.name))
        })))
    } catch (err) {
      console.error('Failed to load products:', err)
    }
  }

  const handleLogin = (loginData) => {
    setIsLoggedIn(true)
    setUserRole(loginData.role || 'customer')
    setCurrentUser(loginData.user)
    setViewMode(loginData.role === 'admin' ? 'admin' : 'customer')
    if (loginData.role === 'customer') loadFavorites()
    navigate('/')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole('customer')
    setCurrentUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    localStorage.removeItem('authToken')
    localStorage.removeItem('userInfo')
    setCartItems([])
    setOrders([])
    navigate('/login')
  }

  const addToCart = (product, qty = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + qty } : item)
      }
      return [...prev, { ...product, qty }]
    })
  }

  const toggleFavorite = async (product) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const isFav = favorites.some(f => f.id === product.id)
    try {
      if (isFav) {
        await fetch(`/api/favorites/${product.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
        setFavorites(prev => prev.filter(f => f.id !== product.id))
      } else {
        await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ product_id: product.id }) })
        setFavorites(prev => [...prev, product])
      }
    } catch (err) { console.error('Toggle favorite error:', err) }
  }

  const loadFavorites = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setFavorites(data.favorites || [])
      }
    } catch (err) { console.error(err) }
  }

  const loadOrders = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) setOrders(await res.json())
    } catch (e) { /* ignore */ }
  }

  const filteredProducts = useMemo(() => {
    let filtered = products
    if (selectedCategory) {
      if (selectedCategory.super && selectedCategory.super !== selectedCategory.name) {
        filtered = filtered.filter(p => p.category === selectedCategory.name)
      } else {
        filtered = filtered.filter(p => p.super_category === selectedCategory.name)
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [products, selectedCategory, searchQuery])

  const newItems = useMemo(() => {
    return products.filter(p => {
      if (!p.created_at) return false
      const createdDate = new Date(p.created_at)
      const now = new Date()
      const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24)
      return diffDays <= 7 && !p.is_hidden
    })
  }, [products])

  const filteredOrders = useMemo(() => {
    if (historyFilter === 'all') return orders
    return orders.filter(o => (o.status || '').toLowerCase() === historyFilter.toLowerCase())
  }, [orders, historyFilter])

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.qty), 0)
  }, [cartItems])

  const totalCases = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.qty, 0)
  }, [cartItems])

  const getInitials = () => {
    const source = currentUser?.companyName || currentUser?.email || 'User'
    const parts = source.split(/[\s@]/).filter(p => p)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return source.substring(0, 2).toUpperCase()
  }

  const getDisplayName = () => currentUser?.companyName || currentUser?.email || 'User'

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId))
  }

  const updateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }
    setCartItems(prev =>
      prev.map(item => item.id === productId ? { ...item, qty: newQty } : item)
    )
  }

  const clearCart = () => {
    if (window.confirm('Clear all items from cart?')) setCartItems([])
  }

  const submitOrder = async () => {
    try {
      const token = localStorage.getItem('token')
      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        name: item.name,
        qty: item.qty,
        unit: 'cases'
      }))
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: orderItems })
      })
      if (res.ok) {
        setCartItems([])
        setConfirmModalOpen(false)
        setActivePage('history')
        loadOrders()
      }
    } catch (e) { console.error(e) }
  }

  const selectProduct = (product) => {
    setSelectedProduct(product)
    setProductSheetOpen(true)
    setSheetQty(1)
    setSelectedUnit('cases')
  }

  // ───────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
      />
      <Route
        path="/*"
        element={!isLoggedIn ? <Navigate to="/login" /> : (

          // ── ADMIN FULL-PAGE TAKEOVER ──────────────────────────
          viewMode === 'admin' ? (
            <AdminPortal
              onLogout={handleLogout}
              onSwitchToCustomer={() => setViewMode('customer')}
              currentUser={currentUser}
            />
          ) : (

          // ── CUSTOMER VIEW ─────────────────────────────────────
          <div className="app">
            <style jsx global>{`
              :root {
                --bg: #f5f4f0;
                --surface: #fff;
                --border: #e2ddd8;
                --red: #c0392b;
                --text: #1a1a18;
                --sub: #5a5750;
                --muted: #9a948c;
                --shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
                --nav-h: 64px;
                --sidebar-w: 260px;
                --radius: 12px;
              }

              * { box-sizing: border-box; margin: 0; padding: 0; }

              body {
                font-family: 'DM Sans', -apple-system, sans-serif;
                background: var(--bg);
                color: var(--text);
                line-height: 1.5;
              }

              .app {
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
              }

              .topnav {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 24px;
                height: var(--nav-h);
                background: var(--surface);
                border-bottom: 1px solid var(--border);
                position: sticky;
                top: 0;
                z-index: 1000;
                box-shadow: var(--shadow);
              }

              .nav-left, .nav-right { display: flex; align-items: center; gap: 20px; }

              .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; cursor: pointer; }
              .brand-logo { background: var(--red); color: #fff; padding: 6px; border-radius: 8px; font-size: 18px; }
              .brand-name { font-size: 18px; letter-spacing: -0.5px; }
              .brand-name span { color: var(--red); }

              .nav-tabs { display: flex; gap: 8px; background: var(--bg); padding: 4px; border-radius: 10px; }
              .nav-tab {
                padding: 8px 16px;
                border: none;
                background: none;
                cursor: pointer;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                color: var(--sub);
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .nav-tab.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }

              .view-mode-toggle { display: flex; gap: 4px; background: var(--bg); padding: 4px; border-radius: 10px; }
              .toggle-btn {
                padding: 6px 12px;
                border: none;
                background: none;
                cursor: pointer;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                color: var(--sub);
              }
              .toggle-btn.active { background: var(--red); color: #fff; }

              .main-content {
                flex: 1;
                display: flex;
                overflow: hidden;
                position: relative;
              }

              .catalog-wrap {
                display: flex;
                flex: 1;
                width: 100%;
                overflow: hidden;
              }

              .catalog-main {
                flex: 1;
                overflow-y: auto;
                padding: 32px;
                scroll-behavior: smooth;
              }

              .cat-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                gap: 24px;
              }

              .cat-bar-title { font-size: 24px; font-weight: 700; color: var(--text); }
              .cat-bar-count { color: var(--muted); font-size: 16px; margin-left: 8px; }

              .search-box {
                position: relative;
                flex: 1;
                max-width: 400px;
              }
              .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); }
              .search-box input {
                width: 100%;
                padding: 10px 12px 10px 36px;
                border: 1px solid var(--border);
                border-radius: 10px;
                font-family: inherit;
                font-size: 14px;
                transition: border-color 0.2s;
              }
              .search-box input:focus { border-color: var(--red); outline: none; }

              .size-slider { display: flex; align-items: center; gap: 12px; padding: 0 16px; border-left: 1px solid var(--border); }
              .size-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; }
              .slider { width: 100px; accent-color: var(--red); cursor: pointer; }

              .acct-wrap { position: relative; }
              .acct-trigger {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 6px 12px;
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.2s;
              }
              .acct-trigger:hover { background: var(--bg); }
              .acct-avatar { width: 32px; height: 32px; background: var(--red); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
              .acct-name { font-size: 14px; font-weight: 600; }

              .acct-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                width: 220px;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                z-index: 400;
                opacity: 0;
                transform: translateY(-6px);
                pointer-events: none;
                transition: all 0.18s cubic-bezier(.4,0,.2,1);
              }
              .acct-dropdown.open {
                opacity: 1;
                transform: translateY(0);
                pointer-events: all;
              }
              .acct-dd-head {
                padding: 14px 16px 10px;
                border-bottom: 1px solid var(--border);
              }
              .acct-dd-co {
                font-size: 14px;
                font-weight: 600;
                color: var(--text);
              }
              .acct-dd-email {
                font-size: 11px;
                color: var(--muted);
                margin-top: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .acct-dd-items {
                padding: 6px 0;
              }
              .acct-dd-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 16px;
                cursor: pointer;
                font-size: 13px;
                color: var(--sub);
                transition: all 0.12s;
                font-family: 'DM Sans', sans-serif;
                border: none;
                background: none;
                width: 100%;
                text-align: left;
              }
              .acct-dd-item:hover {
                background: var(--bg);
                color: var(--text);
              }
              .acct-dd-item .dd-icon {
                font-size: 15px;
                width: 20px;
                text-align: center;
                flex-shrink: 0;
              }
              .acct-dd-divider {
                height: 1px;
                background: var(--border);
                margin: 4px 0;
              }
              .acct-dd-item.danger {
                color: #c0392b;
              }
              .acct-dd-item.danger:hover {
                background: #f9eeec;
              }

              /* ===== PRODUCT SHEET ===== */
              .sheet-overlay {
                position: fixed;
                inset: 0;
                background: rgba(26,26,24,0);
                z-index: 500;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                pointer-events: none;
                transition: background 0.3s ease;
              }
              .sheet-overlay.open {
                background: rgba(26,26,24,0.45);
                pointer-events: all;
              }
              .prod-sheet {
                background: var(--surface);
                border-radius: 20px 20px 0 0;
                width: 100%;
                max-width: 600px;
                overflow: hidden;
                box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                transform: translateY(100%);
                transition: transform 0.35s cubic-bezier(.32,1,.32,1);
                max-height: 92vh;
                display: flex;
                flex-direction: column;
              }
              .sheet-overlay.open .prod-sheet {
                transform: translateY(0);
              }
              .sheet-handle {
                width: 38px;
                height: 4px;
                background: var(--muted);
                border-radius: 2px;
                margin: 10px auto 0;
                flex-shrink: 0;
                opacity: 0.4;
              }
              .sheet-hero {
                display: flex;
                gap: 16px;
                padding: 16px 20px 12px;
                flex-shrink: 0;
              }
              .sheet-img-wrap {
                width: 180px;
                height: 180px;
                flex-shrink: 0;
                background: var(--bg);
                border-radius: 14px;
                overflow: hidden;
                border: 1px solid var(--border);
              }
              .sheet-img-wrap img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                padding: 8px;
              }
              .sheet-info {
                flex: 1;
                min-width: 0;
                padding-top: 4px;
              }
              .sheet-name {
                font-size: 18px;
                font-weight: 600;
                color: var(--text);
                line-height: 1.25;
                margin-bottom: 5px;
                letter-spacing: -0.3px;
              }
              .sheet-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-bottom: 8px;
              }
              .sheet-tag {
                background: var(--bg);
                border: 1px solid var(--border);
                border-radius: 6px;
                padding: 3px 10px;
                font-size: 11px;
                color: var(--sub);
              }
              .sheet-meta {
                margin-bottom: 8px;
              }
              .sheet-meta-row {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
                font-size: 12px;
              }
              .sheet-meta-label {
                color: var(--muted);
              }
              .sheet-meta-val {
                color: var(--text);
                font-weight: 500;
              }
              .sheet-meta-val.mono {
                font-family: 'SF Mono', 'Fira Code', monospace;
                font-size: 11px;
              }
              .sheet-fav {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 10px;
                cursor: pointer;
                width: fit-content;
              }
              .sheet-fav-icon {
                font-size: 18px;
                color: var(--muted);
                transition: all 0.15s;
              }
              .sheet-fav-icon.faved {
                color: var(--red);
              }
              .sheet-fav-label {
                font-size: 12px;
                color: var(--muted);
              }
              .sheet-divider {
                height: 1px;
                background: var(--border);
                margin: 0 20px;
                flex-shrink: 0;
              }
              .sheet-order {
                padding: 14px 20px 20px;
                overflow-y: auto;
                flex: 1;
              }
              .sheet-order-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--text);
                margin-bottom: 12px;
              }
              .unit-tabs {
                display: flex;
                gap: 0;
                background: var(--bg);
                border: 1px solid var(--border);
                border-radius: 9px;
                padding: 3px;
                margin-bottom: 12px;
              }
              .unit-tab {
                flex: 1;
                padding: 7px;
                text-align: center;
                border-radius: 7px;
                border: none;
                background: transparent;
                color: var(--sub);
                font-family: 'DM Sans', sans-serif;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.18s;
              }
              .unit-tab.active {
                background: var(--surface);
                color: var(--red);
                box-shadow: var(--shadow);
                font-weight: 600;
              }
              .unit-info {
                background: var(--bg);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 12px;
                font-size: 13px;
              }
              .ui-row {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
              }
              .ui-label { color: var(--muted); }
              .ui-val { color: var(--text); font-weight: 500; }
              .ui-val.red { color: var(--red); font-weight: 600; }
              .qty-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 14px;
              }
              .qty-label {
                font-size: 13px;
                color: var(--sub);
                flex: 1;
                font-weight: 500;
              }
              .qty-minus, .qty-plus {
                width: 36px;
                height: 36px;
                border-radius: 9px;
                border: 1px solid var(--border);
                background: var(--surface);
                color: var(--text);
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                flex-shrink: 0;
                box-shadow: var(--shadow);
              }
              .qty-minus:hover, .qty-plus:hover {
                background: var(--red);
                border-color: var(--red);
                color: #fff;
              }
              .qty-input {
                width: 56px;
                text-align: center;
                background: var(--bg);
                border: 1px solid var(--border);
                border-radius: 8px;
                color: var(--text);
                font-size: 17px;
                font-weight: 600;
                padding: 7px;
                font-family: 'DM Sans', sans-serif;
              }
              .qty-input:focus {
                outline: none;
                border-color: var(--red);
              }
              .btn-add {
                width: 100%;
                padding: 14px;
                background: var(--red);
                border: none;
                border-radius: 10px;
                color: #fff;
                font-family: 'DM Sans', sans-serif;
                font-weight: 600;
                font-size: 15px;
                cursor: pointer;
                transition: all 0.18s;
                letter-spacing: -0.2px;
              }
              .btn-add:hover {
                background: #a93226;
              }

              .cart-sidebar {
                width: 320px;
                background: var(--surface);
                border-left: 1px solid var(--border);
                display: flex;
                flex-direction: column;
                transition: transform 0.3s ease;
              }
              .cart-sidebar.empty { width: 0; border: none; overflow: hidden; }

              @media (max-width: 1024px) {
                .desktop-only { display: none !important; }
                .catalog-main { padding: 20px; }
              }

              .mobile-nav {
                display: none;
                position: fixed;
                bottom: 0; left: 0; right: 0;
                height: 64px;
                background: var(--surface);
                border-top: 1px solid var(--border);
                z-index: 1000;
                box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
              }

              @media (max-width: 640px) {
                .mobile-nav { display: block; }
                .topnav .nav-tabs { display: none; }
                .main-content { padding-bottom: 64px; }

                .prod-sheet {
                  max-width: 100%;
                  border-radius: 18px 18px 0 0;
                  max-height: 90vh;
                }
                .sheet-hero {
                  flex-direction: column;
                  align-items: center;
                  gap: 12px;
                  padding: 14px 16px 10px;
                  text-align: center;
                }
                .sheet-img-wrap {
                  width: 160px;
                  height: 160px;
                }
                .sheet-info {
                  width: 100%;
                }
                .sheet-tags {
                  justify-content: center;
                }
                .sheet-fav {
                  justify-content: center;
                }
              }
            `}</style>

            {/* NAV */}
            <nav className="topnav">
              <div className="nav-left">
                <button className={`burger ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <span></span><span></span><span></span>
                </button>
                <div className="brand">
                  <div className="brand-logo">🔥</div>
                  <span className="brand-name"><span>DR</span> Prepper</span>
                </div>
              </div>
              <div className="nav-right">
                <div className="nav-tabs">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`nav-tab ${activePage === tab.id ? 'active' : ''}`}
                      onClick={() => setActivePage(tab.id)}
                    >
                      {tab.icon} {tab.name}
                    </button>
                  ))}
                </div>
                {userRole === 'admin' && (
                  <div className="view-mode-toggle">
                    <button className={`toggle-btn ${viewMode === 'customer' ? 'active' : ''}`} onClick={() => setViewMode('customer')}>👥 Customer</button>
                    <button className={`toggle-btn ${viewMode === 'admin' ? 'active' : ''}`} onClick={() => setViewMode('admin')}>🔧 Admin</button>
                  </div>
                )}
                <div className="size-slider">
                  <span className="size-label">Cards:</span>
                  <input type="range" min="0.8" max="1.6" step="0.2" value={cardSize} onChange={(e) => setCardSize(parseFloat(e.target.value))} className="slider" />
                </div>

                <div className="acct-wrap">
                  <div className="acct-trigger" onClick={() => setAcctDropdownOpen(!acctDropdownOpen)}>
                    <div className="acct-avatar">{getInitials()}</div>
                    <span className="acct-name">{getDisplayName()}</span>
                    <span className="acct-chevron">▼</span>
                  </div>
                  <div className={`acct-dropdown ${acctDropdownOpen ? 'open' : ''}`}>
                    <div className="acct-dd-head">
                      <div className="acct-dd-co">{currentUser?.companyName || 'Guest'}</div>
                      <div className="acct-dd-email">{currentUser?.email}</div>
                    </div>
                    <div className="acct-dd-items">
                      <button className="acct-dd-item" onClick={() => setAcctDropdownOpen(false)}>
                        <span className="dd-icon">👤</span> My Profile
                      </button>
                      <button className="acct-dd-item" onClick={() => setAcctDropdownOpen(false)}>
                        <span className="dd-icon">📋</span> Contact & Address
                      </button>
                      <button className="acct-dd-item" onClick={() => setAcctDropdownOpen(false)}>
                        <span className="dd-icon">🔒</span> Password & Security
                      </button>
                      <div className="acct-dd-divider"></div>
                      <button className="acct-dd-item danger" onClick={handleLogout}>
                        <span className="dd-icon">↩</span> Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            {/* MOBILE NAV */}
            <div className="mobile-nav">
              <div className="mobile-nav-inner">
                <button className={`mnav-btn ${activePage === 'catalog' ? 'active' : ''}`} onClick={() => setActivePage('catalog')}><span className="micon">🛍</span>Order</button>
                <button className={`mnav-btn ${activePage === 'favs' ? 'active' : ''}`} onClick={() => setActivePage('favs')}><span className="micon">♡</span>Favorites</button>
                <button className={`mnav-btn ${cartOverlayOpen ? 'active' : ''}`} onClick={() => setCartOverlayOpen(true)}>
                  <span className="micon">🛒</span>Cart
                  {cartItems.length > 0 && <span className="mbadge">{cartItems.length}</span>}
                </button>
                <button className={`mnav-btn ${activePage === 'history' ? 'active' : ''}`} onClick={() => setActivePage('history')}><span className="micon">📋</span>History</button>
              </div>
            </div>

            {/* SIDEBAR */}
            <CategorySidebar
              isOpen={sidebarOpen}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => { setSelectedCategory(cat); setSidebarOpen(false); }}
              onClose={() => setSidebarOpen(false)}
            />

            {/* MAIN CONTENT */}
            <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
              {activePage === 'catalog' && (
                <div className="catalog-wrap">
                  <div className="catalog-main">
                    <div className="cat-bar">
                      <span className="cat-bar-title">
                        {selectedCategory?.name || 'All Products'}
                        <span className="cat-bar-count">({filteredProducts.length})</span>
                      </span>
                      <div className="cat-bar-controls">
                        <div className="view-toggle">
                          <button className={`view-btn ${gridViewMode === 'grid' ? 'active' : ''}`} onClick={() => setGridViewMode('grid')}>▦ Grid</button>
                          <button className={`view-btn ${gridViewMode === 'categories' ? 'active' : ''}`} onClick={() => setGridViewMode('categories')}>📂 Categories</button>
                        </div>
                        <div className="search-box">
                          <span className="search-icon">🔍</span>
                          <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="catalog-content" style={{ '--card-scale': cardSize }}>
                      {gridViewMode === 'grid' ? (
                        <ProductGrid
                          products={filteredProducts}
                          favorites={favorites}
                          cart={cartItems}
                          cardSize={cardSize}
                          onProductSelected={selectProduct}
                          onAddToCart={addToCart}
                          onToggleFavorite={toggleFavorite}
                        />
                      ) : (
                        <CategoryView
                          products={filteredProducts}
                          favorites={favorites}
                          cart={cartItems}
                          onProductSelected={selectProduct}
                          onAddToCart={addToCart}
                          onToggleFavorite={toggleFavorite}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'favs' && (
                <div className="catalog-main fav-main">
                  <div className="page-header">
                    <div className="page-title">♡ Favorites</div>
                    <div className="page-subtitle">Products you've saved for quick reordering</div>
                  </div>
                  {favorites.length > 0 ? (
                    <div className="fav-grid" style={{ '--card-scale': cardSize }}>
                      <ProductGrid
                        products={favorites}
                        favorites={favorites}
                        cart={cartItems}
                        cardSize={cardSize}
                        onProductSelected={selectProduct}
                        onAddToCart={addToCart}
                        onToggleFavorite={toggleFavorite}
                      />
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="es-icon">♡</div>
                      <p>No favorites yet</p>
                    </div>
                  )}
                </div>
              )}

              {activePage === 'newItems' && (
                <div className="catalog-main">
                  <div className="page-header">
                    <div className="page-title">✨ New Items</div>
                    <div className="page-subtitle">Products added in the last 7 days</div>
                  </div>
                  {newItems.length > 0 ? (
                    <CategoryView
                      products={newItems}
                      favorites={favorites}
                      cart={cartItems}
                      onProductSelected={selectProduct}
                      onAddToCart={addToCart}
                      onToggleFavorite={toggleFavorite}
                    />
                  ) : (
                    <div className="empty-state">
                      <div className="es-icon">✨</div>
                      <p>No new items yet</p>
                    </div>
                  )}
                </div>
              )}

              {activePage === 'history' && (
                <div className="history-main">
                  <div className="history-header">
                    <div className="page-title">Order History</div>
                    <div className="filter-row">
                      {['All', 'Received', 'Processing', 'Pending'].map(f => (
                        <button key={f} className={`filter-btn ${historyFilter === f.toLowerCase() ? 'active' : ''}`} onClick={() => setHistoryFilter(f.toLowerCase())}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div className="order-list">
                    {filteredOrders.length > 0 ? filteredOrders.map(order => (
                      <div key={order.id} className="order-card">
                        <div className="order-card-head">
                          <div>
                            <div className="order-id">#{order.id}</div>
                            <div className="order-date">{new Date(order.created_at).toLocaleDateString()}</div>
                          </div>
                          <span className={`order-status-badge s-${order.status.toLowerCase()}`}>{order.status}</span>
                        </div>
                        <div className="order-items-list">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="order-item-row">
                              <span className="oi-name">{item.name}</span>
                              <span className="oi-qty">{item.qty} cases</span>
                            </div>
                          ))}
                        </div>
                        <div className="order-footer">
                          <span className="order-cases">{order.total_cases || order.items?.reduce((s, i) => s + i.qty, 0)} total cases</span>
                        </div>
                      </div>
                    )) : (
                      <div className="empty-state">
                        <div className="es-icon">📋</div>
                        <p>No orders yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* PRODUCT SHEET */}
            <div className={`sheet-overlay ${productSheetOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setProductSheetOpen(false) }}>
              <div className="prod-sheet" onClick={e => e.stopPropagation()}>
                <div className="sheet-handle"></div>
                {selectedProduct && (
                  <>
                    <div className="sheet-hero">
                      <div className="sheet-img-wrap">
                        <img src={selectedProduct.image_url} alt={selectedProduct.name} />
                      </div>
                      <div className="sheet-info">
                        <div className="sheet-name">{selectedProduct.name}</div>
                        <div className="sheet-tags">
                          <span className="sheet-tag">{selectedProduct.super_category}</span>
                          <span className="sheet-tag">{selectedProduct.category}</span>
                        </div>
                        <div className="sheet-meta">
                          {selectedProduct.weight && <div className="sheet-meta-row"><span className="sheet-meta-label">Weight</span><span className="sheet-meta-val">{selectedProduct.weight}</span></div>}
                          {selectedProduct.bags_per_case && <div className="sheet-meta-row"><span className="sheet-meta-label">Bags/Case</span><span className="sheet-meta-val">{selectedProduct.bags_per_case}</span></div>}
                          {selectedProduct.cases_per_pallet && <div className="sheet-meta-row"><span className="sheet-meta-label">Cases/Pallet</span><span className="sheet-meta-val">{selectedProduct.cases_per_pallet}</span></div>}
                          {selectedProduct.sku && <div className="sheet-meta-row"><span className="sheet-meta-label">SKU</span><span className="sheet-meta-val mono">{selectedProduct.sku}</span></div>}
                        </div>
                        <div className="sheet-fav" onClick={() => toggleFavorite(selectedProduct)}>
                          <span className={`sheet-fav-icon ${favorites.some(f => f.id === selectedProduct.id) ? 'faved' : ''}`}>
                            {favorites.some(f => f.id === selectedProduct.id) ? '\u2665' : '\u2661'}
                          </span>
                          <span className="sheet-fav-label">{favorites.some(f => f.id === selectedProduct.id) ? 'Saved' : 'Add to favorites'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="sheet-divider"></div>
                    <div className="sheet-order">
                      <div className="sheet-order-title">Add to Order</div>
                      <div className="unit-tabs">
                        <button className={`unit-tab ${selectedUnit === 'cases' ? 'active' : ''}`} onClick={() => setSelectedUnit('cases')}>📦 Cases</button>
                        <button className={`unit-tab ${selectedUnit === 'pallets' ? 'active' : ''}`} onClick={() => setSelectedUnit('pallets')}>🏗 Pallets</button>
                      </div>
                      {selectedProduct.show_price !== false && (
                        <div className="unit-info">
                          <div className="ui-row">
                            <span className="ui-label">Price per unit</span>
                            <span className="ui-val">${parseFloat(selectedProduct.price || 0).toFixed(2)}</span>
                          </div>
                          <div className="ui-row">
                            <span className="ui-label">Est. subtotal</span>
                            <span className="ui-val red">${(parseFloat(selectedProduct.price || 0) * sheetQty).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      <div className="qty-row">
                        <span className="qty-label">Qty ({selectedUnit})</span>
                        <button className="qty-minus" onClick={() => setSheetQty(prev => Math.max(1, prev - 1))}>−</button>
                        <input
                          type="number"
                          min="1"
                          className="qty-input"
                          value={sheetQty}
                          onChange={(e) => setSheetQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button className="qty-plus" onClick={() => setSheetQty(prev => prev + 1)}>+</button>
                      </div>
                      <button className="btn-add" onClick={() => { addToCart(selectedProduct, sheetQty); setProductSheetOpen(false); }}>
                        Add {sheetQty} {selectedUnit} to Cart
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* CART OVERLAY */}
            <CartOverlay
              isOpen={cartOverlayOpen}
              cartItems={cartItems}
              onClose={() => setCartOverlayOpen(false)}
              onRemoveItem={removeFromCart}
              onPlaceOrder={() => { setConfirmModalOpen(true); setCartOverlayOpen(false); }}
              onClearCart={clearCart}
              onUpdateQty={updateCartQty}
            />

            {/* DESKTOP CART SIDEBAR */}
            <div className={`cart-sidebar ${cartItems.length === 0 ? 'empty' : ''} desktop-only`}>
              <div className="cart-head"><h2>🛒 Order</h2></div>
              <div className="cart-items">
                {cartItems.length === 0 ? <div className="cart-empty">Your cart is empty</div> :
                  cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="ci-info">
                        <div className="ci-name">{item.name}</div>
                        <div className="ci-meta">{item.qty} cases × ${item.price}</div>
                      </div>
                      <button className="ci-remove" onClick={() => removeFromCart(item.id)}>✕</button>
                    </div>
                  ))
                }
              </div>
              {cartItems.length > 0 && (
                <div className="cart-footer">
                  <div className="sum-row"><span>Total cases</span><span>{totalCases}</span></div>
                  <div className="sum-row total"><span>Est. total</span><span>${cartTotal.toFixed(2)}</span></div>
                  <button className="btn-place" onClick={() => setConfirmModalOpen(true)}>Place Order →</button>
                  <button className="btn-clear-cart" onClick={clearCart}>Clear cart</button>
                </div>
              )}
            </div>

            {/* ORDER CONFIRM MODAL */}
            <OrderConfirmModal
              isOpen={confirmModalOpen}
              onClose={() => setConfirmModalOpen(false)}
              onSubmit={submitOrder}
              cartItems={cartItems}
              total={cartTotal}
            />
          </div>
          )
        )}
      />
    </Routes>
  )
}

export default App

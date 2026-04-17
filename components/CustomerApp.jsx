'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import CartOverlay from './CartOverlay';
import CategorySidebar from './CategorySidebar';
import CategoryView from './CategoryView';
import ProductGrid from './ProductGrid';
import OrderConfirmModal from './OrderConfirmModal';
import { Flame, ShoppingBag, Heart, Sparkles, ClipboardList, ShoppingCart, Search, FolderOpen, LayoutGrid, ChevronDown, User, Lock, Settings, LogOut, X, Minus, Plus, Package, Building, ArrowRight, CheckCircle, Menu } from 'lucide-react';

function CustomerApp({ currentUser: initialUser, userRole, viewMode, setViewMode, onLogout }) {
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [activePage, _setActivePage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customer_active_page')
      if (saved && ['catalog', 'favs', 'newItems', 'history'].includes(saved)) return saved
    }
    return 'catalog'
  });
  const setActivePage = (page) => { _setActivePage(page); try { localStorage.setItem('customer_active_page', page) } catch (e) { } };
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 640 : true);
  const [acctDropdownOpen, setAcctDropdownOpen] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetDragStart = React.useRef(0);
  const sheetDragging = React.useRef(false);
  const sheetScrollRef = React.useRef(null);
  const sheetCanDrag = React.useRef(false);
  const sheetInteracted = React.useRef(false);
  const [sheetImgIdx, setSheetImgIdx] = React.useState(0);
  const sheetImgTouchX = React.useRef(0);
  const [imgViewerOpen, setImgViewerOpen] = useState(false);
  const imgViewerTouchX = React.useRef(0);
  const onSheetTouchStart = (e) => {
    sheetDragStart.current = e.touches[0].clientY;
    sheetDragging.current = true;
    sheetInteracted.current = true;
  };
  const onSheetTouchMove = (e) => {
    if (!sheetDragging.current) return;
    const diff = e.touches[0].clientY - sheetDragStart.current;
    // Only track downward drag
    if (diff > 0) setSheetDragY(diff);
    else setSheetDragY(0);
  };
  const onSheetTouchEnd = () => {
    sheetDragging.current = false;
    if (sheetDragY > 100) {
      // Animate sheet all the way down before closing
      setSheetDragY(window.innerHeight);
      setTimeout(() => {
        setProductSheetOpen(false);
        restoreModalScroll();
      }, 380);
    } else {
      setSheetDragY(0);
    }
  };
  const [cartOverlayOpen, setCartOverlayOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cardSize, setCardSize] = useState(0.8);
  const [navsHidden, setNavsHidden] = useState(false);
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  const [floatingSearchFocused, setFloatingSearchFocused] = useState(false);
  const [mobileViewportOffsetTop, setMobileViewportOffsetTop] = useState(0);
  const lastScrollY = React.useRef(0);
  const pillsRowRef = React.useRef(null);
  const floatingPillsRef = React.useRef(null);
  const programmaticScroll = React.useRef(false);
  const stickyBarRef = React.useRef(null);
  const [mobileBarH, setMobileBarH] = useState(0);
  const [isMob, setIsMob] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [viewSwitching, setViewSwitching] = useState(false);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('cases');
  const [sheetQty, setSheetQty] = useState(1);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [acctModal, setAcctModal] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [acctData, setAcctData] = useState({
    accountId: '', customerSince: '', salesRep: 'DJ',
    firstName: '', lastName: '', company: '', email: '',
    phone: '', altPhone: '', address1: '', address2: '',
    city: '', state: '', zip: '', country: '', lastSignIn: ''
  });
  const [acctSaveBanner, setAcctSaveBanner] = useState('');
  const [acctCurrentPwd, setAcctCurrentPwd] = useState('');
  const [acctNewPwd, setAcctNewPwd] = useState('');
  const [acctConfirmPwd, setAcctConfirmPwd] = useState('');
  const [acctPwdStrength, setAcctPwdStrength] = useState(0);
  const [activeSuperCatId, setActiveSuperCatId] = useState(null);
  const [superCatList, setSuperCatList] = useState([]);
  const catalogScrollRef = React.useRef(null);
  const modalScrollY = React.useRef(0);

  const tabs = [
    { id: 'catalog', name: 'Order', Icon: ShoppingBag },
    { id: 'favs', name: 'Favorites', Icon: Heart },
    { id: 'newItems', name: 'New Items', Icon: Sparkles },
    { id: 'history', name: 'History', Icon: ClipboardList }
  ];

  const [showPrices, setShowPrices] = useState(true);
  const [promoBanner, setPromoBanner] = useState(null);

  const captureModalScroll = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      modalScrollY.current = window.scrollY;
    }
  };

  const restoreModalScroll = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      const y = Math.max(0, modalScrollY.current || 0);
      requestAnimationFrame(() => window.scrollTo(0, y));
      setTimeout(() => window.scrollTo(0, y), 50);
    }
  };

  const openProductSheet = (product) => {
    captureModalScroll();
    sheetInteracted.current = false;
    setSheetDragY(0);
    setSelectedProduct(product);
    setProductSheetOpen(true);
    setSheetQty(1);
    setSelectedUnit('cases');
    setSheetImgIdx(0);
  };

  const closeProductSheet = () => {
    setProductSheetOpen(false);
    restoreModalScroll();
  };

  const openCartOverlay = () => {
    captureModalScroll();
    setCartOverlayOpen(true);
  };

  const closeCartOverlay = () => {
    setCartOverlayOpen(false);
    restoreModalScroll();
  };

  useEffect(() => {
    loadProducts(); loadOrders();
    if (userRole !== 'admin') loadFavorites();
    Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      (() => { const t = localStorage.getItem('token'); return t ? fetch('/api/customers/profile', { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.json()).catch(() => ({})) : Promise.resolve({}) })()
    ]).then(([settingsData, profileData]) => {
      const siteWide = settingsData.settings?.show_prices === undefined ? false : (settingsData.settings.show_prices === 'true' || settingsData.settings.show_prices === true);
      const customerSetting = profileData.customer?.show_prices;
      // Per-customer setting overrides global. If customer has explicit setting, use it. Otherwise fall back to global.
      setShowPrices(customerSetting !== undefined && customerSetting !== null ? customerSetting !== false : siteWide);
      if (settingsData.settings?.promo_banner) {
        try {
          const b = JSON.parse(settingsData.settings.promo_banner);
          if (b.enabled) setPromoBanner({ ...b, type: b.type || 'text' });
        } catch (e) { }
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const u = currentUser;
    const parts = (u.name || u.contact_name || '').split(' ');
    setAcctData(prev => ({
      ...prev, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '',
      company: u.companyName || u.company_name || '', email: u.email || '', phone: u.phone || '',
      address1: u.address_line1 || '', address2: u.address_line2 || '', city: u.city || '',
      state: u.state || '', zip: u.zip || '', country: u.country || '',
      accountId: u.id ? `HS-${String(u.id).padStart(3, '0')}` : '',
      customerSince: u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
      salesRep: 'Mike Johnson', lastSignIn: 'Today'
    }));
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/customers/profile', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data?.customer) return;
          const c = data.customer;
          const nameParts = (c.contact_name || '').split(' ');
          setAcctData(prev => ({
            ...prev, firstName: nameParts[0] || prev.firstName, lastName: nameParts.slice(1).join(' ') || prev.lastName,
            company: c.company_name || prev.company, email: c.email || prev.email, phone: c.phone || '',
            altPhone: c.alt_phone || '', address1: c.address_line1 || '', address2: c.address_line2 || '',
            city: c.city || '', state: c.state || '', zip: c.zip || '', country: c.country || '',
            accountId: c.id ? `HS-${String(c.id).padStart(3, '0')}` : prev.accountId,
            customerSince: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : prev.customerSince,
            lastSignIn: c.last_login ? new Date(c.last_login).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Today'
          }));
        }).catch(() => { });
    }
  }, [currentUser]);

  useEffect(() => {
    if (products.length === 0) { const timer = setTimeout(() => loadProducts(), 500); return () => clearTimeout(timer); }
  }, [products.length]);

  // Lock catalog scroll when any popup is open
  const savedScrollY = React.useRef(0);
  useEffect(() => {
    const anyOpen = productSheetOpen || cartOverlayOpen || confirmModalOpen || !!acctModal;
    const scrollEl = catalogScrollRef.current;
    if (anyOpen && scrollEl) {
      savedScrollY.current = scrollEl.scrollTop;
      scrollEl.style.overflow = 'hidden';
    } else if (scrollEl) {
      scrollEl.style.overflow = '';
      // Restore scroll position after overflow is re-enabled
      requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = savedScrollY.current; });
    }
  }, [productSheetOpen, cartOverlayOpen, confirmModalOpen, acctModal]);

  // Keep floating bar off outside mobile catalog
  useEffect(() => {
    if (activePage !== 'catalog' || window.innerWidth > 640) {
      setShowFloatingBar(false);
      setFloatingSearchFocused(false);
    }
  }, [activePage]);

  // Track visual viewport top offset on iOS so fixed controls stay aligned
  // when browser chrome expands/collapses during scroll.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncViewportTop = () => {
      if (window.innerWidth > 640 || !window.visualViewport) {
        setMobileViewportOffsetTop(0);
        return;
      }
      const next = Math.max(0, Math.round(window.visualViewport.offsetTop || 0));
      setMobileViewportOffsetTop(next);
    };

    syncViewportTop();

    const vv = window.visualViewport;
    window.addEventListener('resize', syncViewportTop, { passive: true });
    window.addEventListener('orientationchange', syncViewportTop, { passive: true });
    if (vv) {
      vv.addEventListener('resize', syncViewportTop);
      vv.addEventListener('scroll', syncViewportTop);
    }

    return () => {
      window.removeEventListener('resize', syncViewportTop);
      window.removeEventListener('orientationchange', syncViewportTop);
      if (vv) {
        vv.removeEventListener('resize', syncViewportTop);
        vv.removeEventListener('scroll', syncViewportTop);
      }
    };
  }, []);

  // Auto-scroll active pill into view (both original and floating)
  useEffect(() => {
    if (!activeSuperCatId) return;
    [pillsRowRef, floatingPillsRef].forEach(ref => {
      if (!ref.current) return;
      const pill = ref.current.querySelector(`[data-pill-id="${activeSuperCatId}"]`) ||
        Array.from(ref.current.querySelectorAll('button')).find(b => b.textContent.includes(superCatList.find(s => s.id === activeSuperCatId)?.name));
      if (pill) {
        const row = ref.current;
        const pillLeft = pill.offsetLeft;
        const pillWidth = pill.offsetWidth;
        const rowScroll = row.scrollLeft;
        const rowWidth = row.clientWidth;
        if (pillLeft < rowScroll || pillLeft + pillWidth > rowScroll + rowWidth) {
          row.scrollTo({ left: pillLeft - (rowWidth - pillWidth) / 2, behavior: 'smooth' });
        }
      }
    });
  }, [activeSuperCatId]);

  // Reset scroll to top after products load if user was near top
  useEffect(() => {
    if (products.length > 0 && activePage === 'catalog') {
      const mob = window.innerWidth <= 640;
      const pos = mob ? window.scrollY : (catalogScrollRef.current?.scrollTop || 0);
      if (pos < 200) { if (mob) window.scrollTo(0, 0); else if (catalogScrollRef.current) catalogScrollRef.current.scrollTop = 0; }
    }
  }, [products.length]);

  // Load super categories for category pills
  useEffect(() => {
    fetch('/api/categories/hierarchy').then(r => r.json()).then(d => {
      if (d.hierarchy) setSuperCatList(d.hierarchy);
    }).catch(() => { });
  }, []);

  // Force scroll to top on catalog load so banner is fully visible
  useEffect(() => {
    if (activePage === 'catalog') {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      const reset = () => { if (window.innerWidth <= 640) window.scrollTo(0, 0); else if (catalogScrollRef.current) catalogScrollRef.current.scrollTop = 0; };
      reset();
      requestAnimationFrame(reset);
      const t1 = setTimeout(reset, 50);
      const t2 = setTimeout(reset, 150);
      const t3 = setTimeout(reset, 300);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [activePage]);

  // Detect mobile for sticky bar fixed positioning
  useEffect(() => {
    const check = () => setIsMob(window.innerWidth <= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Measure sticky bar height for mobile spacer
  useEffect(() => {
    const bar = stickyBarRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(() => setMobileBarH(bar.offsetHeight));
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // Track which super category is currently scrolled to + scroll direction for nav hide/show
  useEffect(() => {
    if (activePage !== 'catalog') return;
    const scrollEl = catalogScrollRef.current;
    if (!scrollEl) return;
    const handleScroll = () => {
      const currentY = scrollEl.scrollTop;
      if (!programmaticScroll.current) {
        const diff = currentY - lastScrollY.current;
        if (Math.abs(diff) > 5) {
          if (diff > 0 && currentY > 60) setNavsHidden(true);
          else if (diff < 0) setNavsHidden(false);
          lastScrollY.current = currentY;
        }
        if (currentY < 10) setNavsHidden(false);
      }
      if (superCatList.length === 0) return;
      const containerTop = scrollEl.getBoundingClientRect().top;
      let active = null;
      for (const sc of superCatList) {
        const el = document.getElementById(`supercat-${sc.id}`);
        if (el && el.getBoundingClientRect().top - containerTop <= 160) active = sc.id;
      }
      if (active) setActiveSuperCatId(active);
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [activePage, superCatList, floatingSearchFocused]);

  const onFloatingSearchFocus = () => {
    setFloatingSearchFocused(true);
    const y = window.scrollY;
    requestAnimationFrame(() => window.scrollTo(0, y));
    setTimeout(() => window.scrollTo(0, y), 100);
    setTimeout(() => window.scrollTo(0, y), 300);
  };

  const onFloatingSearchBlur = () => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active.id !== 'floating-catalog-search') {
        setFloatingSearchFocused(false);
      }
    });
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products'); const data = await res.json();
      const prods = data.products || []; setProducts(prods);
      const superCatMap = new Map();
      prods.forEach(p => {
        if (p.is_hidden) return;
        const superKey = p.super_category || 'Other'; const subKey = p.category || 'Uncategorized';
        if (!superCatMap.has(superKey)) superCatMap.set(superKey, { super: superKey, name: superKey, count: 0, subcategories: new Map() });
        const superCat = superCatMap.get(superKey);
        if (!superCat.subcategories.has(subKey)) superCat.subcategories.set(subKey, { name: subKey, super: superKey, count: 0 });
        superCat.subcategories.get(subKey).count++; superCat.count++;
      });
      setCategories(Array.from(superCatMap.values()).sort((a, b) => a.name.localeCompare(b.name)).map(sc => ({
        ...sc, subcategories: Array.from(sc.subcategories.values()).sort((a, b) => a.name.localeCompare(b.name))
      })));
    } catch (err) { console.error('Failed to load products:', err); }
    finally { setProductsLoading(false); }
  };

  const [cartToast, setCartToast] = useState(null);
  const cartToastTimer = React.useRef(null);
  const addToCart = (product, qty = 1, unit = 'cases') => {
    const cartKey = `${product.id}_${unit}`;
    setCartItems(prev => {
      const existing = prev.find(item => item.cartKey === cartKey);
      if (existing) return prev.map(item => item.cartKey === cartKey ? { ...item, qty: item.qty + qty } : item);
      return [...prev, { ...product, qty, unit, cartKey }];
    });
    if (cartToastTimer.current) clearTimeout(cartToastTimer.current);
    setCartToast({ name: product.name, qty, unit });
    cartToastTimer.current = setTimeout(() => setCartToast(null), 2000);
  };

  const toggleFavorite = async (product) => {
    if (userRole === 'admin') return;
    const token = localStorage.getItem('token'); if (!token) return;
    const isFav = favorites.some(f => f.id === product.id);
    const prevFavorites = [...favorites];
    if (isFav) setFavorites(prev => prev.filter(f => f.id !== product.id));
    else setFavorites(prev => [...prev, product]);
    try {
      if (isFav) { const res = await fetch(`/api/favorites/${product.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (!res.ok) throw new Error('Failed'); }
      else { const res = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ product_id: product.id }) }); if (!res.ok) throw new Error('Failed'); }
    } catch (err) { setFavorites(prevFavorites); console.error('Toggle favorite error:', err); }
  };

  const loadFavorites = async () => {
    const token = localStorage.getItem('token'); if (!token) return;
    try { const res = await fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) { const data = await res.json(); setFavorites(data.favorites || []); } } catch (err) { console.error(err); }
  };

  const loadOrders = async () => {
    const token = localStorage.getItem('token'); if (!token) return;
    try { const res = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) { const data = await res.json(); setOrders(data.orders || data || []); } } catch (e) { }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => !p.is_hidden);
    if (selectedCategory) {
      if (selectedCategory.type === 'brand') {
        filtered = filtered.filter(p => p.brand === selectedCategory.name);
      } else {
        const isSuperCat = selectedCategory.totalProducts !== undefined || selectedCategory.categories;
        if (isSuperCat) filtered = filtered.filter(p => p.super_category_id === selectedCategory.id || p.super_category === selectedCategory.name);
        else filtered = filtered.filter(p => p.category_id === selectedCategory.id || p.category === selectedCategory.name);
      }
    }
    if (searchQuery) { const q = searchQuery.toLowerCase(); filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.super_category?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)); }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const newItems = useMemo(() => products.filter(p => { if (!p.created_at) return false; return ((new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24)) <= 7 && !p.is_hidden; }), [products]);
  const filteredOrders = useMemo(() => historyFilter === 'all' ? orders : orders.filter(o => (o.status || '').toLowerCase() === historyFilter.toLowerCase()), [orders, historyFilter]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => { const cases = item.unit === 'pallets' ? item.qty * (parseInt(item.cases_per_pallet) || 60) : item.qty; return sum + (parseFloat(item.price || 0) * cases); }, 0), [cartItems]);
  const totalCases = useMemo(() => cartItems.reduce((sum, item) => sum + (item.unit === 'pallets' ? item.qty * (parseInt(item.cases_per_pallet) || 60) : item.qty), 0), [cartItems]);

  const getInitials = () => { const s = currentUser?.companyName || currentUser?.email || 'User'; const p = s.split(/[\s@]/).filter(p => p); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : s.substring(0, 2).toUpperCase(); };
  const getDisplayName = () => currentUser?.companyName || currentUser?.email || 'User';
  const removeFromCart = (cartKey) => setCartItems(prev => prev.filter(item => (item.cartKey || item.id) !== cartKey));
  const updateCartQty = (cartKey, newQty) => { if (newQty <= 0) { removeFromCart(cartKey); return; } setCartItems(prev => prev.map(item => (item.cartKey || item.id) === cartKey ? { ...item, qty: newQty } : item)); };
  const clearCart = () => { if (window.confirm('Clear all items from cart?')) setCartItems([]); };

  const submitOrder = async () => {
    if (isSubmittingOrder) return; setIsSubmittingOrder(true);
    try {
      const token = localStorage.getItem('token');
      const orderItems = cartItems.map(item => ({ product_id: item.id, name: item.name, qty: item.qty, unit: item.unit || 'cases', price: item.price, cases_per_pallet: item.cases_per_pallet }));
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ items: orderItems }) });
      if (res.ok) { setCartItems([]); setConfirmModalOpen(false); setActivePage('history'); showToast('Order placed successfully'); loadOrders(); }
      else showToast('Failed to place order', 'error');
    } catch (e) { showToast('Connection error', 'error'); }
    finally { setIsSubmittingOrder(false); }
  };

  const selectProduct = (product) => { openProductSheet(product); };
  const showAcctBanner = (msg) => { setAcctSaveBanner(msg); setTimeout(() => setAcctSaveBanner(''), 3000); };
  const showToast = (msg, type = 'success') => { setToastMsg(msg); setToastType(type); setTimeout(() => setToastMsg(''), 3000); };
  const checkPwdStrength = (val) => { let s = 0; if (val.length >= 8) s++; if (/[A-Z]/.test(val)) s++; if (/[a-z]/.test(val)) s++; if (/[0-9]/.test(val)) s++; if (/[^A-Za-z0-9]/.test(val)) s++; setAcctPwdStrength(s); };
  const pwdStrengthColor = acctPwdStrength <= 1 ? '#ef4444' : acctPwdStrength <= 3 ? '#f59e0b' : '#10b981';
  const pwdStrengthLabel = acctPwdStrength <= 1 ? 'Weak' : acctPwdStrength <= 3 ? 'Medium' : 'Strong';

  const saveAcctProfile = async () => {
    if (!acctData.firstName) { showToast('First name is required', 'error'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ contact_name: `${acctData.firstName} ${acctData.lastName}`.trim(), company_name: acctData.company }) });
      if (res.ok) { showAcctBanner('Profile saved successfully'); showToast('Profile saved'); const updatedUser = { ...currentUser, companyName: acctData.company, company_name: acctData.company, name: `${acctData.firstName} ${acctData.lastName}`.trim(), contact_name: `${acctData.firstName} ${acctData.lastName}`.trim() }; setCurrentUser(updatedUser); try { localStorage.setItem('user', JSON.stringify(updatedUser)); localStorage.setItem('userInfo', JSON.stringify({ ...updatedUser, role: userRole })); } catch (e) { } }
      else showToast('Failed to save profile', 'error');
    } catch (e) { showToast('Connection error', 'error'); }
  };

  const saveAcctContact = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ phone: acctData.phone, alt_phone: acctData.altPhone, address_line1: acctData.address1, address_line2: acctData.address2, city: acctData.city, state: acctData.state, zip: acctData.zip, country: acctData.country }) });
      if (res.ok) { showAcctBanner('Contact info saved'); showToast('Contact info saved'); } else showToast('Failed to save contact info', 'error');
    } catch (e) { showToast('Connection error', 'error'); }
  };

  const clearAcctContact = () => { setAcctData(prev => ({ ...prev, phone: '', altPhone: '', address1: '', address2: '', city: '', state: '', zip: '', country: '' })); showToast('Contact fields cleared'); };

  const saveAcctSecurity = async () => {
    if (!acctCurrentPwd || !acctNewPwd) { showToast('Please fill in all password fields', 'error'); return; }
    if (acctNewPwd !== acctConfirmPwd) { showToast('Passwords do not match', 'error'); return; }
    if (acctNewPwd.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ currentPassword: acctCurrentPwd, newPassword: acctNewPwd }) });
      if (res.ok) { showAcctBanner('Password updated successfully'); showToast('Password updated'); setAcctCurrentPwd(''); setAcctNewPwd(''); setAcctConfirmPwd(''); setAcctPwdStrength(0); }
      else { const d = await res.json(); showToast(d.error || 'Failed to update password', 'error'); }
    } catch (e) { showToast('Connection error', 'error'); }
  };

  const statusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'bg-amber-100 text-amber-600';
    if (s === 'processing') return 'bg-blue-100 text-blue-600';
    if (s === 'received') return 'bg-emerald-100 text-emerald-600';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="flex flex-col bg-slate-50 h-[100svh] overflow-hidden">

      {/* UTILITY BAR */}
      <div className="hidden items-center justify-between px-6 h-8 bg-slate-900 text-slate-400 text-[11px] shrink-0">
        <span>B2B Wholesale Portal — Registered Distributors Only</span>
        <div className="flex gap-4">
          <a href="https://drprepperusa.com" className="text-slate-400 no-underline hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">Visit Website</a>
          <a href="#" className="text-slate-400 no-underline hover:text-white transition-colors">Help Center</a>
          <a href="#" className="text-slate-400 no-underline hover:text-white transition-colors">Contact Sales</a>
        </div>
      </div>

      {/* NAV */}
      <nav className="customer-top-nav grid grid-cols-[auto_1fr_auto] items-center px-6 h-14 bg-white border-b border-slate-200 sticky top-0 z-[1000] shadow-sm gap-3 max-sm:px-3 shrink-0 max-sm:fixed max-sm:top-0 max-sm:left-0 max-sm:right-0">
        <div className="flex items-center gap-5 max-sm:gap-2">
          <button className="w-9 h-9 border-none bg-transparent cursor-pointer flex flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:bg-slate-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className={`w-5 h-5 transition-colors ${sidebarOpen ? 'text-indigo-500' : 'text-slate-500'}`} />
          </button>
          <div className="flex items-center gap-2.5 font-bold cursor-pointer">
            <div className="bg-slate-900 text-white p-1.5 rounded-lg">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-lg tracking-tight max-sm:text-[15px]"><span className="text-indigo-500">DR</span> Prepper</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 max-sm:!hidden">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActivePage(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 border-none rounded-lg text-sm font-medium cursor-pointer transition-all ${activePage === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
                <tab.Icon className="w-4 h-4" /> {tab.name}
              </button>
            ))}
          </div>
          {userRole === 'admin' && (
            <div className="hidden sm:flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button className={`px-3 py-1.5 border-none rounded-md text-xs font-semibold cursor-pointer transition-all ${viewMode === 'customer' ? 'bg-indigo-500 text-white' : 'bg-transparent text-slate-500'}`} onClick={() => setViewMode('customer')}>Customer</button>
              <button className={`px-3 py-1.5 border-none rounded-md text-xs font-semibold cursor-pointer transition-all ${viewMode === 'admin' ? 'bg-indigo-500 text-white' : 'bg-transparent text-slate-500'}`} onClick={() => setViewMode('admin')}>Admin</button>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Cards:</span>
            <input type="range" min="0.6" max="2.0" step="0.1" value={cardSize} onChange={(e) => setCardSize(parseFloat(e.target.value))}
              className="w-20 h-1 rounded-full bg-slate-200 outline-none appearance-none accent-indigo-500 cursor-pointer" />
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end max-sm:gap-2">
          <div className="relative">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition-colors hover:bg-slate-100"
              onClick={() => setAcctDropdownOpen(!acctDropdownOpen)}>
              <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{getInitials()}</div>
              <span className="text-sm font-semibold max-sm:hidden">{getDisplayName()}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 max-sm:hidden" />
            </div>

            <div className={`absolute top-[calc(100%+8px)] right-0 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-[400] transition-all ${acctDropdownOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1.5 pointer-events-none'}`}>
              <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-800">{currentUser?.companyName || 'Guest'}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{currentUser?.email}</div>
              </div>
              <div className="py-1.5">
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left border-none bg-transparent text-[13px] text-slate-600 cursor-pointer transition-colors hover:bg-slate-50 hover:text-slate-800"
                  onClick={() => { setAcctDropdownOpen(false); setAcctModal('profile'); }}><User className="w-4 h-4" /> My Profile</button>
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left border-none bg-transparent text-[13px] text-slate-600 cursor-pointer transition-colors hover:bg-slate-50 hover:text-slate-800"
                  onClick={() => { setAcctDropdownOpen(false); setAcctModal('contact'); }}><ClipboardList className="w-4 h-4" /> Contact & Address</button>
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left border-none bg-transparent text-[13px] text-slate-600 cursor-pointer transition-colors hover:bg-slate-50 hover:text-slate-800"
                  onClick={() => { setAcctDropdownOpen(false); setAcctModal('security'); }}><Lock className="w-4 h-4" /> Password & Security</button>
                {userRole === 'admin' && (
                  <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left border-none bg-transparent text-[13px] text-emerald-600 font-semibold cursor-pointer transition-colors hover:bg-emerald-50"
                    onClick={() => { setAcctDropdownOpen(false); setViewMode('admin'); }}><Settings className="w-4 h-4" /> Back to Admin</button>
                )}
                <div className="h-px bg-slate-200 my-1" />
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left border-none bg-transparent text-[13px] text-red-500 cursor-pointer transition-colors hover:bg-red-50"
                  onClick={onLogout}><LogOut className="w-4 h-4" /> Sign out</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV */}
      <div className={`customer-bottom-nav hidden max-sm:block fixed bottom-0 left-0 right-0 h-16 bg-white border-t z-[500] transition-all duration-300 ${navsHidden && activePage === 'catalog' ? 'border-transparent shadow-none' : 'border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]'}`}
        style={{ transform: navsHidden && activePage === 'catalog' ? 'translateY(calc(100% + env(safe-area-inset-bottom, 0px) + 12px))' : 'translateY(0)' }}>
        <div className="flex justify-around items-center h-full">
          {[
            { id: 'catalog', name: 'Order', Icon: ShoppingBag },
            { id: 'favs', name: 'Favs', Icon: Heart },
            { id: 'cart', name: 'Cart', Icon: ShoppingCart, isCart: true },
            { id: 'history', name: 'History', Icon: ClipboardList }
          ].map(item => (
            <button key={item.id}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 border-none bg-transparent cursor-pointer text-[10px] relative ${item.isCart ? (cartOverlayOpen ? 'text-indigo-500' : 'text-slate-400') : (activePage === item.id ? 'text-indigo-500' : 'text-slate-400')}`}
              onClick={() => item.isCart ? openCartOverlay() : setActivePage(item.id)}>
              <item.Icon className="w-5 h-5" />
              {item.name}
              {item.isCart && cartItems.length > 0 && (
                <span className="absolute top-0.5 right-1 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0 rounded-full min-w-[16px] text-center">{cartItems.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT ROW */}
      <div className="customer-content-row flex-1 flex min-h-0 overflow-hidden transition-[padding] duration-300">
        <CategorySidebar isOpen={sidebarOpen} token={typeof window !== 'undefined' ? localStorage.getItem('token') : null}
          products={products} selectedCategory={selectedCategory} onSelectCategory={(cat) => setSelectedCategory(cat)} onClose={() => setSidebarOpen(false)} />

        <main className={`flex-1 flex min-h-0 overflow-hidden transition-[padding] duration-300 ${navsHidden && activePage === 'catalog' ? 'max-sm:pb-0' : 'max-sm:pb-16'}`}>
          {/* CATALOG */}
          {activePage === 'catalog' && (
            <div ref={catalogScrollRef} className={`flex-1 max-w-[100vw] ${(productsLoading || products.length === 0 || superCatList.length === 0 || viewSwitching) ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`} style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              {/* Mobile spacer for fixed sticky bar */}
              {isMob && mobileBarH > 0 && <div aria-hidden="true" style={{ height: `${mobileBarH}px` }} />}
              {/* Promo Banner */}
              <div className="px-8 max-sm:px-3 max-lg:px-5">
                {promoBanner && promoBanner.type === 'image' && promoBanner.imageUrl ? (
                  <div className="mb-6 max-sm:mb-4 rounded-2xl overflow-hidden cursor-pointer"
                    onClick={() => { if (promoBanner.ctaLink) window.open(promoBanner.ctaLink, '_blank') }}>
                    <img src={promoBanner.imageUrl} alt="Promo" className="w-full max-h-[220px] max-sm:max-h-[140px] object-cover rounded-2xl" />
                  </div>
                ) : promoBanner ? (
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 max-sm:p-4 mb-6 max-sm:mb-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 right-20 w-24 h-24 bg-indigo-500/5 rounded-full translate-y-1/2"></div>
                    <div className="relative flex items-center justify-between gap-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
                      <div className="flex-1">
                        {promoBanner.label && (
                          <div className="flex items-center gap-2 text-indigo-400 text-[11px] font-bold tracking-widest uppercase mb-2">
                            <span className="w-5 h-0.5 bg-indigo-400 rounded"></span>
                            {promoBanner.label}
                          </div>
                        )}
                        <div className="text-white text-xl max-sm:text-lg font-bold leading-tight mb-2">{promoBanner.headline}</div>
                        {promoBanner.subtitle && <div className="text-slate-400 text-sm max-sm:text-xs leading-relaxed">{promoBanner.subtitle}</div>}
                      </div>
                      {promoBanner.ctaText && (
                        <button onClick={() => { if (promoBanner.ctaLink) window.open(promoBanner.ctaLink, '_blank'); else setActivePage('newItems'); }}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm px-6 py-3 rounded-xl border-none cursor-pointer transition-colors whitespace-nowrap flex items-center gap-2 shrink-0 max-sm:w-full max-sm:justify-center">
                          {promoBanner.ctaText} <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Title */}
              <div className="px-8 max-sm:px-3 max-lg:px-5 pt-4 max-sm:pt-2">
                <span className="text-[17px] font-semibold text-slate-800 truncate max-sm:text-[15px]">
                  {selectedCategory?.name || 'All Products'} <span className="text-[13px] text-slate-400 font-normal ml-1.5">({filteredProducts.length})</span>
                </span>
              </div>

              {/* Sticky block: view toggle + search + pills (categories view) OR search only (grid view) */}
              <div
                ref={stickyBarRef}
                className="catalog-sticky-bar bg-white border-b border-slate-100 px-8 max-sm:px-3 max-lg:px-5 py-2 sm:sticky sm:top-0 z-20"
              >
                {/* Desktop search bar */}
                <div className="flex items-center justify-between max-sm:hidden">
                  <div className="relative max-w-[400px] flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off"
                      className="w-full py-2.5 pl-9 pr-3 border border-slate-200 rounded-xl text-sm transition-colors focus:border-indigo-400 focus:outline-none" />
                  </div>
                </div>

                {/* Category quick-nav pills */}
                {superCatList.length > 0 && !selectedCategory && filteredProducts.length > 0 &&
                  superCatList.length > 1 && (
                    <div className="sm:mt-2 flex items-center gap-1.5">
                      <div ref={pillsRowRef} className="flex gap-2 max-sm:gap-1.5 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: 'none' }}>
                        {superCatList.map(sc => (
                          <button key={sc.id} data-pill-id={sc.id}
                            onClick={() => {
                              setActiveSuperCatId(sc.id);
                              const el = document.getElementById(`supercat-${sc.id}`);
                              const container = catalogScrollRef.current;
                              programmaticScroll.current = true;
                              if (el && container) {
                                const elRect = el.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                const stickyH = stickyBarRef.current?.offsetHeight || 80;
                                const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - stickyH - 12;
                                container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
                                setTimeout(() => { programmaticScroll.current = false; lastScrollY.current = container.scrollTop; }, 800);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 max-sm:px-4 max-sm:py-2.5 rounded-lg max-sm:rounded-full border text-xs max-sm:text-sm font-medium cursor-pointer transition-all whitespace-nowrap shrink-0 ${activeSuperCatId === sc.id
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500'
                              }`}>
                            <span className="text-sm max-sm:text-base">{sc.emoji}</span> {sc.name}
                          </button>
                        ))}
                      </div>
                      {/* Mobile search icon */}
                      <button
                        onClick={() => setMobileSearchOpen(v => !v)}
                        className={`hidden max-sm:flex shrink-0 w-10 h-10 rounded-full border items-center justify-center transition-colors ${mobileSearchOpen || searchQuery ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                        aria-label="Search">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                {/* Mobile search dropdown */}
                {mobileSearchOpen && (
                  <div className="hidden max-sm:block mt-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off" autoFocus
                        className="w-full py-2.5 pl-9 pr-9 border border-slate-200 rounded-xl text-sm bg-white focus:border-indigo-400 focus:outline-none" />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-8 max-sm:px-0 max-lg:px-5 pb-8 max-sm:pb-3 max-lg:pb-5 pt-4 max-sm:pt-3">
                <CategoryView products={filteredProducts} favorites={favorites} cart={cartItems} cardSize={cardSize}
                  onProductSelected={selectProduct} onAddToCart={addToCart} onToggleFavorite={userRole === 'admin' ? undefined : toggleFavorite} onCardResize={setCardSize} showPrices={showPrices} />
              </div>
            </div>
          )}

          {/* FAVORITES */}
          {activePage === 'favs' && (
            <div className="flex-1 overflow-y-auto p-8 max-sm:p-3 max-sm:h-full">
              <div className="mb-6">
                <div className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Heart className="w-6 h-6" /> Favorites</div>
                <div className="text-sm text-slate-400 mt-1">Products you&apos;ve saved for quick reordering</div>
              </div>
              {favorites.length > 0 ? (
                <ProductGrid products={favorites} favorites={favorites} cart={cartItems} cardSize={cardSize}
                  onProductSelected={selectProduct} onAddToCart={addToCart} onToggleFavorite={userRole === 'admin' ? undefined : toggleFavorite} showPrices={showPrices} />
              ) : (
                <div className="text-center py-16"><Heart className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-40" /><p className="text-slate-400 text-sm">No favorites yet</p></div>
              )}
            </div>
          )}

          {/* NEW ITEMS */}
          {activePage === 'newItems' && (
            <div className="flex-1 overflow-y-auto p-8 max-sm:p-3 max-sm:h-full">
              <div className="mb-6">
                <div className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-6 h-6" /> New Items</div>
                <div className="text-sm text-slate-400 mt-1">Products added in the last 7 days</div>
              </div>
              {newItems.length > 0 ? (
                <CategoryView products={newItems} favorites={favorites} cart={cartItems}
                  onProductSelected={selectProduct} onAddToCart={addToCart} onToggleFavorite={userRole === 'admin' ? undefined : toggleFavorite} showPrices={showPrices} />
              ) : (
                <div className="text-center py-16"><Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-40" /><p className="text-slate-400 text-sm">No new items yet</p></div>
              )}
            </div>
          )}

          {/* ORDER HISTORY */}
          {activePage === 'history' && (
            <div className="flex-1 overflow-y-auto p-8 max-sm:p-3 max-sm:h-full">
              <div className="mb-6">
                <div className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Order History</div>
                <div className="flex gap-2 mt-3">
                  {['All', 'Received', 'Processing', 'Pending'].map(f => (
                    <button key={f} onClick={() => setHistoryFilter(f.toLowerCase())}
                      className={`px-4 py-1.5 border rounded-lg text-[13px] cursor-pointer transition-all ${historyFilter === f.toLowerCase() ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-sm:p-3">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <div className="font-semibold text-sm">#{(order.id || '').substring(0, 8).toUpperCase()}</div>
                        <div className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase ${statusBadgeClass(order.status)}`}>{order.status}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 py-1.5 text-[13px] border-b border-slate-100 last:border-b-0">
                          <span className="flex-1 text-slate-800 min-w-0 truncate">{item.name}</span>
                          <span className="text-slate-400 text-xs whitespace-nowrap">{item.qty} {item.unit || 'cases'}{item.unit === 'pallets' ? ` (${(item.qty || 0) * (parseInt(item.cases_per_pallet) || 60)} cs)` : ''}{showPrices ? ` × $${parseFloat(item.price || 0).toFixed(2)}` : ''}</span>
                          {showPrices && <span className="text-slate-800 font-semibold text-[13px] whitespace-nowrap min-w-[50px] text-right">${(parseFloat(item.price || 0) * (item.unit === 'pallets' ? (item.qty || 0) * (parseInt(item.cases_per_pallet) || 60) : (item.qty || 0))).toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2.5 mt-2 text-[13px] text-slate-500 font-medium">
                      <span>{order.total_cases || order.items?.reduce((s, i) => s + (i.unit === 'pallets' ? (i.qty || 0) * (parseInt(i.cases_per_pallet) || 60) : (i.qty || 0)), 0)} total cases</span>
                      {showPrices && <span className="text-base font-bold text-indigo-500">${order.items ? order.items.reduce((s, i) => { const cases = i.unit === 'pallets' ? (i.qty || 0) * (parseInt(i.cases_per_pallet) || 60) : (i.qty || 0); return s + (parseFloat(i.price || 0) * cases); }, 0).toFixed(2) : '0.00'}</span>}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-16"><ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-40" /><p className="text-slate-400 text-sm">No orders yet</p></div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* DESKTOP CART SIDEBAR */}
        <div className="hidden sm:flex w-[340px] min-w-[340px] bg-white border-l border-slate-200 flex-col sticky top-14 shrink-0 max-lg:w-[300px] max-lg:min-w-[300px]" style={{ height: 'calc(100vh - 56px)' }}>
          <div className="px-5 py-4 border-b border-slate-200"><h2 className="text-base font-semibold m-0 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Order</h2></div>
          <div className="flex-1 overflow-y-auto p-2.5">
            {cartItems.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm">Your cart is empty</div> :
              cartItems.map(item => (
                <div key={item.cartKey || item.id} className="flex flex-col gap-1.5 p-3 border-b border-slate-200 relative">
                  <div className="flex gap-2.5 items-start">
                    {item.image_url && <img src={item.image_url} alt="" className="w-[60px] h-[60px] object-contain rounded-md bg-white shrink-0 border border-slate-200" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800 leading-tight mb-0.5">{item.name}</div>
                      <div className="text-[11px] text-slate-400 mb-0.5">{item.weight}{item.bags_per_case ? ` · ${item.bags_per_case} bags/case` : ''}</div>
                      {showPrices && <div className="text-[13px] font-semibold text-indigo-500">${parseFloat(item.price || 0).toFixed(2)}/case</div>}
                    </div>
                    <button onClick={() => removeFromCart(item.cartKey || item.id)} className="bg-transparent border-none cursor-pointer text-slate-400 text-sm p-1 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button className="w-6 h-6 border border-slate-200 bg-white rounded text-slate-700 cursor-pointer flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500"
                        onClick={() => updateCartQty(item.cartKey || item.id, Math.max(1, item.qty - 1))}><Minus className="w-3 h-3" /></button>
                      <input type="number" className="w-10 h-6 text-center border border-slate-200 rounded text-xs" value={item.qty} min="1"
                        onChange={e => updateCartQty(item.cartKey || item.id, Math.max(1, parseInt(e.target.value) || 1))} />
                      <button className="w-6 h-6 border border-slate-200 bg-white rounded text-slate-700 cursor-pointer flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500"
                        onClick={() => updateCartQty(item.cartKey || item.id, item.qty + 1)}><Plus className="w-3 h-3" /></button>
                      <span className="text-[11px] text-slate-400 ml-1">{item.unit || 'cases'}</span>
                    </div>
                    {showPrices && <div className="text-xs font-semibold text-slate-800">${(parseFloat(item.price || 0) * (item.unit === 'pallets' ? item.qty * (parseInt(item.cases_per_pallet) || 60) : item.qty)).toFixed(2)}</div>}
                  </div>
                </div>
              ))
            }
          </div>
          {cartItems.length > 0 && (
            <div className="px-4 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Line items</span><span>{cartItems.length}</span></div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Total cases</span><span>{totalCases}</span></div>
              {showPrices && <div className="flex justify-between text-[13px] text-slate-800 font-semibold border-t border-slate-200 pt-1.5 mt-0.5"><span>Est. total</span><span>${cartTotal.toFixed(2)}</span></div>}
              <button onClick={() => setConfirmModalOpen(true)} className="w-full py-3 bg-indigo-500 border-none rounded-lg text-white font-semibold text-sm cursor-pointer mt-2.5 transition-colors hover:bg-indigo-600 flex items-center justify-center gap-2">Place Order <ArrowRight className="w-4 h-4" /></button>
              <button onClick={clearCart} className="w-full py-2 bg-transparent border border-slate-200 rounded-lg text-slate-500 text-[13px] cursor-pointer mt-1.5 transition-colors hover:border-red-300 hover:text-red-500">Clear cart</button>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING SEARCH + PILLS BAR (mobile only, appears after scroll) */}
      {false && showFloatingBar && activePage === 'catalog' && (
        <div
          className="hidden max-sm:block fixed left-0 right-0 bg-white border-b border-slate-100 px-3 pb-2 shadow-sm"
          style={{
            zIndex: 1105,
            // Keep this consistently below the mobile top header to prevent overlap/cropping on iPhone.
            top: `calc(env(safe-area-inset-top, 0px) + 3.5rem + ${mobileViewportOffsetTop}px)`,
            paddingTop: '8px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input id="floating-catalog-search" type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off"
                onFocus={onFloatingSearchFocus}
                onBlur={onFloatingSearchBlur}
                className="w-full py-2 pl-9 pr-3 border border-slate-200 rounded-xl text-sm transition-colors focus:border-indigo-400 focus:outline-none" />
            </div>
          </div>
          {superCatList.length > 0 && !selectedCategory && filteredProducts.length > 0 &&
            superCatList.length > 1 && (
              <div ref={floatingPillsRef} className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {superCatList.map(sc => (
                  <button key={sc.id}
                    onClick={() => {
                      setActiveSuperCatId(sc.id);
                      const el = document.getElementById(`supercat-${sc.id}`);
                      programmaticScroll.current = true;
                      if (el) {
                        const top = el.getBoundingClientRect().top + window.scrollY - 120;
                        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                        setTimeout(() => { programmaticScroll.current = false; lastScrollY.current = window.scrollY; }, 800);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-medium cursor-pointer transition-all whitespace-nowrap shrink-0 ${activeSuperCatId === sc.id
                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500'
                      }`}>
                    <span className="text-base">{sc.emoji}</span> {sc.name}
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      {/* PRODUCT SHEET */}
      {productSheetOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 max-sm:items-end"
          style={{ animation: 'fadeIn 0.2s ease', touchAction: 'none', overscrollBehavior: 'none' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeProductSheet(); }}>
          <div className="bg-white rounded-2xl w-full max-w-[780px] overflow-hidden shadow-2xl flex flex-col relative max-sm:max-w-full max-sm:rounded-t-xl max-sm:rounded-b-none max-sm:h-[75vh] max-sm:max-h-[75vh]"
            style={{ maxHeight: '85vh', animation: !sheetInteracted.current ? 'popIn 0.25s ease' : undefined, transform: `translateY(${sheetDragY}px)`, transition: sheetDragging.current ? 'none' : 'transform 0.35s cubic-bezier(.32,1,.32,1)', willChange: 'transform' }} onClick={e => e.stopPropagation()}
            onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
            <div className="shrink-0 hidden max-sm:flex justify-center items-center pt-2 pb-3">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
            <button onClick={closeProductSheet}
              className="absolute top-3 right-3.5 w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center cursor-pointer z-10 transition-colors hover:bg-indigo-500 hover:border-indigo-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            {selectedProduct && (
              <>
                <div ref={sheetScrollRef} className="flex-1 overflow-y-auto min-h-0">
                  <div className="flex gap-6 p-6 max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:p-4 max-sm:text-center">
                    {(() => {
                      const images = [
                        selectedProduct.image_url && { url: selectedProduct.image_url, label: 'Unit' },
                        selectedProduct.bundle_image_url && { url: selectedProduct.bundle_image_url, label: 'Bundle' },
                        selectedProduct.box_image_url && { url: selectedProduct.box_image_url, label: 'Box' },
                      ].filter(Boolean);
                      const idx = sheetImgIdx < images.length ? sheetImgIdx : 0;
                      return (
                        <div className="shrink-0 max-sm:items-center max-sm:flex max-sm:flex-col">
                          <div className="w-[260px] h-[260px] rounded-xl overflow-hidden border border-slate-200 max-sm:w-[150px] max-sm:h-[150px] relative max-sm:cursor-pointer"
                            onClick={() => { if (window.innerWidth <= 640) setImgViewerOpen(true); }}
                            onTouchStart={e => { sheetImgTouchX.current = e.touches[0].clientX; }}
                            onTouchEnd={e => {
                              const diff = e.changedTouches[0].clientX - sheetImgTouchX.current;
                              if (Math.abs(diff) > 40) { e.preventDefault(); if (diff > 40 && idx > 0) setSheetImgIdx(idx - 1); else if (diff < -40 && idx < images.length - 1) setSheetImgIdx(idx + 1); }
                            }}>
                            <div className="flex transition-transform duration-300 h-full" style={{ transform: `translateX(-${idx * 100}%)` }}>
                              {images.map((img, i) => (
                                <img key={i} src={img.url} alt={img.label} className="w-full h-full object-cover shrink-0" />
                              ))}
                            </div>
                          </div>
                          {images.length > 1 && (
                            <div className="flex items-center justify-center gap-1 mt-1.5">
                              {images.map((img, i) => (
                                <button key={i} onClick={() => setSheetImgIdx(i)}
                                  className={`w-1.5 h-1.5 rounded-full border-none cursor-pointer transition-all ${i === idx ? 'bg-indigo-500 w-3' : 'bg-slate-300'}`} />
                              ))}
                            </div>
                          )}
                          {images.length > 1 && (
                            <div className="text-[10px] text-slate-400 text-center mt-0.5">{images[idx]?.label}</div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0 pt-1 max-sm:w-full">
                      {selectedProduct.brand && <div className="text-2xl font-semibold text-slate-800 leading-tight tracking-tight pr-10 max-sm:text-[17px] max-sm:pr-0">{selectedProduct.brand}</div>}
                      <div className="text-2xl font-semibold text-slate-800 leading-tight mb-2 tracking-tight pr-10 max-sm:text-[17px] max-sm:pr-0">{selectedProduct.name}</div>
                      <div className="flex flex-wrap gap-1.5 mb-2 max-sm:justify-center">
                        <span className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-0.5 text-[11px] text-slate-500">{selectedProduct.super_category}</span>
                        <span className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-0.5 text-[11px] text-slate-500">{selectedProduct.category}</span>
                      </div>
                      <div className="mb-3 max-sm:hidden">
                        {selectedProduct.weight && <div className="flex justify-between py-1 text-sm"><span className="text-slate-400">Weight</span><span className="text-slate-800 font-medium">{selectedProduct.weight}</span></div>}
                        {selectedProduct.bags_per_case && <div className="flex justify-between py-1 text-sm"><span className="text-slate-400">Bags/Case</span><span className="text-slate-800 font-medium">{selectedProduct.bags_per_case}</span></div>}
                        {!selectedProduct.bags_per_case && selectedProduct.units_per_case && <div className="flex justify-between py-1 text-sm"><span className="text-slate-400">Units/Case</span><span className="text-slate-800 font-medium">{selectedProduct.units_per_case}</span></div>}
                        {selectedProduct.cases_per_pallet && <div className="flex justify-between py-1 text-sm"><span className="text-slate-400">Cases/Pallet</span><span className="text-slate-800 font-medium">{selectedProduct.cases_per_pallet}</span></div>}
                        {selectedProduct.sku && <div className="flex justify-between py-1 text-sm"><span className="text-slate-400">SKU</span><span className="text-slate-800 font-medium font-mono text-[13px]">{selectedProduct.sku}</span></div>}
                        {[
                          { value: selectedProduct.barcode_pack, label: 'Barcode (Pack)' },
                          { value: selectedProduct.barcode_bundle, label: 'Barcode (Bundle)' },
                          { value: selectedProduct.barcode_box, label: 'Barcode (Box)' },
                        ].filter(b => b.value).map(b => (
                          <div key={b.label} className="relative group flex justify-between py-0.5 text-xs cursor-pointer">
                            <span className="text-slate-400">{b.label}</span>
                            <span className="text-slate-800 font-medium font-mono text-[11px] underline decoration-dotted underline-offset-2">{b.value}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block max-sm:group-active:block z-50">
                              <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 flex flex-col items-center gap-1">
                                <svg ref={el => { if (el) { try { import('jsbarcode').then(m => m.default(el, b.value.replace(/\s/g, ''), { format: 'CODE128', width: 1.5, height: 50, displayValue: false, margin: 0 })); } catch { } } }} />
                                <span className="text-[10px] text-slate-500 font-mono">{b.value}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {userRole !== 'admin' && (
                        <div className="flex items-center gap-1.5 mt-2.5 cursor-pointer w-fit max-sm:mx-auto" onClick={() => toggleFavorite(selectedProduct)}>
                          <Heart className={`w-4.5 h-4.5 transition-colors ${favorites.some(f => f.id === selectedProduct.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                          <span className="text-xs text-slate-400">{favorites.some(f => f.id === selectedProduct.id) ? 'Saved' : 'Add to favorites'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 mx-5 shrink-0" />
                  <div className="p-5 shrink-0">
                    <div className="text-[13px] font-semibold text-slate-800 mb-3">Add to Order</div>
                    <div className="flex gap-0 bg-slate-100 border border-slate-200 rounded-lg p-0.5 mb-3">
                      <button className={`flex-1 py-2 text-center rounded-md border-none text-[13px] font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 ${selectedUnit === 'cases' ? 'bg-white text-indigo-500 shadow-sm font-semibold' : 'bg-transparent text-slate-500'}`}
                        onClick={() => setSelectedUnit('cases')}><Package className="w-3.5 h-3.5" /> Cases</button>
                      <button className={`flex-1 py-2 text-center rounded-md border-none text-[13px] font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 ${selectedUnit === 'pallets' ? 'bg-white text-indigo-500 shadow-sm font-semibold' : 'bg-transparent text-slate-500'}`}
                        onClick={() => setSelectedUnit('pallets')}><Building className="w-3.5 h-3.5" /> Pallets</button>
                    </div>
                    {selectedProduct.show_price !== false && showPrices && (() => {
                      const casePrice = parseFloat(selectedProduct.price || 0);
                      const casesPerPallet = parseInt(selectedProduct.cases_per_pallet) || 60;
                      const unitPrice = selectedUnit === 'pallets' ? casePrice * casesPerPallet : casePrice;
                      const subtotal = unitPrice * sheetQty;
                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-3 text-[13px]">
                          {selectedUnit === 'pallets' && <div className="flex justify-between py-0.5"><span className="text-slate-400">Cases per pallet</span><span className="text-slate-800 font-medium">{casesPerPallet}</span></div>}
                          <div className="flex justify-between py-0.5"><span className="text-slate-400">Price per {selectedUnit === 'pallets' ? 'pallet' : 'case'}</span><span className="text-slate-800 font-medium">${unitPrice.toFixed(2)}{selectedUnit === 'pallets' ? ` (${casesPerPallet} × $${casePrice.toFixed(2)})` : ''}</span></div>
                          <div className="flex justify-between py-0.5"><span className="text-slate-400">Est. subtotal</span><span className="text-indigo-500 font-semibold">${subtotal.toFixed(2)}</span></div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2.5 mb-3.5">
                      <span className="text-[13px] text-slate-500 flex-1 font-medium">Qty ({selectedUnit})</span>
                      <button onClick={() => setSheetQty(prev => Math.max(1, prev - 1))}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-800 cursor-pointer flex items-center justify-center shadow-sm transition-colors hover:bg-indigo-500 hover:border-indigo-500 hover:text-white"><Minus className="w-4 h-4" /></button>
                      <input type="number" min="1" value={sheetQty} onChange={(e) => setSheetQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[17px] font-semibold py-1.5 focus:outline-none focus:border-indigo-400" />
                      <button onClick={() => setSheetQty(prev => prev + 1)}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-800 cursor-pointer flex items-center justify-center shadow-sm transition-colors hover:bg-indigo-500 hover:border-indigo-500 hover:text-white"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-white shrink-0 max-sm:p-4 max-sm:border-t-0">
                  <button onClick={() => { addToCart(selectedProduct, sheetQty, selectedUnit); closeProductSheet(); }}
                    className="w-full py-3.5 bg-indigo-500 border-none rounded-xl text-white font-semibold text-[15px] cursor-pointer transition-colors hover:bg-indigo-600">
                    Add {sheetQty} {selectedUnit}{selectedUnit === 'pallets' ? ` (${sheetQty * (parseInt(selectedProduct.cases_per_pallet) || 60)} cases)` : ''} to Cart
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* FULLSCREEN IMAGE VIEWER (mobile) */}
      {imgViewerOpen && selectedProduct && (() => {
        const images = [
          selectedProduct.image_url && { url: selectedProduct.image_url, label: 'Unit' },
          selectedProduct.bundle_image_url && { url: selectedProduct.bundle_image_url, label: 'Bundle' },
          selectedProduct.box_image_url && { url: selectedProduct.box_image_url, label: 'Box' },
        ].filter(Boolean);
        const idx = sheetImgIdx < images.length ? sheetImgIdx : 0;
        return (
          <div className="fixed inset-0 z-[20000] bg-black/95 flex flex-col items-center justify-center"
            onClick={() => setImgViewerOpen(false)}>
            <button onClick={() => setImgViewerOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 border-none text-white flex items-center justify-center cursor-pointer z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="w-full h-[70vh] relative overflow-hidden"
              onClick={e => e.stopPropagation()}
              onTouchStart={e => { imgViewerTouchX.current = e.touches[0].clientX; }}
              onTouchEnd={e => {
                const diff = e.changedTouches[0].clientX - imgViewerTouchX.current;
                if (diff > 50 && idx > 0) setSheetImgIdx(idx - 1);
                else if (diff < -50 && idx < images.length - 1) setSheetImgIdx(idx + 1);
              }}>
              <div className="flex transition-transform duration-300 h-full" style={{ transform: `translateX(-${idx * 100}%)` }}>
                {images.map((img, i) => (
                  <div key={i} className="w-full h-full shrink-0 flex items-center justify-center p-4 bg-white">
                    <img src={img.url} alt={img.label} className="max-w-full max-h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {images.map((img, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); setSheetImgIdx(i); }}
                    className={`px-3 py-1.5 rounded-full border-none text-xs font-medium cursor-pointer transition-all ${i === idx ? 'bg-white text-slate-800' : 'bg-white/20 text-white/70'}`}>
                    {img.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <CartOverlay isOpen={cartOverlayOpen} cartItems={cartItems} onClose={closeCartOverlay}
        onRemoveItem={removeFromCart} onPlaceOrder={() => { setConfirmModalOpen(true); closeCartOverlay(); }}
        onClearCart={clearCart} onUpdateQty={updateCartQty} showPrices={showPrices} />

      <OrderConfirmModal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} onSubmit={submitOrder}
        cartItems={cartItems} total={cartTotal} isSubmitting={isSubmittingOrder} showPrices={showPrices} />

      {/* ACCOUNT SETTINGS MODAL */}
      {acctModal && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-5" onClick={() => setAcctModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden max-sm:max-w-full max-sm:rounded-xl max-sm:m-2.5"
            style={{ animation: 'popIn 0.2s ease' }} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div className="text-base font-semibold text-slate-800">Account Settings</div>
              <button onClick={() => setAcctModal(null)} className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center transition-colors hover:bg-indigo-500 hover:border-indigo-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-0.5 px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
              {[{ key: 'profile', label: 'Profile', Icon: User }, { key: 'contact', label: 'Contact', Icon: ClipboardList }, { key: 'security', label: 'Security', Icon: Lock }].map(t => (
                <button key={t.key} onClick={e => { e.stopPropagation(); setAcctModal(t.key); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-none rounded-lg text-xs font-medium cursor-pointer transition-all ${acctModal === t.key ? 'bg-white text-indigo-500 shadow-sm font-semibold' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
                  <t.Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {acctSaveBanner && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg px-3.5 py-2.5 text-[13px] font-medium mb-3.5"><CheckCircle className="w-4 h-4 shrink-0" /> {acctSaveBanner}</div>}

              {acctModal === 'profile' && (
                <div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4">
                    {[['Account ID', acctData.accountId, true], ['Customer since', acctData.customerSince], ['Assigned rep', acctData.salesRep]].map(([label, val, mono]) => (
                      <div key={label} className="flex justify-between items-center py-1.5 text-xs border-b border-slate-100 last:border-b-0">
                        <span className="text-slate-400">{label}</span>
                        <span className={`text-slate-800 font-medium ${mono ? 'font-mono text-[11px] text-slate-500' : ''}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2.5 mb-4">
                    <div className="flex gap-2.5 max-sm:flex-col">
                      {[['First Name', 'firstName'], ['Last Name', 'lastName']].map(([label, key]) => (
                        <div key={key} className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
                          <input type="text" value={acctData[key]} onChange={e => setAcctData(p => ({ ...p, [key]: e.target.value }))}
                            className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Company Name</label>
                      <input type="text" value={acctData.company} onChange={e => setAcctData(p => ({ ...p, company: e.target.value }))}
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email (cannot change)</label>
                      <input type="email" value={acctData.email} disabled autoComplete="off"
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none opacity-60 cursor-not-allowed" />
                    </div>
                  </div>
                  <button onClick={saveAcctProfile} className="w-full py-2.5 bg-indigo-500 border-none rounded-lg text-white font-semibold text-sm cursor-pointer transition-colors hover:bg-indigo-600">Save Profile</button>
                </div>
              )}

              {acctModal === 'contact' && (
                <div>
                  <div className="flex flex-col gap-2.5 mb-4">
                    <div className="flex gap-2.5 max-sm:flex-col">
                      {[['Primary Phone', 'phone', 'tel'], ['Alt Phone', 'altPhone', 'tel']].map(([label, key, type]) => (
                        <div key={key} className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
                          <input type={type} value={acctData[key]} onChange={e => setAcctData(p => ({ ...p, [key]: e.target.value }))}
                            className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" />
                        </div>
                      ))}
                    </div>
                    {[['Address Line 1', 'address1'], ['Address Line 2', 'address2']].map(([label, key]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
                        <input type="text" value={acctData[key]} onChange={e => setAcctData(p => ({ ...p, [key]: e.target.value }))}
                          className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" />
                      </div>
                    ))}
                    <div className="flex gap-2.5 max-sm:flex-col">
                      <div className="flex-1 flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">City</label><input type="text" value={acctData.city} onChange={e => setAcctData(p => ({ ...p, city: e.target.value }))} className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" /></div>
                      <div className="w-20 flex flex-col gap-1 max-sm:w-full"><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">State</label><input type="text" value={acctData.state} onChange={e => setAcctData(p => ({ ...p, state: e.target.value }))} className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" /></div>
                      <div className="w-24 flex flex-col gap-1 max-sm:w-full"><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ZIP</label><input type="text" value={acctData.zip} onChange={e => setAcctData(p => ({ ...p, zip: e.target.value }))} className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" /></div>
                    </div>
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Country</label><input type="text" value={acctData.country} onChange={e => setAcctData(p => ({ ...p, country: e.target.value }))} className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveAcctContact} className="flex-1 py-2.5 bg-indigo-500 border-none rounded-lg text-white font-semibold text-sm cursor-pointer transition-colors hover:bg-indigo-600">Save Contact</button>
                    <button onClick={clearAcctContact} className="flex-1 py-2.5 bg-transparent border border-slate-200 rounded-lg text-slate-500 font-semibold text-sm cursor-pointer transition-colors hover:border-red-300 hover:text-red-500 hover:bg-red-50">Clear All</button>
                  </div>
                </div>
              )}

              {acctModal === 'security' && (
                <div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4">
                    {[['Login email', acctData.email], ['Last sign in', acctData.lastSignIn]].map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center py-1.5 text-xs border-b border-slate-100 last:border-b-0">
                        <span className="text-slate-400">{label}</span><span className="text-slate-800 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2.5 mb-4">
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current Password</label>
                      <input type="password" value={acctCurrentPwd} onChange={e => setAcctCurrentPwd(e.target.value)} placeholder="Enter current password" autoComplete="off"
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" /></div>
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">New Password</label>
                      <input type="password" value={acctNewPwd} onChange={e => { setAcctNewPwd(e.target.value); checkPwdStrength(e.target.value); }} placeholder="Min 8 characters" autoComplete="new-password"
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" />
                      {acctNewPwd && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${(acctPwdStrength / 5) * 100}%`, background: pwdStrengthColor }} /></div>
                          <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: pwdStrengthColor }}>{pwdStrengthLabel}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Confirm New Password</label>
                      <input type="password" value={acctConfirmPwd} onChange={e => setAcctConfirmPwd(e.target.value)} placeholder="Repeat new password" autoComplete="new-password"
                        className="px-2.5 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-slate-50 outline-none transition-colors focus:border-indigo-400" /></div>
                  </div>
                  <button onClick={saveAcctSecurity} className="w-full py-2.5 bg-indigo-500 border-none rounded-lg text-white font-semibold text-sm cursor-pointer transition-colors hover:bg-indigo-600">Change Password</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CART ADD TOAST */}
      {cartToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[3000] pointer-events-none max-sm:top-auto max-sm:bottom-20"
          style={{ animation: 'toastIn 0.25s ease' }}>
          <div className="bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium whitespace-nowrap">
            <ShoppingCart className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span className="truncate max-w-[200px]">{cartToast.name}</span>
            <span className="text-indigo-300">+{cartToast.qty}</span>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium text-white z-[3000] shadow-lg max-sm:bottom-[74px] max-sm:right-3 max-sm:left-3 max-sm:text-center ${toastType === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ animation: 'toastIn 0.3s ease' }}>
          <div className="flex items-center gap-2 justify-center">
            <CheckCircle className="w-4 h-4" /> {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerApp;

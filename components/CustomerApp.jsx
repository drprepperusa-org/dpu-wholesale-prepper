'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CartOverlay from './CartOverlay';
import CategorySidebar from './CategorySidebar';
import CategoryView from './CategoryView';
import ProductGrid from './ProductGrid';
import OrderConfirmModal from './OrderConfirmModal';

function CustomerApp({ currentUser, userRole, viewMode, setViewMode, onLogout }) {
  const [activePage, setActivePage] = useState('catalog');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [acctDropdownOpen, setAcctDropdownOpen] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [cartOverlayOpen, setCartOverlayOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cardSize, setCardSize] = useState(1.0);
  const [cartItems, setCartItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [gridViewMode, setGridViewMode] = useState('grid');
  const [selectedUnit, setSelectedUnit] = useState('cases');
  const [sheetQty, setSheetQty] = useState(1);
  const [acctModal, setAcctModal] = useState(null); // 'profile' | 'contact' | 'security' | null
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

  const tabs = [
    { id: 'catalog', name: 'Order', icon: '\uD83D\uDECD' },
    { id: 'favs', name: 'Favorites', icon: '\u2661' },
    { id: 'newItems', name: 'New Items', icon: '\u2728' },
    { id: 'history', name: 'History', icon: '\uD83D\uDCCB' }
  ];

  useEffect(() => {
    loadProducts();
    loadOrders();
    if (userRole !== 'admin') loadFavorites();
  }, []);

  // Populate acctData from currentUser
  useEffect(() => {
    if (!currentUser) return;
    const u = currentUser;
    const parts = (u.name || u.contact_name || '').split(' ');
    setAcctData(prev => ({
      ...prev,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      company: u.companyName || u.company_name || '',
      email: u.email || '',
      phone: u.phone || '',
      address1: u.address_line1 || '',
      address2: u.address_line2 || '',
      city: u.city || '',
      state: u.state || '',
      zip: u.zip || '',
      country: u.country || '',
      accountId: u.id ? `HS-${String(u.id).padStart(3, '0')}` : '',
      customerSince: u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
      salesRep: 'Mike Johnson',
      lastSignIn: 'Today'
    }));
  }, [currentUser]);

  // Auto-retry if products failed to load on first render
  useEffect(() => {
    if (products.length === 0) {
      const timer = setTimeout(() => loadProducts(), 500);
      return () => clearTimeout(timer);
    }
  }, [products.length]);

  const loadProducts = async () => {
    try {
      console.log('[CustomerApp] Loading products...');
      const res = await fetch('/api/products');
      console.log('[CustomerApp] API response status:', res.status);
      const data = await res.json();
      const prods = data.products || [];
      console.log('[CustomerApp] Got', prods.length, 'products');
      setProducts(prods);

      const superCatMap = new Map();
      prods.forEach(p => {
        if (p.is_hidden) return;
        const superKey = p.super_category || 'Other';
        const subKey = p.category || 'Uncategorized';
        if (!superCatMap.has(superKey)) {
          superCatMap.set(superKey, { super: superKey, name: superKey, count: 0, subcategories: new Map() });
        }
        const superCat = superCatMap.get(superKey);
        if (!superCat.subcategories.has(subKey)) {
          superCat.subcategories.set(subKey, { name: subKey, super: superKey, count: 0 });
        }
        superCat.subcategories.get(subKey).count++;
        superCat.count++;
      });

      setCategories(Array.from(superCatMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(sc => ({
          ...sc,
          subcategories: Array.from(sc.subcategories.values()).sort((a, b) => a.name.localeCompare(b.name))
        })));
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const addToCart = (product, qty = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + qty } : item);
      }
      return [...prev, { ...product, qty }];
    });
  };

  const toggleFavorite = async (product) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const isFav = favorites.some(f => f.id === product.id);
    try {
      if (isFav) {
        await fetch(`/api/favorites/${product.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        setFavorites(prev => prev.filter(f => f.id !== product.id));
      } else {
        await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ product_id: product.id }) });
        setFavorites(prev => [...prev, product]);
      }
    } catch (err) { console.error('Toggle favorite error:', err); }
  };

  const loadFavorites = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (err) { console.error(err); }
  };

  const loadOrders = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || data || []);
      }
    } catch (e) { /* ignore */ }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => !p.is_hidden);
    if (selectedCategory) {
      const isSuperCat = selectedCategory.totalProducts !== undefined || selectedCategory.categories;
      if (isSuperCat) {
        filtered = filtered.filter(p => p.super_category_id === selectedCategory.id || p.super_category === selectedCategory.name);
      } else {
        filtered = filtered.filter(p => p.category_id === selectedCategory.id || p.category === selectedCategory.name);
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.super_category?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const newItems = useMemo(() => {
    return products.filter(p => {
      if (!p.created_at) return false;
      const createdDate = new Date(p.created_at);
      const now = new Date();
      const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 7 && !p.is_hidden;
    });
  }, [products]);

  const filteredOrders = useMemo(() => {
    if (historyFilter === 'all') return orders;
    return orders.filter(o => (o.status || '').toLowerCase() === historyFilter.toLowerCase());
  }, [orders, historyFilter]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.qty), 0);
  }, [cartItems]);

  const totalCases = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.qty, 0);
  }, [cartItems]);

  const getInitials = () => {
    const source = currentUser?.companyName || currentUser?.email || 'User';
    const parts = source.split(/[\s@]/).filter(p => p);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => currentUser?.companyName || currentUser?.email || 'User';

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => item.id === productId ? { ...item, qty: newQty } : item)
    );
  };

  const clearCart = () => {
    if (window.confirm('Clear all items from cart?')) setCartItems([]);
  };

  const submitOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        name: item.name,
        qty: item.qty,
        unit: 'cases'
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: orderItems })
      });
      if (res.ok) {
        setCartItems([]);
        setConfirmModalOpen(false);
        setActivePage('history');
        loadOrders();
      }
    } catch (e) { console.error(e); }
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setProductSheetOpen(true);
    setSheetQty(1);
    setSelectedUnit('cases');
  };

  const showAcctBanner = (msg) => {
    setAcctSaveBanner(msg);
    setTimeout(() => setAcctSaveBanner(''), 3000);
  };

  const checkPwdStrength = (val) => {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[a-z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    setAcctPwdStrength(s);
  };

  const pwdStrengthColor = acctPwdStrength <= 1 ? '#c0392b' : acctPwdStrength <= 3 ? '#a05c00' : '#2d7a4f';
  const pwdStrengthLabel = acctPwdStrength <= 1 ? 'Weak' : acctPwdStrength <= 3 ? 'Medium' : 'Strong';

  const saveAcctProfile = async () => {
    if (!acctData.firstName) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ contact_name: `${acctData.firstName} ${acctData.lastName}`.trim(), company_name: acctData.company })
      });
      if (res.ok) showAcctBanner('Profile saved successfully');
    } catch (e) { console.error('saveAcctProfile error:', e); }
  };

  const saveAcctContact = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone: acctData.phone, address_line1: acctData.address1, address_line2: acctData.address2, city: acctData.city, state: acctData.state, zip: acctData.zip, country: acctData.country })
      });
      if (res.ok) showAcctBanner('Contact info saved');
    } catch (e) { console.error('saveAcctContact error:', e); }
  };

  const clearAcctContact = () => {
    setAcctData(prev => ({ ...prev, phone: '', altPhone: '', address1: '', address2: '', city: '', state: '', zip: '', country: '' }));
  };

  const saveAcctSecurity = async () => {
    if (!acctCurrentPwd || !acctNewPwd) return;
    if (acctNewPwd !== acctConfirmPwd) { showAcctBanner('Passwords do not match'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword: acctCurrentPwd, newPassword: acctNewPwd })
      });
      if (res.ok) { showAcctBanner('Password updated successfully'); setAcctCurrentPwd(''); setAcctNewPwd(''); setAcctConfirmPwd(''); setAcctPwdStrength(0); }
      else { const d = await res.json(); showAcctBanner(d.error || 'Failed to update password'); }
    } catch (e) { console.error('saveAcctSecurity error:', e); }
  };

  return (
    <div className="app">

      {/* NAV */}
      <nav className="topnav">
        <div className="nav-left">
          <button className={`burger ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span></span><span></span><span></span>
          </button>
          <div className="brand">
            <div className="brand-logo">{'\uD83D\uDD25'}</div>
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
              <button className={`toggle-btn ${viewMode === 'customer' ? 'active' : ''}`} onClick={() => setViewMode('customer')}>{'\uD83D\uDC65'} Customer</button>
              <button className={`toggle-btn ${viewMode === 'admin' ? 'active' : ''}`} onClick={() => setViewMode('admin')}>{'\uD83D\uDD27'} Admin</button>
            </div>
          )}
          <div className="size-slider">
            <span className="size-label">Cards:</span>
            <input type="range" min="0.8" max="1.6" step="0.2" value={cardSize} onChange={(e) => setCardSize(parseFloat(e.target.value))} className="slider" />
            <span className="size-icon">{'\u{1F4CF}'}</span>
          </div>

          <div className="acct-wrap">
            <div className="acct-trigger" onClick={() => setAcctDropdownOpen(!acctDropdownOpen)}>
              <div className="acct-avatar">{getInitials()}</div>
              <span className="acct-name">{getDisplayName()}</span>
              <span className="acct-chevron">{'\u25BC'}</span>
            </div>
            <div className={`acct-dropdown ${acctDropdownOpen ? 'open' : ''}`}>
              <div className="acct-dd-head">
                <div className="acct-dd-co">{currentUser?.companyName || 'Guest'}</div>
                <div className="acct-dd-email">{currentUser?.email}</div>
              </div>
              <div className="acct-dd-items">
                <button className="acct-dd-item" onClick={() => { setAcctDropdownOpen(false); setAcctModal('profile'); }}>
                  <span className="dd-icon">{'\uD83D\uDC64'}</span> My Profile
                </button>
                <button className="acct-dd-item" onClick={() => { setAcctDropdownOpen(false); setAcctModal('contact'); }}>
                  <span className="dd-icon">{'\uD83D\uDCCB'}</span> Contact & Address
                </button>
                <button className="acct-dd-item" onClick={() => { setAcctDropdownOpen(false); setAcctModal('security'); }}>
                  <span className="dd-icon">{'\uD83D\uDD12'}</span> Password & Security
                </button>
                <div className="acct-dd-divider"></div>
                <button className="acct-dd-item danger" onClick={onLogout}>
                  <span className="dd-icon">{'\u21A9'}</span> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV */}
      <div className="mobile-nav">
        <div className="mobile-nav-inner">
          <button className={`mnav-btn ${activePage === 'catalog' ? 'active' : ''}`} onClick={() => setActivePage('catalog')}><span className="micon">{'\uD83D\uDECD'}</span>Order</button>
          <button className={`mnav-btn ${activePage === 'favs' ? 'active' : ''}`} onClick={() => setActivePage('favs')}><span className="micon">{'\u2661'}</span>Favorites</button>
          <button className={`mnav-btn ${cartOverlayOpen ? 'active' : ''}`} onClick={() => setCartOverlayOpen(true)}>
            <span className="micon">{'\uD83D\uDED2'}</span>Cart
            {cartItems.length > 0 && <span className="mbadge">{cartItems.length}</span>}
          </button>
          <button className={`mnav-btn ${activePage === 'history' ? 'active' : ''}`} onClick={() => setActivePage('history')}><span className="micon">{'\uD83D\uDCCB'}</span>History</button>
        </div>
      </div>

      {/* CONTENT ROW: sidebar + main + cart */}
      <div className="content-row">
        {/* SIDEBAR */}
        <CategorySidebar
          isOpen={sidebarOpen}
          token={typeof window !== 'undefined' ? localStorage.getItem('token') : null}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => { setSelectedCategory(cat); }}
          onClose={() => setSidebarOpen(false)}
        />

        {/* MAIN CONTENT */}
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {activePage === 'catalog' && (
          <div className="catalog-wrap">
            <div className="catalog-main">
              {products.length === 0 && <div style={{padding:20,textAlign:'center',color:'#9a948c'}}>Loading products...</div>}
              <div className="cat-bar">
                <span className="cat-bar-title">
                  {selectedCategory?.name || 'All Products'}
                  <span className="cat-bar-count">({filteredProducts.length})</span>
                </span>
                <div className="cat-bar-controls">
                  <div className="view-toggle">
                    <button className={`view-btn ${gridViewMode === 'grid' ? 'active' : ''}`} onClick={() => setGridViewMode('grid')}>{'\u25A6'} Grid</button>
                    <button className={`view-btn ${gridViewMode === 'categories' ? 'active' : ''}`} onClick={() => setGridViewMode('categories')}>{'\uD83D\uDCC2'} Categories</button>
                  </div>
                  <div className="search-box">
                    <span className="search-icon">{'\uD83D\uDD0D'}</span>
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
              <div className="page-title">{'\u2661'} Favorites</div>
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
                <div className="es-icon">{'\u2661'}</div>
                <p>No favorites yet</p>
              </div>
            )}
          </div>
        )}

        {activePage === 'newItems' && (
          <div className="catalog-main">
            <div className="page-header">
              <div className="page-title">{'\u2728'} New Items</div>
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
                <div className="es-icon">{'\u2728'}</div>
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
                    <span className={`order-status-badge s-${(order.status || '').toLowerCase()}`}>{order.status}</span>
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
                  <div className="es-icon">{'\uD83D\uDCCB'}</div>
                  <p>No orders yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* PRODUCT SHEET */}
      <div className={`sheet-overlay ${productSheetOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setProductSheetOpen(false); }}>
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
                  <button className={`unit-tab ${selectedUnit === 'cases' ? 'active' : ''}`} onClick={() => setSelectedUnit('cases')}>{'\uD83D\uDCE6'} Cases</button>
                  <button className={`unit-tab ${selectedUnit === 'pallets' ? 'active' : ''}`} onClick={() => setSelectedUnit('pallets')}>{'\uD83C\uDFD7'} Pallets</button>
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
                  <button className="qty-minus" onClick={() => setSheetQty(prev => Math.max(1, prev - 1))}>{'\u2212'}</button>
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
        <div className="cart-head"><h2>{'\uD83D\uDED2'} Order</h2></div>
        <div className="cart-items">
          {cartItems.length === 0 ? <div className="cart-empty">Your cart is empty</div> :
            cartItems.map(item => (
              <div key={item.id} className="cart-item">
                {item.image_url && <img src={item.image_url} alt="" className="ci-img" />}
                <div className="ci-details">
                  <div className="ci-meta-top">{item.weight}{item.bags_per_case ? ` · ${item.bags_per_case} bags/case` : ''}</div>
                  <div className="ci-price">${parseFloat(item.price || 0).toFixed(2)}</div>
                  <div className="ci-qty-row">
                    <button className="ci-qty-btn" onClick={() => updateCartQty(item.id, Math.max(1, item.qty - 1))}>−</button>
                    <input type="number" className="ci-qty-input" value={item.qty} min="1"
                      onChange={e => updateCartQty(item.id, Math.max(1, parseInt(e.target.value) || 1))} />
                    <button className="ci-qty-btn" onClick={() => updateCartQty(item.id, item.qty + 1)}>+</button>
                    <span className="ci-unit">cases</span>
                  </div>
                  <div className="ci-subtotal">${(parseFloat(item.price || 0) * item.qty).toFixed(2)}</div>
                </div>
                <button className="ci-remove" onClick={() => removeFromCart(item.id)}>{'\u2715'}</button>
              </div>
            ))
          }
        </div>
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="sum-row"><span>Line items</span><span>{cartItems.length}</span></div>
            <div className="sum-row"><span>Total cases</span><span>{totalCases}</span></div>
            <div className="sum-row total"><span>Est. total</span><span>${cartTotal.toFixed(2)}</span></div>
            <button className="btn-place" onClick={() => setConfirmModalOpen(true)}>Place Order {'\u2192'}</button>
            <button className="btn-clear-cart" onClick={clearCart}>Clear cart</button>
          </div>
        )}
      </div>
      </div>{/* END content-row */}

      {/* ORDER CONFIRM MODAL */}
      <OrderConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onSubmit={submitOrder}
        cartItems={cartItems}
        total={cartTotal}
      />

      {/* ACCOUNT SETTINGS MODAL */}
      {acctModal && (
        <div className="acct-modal-overlay" onClick={() => setAcctModal(null)}>
          <div className="acct-modal" onClick={e => e.stopPropagation()}>
            <div className="acct-modal-header">
              <div className="acct-modal-title">Account Settings</div>
              <button className="acct-modal-close" onClick={() => setAcctModal(null)}>{'\u2715'}</button>
            </div>
            <div className="acct-modal-tabs">
              <button className={`am-tab ${acctModal === 'profile' ? 'active' : ''}`} onClick={() => setAcctModal('profile')}>{'\u{1F464}'} Profile</button>
              <button className={`am-tab ${acctModal === 'contact' ? 'active' : ''}`} onClick={() => setAcctModal('contact')}>{'\u{1F4CB}'} Contact</button>
              <button className={`am-tab ${acctModal === 'security' ? 'active' : ''}`} onClick={() => setAcctModal('security')}>{'\u{1F512}'} Security</button>
            </div>
            <div className="acct-modal-body">
              {acctSaveBanner && <div className="acct-save-banner">{'\u2705'} {acctSaveBanner}</div>}

              {acctModal === 'profile' && (
                <div>
                  <div className="am-readonly-section">
                    <div className="am-field-row">
                      <span className="am-label">Account ID</span>
                      <span className="am-value mono">{acctData.accountId}</span>
                    </div>
                    <div className="am-field-row">
                      <span className="am-label">Customer since</span>
                      <span className="am-value">{acctData.customerSince}</span>
                    </div>
                    <div className="am-field-row">
                      <span className="am-label">Assigned rep</span>
                      <span className="am-value">{acctData.salesRep}</span>
                    </div>
                  </div>
                  <div className="am-form">
                    <div className="am-input-row">
                      <div className="am-input-group">
                        <label>First Name</label>
                        <input type="text" value={acctData.firstName} onChange={e => setAcctData(p => ({ ...p, firstName: e.target.value }))} />
                      </div>
                      <div className="am-input-group">
                        <label>Last Name</label>
                        <input type="text" value={acctData.lastName} onChange={e => setAcctData(p => ({ ...p, lastName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="am-input-group">
                      <label>Company Name</label>
                      <input type="text" value={acctData.company} onChange={e => setAcctData(p => ({ ...p, company: e.target.value }))} />
                    </div>
                    <div className="am-input-group">
                      <label>Email (cannot change)</label>
                      <input type="email" value={acctData.email} disabled />
                    </div>
                  </div>
                  <button className="btn-am-save" onClick={saveAcctProfile}>Save Profile</button>
                </div>
              )}

              {acctModal === 'contact' && (
                <div>
                  <div className="am-form">
                    <div className="am-input-row">
                      <div className="am-input-group">
                        <label>Primary Phone</label>
                        <input type="tel" value={acctData.phone} onChange={e => setAcctData(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div className="am-input-group">
                        <label>Alt Phone</label>
                        <input type="tel" value={acctData.altPhone} onChange={e => setAcctData(p => ({ ...p, altPhone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="am-input-group">
                      <label>Address Line 1</label>
                      <input type="text" value={acctData.address1} onChange={e => setAcctData(p => ({ ...p, address1: e.target.value }))} />
                    </div>
                    <div className="am-input-group">
                      <label>Address Line 2</label>
                      <input type="text" value={acctData.address2} onChange={e => setAcctData(p => ({ ...p, address2: e.target.value }))} />
                    </div>
                    <div className="am-input-row">
                      <div className="am-input-group">
                        <label>City</label>
                        <input type="text" value={acctData.city} onChange={e => setAcctData(p => ({ ...p, city: e.target.value }))} />
                      </div>
                      <div className="am-input-group" style={{ maxWidth: 80 }}>
                        <label>State</label>
                        <input type="text" value={acctData.state} onChange={e => setAcctData(p => ({ ...p, state: e.target.value }))} />
                      </div>
                      <div className="am-input-group" style={{ maxWidth: 100 }}>
                        <label>ZIP</label>
                        <input type="text" value={acctData.zip} onChange={e => setAcctData(p => ({ ...p, zip: e.target.value }))} />
                      </div>
                    </div>
                    <div className="am-input-group">
                      <label>Country</label>
                      <input type="text" value={acctData.country} onChange={e => setAcctData(p => ({ ...p, country: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-am-save" onClick={saveAcctContact}>Save Contact</button>
                    <button className="btn-am-clear" onClick={clearAcctContact}>Clear All</button>
                  </div>
                </div>
              )}

              {acctModal === 'security' && (
                <div>
                  <div className="am-readonly-section">
                    <div className="am-field-row">
                      <span className="am-label">Login email</span>
                      <span className="am-value">{acctData.email}</span>
                    </div>
                    <div className="am-field-row">
                      <span className="am-label">Last sign in</span>
                      <span className="am-value">{acctData.lastSignIn}</span>
                    </div>
                  </div>
                  <div className="am-form">
                    <div className="am-input-group">
                      <label>Current Password</label>
                      <input type="password" value={acctCurrentPwd} onChange={e => setAcctCurrentPwd(e.target.value)} placeholder="Enter current password" />
                    </div>
                    <div className="am-input-group">
                      <label>New Password</label>
                      <input type="password" value={acctNewPwd} onChange={e => { setAcctNewPwd(e.target.value); checkPwdStrength(e.target.value); }} placeholder="Min 8 characters" />
                      {acctNewPwd && (
                        <div className="pwd-strength">
                          <div className="pwd-bar"><div className="pwd-fill" style={{ width: `${(acctPwdStrength / 5) * 100}%`, background: pwdStrengthColor }} /></div>
                          <span className="pwd-label" style={{ color: pwdStrengthColor }}>{pwdStrengthLabel}</span>
                        </div>
                      )}
                    </div>
                    <div className="am-input-group">
                      <label>Confirm New Password</label>
                      <input type="password" value={acctConfirmPwd} onChange={e => setAcctConfirmPwd(e.target.value)} placeholder="Repeat new password" />
                    </div>
                  </div>
                  <button className="btn-am-save" onClick={saveAcctSecurity}>Change Password</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerApp;

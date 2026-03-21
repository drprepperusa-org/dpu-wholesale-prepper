<template>
  <div id="app" class="app">

    <!-- LOGIN PAGE (shown when not authenticated) -->
    <Login v-if="!isLoggedIn" @login="handleLogin" />

    <!-- MAIN APP (shown when authenticated) -->
    <template v-else>

    <!-- NAV -->
    <nav class="topnav">
      <div class="nav-left">
        <button class="burger" id="burgerBtn" @click="toggleSidebar">
          <span></span><span></span><span></span>
        </button>
        <div class="brand">
          <div class="brand-logo">🔥</div>
          <span class="brand-name"><span>DR</span> Prepper</span>
        </div>
      </div>
      <div class="nav-right">
        <div class="nav-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="['nav-tab', { active: activePage === tab.id }]"
            @click="activePage = tab.id"
          >
            {{ tab.icon }} {{ tab.name }}
          </button>
        </div>
        <!-- ADMIN VIEW MODE TOGGLE - only visible to admin users -->
        <div class="view-mode-toggle" v-if="userRole === 'admin'">
          <button 
            :class="['toggle-btn', { active: viewMode === 'customer' }]"
            @click="viewMode = 'customer'"
            title="Switch to customer view"
          >
            👥 Customer
          </button>
          <button 
            :class="['toggle-btn', { active: viewMode === 'admin' }]"
            @click="viewMode = 'admin'"
            title="Switch to admin view"
          >
            🔧 Admin
          </button>
        </div>
        <div class="size-slider">
          <span class="size-label">Cards:</span>
          <input 
            v-model.number="cardSize"
            type="range" 
            min="0.8" 
            max="1.6" 
            step="0.2"
            class="slider"
          >
          <span class="size-icon">📏</span>
        </div>
        <div class="acct-wrap">
          <div class="acct-trigger" @click="toggleAcctDropdown">
            <div class="acct-avatar">{{ getInitials() }}</div>
            <span class="acct-name">{{ getDisplayName() }}</span>
            <span class="acct-chevron">▼</span>
          </div>
          <div :class="['acct-dropdown', { open: acctDropdownOpen }]">
            <div class="acct-dd-head">
              <div class="acct-dd-co">{{ acctData.company }}</div>
              <div class="acct-dd-email">{{ acctData.email }}</div>
            </div>
            <div class="acct-dd-items">
              <button class="acct-dd-item" @click="openAcctModal('profile')">
                <span class="dd-icon">👤</span> My Profile
              </button>
              <button class="acct-dd-item" @click="openAcctModal('contact')">
                <span class="dd-icon">📋</span> Contact & Address
              </button>
              <button class="acct-dd-item" @click="openAcctModal('security')">
                <span class="dd-icon">🔒</span> Password & Security
              </button>
              <div class="acct-dd-divider"></div>
              <button class="acct-dd-item danger" @click="signOut">
                <span class="dd-icon">↩</span> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- MOBILE BOTTOM NAV -->
    <div class="mobile-nav">
      <div class="mobile-nav-inner">
        <button :class="['mnav-btn', { active: activePage === 'catalog' }]" @click="activePage = 'catalog'">
          <span class="micon">🛍</span>Order
        </button>
        <button :class="['mnav-btn', { active: activePage === 'favs' }]" @click="activePage = 'favs'">
          <span class="micon">♡</span>Favorites
        </button>
        <button :class="['mnav-btn', { active: cartOverlayOpen }]" @click="showCart">
          <span class="micon">🛒</span>Cart
          <span class="mbadge" v-if="cartItems.length">{{ cartItems.length }}</span>
        </button>
        <button :class="['mnav-btn', { active: activePage === 'history' }]" @click="activePage = 'history'">
          <span class="micon">📋</span>History
        </button>
      </div>
    </div>

    <!-- ADMIN DASHBOARD PAGE -->
    <div v-if="viewMode === 'admin'" class="page active admin-page" id="page-admin">
      <AdminPortal />
    </div>

    <!-- CATALOG PAGE -->
    <div v-show="viewMode === 'customer' && activePage === 'catalog'" class="page active" id="page-catalog">
      <div class="catalog-wrap">
        <div :class="['sidebar-overlay', { open: sidebarOpen }]" @click="closeSidebar"></div>
        <aside :class="['sidebar', { collapsed: sidebarCollapsed, 'open-mobile': sidebarOpen }]">
          <div class="sb-top">
            <div class="sb-label">Browse</div>
          </div>
          <div class="sb-search">
            <input 
              type="text" 
              placeholder="Search categories…" 
              @input="e => filterCategories(e.target.value)"
            >
          </div>
          <div class="sb-all active" @click="selectCategory(null)">
            <span style="font-size:14px">📦</span> All Products
            <span class="a-count">{{ products.length }}</span>
          </div>
          <div class="sb-divider"></div>
          <div id="sidebarContent">
            <CategoryList 
              :categories="filteredCategories"
              @category-selected="selectCategory"
            />
          </div>
        </aside>
        <div class="catalog-main" id="catalogMain">
          <div class="cat-bar">
            <span class="cat-bar-title" id="catTitle">
              {{ selectedCategory?.name || 'All Products' }}
              <span class="cat-bar-count" id="catCount">({{ filteredProducts.length }})</span>
            </span>
            <div class="cat-bar-controls">
              <div class="view-toggle">
                <button 
                  :class="['view-btn', { active: gridViewMode === 'grid' }]"
                  @click="gridViewMode = 'grid'"
                  title="Grid view"
                >
                  ▦ Grid
                </button>
                <button 
                  :class="['view-btn', { active: gridViewMode === 'categories' }]"
                  @click="gridViewMode = 'categories'"
                  title="Browse by category"
                >
                  📂 Categories
                </button>
              </div>
              <div class="search-box">
                <span class="search-icon">🔍</span>
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Search products, SKUs…"
                >
              </div>
            </div>
          </div>
          <div id="catalogContent" :style="{ '--card-scale': cardSize }">
            <ProductGrid 
              v-if="gridViewMode === 'grid'"
              :products="filteredProducts"
              :favorites="favorites"
              :cart="cartItems"
              :card-size="cardSize"
              @product-selected="selectProduct"
              @add-to-cart="addToCart"
              @toggle-favorite="toggleFavorite"
              @card-resize="cardSize = $event"
            />
            <CategoryView
              v-else
              :products="filteredProducts"
              :favorites="favorites"
              :cart="cartItems"
              @product-selected="selectProduct"
              @add-to-cart="addToCart"
              @toggle-favorite="toggleFavorite"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- FAVORITES PAGE -->
    <div v-show="viewMode === 'customer' && activePage === 'favs'" class="page" id="page-favs">
      <div class="catalog-main fav-main">
        <div class="page-header">
          <div class="page-title">♡ Favorites</div>
          <div class="page-subtitle">Products you've saved for quick reordering</div>
        </div>
        <div v-if="favorites.length > 0" class="fav-grid" :style="{ '--card-scale': cardSize }">
          <ProductCard 
            v-for="product in favorites"
            :key="product.id"
            :product="product"
            :is-favorited="isFavorited(product)"
            :in-cart="cartItems.some(item => item.id === product.id)"
            @product-selected="selectProduct"
            @add-to-cart="addToCart"
            @toggle-favorite="toggleFavorite"
          />
        </div>
        <div v-else class="empty-state">
          <div class="es-icon">♡</div>
          <p>No favorites yet</p>
        </div>
      </div>
    </div>

    <!-- NEW ITEMS PAGE -->
    <div v-show="viewMode === 'customer' && activePage === 'newItems'" class="page" id="page-new-items">
      <div class="catalog-main">
        <div class="page-header">
          <div class="page-title">✨ New Items</div>
          <div class="page-subtitle">Products added in the last 7 days</div>
        </div>
        <div v-if="newItems.length > 0">
          <CategoryView
            :products="newItems"
            :favorites="favorites"
            :cart="cartItems"
            @product-selected="selectProduct"
            @add-to-cart="addToCart"
            @toggle-favorite="toggleFavorite"
          />
        </div>
        <div v-else class="empty-state">
          <div class="es-icon">✨</div>
          <p>No new items yet</p>
        </div>
      </div>
    </div>

    <!-- ORDER HISTORY PAGE -->
    <div v-show="viewMode === 'customer' && activePage === 'history'" class="page" id="page-history">
      <div class="history-main">
        <div class="history-header">
          <div class="page-title">Order History</div>
          <div class="filter-row">
            <button :class="['filter-btn', { active: historyFilter === 'all' }]" @click="historyFilter = 'all'">All</button>
            <button :class="['filter-btn', { active: historyFilter === 'received' }]" @click="historyFilter = 'received'">Received</button>
            <button :class="['filter-btn', { active: historyFilter === 'processing' }]" @click="historyFilter = 'processing'">Processing</button>
            <button :class="['filter-btn', { active: historyFilter === 'pending' }]" @click="historyFilter = 'pending'">Pending</button>
          </div>
        </div>
        <div class="order-list">
          <div v-if="filteredOrders.length === 0" class="empty-state">
            <div class="es-icon">📋</div>
            <p>No orders yet</p>
          </div>
          <div v-for="order in filteredOrders" :key="order.id" class="order-card">
            <div class="order-card-head">
              <div>
                <div class="order-id">{{ order.id }}</div>
                <div class="order-date">{{ formatDate(order.created_at) }}</div>
              </div>
              <span :class="['order-status-badge', `s-${(order.status || '').toLowerCase()}`]">{{ order.status }}</span>
            </div>
            <div class="order-items-list">
              <div v-for="item in order.items" :key="item.id" class="order-item-row">
                <span class="oi-name">{{ item.name }}</span>
                <span class="oi-qty">{{ item.qty }} {{ item.unit }}</span>
              </div>
            </div>
            <div class="order-footer">
              <span class="order-cases">{{ order.total_cases }} total cases</span>
              <button class="btn-reorder" @click="reorder(order)">🔄 Reorder</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PRODUCT SHEET (slide up) -->
    <div :class="['sheet-overlay', { open: productSheetOpen }]" @click="closeProductSheet">
      <div class="prod-sheet" id="prodSheetInner" @click.stop>
        <div class="sheet-handle"></div>
        <div v-if="selectedProduct" class="sheet-hero">
          <div class="sheet-img-wrap">
            <img :src="selectedProduct.image_url" :alt="selectedProduct.name">
          </div>
          <div class="sheet-info">
            <div class="sheet-name">{{ selectedProduct.name }}</div>
            <div class="sheet-tags">
              <span class="sheet-tag">{{ selectedProduct.super }}</span>
              <span class="sheet-tag">{{ selectedProduct.cat }}</span>
            </div>
            <div class="sheet-fav" @click="toggleFavorite(selectedProduct)">
              <span 
                :class="['sheet-fav-icon', { faved: isFavorited(selectedProduct) }]"
              >
                ♡
              </span>
              <span class="sheet-fav-label">
                {{ isFavorited(selectedProduct) ? 'Saved' : 'Add to favorites' }}
              </span>
            </div>
          </div>
        </div>
        <div class="sheet-divider"></div>
        <div class="sheet-order">
          <div class="sheet-order-title">Add to Order</div>
          <div class="unit-tabs">
            <button :class="['unit-tab', { active: selectedUnit === 'cases' }]" @click="selectedUnit = 'cases'">📦 Cases</button>
            <button :class="['unit-tab', { active: selectedUnit === 'pallets' }]" @click="selectedUnit = 'pallets'">🏗 Pallets</button>
          </div>
          <div v-if="selectedProduct?.show_price !== false" class="unit-info">
            <div class="ui-row">
              <span class="ui-label">Price per unit</span>
              <span class="ui-val">${{ parseFloat(selectedProduct?.price || 0).toFixed(2) }}</span>
            </div>
            <div class="ui-row">
              <span class="ui-label">Est. subtotal</span>
              <span class="ui-val red">${{ (parseFloat(selectedProduct?.price || 0) * sheetQty).toFixed(2) }}</span>
            </div>
          </div>
          <div class="qty-row">
            <span class="qty-label">Qty ({{ selectedUnit }})</span>
            <button class="qty-minus" @click="sheetQty = Math.max(1, sheetQty - 1)">−</button>
            <input v-model.number="sheetQty" type="number" min="1" class="qty-input">
            <button class="qty-plus" @click="sheetQty++">+</button>
          </div>
          <button class="btn-add" @click="addSelectedProduct">Add to Cart</button>
        </div>
      </div>
    </div>

    <!-- CART SIDEBAR (FIXED RIGHT) - DESKTOP ONLY -->
    <div v-if="viewMode === 'customer'" :class="['cart-sidebar', { empty: cartItems.length === 0, 'desktop-only': true }]">
      <div class="cart-head">
        <h2>🛒 Order</h2>
      </div>
      <div class="cart-items" id="cartItems">
        <div v-if="cartItems.length === 0" class="cart-empty">
          Your cart is empty
        </div>
        <CartItem 
          v-for="item in cartItems"
          :key="item.id"
          :item="item"
          @remove="removeFromCart"
        />
      </div>
      <div v-if="cartItems.length > 0" class="cart-footer">
        <div class="sum-row">
          <span>Line items</span>
          <span>{{ cartItems.length }}</span>
        </div>
        <div class="sum-row">
          <span>Total cases</span>
          <span>{{ totalCases }}</span>
        </div>
        <div class="sum-row total">
          <span>Est. total</span>
          <span>${{ cartTotal.toFixed(2) }}</span>
        </div>
        <button class="btn-place" @click="showConfirm">Place Order →</button>
        <button class="btn-clear-cart" @click="clearCart">Clear cart</button>
      </div>
    </div>

    <!-- CART OVERLAY (MOBILE ONLY) -->
    <CartOverlay 
      :open="cartOverlayOpen"
      :cart-items="cartItems"
      @close="closeCartOverlay"
      @remove-item="removeFromCart"
      @place-order="showConfirm"
      @clear-cart="clearCart"
    />

    <!-- ACCOUNT SETTINGS MODAL -->
    <div :class="['modal-overlay', { open: acctModalOpen }]" @click.self="closeAcctModal">
      <div class="acct-modal" @click.stop>
        <div class="acct-modal-header">
          <div class="acct-modal-title">Account Settings</div>
          <button class="acct-modal-close" @click="closeAcctModal">✕</button>
        </div>
        <div class="acct-modal-tabs">
          <button :class="['am-tab', { active: acctModalTab === 'profile' }]" @click="acctModalTab = 'profile'">👤 Profile</button>
          <button :class="['am-tab', { active: acctModalTab === 'contact' }]" @click="acctModalTab = 'contact'">📋 Contact</button>
          <button :class="['am-tab', { active: acctModalTab === 'security' }]" @click="acctModalTab = 'security'">🔒 Security</button>
        </div>
        <div class="acct-modal-body">
          <div v-if="acctSaveBanner" class="acct-save-banner">✅ {{ acctSaveBanner }}</div>

          <!-- Profile Tab -->
          <div v-if="acctModalTab === 'profile'">
            <div class="am-readonly-section">
              <div class="am-field-row">
                <span class="am-label">Account ID</span>
                <span class="am-value mono">{{ acctData.accountId }}</span>
              </div>
              <div class="am-field-row">
                <span class="am-label">Customer since</span>
                <span class="am-value">{{ acctData.customerSince }}</span>
              </div>
              <div class="am-field-row">
                <span class="am-label">Assigned rep</span>
                <span class="am-value">{{ acctData.salesRep }}</span>
              </div>
            </div>
            <div class="am-form">
              <div class="am-input-row">
                <div class="am-input-group">
                  <label>First Name</label>
                  <input type="text" v-model="acctData.firstName">
                </div>
                <div class="am-input-group">
                  <label>Last Name</label>
                  <input type="text" v-model="acctData.lastName">
                </div>
              </div>
              <div class="am-input-group">
                <label>Company Name</label>
                <input type="text" v-model="acctData.company">
              </div>
              <div class="am-input-group">
                <label>Email (cannot change)</label>
                <input type="email" v-model="acctData.email" disabled>
              </div>
            </div>
            <button class="btn-am-save" @click="saveAcctProfile">Save Profile</button>
          </div>

          <!-- Contact Tab -->
          <div v-if="acctModalTab === 'contact'">
            <div class="am-form">
              <div class="am-input-row">
                <div class="am-input-group">
                  <label>Primary Phone</label>
                  <input type="tel" v-model="acctData.phone">
                </div>
                <div class="am-input-group">
                  <label>Alt Phone</label>
                  <input type="tel" v-model="acctData.altPhone">
                </div>
              </div>
              <div class="am-input-group">
                <label>Address Line 1</label>
                <input type="text" v-model="acctData.address1">
              </div>
              <div class="am-input-group">
                <label>Address Line 2</label>
                <input type="text" v-model="acctData.address2">
              </div>
              <div class="am-input-row">
                <div class="am-input-group">
                  <label>City</label>
                  <input type="text" v-model="acctData.city">
                </div>
                <div class="am-input-group">
                  <label>State</label>
                  <input type="text" v-model="acctData.state" style="max-width:80px">
                </div>
                <div class="am-input-group">
                  <label>ZIP</label>
                  <input type="text" v-model="acctData.zip" style="max-width:100px">
                </div>
              </div>
              <div class="am-input-group">
                <label>Country</label>
                <input type="text" v-model="acctData.country">
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-am-save" @click="saveAcctContact">Save Contact</button>
              <button class="btn-am-clear" @click="clearAcctContact">Clear All</button>
            </div>
          </div>

          <!-- Security Tab -->
          <div v-if="acctModalTab === 'security'">
            <div class="am-readonly-section">
              <div class="am-field-row">
                <span class="am-label">Login email</span>
                <span class="am-value">{{ acctData.email }}</span>
              </div>
              <div class="am-field-row">
                <span class="am-label">Last sign in</span>
                <span class="am-value">{{ acctData.lastSignIn }}</span>
              </div>
            </div>
            <div class="am-form">
              <div class="am-input-group">
                <label>Current Password</label>
                <input type="password" v-model="acctCurrentPwd" placeholder="Enter current password">
              </div>
              <div class="am-input-group">
                <label>New Password</label>
                <input type="password" v-model="acctNewPwd" @input="checkPwdStrength(acctNewPwd)" placeholder="Min 8 characters">
                <div v-if="acctNewPwd" class="pwd-strength">
                  <div class="pwd-bar">
                    <div class="pwd-fill" :style="{ width: (acctPwdStrength / 5 * 100) + '%', background: pwdStrengthColor }"></div>
                  </div>
                  <span class="pwd-label" :style="{ color: pwdStrengthColor }">{{ pwdStrengthLabel }}</span>
                </div>
              </div>
              <div class="am-input-group">
                <label>Confirm New Password</label>
                <input type="password" v-model="acctConfirmPwd" placeholder="Repeat new password">
              </div>
            </div>
            <button class="btn-am-save" @click="saveAcctSecurity">Change Password</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ORDER CONFIRM MODAL -->
    <OrderConfirmModal 
      v-if="confirmModalOpen"
      @close="confirmModalOpen = false"
      @submit="submitOrder"
    />

    <!-- TOAST NOTIFICATION -->
    <div :class="['toast', { show: toastVisible }]">{{ toastMessage }}</div>

    </template><!-- end v-else (authenticated) -->
  </div>
</template>

<script>
import CategoryList from './components/CategoryList.vue'
import ProductGrid from './components/ProductGrid.vue'
import CategoryView from './components/CategoryView.vue'
import ProductCard from './components/ProductCard.vue'
import CartItem from './components/CartItem.vue'
import CartOverlay from './components/CartOverlay.vue'
import OrderConfirmModal from './components/OrderConfirmModal.vue'
import AdminPortal from './components/AdminPortal.vue'
import Login from './components/Login.vue'

export default {
  name: 'App',
  components: {
    CategoryList,
    ProductGrid,
    CategoryView,
    ProductCard,
    CartItem,
    CartOverlay,
    OrderConfirmModal,
    AdminPortal,
    Login
  },
  data() {
    return {
      // Auth state
      isLoggedIn: false,
      userRole: 'customer', // 'customer' or 'admin'
      currentUser: null,
      
      activePage: 'catalog',
      sidebarOpen: false,
      sidebarCollapsed: false,
      acctDropdownOpen: false,
      productSheetOpen: false,
      cartOverlayOpen: false,
      confirmModalOpen: false,
      products: [],
      categories: [],
      favorites: [],
      cartItems: [],
      selectedProduct: null,
      selectedCategory: null,
      selectedUnit: 'cases',
      sheetQty: 1,
      searchQuery: '',
      categorySearchQuery: '',
      cardSize: 1.0,
      historyFilter: 'all',
      orders: [],
      tabs: [
        { id: 'catalog', name: 'Order', icon: '🛍' },
        { id: 'favs', name: 'Favorites', icon: '♡' },
        { id: 'newItems', name: 'New Items', icon: '✨' },
        { id: 'history', name: 'History', icon: '📋' }
      ],
      viewMode: 'customer', // 'customer' or 'admin'
      gridViewMode: 'grid', // 'grid' or 'categories'
      // Account Modal
      acctModalOpen: false,
      acctModalTab: 'profile',
      acctSaveBanner: '',
      acctCurrentPwd: '',
      acctNewPwd: '',
      acctConfirmPwd: '',
      acctPwdStrength: 0,
      acctData: {
        accountId: 'HS-001',
        customerSince: 'January 15, 2025',
        salesRep: 'Mike Johnson',
        firstName: 'John',
        lastName: 'Smith',
        company: 'Happy Snacks Co.',
        email: 'buyer@happysnacks.com',
        phone: '(310) 555-0100',
        altPhone: '',
        address1: '123 Market St',
        address2: 'Suite 400',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA',
        lastSignIn: 'Today 9:14 AM'
      },
      // Toast
      toastVisible: false,
      toastMessage: ''
    }
  },
  computed: {
    filteredCategories() {
      if (!this.categorySearchQuery) return this.categories
      const q = this.categorySearchQuery.toLowerCase()
      return this.categories.filter(c => c.name.toLowerCase().includes(q))
    },
    filteredProducts() {
      let filtered = this.products
      
      // Filter out hidden products (admin-hidden)
      filtered = filtered.filter(p => !p.is_hidden)
      
      // Filter by category
      if (this.selectedCategory) {
        // Check if it's a sub-category or super-category
        if (this.selectedCategory.super && this.selectedCategory.super !== this.selectedCategory.name) {
          // It's a sub-category - filter by category name
          filtered = filtered.filter(p => p.category === this.selectedCategory.name)
        } else {
          // It's a super-category - filter by super_category
          filtered = filtered.filter(p => p.super_category === this.selectedCategory.name)
        }
      }
      
      // Filter by search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase()
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(q) ||
          p.super_category?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        )
      }
      
      return filtered
    },
    newItems() {
      // Filter products created in the last 7 days
      return this.products.filter(p => {
        if (!p.created_at) return false
        const createdDate = new Date(p.created_at)
        const now = new Date()
        const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24)
        return diffDays <= 7 && !p.is_hidden
      })
    },
    cartTotal() {
      return this.cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0)
    },
    totalCases() {
      return this.cartItems.reduce((sum, item) => sum + item.qty, 0)
    },
    filteredOrders() {
      if (this.historyFilter === 'all') return this.orders
      return this.orders.filter(o => (o.status || '').toLowerCase() === this.historyFilter)
    },
    pwdStrengthLabel() {
      const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
      return labels[this.acctPwdStrength] || ''
    },
    pwdStrengthColor() {
      const colors = ['', '#c0392b', '#e67e22', '#2980b9', '#2d7a4f', '#2d7a4f']
      return colors[this.acctPwdStrength] || ''
    }
  },
  methods: {
    getInitials() {
      // Try company name first, fallback to email
      const source = this.acctData.company || this.acctData.email || ''
      const parts = source.split(/[\s@]/).filter(p => p)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      } else if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase()
      }
      return 'U'
    },
    getDisplayName() {
      // Show company name if available, otherwise email
      return this.acctData.company || this.acctData.email || 'User'
    },
    async handleLogin(loginData) {
      this.isLoggedIn = true
      this.userRole = loginData.role || 'customer'
      this.currentUser = loginData.user
      this.viewMode = loginData.role === 'admin' ? 'admin' : 'customer'
      
      // Update acctData from user info
      if (loginData.user) {
        const u = loginData.user
        if (u.name) {
          const parts = u.name.split(' ')
          this.acctData.firstName = parts[0] || ''
          this.acctData.lastName = parts.slice(1).join(' ') || ''
        }
        if (u.companyName) this.acctData.company = u.companyName
        if (u.email) this.acctData.email = u.email
      }
      
      // Load customer's favorites from server
      if (loginData.role === 'customer') {
        await this.loadFavorites()
      }
    },
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },
    closeSidebar() {
      this.sidebarOpen = false
    },
    toggleAcctDropdown() {
      this.acctDropdownOpen = !this.acctDropdownOpen
    },
    signOut() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
      this.isLoggedIn = false
      this.userRole = 'customer'
      this.currentUser = null
      this.acctDropdownOpen = false
      // Reset state
      this.cartItems = []
      this.orders = []
    },
    async openAcctModal(tab) {
      this.acctModalTab = tab || 'profile'
      this.acctModalOpen = true
      this.acctDropdownOpen = false
      this.acctSaveBanner = ''
      
      // Load fresh profile data from server
      const token = localStorage.getItem('token')
      try {
        const res = await fetch('/api/customers/profile', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })
        if (res.ok) {
          const data = await res.json()
          const customer = data.customer
          
          // Populate acctData with actual customer data
          if (customer.contact_name) {
            const parts = customer.contact_name.split(' ')
            this.acctData.firstName = parts[0] || ''
            this.acctData.lastName = parts.slice(1).join(' ') || ''
          }
          if (customer.company_name) this.acctData.company = customer.company_name
          if (customer.email) this.acctData.email = customer.email
          if (customer.phone) this.acctData.phone = customer.phone || ''
          if (customer.address_line1) this.acctData.address1 = customer.address_line1 || ''
          if (customer.address_line2) this.acctData.address2 = customer.address_line2 || ''
          if (customer.city) this.acctData.city = customer.city || ''
          if (customer.state) this.acctData.state = customer.state || ''
          if (customer.zip) this.acctData.zip = customer.zip || ''
          if (customer.country) this.acctData.country = customer.country || ''
          
          // Set customer since from created_at
          if (customer.created_at) {
            const date = new Date(customer.created_at)
            this.acctData.customerSince = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          }
          
          // Always show DJ as assigned rep
          this.acctData.salesRep = 'DJ'
          
          // Set account ID
          if (customer.id) {
            this.acctData.accountId = customer.id
          }
        }
      } catch (err) {
        console.error('Load profile error:', err)
      }
    },
    closeAcctModal() {
      this.acctModalOpen = false
      this.acctSaveBanner = ''
    },
    async saveAcctProfile() {
      const token = localStorage.getItem('token')
      if (!this.acctData.firstName) {
        this.showToast('❌ Name is required')
        return
      }
      try {
        const res = await fetch('/api/customers/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            contact_name: `${this.acctData.firstName} ${this.acctData.lastName}`.trim(),
            company_name: this.acctData.company
          })
        })
        if (res.ok) {
          this.acctSaveBanner = 'Profile updated successfully'
          setTimeout(() => { this.acctSaveBanner = '' }, 3000)
          this.showToast('✅ Profile saved')
        } else {
          const data = await res.json()
          this.showToast(`❌ ${data.error || 'Failed to save profile'}`)
        }
      } catch (e) {
        console.error('saveAcctProfile error:', e)
        this.showToast('❌ Connection error — changes not saved')
      }
    },
    async saveAcctContact() {
      const token = localStorage.getItem('token')
      try {
        const res = await fetch('/api/customers/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            phone: this.acctData.phone,
            address_line1: this.acctData.address1,
            address_line2: this.acctData.address2,
            city: this.acctData.city,
            state: this.acctData.state,
            zip: this.acctData.zip,
            country: this.acctData.country
          })
        })
        if (res.ok) {
          this.acctSaveBanner = 'Contact info updated'
          setTimeout(() => { this.acctSaveBanner = '' }, 3000)
          this.showToast('✅ Contact saved')
        } else {
          const data = await res.json()
          this.showToast(`❌ ${data.error || 'Failed to save contact'}`)
        }
      } catch (e) {
        console.error('saveAcctContact error:', e)
        this.showToast('❌ Connection error — changes not saved')
      }
    },
    clearAcctContact() {
      if (!confirm('Clear all contact information?')) return
      
      this.acctData.phone = ''
      this.acctData.altPhone = ''
      this.acctData.address1 = ''
      this.acctData.address2 = ''
      this.acctData.city = ''
      this.acctData.state = ''
      this.acctData.zip = ''
      this.acctData.country = ''
      
      this.saveAcctContact()
    },
    async saveAcctSecurity() {
      if (!this.acctCurrentPwd) {
        this.showToast('❌ Enter your current password')
        return
      }
      if (this.acctNewPwd.length < 8) {
        this.showToast('❌ New password must be at least 8 characters')
        return
      }
      if (this.acctNewPwd !== this.acctConfirmPwd) {
        this.showToast('❌ Passwords do not match')
        return
      }
      const token = localStorage.getItem('token')
      try {
        const res = await fetch('/api/customers/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            current_password: this.acctCurrentPwd,
            new_password: this.acctNewPwd
          })
        })
        if (res.ok) {
          this.acctSaveBanner = 'Password changed successfully'
          setTimeout(() => { this.acctSaveBanner = '' }, 3000)
          this.showToast('✅ Password changed')
          this.acctCurrentPwd = ''
          this.acctNewPwd = ''
          this.acctConfirmPwd = ''
          this.acctPwdStrength = 0
        } else {
          const data = await res.json()
          this.showToast(`❌ ${data.error || 'Failed to change password'}`)
        }
      } catch (e) {
        console.error('saveAcctSecurity error:', e)
        this.showToast('❌ Connection error — password not changed')
      }
    },
    checkPwdStrength(val) {
      let score = 0
      if (val.length >= 8) score++
      if (val.length >= 12) score++
      if (/[A-Z]/.test(val)) score++
      if (/[0-9]/.test(val)) score++
      if (/[^A-Za-z0-9]/.test(val)) score++
      this.acctPwdStrength = score
    },
    showToast(msg) {
      this.toastMessage = msg
      this.toastVisible = true
      setTimeout(() => { this.toastVisible = false }, 3000)
    },
    reorder(order) {
      if (!order.items) return
      order.items.forEach(item => {
        const product = this.products.find(p => p.id === item.product_id)
        if (product) this.addToCart(product, item.qty)
      })
      this.activePage = 'catalog'
      this.showToast('✅ Items added to cart')
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      return d.toLocaleDateString()
    },
    selectCategory(category) {
      this.selectedCategory = category
      this.closeSidebar()
    },
    filterCategories(query) {
      this.categorySearchQuery = query
    },
    selectProduct(product) {
      this.selectedProduct = product
      this.productSheetOpen = true
      this.sheetQty = 1
      this.selectedUnit = 'cases'
    },
    closeProductSheet(e) {
      if (e.target === e.currentTarget) {
        this.productSheetOpen = false
      }
    },
    showCart() {
      this.cartOverlayOpen = true
    },
    closeCartOverlay() {
      this.cartOverlayOpen = false
    },
    async toggleFavorite(product) {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No auth token found')
        return
      }
      
      const isFav = this.isFavorited(product)
      
      try {
        if (isFav) {
          // Remove from favorites
          const res = await fetch(`/api/favorites/${product.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (res.ok) {
            const idx = this.favorites.findIndex(f => f.id === product.id)
            if (idx >= 0) {
              this.favorites.splice(idx, 1)
            }
          }
        } else {
          // Add to favorites
          const res = await fetch('/api/favorites', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: product.id })
          })
          if (res.ok) {
            this.favorites.push(product)
          }
        }
      } catch (err) {
        console.error('Toggle favorite error:', err)
      }
    },
    isFavorited(product) {
      return this.favorites.some(f => f.id === product.id)
    },
    async loadFavorites() {
      const token = localStorage.getItem('token')
      if (!token) return
      
      try {
        const res = await fetch('/api/favorites', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (res.ok) {
          const data = await res.json()
          this.favorites = data.favorites || []
        }
      } catch (err) {
        console.error('Load favorites error:', err)
      }
    },
    addSelectedProduct() {
      if (!this.selectedProduct) return
      this.addToCart(this.selectedProduct, this.sheetQty)
      this.productSheetOpen = false
    },
    addToCart(product, qty = 1) {
      console.log('addToCart called with:', { product, qty })
      console.log('Product price:', product.price)
      console.log('Current cartItems:', this.cartItems)
      
      const existing = this.cartItems.find(item => item.id === product.id)
      if (existing) {
        existing.qty += qty
        console.log('Updated existing item:', existing)
      } else {
        const newItem = { ...product, qty }
        console.log('Adding new item:', newItem)
        this.cartItems.push(newItem)
      }
      console.log('Cart after add:', this.cartItems)
    },
    removeFromCart(productId) {
      this.cartItems = this.cartItems.filter(item => item.id !== productId)
    },
    clearCart() {
      if (confirm('Clear all items from cart?')) {
        this.cartItems = []
      }
    },
    showConfirm() {
      this.confirmModalOpen = true
      this.closeCartOverlay()
    },
    async submitOrder() {
      try {
        const token = localStorage.getItem('token')
        const orderItems = this.cartItems.map(item => ({
          product_id: item.id,
          name: item.name,
          qty: item.qty,
          unit: this.selectedUnit || 'cases'
        }))
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ items: orderItems })
        })
        if (res.ok) {
          const newOrder = await res.json()
          this.orders.unshift(newOrder)
        } else {
          // Fallback — add order locally for demo
          const fakeOrder = {
            id: `ORD-${Date.now()}`,
            created_at: new Date().toISOString(),
            status: 'Pending',
            items: this.cartItems.map(i => ({ product_id: i.id, name: i.name, qty: i.qty, unit: 'cases' })),
            total_cases: this.totalCases
          }
          this.orders.unshift(fakeOrder)
        }
      } catch (e) {
        // Offline fallback
        const fakeOrder = {
          id: `ORD-${Date.now()}`,
          created_at: new Date().toISOString(),
          status: 'Pending',
          items: this.cartItems.map(i => ({ product_id: i.id, name: i.name, qty: i.qty, unit: 'cases' })),
          total_cases: this.totalCases
        }
        this.orders.unshift(fakeOrder)
      }
      this.confirmModalOpen = false
      this.cartItems = []
      this.showToast('✅ Order placed!')
      this.activePage = 'history'
    },
    async loadOrders() {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/orders', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (res.ok) this.orders = await res.json()
      } catch (e) {
        // Orders empty on offline — ok
      }
    },
    async loadProducts() {
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        this.products = data.products || []
        
        // Build hierarchical categories: Super → Sub → Products
        // Exclude hidden products from category counts
        const superCatMap = new Map()
        this.products.forEach(p => {
          // Skip hidden products from category counts
          if (p.is_hidden) return
          
          const superKey = p.super_category || 'Other'
          const subKey = p.category || 'Uncategorized'
          
          if (!superCatMap.has(superKey)) {
            superCatMap.set(superKey, { 
              super: superKey, 
              name: superKey, 
              count: 0,
              subcategories: new Map()
            })
          }
          
          const superCat = superCatMap.get(superKey)
          if (!superCat.subcategories.has(subKey)) {
            superCat.subcategories.set(subKey, { 
              name: subKey, 
              super: superKey,
              count: 0 
            })
          }
          
          superCat.subcategories.get(subKey).count++
          superCat.count++
        })
        
        // Convert to sorted array
        this.categories = Array.from(superCatMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(sc => ({
            ...sc,
            subcategories: Array.from(sc.subcategories.values()).sort((a, b) => a.name.localeCompare(b.name))
          }))
      } catch (err) {
        console.error('Failed to load products:', err)
      }
    }
  },
  mounted() {
    // Load products (always, regardless of auth) — API is public
    this.loadProducts()
    
    // Check for existing auth token
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    const role = localStorage.getItem('userRole')
    
    if (token) {
      this.isLoggedIn = true
      this.userRole = role || 'customer'
      this.viewMode = role === 'admin' ? 'admin' : 'customer'
      if (user) {
        try {
          this.currentUser = JSON.parse(user)
          const u = this.currentUser
          if (u.name) {
            const parts = u.name.split(' ')
            this.acctData.firstName = parts[0] || ''
            this.acctData.lastName = parts.slice(1).join(' ') || ''
          }
          if (u.companyName) this.acctData.company = u.companyName
          if (u.email) this.acctData.email = u.email
        } catch (e) { /* ignore parse error */ }
      }
      this.loadOrders()
    }
    
    // Close dropdowns on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.acct-wrap')) {
        this.acctDropdownOpen = false
      }
    })
  }
}
</script>

<style>
/* ========== ROOT & RESET ========== */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  overflow-x: hidden;
}

:root {
  --bg: #f5f4f0;
  --surface: #fff;
  --card: #fff;
  --card2: #faf9f7;
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
  --shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.18);
  --sidebar-w: 236px;
  --nav-h: 56px;
  --bottom-bar-h: 60px;
  --radius: 10px;
}

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

/* ========== NAVIGATION ========== */
.topnav {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 300;
  box-shadow: var(--shadow);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.burger {
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 7px;
  transition: background 0.15s;
}

.burger:hover {
  background: var(--bg);
}

.burger span {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--sub);
  border-radius: 2px;
  transition: all 0.25s;
}

.burger.open span:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
  background: var(--red);
}

.burger.open span:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.burger.open span:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
  background: var(--red);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-logo {
  width: 30px;
  height: 30px;
  background: var(--red);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.brand-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--text);
  letter-spacing: -0.3px;
}

.brand-name span {
  color: var(--red);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tabs {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border-radius: 8px;
  padding: 3px;
  border: 1px solid var(--border);
}

.size-slider {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 12px;
  box-shadow: var(--shadow);
}

.size-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--sub);
  white-space: nowrap;
}

.slider {
  width: 80px;
  height: 4px;
  border-radius: 3px;
  background: var(--border);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--red);
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: all 0.15s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #a93226;
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--red);
  cursor: pointer;
  border: none;
  box-shadow: var(--shadow);
  transition: all 0.15s;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  background: #a93226;
}

.size-icon {
  font-size: 13px;
}

.nav-tab {
  padding: 5px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.nav-tab.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}

.nav-tab:hover:not(.active) {
  background: var(--border2);
  color: var(--text);
}

.cart-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: var(--shadow);
}

.cart-btn:hover {
  border-color: var(--red);
  background: var(--red-light);
}

.cart-badge {
  background: var(--red);
  color: #fff;
  border-radius: 20px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 600;
}

/* ========== ACCOUNT DROPDOWN ========== */
.acct-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.acct-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
  box-shadow: var(--shadow);
  user-select: none;
}

.acct-trigger:hover,
.acct-trigger.open {
  border-color: var(--red-mid);
  background: var(--red-light);
}

.acct-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--red);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.acct-name {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.acct-chevron {
  font-size: 9px;
  color: var(--muted);
  transition: transform 0.2s;
}

.acct-trigger.open .acct-chevron {
  transform: rotate(180deg);
}

.acct-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
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
  background: var(--red-light);
}

/* ========== MOBILE BOTTOM NAV ========== */
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-bar-h);
  background: var(--surface);
  border-top: 1px solid var(--border);
  z-index: 310;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
}

.mobile-nav-inner {
  display: flex;
  height: 100%;
}

.mnav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--muted);
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 500;
  transition: color 0.15s;
  position: relative;
  padding: 8px 4px;
}

.mnav-btn.active {
  color: var(--red);
}

.mnav-btn .micon {
  font-size: 20px;
  line-height: 1;
}

.mnav-btn .mbadge {
  position: absolute;
  top: 6px;
  right: calc(50% - 18px);
  background: var(--red);
  color: #fff;
  border-radius: 20px;
  padding: 0 5px;
  font-size: 9px;
  font-weight: 700;
  min-width: 16px;
  text-align: center;
}

/* ========== PAGES ========== */
.page {
  display: none;
  flex: 1;
}

.page.active {
  display: flex;
  flex-direction: column;
}

/* ========== CATALOG LAYOUT ========== */
.catalog-wrap {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  z-index: 150;
  display: none;
  top: var(--nav-h);
}

.sidebar-overlay.open {
  display: block;
}

/* ========== SIDEBAR ========== */
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  height: calc(100vh - var(--nav-h));
  position: sticky;
  top: var(--nav-h);
  transition: transform 0.28s cubic-bezier(.4,0,.2,1);
  z-index: 160;
  flex-shrink: 0;
}

.sidebar.collapsed {
  transform: translateX(calc(-1 * var(--sidebar-w) - 1px));
  position: fixed;
  left: 0;
  top: var(--nav-h);
  box-shadow: var(--shadow-lg);
}

.sidebar.open-mobile {
  transform: translateX(0);
}

.sb-top {
  padding: 14px 14px 6px;
}

.sb-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

.sb-search {
  padding: 0 10px 10px;
}

.sb-search input {
  width: 100%;
  padding: 7px 11px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.sb-search input:focus {
  border-color: var(--red);
}

.sb-search input::placeholder {
  color: var(--faint);
}

.sb-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--sub);
  font-weight: 500;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.sb-all:hover {
  background: var(--bg);
  color: var(--text);
}

.sb-all.active {
  color: var(--red);
  border-left-color: var(--red);
  background: var(--red-light);
}

.a-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted);
  background: var(--bg);
  padding: 1px 7px;
  border-radius: 20px;
  border: 1px solid var(--border);
}

.sb-divider {
  height: 1px;
  background: var(--border);
  margin: 6px 0;
}

.sb-super-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: var(--sub);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.sb-super-btn:hover {
  background: var(--bg);
  color: var(--text);
}

.sb-super-btn.active {
  color: var(--red);
  border-left-color: var(--red);
  background: var(--red-light);
}

.sb-super-btn .s-emoji {
  font-size: 14px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.sb-super-btn .s-label {
  flex: 1;
}

.sb-super-btn .s-cnt {
  font-size: 11px;
  color: var(--muted);
  background: var(--bg);
  padding: 1px 6px;
  border-radius: 20px;
  border: 1px solid var(--border);
}

.sb-super-btn .s-arr {
  font-size: 10px;
  color: var(--faint);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.sb-super-btn.open .s-arr {
  transform: rotate(90deg);
}

.sb-cats {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.25s ease;
}

.sb-cats.open {
  max-height: 700px;
}

.sb-cat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px 6px 40px;
  cursor: pointer;
  font-size: 12px;
  color: var(--sub);
  border-left: 3px solid transparent;
  transition: all 0.15s;
}

.sb-cat:hover {
  color: var(--text);
  background: var(--bg);
}

.sb-cat.active {
  color: var(--red);
  border-left-color: var(--red);
  background: var(--red-light);
  font-weight: 500;
}

.sb-cat .c-cnt {
  font-size: 10px;
  color: var(--faint);
}

/* ========== CATALOG MAIN ========== */
.catalog-main {
  flex: 1;
  padding: 16px 16px 20px;
  overflow-y: auto;
  min-width: 0;
  margin-right: 340px;
}

.cat-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  justify-content: space-between;
}

.cat-bar-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  letter-spacing: -0.3px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-bar-count {
  font-size: 13px;
  color: var(--muted);
  font-weight: 400;
  margin-left: 6px;
}

.cat-bar-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}

.view-toggle {
  display: flex;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px;
  box-shadow: var(--shadow);
}

.view-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sub);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
}

.view-btn:hover {
  background: var(--bg);
  color: var(--text);
}

.view-btn.active {
  background: var(--red);
  color: white;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  width: 100%;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--text);
  flex: 1;
  min-width: 0;
}

.search-box input::placeholder {
  color: var(--faint);
}

.search-icon {
  color: var(--faint);
  font-size: 14px;
  flex-shrink: 0;
}

.fav-main {
  flex: 1;
  padding: 16px 16px 20px;
  overflow-y: auto;
  max-width: 1200px;
  width: 100%;
  margin-right: 340px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.4px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--sub);
  margin-top: 3px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
}

.empty-state .es-icon {
  font-size: 48px;
  margin-bottom: 14px;
  opacity: 0.4;
}

.empty-state p {
  font-size: 14px;
  line-height: 1.7;
}

/* ========== PRODUCT GRID ========== */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(148px * var(--card-scale)), 1fr));
  gap: calc(10px * var(--card-scale));
}

@media (max-width: 640px) {
  .fav-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}

/* ========== HISTORY ========== */
.history-main {
  flex: 1;
  padding: 16px 16px 20px;
  overflow-y: auto;
  margin-right: 340px;
}

.history-header {
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sub);
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  border-color: var(--red-mid);
  color: var(--text);
}

.filter-btn.active {
  background: var(--red);
  color: white;
  border-color: var(--red);
}

/* ========== PRODUCT SHEET (slide up) ========== */
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
  box-shadow: var(--shadow-lg);
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
  background: var(--faint);
  border-radius: 2px;
  margin: 10px auto 0;
  flex-shrink: 0;
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
}

.sheet-tag {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  color: var(--sub);
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
  color: var(--faint);
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

.ui-label {
  color: var(--muted);
}

.ui-val {
  color: var(--text);
  font-weight: 500;
}

.ui-val.red {
  color: var(--red);
  font-weight: 600;
}

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

.qty-minus,
.qty-plus {
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

.qty-minus:hover,
.qty-plus:hover {
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

.btn-add:disabled {
  background: var(--faint);
  cursor: not-allowed;
}

/* ========== CART DRAWER ========== */
/* ========== CART SIDEBAR (FIXED RIGHT) ========== */
.cart-sidebar {
  position: fixed;
  top: var(--nav-h);
  right: 0;
  width: 340px;
  height: calc(100vh - var(--nav-h));
  background: var(--surface);
  border-left: 1px solid var(--border);
  z-index: 200;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 12px rgba(0,0,0,0.06);
  overflow: hidden;
}

.cart-head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.cart-head h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cart-empty {
  text-align: center;
  color: var(--muted);
  padding: 40px 15px;
  font-size: 13px;
  align-self: center;
}

.cart-footer {
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  background: var(--card2);
  flex-shrink: 0;
}

.sum-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--sub);
  margin-bottom: 4px;
}

.sum-row.total {
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  border-top: 1px solid var(--border);
  padding-top: 6px;
  margin-top: 2px;
}

.btn-place {
  width: 100%;
  padding: 10px;
  background: var(--red);
  border: none;
  border-radius: 7px;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.18s;
}

.btn-place:hover {
  background: #a93226;
}

.btn-clear-cart {
  width: 100%;
  padding: 7px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  cursor: pointer;
  margin-top: 5px;
  transition: all 0.15s;
}

.btn-clear-cart:hover {
  border-color: var(--red);
  color: var(--red);
}

/* ========== RESPONSIVE ========== */
@media (max-width: 640px) {
  .nav-tabs,
  .nav-cust,
  .btn-logout,
  .cart-btn {
    display: none !important;
  }

  .mobile-nav {
    display: block;
  }

  .cart-sidebar.desktop-only {
    display: none !important;
  }

  .sidebar {
    position: fixed !important;
    left: 0;
    top: var(--nav-h);
    height: calc(100vh - var(--nav-h));
    width: var(--sidebar-w) !important;
    min-width: 0 !important;
    flex-shrink: 0;
    transform: translateX(calc(-1 * var(--sidebar-w) - 2px));
    z-index: 160;
    box-shadow: none;
    margin-right: calc(-1 * var(--sidebar-w));
  }

  .sidebar.open-mobile {
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }

  .sidebar-overlay {
    top: 0;
  }

  body {
    padding-bottom: var(--bottom-bar-h);
  }

  .topnav {
    padding: 0 12px;
  }

  .brand-name {
    font-size: 15px;
  }

  .catalog-main {
    padding: 12px 12px 16px;
    width: 100vw;
    max-width: 100vw;
    overflow-x: hidden;
    margin-right: 0 !important;
  }

  .catalog-wrap {
    overflow-x: hidden;
    width: 100%;
  }

  .fav-main {
    padding: 12px 12px 16px;
    margin-right: 0 !important;
  }

  .history-main {
    padding: 12px 12px 16px;
    margin-right: 0 !important;
  }

  .cat-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .cat-bar-title {
    font-size: 15px;
  }

  .search-box {
    width: 100%;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

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

  .cart-drawer {
    right: -100vw;
    width: 100vw;
    max-width: 100vw;
  }

  .toast {
    bottom: calc(var(--bottom-bar-h) + 12px);
  }
}

@media (min-width: 641px) {
  .cart-overlay {
    display: none !important;
  }
}

@media (min-width: 641px) {
  .mobile-nav {
    display: none !important;
  }
}

/* ========== TEMPORARY VIEW MODE TOGGLE ========== */
.view-mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
  box-shadow: var(--shadow);
}

.toggle-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}

.toggle-btn:hover {
  background: var(--bg);
  color: var(--text);
}

.toggle-btn.active {
  background: var(--red);
  color: white;
}

/* ========== ADMIN PAGE ========== */
.admin-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ========== ACCOUNT MODAL ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26,26,24,0.45);
  z-index: 600;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-overlay.open {
  display: flex;
}

.acct-modal {
  background: var(--surface);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: popIn 0.2s ease;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.acct-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.acct-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.acct-modal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--bg);
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.acct-modal-close:hover {
  background: var(--red-light);
  color: var(--red);
}

.acct-modal-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 12px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.am-tab {
  flex: 1;
  padding: 7px 8px;
  border: none;
  background: transparent;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 7px;
  transition: all 0.15s;
  white-space: nowrap;
}

.am-tab.active {
  background: var(--surface);
  color: var(--red);
  font-weight: 600;
  box-shadow: var(--shadow);
}

.am-tab:hover:not(.active) {
  background: var(--border2);
  color: var(--text);
}

.acct-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 22px;
}

.acct-save-banner {
  background: var(--green-bg);
  border: 1px solid #b7dfca;
  color: var(--green);
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}

.am-readonly-section {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 10px 14px;
  margin-bottom: 16px;
}

.am-field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--border2);
}

.am-field-row:last-child {
  border-bottom: none;
}

.am-label {
  color: var(--muted);
}

.am-value {
  color: var(--text);
  font-weight: 500;
}

.am-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--sub);
}

.am-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.am-input-row {
  display: flex;
  gap: 10px;
}

.am-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.am-input-group label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--muted);
}

.am-input-group input {
  padding: 8px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color 0.15s;
}

.am-input-group input:focus {
  border-color: var(--red);
}

.btn-am-save {
  padding: 10px 14px;
  background: var(--red);
  border: none;
  border-radius: 9px;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
}

.btn-am-save:hover {
  background: #a93226;
}

.btn-am-clear {
  padding: 10px 14px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
}

.btn-am-clear:hover {
  border-color: var(--red);
  color: var(--red);
  background: var(--red-light);
}

.pwd-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

.pwd-bar {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.pwd-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background 0.3s;
}

.pwd-label {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

/* ========== ORDER HISTORY CARDS ========== */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: var(--shadow);
}

.order-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.order-id {
  font-size: 14px;
  font-weight: 600;
  color: var(--red);
  font-family: 'Courier New', monospace;
}

.order-date {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.order-status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
}

.s-received {
  background: var(--green-bg);
  color: var(--green);
  border: 1px solid #b7dfca;
}

.s-processing {
  background: var(--yellow-bg);
  color: var(--yellow);
  border: 1px solid #f0d49a;
}

.s-pending {
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
}

.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: var(--bg);
  border-radius: 8px;
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.oi-name {
  color: var(--text);
}

.oi-qty {
  color: var(--muted);
  font-weight: 500;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-cases {
  font-size: 12px;
  color: var(--sub);
}

.btn-reorder {
  padding: 5px 13px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sub);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
}

.btn-reorder:hover {
  border-color: var(--red);
  color: var(--red);
  background: var(--red-light);
}

/* ========== TOAST ========== */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(14px);
  background: var(--text);
  color: #fff;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 13px;
  z-index: 700;
  opacity: 0;
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
  pointer-events: none;
  box-shadow: var(--shadow-lg);
  white-space: nowrap;
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>

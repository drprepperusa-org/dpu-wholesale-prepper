<template>
  <div class="admin-wrapper">
    <!-- NAV -->
    <nav class="topnav">
      <div class="nav-left">
        <button class="burger" :class="{open: sidebarOpen}" @click="toggleSidebar">
          <span></span><span></span><span></span>
        </button>
        <div class="brand">
          <div class="brand-logo">🔥</div>
          <span class="brand-name"><span>DR</span> Prepper</span>
        </div>
        <span class="admin-pill">Admin</span>
      </div>
      <div class="nav-right">
        <div class="nav-tabs">
          <button class="nav-tab" :class="{active: activePage==='catalog'}" @click="showPage('catalog')">📦 Catalog</button>
          <button class="nav-tab" :class="{active: activePage==='bulk-edit'}" @click="showPage('bulk-edit')">⚡ Bulk Edit</button>
          <button class="nav-tab" :class="{active: activePage==='views'}" @click="showPage('views')">👥 Customer Views</button>
          <button class="nav-tab" :class="{active: activePage==='orders'}" @click="showPage('orders')">📋 Orders</button>
          <button class="nav-tab" :class="{active: activePage==='categories'}" @click="showPage('categories')">📂 Categories</button>
          <button class="nav-tab" :class="{active: activePage==='settings'}" @click="showPage('settings')">⚙ Settings</button>
        </div>
        <button class="btn-logout" @click="logout">Sign out</button>
      </div>
    </nav>

    <!-- CATALOG PAGE -->
    <div class="page" :class="{active: activePage==='catalog'}">
      <div class="catalog-wrap">
        <div class="sidebar-overlay" :class="{open: sidebarOpen}" @click="closeSidebar"></div>
        <aside class="sidebar" :class="{collapsed: !sidebarOpen, 'open-mobile': sidebarOpen}">
          <div class="sb-top"><div class="sb-label">Categories</div></div>
          <div class="sb-search"><input type="text" placeholder="Search…" @input="filterSidebar" v-model="sidebarFilter"></div>
          <div class="sb-all" :class="{active: currentFilter==='all'}" @click="setFilter('all')">
            <span style="font-size:14px">📦</span> All Products
            <span class="a-count">{{products.length}}</span>
          </div>
          <div class="sb-divider"></div>

          <!-- Super Categories -->
          <template v-for="superCat in categoryTree" :key="superCat.name">
            <button class="sb-super-btn" :class="{active: currentFilter===`super:${superCat.name}`, open: expandedSuperCats[superCat.name]}" @click="toggleSuperCat(superCat.name)">
              <span class="s-emoji">{{superCat.emoji}}</span>
              <span class="s-label">{{superCat.name}}</span>
              <span class="s-cnt">{{superCat.count}}</span>
              <span class="s-arr">›</span>
            </button>
            <div class="sb-cats" :class="{open: expandedSuperCats[superCat.name]}">
              <div class="sb-cat" v-for="cat in superCat.subcats" :key="cat" :class="{active: currentFilter===`cat:${cat}`}" @click="setFilter('cat', cat)">
                <span>{{cat}}</span>
                <span class="c-cnt">{{getCategoryCount(cat)}}</span>
              </div>
            </div>
          </template>

          <div class="sb-divider"></div>
          <div class="sb-special" :class="{active: currentFilter==='hidden'}" @click="setFilter('hidden')">🚫 Hidden <span id="sbHiddenCnt" style="margin-left:auto;font-size:10px;background:var(--bg);padding:1px 6px;border-radius:20px;border:1px solid var(--border)">{{hiddenCount}}</span></div>
          <div class="sb-special" :class="{active: currentFilter==='oos'}" @click="setFilter('oos')">⚠️ Out of Stock <span id="sbOosCnt" style="margin-left:auto;font-size:10px;background:var(--bg);padding:1px 6px;border-radius:20px;border:1px solid var(--border)">{{oosCount}}</span></div>
        </aside>

        <div class="catalog-main">
          <div class="cat-bar">
            <span class="cat-bar-title">{{filterTitle}}</span>
            <div class="search-box">
              <span style="color:var(--faint);font-size:13px">🔍</span>
              <input type="text" placeholder="Search products, SKUs, ID…" v-model="searchQuery" @input="onSearchInput">
            </div>
            <button class="btn-add-prod" @click="openModal('addProdModal')">+ Add Product</button>
          </div>

          <!-- ── Phase 3: Filter Pills ── -->
          <div class="filter-pills-bar">
            <span class="filter-pills-label">Visibility:</span>
            <button :class="['filter-pill', { active: visibilityFilter==='all' }]" @click="setVisibilityFilter('all')">All</button>
            <button :class="['filter-pill', { active: visibilityFilter==='visible' }]" @click="setVisibilityFilter('visible')">Visible</button>
            <button :class="['filter-pill', { active: visibilityFilter==='hidden' }]" @click="setVisibilityFilter('hidden')">Hidden</button>
            <span class="filter-pills-sep">|</span>
            <span class="filter-pills-label">Stock:</span>
            <button :class="['filter-pill', { active: stockFilter==='all' }]" @click="setStockFilter('all')">All</button>
            <button :class="['filter-pill', { active: stockFilter==='in-stock' }]" @click="setStockFilter('in-stock')">In Stock</button>
            <button :class="['filter-pill', { active: stockFilter==='oos' }]" @click="setStockFilter('oos')">OOS</button>
            <span class="filter-pills-sep" v-if="superCatNames.length">|</span>
            <template v-for="sc in superCatNames" :key="sc">
              <button :class="['filter-pill', 'sc-pill', { active: superCatFilter===sc }]" @click="setSuperCatFilter(superCatFilter===sc ? '' : sc)">{{sc}}</button>
            </template>
          </div>

          <!-- ── Phase 3: Bulk Action Bar ── -->
          <transition name="slide-down">
            <div class="bulk-action-bar" v-if="selectedProductCount > 0">
              <span class="bulk-count">{{ selectedProductCount }} selected</span>
              <button class="bulk-btn bulk-show" @click="startBulkAction('show')">👁 Show all</button>
              <button class="bulk-btn bulk-hide" @click="startBulkAction('hide')">🚫 Hide all</button>
              <button class="bulk-btn bulk-delete" @click="startBulkAction('delete')">🗑 Delete all</button>
              <button class="bulk-btn bulk-clear" @click="clearSelection()">✕ Clear</button>
            </div>
          </transition>

          <!-- ── Phase 3: Loading Spinner ── -->
          <div class="catalog-loading" v-if="isLoading">
            <div class="loading-spinner"></div>
            <span>Loading products…</span>
          </div>

          <div class="admin-catalog-content" v-show="!isLoading">
            <!-- ── Phase 3: No results state ── -->
            <div class="no-results" v-if="!isLoading && products.length === 0">
              <div class="no-results-icon">🔍</div>
              <div class="no-results-title">No products found</div>
              <div class="no-results-sub">Try adjusting your search or filters</div>
              <button class="btn-clear-filters" @click="searchQuery=''; visibilityFilter='all'; stockFilter='all'; superCatFilter=''; loadProducts(1)">Clear filters</button>
            </div>

            <!-- Super Category Loop -->
            <template v-for="(superCatData, superCat) in groupedProducts" :key="superCat">
              <div class="super-cat-section">
                <div class="super-cat-hdr">
                  <span class="super-cat-name">{{ superCat }}</span>
                  <span class="super-cat-count">{{ superCatData.total }}</span>
                </div>
                
                <!-- Category Loop within Super Category -->
                <template v-for="(catProds, catName) in superCatData.categories" :key="catName">
                  <div class="cat-section">
                    <div class="cat-section-hdr">
                      <!-- ── Phase 3: Select all in category ── -->
                      <label class="cat-select-all" :title="isCategoryAllSelected(catProds) ? 'Deselect all' : 'Select all'">
                        <input 
                          type="checkbox"
                          :checked="isCategoryAllSelected(catProds)"
                          :indeterminate.prop="isCategoryPartialSelected(catProds)"
                          @change="toggleAllInCategory(catProds)"
                        >
                      </label>
                      {{ catName }}
                      <span class="cat-count-badge">{{ catProds.length }}</span>
                      <!-- ── Category visibility toggle ── -->
                      <button 
                        v-if="categoryMetadata[catName]"
                        class="cat-visibility-toggle"
                        @click="toggleCategoryVisibility(catName)"
                        :title="categoryMetadata[catName].is_hidden ? 'Show category' : 'Hide category'"
                      >
                        {{ categoryMetadata[catName].is_hidden ? '🚫' : '👁' }}
                      </button>
                      <!-- ── Phase 3: Category bulk visibility ── -->
                      <button
                        v-if="categoryMetadata[catName]"
                        class="cat-bulk-btn"
                        @click="toggleCategoryAllProductsVisibility(categoryMetadata[catName].id, catName, true)"
                        title="Hide all products in this category"
                      >Hide all</button>
                      <button
                        v-if="categoryMetadata[catName]"
                        class="cat-bulk-btn"
                        @click="toggleCategoryAllProductsVisibility(categoryMetadata[catName].id, catName, false)"
                        title="Show all products in this category"
                      >Show all</button>
                    </div>
                    <div class="admin-grid">
                      <div class="admin-card" v-for="prod in catProds" :key="prod.id" :class="{
                        'hidden-prod': prod.is_hidden,
                        'oos-prod': prod.is_oos,
                        'selected-prod': selectedProducts[prod.id]
                      }">
                        <!-- ── Phase 3: Per-card select checkbox ── -->
                        <label class="card-select-check">
                          <input type="checkbox" :checked="selectedProducts[prod.id]" @change="toggleProductSelect(prod.id)">
                        </label>
                        <div class="card-badges">
                          <div class="badge b-hidden" v-if="prod.is_hidden">Hidden</div>
                          <div class="badge b-oos" v-if="prod.is_oos">OOS</div>
                          <div class="badge b-visible" v-if="!prod.is_hidden">Visible</div>
                        </div>
                        <img :src="prod.image_url" class="card-img">
                        <div class="card-info">
                          <div class="card-name">{{prod.name}}</div>
                          <div class="card-meta">{{prod.category}}</div>
                          <div class="card-sku">{{prod.sku || 'N/A'}}</div>
                          <div class="card-actions">
                            <button class="ca-btn" @click="editProduct(prod)" :disabled="isDeletingProduct === prod.id">Edit</button>
                            <button class="ca-btn" @click="deleteProduct(prod.id)" :disabled="isDeletingProduct === prod.id">
                              {{ isDeletingProduct === prod.id ? '⏳' : 'Delete' }}
                            </button>
                            <button class="ca-btn" @click="toggleVisibility(prod)" title="Toggle visibility" :disabled="isDeletingProduct === prod.id">{{prod.is_hidden ? '👁' : '🚫'}}</button>
                            <button class="ca-btn" :class="{oos: prod.is_oos}" @click="toggleOosStatus(prod)" title="Toggle out of stock" :disabled="isDeletingProduct === prod.id">{{prod.is_oos ? '⚠️' : '✓'}}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </template>

            <!-- ── Phase 3: Pagination Controls ── -->
            <div class="pagination-bar" v-if="paginationLimit > 0 && paginationTotal > paginationLimit">
              <span class="pagination-info">{{ paginationInfo }}</span>
              <div class="pagination-controls">
                <button class="pg-btn" :disabled="paginationPage <= 1" @click="changePage(paginationPage - 1)">‹ Prev</button>
                <template v-for="p in paginationPages" :key="p">
                  <button 
                    v-if="Math.abs(p - paginationPage) <= 2 || p === 1 || p === paginationPages"
                    :class="['pg-btn', { active: p === paginationPage }]"
                    @click="changePage(p)"
                  >{{ p }}</button>
                  <span v-else-if="p === paginationPage - 3 || p === paginationPage + 3" class="pg-ellipsis">…</span>
                </template>
                <button class="pg-btn" :disabled="paginationPage >= paginationPages" @click="changePage(paginationPage + 1)">Next ›</button>
                <input 
                  class="pg-jump" 
                  type="number" 
                  :min="1" 
                  :max="paginationPages"
                  placeholder="Go to…"
                  @keyup.enter="changePage(parseInt($event.target.value)); $event.target.value=''"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BULK EDIT PAGE -->
    <div class="page" :class="{active: activePage==='bulk-edit'}">
      <BulkEditView
        :initialCustomers="customers"
        :initialProducts="products"
        :superCategories="categoryTree"
        @load-products="loadProducts"
      />
    </div>

    <!-- CUSTOMER VIEWS PAGE -->
    <div class="page" :class="{active: activePage==='views'}">
      <div class="views-layout">
        <div class="customer-list">
          <div class="clist-head">
            <span class="clist-title">Customers</span>
            <button class="btn-add-cust" @click="openModal('addCustModal')">+ Add</button>
          </div>
          <div class="clist-search"><input type="text" placeholder="🔍 Search…" v-model="custSearchQuery" @input="renderCustList"></div>
          <div class="customer-rows">
            <div class="cust-row" v-for="cust in filteredCustomers" :key="cust.id" :class="{active: selectedCustomer?.id === cust.id}" @click="selectCustomer(cust)">
              <div class="c-avatar" :style="{background: getAvatarColor(cust.company_name)}">{{cust.company_name.charAt(0).toUpperCase()}}</div>
              <div>
                <div class="c-name">{{cust.company_name}}</div>
                <div class="c-email">{{cust.email}}</div>
                <div class="c-pills">
                  <span class="c-pill" :class="{active: cust.is_active}" :style="{background: cust.is_active ? 'var(--green-bg)' : 'var(--bg)', color: cust.is_active ? 'var(--green)' : 'var(--muted)'}">{{cust.is_active ? 'Active' : 'Inactive'}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="view-editor" v-if="selectedCustomer">
          <div class="ve-head">
            <div>
              <div class="ve-name">{{selectedCustomer.company_name}}</div>
              <div class="ve-email">{{selectedCustomer.email}}</div>
            </div>
            <div class="ve-actions">
              <button class="btn-reset-all" @click="resetCustomerView">Reset All</button>
              <button class="btn-save" @click="saveCustomerView">Save View</button>
              <button class="btn-close-ve" @click="selectedCustomer = null">✕</button>
            </div>
          </div>
          <div class="ve-presets">
            <span class="ve-preset-label">Presets:</span>
            <button class="preset-btn" :class="{active: customerViewMode==='full'}" @click="applyViewPreset('full')">Full Catalog</button>
            <button class="preset-btn" :class="{active: customerViewMode==='chips'}" @click="applyViewPreset('chips')">Chips Only</button>
            <button class="preset-btn" :class="{active: customerViewMode==='noodles'}" @click="applyViewPreset('noodles')">Noodles Only</button>
            <button class="preset-btn" :class="{active: customerViewMode==='korean'}" @click="applyViewPreset('korean')">Korean Only</button>
            <button class="preset-btn" :class="{active: customerViewMode==='icecream'}" @click="applyViewPreset('icecream')">Ice Cream Only</button>
            <button class="preset-btn" :class="{active: customerViewMode==='custom'}" @click="applyViewPreset('custom')">Custom</button>
          </div>
          <div class="ve-quick-actions">
            <button class="qa-btn danger" @click="hideAllForCust">🚫 Hide All</button>
            <button class="qa-btn success" @click="showAllForCust">👁 Show All</button>
            <span class="ve-preset-label" style="margin-left:8px">Only:</span>
            <button class="qa-btn" v-for="sc in superCatNames" :key="sc" @click="showOnlyForCust(sc)">{{ sc }}</button>
          </div>
          <div class="ve-hint">Toggle visibility per category or product. Changes only affect this customer.</div>

          <div class="ve-summary-bar">
            <span class="vs-num green">{{ customerVisibleCount }} visible</span>
            <span class="vs-sep">·</span>
            <span class="vs-num muted">{{ customerHiddenCount }} hidden</span>
            <span class="vs-sep">·</span>
            <span class="vs-num">{{ products.length }} total</span>
          </div>

          <template v-for="superCat in categoryTree" :key="superCat.name">
            <div class="ve-cat-block" :class="{'cat-hidden-block': isCatHiddenForCust(superCat.name)}">
              <div class="ve-cat-head" @click="toggleCatExpand(superCat.name)">
                <span class="ve-emoji">{{superCat.emoji}}</span>
                <span class="ve-cat-label">{{superCat.name}}</span>
                <span class="ve-cnt">{{superCat.count}}</span>
                <span v-if="isCatHiddenForCust(superCat.name)" class="cat-hidden-badge">Hidden</span>
                <button class="mini-toggle cat-vis-toggle"
                  :class="{on: !isCatHiddenForCust(superCat.name), off: isCatHiddenForCust(superCat.name)}"
                  @click.stop="toggleCatVisForCust(superCat.name)"
                  title="Toggle category visibility for this customer">
                </button>
                <button class="arr-btn" :class="{open: expandedViewCats[superCat.name]}">›</button>
              </div>
              <div class="ve-cat-items" :class="{collapsed: !expandedViewCats[superCat.name]}">
                <div class="mini-card" v-for="prod in getProductsInCategory(superCat.name)" :key="prod.id"
                  :class="{
                    'prod-hidden': !isProductVisibleForCustomer(prod.id) || prod.is_hidden,
                    'prod-oos': isProductOosForCustomer(prod.id) || prod.is_oos
                  }">
                  <img :src="prod.image_url" class="mini-img">
                  <div class="mini-info">
                    <div class="mini-name">{{prod.name}}</div>
                    <div class="mini-sku">{{prod.sku || 'N/A'}}</div>
                  </div>
                  <div class="mini-controls">
                    <button class="mini-toggle"
                      :class="{on: isProductVisibleForCustomer(prod.id), off: !isProductVisibleForCustomer(prod.id)}"
                      @click="toggleProductForCustomer(prod.id)"
                      title="Toggle visibility">
                    </button>
                    <button class="mini-oos-btn"
                      :class="{active: isProductOosForCustomer(prod.id)}"
                      @click="toggleOosForCustomer(prod.id)"
                      title="Toggle OOS for this customer">
                      {{ isProductOosForCustomer(prod.id) ? 'OOS' : 'OK' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="view-editor" v-else>
          <div class="ve-empty"><div style="font-size:40px;opacity:0.2">👥</div><div>Select a customer to configure their view</div></div>
        </div>
      </div>
    </div>

    <!-- ORDERS PAGE -->
    <div class="page" :class="{active: activePage==='orders'}">
      <div class="orders-main">
        <div class="page-header">
          <div class="page-title">All Orders</div>
          <div class="filter-row">
            <button class="filter-btn" :class="{active: orderFilter==='all'}" @click="setOrderFilter('all')">All</button>
            <button class="filter-btn" :class="{active: orderFilter==='pending'}" @click="setOrderFilter('pending')">Pending</button>
            <button class="filter-btn" :class="{active: orderFilter==='processing'}" @click="setOrderFilter('processing')">Processing</button>
            <button class="filter-btn" :class="{active: orderFilter==='received'}" @click="setOrderFilter('received')">Received</button>
          </div>
        </div>
        <div class="stats-row">
          <div class="stat-card red"><div class="stat-label">Total Orders</div><div class="stat-val">{{orders.length}}</div></div>
          <div class="stat-card yellow"><div class="stat-label">Pending</div><div class="stat-val">{{orderStats.pending}}</div></div>
          <div class="stat-card"><div class="stat-label">Processing</div><div class="stat-val">{{orderStats.processing}}</div></div>
          <div class="stat-card green"><div class="stat-label">Received</div><div class="stat-val">{{orderStats.received}}</div></div>
        </div>
        <div class="orders-table">
          <div class="ot-head">
            <div class="ot-th">Order #</div><div class="ot-th">Customer</div><div class="ot-th">Date</div>
            <div class="ot-th">Cases</div><div class="ot-th">SKUs</div><div class="ot-th">Status</div><div class="ot-th">Update</div>
          </div>
          <div v-for="order in filteredOrders" :key="order.id" class="ot-row">
            <div class="ot-cell"><span class="ot-id">{{order.id}}</span></div>
            <div class="ot-cell">{{order.customer_name}}</div>
            <div class="ot-cell">{{formatDate(order.created_at)}}</div>
            <div class="ot-cell">{{order.cases}}</div>
            <div class="ot-cell">{{order.skus}}</div>
            <div class="ot-cell">
              <span class="order-status" :class="`s-${order.status.toLowerCase()}`">{{order.status}}</span>
            </div>
            <div class="ot-cell">
              <select class="status-select" :value="order.status" @change="updateOrderStatus(order.id, $event.target.value)">
                <option>Pending</option>
                <option>Processing</option>
                <option>Received</option>
              </select>
            </div>
          </div>
          <!-- ── Phase 3: Empty state for orders ── -->
          <div class="empty-state" v-if="filteredOrders.length === 0">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No orders yet</div>
            <div class="empty-state-sub">Orders from customers will appear here</div>
          </div>
        </div>
      </div>
    </div>

    <!-- CATEGORIES PAGE -->
    <div class="page" :class="{active: activePage==='categories'}">
      <div class="categories-main">
        <div class="cat-manage-header">
          <h1>📂 Categories & Organization</h1>
          <p class="cat-manage-desc">Drag to reorder categories and super-categories. Changes update immediately for all users.</p>
        </div>

        <!-- Super Categories Section -->
        <div class="cat-section">
          <div class="cat-section-title">Super Categories</div>
          <div class="cat-list-wrap">
            <draggable 
              v-model="superCategoriesList" 
              @change="onSuperCatsReorder"
              item-key="id"
              class="cat-drag-list"
              handle=".cat-drag-handle"
            >
              <template #item="{ element, index }">
                <div class="cat-item cat-super-item" :key="element.id">
                  <div class="cat-drag-handle">⋮⋮</div>
                  <div class="cat-item-content">
                    <span class="cat-item-name">{{ element.name }}</span>
                    <span class="cat-item-order">Position: {{ index + 1 }}</span>
                  </div>
                  <span class="cat-item-prod-count">{{ getCategoryItemCount(element.id, 'super') }} products</span>
                </div>
              </template>
            </draggable>
          </div>
        </div>

        <!-- Categories Section (organized by super-category) -->
        <div class="cat-section" v-for="superCat in superCategoriesList" :key="`cats-${superCat.id}`">
          <div class="cat-section-title">{{ superCat.name }} — Subcategories</div>
          <div class="cat-list-wrap">
            <draggable 
              v-model="categoriesBySuper[superCat.id]" 
              @change="onCatsReorder($event, superCat.id)"
              item-key="id"
              class="cat-drag-list"
              handle=".cat-drag-handle"
            >
              <template #item="{ element, index }">
                <div class="cat-item" :key="element.id">
                  <div class="cat-drag-handle">⋮⋮</div>
                  <div class="cat-item-content">
                    <span class="cat-item-name">{{ element.name }}</span>
                    <span class="cat-item-order">Position: {{ index + 1 }}</span>
                  </div>
                  <span class="cat-item-prod-count">{{ getCategoryItemCount(element.id, 'cat') }} products</span>
                </div>
              </template>
            </draggable>
          </div>
        </div>

        <div class="cat-manage-footer">
          <span class="cat-manage-status" v-if="catReorderStatus">✅ {{ catReorderStatus }}</span>
        </div>
      </div>
    </div>

    <!-- SETTINGS PAGE -->
    <div class="page" :class="{active: activePage==='settings'}">
      <div class="settings-main">
        <div class="settings-section">
          <div class="settings-section-title">🔐 Customer Registration</div>
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Allow "Create Account" on login page</div>
              <div class="settings-row-desc">When enabled, customers will see a "Create account" link on the login page.</div>
            </div>
            <button class="toggle-sw" :class="{on: registrationEnabled, off: !registrationEnabled}" @click="toggleRegistration"></button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">📊 Customer Activity Log</div>
          <div class="settings-activity-bar">
            <select class="settings-filter-sel" v-model="activityCustFilter" @change="renderActivityLog">
              <option value="all">All customers</option>
            </select>
            <select class="settings-filter-sel" v-model="activityTypeFilter" @change="renderActivityLog">
              <option value="all">All activity</option>
              <option value="login">Logins / Logouts</option>
              <option value="favorite">Favorites</option>
              <option value="order">Orders</option>
            </select>
            <button class="settings-clear-btn" @click="clearActivityLog">🗑 Clear log</button>
          </div>
          <div class="activity-log-wrap">
            <div v-for="(log, idx) in filteredActivityLog" :key="idx" class="activity-row">
              <div class="act-icon" :class="log.type">{{log.icon}}</div>
              <div class="act-body">
                <span class="act-cust">{{log.customer}}</span>
                <span class="act-detail">{{log.message}}</span>
              </div>
              <span class="act-time">{{log.time}}</span>
            </div>
            <div v-if="filteredActivityLog.length === 0" class="act-empty">No activity</div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">🏆 Customer Insights</div>
          <div class="insights-grid">
            <div class="insight-card">
              <div class="insight-card-name">📦 Total Products</div>
              <div class="insight-stat-row">
                <span class="insight-stat-label">All</span>
                <span class="insight-stat-val">{{products.length}}</span>
              </div>
              <div class="insight-stat-row">
                <span class="insight-stat-label">Visible</span>
                <span class="insight-stat-val">{{products.filter(p => !p.is_hidden).length}}</span>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-card-name">👥 Customers</div>
              <div class="insight-stat-row">
                <span class="insight-stat-label">Total</span>
                <span class="insight-stat-val">{{customers.length}}</span>
              </div>
              <div class="insight-stat-row">
                <span class="insight-stat-label">Active</span>
                <span class="insight-stat-val">{{customers.filter(c => c.is_active).length}}</span>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-card-name">📋 Orders</div>
              <div class="insight-stat-row">
                <span class="insight-stat-label">Total</span>
                <span class="insight-stat-val">{{orders.length}}</span>
              </div>
              <div class="insight-stat-row">
                <span class="insight-stat-label">This Month</span>
                <span class="insight-stat-val">{{getMonthOrders()}}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD PRODUCT MODAL -->
    <div class="modal-wrap" :class="{open: activeModal === 'addProdModal'}" @click.self="closeModal('addProdModal')">
      <div class="modal">
        <h2>Add New Product</h2>
        <label class="form-label">Product Name <span class="req-star">*</span></label>
        <input class="form-input" :class="{'input-error': productFormErrors.name}" type="text" placeholder="e.g. Lay's Texas Grilled BBQ" v-model="newProductForm.name" @input="delete productFormErrors.name">
        <div class="field-error" v-if="productFormErrors.name">{{ productFormErrors.name }}</div>
        <label class="form-label">SKU / Item ID</label>
        <input class="form-input" :class="{'input-error': productFormErrors.sku}" type="text" placeholder="e.g. B02214" v-model="newProductForm.sku" @input="delete productFormErrors.sku">
        <div class="field-error" v-if="productFormErrors.sku">{{ productFormErrors.sku }}</div>
        <label class="form-label">Weight</label>
        <input class="form-input" type="text" placeholder="e.g. 70g" v-model="newProductForm.weight">
        <label class="form-label">Pack Size (bags per case)</label>
        <input class="form-input" type="text" placeholder="e.g. 22bags/cs" v-model="newProductForm.bags_per_case">
        <label class="form-label">Cases per Pallet</label>
        <input class="form-input" :class="{'input-error': productFormErrors.cases_per_pallet}" type="number" min="1" placeholder="e.g. 60" v-model="newProductForm.cases_per_pallet" @input="delete productFormErrors.cases_per_pallet">
        <div class="field-error" v-if="productFormErrors.cases_per_pallet">{{ productFormErrors.cases_per_pallet }}</div>
        <label class="form-label">Price</label>
        <input class="form-input" :class="{'input-error': productFormErrors.price}" type="number" step="0.01" min="0.01" placeholder="e.g. 25.00" v-model="newProductForm.price" @input="delete productFormErrors.price">
        <div class="field-error" v-if="productFormErrors.price">{{ productFormErrors.price }}</div>
        <label class="form-label">Category <span class="req-star">*</span></label>
        <select class="form-input" :class="{'input-error': productFormErrors.category_id}" v-model="newProductForm.category_id" @change="delete productFormErrors.category_id">
          <option value="">Select a category</option>
          <optgroup v-for="superCat in superCategoriesList" :key="superCat.id" :label="superCat.name">
            <option v-for="cat in categoriesBySuper[superCat.id]" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </optgroup>
        </select>
        <div class="field-error" v-if="productFormErrors.category_id">{{ productFormErrors.category_id }}</div>
        <div class="form-checkbox">
          <input type="checkbox" id="showPrice" v-model="newProductForm.showPrice" :true-value="true" :false-value="false">
          <label for="showPrice">Show price on product cards</label>
        </div>
        <label class="form-label">Product Picture</label>
        <div class="img-upload-wrapper">
          <!-- Hidden file input - always in DOM -->
          <input 
            type="file" 
            ref="imageFileInput"
            accept="image/jpeg,image/png,image/webp"
            @change="handleImageSelect"
            style="display: none"
          >
          <div 
            class="img-drag-drop"
            :class="{active: isDraggingImage, uploaded: newProductForm.imageFile}"
            @dragover.prevent="isDraggingImage = true"
            @dragleave.prevent="isDraggingImage = false"
            @drop.prevent="handleImageDrop"
            @click="$refs.imageFileInput.click()"
          >
            <div v-if="!newProductForm.imageFile && !newProductForm.image_url" class="drag-content">
              <div class="drag-icon">📸</div>
              <div class="drag-text">
                <strong>Drag & drop image here</strong>
                <span>or click to select</span>
              </div>
            </div>
            <div v-else class="upload-preview">
              <img 
                v-if="newProductForm.imageFile" 
                :src="getImagePreview()"
                alt="Preview"
                class="preview-img"
              >
              <img 
                v-else
                :src="newProductForm.image_url" 
                alt="Preview"
                class="preview-img"
              >
              <div class="preview-actions">
                <button type="button" class="btn-change" @click="$refs.imageFileInput.click()">📁 Change</button>
                <button type="button" class="btn-remove" @click="clearImage">✕ Remove</button>
              </div>
            </div>
          </div>
          <div class="img-hint">JPG, PNG, or WebP. Max 5MB. Recommended: 400×400px</div>
        </div>
        <div class="modal-btns">
          <button class="btn-mx" @click="closeModal('addProdModal')" :disabled="isSavingProduct">Cancel</button>
          <button class="btn-mc" @click="saveNewProduct" :disabled="isSavingProduct || !isProductFormValid">
            <span v-if="isSavingProduct">⏳ Saving…</span>
            <span v-else>Add Product</span>
          </button>
        </div>
      </div>
    </div>

    <!-- EDIT PRODUCT MODAL -->
    <div class="edit-modal-wrap" :class="{open: activeModal === 'editProdModal'}" @click.self="closeModal('editProdModal')">
      <div class="edit-modal">
        <h2>Edit Product</h2>
        <div class="edit-field-grid" v-if="editingProduct">
          <div class="edit-field">
            <label>Product Name</label>
            <input type="text" v-model="editingProduct.name">
          </div>
          <div class="edit-field">
            <label>Price</label>
            <input type="number" step="0.01" v-model="editingProduct.price">
          </div>
          <div class="edit-field">
            <label>SKU</label>
            <input type="text" v-model="editingProduct.sku">
          </div>
          <div class="edit-field">
            <label>Weight</label>
            <input type="text" v-model="editingProduct.weight">
          </div>
          <div class="edit-field">
            <label>Category</label>
            <input type="text" v-model="editingProduct.category">
          </div>
          <div class="edit-field">
            <label>Stock Status</label>
            <select v-model.number="editingProduct.is_oos">
              <option :value="0">In Stock</option>
              <option :value="1">Out of Stock</option>
            </select>
          </div>
          <div class="edit-field">
            <label class="form-checkbox">
              <input type="checkbox" v-model="editingProduct.show_price" :true-value="true" :false-value="false">
              Show price on cards
            </label>
          </div>
          <div class="edit-field full">
            <label>Image URL</label>
            <div class="edit-img-row">
              <div class="edit-img-preview">
                <img v-if="editingProduct.image_url" :src="editingProduct.image_url" :key="editingProduct.image_url">
                <span v-else>📷</span>
              </div>
              <div class="edit-img-controls">
                <input class="edit-img-url" type="text" placeholder="Image URL" v-model="editingProduct.image_url">
              </div>
            </div>
          </div>
        </div>
        <div class="edit-modal-btns">
          <button class="btn-cancel" @click="closeModal('editProdModal')" :disabled="isSavingEditProduct">Cancel</button>
          <button class="btn-save-edit" @click="saveEditProduct" :disabled="isSavingEditProduct">
            <span v-if="isSavingEditProduct">⏳ Saving…</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ADD CUSTOMER MODAL -->
    <div class="modal-wrap" :class="{open: activeModal === 'addCustModal'}" @click.self="closeModal('addCustModal')">
      <div class="modal">
        <h2>Add Customer</h2>
        <label class="form-label">Company Name <span class="req-star">*</span></label>
        <input class="form-input" :class="{'input-error': customerFormErrors.company_name}" type="text" placeholder="e.g. Happy Snacks Co." v-model="newCustomerForm.company_name" @input="delete customerFormErrors.company_name">
        <div class="field-error" v-if="customerFormErrors.company_name">{{ customerFormErrors.company_name }}</div>
        <label class="form-label">Contact Name</label>
        <input class="form-input" type="text" placeholder="e.g. John Smith" v-model="newCustomerForm.contact_name">
        <label class="form-label">Email <span class="req-star">*</span></label>
        <input class="form-input" :class="{'input-error': customerFormErrors.email}" type="email" placeholder="buyer@company.com" v-model="newCustomerForm.email" @input="delete customerFormErrors.email">
        <div class="field-error" v-if="customerFormErrors.email">{{ customerFormErrors.email }}</div>
        <label class="form-label">Phone <span class="opt-label">(optional)</span></label>
        <input class="form-input" :class="{'input-error': customerFormErrors.phone}" type="tel" placeholder="e.g. 213-555-0100" v-model="newCustomerForm.phone" @input="delete customerFormErrors.phone">
        <div class="field-error" v-if="customerFormErrors.phone">{{ customerFormErrors.phone }}</div>
        <label class="form-label">View Preset <span class="req-star">*</span></label>
        <select class="form-input" :class="{'input-error': customerFormErrors.preset}" v-model="newCustomerForm.preset" @change="delete customerFormErrors.preset">
          <option value="full">Full Catalog</option>
          <option value="chips">Chips Only</option>
          <option value="korean">Korean Snacks Only</option>
          <option value="custom">Custom</option>
        </select>
        <div class="field-error" v-if="customerFormErrors.preset">{{ customerFormErrors.preset }}</div>
        <div class="modal-btns">
          <button class="btn-mx" @click="closeModal('addCustModal')" :disabled="isSavingCustomer">Cancel</button>
          <button class="btn-mc" @click="addCustomer" :disabled="isSavingCustomer || !isCustomerFormValid">
            <span v-if="isSavingCustomer">⏳ Saving…</span>
            <span v-else>Add Customer</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Phase 3: Bulk Confirm Modal ── -->
    <div class="modal-overlay" v-if="bulkConfirmVisible" @click.self="cancelBulkAction">
      <div class="modal-box bulk-confirm-box">
        <div class="modal-title">
          <span v-if="bulkConfirmAction === 'delete'">🗑 Delete {{ bulkConfirmCount }} products?</span>
          <span v-else-if="bulkConfirmAction === 'hide'">🚫 Hide {{ bulkConfirmCount }} products?</span>
          <span v-else>👁 Show {{ bulkConfirmCount }} products?</span>
        </div>
        <p class="bulk-confirm-desc">
          <template v-if="bulkConfirmAction === 'delete'">
            This will permanently delete <strong>{{ bulkConfirmCount }} product{{ bulkConfirmCount !== 1 ? 's' : '' }}</strong>. This cannot be undone.
          </template>
          <template v-else-if="bulkConfirmAction === 'hide'">
            This will hide <strong>{{ bulkConfirmCount }} product{{ bulkConfirmCount !== 1 ? 's' : '' }}</strong> from all customers.
          </template>
          <template v-else>
            This will make <strong>{{ bulkConfirmCount }} product{{ bulkConfirmCount !== 1 ? 's' : '' }}</strong> visible to customers.
          </template>
        </p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelBulkAction">Cancel</button>
          <button 
            :class="['btn-confirm', bulkConfirmAction === 'delete' ? 'btn-danger' : 'btn-primary']"
            @click="executeBulkAction"
          >
            <span v-if="bulkConfirmAction === 'delete'">Delete {{ bulkConfirmCount }}</span>
            <span v-else-if="bulkConfirmAction === 'hide'">Hide {{ bulkConfirmCount }}</span>
            <span v-else>Show {{ bulkConfirmCount }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Phase 3: Error Toast with Retry ── -->
    <transition name="slide-up">
      <div class="error-toast" v-if="errorToastVisible">
        <span class="error-toast-msg">❌ {{ errorToastMessage }}</span>
        <div class="error-toast-actions">
          <button class="error-retry-btn" v-if="errorToastRetry" @click="retryErrorAction">Retry</button>
          <button class="error-dismiss-btn" @click="hideErrorToast">✕</button>
        </div>
      </div>
    </transition>

    <!-- TOAST -->
    <div class="toast" :class="{show: toastVisible}">{{toastMessage}}</div>
  </div>
</template>

<script>
import BulkEditView from './BulkEditView.vue';
import { VueDraggableNext } from 'vue-draggable-next';

export default {
  name: 'AdminPortal',
  components: {
    BulkEditView,
    draggable: VueDraggableNext
  },
  data() {
    return {
      activePage: 'catalog',
      sidebarOpen: true,
      sidebarFilter: '',
      searchQuery: '',
      currentFilter: 'all',
      filterTitle: 'All Products',
      
      products: [],
      customers: [],
      orders: [],
      categoryTree: [],
      categoryMetadata: {}, // Map of category name -> {id, is_hidden}
      expandedSuperCats: {},
      expandedViewCats: {},
      
      selectedCustomer: null,
      custSearchQuery: '',
      customerViewMode: 'full',
      customerViews: {},
      
      activeModal: null,
      newProductForm: {
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
      },
      isDraggingImage: false,
      productFormErrors: {},
      editProductErrors: {},
      newCustomerForm: {
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        preset: 'full'
      },
      customerFormErrors: {},
      editingProduct: null,
      isSavingProduct: false,
      isDeletingProduct: null,
      isSavingCustomer: false,
      isSavingEditProduct: false,
      
      activityLog: [
        { customer: 'Happy Snacks Co.', message: 'Logged in', type: 'login', icon: '🔑', time: 'just now' },
        { customer: 'Dragon Imports', message: 'Favorited: Lay\'s Cheetos', type: 'favorite', icon: '❤️', time: '5 min' }
      ],
      activityCustFilter: 'all',
      activityTypeFilter: 'all',
      
      orderFilter: 'all',
      registrationEnabled: true,
      
      toastVisible: false,
      toastMessage: '',

      // ── Phase 3: Bulk select ──
      selectedProducts: {},         // { productId: boolean }
      bulkConfirmVisible: false,
      bulkConfirmAction: null,      // 'hide' | 'show' | 'delete'
      bulkConfirmCount: 0,
      bulkConfirmTargets: [],

      // ── Phase 3: Loading state ──
      isLoading: false,

      // ── Phase 3: Pagination ──
      paginationPage: 1,
      paginationLimit: 50,
      paginationTotal: 0,
      paginationPages: 1,

      // ── Phase 3: Filter pills ──
      visibilityFilter: 'all',     // all | hidden | visible
      stockFilter: 'all',          // all | in-stock | oos
      superCatFilter: '',

      // ── Phase 3: Error toast ──
      errorToastVisible: false,
      errorToastMessage: '',
      errorToastRetry: null,

      // ── Phase 3: Debounce ──
      searchDebounceTimer: null,

      // ── Categories Management ──
      superCategoriesList: [],
      categoriesBySuper: {},
      catReorderStatus: ''
    }
  },
  
  computed: {
    hiddenCount() {
      return this.products.filter(p => p.is_hidden).length;
    },
    oosCount() {
      return this.products.filter(p => p.is_oos).length;
    },
    groupedProducts() {
      let filtered = this.products;
      
      // Apply current filter
      if (this.currentFilter === 'all') {
        // All products
      } else if (this.currentFilter === 'hidden') {
        filtered = filtered.filter(p => p.is_hidden);
      } else if (this.currentFilter === 'oos') {
        filtered = filtered.filter(p => p.is_oos);
      } else if (this.currentFilter.startsWith('super:')) {
        const superCat = this.currentFilter.substring(6);
        filtered = filtered.filter(p => p.super_category === superCat);
      } else if (this.currentFilter.startsWith('cat:')) {
        const cat = this.currentFilter.substring(4);
        filtered = filtered.filter(p => p.category === cat);
      }
      
      // Apply search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(q) || 
          (p.sku && p.sku.toLowerCase().includes(q))
        );
      }
      
      // Group by super_category first, then by category within each super_category
      const grouped = {};
      filtered.forEach(p => {
        const superCatKey = p.super_category || 'Other';
        const catKey = p.category || 'Uncategorized';
        
        if (!grouped[superCatKey]) {
          grouped[superCatKey] = {
            total: 0,
            categories: {}
          };
        }
        
        if (!grouped[superCatKey].categories[catKey]) {
          grouped[superCatKey].categories[catKey] = [];
        }
        
        grouped[superCatKey].categories[catKey].push(p);
        grouped[superCatKey].total++;
      });
      
      return grouped;
    },
    filteredCustomers() {
      if (!this.custSearchQuery) return this.customers;
      const q = this.custSearchQuery.toLowerCase();
      return this.customers.filter(c => 
        c.company_name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q)
      );
    },
    filteredOrders() {
      if (this.orderFilter === 'all') return this.orders;
      return this.orders.filter(o => o.status.toLowerCase() === this.orderFilter);
    },
    filteredActivityLog() {
      let logs = this.activityLog;
      if (this.activityTypeFilter !== 'all') {
        logs = logs.filter(l => l.type === this.activityTypeFilter);
      }
      return logs;
    },
    orderStats() {
      return {
        pending: this.orders.filter(o => o.status === 'Pending').length,
        processing: this.orders.filter(o => o.status === 'Processing').length,
        received: this.orders.filter(o => o.status === 'Received').length
      };
    },
    superCatNames() {
      return this.categoryTree.map(c => c.name);
    },
    customerVisibleCount() {
      if (!this.selectedCustomer) return 0;
      return this.products.filter(p => {
        if (p.is_hidden) return false;
        if (this.selectedCustomer.catHidden?.includes(p.super_category)) return false;
        if (this.selectedCustomer.customHidden?.includes(p.id)) return false;
        return true;
      }).length;
    },
    customerHiddenCount() {
      return this.products.length - this.customerVisibleCount;
    },

    // ── Phase 3: Bulk selection ──
    selectedProductIds() {
      return Object.entries(this.selectedProducts)
        .filter(([, v]) => v)
        .map(([k]) => k);
    },
    selectedProductCount() {
      return this.selectedProductIds.length;
    },
    paginationInfo() {
      const start = (this.paginationPage - 1) * this.paginationLimit + 1;
      const end = Math.min(this.paginationPage * this.paginationLimit, this.paginationTotal);
      return `Showing ${start}–${end} of ${this.paginationTotal}`;
    },

    // ========== FORM VALIDATION ==========
    isProductFormValid() {
      const f = this.newProductForm;
      if (!f.name || f.name.trim().length === 0) return false;
      if (f.name.trim().length > 255) return false;
      if (!f.category_id) return false;
      if (f.price !== '' && f.price !== null && f.price !== undefined) {
        const price = parseFloat(f.price);
        if (isNaN(price) || price < 0.01) return false;
      }
      if (f.cases_per_pallet !== '' && f.cases_per_pallet !== null) {
        const val = parseInt(f.cases_per_pallet);
        if (isNaN(val) || val < 1) return false;
      }
      return true;
    },
    isCustomerFormValid() {
      const f = this.newCustomerForm;
      if (!f.company_name || f.company_name.trim().length === 0) return false;
      if (f.company_name.trim().length > 255) return false;
      if (!f.email || f.email.trim().length === 0) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(f.email.trim())) return false;
      if (!f.preset) return false;
      return true;
    }
  },
  
  methods: {
    async loadProducts(page = null) {
      if (page !== null) this.paginationPage = page;
      this.isLoading = true;
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        params.set('page', this.paginationPage);
        // Load all products (limit=0 means unlimited per API)
        params.set('limit', 0);
        if (this.searchQuery) params.set('search', this.searchQuery);
        if (this.superCatFilter) params.set('super_category', this.superCatFilter);
        if (this.visibilityFilter !== 'all') params.set('visibility', this.visibilityFilter);
        if (this.stockFilter !== 'all') params.set('stock', this.stockFilter);

        const response = await fetch(`/api/products?${params}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await response.json();
        this.products = Array.isArray(data) ? data : (data.products || []);
        if (data.pagination) {
          this.paginationTotal = data.pagination.total;
          this.paginationPages = data.pagination.pages;
        }
        this.buildCategoryTree();
      } catch (e) {
        console.error('Failed to load products:', e);
        this.showErrorToast('Failed to load products', () => this.loadProducts());
      } finally {
        this.isLoading = false;
      }
    },

    // Helper: preserve scroll position during updates
    async loadProductsWithScrollPreserve() {
      const scrollY = window.scrollY;
      await this.loadProducts();
      this.$nextTick(() => {
        window.scrollTo(0, scrollY);
      });
    },
    
    async loadCustomers() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/customers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        // API returns { success: true, customers: [...] }
        this.customers = Array.isArray(data) ? data : (data.customers || []);
        // Normalize customer shape for UI
        this.customers = this.customers.map(c => ({
          ...c,
          company_name: c.company_name || 'Unknown',
          email: c.email || '',
          is_active: c.active !== undefined ? c.active : true,
          catHidden: c.catHidden || [],
          customHidden: c.customHidden || [],
          customOos: c.customOos || []
        }));
      } catch (e) {
        console.error('Failed to load customers:', e);
        this.showToast('❌ Failed to load customers');
      }
    },
    
    async loadOrders() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        // API returns { success: true, orders: [...] }
        const rawOrders = Array.isArray(data) ? data : (data.orders || []);
        // Normalize field names for UI
        this.orders = rawOrders.map(o => ({
          ...o,
          customer_name: o.customer_name || o.company_name || 'Unknown',
          cases: o.cases || o.total_cases || 0,
          skus: o.skus || o.items?.length || 0
        }));
      } catch (e) {
        console.error('Failed to load orders:', e);
      }
    },
    
    async loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            // API uses 'allow_registration' key
            const val = data.settings.allow_registration ?? data.settings.registration_enabled;
            this.registrationEnabled = val === undefined ? true : (val === 'true' || val === true);
          }
        }
      } catch (e) {
        // Keep default if can't load settings
      }
    },

    async loadCategories() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/categories-tree', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.success && data.superCategories && data.categories) {
          // Sort super categories by sort_order
          this.superCategoriesList = data.superCategories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          
          // Organize categories by super_category_id
          this.categoriesBySuper = {};
          this.superCategoriesList.forEach(sc => {
            this.categoriesBySuper[sc.id] = data.categories
              .filter(c => c.super_category_id === sc.id)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          });
        }
      } catch (e) {
        console.error('Failed to load categories:', e);
      }
    },
    
    buildCategoryTree() {
      const categories = {};
      const categoryMetadata = {}; // Map category names to {id, is_hidden}
      
      this.products.forEach(p => {
        if (!categories[p.super_category]) {
          categories[p.super_category] = {
            name: p.super_category,
            emoji: this.getSuperCategoryEmoji(p.super_category),
            count: 0,
            subcats: new Set()
          };
        }
        categories[p.super_category].count++;
        if (p.category) {
          categories[p.super_category].subcats.add(p.category);
          // Store category metadata
          if (!categoryMetadata[p.category]) {
            categoryMetadata[p.category] = {
              id: p.category_id,
              is_hidden: p.category_is_hidden || false
            };
          }
        }
      });
      
      this.categoryTree = Object.values(categories).map(cat => ({
        ...cat,
        subcats: Array.from(cat.subcats)
      }));
      
      // Store the category metadata for later use
      this.categoryMetadata = categoryMetadata;
    },
    
    getSuperCategoryEmoji(name) {
      const emojis = {
        "Chips & Savory Snacks": "🥔",
        "Noodles & Rice": "🍜",
        "Cookies & Wafers": "🍪",
        "Candy & Jelly": "🍬",
        "Korean Snacks": "🍱",
        "Beverages": "🥤",
        "Ice Cream": "🍦"
      };
      return emojis[name] || "📦";
    },
    
    getCategoryCount(cat) {
      return this.products.filter(p => p.category === cat).length;
    },
    
    getProductsInCategory(superCat) {
      return this.products.filter(p => p.super_category === superCat);
    },

    getCategoryItemCount(categoryId, type) {
      if (type === 'super') {
        // Count products in this super category
        return this.products.filter(p => p.super_category_id === categoryId).length;
      } else if (type === 'cat') {
        // Count products in this category
        return this.products.filter(p => p.category_id === categoryId).length;
      }
      return 0;
    },

    async onSuperCatsReorder(event) {
      // Send new sort order to server
      try {
        const updates = this.superCategoriesList.map((cat, index) => ({
          id: cat.id,
          sort_order: index
        }));

        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/super-categories-reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ updates })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.success) {
          this.catReorderStatus = 'Super categories updated!';
          setTimeout(() => { this.catReorderStatus = ''; }, 2000);
        }
      } catch (e) {
        console.error('Failed to reorder super categories:', e);
        this.showToast('❌ Failed to reorder super categories');
      }
    },

    async onCatsReorder(event, superCatId) {
      // Send new sort order to server
      try {
        const updates = (this.categoriesBySuper[superCatId] || []).map((cat, index) => ({
          id: cat.id,
          sort_order: index
        }));

        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/categories-reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ updates })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.success) {
          this.catReorderStatus = 'Categories updated!';
          setTimeout(() => { this.catReorderStatus = ''; }, 2000);
        }
      } catch (e) {
        console.error('Failed to reorder categories:', e);
        this.showToast('❌ Failed to reorder categories');
      }
    },
    
    showPage(page) {
      this.activePage = page;
      this.closeSidebar();
    },
    
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    
    closeSidebar() {
      this.sidebarOpen = false;
    },
    
    setFilter(type, value) {
      if (type === 'all') {
        this.currentFilter = 'all';
        this.filterTitle = 'All Products';
      } else if (type === 'hidden') {
        this.currentFilter = 'hidden';
        this.filterTitle = 'Hidden Products';
      } else if (type === 'oos') {
        this.currentFilter = 'oos';
        this.filterTitle = 'Out of Stock';
      } else if (type === 'cat' && value) {
        this.currentFilter = `cat:${value}`;
        this.filterTitle = value;
      }
      this.searchQuery = '';
      this.selectedProducts = {};
      this.paginationPage = 1;
      this.updateURLParams();
      this.loadProducts(1);
    },

    // ── Phase 3: URL params persistence ──
    updateURLParams() {
      const params = new URLSearchParams(window.location.search);
      if (this.searchQuery) params.set('q', this.searchQuery); else params.delete('q');
      if (this.visibilityFilter !== 'all') params.set('vis', this.visibilityFilter); else params.delete('vis');
      if (this.stockFilter !== 'all') params.set('stock', this.stockFilter); else params.delete('stock');
      if (this.superCatFilter) params.set('sc', this.superCatFilter); else params.delete('sc');
      if (this.paginationPage > 1) params.set('page', this.paginationPage); else params.delete('page');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    },

    loadFromURLParams() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('q')) this.searchQuery = params.get('q');
      if (params.get('vis')) this.visibilityFilter = params.get('vis');
      if (params.get('stock')) this.stockFilter = params.get('stock');
      if (params.get('sc')) this.superCatFilter = params.get('sc');
      if (params.get('page')) this.paginationPage = parseInt(params.get('page')) || 1;
    },

    // ── Phase 3: Debounced search ──
    onSearchInput() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.paginationPage = 1;
        this.updateURLParams();
        this.loadProducts(1);
      }, 300);
    },

    // ── Phase 3: Pagination ──
    changePage(page) {
      if (page < 1 || page > this.paginationPages) return;
      this.paginationPage = page;
      this.updateURLParams();
      this.loadProducts(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ── Phase 3: Bulk selection ──
    toggleProductSelect(productId) {
      this.selectedProducts = {
        ...this.selectedProducts,
        [productId]: !this.selectedProducts[productId]
      };
    },

    toggleAllInCategory(catProducts) {
      const ids = catProducts.map(p => p.id);
      const allSelected = ids.every(id => this.selectedProducts[id]);
      const update = {};
      ids.forEach(id => { update[id] = !allSelected; });
      this.selectedProducts = { ...this.selectedProducts, ...update };
    },

    isCategoryAllSelected(catProducts) {
      if (!catProducts.length) return false;
      return catProducts.every(p => this.selectedProducts[p.id]);
    },

    isCategoryPartialSelected(catProducts) {
      const selected = catProducts.filter(p => this.selectedProducts[p.id]).length;
      return selected > 0 && selected < catProducts.length;
    },

    clearSelection() {
      this.selectedProducts = {};
    },

    // ── Phase 3: Bulk action confirmation ──
    startBulkAction(action) {
      const ids = this.selectedProductIds;
      if (!ids.length) return this.showToast('No products selected');
      this.bulkConfirmAction = action;
      this.bulkConfirmTargets = ids;
      this.bulkConfirmCount = ids.length;
      this.bulkConfirmVisible = true;
    },

    cancelBulkAction() {
      this.bulkConfirmVisible = false;
      this.bulkConfirmAction = null;
      this.bulkConfirmTargets = [];
      this.bulkConfirmCount = 0;
    },

    async executeBulkAction() {
      const { bulkConfirmAction: action, bulkConfirmTargets: ids } = this;
      this.bulkConfirmVisible = false;
      const token = localStorage.getItem('token');

      try {
        if (action === 'delete') {
          const res = await fetch('/api/admin/bulk/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productIds: ids })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Bulk delete failed');
          this.showToast(`✅ ${data.deleted} products deleted`);
        } else {
          const is_hidden = action === 'hide';
          const res = await fetch('/api/admin/bulk/visibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productIds: ids, is_hidden })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Bulk visibility update failed');
          this.showToast(`✅ ${data.updated} products ${is_hidden ? 'hidden' : 'shown'}`);
        }
        this.clearSelection();
        await this.loadProductsWithScrollPreserve();
      } catch (err) {
        console.error('Bulk action error:', err);
        this.showErrorToast(`Failed: ${err.message}`, () => this.executeBulkAction());
      }
    },

    // ── Phase 3: Error toast ──
    showErrorToast(msg, retryFn = null) {
      this.errorToastMessage = msg;
      this.errorToastRetry = retryFn || null;
      this.errorToastVisible = true;
    },

    hideErrorToast() {
      this.errorToastVisible = false;
      this.errorToastMessage = '';
      this.errorToastRetry = null;
    },

    retryErrorAction() {
      const fn = this.errorToastRetry;
      this.hideErrorToast();
      if (fn) fn();
    },

    // ── Phase 3: Category bulk visibility ──
    async toggleCategoryAllProductsVisibility(catId, catName, isHide) {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/categories/${catId}/visibility`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ is_hidden: isHide })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        this.showToast(`✅ ${data.updated} products in "${catName}" ${isHide ? 'hidden' : 'shown'}`);
        await this.loadProducts();
      } catch (err) {
        this.showErrorToast(`Failed to update "${catName}": ${err.message}`, () => this.toggleCategoryAllProductsVisibility(catId, catName, isHide));
      }
    },

    // ── Phase 3: Filter pills ──
    setVisibilityFilter(val) {
      this.visibilityFilter = val;
      this.paginationPage = 1;
      this.updateURLParams();
      this.loadProducts(1);
    },

    setStockFilter(val) {
      this.stockFilter = val;
      this.paginationPage = 1;
      this.updateURLParams();
      this.loadProducts(1);
    },

    setSuperCatFilter(val) {
      this.superCatFilter = val;
      this.paginationPage = 1;
      this.updateURLParams();
      this.loadProducts(1);
    },
    
    toggleSuperCat(name) {
      // Vue 3 Proxy reactivity handles dynamic keys directly
      const current = this.expandedSuperCats[name] || false;
      this.expandedSuperCats = { ...this.expandedSuperCats, [name]: !current };
      
      if (this.expandedSuperCats[name]) {
        this.currentFilter = `super:${name}`;
        this.filterTitle = name;
      }
    },
    
    filterSidebar(val) {
      // Filter sidebar items by search
    },
    
    renderCatalog() {
      // Catalog renders automatically via computed property
    },
    
    renderCustList() {
      // Customer list renders automatically via computed property
    },
    
    // ==================== PRODUCT CRUD ====================
    
    editProduct(product) {
      this.editingProduct = { ...product };
      this.activeModal = 'editProdModal';
    },
    
    async saveEditProduct() {
      if (!this.editingProduct) return;

      // Validate edit form
      this.editProductErrors = {};
      if (!this.editingProduct.name || !this.editingProduct.name.trim()) {
        this.editProductErrors.name = 'Product name is required';
      } else if (this.editingProduct.name.trim().length > 255) {
        this.editProductErrors.name = 'Name must be 255 characters or less';
      }
      if (this.editingProduct.price !== '' && this.editingProduct.price !== null) {
        const price = parseFloat(this.editingProduct.price);
        if (isNaN(price) || price < 0.01) {
          this.editProductErrors.price = 'Price must be at least $0.01';
        }
      }
      if (Object.keys(this.editProductErrors).length > 0) {
        this.showToast('❌ Please fix validation errors');
        return;
      }

      this.isSavingEditProduct = true;
      try {
        // Convert is_oos: 0=false, 1=true
        const payload = {
          ...this.editingProduct,
          name: this.editingProduct.name.trim(),
          is_oos: Boolean(this.editingProduct.is_oos)
        };
        
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/products/${this.editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          this.showToast('❌ Not authorized — please log in again');
        } else if (response.status === 404) {
          this.showToast('❌ Product not found');
        } else if (response.ok) {
          await this.loadProductsWithScrollPreserve();
          this.closeModal('editProdModal');
          this.editProductErrors = {};
          this.showToast('✅ Product updated');
          this.logActivity(`Updated product: ${this.editingProduct.name}`);
        } else {
          this.showToast('❌ ' + (data.error || 'Failed to update product'));
        }
      } catch (e) {
        console.error('Save error:', e);
        this.showToast('❌ Network error — check connection');
      } finally {
        this.isSavingEditProduct = false;
      }
    },
    
    async deleteProduct(productId) {
      if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;

      this.isDeletingProduct = productId;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          this.showToast('❌ Not authorized — please log in again');
        } else if (response.status === 404) {
          this.showToast('❌ Product not found');
          await this.loadProductsWithScrollPreserve();
        } else if (response.ok) {
          await this.loadProductsWithScrollPreserve();
          this.showToast('✅ Product deleted');
          this.logActivity('Deleted a product');
        } else {
          this.showToast('❌ ' + (data.error || 'Failed to delete product'));
        }
      } catch (e) {
        console.error('Delete error:', e);
        this.showToast('❌ Network error — check connection');
      } finally {
        this.isDeletingProduct = null;
      }
    },
    
    async toggleVisibility(product) {
      try {
        const newHiddenStatus = !product.is_hidden;
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ is_hidden: newHiddenStatus })
        });
        
        if (response.ok) {
          await this.loadProductsWithScrollPreserve();
          this.showToast('✅ Product visibility toggled');
          this.logActivity(`${newHiddenStatus ? 'Hidden' : 'Unhidden'}: ${product.name}`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Visibility toggle failed:', response.status, errorData);
          this.showErrorToast(`Failed to update (${response.status})`, () => this.toggleVisibility(product));
        }
      } catch (e) {
        console.error('Visibility toggle error:', e);
        this.showErrorToast('Failed to update visibility', () => this.toggleVisibility(product));
      }
    },
    
    async toggleCategoryVisibility(categoryName) {
      try {
        const metadata = this.categoryMetadata[categoryName];
        if (!metadata || !metadata.id) {
          this.showToast('❌ Category ID not found');
          return;
        }
        
        const newHiddenStatus = !metadata.is_hidden;
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/categories/${metadata.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ is_hidden: newHiddenStatus })
        });
        
        if (response.ok) {
          metadata.is_hidden = newHiddenStatus;
          this.showToast(newHiddenStatus ? '🚫 Category Hidden' : '👁 Category Visible');
          this.logActivity(`${newHiddenStatus ? 'Hidden' : 'Unhidden'} category: ${categoryName}`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Category visibility toggle failed:', response.status, errorData);
          this.showToast(`❌ Failed to update (${response.status})`);
        }
      } catch (e) {
        console.error('Category visibility toggle error:', e);
        this.showToast('❌ Failed to update');
      }
    },
    
    async toggleOosStatus(product) {
      try {
        const newOosStatus = !product.is_oos;
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ is_oos: newOosStatus })
        });
        
        if (response.ok) {
          await this.loadProductsWithScrollPreserve();
          this.showToast(newOosStatus ? '⚠️ Out of Stock' : '✓ In Stock');
          this.logActivity(`Stock status updated: ${product.name} → ${newOosStatus ? 'OOS' : 'In Stock'}`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('OOS toggle failed:', response.status, errorData);
          this.showToast(`❌ Failed to update (${response.status})`);
        }
      } catch (e) {
        console.error('OOS toggle error:', e);
        this.showToast('❌ Failed to update stock status');
      }
    },
    
    handleImageDrop(e) {
      this.isDraggingImage = false;
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processImageFile(files[0]);
      }
    },
    handleImageSelect(e) {
      const files = e.target.files;
      if (files.length > 0) {
        this.processImageFile(files[0]);
      }
    },
    processImageFile(file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        this.showToast('❌ Only JPG, PNG, or WebP images are allowed');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('❌ Image must be smaller than 5MB');
        return;
      }
      this.newProductForm.imageFile = file;
      this.newProductForm.image_url = ''; // Clear URL if file is selected
    },
    getImagePreview() {
      if (this.newProductForm.imageFile) {
        return URL.createObjectURL(this.newProductForm.imageFile);
      }
      return '';
    },
    clearImage() {
      this.newProductForm.imageFile = null;
      this.newProductForm.image_url = '';
      if (this.$refs.imageFileInput) {
        this.$refs.imageFileInput.value = '';
      }
    },
    async saveNewProduct() {
      // Validate
      this.productFormErrors = {};
      const f = this.newProductForm;
      if (!f.name || !f.name.trim()) {
        this.productFormErrors.name = 'Product name is required';
      } else if (f.name.trim().length > 255) {
        this.productFormErrors.name = 'Name must be 255 characters or less';
      }
      if (!f.category_id) {
        this.productFormErrors.category_id = 'Category is required';
      }
      
      // Validate that categories are loaded
      if (!this.superCategoriesList || this.superCategoriesList.length === 0) {
        this.productFormErrors.category_id = 'Categories are still loading. Please wait...';
      } else if (f.category_id) {
        // Verify the selected category exists in our hierarchy
        let categoryFound = false;
        for (const superCat of this.superCategoriesList) {
          const cats = this.categoriesBySuper[superCat.id] || [];
          if (cats.some(c => c.id === f.category_id)) {
            categoryFound = true;
            break;
          }
        }
        if (!categoryFound) {
          this.productFormErrors.category_id = 'Selected category not found. Please reload categories.';
        }
      }
      
      if (f.price !== '' && f.price !== null && f.price !== undefined) {
        const price = parseFloat(f.price);
        if (isNaN(price) || price < 0.01) {
          this.productFormErrors.price = 'Price must be at least $0.01';
        }
      }
      if (f.cases_per_pallet !== '' && f.cases_per_pallet !== null && f.cases_per_pallet !== '') {
        const val = parseInt(f.cases_per_pallet);
        if (isNaN(val) || val < 1) {
          this.productFormErrors.cases_per_pallet = 'Cases per pallet must be a whole number ≥ 1';
        }
      }
      if (Object.keys(this.productFormErrors).length > 0) {
        this.showToast('❌ Please fix validation errors');
        return;
      }

      this.isSavingProduct = true;
      try {
        let imageUrl = f.image_url || null;
        
        // Upload image if file is selected
        if (f.imageFile) {
          const formData = new FormData();
          formData.append('image', f.imageFile);
          
          const token = localStorage.getItem('token');
          const uploadResponse = await fetch('/api/products/upload-image', {
            method: 'POST',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData
          });
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            imageUrl = uploadData.url;
          } else {
            throw new Error('Failed to upload image');
          }
        }
        
        // Find the super_category_id for this category
        let super_category_id = null;
        for (const superCat of this.superCategoriesList) {
          const cat = this.categoriesBySuper[superCat.id]?.find(c => c.id === f.category_id);
          if (cat) {
            super_category_id = superCat.id;
            break;
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
        };
        
        // Only include image_url if we have a valid one
        if (imageUrl) {
          payload.image_url = imageUrl;
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          this.showToast('❌ Not authorized — please log in again');
        } else if (response.status === 409) {
          this.productFormErrors.sku = data.error || 'SKU already exists';
          this.showToast('❌ ' + (data.error || 'Duplicate entry'));
        } else if (response.status === 422) {
          // Validation errors from backend
          if (data.errors) {
            Object.assign(this.productFormErrors, data.errors);
            const errorFields = Object.keys(data.errors).join(', ');
            this.showToast('❌ Please fix: ' + errorFields);
          } else {
            this.showToast('❌ ' + (data.error || 'Validation failed'));
          }
        } else if (response.ok) {
          await this.loadProducts();
          this.closeModal('addProdModal');
          this.newProductForm = { name: '', sku: '', weight: '', bags_per_case: '', cases_per_pallet: '', price: '', category_id: '', image_url: '', imageFile: null, showPrice: true };
          this.productFormErrors = {};
          this.showToast('✅ Product added');
          this.logActivity(`Added new product: ${payload.name}`);
        } else {
          this.showToast('❌ ' + (data.error || 'Failed to add product'));
        }
      } catch (e) {
        console.error('Add error:', e);
        this.showToast('❌ ' + (e.message || 'Network error — check connection'));
      } finally {
        this.isSavingProduct = false;
      }
    },
    
    // ==================== CUSTOMER MANAGEMENT ====================
    
    selectCustomer(cust) {
      // Initialize arrays if missing (API may not return them)
      const initialized = Object.assign({}, cust, {
        catHidden: cust.catHidden || [],
        customHidden: cust.customHidden || [],
        customOos: cust.customOos || []
      });
      this.selectedCustomer = initialized;
      this.expandedViewCats = {};
      this.customerViewMode = 'custom';
    },
    
    async addCustomer() {
      // Validate
      this.customerFormErrors = {};
      const f = this.newCustomerForm;
      if (!f.company_name || !f.company_name.trim()) {
        this.customerFormErrors.company_name = 'Company name is required';
      } else if (f.company_name.trim().length > 255) {
        this.customerFormErrors.company_name = 'Company name must be 255 characters or less';
      }
      if (!f.email || !f.email.trim()) {
        this.customerFormErrors.email = 'Email is required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(f.email.trim())) {
          this.customerFormErrors.email = 'Please enter a valid email address';
        }
      }
      if (f.phone && f.phone.trim()) {
        const phoneClean = f.phone.replace(/[\s\-\(\)\.]/g, '');
        if (phoneClean.length < 7 || phoneClean.length > 15 || !/^\+?\d+$/.test(phoneClean)) {
          this.customerFormErrors.phone = 'Please enter a valid phone number';
        }
      }
      if (!f.preset) {
        this.customerFormErrors.preset = 'View preset is required';
      }
      if (Object.keys(this.customerFormErrors).length > 0) {
        this.showToast('❌ Please fix validation errors');
        return;
      }

      this.isSavingCustomer = true;
      try {
        const companyName = f.company_name.trim();
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
        });
        
        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          this.showToast('❌ Not authorized — please log in again');
        } else if (response.status === 409) {
          this.customerFormErrors.email = data.error || 'Email already exists';
          this.showToast('❌ ' + (data.error || 'Email already registered'));
        } else if (response.ok) {
          await this.loadCustomers();
          this.closeModal('addCustModal');
          this.newCustomerForm = { company_name: '', contact_name: '', email: '', phone: '', preset: 'full' };
          this.customerFormErrors = {};
          this.showToast('✅ Customer added');
          this.logActivity(`Added customer: ${companyName}`);
        } else {
          this.showToast(`❌ ${data.error || 'Failed to add customer'}`);
        }
      } catch (e) {
        console.error('Add customer error:', e);
        this.showToast('❌ Network error — check connection');
      } finally {
        this.isSavingCustomer = false;
      }
    },
    
    async saveCustomerView() {
      if (!this.selectedCustomer) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/customers/${this.selectedCustomer.id}/view`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            catHidden: this.selectedCustomer.catHidden || [],
            customHidden: this.selectedCustomer.customHidden || [],
            customOos: this.selectedCustomer.customOos || []
          })
        });
        if (response.ok) {
          this.showToast('✅ View saved');
          this.logActivity(`Updated view for: ${this.selectedCustomer.company_name}`);
        } else {
          const errData = await response.json().catch(() => ({}));
          this.showToast(`⚠️ ${errData.error || 'Failed to save view'}`);
        }
      } catch (e) {
        this.showToast('⚠️ Saved locally (no connection)');
        this.logActivity(`Updated view for: ${this.selectedCustomer.company_name}`);
      }
    },
    
    applyViewPreset(preset) {
      if (!this.selectedCustomer) return;
      this.customerViewMode = preset;

      const ALL = [
        'Chips & Savory Snacks',
        'Noodles & Rice',
        'Cookies & Wafers',
        'Candy & Jelly',
        'Korean Snacks',
        'Beverages',
        'Ice Cream'
      ];

      if (preset === 'full') {
        this.selectedCustomer.catHidden = [];
        this.selectedCustomer.customHidden = [];
        this.showToast('📦 Full catalog restored');
      } else if (preset === 'chips') {
        this.selectedCustomer.catHidden = ALL.filter(c => c !== 'Chips & Savory Snacks');
        this.showToast('🥔 Chips preset applied');
      } else if (preset === 'noodles') {
        this.selectedCustomer.catHidden = ALL.filter(c => c !== 'Noodles & Rice');
        this.showToast('🍜 Noodles preset applied');
      } else if (preset === 'korean') {
        this.selectedCustomer.catHidden = ALL.filter(c => c !== 'Korean Snacks');
        this.showToast('🍱 Korean preset applied');
      } else if (preset === 'icecream') {
        this.selectedCustomer.catHidden = ALL.filter(c => c !== 'Ice Cream');
        this.showToast('🍦 Ice Cream preset applied');
      } else if (preset === 'custom') {
        // Custom — no automatic changes; user adjusts manually
        this.showToast('✏️ Custom mode — adjust manually');
      }
    },
    
    toggleCatInView(superCat) {
      // Kept for backwards compat — delegates to expand
      this.toggleCatExpand(superCat);
    },
    
    toggleCatExpand(superCat) {
      const current = this.expandedViewCats[superCat] || false;
      this.expandedViewCats = { ...this.expandedViewCats, [superCat]: !current };
    },

    isCatHiddenForCust(superCat) {
      return this.selectedCustomer?.catHidden?.includes(superCat) || false;
    },

    toggleCatVisForCust(superCat) {
      if (!this.selectedCustomer) return;
      const arr = this.selectedCustomer.catHidden;
      const idx = arr.indexOf(superCat);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(superCat);
      }
      this.customerViewMode = 'custom';
    },

    hideAllForCust() {
      if (!this.selectedCustomer) return;
      this.selectedCustomer.catHidden = this.superCatNames.slice();
      this.customerViewMode = 'custom';
      this.showToast('🚫 All categories hidden for this customer');
    },

    showAllForCust() {
      if (!this.selectedCustomer) return;
      this.selectedCustomer.catHidden = [];
      this.selectedCustomer.customHidden = [];
      this.customerViewMode = 'full';
      this.showToast('👁 Full catalog restored');
    },

    showOnlyForCust(superCat) {
      if (!this.selectedCustomer) return;
      this.selectedCustomer.catHidden = this.superCatNames.filter(c => c !== superCat);
      this.customerViewMode = 'custom';
      this.showToast(`👁 Only showing: ${superCat}`);
    },

    resetCustomerView() {
      if (!this.selectedCustomer) return;
      if (!confirm(`Reset all visibility settings for ${this.selectedCustomer.company_name}?`)) return;
      this.selectedCustomer.catHidden = [];
      this.selectedCustomer.customHidden = [];
      this.selectedCustomer.customOos = [];
      this.customerViewMode = 'full';
      this.showToast('✅ View reset — full catalog');
    },
    
    isProductVisibleForCustomer(productId) {
      if (!this.selectedCustomer) return true;
      return !(this.selectedCustomer.customHidden?.includes(productId));
    },
    
    toggleProductForCustomer(productId) {
      if (!this.selectedCustomer) return;
      if (!this.selectedCustomer.customHidden) this.selectedCustomer.customHidden = [];
      const idx = this.selectedCustomer.customHidden.indexOf(productId);
      if (idx >= 0) {
        this.selectedCustomer.customHidden.splice(idx, 1);
      } else {
        this.selectedCustomer.customHidden.push(productId);
      }
      this.customerViewMode = 'custom';
    },

    isProductOosForCustomer(productId) {
      return this.selectedCustomer?.customOos?.includes(productId) || false;
    },

    toggleOosForCustomer(productId) {
      if (!this.selectedCustomer) return;
      if (!this.selectedCustomer.customOos) this.selectedCustomer.customOos = [];
      const idx = this.selectedCustomer.customOos.indexOf(productId);
      if (idx >= 0) {
        this.selectedCustomer.customOos.splice(idx, 1);
      } else {
        this.selectedCustomer.customOos.push(productId);
      }
    },
    
    getAvatarColor(name) {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    },
    
    // ==================== ORDERS ====================
    
    setOrderFilter(filter) {
      this.orderFilter = filter;
    },
    
    async updateOrderStatus(orderId, newStatus) {
      try {
        // Try the dedicated status endpoint first
        const response = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
          // Update local state without full reload
          const order = this.orders.find(o => o.id === orderId);
          if (order) order.status = newStatus;
          this.showToast('✅ Order status updated');
          this.logActivity(`Updated order ${orderId} to ${newStatus}`);
        } else {
          this.showToast('❌ Failed to update order status');
        }
      } catch (e) {
        console.error('Update order error:', e);
        this.showToast('❌ Error updating order');
      }
    },
    
    getMonthOrders() {
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      return this.orders.filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length;
    },
    
    formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleDateString();
    },
    
    // ==================== SETTINGS ====================
    
    async toggleRegistration() {
      this.registrationEnabled = !this.registrationEnabled;
      const newVal = this.registrationEnabled;
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/settings/allow_registration', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ value: newVal ? 'true' : 'false' })
        });
        this.showToast(newVal ? '✅ Registration enabled' : '✅ Registration disabled');
      } catch (e) {
        this.showToast(newVal ? '✅ Registration enabled (local)' : '✅ Registration disabled (local)');
      }
    },
    
    clearActivityLog() {
      if (confirm('Clear all activity logs?')) {
        this.activityLog = [];
        this.showToast('✅ Log cleared');
      }
    },
    
    renderActivityLog() {
      // Renders via computed property
    },
    
    // ==================== MODAL & UI ====================
    
    openModal(modal) {
      this.activeModal = modal;
    },
    
    closeModal(modal) {
      this.activeModal = null;
    },
    
    showToast(msg) {
      this.toastMessage = msg;
      this.toastVisible = true;
      setTimeout(() => { this.toastVisible = false; }, 3000);
    },
    
    logActivity(message) {
      const now = new Date();
      this.activityLog.unshift({
        customer: 'Admin',
        message: message,
        type: 'order',
        icon: '⚙️',
        time: 'just now'
      });
      if (this.activityLog.length > 100) this.activityLog.pop();
    },
    
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      // Reload page — App.vue will detect no token and show Login
      window.location.reload();
    }
  },
  
  mounted() {
    this.loadFromURLParams();
    this.loadProducts();
    this.loadCustomers();
    this.loadOrders();
    this.loadSettings();
    this.loadCategories();
  }
}
</script>

<style scoped>
.admin-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg);
  font-family: 'DM Sans', sans-serif;
  color: var(--text);
}

.page {
  display: none;
  flex: 1;
  min-height: 0;
}

.page.active {
  display: flex;
  flex-direction: column;
}

.admin-catalog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Import all CSS variables from HTML */
:root {
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
}

.topnav {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
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
  gap: 4px;
  align-items: center;
  justify-content: center;
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
}

.brand-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--text);
}

.brand-name span {
  color: var(--red);
}

.admin-pill {
  background: var(--red-light);
  border: 1px solid var(--red-mid);
  color: var(--red);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 2px 9px;
  border-radius: 20px;
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

.btn-logout {
  padding: 6px 13px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--sub);
  font-size: 13px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
}

.btn-logout:hover {
  border-color: var(--red);
  color: var(--red);
}

.catalog-wrap {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: 150;
  display: none;
  top: var(--nav-h);
}

.sidebar-overlay.open {
  display: block;
}

.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  height: calc(100vh - var(--nav-h));
  position: sticky;
  top: var(--nav-h);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
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
  box-shadow: var(--shadow-lg);
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
}

.sb-search input:focus {
  border-color: var(--red);
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
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
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
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
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

.c-cnt {
  font-size: 10px;
  color: var(--faint);
}

.sb-special {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 12px;
  color: var(--sub);
  transition: all 0.15s;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
}

.sb-special:hover {
  background: var(--bg);
  color: var(--text);
}

.sb-special.active {
  color: var(--red);
  background: var(--red-light);
}

.catalog-main {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  min-width: 0;
}

.cat-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.cat-bar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  letter-spacing: -0.3px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--text);
  width: 170px;
}

.search-box input::placeholder {
  color: var(--faint);
}

.btn-add-prod {
  padding: 8px 16px;
  background: var(--red);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-add-prod:hover {
  background: #a93226;
}

.super-cat-section {
  margin-bottom: 40px;
  border-bottom: 2px solid var(--border);
  padding-bottom: 32px;
}

.super-cat-hdr {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.super-cat-name {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.super-cat-count {
  display: inline-block;
  background: var(--red);
  color: white;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  margin-left: auto;
}

.cat-section {
  margin-bottom: 28px;
}

.cat-section-hdr {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-section-hdr::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.cat-count-badge {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 20px;
  font-weight: 500;
  letter-spacing: 0;
}

.cat-visibility-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
  color: var(--muted);
  margin-left: auto;
}

.cat-visibility-toggle:hover {
  background: var(--border);
  color: var(--text);
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}

.admin-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  position: relative;
  transition: all 0.15s;
  box-shadow: var(--shadow);
}

.admin-card:hover {
  border-color: var(--red-mid);
  box-shadow: var(--shadow-md);
}

.admin-card.hidden-prod {
  opacity: 0.5;
  border-style: dashed;
  background: var(--bg);
}

.admin-card.oos-prod {
  border-color: #f0d49a;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-badges {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 2px 7px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.b-hidden {
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
}

.b-oos {
  background: var(--yellow-bg);
  color: var(--yellow);
  border: 1px solid #f0d49a;
}

.b-visible {
  background: var(--green-bg);
  color: var(--green);
  border: 1px solid #b7dfca;
}

.card-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 7px;
  background: #fff;
  display: block;
  margin: 0 auto 9px;
  border: 1px solid var(--border2);
}

.card-name {
  font-size: 11px;
  color: var(--text);
  font-weight: 500;
  line-height: 1.35;
  height: 30px;
  overflow: hidden;
  margin-bottom: 3px;
}

.card-meta {
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 3px;
}

.card-sku {
  font-size: 10px;
  color: var(--faint);
  font-family: monospace;
  margin-bottom: 9px;
}

.card-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.ca-btn {
  flex: 1;
  min-width: 46px;
  padding: 5px 3px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--sub);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
}

.ca-btn:hover {
  border-color: var(--red-mid);
  color: var(--red);
  background: var(--red-light);
}

.ca-btn.oos {
  border-color: #f0d49a;
  color: var(--yellow);
  background: var(--yellow-bg);
}

/* CUSTOMER VIEWS */
.views-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.customer-list {
  width: 268px;
  min-width: 268px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--nav-h));
  position: sticky;
  top: var(--nav-h);
}

.clist-head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clist-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.btn-add-cust {
  padding: 5px 12px;
  background: var(--red);
  border: none;
  border-radius: 7px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add-cust:hover {
  background: #a93226;
}

.clist-search {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
}

.clist-search input {
  width: 100%;
  padding: 7px 11px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  outline: none;
}

.clist-search input:focus {
  border-color: var(--red);
}

.customer-rows {
  flex: 1;
  overflow-y: auto;
}

.cust-row {
  padding: 11px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--border2);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.cust-row:hover {
  background: var(--bg);
}

.cust-row.active {
  background: var(--red-light);
  border-right: 2px solid var(--red);
}

.c-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: #fff;
  flex-shrink: 0;
}

.c-name {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.c-email {
  font-size: 11px;
  color: var(--muted);
}

.c-pills {
  display: flex;
  gap: 5px;
  margin-top: 3px;
}

.c-pill {
  font-size: 9px;
  padding: 1px 7px;
  border-radius: 20px;
  font-weight: 500;
}

/* VIEW EDITOR */
.view-editor {
  flex: 1;
  overflow-y: auto;
  padding: 22px;
}

.ve-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted);
  font-size: 14px;
  gap: 10px;
  min-height: 300px;
}

.ve-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.ve-name {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.3px;
}

.ve-email {
  font-size: 13px;
  color: var(--muted);
  margin-top: 2px;
}

.ve-actions {
  display: flex;
  gap: 7px;
  flex-shrink: 0;
}

.btn-save {
  padding: 7px 18px;
  background: var(--red);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.btn-save:hover {
  background: #a93226;
}

.btn-reset {
  padding: 7px 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  cursor: pointer;
}

.btn-reset:hover {
  border-color: var(--red);
  color: var(--red);
}

.ve-presets {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.ve-preset-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.preset-btn {
  padding: 5px 13px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--sub);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
}

.preset-btn.active {
  border-color: var(--red);
  color: var(--red);
  background: var(--red-light);
}

.preset-btn:hover:not(.active) {
  border-color: var(--red-mid);
  color: var(--text);
}

.ve-hint {
  font-size: 12px;
  color: var(--sub);
  padding: 9px 12px;
  background: var(--bg);
  border-radius: 8px;
  border-left: 3px solid var(--red);
  margin-bottom: 16px;
}

.ve-cat-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 10px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.ve-cat-head {
  padding: 11px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  background: #faf9f7;
}

.ve-emoji {
  font-size: 15px;
}

.ve-cat-label {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.ve-cnt {
  font-size: 11px;
  color: var(--muted);
}

.arr-btn {
  background: none;
  border: none;
  color: var(--faint);
  font-size: 11px;
  cursor: pointer;
  transition: transform 0.2s;
  padding: 3px;
}

.arr-btn.open {
  transform: rotate(90deg);
}

.ve-cat-items {
  padding: 10px 12px 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 7px;
}

.ve-cat-items.collapsed {
  display: none;
}

.mini-card {
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
}

.mini-card:hover {
  border-color: var(--red-mid);
}

.mini-card.prod-hidden {
  opacity: 0.45;
  border-style: dashed;
}

.mini-card.prod-oos {
  border-color: #f0d49a;
}

.mini-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 5px;
  background: var(--surface);
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.mini-info {
  flex: 1;
  min-width: 0;
}

.mini-name {
  font-size: 11px;
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-sku {
  font-size: 9px;
  color: var(--muted);
  font-family: monospace;
}

.mini-controls {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}

.mini-toggle {
  width: 30px;
  height: 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}

.mini-toggle.on {
  background: var(--green);
}

.mini-toggle.off {
  background: var(--faint);
}

.mini-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.mini-toggle.on::after {
  left: 16px;
}

.mini-toggle.off::after {
  left: 2px;
}

/* ORDERS PAGE */
.orders-main {
  flex: 1;
  padding: 22px;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.3px;
}

.filter-row {
  display: flex;
  gap: 5px;
}

.filter-btn {
  padding: 5px 13px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--sub);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
}

.filter-btn.active {
  background: var(--red);
  border-color: var(--red);
  color: #fff;
}

.filter-btn:hover:not(.active) {
  border-color: var(--red-mid);
  color: var(--red);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  box-shadow: var(--shadow);
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 7px;
}

.stat-val {
  font-size: 28px;
  font-weight: 600;
  color: var(--text);
}

.stat-card.red .stat-val {
  color: var(--red);
}

.stat-card.green .stat-val {
  color: var(--green);
}

.stat-card.yellow .stat-val {
  color: var(--yellow);
}

.orders-table {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.ot-head {
  display: grid;
  grid-template-columns: 120px 1fr 130px 80px 70px 110px 110px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.ot-th {
  padding: 10px 14px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--muted);
}

.ot-row {
  display: grid;
  grid-template-columns: 120px 1fr 130px 80px 70px 110px 110px;
  border-bottom: 1px solid var(--border2);
  transition: background 0.12s;
}

.ot-row:hover {
  background: var(--bg);
}

.ot-row:last-child {
  border-bottom: none;
}

.ot-cell {
  padding: 13px 14px;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.ot-id {
  font-weight: 600;
  font-size: 13px;
  color: var(--red);
}

.order-status {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
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

.status-select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  padding: 4px 8px;
  cursor: pointer;
}

.status-select:focus {
  outline: none;
  border-color: var(--red);
}

/* SETTINGS */
.settings-main {
  padding: 28px;
  max-width: 780px;
  margin: 0 auto;
}

.settings-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 22px;
  overflow: hidden;
}

.settings-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  padding: 16px 20px;
  border-bottom: 1px solid #ede9e4;
  letter-spacing: -0.2px;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
}

.settings-row-info {
  flex: 1;
}

.settings-row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 3px;
}

.settings-row-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.toggle-sw {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-sw.on {
  background: var(--green);
}

.toggle-sw.off {
  background: var(--faint);
}

.toggle-sw::after {
  content: '';
  position: absolute;
  top: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-sw.on::after {
  left: 19px;
}

.toggle-sw.off::after {
  left: 3px;
}

.settings-activity-bar {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #ede9e4;
  flex-wrap: wrap;
  align-items: center;
}

.settings-filter-sel {
  padding: 7px 10px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: var(--bg);
  color: var(--text);
  outline: none;
  cursor: pointer;
}

.settings-filter-sel:focus {
  border-color: var(--red);
}

.settings-clear-btn {
  padding: 7px 14px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  margin-left: auto;
}

.settings-clear-btn:hover {
  border-color: #e8b4b4;
  color: var(--red);
}

.activity-log-wrap {
  max-height: 420px;
  overflow-y: auto;
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 20px;
  border-bottom: 1px solid #ede9e4;
  font-size: 13px;
  transition: background 0.1s;
}

.activity-row:last-child {
  border-bottom: none;
}

.activity-row:hover {
  background: var(--bg);
}

.act-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.act-icon.login {
  background: #e8f4fd;
  color: #2980b9;
}

.act-icon.logout {
  background: #fef6e8;
  color: #e67e22;
}

.act-icon.favorite {
  background: #fde8f0;
  color: #e74c8c;
}

.act-icon.order {
  background: var(--green-bg);
  color: var(--green);
}

.act-body {
  flex: 1;
  min-width: 0;
}

.act-cust {
  font-weight: 600;
  color: var(--text);
}

.act-detail {
  color: var(--sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.act-time {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.act-empty {
  padding: 40px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  padding: 16px 20px 20px;
}

.insight-card {
  background: var(--bg);
  border: 1px solid #ede9e4;
  border-radius: 11px;
  padding: 14px 16px;
}

.insight-card-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.insight-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
  border-bottom: 1px solid #ede9e4;
}

.insight-stat-row:last-child {
  border-bottom: none;
}

.insight-stat-label {
  color: var(--muted);
}

.insight-stat-val {
  font-weight: 600;
  color: var(--text);
}

/* MODALS */
.modal-wrap {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 24, 0.4);
  z-index: 500;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-wrap.open {
  display: flex;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 26px;
  max-width: 460px;
  width: 90%;
  animation: popIn 0.2s ease;
  box-shadow: var(--shadow-lg);
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
  letter-spacing: -0.3px;
}

.form-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 5px;
  margin-top: 12px;
}

.form-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--red);
}

/* Validation styles */
.input-error {
  border-color: #e53e3e !important;
  background: rgba(229, 62, 62, 0.05);
}

.field-error {
  font-size: 11px;
  color: #e53e3e;
  margin-top: 3px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-error::before {
  content: '⚠';
  font-size: 10px;
}

.req-star {
  color: #e53e3e;
  font-size: 12px;
  margin-left: 2px;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}

.form-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--red);
}

.form-checkbox label {
  font-size: 13px;
  color: var(--sub);
  cursor: pointer;
  user-select: none;
}

.opt-label {
  color: var(--faint);
  font-size: 11px;
  font-weight: 400;
  margin-left: 4px;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.img-upload-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.img-preview-box {
  width: 70px;
  height: 70px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  overflow: hidden;
}

.img-preview-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-upload-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.img-upload-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.img-drag-drop {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 24px;
  background: var(--bg);
  cursor: pointer;
  transition: all 0.2s;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-drag-drop:hover {
  border-color: var(--red);
  background: rgba(192, 57, 43, 0.05);
}

.img-drag-drop.active {
  border-color: var(--red);
  background: rgba(192, 57, 43, 0.1);
}

.drag-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drag-icon {
  font-size: 36px;
  line-height: 1;
}

.drag-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drag-text strong {
  color: var(--text);
  font-size: 14px;
}

.drag-text span {
  color: var(--muted);
  font-size: 12px;
}

.file-input-hidden {
  display: none;
}

.upload-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.preview-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}

.preview-actions {
  display: flex;
  gap: 8px;
  flex-direction: column;
}

.btn-change,
.btn-remove {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
}

.btn-change {
  background: var(--border);
  color: var(--text);
}

.btn-change:hover {
  background: #ddd;
}

.btn-remove {
  background: rgba(192, 57, 43, 0.2);
  color: var(--red);
}

.btn-remove:hover {
  background: rgba(192, 57, 43, 0.3);
}

.img-url-input {
  padding: 8px 11px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: var(--bg);
  color: var(--text);
  outline: none;
  width: 100%;
}

.img-url-input:focus {
  border-color: var(--red);
}

.img-hint {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}

.modal-btns {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.modal-btns button {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-mc {
  background: var(--red);
  color: #fff;
}

.btn-mc:hover {
  background: #a93226;
}

.btn-mx {
  background: var(--bg);
  border: 1px solid var(--border) !important;
  color: var(--sub);
}

.btn-mx:hover {
  border-color: var(--red) !important;
  color: var(--red);
}

/* EDIT MODAL */
.edit-modal-wrap {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 24, 0.5);
  z-index: 400;
  align-items: center;
  justify-content: center;
}

.edit-modal-wrap.open {
  display: flex;
}

.edit-modal {
  background: var(--surface);
  border-radius: 16px;
  padding: 28px 28px 20px;
  width: min(480px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
}

.edit-modal h2 {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 18px;
  color: var(--text);
}

.edit-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.edit-field-grid .full {
  grid-column: 1 / -1;
}

.edit-field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 5px;
}

.edit-field input,
.edit-field select {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: var(--bg);
  color: var(--text);
  outline: none;
  transition: border 0.15s;
}

.edit-field input:focus,
.edit-field select:focus {
  border-color: var(--red);
}

.edit-img-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 4px;
}

.edit-img-preview {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  overflow: hidden;
  flex-shrink: 0;
}

.edit-img-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.edit-img-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-img-url {
  width: 100%;
  padding: 8px 11px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: var(--bg);
  color: var(--text);
  outline: none;
}

.edit-img-url:focus {
  border-color: var(--red);
}

.edit-modal-btns {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

.edit-modal-btns .btn-cancel {
  padding: 9px 20px;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  cursor: pointer;
}

.edit-modal-btns .btn-save-edit {
  padding: 9px 22px;
  border: none;
  border-radius: 9px;
  background: var(--red);
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.edit-modal-btns .btn-save-edit:hover {
  background: #a93226;
}

/* TOAST */
.toast {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%) translateY(14px);
  background: var(--text);
  color: #fff;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 13px;
  z-index: 700;
  opacity: 0;
  transition: all 0.3s;
  pointer-events: none;
  box-shadow: var(--shadow-lg);
  white-space: nowrap;
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ========== QUICK ACTIONS BAR ========== */
.ve-quick-actions {
  display: flex;
  gap: 5px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.qa-btn {
  padding: 4px 11px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.qa-btn:hover {
  border-color: var(--red-mid);
  color: var(--red);
  background: var(--red-light);
}

.qa-btn.danger {
  border-color: #f0d49a;
  color: var(--yellow);
  background: var(--yellow-bg);
}

.qa-btn.danger:hover {
  border-color: var(--red);
  color: var(--red);
  background: var(--red-light);
}

.qa-btn.success {
  border-color: #b7dfca;
  color: var(--green);
  background: var(--green-bg);
}

.qa-btn.success:hover {
  border-color: var(--green);
}

/* ========== SUMMARY BAR ========== */
.ve-summary-bar {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 14px;
  padding: 8px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
}

.vs-num {
  font-weight: 600;
  color: var(--text);
}

.vs-num.green {
  color: var(--green);
}

.vs-num.muted {
  color: var(--muted);
}

.vs-sep {
  color: var(--faint);
}

/* ========== CAT VISIBILITY TOGGLE ========== */
.cat-vis-toggle {
  margin-right: 4px;
  flex-shrink: 0;
}

.cat-hidden-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.cat-hidden-block > .ve-cat-head {
  opacity: 0.65;
  background: var(--bg);
}

/* ========== MINI OOS BUTTON ========== */
.mini-oos-btn {
  width: 30px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-family: 'DM Sans', sans-serif;
  font-size: 8px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  text-align: center;
  line-height: 14px;
  padding: 0;
  transition: all 0.15s;
}

.mini-oos-btn.active {
  background: var(--yellow-bg);
  border-color: #f0d49a;
  color: var(--yellow);
}

.mini-oos-btn:hover {
  border-color: var(--red-mid);
  color: var(--red);
}

/* ========== VE ACTIONS — RESET ALL + CLOSE ========== */
.btn-reset-all {
  padding: 7px 13px;
  background: var(--surface);
  border: 1px solid #f0d49a;
  border-radius: 8px;
  color: var(--yellow);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-reset-all:hover {
  border-color: var(--red);
  color: var(--red);
  background: var(--red-light);
}

.btn-close-ve {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.btn-close-ve:hover {
  background: var(--red-light);
  border-color: var(--red-mid);
  color: var(--red);
}

/* ========== TABLET (641px - 1024px) ========== */
@media (max-width: 1024px) and (min-width: 641px) {
  :root {
    --sidebar-w: 200px;
  }

  .cat-bar-title {
    font-size: 16px;
  }

  .catalog-main {
    padding: 16px;
  }

  .admin-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .search-box input {
    width: 130px;
  }

  .nav-tab {
    padding: 4px 10px;
    font-size: 12px;
  }

  .btn-add-prod {
    padding: 7px 14px;
    font-size: 12px;
  }
}

/* ========== MOBILE (320px - 640px) ========== */
@media (max-width: 640px) {
  :root {
    --nav-h: 52px;
    --sidebar-w: 220px;
  }

  /* ===== NAVIGATION ===== */
  .nav-tabs {
    gap: 1px;
    padding: 2px;
    background: var(--bg);
    border-radius: 6px;
    flex-wrap: wrap;
    display: flex !important;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .btn-logout {
    display: none !important;
  }

  .topnav {
    padding: 0 8px;
    gap: 6px;
  }

  .nav-left {
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .nav-right {
    gap: 4px;
  }

  .brand {
    gap: 4px;
    min-width: 0;
  }

  .brand-logo {
    width: 28px;
    height: 28px;
    font-size: 14px;
    flex-shrink: 0;
  }

  .brand-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .brand-name span {
    display: none;
  }

  .admin-pill {
    font-size: 8px;
    padding: 1px 5px;
    flex-shrink: 0;
  }

  .nav-tab {
    padding: 4px 10px;
    font-size: 11px;
    flex-shrink: 0;
  }

  /* ===== SIDEBAR ===== */
  .sidebar {
    position: fixed !important;
    left: 0;
    top: var(--nav-h);
    height: calc(100vh - var(--nav-h));
    width: var(--sidebar-w) !important;
    min-width: 0 !important;
    transform: translateX(calc(-1 * var(--sidebar-w) - 2px));
    z-index: 160;
    box-shadow: none;
    margin-right: calc(-1 * var(--sidebar-w));
    border-right: 1px solid var(--border);
  }

  .sidebar.open-mobile {
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }

  .sidebar-overlay {
    top: 0;
    display: none;
  }

  .sidebar-overlay.open {
    display: block;
  }

  .sb-top {
    padding: 10px 10px 6px;
  }

  .sb-label {
    font-size: 9px;
    margin-bottom: 6px;
  }

  .sb-search {
    padding: 0 8px 10px;
  }

  .sb-search input {
    padding: 8px 10px;
    font-size: 13px;
    min-height: 36px;
  }

  .sb-all {
    padding: 8px 10px;
    font-size: 12px;
    min-height: 40px;
  }

  .sb-super-btn {
    padding: 8px 10px;
    font-size: 12px;
    gap: 8px;
    min-height: 40px;
  }

  .sb-super-btn .s-emoji {
    font-size: 14px;
    width: 18px;
  }

  .sb-super-btn .s-cnt,
  .a-count {
    font-size: 10px;
    padding: 2px 6px;
  }

  .sb-cat {
    padding: 6px 10px 6px 36px;
    font-size: 12px;
    min-height: 40px;
  }

  .sb-special {
    padding: 8px 10px;
    font-size: 12px;
    min-height: 40px;
  }

  /* ===== MAIN CONTENT ===== */
  .catalog-wrap {
    overflow-x: hidden;
    width: 100%;
    max-width: 100vw;
  }

  .catalog-main {
    padding: 12px;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
    box-sizing: border-box;
    flex: 1;
  }

  .cat-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 14px;
  }

  .cat-bar-title {
    font-size: 16px;
    font-weight: 600;
    flex: none;
  }

  .search-box {
    width: 100%;
    font-size: 13px;
    padding: 8px 12px;
    min-height: 40px;
  }

  .search-box input {
    width: 100%;
    font-size: 13px;
    min-height: 40px;
  }

  .btn-add-prod {
    width: 100%;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 600;
    min-height: 44px;
  }

  .cat-section {
    margin-bottom: 22px;
  }

  .cat-section-hdr {
    font-size: 11px;
    margin-bottom: 10px;
  }

  .cat-count-badge {
    font-size: 9px;
    padding: 2px 6px;
  }

  /* ===== PRODUCT GRID — HORIZONTAL CARDS ===== */
  .admin-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .admin-card {
    display: flex;
    flex-direction: column;
    padding: 12px;
    border-radius: 8px;
    align-items: center;
    gap: 10px;
    position: relative;
    text-align: center;
  }

  .admin-card.hidden-prod {
    opacity: 0.6;
  }

  .card-badges {
    position: absolute;
    top: 8px;
    right: 8px;
    gap: 4px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .badge {
    padding: 2px 6px;
    font-size: 8px;
  }

  .card-img {
    width: 160px;
    height: 160px;
    min-width: 160px;
    flex-shrink: 0;
    margin: 0;
    border-radius: 6px;
  }

  .card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 0;
    width: 100%;
  }

  .card-name {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--text);
    word-break: break-word;
    margin: 0;
  }

  .card-meta {
    font-size: 10px;
    color: var(--muted);
    margin: 0;
    line-height: 1.2;
  }

  .card-sku {
    font-size: 9px;
    color: var(--faint);
    font-family: monospace;
    margin: 0;
  }

  .card-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    width: 100%;
    margin-top: 6px;
  }

  .ca-btn {
    padding: 6px 8px;
    min-width: 0;
    min-height: 36px;
    font-size: 11px;
    border-radius: 6px;
  }

  /* ===== MODALS ===== */
  .modal-wrap {
    padding: 12px;
    align-items: flex-end;
  }

  .modal {
    max-width: 100%;
    width: 100%;
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal h2 {
    font-size: 16px;
    margin-bottom: 16px;
  }

  .form-label {
    font-size: 11px;
    margin-top: 12px;
    margin-bottom: 6px;
  }

  .form-input {
    padding: 12px;
    font-size: 16px;
    min-height: 44px;
  }

  .img-upload-row {
    flex-direction: column;
    gap: 12px;
  }

  .img-preview-box {
    width: 80px;
    height: 80px;
  }

  .img-upload-controls {
    width: 100%;
  }

  .img-url-input {
    padding: 10px;
    font-size: 13px;
  }

  /* ===== CUSTOMER VIEWS ===== */
  .views-layout {
    flex-direction: column;
  }

  .customer-list {
    width: 100%;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid var(--border);
    max-height: 140px;
    height: auto;
    position: static;
  }

  .customer-list.mobile-collapsed {
    max-height: 50px;
  }

  .clist-head {
    padding: 12px 14px;
  }

  .clist-title {
    font-size: 14px;
  }

  .btn-add-cust {
    padding: 4px 10px;
    font-size: 11px;
  }

  .clist-search {
    padding: 8px 12px;
  }

  .customer-rows {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .cust-row {
    padding: 10px 12px;
    min-width: 120px;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }

  .c-avatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .c-name {
    font-size: 11px;
    line-height: 1.2;
  }

  .c-email {
    font-size: 9px;
  }

  /* ===== ORDERS PAGE ===== */
  .orders-main {
    padding: 12px;
  }

  .order-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }

  .order-stat-card {
    padding: 12px;
  }

  .order-stat-label {
    font-size: 11px;
  }

  .order-stat-num {
    font-size: 18px;
  }

  .ot-head {
    display: none;
  }

  .ot-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px 0;
    border-left: 3px solid var(--border);
    padding-left: 12px;
  }

  .ot-cell {
    padding: 4px 0;
    font-size: 11px;
  }

  .ot-cell::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--muted);
    display: block;
    font-size: 9px;
    margin-bottom: 2px;
  }

  .ot-id {
    font-size: 12px;
  }

  /* ===== SETTINGS PAGE ===== */
  .settings-main {
    padding: 12px;
    max-width: 100%;
  }

  .settings-section {
    border-radius: 10px;
    margin-bottom: 16px;
  }

  .settings-section-title {
    font-size: 13px;
    padding: 14px 16px;
  }

  .settings-row {
    gap: 16px;
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-row-label {
    font-size: 13px;
  }

  .toggle-sw {
    align-self: flex-end;
  }

  .settings-activity-bar {
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
  }

  .settings-filter-sel,
  .settings-clear-btn {
    width: 100%;
    min-height: 40px;
    font-size: 12px;
  }

  .settings-clear-btn {
    margin-left: 0;
  }

  /* ===== INSIGHT CARDS ===== */
  .insight-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .insight-card {
    padding: 12px;
  }

  /* ===== TOUCH-FRIENDLY TARGETS ===== */
  button {
    min-height: 44px;
    min-width: 44px;
  }

  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  input[type="url"],
  select,
  textarea {
    min-height: 44px;
    font-size: 16px; /* Prevents zoom on iOS */
    padding: 10px 12px !important;
  }

  /* ===== LANDSCAPE MOBILE (480px - 640px) ===== */
  @media (min-width: 481px) and (max-width: 640px) {
    .admin-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .admin-card {
      flex-direction: column;
      padding: 10px;
    }

    .card-img {
      width: 100%;
      height: 240px;
      margin: 0 0 8px 0;
    }

    .card-info {
      padding-right: 0;
    }

    .card-actions {
      grid-template-columns: 1fr;
    }

    .order-stats {
      grid-template-columns: repeat(4, 1fr);
    }

    .customer-rows {
      max-height: 200px;
    }
  }

  /* ===== SMALL PHONE (320px - 375px) ===== */
  @media (max-width: 375px) {
    .brand-name {
      font-size: 12px;
    }

    .admin-pill {
      font-size: 7px;
      padding: 1px 4px;
    }

    .nav-tab {
      padding: 3px 8px;
      font-size: 10px;
    }

    .cat-bar-title {
      font-size: 14px;
    }

    .search-box input {
      font-size: 12px;
    }

    .btn-add-prod {
      padding: 10px 12px;
      font-size: 12px;
    }

    .admin-card {
      padding: 10px;
      gap: 8px;
    }

    .card-img {
      width: 60px;
      height: 60px;
    }

    .card-name {
      font-size: 12px;
    }

    .card-actions {
      gap: 4px;
    }

    .ca-btn {
      font-size: 10px;
      padding: 5px 6px;
    }

    .modal {
      padding: 16px;
    }

    .modal h2 {
      font-size: 15px;
    }

    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="number"],
    select,
    textarea {
      font-size: 15px;
    }
  }
}

/* ========== PHASE 3: EMPTY STATES ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  text-align: center;
  border-top: 1px dashed var(--border);
}

.empty-state-icon { font-size: 36px; margin-bottom: 4px; opacity: 0.5; }
.empty-state-title { font-size: 15px; font-weight: 600; color: var(--text); }
.empty-state-sub { font-size: 13px; color: var(--muted); }

/* ========== PHASE 3: FILTER PILLS ========== */
.filter-pills-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.filter-pills-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.filter-pills-sep {
  color: var(--border);
  font-size: 14px;
  margin: 0 2px;
}

.filter-pill {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.filter-pill:hover:not(.active) {
  border-color: var(--red-mid);
  color: var(--text);
}

.filter-pill.active {
  background: var(--red);
  border-color: var(--red);
  color: #fff;
  font-weight: 600;
}

.filter-pill.sc-pill.active {
  background: #2d7a4f;
  border-color: #2d7a4f;
}

/* ========== PHASE 3: BULK ACTION BAR ========== */
.bulk-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff8e8;
  border-bottom: 2px solid #f0d49a;
  position: sticky;
  top: 0;
  z-index: 100;
}

.bulk-count {
  font-size: 13px;
  font-weight: 600;
  color: #a05c00;
  margin-right: 4px;
}

.bulk-btn {
  padding: 5px 14px;
  border-radius: 8px;
  border: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.bulk-show { background: #edf6f1; color: #2d7a4f; border: 1px solid #b7dfca; }
.bulk-show:hover { background: #d5eee3; }
.bulk-hide { background: var(--red-light); color: var(--red); border: 1px solid var(--red-mid); }
.bulk-hide:hover { background: #f5d0ca; }
.bulk-delete { background: #fdf0ef; color: #c0392b; border: 1px solid #f0c5c0; }
.bulk-delete:hover { background: #f9dedd; }
.bulk-clear { background: var(--bg); color: var(--muted); border: 1px solid var(--border); margin-left: auto; }
.bulk-clear:hover { color: var(--text); }

/* ========== PHASE 3: LOADING SPINNER ========== */
.catalog-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 80px 20px;
  color: var(--muted);
  font-size: 14px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== PHASE 3: NO RESULTS ========== */
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 20px;
  text-align: center;
}

.no-results-icon { font-size: 40px; margin-bottom: 4px; }
.no-results-title { font-size: 18px; font-weight: 700; color: var(--text); }
.no-results-sub { font-size: 14px; color: var(--muted); }

.btn-clear-filters {
  margin-top: 12px;
  padding: 8px 20px;
  background: var(--red);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-clear-filters:hover { background: #a93226; }

/* ========== PHASE 3: PAGINATION ========== */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 13px;
  color: var(--sub);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.pg-btn {
  min-width: 32px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
}

.pg-btn:hover:not(:disabled):not(.active) {
  border-color: var(--red-mid);
  color: var(--text);
}

.pg-btn.active {
  background: var(--red);
  border-color: var(--red);
  color: #fff;
  font-weight: 600;
}

.pg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pg-ellipsis {
  padding: 0 4px;
  color: var(--muted);
}

.pg-jump {
  width: 70px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: var(--text);
  background: var(--bg);
  margin-left: 4px;
}

/* ========== PHASE 3: CATEGORY SELECT ALL ========== */
.cat-select-all {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin-right: 4px;
}

.cat-select-all input[type="checkbox"] {
  cursor: pointer;
  accent-color: var(--red);
  width: 14px;
  height: 14px;
}

.cat-bulk-btn {
  margin-left: 6px;
  padding: 2px 9px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
}

.cat-bulk-btn:hover {
  border-color: var(--red-mid);
  color: var(--text);
}

/* ========== PHASE 3: CARD SELECTION ========== */
.card-select-check {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  cursor: pointer;
}

.card-select-check input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--red);
}

.admin-card {
  position: relative;
}

.admin-card.selected-prod {
  outline: 2px solid var(--red);
  outline-offset: -2px;
  background: var(--red-light) !important;
}

/* ========== PHASE 3: BULK CONFIRM MODAL ========== */
.bulk-confirm-box {
  max-width: 420px;
  padding: 28px 32px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
}

.bulk-confirm-desc {
  font-size: 14px;
  color: var(--sub);
  line-height: 1.6;
  margin: 12px 0 24px;
}

.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary { background: var(--red); color: #fff; }
.btn-primary:hover { background: #a93226; }
.btn-danger { background: #c0392b; color: #fff; }
.btn-danger:hover { background: #a93226; }

/* ========== PHASE 3: ERROR TOAST ========== */
.error-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #2d2d2d;
  color: #fff;
  border-radius: 10px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 800;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  max-width: 480px;
  min-width: 280px;
}

.error-toast-msg {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.error-toast-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.error-retry-btn {
  padding: 4px 12px;
  background: var(--red);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.error-retry-btn:hover { background: #a93226; }

.error-dismiss-btn {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
}

.error-dismiss-btn:hover { color: #fff; }

/* ========== PHASE 3: SLIDE TRANSITIONS ========== */
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.25s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateX(-50%) translateY(30px);
  opacity: 0;
}

/* ── Categories Management Page ── */
.categories-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.cat-manage-header {
  text-align: center;
  margin-bottom: 12px;
}

.cat-manage-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text);
}

.cat-manage-desc {
  font-size: 13px;
  color: var(--muted);
}

.cat-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.cat-list-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-secondary, rgba(255,255,255,0.02));
  border-radius: 10px;
  padding: 12px;
  border: 1px solid var(--border);
}

.cat-drag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: grab;
  transition: all 0.15s;
}

.cat-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--text);
}

.cat-item.sortable-ghost {
  opacity: 0.5;
  background: rgba(255, 255, 255, 0.08);
}

.cat-drag-handle {
  color: var(--muted);
  font-size: 14px;
  cursor: grab;
  flex-shrink: 0;
  user-select: none;
}

.cat-drag-handle:active {
  cursor: grabbing;
}

.cat-item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.cat-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.cat-item-order {
  font-size: 11px;
  color: var(--muted);
}

.cat-item-prod-count {
  font-size: 12px;
  color: var(--sub);
  background: var(--bg-secondary, rgba(255,255,255,0.05));
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.cat-super-item {
  background: var(--bg);
  border: 2px solid var(--border);
}

.cat-super-item:hover {
  border-color: #c0392b;
}

.cat-manage-footer {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.cat-manage-status {
  font-size: 13px;
  color: #27ae60;
  padding: 8px 16px;
  background: rgba(39, 174, 96, 0.1);
  border-radius: 20px;
  border: 1px solid rgba(39, 174, 96, 0.3);
  animation: fade-in 0.3s;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .categories-main {
    padding: 12px;
  }

  .cat-manage-header h1 {
    font-size: 20px;
  }

  .cat-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .cat-item-prod-count {
    width: 100%;
    text-align: right;
  }
}
</style>

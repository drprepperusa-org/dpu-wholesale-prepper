<template>
  <div class="bulk-edit-wrap">
    <!-- Header & Controls -->
    <div class="be-header">
      <div class="be-header-left">
        <h2>Bulk Edit Products</h2>
        <span class="be-subtitle">Edit prices, categories, and visibility across all products</span>
      </div>
      <div class="be-customer-selector">
        <label>View as:</label>
        <select v-model="selectedMode" @change="onModeChange" class="be-select">
          <option value="all">All Customers (defaults)</option>
          <option v-for="c in customers" :key="c.id" :value="`customer:${c.id}`">
            {{ c.company_name }}
          </option>
        </select>
        <span v-if="selectedCustomerId" class="be-info">
          This customer sees {{ visibleProductCount }} of {{ totalProducts }} products
        </span>
      </div>
    </div>

    <!-- Filter & Search -->
    <div class="be-toolbar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search SKU, name, category..."
        class="be-search"
        @input="filterProducts"
      >
      <span class="be-result-count">{{ filteredProducts.length }} products</span>
    </div>

    <!-- Bulk Action Bar -->
    <transition name="slide-down">
      <div class="be-bulk-bar" v-if="selectedRows.size > 0">
        <span class="be-bulk-count">{{ selectedRows.size }} selected</span>
        <button @click="openBulkPriceModal" class="be-bulk-btn be-bulk-price">💰 Set Price</button>
        <button @click="openBulkCategoryModal" class="be-bulk-btn be-bulk-cat">📂 Set Category</button>
        <button @click="toggleVisibilityForSelected" class="be-bulk-btn be-bulk-hide">
          {{ selectedCustomerId ? '🚫 Hide for Customer' : '🚫 Hide' }}
        </button>
        <button @click="clearOverridesForSelected" v-if="selectedCustomerId" class="be-bulk-btn be-bulk-clear">✕ Clear Overrides</button>
        <button @click="selectedRows.clear()" class="be-bulk-btn be-bulk-deselect">Deselect</button>
      </div>
    </transition>

    <!-- Loading -->
    <div class="be-loading" v-if="isLoading">
      <div class="loading-spinner"></div>
      Loading products...
    </div>

    <!-- Table -->
    <div class="be-table-wrap" v-if="!isLoading">
      <table class="be-table">
        <thead>
          <tr>
            <th class="be-col-checkbox">
              <input type="checkbox" @change="toggleSelectAll" :checked="selectedRows.size === filteredProducts.length && filteredProducts.length > 0">
            </th>
            <th class="be-col-sku">SKU</th>
            <th class="be-col-name">Name</th>
            <th class="be-col-price">Price</th>
            <th class="be-col-super">Super Category</th>
            <th class="be-col-cat">Category</th>
            <th class="be-col-hidden">Hidden</th>
            <th class="be-col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="prod in filteredProducts" :key="prod.id" class="be-row" :class="{ selected: selectedRows.has(prod.id) }">
            <!-- Checkbox -->
            <td class="be-col-checkbox">
              <input type="checkbox" :checked="selectedRows.has(prod.id)" @change="(e) => {
                if (e.target.checked) selectedRows.add(prod.id);
                else selectedRows.delete(prod.id);
                updateRowSelection();
              }">
            </td>

            <!-- SKU -->
            <td class="be-col-sku">
              <code>{{ prod.sku || '—' }}</code>
            </td>

            <!-- Name -->
            <td class="be-col-name">
              {{ prod.name }}
            </td>

            <!-- Price -->
            <td class="be-col-price">
              <div class="be-price-cell" :class="{ 'has-override': hasOverride(prod.id, 'price') }">
                <input
                  v-model="editingPrices[prod.id]"
                  type="number"
                  step="0.01"
                  class="be-price-input"
                  @change="savePriceChange(prod, editingPrices[prod.id])"
                  :placeholder="prod.price"
                  :title="hasOverride(prod.id, 'price') ? 'Customer override' : 'Default price'"
                >
                <span v-if="hasOverride(prod.id, 'price')" class="be-badge">🔸</span>
              </div>
            </td>

            <!-- Super Category -->
            <td class="be-col-super">
              <select
                v-model="editingSuper[prod.id]"
                class="be-select-inline"
                @change="saveSuperCatChange(prod, editingSuper[prod.id])"
              >
                <option :value="prod.super_category_id">{{ prod.super_category }}</option>
              </select>
            </td>

            <!-- Category -->
            <td class="be-col-cat">
              <select
                v-model="editingCats[prod.id]"
                class="be-select-inline"
                @change="saveCatChange(prod, editingCats[prod.id])"
              >
                <option :value="prod.category_id">{{ prod.category }}</option>
              </select>
            </td>

            <!-- Hidden -->
            <td class="be-col-hidden">
              <div class="be-hidden-cell" :class="{ 'has-override': hasOverride(prod.id, 'hidden') }">
                <input
                  type="checkbox"
                  v-model="editingHidden[prod.id]"
                  @change="saveHiddenChange(prod, editingHidden[prod.id])"
                  :title="hasOverride(prod.id, 'hidden') ? 'Customer override' : 'Default visibility'"
                >
                <span v-if="hasOverride(prod.id, 'hidden')" class="be-badge">🔸</span>
              </div>
            </td>

            <!-- Actions -->
            <td class="be-col-actions">
              <button v-if="selectedCustomerId && (hasOverride(prod.id, 'price') || hasOverride(prod.id, 'hidden'))" @click="clearOverride(prod.id)" class="be-action-btn be-clear-override" title="Clear customer overrides">✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredProducts.length === 0" class="be-no-results">
        <div class="be-no-results-icon">🔍</div>
        <div class="be-no-results-text">No products found</div>
      </div>
    </div>

    <!-- Bulk Price Modal -->
    <transition name="modal-fade">
      <div v-if="showBulkPriceModal" class="be-modal-overlay" @click.self="showBulkPriceModal = false">
        <div class="be-modal">
          <div class="be-modal-header">
            <h3>Set Price for {{ selectedRows.size }} Products</h3>
            <button @click="showBulkPriceModal = false" class="be-modal-close">✕</button>
          </div>
          <div class="be-modal-body">
            <label>Price:</label>
            <input v-model="bulkPrice" type="number" step="0.01" class="be-modal-input" placeholder="Enter price">
            <p class="be-modal-note">Leave blank to skip price changes</p>
          </div>
          <div class="be-modal-actions">
            <button @click="showBulkPriceModal = false" class="be-btn be-btn-secondary">Cancel</button>
            <button @click="applyBulkPrice" class="be-btn be-btn-primary" :disabled="!bulkPrice || bulkPrice <= 0">Apply to {{ selectedRows.size }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Bulk Category Modal -->
    <transition name="modal-fade">
      <div v-if="showBulkCategoryModal" class="be-modal-overlay" @click.self="showBulkCategoryModal = false">
        <div class="be-modal">
          <div class="be-modal-header">
            <h3>Set Category for {{ selectedRows.size }} Products</h3>
            <button @click="showBulkCategoryModal = false" class="be-modal-close">✕</button>
          </div>
          <div class="be-modal-body">
            <label>Super Category:</label>
            <select v-model="bulkSuperCat" class="be-modal-select">
              <option value="">— Select —</option>
              <option v-for="sc in superCategories" :key="sc.id" :value="sc.id">{{ sc.name }}</option>
            </select>
            <label>Category:</label>
            <select v-model="bulkCat" class="be-modal-select" :disabled="!bulkSuperCat">
              <option value="">— Select —</option>
              <option v-for="c in availableCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <p class="be-modal-note">Leave blank to skip category changes</p>
          </div>
          <div class="be-modal-actions">
            <button @click="showBulkCategoryModal = false" class="be-btn be-btn-secondary">Cancel</button>
            <button @click="applyBulkCategory" class="be-btn be-btn-primary" :disabled="!bulkCat">Apply to {{ selectedRows.size }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="slide-up">
      <div v-if="toastMessage" class="be-toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'BulkEditView',
  props: {
    initialCustomers: Array,
    initialProducts: Array,
    superCategories: Array
  },
  emits: ['load-products'],
  data() {
    return {
      selectedMode: 'all',
      selectedCustomerId: null,
      customers: [],
      products: [],
      filteredProducts: [],
      superCategories: [],

      searchQuery: '',
      selectedRows: new Set(),
      editingPrices: {},
      editingSuper: {},
      editingCats: {},
      editingHidden: {},
      overrides: {}, // { productId: { price, hidden } }

      isLoading: false,
      showBulkPriceModal: false,
      showBulkCategoryModal: false,
      bulkPrice: '',
      bulkSuperCat: '',
      bulkCat: '',

      toastMessage: '',
      toastType: 'success'
    }
  },
  computed: {
    totalProducts() {
      return this.products.length;
    },
    visibleProductCount() {
      if (!this.selectedCustomerId) return this.totalProducts;
      return this.products.filter(p => {
        if (p.is_hidden) return false;
        const override = this.overrides[p.id];
        if (override?.is_hidden) return false;
        return true;
      }).length;
    },
    availableCategories() {
      if (!this.bulkSuperCat) return [];
      return this.superCategories
        .find(sc => sc.id == this.bulkSuperCat)?.categories || [];
    }
  },
  methods: {
    async onModeChange() {
      this.selectedRows.clear();
      if (this.selectedMode === 'all') {
        this.selectedCustomerId = null;
        this.overrides = {};
      } else {
        this.selectedCustomerId = this.selectedMode.split(':')[1];
        await this.loadOverridesForCustomer();
      }
      this.filterProducts();
    },
    async loadOverridesForCustomer() {
      if (!this.selectedCustomerId) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/customers/${this.selectedCustomerId}/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load customer products');
        const data = await response.json();
        // Response should include override info
        this.overrides = {};
        data.forEach(prod => {
          if (prod.override_price !== null || prod.override_is_hidden) {
            this.overrides[prod.id] = {
              price: prod.override_price,
              hidden: prod.override_is_hidden
            };
          }
        });
      } catch (e) {
        console.error('Error loading overrides:', e);
        this.showToast('Failed to load customer overrides', 'error');
      }
    },
    filterProducts() {
      let filtered = this.products;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.super_category.toLowerCase().includes(q)
        );
      }
      this.filteredProducts = filtered;
    },
    toggleSelectAll(e) {
      if (e.target.checked) {
        this.filteredProducts.forEach(p => this.selectedRows.add(p.id));
      } else {
        this.selectedRows.clear();
      }
    },
    updateRowSelection() {
      // Force reactivity
      this.selectedRows = new Set(this.selectedRows);
    },
    hasOverride(productId, type) {
      if (!this.selectedCustomerId) return false;
      const override = this.overrides[productId];
      if (!override) return false;
      if (type === 'price') return override.price !== null;
      if (type === 'hidden') return override.hidden;
      return false;
    },
    async savePriceChange(prod, newPrice) {
      if (this.selectedMode === 'all') {
        // Edit default price
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/admin/products/bulk`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ids: [prod.id],
              price: parseFloat(newPrice)
            })
          });
          if (!response.ok) throw new Error('Failed to update price');
          prod.price = parseFloat(newPrice);
          this.showToast(`✅ Price updated to $${newPrice}`, 'success');
        } catch (e) {
          console.error('Error saving price:', e);
          this.showToast('Failed to save price', 'error');
        }
      } else {
        // Set customer override
        await this.setOverride(prod.id, { override_price: parseFloat(newPrice) });
      }
    },
    async saveCatChange(prod, newCatId) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/products/bulk`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids: [prod.id],
            category_id: newCatId
          })
        });
        if (!response.ok) throw new Error('Failed to update category');
        const newCat = this.superCategories
          .flatMap(sc => sc.categories)
          .find(c => c.id == newCatId);
        prod.category_id = newCatId;
        prod.category = newCat?.name || prod.category;
        this.showToast('✅ Category updated', 'success');
      } catch (e) {
        console.error('Error saving category:', e);
        this.showToast('Failed to save category', 'error');
      }
    },
    async saveSuperCatChange(prod, newSuperCatId) {
      // Similar to saveCatChange but for super category
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/products/bulk`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids: [prod.id],
            super_category_id: newSuperCatId
          })
        });
        if (!response.ok) throw new Error('Failed to update super category');
        const newSuperCat = this.superCategories.find(sc => sc.id == newSuperCatId);
        prod.super_category_id = newSuperCatId;
        prod.super_category = newSuperCat?.name || prod.super_category;
        this.showToast('✅ Super Category updated', 'success');
      } catch (e) {
        console.error('Error saving super category:', e);
        this.showToast('Failed to save super category', 'error');
      }
    },
    async saveHiddenChange(prod, isHidden) {
      if (this.selectedMode === 'all') {
        // Edit default visibility
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/admin/products/bulk`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ids: [prod.id],
              is_hidden: isHidden
            })
          });
          if (!response.ok) throw new Error('Failed to update visibility');
          prod.is_hidden = isHidden;
          this.showToast(`✅ Product ${isHidden ? 'hidden' : 'shown'}`, 'success');
        } catch (e) {
          console.error('Error saving visibility:', e);
          this.showToast('Failed to save visibility', 'error');
        }
      } else {
        // Set customer override
        await this.setOverride(prod.id, { is_hidden: isHidden });
      }
    },
    async setOverride(productId, data) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/products/${productId}/override`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customer_id: this.selectedCustomerId,
            ...data
          })
        });
        if (!response.ok) throw new Error('Failed to set override');
        const result = await response.json();
        this.overrides[productId] = result.override || {};
        this.showToast('✅ Override saved', 'success');
      } catch (e) {
        console.error('Error setting override:', e);
        this.showToast('Failed to save override', 'error');
      }
    },
    openBulkPriceModal() {
      this.bulkPrice = '';
      this.showBulkPriceModal = true;
    },
    openBulkCategoryModal() {
      this.bulkSuperCat = '';
      this.bulkCat = '';
      this.showBulkCategoryModal = true;
    },
    async applyBulkPrice() {
      const ids = Array.from(this.selectedRows);
      try {
        const token = localStorage.getItem('token');
        const endpoint = this.selectedMode === 'all'
          ? '/api/admin/products/bulk'
          : '/api/admin/products/bulk-override';
        const body = this.selectedMode === 'all'
          ? { ids, price: parseFloat(this.bulkPrice) }
          : { product_ids: ids, customer_id: this.selectedCustomerId, override_price: parseFloat(this.bulkPrice) };

        const response = await fetch(endpoint, {
          method: this.selectedMode === 'all' ? 'PATCH' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Failed to apply bulk price');
        this.showToast(`✅ Applied to ${ids.length} products`, 'success');
        this.selectedRows.clear();
        this.showBulkPriceModal = false;
        this.bulkPrice = '';
      } catch (e) {
        console.error('Error applying bulk price:', e);
        this.showToast('Failed to apply bulk price', 'error');
      }
    },
    async applyBulkCategory() {
      const ids = Array.from(this.selectedRows);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/products/bulk', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids,
            super_category_id: parseInt(this.bulkSuperCat),
            category_id: parseInt(this.bulkCat)
          })
        });
        if (!response.ok) throw new Error('Failed to apply bulk category');
        this.showToast(`✅ Applied to ${ids.length} products`, 'success');
        this.selectedRows.clear();
        this.showBulkCategoryModal = false;
      } catch (e) {
        console.error('Error applying bulk category:', e);
        this.showToast('Failed to apply bulk category', 'error');
      }
    },
    async toggleVisibilityForSelected() {
      const ids = Array.from(this.selectedRows);
      const isHidden = !this.products.find(p => ids.includes(p.id))?.is_hidden;
      try {
        const token = localStorage.getItem('token');
        if (this.selectedMode === 'all') {
          const response = await fetch('/api/admin/products/bulk', {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids, is_hidden: isHidden })
          });
          if (!response.ok) throw new Error('Failed to toggle visibility');
          ids.forEach(id => {
            const prod = this.products.find(p => p.id === id);
            if (prod) prod.is_hidden = isHidden;
          });
        } else {
          const response = await fetch('/api/admin/products/bulk-override', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              product_ids: ids,
              customer_id: this.selectedCustomerId,
              is_hidden: !isHidden
            })
          });
          if (!response.ok) throw new Error('Failed to toggle customer visibility');
          ids.forEach(id => {
            if (!this.overrides[id]) this.overrides[id] = {};
            this.overrides[id].hidden = !isHidden;
          });
        }
        this.showToast(`✅ Toggled visibility for ${ids.length} products`, 'success');
        this.selectedRows.clear();
      } catch (e) {
        console.error('Error toggling visibility:', e);
        this.showToast('Failed to toggle visibility', 'error');
      }
    },
    async clearOverridesForSelected() {
      const ids = Array.from(this.selectedRows);
      try {
        const token = localStorage.getItem('token');
        for (const id of ids) {
          await fetch(`/api/admin/products/${id}/override/${this.selectedCustomerId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
        ids.forEach(id => {
          delete this.overrides[id];
          delete this.editingPrices[id];
          delete this.editingHidden[id];
        });
        this.showToast(`✅ Cleared overrides for ${ids.length} products`, 'success');
        this.selectedRows.clear();
      } catch (e) {
        console.error('Error clearing overrides:', e);
        this.showToast('Failed to clear overrides', 'error');
      }
    },
    async clearOverride(productId) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/products/${productId}/override/${this.selectedCustomerId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        delete this.overrides[productId];
        delete this.editingPrices[productId];
        delete this.editingHidden[productId];
        this.showToast('✅ Override cleared', 'success');
      } catch (e) {
        console.error('Error clearing override:', e);
        this.showToast('Failed to clear override', 'error');
      }
    },
    showToast(msg, type = 'success') {
      this.toastMessage = msg;
      this.toastType = type;
      setTimeout(() => { this.toastMessage = ''; }, 3000);
    }
  },
  watch: {
    initialProducts(newVal) {
      this.products = JSON.parse(JSON.stringify(newVal));
      this.products.forEach(p => {
        this.editingPrices[p.id] = p.price;
        this.editingSuper[p.id] = p.super_category_id;
        this.editingCats[p.id] = p.category_id;
        this.editingHidden[p.id] = p.is_hidden;
      });
      this.filterProducts();
    },
    initialCustomers(newVal) {
      this.customers = newVal;
    },
    superCategories(newVal) {
      this.superCategories = newVal;
    }
  },
  mounted() {
    if (this.initialProducts?.length) {
      this.products = JSON.parse(JSON.stringify(this.initialProducts));
      this.products.forEach(p => {
        this.editingPrices[p.id] = p.price;
        this.editingSuper[p.id] = p.super_category_id;
        this.editingCats[p.id] = p.category_id;
        this.editingHidden[p.id] = p.is_hidden;
      });
      this.filterProducts();
    }
    this.customers = this.initialCustomers || [];
  }
}
</script>

<style scoped>
.bulk-edit-wrap {
  padding: 20px;
  background: var(--bg);
  overflow-y: auto;
  flex: 1;
}

.be-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  gap: 20px;
}

.be-header-left h2 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: var(--text);
}

.be-subtitle {
  color: var(--muted);
  font-size: 14px;
}

.be-customer-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  min-width: 250px;
}

.be-customer-selector label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.be-select {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: white;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
}

.be-info {
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}

.be-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.be-search {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
}

.be-result-count {
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}

.be-bulk-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  background: var(--red-light);
  border: 1px solid var(--red-mid);
  border-radius: 8px;
  margin-bottom: 16px;
  animation: slideDown 0.2s ease;
}

.be-bulk-count {
  font-weight: 600;
  color: var(--red);
  margin-right: 12px;
}

.be-bulk-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: white;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.be-bulk-btn:hover {
  background: var(--red);
  color: white;
}

.be-bulk-deselect {
  margin-left: auto;
}

.be-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: var(--muted);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.be-table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
}

.be-table {
  width: 100%;
  border-collapse: collapse;
}

.be-table thead {
  background: var(--bg);
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
}

.be-table th {
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.be-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.be-table tbody tr:hover {
  background: #fafaf8;
}

.be-table tbody tr.selected {
  background: var(--red-light);
}

.be-table td {
  padding: 12px;
  font-size: 13px;
  color: var(--text);
}

.be-col-checkbox {
  width: 40px;
}

.be-col-sku {
  width: 80px;
}

.be-col-sku code {
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.be-col-name {
  min-width: 150px;
}

.be-col-price {
  width: 110px;
}

.be-col-super {
  width: 100px;
}

.be-col-cat {
  width: 100px;
}

.be-col-hidden {
  width: 80px;
}

.be-col-actions {
  width: 50px;
}

.be-price-cell {
  display: flex;
  gap: 6px;
  align-items: center;
}

.be-price-cell.has-override {
  background: var(--red-light);
  padding: 4px;
  border-radius: 4px;
}

.be-price-input {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
}

.be-price-input:focus {
  outline: none;
  border-color: var(--red);
  box-shadow: 0 0 0 2px rgba(192, 57, 43, 0.1);
}

.be-select-inline {
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.be-select-inline:focus {
  outline: none;
  border-color: var(--red);
}

.be-hidden-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.be-hidden-cell.has-override {
  background: var(--red-light);
  padding: 4px;
  border-radius: 4px;
}

.be-badge {
  font-size: 11px;
  color: var(--red);
}

.be-action-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.2s;
}

.be-action-btn:hover {
  background: var(--border);
  color: var(--red);
}

.be-clear-override {
  color: var(--red);
}

.be-no-results {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
}

.be-no-results-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.be-no-results-text {
  font-size: 16px;
  margin-bottom: 5px;
}

/* MODALS */
.be-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.be-modal {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
}

.be-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.be-modal-header h3 {
  margin: 0;
  color: var(--text);
  font-size: 16px;
}

.be-modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--muted);
}

.be-modal-body {
  padding: 16px;
}

.be-modal-body label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.be-modal-input,
.be-modal-select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
}

.be-modal-note {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}

.be-modal-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  justify-content: flex-end;
}

.be-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.be-btn-primary {
  background: var(--red);
  color: white;
}

.be-btn-primary:hover:not(:disabled) {
  background: #a83526;
}

.be-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.be-btn-secondary {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.be-btn-secondary:hover {
  background: var(--border);
}

/* TOAST */
.be-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background: #4CAF50;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
  z-index: 2000;
}

.be-toast.error {
  background: var(--red);
}

/* TRANSITIONS */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

:root {
  --bg: #f5f4f0;
  --surface: #fff;
  --border: #e2ddd8;
  --red: #c0392b;
  --red-light: #f9eeec;
  --red-mid: #e8c5c0;
  --text: #1a1a18;
  --muted: #9a948c;
  --radius: 10px;
}
</style>

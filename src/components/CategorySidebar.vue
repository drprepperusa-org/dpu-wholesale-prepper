<template>
  <div class="category-sidebar">
    <div class="sidebar-header">
      <h2>Categories</h2>
      <button v-if="hierarchyLoaded" @click="expandAll" class="btn-expand-all" title="Expand all">
        <span>{{ allExpanded ? '↕' : '↕' }}</span>
      </button>
    </div>

    <div v-if="loading" class="sidebar-loading">
      <span class="spinner"></span>
      Loading categories...
    </div>

    <div v-else-if="error" class="sidebar-error">
      <p>⚠️ Error loading categories</p>
      <small>{{ error }}</small>
    </div>

    <ul v-else class="category-list">
      <li v-for="superCat in hierarchy" :key="superCat.id" class="super-category-item">
        <div class="super-category-header" @click="toggleSuper(superCat.id)">
          <span class="expand-icon" :class="{ expanded: expandedSupers.has(superCat.id) }">
            ▶
          </span>
          <span class="emoji">{{ superCat.emoji }}</span>
          <span class="name">{{ superCat.name }}</span>
          <span class="count">({{ superCat.totalProducts }})</span>
        </div>

        <ul
          v-show="expandedSupers.has(superCat.id)"
          class="sub-categories"
          :class="{ visible: expandedSupers.has(superCat.id) }"
        >
          <li
            v-for="subCat in superCat.categories"
            :key="subCat.id"
            class="sub-category-item"
            @click="selectCategory(subCat)"
          >
            <span class="subcategory-name">{{ subCat.name }}</span>
            <span class="sub-product-count">{{ subCat.productCount }}</span>
          </li>
        </ul>
      </li>
    </ul>

    <div v-if="hierarchyLoaded && !loading" class="sidebar-footer">
      <small>{{ totalAllProducts }} products</small>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CategorySidebar',
  props: {
    token: {
      type: String,
      default: null
    }
  },
  emits: ['category-selected'],
  data() {
    return {
      hierarchy: [],
      expandedSupers: new Set(),
      loading: true,
      error: null,
      hierarchyLoaded: false
    };
  },
  computed: {
    allExpanded() {
      return this.expandedSupers.size === this.hierarchy.length && this.hierarchy.length > 0;
    },
    totalAllProducts() {
      return this.hierarchy.reduce((sum, cat) => sum + cat.totalProducts, 0);
    }
  },
  methods: {
    async loadHierarchy() {
      this.loading = true;
      this.error = null;

      try {
        const headers = {};
        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch('/api/categories/hierarchy', { headers });
        if (!response.ok) throw new Error('Failed to load categories');

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load categories');

        this.hierarchy = data.hierarchy;
        this.hierarchyLoaded = true;

        // Auto-expand first category
        if (this.hierarchy.length > 0) {
          this.expandedSupers.add(this.hierarchy[0].id);
        }
      } catch (err) {
        console.error('Error loading hierarchy:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    toggleSuper(id) {
      if (this.expandedSupers.has(id)) {
        this.expandedSupers.delete(id);
      } else {
        this.expandedSupers.add(id);
      }
      // Trigger reactivity
      this.expandedSupers = new Set(this.expandedSupers);
    },
    expandAll() {
      if (this.allExpanded) {
        this.expandedSupers.clear();
      } else {
        this.hierarchy.forEach(cat => {
          this.expandedSupers.add(cat.id);
        });
      }
      this.expandedSupers = new Set(this.expandedSupers);
    },
    selectCategory(category) {
      this.$emit('category-selected', category);
    }
  },
  mounted() {
    this.loadHierarchy();
  }
};
</script>

<style scoped>
.category-sidebar {
  background: var(--sidebar-bg, #fff);
  border-right: 1px solid var(--border, #e2ddd8);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border, #e2ddd8);
  flex-shrink: 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #1a1a18);
}

.btn-expand-all {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--muted, #9a948c);
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-expand-all:hover {
  background: var(--bg, #f5f4f0);
  color: var(--text, #1a1a18);
}

.sidebar-loading,
.sidebar-error {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--muted, #9a948c);
  font-size: 13px;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border, #e2ddd8);
  border-top-color: var(--red, #c0392b);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sidebar-error {
  color: #c0392b;
}

.sidebar-error small {
  color: var(--muted, #9a948c);
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.super-category-item {
  border-bottom: 1px solid var(--border2, #ede9e4);
}

.super-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  font-weight: 500;
  font-size: 13px;
  color: var(--text, #1a1a18);
}

.super-category-header:hover {
  background: var(--bg, #f5f4f0);
}

.expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
  color: var(--muted, #9a948c);
  font-size: 10px;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.emoji {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.super-category-header .name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  font-size: 11px;
  color: var(--muted, #9a948c);
  font-weight: 400;
}

.sub-categories {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--card2, #faf9f7);
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.2s ease-out;
}

.sub-categories.visible {
  max-height: 800px;
}

.sub-category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 10px 40px;
  font-size: 12px;
  color: var(--sub, #5a5750);
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.sub-category-item:hover {
  background: var(--bg, #f5f4f0);
  color: var(--text, #1a1a18);
  border-left-color: var(--red, #c0392b);
}

.subcategory-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-product-count {
  font-size: 11px;
  color: var(--muted, #9a948c);
  margin-left: 8px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border, #e2ddd8);
  text-align: center;
  color: var(--muted, #9a948c);
  font-size: 11px;
  flex-shrink: 0;
}
</style>

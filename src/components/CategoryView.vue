<template>
  <div class="category-view">
    <div v-if="loading" class="loading">Loading categories...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Super Category Loop (e.g., "Noodles & Rice") -->
      <div 
        v-for="superCat in hierarchy" 
        :key="superCat.id"
        class="super-category-page"
      >
        <!-- Super Category Header -->
        <div class="super-cat-header">
          <span class="super-cat-emoji">{{ superCat.emoji }}</span>
          <h2 class="super-cat-title">{{ superCat.name }}</h2>
          <span class="super-cat-count">({{ superCat.totalProducts }})</span>
        </div>

        <!-- Category Sections (e.g., "XWX Snack Noodles", "Buldak Chips & Snacks") -->
        <div 
          v-for="category in getProductsByCategory(superCat.id)"
          :key="category.id"
          class="category-section"
        >
          <div class="category-header">
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ category.products.length }}</span>
          </div>

          <div class="products-scroll">
            <div class="products-grid-horizontal">
              <ProductCard
                v-for="product in category.products"
                :key="product.id"
                :product="product"
                :is-favorited="isFavorited(product.id)"
                :in-cart="isInCart(product.id)"
                @product-selected="$emit('product-selected', product)"
                @add-to-cart="$emit('add-to-cart', product)"
                @toggle-favorite="$emit('toggle-favorite', product)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ProductCard from './ProductCard.vue'

export default {
  name: 'CategoryView',
  components: { ProductCard },
  props: {
    products: {
      type: Array,
      default: () => []
    },
    favorites: {
      type: Array,
      default: () => []
    },
    cart: {
      type: Array,
      default: () => []
    }
  },
  emits: ['product-selected', 'add-to-cart', 'toggle-favorite'],
  data() {
    return {
      hierarchy: [],
      loading: true,
      error: null
    }
  },
  computed: {
    isFavorited() {
      return (productId) => this.favorites.some(fav => fav.id === productId)
    },
    isInCart() {
      return (productId) => this.cart.some(item => item.id === productId)
    }
  },
  methods: {
    async loadCategories() {
      try {
        this.loading = true
        const response = await fetch('/api/categories/hierarchy')
        if (!response.ok) throw new Error('Failed to load categories')
        
        const data = await response.json()
        this.hierarchy = data.hierarchy || []
        
        this.error = null
      } catch (err) {
        this.error = 'Error loading categories: ' + err.message
        console.error('CategoryView error:', err)
      } finally {
        this.loading = false
      }
    },
    getProductsByCategory(superCatId) {
      // Group products by category within a super_category
      const grouped = {}
      
      this.products.forEach(product => {
        if (product.super_category_id !== superCatId) return
        
        const catId = product.category_id
        const catName = product.category || 'Uncategorized'
        
        if (!grouped[catId]) {
          grouped[catId] = {
            id: catId,
            name: catName,
            products: []
          }
        }
        grouped[catId].products.push(product)
      })
      
      // Sort categories by name, then products by name
      return Object.values(grouped)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(cat => ({
          ...cat,
          products: cat.products.sort((a, b) => a.name.localeCompare(b.name))
        }))
    }
  },
  watch: {
    products: {
      immediate: true,
      handler() {
        this.loadCategories()
      }
    }
  }
}
</script>

<style scoped>
.category-view {
  width: 100%;
}

.loading, .error {
  padding: 40px 20px;
  text-align: center;
  font-size: 16px;
  color: #666;
}

.error {
  color: #c0392b;
}

/* Super Category Page */
.super-category-page {
  margin-bottom: 40px;
}

.super-cat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2ddd8;
}

.super-cat-emoji {
  font-size: 28px;
}

.super-cat-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a18;
  margin: 0;
}

.super-cat-count {
  font-size: 16px;
  color: #5a5750;
  margin-left: auto;
}

/* Category Section */
.category-section {
  margin-bottom: 28px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e2ddd8;
  margin-bottom: 16px;
}

.category-name {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a18;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex: 1;
}

.category-count {
  display: inline-block;
  background: #c0392b;
  color: white;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  min-width: 24px;
  text-align: center;
}

/* Products Grid (Wrapped Layout) */
.products-scroll {
  overflow: visible;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.products-grid-horizontal {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(148px * var(--card-scale, 1)), 1fr));
  gap: calc(10px * var(--card-scale, 1));
  padding: 0;
  width: 100%;
}

@media (max-width: 640px) {
  .super-cat-header {
    gap: 8px;
    margin-bottom: 16px;
  }

  .super-cat-emoji {
    font-size: 20px;
  }

  .super-cat-title {
    font-size: 18px;
  }

  .super-cat-count {
    font-size: 14px;
  }

  .category-section {
    margin-bottom: 20px;
  }

  .category-header {
    padding: 10px 0;
    margin-bottom: 12px;
  }

  .category-name {
    font-size: 13px;
  }

  .category-count {
    font-size: 11px;
    padding: 3px 8px;
  }

  .products-grid-horizontal {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
</style>

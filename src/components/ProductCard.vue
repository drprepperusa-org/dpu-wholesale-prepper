<template>
  <div :class="['product-card', { 'in-cart': inCart, 'favorited': isFavorited }]">
    <div v-if="isNewItem" class="new-badge">NEW ITEM</div>
    <div class="fav-btn" @click.prevent="toggleFavorite" :style="{ color: isFavorited ? '#c0392b' : '#d4cfc9' }">
      ♡
    </div>
    <div class="p-img-wrap" @click="$emit('product-selected', product)">
      <img :src="product.image_url" :alt="product.name" class="p-img">
    </div>
    <div class="p-name" @click="$emit('product-selected', product)">{{ product.name }}</div>
    <div class="p-meta">
      <div v-if="product.weight">{{ product.weight }}</div>
      <div v-if="product.bags_per_case">{{ product.bags_per_case }}</div>
    </div>
    <div v-if="product.show_price !== false" class="p-price">${{ parseFloat(product.price || 0).toFixed(2) }}</div>
    <div class="product-actions">
      <button class="btn-view" @click="$emit('product-selected', product)">View</button>
      <button class="btn-cart" @click="$emit('add-to-cart', product)">Add</button>
    </div>
    <!-- Resize Handle (First Card Only) -->
    <div v-if="isFirst" class="resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<script>
export default {
  name: 'ProductCard',
  props: {
    product: {
      type: Object,
      required: true
    },
    isFavorited: {
      type: Boolean,
      default: false
    },
    inCart: {
      type: Boolean,
      default: false
    },
    isFirst: {
      type: Boolean,
      default: false
    }
  },
  emits: ['product-selected', 'add-to-cart', 'toggle-favorite', 'card-resize'],
  data() {
    return {
      isResizing: false,
      startX: 0,
      startY: 0,
      initialScale: 1.0,
      minScale: 0.5,
      maxScale: 2.0
    }
  },
  computed: {
    isNewItem() {
      if (!this.product.created_at) return false;
      const createdDate = new Date(this.product.created_at);
      const now = new Date();
      const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }
  },
  methods: {
    toggleFavorite() {
      this.$emit('toggle-favorite', this.product)
    },
    startResize(e) {
      e.preventDefault()
      this.isResizing = true
      this.startX = e.clientX
      this.startY = e.clientY
      this.initialScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-scale') || '1.0')
      
      document.addEventListener('mousemove', this.doResize)
      document.addEventListener('mouseup', this.endResize)
    },
    doResize(e) {
      if (!this.isResizing) return
      
      const deltaX = e.clientX - this.startX
      const deltaY = e.clientY - this.startY
      // Use diagonal distance (Pythagorean theorem)
      const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const direction = deltaX + deltaY > 0 ? 1 : -1
      
      // Scale factor: ~0.02 per pixel for smooth scaling
      let newScale = this.initialScale + (direction * delta * 0.005)
      newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale))
      
      this.$emit('card-resize', newScale)
    },
    endResize() {
      this.isResizing = false
      document.removeEventListener('mousemove', this.doResize)
      document.removeEventListener('mouseup', this.endResize)
    }
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.doResize)
    document.removeEventListener('mouseup', this.endResize)
  }
}
</script>

<style scoped>
.product-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: calc(12px * var(--card-scale, 1)) calc(10px * var(--card-scale, 1)) calc(10px * var(--card-scale, 1));
  text-align: center;
  cursor: pointer;
  transition: all 0.18s;
  position: relative;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  min-height: calc(224px * var(--card-scale, 1));
  display: flex;
  flex-direction: column;
}

.new-badge {
  position: absolute;
  top: calc(12px * var(--card-scale, 1));
  left: calc(12px * var(--card-scale, 1));
  background: #c0392b;
  color: white;
  padding: calc(4px * var(--card-scale, 1)) calc(6px * var(--card-scale, 1));
  border-radius: 4px;
  font-size: calc(9px * var(--card-scale, 1));
  font-weight: 700;
  letter-spacing: 0.5px;
  z-index: 5;
}

.product-card:hover {
  border-color: var(--red-mid);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.product-card:active {
  transform: scale(0.97);
}

.product-card.in-cart {
  border-color: var(--red);
  background: var(--red-light);
}

.fav-btn {
  position: absolute;
  top: 5px;
  right: 7px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s;
  line-height: 1;
  padding: 2px;
  display: block;
}

.fav-btn:hover {
  transform: scale(1.2);
}

.p-img-wrap {
  width: 100%;
  height: calc(160px * var(--card-scale, 1));
  margin-bottom: calc(8px * var(--card-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.p-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

.p-name {
  font-size: calc(11px * var(--card-scale, 1));
  color: var(--text);
  line-height: 1.35;
  height: calc(28px * var(--card-scale, 1));
  overflow: hidden;
  margin-bottom: calc(4px * var(--card-scale, 1));
  font-weight: 500;
}

.p-meta {
  font-size: calc(10px * var(--card-scale, 1));
  color: var(--muted);
  margin-bottom: calc(8px * var(--card-scale, 1));
  line-height: 1.4;
}

.p-price {
  font-size: calc(13px * var(--card-scale, 1));
  font-weight: 700;
  color: #c0392b;
  margin-bottom: calc(8px * var(--card-scale, 1));
}

.product-actions {
  display: flex;
  gap: calc(6px * var(--card-scale, 1));
  margin-top: auto;
}

.btn-view,
.btn-cart {
  flex: 1;
  padding: calc(6px * var(--card-scale, 1)) calc(8px * var(--card-scale, 1));
  border: none;
  border-radius: 6px;
  font-size: calc(11px * var(--card-scale, 1));
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
  text-transform: capitalize;
}

.btn-view {
  background: var(--bg);
  color: var(--text);
}

.btn-view:hover {
  background: #d4cfc9;
}

.btn-cart {
  background: #4CAF50;
  color: white;
}

.btn-cart:hover {
  background: #45a049;
}

.resize-handle {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, transparent 50%, var(--red) 50%);
  border-radius: 0 0 4px 0;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: all;
  user-select: none;
  z-index: 10;
}

.product-card:hover .resize-handle {
  opacity: 0.8;
}

.product-card:hover .resize-handle:hover {
  opacity: 1;
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
  --shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
  --radius: 10px;
}

@media (max-width: 640px) {
  .product-card {
    padding: 10px 8px 8px;
    min-height: 350px;
  }

  .p-img-wrap {
    height: 200px;
    margin-bottom: 6px;
    background: #fff;
    flex-shrink: 0;
  }

  .p-name {
    font-size: 10px;
    height: auto;
    margin-bottom: 4px;
  }

  .p-meta {
    font-size: 9px;
    margin-bottom: 6px;
  }

  .btn-view,
  .btn-cart {
    font-size: 10px;
    padding: 4px 6px;
  }
}
</style>

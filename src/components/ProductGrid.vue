<template>
  <div class="products-grid" :style="{ '--card-scale': cardSize }">
    <ProductCard 
      v-for="(product, index) in products" 
      :key="product.id"
      :product="product"
      :is-first="index === 0"
      :is-favorited="isFavorited(product)"
      :in-cart="inCart(product)"
      @product-selected="$emit('product-selected', product)"
      @add-to-cart="$emit('add-to-cart', product)"
      @toggle-favorite="$emit('toggle-favorite', product)"
      @card-resize="$emit('card-resize', $event)"
    />
  </div>
</template>

<script>
import ProductCard from './ProductCard.vue'

export default {
  name: 'ProductGrid',
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
    },
    cardSize: {
      type: Number,
      default: 1.0
    }
  },
  emits: ['product-selected', 'add-to-cart', 'toggle-favorite', 'card-resize'],
  methods: {
    isFavorited(product) {
      return this.favorites.some(f => f.id === product.id)
    },
    inCart(product) {
      return this.cart.some(item => item.id === product.id)
    }
  }
}
</script>

<style scoped>
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(148px * var(--card-scale)), 1fr));
  gap: calc(10px * var(--card-scale));
}

@media (max-width: 640px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
</style>

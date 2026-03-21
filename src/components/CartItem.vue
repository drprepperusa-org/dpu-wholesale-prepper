<template>
  <div class="cart-item" :class="{ loading: isLoading }">
    <div class="ci-img">
      <img :src="item.image_url" :alt="item.product_name">
    </div>
    <div class="ci-details">
      <div class="ci-name">{{ item.product_name }}</div>
      <div class="ci-meta">
        <span>{{ item.weight || '' }}</span>
        <span v-if="item.bags_per_case"> · {{ item.bags_per_case }}</span>
      </div>
      <div class="ci-price">${{ parseFloat(item.price).toFixed(2) }}</div>
    </div>
    <div class="ci-qty">
      <div class="qty-input">
        <button 
          class="qty-btn" 
          @click="decrementQuantity"
          :disabled="isLoading || item.quantity <= 1"
        >
          −
        </button>
        <input 
          type="number" 
          v-model.number="quantity" 
          @change="updateQuantity"
          :disabled="isLoading"
          class="qty-field"
          min="1"
        >
        <button 
          class="qty-btn" 
          @click="incrementQuantity"
          :disabled="isLoading"
        >
          +
        </button>
      </div>
      <span class="ci-qty-label">{{ item.quantity }} cases</span>
      <span v-if="item.price" class="ci-total">${{ (parseFloat(item.price) * item.quantity).toFixed(2) }}</span>
    </div>
    <button class="ci-remove" @click="$emit('remove', item.id)" :disabled="isLoading">✕</button>
  </div>
</template>

<script>
export default {
  name: 'CartItem',
  props: {
    item: {
      type: Object,
      required: true
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['remove', 'update-quantity'],
  data() {
    return {
      quantity: this.item.quantity
    }
  },
  watch: {
    'item.quantity'(newVal) {
      this.quantity = newVal;
    }
  },
  methods: {
    decrementQuantity() {
      if (this.quantity > 1) {
        this.quantity--;
        this.updateQuantity();
      }
    },
    incrementQuantity() {
      this.quantity++;
      this.updateQuantity();
    },
    updateQuantity() {
      if (this.quantity === this.item.quantity) return;
      
      if (this.quantity <= 0) {
        this.$emit('remove', this.item.id);
      } else {
        this.$emit('update-quantity', this.item.id, this.quantity);
      }
    }
  }
}
</script>

<style scoped>
:root {
  --bg: #f5f4f0;
  --surface: #fff;
  --border: #e2ddd8;
  --red: #c0392b;
  --text: #1a1a18;
  --sub: #5a5750;
  --muted: #9a948c;
  --faint: #d4cfc9;
  --shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
}

.cart-item {
  display: flex;
  gap: 10px;
  padding: 12px 10px;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-bottom: 8px;
  position: relative;
  box-shadow: var(--shadow);
  opacity: 1;
  transition: opacity 0.2s;
}

.cart-item.loading {
  opacity: 0.6;
  pointer-events: none;
}

.ci-img {
  width: 70px;
  height: 70px;
  flex-shrink: 0;
  background: var(--bg);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ci-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.ci-details {
  flex: 1;
  min-width: 0;
}

.ci-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.2;
  margin-bottom: 2px;
}

.ci-meta {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.2;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ci-price {
  font-size: 11px;
  font-weight: 600;
  color: var(--red);
}

.ci-qty {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  text-align: right;
  gap: 4px;
}

.qty-input {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px;
  background: var(--bg);
}

.qty-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 2px;
}

.qty-btn:hover:not(:disabled) {
  background: var(--faint);
}

.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-field {
  width: 30px;
  height: 20px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  padding: 0 2px;
}

.qty-field:focus {
  outline: none;
}

/* Remove spinner buttons from number input */
.qty-field::-webkit-outer-spin-button,
.qty-field::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.qty-field[type=number] {
  -moz-appearance: textfield;
}

.ci-qty-label {
  font-size: 11px;
  color: var(--sub);
  font-weight: 500;
}

.ci-total {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.ci-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: var(--bg);
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.ci-remove:hover {
  background: var(--red);
  color: #fff;
}
</style>

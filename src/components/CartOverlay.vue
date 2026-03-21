<template>
  <div :class="['cart-overlay', { open: open }]" @click="$emit('close')">
    <div class="cart-sheet" @click.stop>
      <div class="sheet-handle"></div>
      
      <!-- Cart Header -->
      <div class="cart-sheet-head">
        <h2>🛒 Your Order</h2>
        <button class="cart-close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Cart Items -->
      <div class="cart-sheet-items">
        <div v-if="isLoading" class="cart-loading">
          <p>Loading cart...</p>
        </div>
        <div v-else-if="cartItems.length === 0" class="cart-empty-state">
          <div class="ces-icon">🛒</div>
          <p>Your cart is empty</p>
          <p class="ces-hint">Add items to get started</p>
        </div>
        <CartItem 
          v-for="item in cartItems"
          :key="item.id"
          :item="item"
          @remove="removeItem"
          @update-quantity="updateQuantity"
          :is-loading="itemsLoading.has(item.id)"
        />
      </div>

      <!-- Cart Footer -->
      <div v-if="cartItems.length > 0" class="cart-sheet-footer">
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
        <button class="btn-place-order" @click="$emit('place-order')" :disabled="isLoading">Place Order →</button>
        <button class="btn-clear" @click="clearCart" :disabled="isLoading">Clear cart</button>
      </div>

      <!-- Error message -->
      <div v-if="errorMessage" class="cart-error">
        <p>⚠️ {{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import CartItem from './CartItem.vue'

export default {
  name: 'CartOverlay',
  components: {
    CartItem
  },
  props: {
    open: {
      type: Boolean,
      default: false
    },
    jwt: {
      type: String,
      required: true
    }
  },
  emits: ['close', 'place-order', 'cart-updated'],
  data() {
    return {
      cartItems: [],
      isLoading: false,
      itemsLoading: new Set(),
      errorMessage: null
    }
  },
  computed: {
    cartTotal() {
      return this.cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
    },
    totalCases() {
      return this.cartItems.reduce((sum, item) => sum + item.quantity, 0)
    }
  },
  watch: {
    open(newVal) {
      if (newVal) {
        this.loadCart();
      }
    }
  },
  methods: {
    async loadCart() {
      this.isLoading = true;
      this.errorMessage = null;
      try {
        const response = await fetch('/api/cart', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.jwt}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load cart');
        }

        const data = await response.json();
        this.cartItems = data.items || [];
        this.$emit('cart-updated', { items: this.cartItems, total: data.total_cost });
      } catch (err) {
        console.error('Load cart error:', err);
        this.errorMessage = 'Failed to load cart. Please try again.';
      } finally {
        this.isLoading = false;
      }
    },

    async removeItem(itemId) {
      this.itemsLoading.add(itemId);
      try {
        const response = await fetch(`/api/cart/items/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.jwt}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to remove item');
        }

        const data = await response.json();
        this.cartItems = data.items || [];
        this.$emit('cart-updated', { items: this.cartItems, total: data.total_cost });
      } catch (err) {
        console.error('Remove item error:', err);
        this.errorMessage = 'Failed to remove item. Please try again.';
      } finally {
        this.itemsLoading.delete(itemId);
      }
    },

    async updateQuantity(itemId, quantity) {
      this.itemsLoading.add(itemId);
      try {
        const response = await fetch(`/api/cart/items/${itemId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.jwt}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ quantity })
        });

        if (!response.ok) {
          throw new Error('Failed to update quantity');
        }

        const data = await response.json();
        this.cartItems = data.items || [];
        this.$emit('cart-updated', { items: this.cartItems, total: data.total_cost });
      } catch (err) {
        console.error('Update quantity error:', err);
        this.errorMessage = 'Failed to update quantity. Please try again.';
      } finally {
        this.itemsLoading.delete(itemId);
      }
    },

    async clearCart() {
      if (!confirm('Are you sure you want to clear your entire cart?')) {
        return;
      }

      this.isLoading = true;
      try {
        const response = await fetch('/api/cart', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.jwt}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to clear cart');
        }

        const data = await response.json();
        this.cartItems = data.items || [];
        this.$emit('cart-updated', { items: this.cartItems, total: data.total_cost });
      } catch (err) {
        console.error('Clear cart error:', err);
        this.errorMessage = 'Failed to clear cart. Please try again.';
      } finally {
        this.isLoading = false;
      }
    }
  },
  mounted() {
    if (this.open) {
      this.loadCart();
    }
  }
}
</script>

<style scoped>
:root {
  --bg: #f5f4f0;
  --surface: #fff;
  --card2: #faf9f7;
  --border: #e2ddd8;
  --red: #c0392b;
  --text: #1a1a18;
  --sub: #5a5750;
  --muted: #9a948c;
  --faint: #d4cfc9;
  --shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.18);
}

.cart-overlay {
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

.cart-overlay.open {
  background: rgba(26,26,24,0.45);
  pointer-events: all;
}

.cart-sheet {
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

.cart-overlay.open .cart-sheet {
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

.cart-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.cart-sheet-head h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.3px;
  margin: 0;
}

.cart-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.cart-close-btn:hover {
  background: var(--red-light);
  border-color: var(--red-mid);
  color: var(--red);
}

.cart-sheet-items {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cart-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
}

.ces-icon {
  font-size: 48px;
  margin-bottom: 14px;
  opacity: 0.4;
}

.cart-empty-state p {
  margin: 0;
  font-size: 14px;
}

.ces-hint {
  font-size: 12px !important;
  color: var(--faint);
  margin-top: 6px !important;
}

.cart-sheet-footer {
  padding: 12px 16px;
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

.btn-place-order {
  width: 100%;
  padding: 12px;
  background: var(--red);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.18s;
  letter-spacing: -0.2px;
}

.btn-place-order:hover {
  background: #a93226;
}

.btn-clear {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--sub);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  cursor: pointer;
  margin-top: 6px;
  transition: all 0.15s;
}

.btn-clear:hover {
  border-color: var(--red);
  color: var(--red);
}

.btn-place-order:disabled,
.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--muted);
  font-size: 14px;
}

.cart-error {
  background: #fee;
  border-top: 1px solid var(--border);
  padding: 10px 16px;
  color: var(--red);
  font-size: 12px;
  flex-shrink: 0;
}

.cart-error p {
  margin: 0;
}
</style>

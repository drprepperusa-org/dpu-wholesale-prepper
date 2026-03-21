<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Confirm Order</h3>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      
      <div class="modal-body">
        <p>You're about to place an order. Please review the details below:</p>
        
        <div class="order-summary">
          <div class="summary-row">
            <span>Line items:</span>
            <span>{{ itemCount }}</span>
          </div>
          <div class="summary-row">
            <span>Total cases:</span>
            <span>{{ totalQty }}</span>
          </div>
          <div class="summary-row total">
            <span>Estimated total:</span>
            <span>${{ total.toFixed(2) }}</span>
          </div>
        </div>

        <div class="form-section">
          <label>
            <input type="checkbox" v-model="confirmTerms">
            <span>I confirm this order and agree to the terms</span>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button 
          class="btn-submit" 
          @click="$emit('submit')"
          :disabled="!confirmTerms"
        >
          Place Order
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrderConfirmModal',
  emits: ['close', 'submit'],
  data() {
    return {
      confirmTerms: false
    }
  },
  computed: {
    itemCount() {
      return 0
    },
    totalQty() {
      return 0
    },
    total() {
      return 0
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
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.18);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26,26,24,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 600;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: var(--surface);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  max-width: 400px;
  width: 100%;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(.32,1,.32,1);
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sub);
  transition: all 0.15s;
  padding: 0;
}

.modal-close:hover {
  background: var(--red);
  border-color: var(--red);
  color: #fff;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  font-size: 13px;
  color: var(--sub);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.order-summary {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 13px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  color: var(--sub);
  margin-bottom: 4px;
}

.summary-row.total {
  border-top: 1px solid var(--border);
  padding-top: 8px;
  margin-top: 8px;
  color: var(--text);
  font-weight: 600;
  margin-bottom: 0;
}

.form-section {
  margin-bottom: 16px;
}

.form-section label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--sub);
}

.form-section input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 12px;
  border-radius: 9px;
  border: 1px solid var(--border);
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background: var(--bg);
  color: var(--text);
}

.btn-cancel:hover {
  background: var(--border);
}

.btn-submit {
  background: var(--red);
  color: #fff;
  border-color: var(--red);
}

.btn-submit:hover:not(:disabled) {
  background: #a93226;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .modal-content {
    max-width: 100%;
    border-radius: 12px 12px 0 0;
  }
}
</style>

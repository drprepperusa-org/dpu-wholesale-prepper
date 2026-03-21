<template>
  <div class="admin-dashboard">
    <div class="admin-header">
      <h1>🔧 Admin Dashboard</h1>
      <p class="subtitle">Temporary admin tools for testing & development</p>
    </div>

    <div class="admin-grid">
      <!-- Product Management -->
      <div class="admin-card">
        <div class="card-icon">📦</div>
        <h3>Products</h3>
        <p>Manage product inventory, prices, and listings</p>
        <button class="admin-btn" @click="openSection('products')">
          Manage Products
        </button>
      </div>

      <!-- Orders Management -->
      <div class="admin-card">
        <div class="card-icon">📋</div>
        <h3>Orders</h3>
        <p>View and manage customer orders</p>
        <button class="admin-btn" @click="openSection('orders')">
          View Orders
        </button>
      </div>

      <!-- Customers Management -->
      <div class="admin-card">
        <div class="card-icon">👥</div>
        <h3>Customers</h3>
        <p>Manage customer accounts and permissions</p>
        <button class="admin-btn" @click="showCustomersModal = true">
          Manage Customers
        </button>
      </div>

      <!-- Pricing -->
      <div class="admin-card">
        <div class="card-icon">💰</div>
        <h3>Pricing</h3>
        <p>Configure product pricing and discounts</p>
        <button class="admin-btn" @click="openSection('pricing')">
          Set Pricing
        </button>
      </div>

      <!-- Categories -->
      <div class="admin-card">
        <div class="card-icon">🏷️</div>
        <h3>Categories</h3>
        <p>Manage product categories and subcategories</p>
        <button class="admin-btn" @click="openSection('categories')">
          Manage Categories
        </button>
      </div>

      <!-- Database -->
      <div class="admin-card">
        <div class="card-icon">🗄️</div>
        <h3>Database</h3>
        <p>Database administration and queries</p>
        <button class="admin-btn" @click="openSection('database')">
          Database Tools
        </button>
      </div>

      <!-- API Status -->
      <div class="admin-card">
        <div class="card-icon">⚙️</div>
        <h3>API Status</h3>
        <p>Check API health and endpoint status</p>
        <button class="admin-btn" @click="checkApiStatus">
          Check Status
        </button>
      </div>

      <!-- Server Info -->
      <div class="admin-card">
        <div class="card-icon">🖥️</div>
        <h3>Server Info</h3>
        <p>View server configuration and logs</p>
        <button class="admin-btn" @click="openSection('server')">
          View Server Info
        </button>
      </div>
    </div>

    <!-- API Status Modal -->
    <div v-if="showApiStatus" class="admin-modal-overlay" @click="showApiStatus = false">
      <div class="admin-modal" @click.stop>
        <h2>API Status</h2>
        <div v-if="apiStatus.loading" class="status-loading">
          Checking API health...
        </div>
        <div v-else class="status-content">
          <div :class="['status-indicator', apiStatus.online ? 'online' : 'offline']">
            {{ apiStatus.online ? '🟢 Online' : '🔴 Offline' }}
          </div>
          <div class="status-details">
            <p><strong>Products endpoint:</strong> {{ apiStatus.products }} items</p>
            <p v-if="apiStatus.timestamp"><strong>Last check:</strong> {{ new Date(apiStatus.timestamp).toLocaleTimeString() }}</p>
          </div>
        </div>
        <button class="close-btn" @click="showApiStatus = false">Close</button>
      </div>
    </div>

    <!-- Customers Modal -->
    <div v-if="showCustomersModal" class="admin-modal-overlay" @click="showCustomersModal = false">
      <div class="admin-modal" @click.stop style="max-width: 500px">
        <h2>👥 Manage Customers</h2>
        
        <!-- Create Customer Form -->
        <div class="modal-section">
          <h3>Create New Customer</h3>
          <form @submit.prevent="createCustomer">
            <div class="form-group">
              <label>Company Name *</label>
              <input v-model="form.company_name" type="text" required placeholder="e.g., Happy Snacks Co.">
            </div>
            <div class="form-group">
              <label>Contact Name</label>
              <input v-model="form.contact_name" type="text" placeholder="e.g., John Doe">
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input v-model="form.email" type="email" required placeholder="e.g., buyer@happysnacks.com">
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input v-model="form.phone" type="tel" placeholder="e.g., 555-1234">
            </div>
            <div class="form-group">
              <label>View Preset</label>
              <select v-model="form.preset">
                <option value="full">Full Catalog</option>
                <option value="limited">Limited Catalog</option>
              </select>
            </div>
            <div v-if="formError" class="error-message">{{ formError }}</div>
            <div v-if="formSuccess" class="success-message">{{ formSuccess }}</div>
            <div class="form-actions">
              <button type="submit" class="submit-btn" :disabled="formLoading">
                {{ formLoading ? 'Creating...' : 'Create Customer' }}
              </button>
              <button type="button" class="cancel-btn" @click="resetForm">Clear</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="admin-note">
      ℹ️ This is a temporary admin interface for development and testing. It will be removed before production deployment.
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminDashboard',
  data() {
    return {
      showApiStatus: false,
      showCustomersModal: false,
      apiStatus: {
        loading: false,
        online: false,
        products: 0,
        timestamp: null
      },
      form: {
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        preset: 'full'
      },
      formLoading: false,
      formError: '',
      formSuccess: ''
    }
  },
  methods: {
    openSection(section) {
      alert(`[PLACEHOLDER] ${section} management would open here.\n\nThis is a temporary admin interface.`)
    },
    async checkApiStatus() {
      this.showApiStatus = true
      this.apiStatus.loading = true
      
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        this.apiStatus.online = response.ok
        this.apiStatus.products = data.length || 0
        this.apiStatus.timestamp = new Date().toISOString()
      } catch (error) {
        this.apiStatus.online = false
        console.error('API check failed:', error)
      }
      
      this.apiStatus.loading = false
    },
    async createCustomer() {
      this.formError = ''
      this.formSuccess = ''
      this.formLoading = true

      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(this.form)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create customer')
        }

        this.formSuccess = `✅ Customer "${data.customer.company_name}" created! Temp password: ${data.tempPassword || '(provided)'}`
        this.resetForm()
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          this.formSuccess = ''
        }, 3000)
      } catch (error) {
        this.formError = error.message
        console.error('Create customer error:', error)
      } finally {
        this.formLoading = false
      }
    },
    resetForm() {
      this.form = {
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        preset: 'full'
      }
      this.formError = ''
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 24px;
  overflow-y: auto;
  background: var(--bg);
  min-height: 100%;
}

.admin-header {
  margin-bottom: 32px;
}

.admin-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.subtitle {
  color: var(--sub);
  font-size: 14px;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.admin-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;
  cursor: pointer;
}

.admin-card:hover {
  border-color: var(--red);
  box-shadow: var(--shadow-md);
}

.card-icon {
  font-size: 32px;
  line-height: 1;
}

.admin-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.admin-card p {
  font-size: 13px;
  color: var(--sub);
  margin: 0;
  flex: 1;
}

.admin-btn {
  padding: 8px 16px;
  background: var(--red);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}

.admin-btn:hover {
  background: #d94a4a;
  transform: translateY(-2px);
}

.admin-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.admin-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
}

.admin-modal h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.status-loading {
  text-align: center;
  color: var(--sub);
  padding: 20px;
}

.status-content {
  margin-bottom: 20px;
}

.status-indicator {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.status-indicator.online {
  color: #4caf50;
}

.status-indicator.offline {
  color: #f44336;
}

.status-details p {
  margin: 8px 0;
  font-size: 13px;
  color: var(--text);
}

.status-details strong {
  color: var(--text);
}

.close-btn {
  width: 100%;
  padding: 10px;
  background: var(--border);
  border: none;
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--red);
  color: white;
}

.admin-note {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  color: #856404;
  text-align: center;
}

/* Customer Form Styles */
.modal-section {
  margin-top: 0;
}

.modal-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
  margin-top: 0;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--red);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}

.error-message {
  padding: 8px 10px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 12px;
  margin-bottom: 12px;
}

.success-message {
  padding: 8px 10px;
  background: #efe;
  border: 1px solid #cfc;
  border-radius: 6px;
  color: #3a3;
  font-size: 12px;
  margin-bottom: 12px;
  word-break: break-word;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.submit-btn {
  flex: 1;
  padding: 10px;
  background: var(--red);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #d94a4a;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  flex: 1;
  padding: 10px;
  background: var(--border);
  color: var(--text);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: var(--red);
  color: white;
}

@media (max-width: 640px) {
  .admin-dashboard {
    padding: 16px;
  }

  .admin-header h1 {
    font-size: 22px;
  }

  .admin-grid {
    grid-template-columns: 1fr;
  }

  .admin-modal {
    max-width: 95vw;
  }
}
</style>

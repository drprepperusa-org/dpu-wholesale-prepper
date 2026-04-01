'use client';
import React, { useState } from 'react'

function AdminDashboard() {
  const [showApiStatus, setShowApiStatus] = useState(false)
  const [showCustomersModal, setShowCustomersModal] = useState(false)
  const [apiStatus, setApiStatus] = useState({
    loading: false,
    online: false,
    products: 0,
    timestamp: null
  })
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    preset: 'full'
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const openSection = (section) => {
    alert(`[PLACEHOLDER] ${section} management would open here.\n\nThis is a temporary admin interface.`)
  }

  const checkApiStatus = async () => {
    setShowApiStatus(true)
    setApiStatus(prev => ({ ...prev, loading: true }))
    
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setApiStatus({
        loading: false,
        online: response.ok,
        products: data.products ? data.products.length : (Array.isArray(data) ? data.length : 0),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setApiStatus({
        loading: false,
        online: false,
        products: 0,
        timestamp: new Date().toISOString()
      })
      console.error('API check failed:', error)
    }
  }

  const createCustomer = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer')
      }

      setFormSuccess(`✅ Customer "${data.customer.company_name}" created! Temp password: ${data.tempPassword || '(provided)'}. Please save this password as it will not be shown again.`)
      resetForm()
      
      setTimeout(() => {
        setFormSuccess('')
      }, 5000)
    } catch (error) {
      setFormError(error.message)
      console.error('Create customer error:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      preset: 'full'
    })
    setFormError('')
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🔧 Admin Dashboard</h1>
        <p className="subtitle">Temporary admin tools for testing & development</p>
      </div>

      <div className="admin-grid">
        <div className="admin-card" onClick={() => openSection('products')}>
          <div className="card-icon">📦</div>
          <h3>Products</h3>
          <p>Manage product inventory, prices, and listings</p>
          <button className="admin-btn">Manage Products</button>
        </div>

        <div className="admin-card" onClick={() => openSection('orders')}>
          <div className="card-icon">📋</div>
          <h3>Orders</h3>
          <p>View and manage customer orders</p>
          <button className="admin-btn">View Orders</button>
        </div>

        <div className="admin-card" onClick={() => setShowCustomersModal(true)}>
          <div className="card-icon">👥</div>
          <h3>Customers</h3>
          <p>Manage customer accounts and permissions</p>
          <button className="admin-btn">Manage Customers</button>
        </div>

        <div className="admin-card" onClick={() => openSection('pricing')}>
          <div className="card-icon">💰</div>
          <h3>Pricing</h3>
          <p>Configure product pricing and discounts</p>
          <button className="admin-btn">Set Pricing</button>
        </div>

        <div className="admin-card" onClick={() => openSection('categories')}>
          <div className="card-icon">🏷️</div>
          <h3>Categories</h3>
          <p>Manage product categories and subcategories</p>
          <button className="admin-btn">Manage Categories</button>
        </div>

        <div className="admin-card" onClick={() => openSection('database')}>
          <div className="card-icon">🗄️</div>
          <h3>Database</h3>
          <p>Database administration and queries</p>
          <button className="admin-btn">Database Tools</button>
        </div>

        <div className="admin-card" onClick={checkApiStatus}>
          <div className="card-icon">⚙️</div>
          <h3>API Status</h3>
          <p>Check API health and endpoint status</p>
          <button className="admin-btn">Check Status</button>
        </div>

        <div className="admin-card" onClick={() => openSection('server')}>
          <div className="card-icon">🖥️</div>
          <h3>Server Info</h3>
          <p>View server configuration and logs</p>
          <button className="admin-btn">View Server Info</button>
        </div>
      </div>

      {showApiStatus && (
        <div className="admin-modal-overlay" onClick={() => setShowApiStatus(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>API Status</h2>
            {apiStatus.loading ? (
              <div className="status-loading">Checking API health...</div>
            ) : (
              <div className="status-content">
                <div className={`status-indicator ${apiStatus.online ? 'online' : 'offline'}`}>
                  {apiStatus.online ? '🟢 Online' : '🔴 Offline'}
                </div>
                <div className="status-details">
                  <p><strong>Products found:</strong> {apiStatus.products}</p>
                  {apiStatus.timestamp && (
                    <p><strong>Last check:</strong> {new Date(apiStatus.timestamp).toLocaleTimeString()}</p>
                  )}
                </div>
              </div>
            )}
            <button className="close-btn" onClick={() => setShowApiStatus(false)}>Close</button>
          </div>
        </div>
      )}

      {showCustomersModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCustomersModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>👥 Manage Customers</h2>
            <div className="modal-section">
              <h3>Create New Customer</h3>
              <form onSubmit={createCustomer}>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input 
                    value={form.company_name} 
                    onChange={e => setForm({...form, company_name: e.target.value})}
                    type="text" required placeholder="e.g., Happy Snacks Co." 
                  />
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input 
                    value={form.contact_name}
                    onChange={e => setForm({...form, contact_name: e.target.value})}
                    type="text" placeholder="e.g., John Doe" 
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input 
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    type="email" required placeholder="e.g., buyer@happysnacks.com" 
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input 
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    type="tel" placeholder="e.g., 555-1234" 
                  />
                </div>
                <div className="form-group">
                  <label>View Preset</label>
                  <select value={form.preset} onChange={e => setForm({...form, preset: e.target.value})}>
                    <option value="full">Full Catalog</option>
                    <option value="limited">Limited Catalog</option>
                  </select>
                </div>
                {formError && <div className="error-message">{formError}</div>}
                {formSuccess && <div className="success-message">{formSuccess}</div>}
                <div className="form-actions">
                  <button type="submit" className="submit-btn" disabled={formLoading}>
                    {formLoading ? 'Creating...' : 'Create Customer'}
                  </button>
                  <button type="button" className="cancel-btn" onClick={resetForm}>Clear</button>
                </div>
              </form>
            </div>
            <button className="close-btn" style={{marginTop: '15px'}} onClick={() => setShowCustomersModal(false)}>Close</button>
          </div>
        </div>
      )}

      <div className="admin-note">
        ℹ️ This is a temporary admin interface for development and testing. It will be removed before production deployment.
      </div>

      <style jsx>{`
        .admin-dashboard {
          padding: 24px;
          background: var(--bg, #f5f4f0);
          min-height: 100%;
          overflow-y: auto;
        }
        .admin-header { margin-bottom: 32px; }
        .admin-header h1 { font-size: 28px; font-weight: 700; color: var(--text, #1a1a18); margin-bottom: 4px; }
        .subtitle { color: var(--sub, #5a5750); font-size: 14px; }
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .admin-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #e2ddd8);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .admin-card:hover { border-color: var(--red, #c0392b); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .card-icon { font-size: 32px; line-height: 1; }
        .admin-card h3 { font-size: 16px; font-weight: 600; color: var(--text, #1a1a18); margin: 0; }
        .admin-card p { font-size: 13px; color: var(--sub, #5a5750); margin: 0; flex: 1; }
        .admin-btn {
          padding: 8px 16px;
          background: var(--red, #c0392b);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .admin-btn:hover { background: #d94a4a; transform: translateY(-2px); }
        .admin-modal-overlay {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .admin-modal {
          background: var(--surface, #fff); border: 1px solid var(--border, #e2ddd8); border-radius: 12px;
          padding: 24px; max-width: 400px; width: 90%;
        }
        .admin-modal h2 { font-size: 18px; font-weight: 600; color: var(--text, #1a1a18); margin-bottom: 16px; }
        .status-loading { text-align: center; color: var(--sub, #5a5750); padding: 20px; }
        .status-content { margin-bottom: 20px; }
        .status-indicator { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
        .status-indicator.online { color: #4caf50; }
        .status-indicator.offline { color: #f44336; }
        .status-details p { margin: 8px 0; font-size: 13px; color: var(--text, #1a1a18); }
        .close-btn {
          width: 100%; padding: 10px; background: var(--border, #e2ddd8); border: none;
          border-radius: 6px; color: var(--text, #1a1a18); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .close-btn:hover { background: var(--red, #c0392b); color: white; }
        .admin-note {
          background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;
          padding: 12px 16px; font-size: 13px; color: #856404; text-align: center;
        }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text, #1a1a18); margin-bottom: 4px; }
        .form-group input, .form-group select {
          width: 100%; padding: 8px 10px; background: var(--bg, #f5f4f0); border: 1px solid var(--border, #e2ddd8);
          border-radius: 6px; font-size: 13px; box-sizing: border-box; color: var(--text, #1a1a18);
          font-family: 'DM Sans', sans-serif;
        }
        .error-message { padding: 8px 10px; background: #fee; border: 1px solid #fcc; border-radius: 6px; color: #c33; font-size: 12px; margin-bottom: 12px; }
        .success-message { padding: 8px 10px; background: #efe; border: 1px solid #cfc; border-radius: 6px; color: #3a3; font-size: 12px; margin-bottom: 12px; word-break: break-word; }
        .form-actions { display: flex; gap: 8px; margin-top: 16px; }
        .submit-btn { flex: 1; padding: 10px; background: var(--red, #c0392b); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .cancel-btn { flex: 1; padding: 10px; background: var(--border, #e2ddd8); color: var(--text, #1a1a18); border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
    </div>
  )
}

export default AdminDashboard

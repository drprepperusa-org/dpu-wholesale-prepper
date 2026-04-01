'use client';
import React, { useState, useEffect, useMemo } from 'react'

function BulkEditView({ initialCustomers, initialProducts, superCategories, onLoadProducts }) {
  const [selectedMode, setSelectedMode] = useState('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [editingPrices, setEditingPrices] = useState({})
  const [editingSuper, setEditingSuper] = useState({})
  const [editingCats, setEditingCats] = useState({})
  const [editingHidden, setEditingHidden] = useState({})
  const [overrides, setOverrides] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false)
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false)
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkSuperCat, setBulkSuperCat] = useState('')
  const [bulkCat, setBulkCat] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'success' })

  useEffect(() => {
    if (initialProducts) {
      const prods = JSON.parse(JSON.stringify(initialProducts))
      setProducts(prods)
      const prices = {}
      const supers = {}
      const cats = {}
      const hiddens = {}
      prods.forEach(p => {
        prices[p.id] = p.price
        supers[p.id] = p.super_category_id
        cats[p.id] = p.category_id
        hiddens[p.id] = p.is_hidden
      })
      setEditingPrices(prices)
      setEditingSuper(supers)
      setEditingCats(cats)
      setEditingHidden(hiddens)
    }
  }, [initialProducts])

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    const q = searchQuery.toLowerCase()
    return products.filter(p =>
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.super_category && p.super_category.toLowerCase().includes(q))
    )
  }, [products, searchQuery])

  const totalProducts = products.length
  
  const visibleProductCount = useMemo(() => {
    if (!selectedCustomerId) return totalProducts
    return products.filter(p => {
      if (p.is_hidden) return false
      const override = overrides[p.id]
      if (override?.hidden) return false
      return true
    }).length
  }, [products, selectedCustomerId, overrides, totalProducts])

  const availableCategories = useMemo(() => {
    if (!bulkSuperCat) return []
    return superCategories.find(sc => sc.id === parseInt(bulkSuperCat))?.subcats?.map(name => ({ id: name, name })) || []
  }, [bulkSuperCat, superCategories])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000)
  }

  const onModeChange = async (e) => {
    const value = e.target.value
    setSelectedMode(value)
    setSelectedRows(new Set())
    
    if (value === 'all') {
      setSelectedCustomerId(null)
      setOverrides({})
    } else {
      const custId = value.split(':')[1]
      setSelectedCustomerId(custId)
      await loadOverridesForCustomer(custId)
    }
  }

  const loadOverridesForCustomer = async (custId) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/customers/${custId}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to load customer products')
      const data = await response.json()
      const newOverrides = {}
      data.forEach(prod => {
        if (prod.override_price !== null || prod.override_is_hidden) {
          newOverrides[prod.id] = {
            price: prod.override_price,
            hidden: prod.override_is_hidden
          }
        }
      })
      setOverrides(newOverrides)
    } catch (e) {
      console.error('Error loading overrides:', e)
      showToast('Failed to load customer overrides', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(filteredProducts.map(p => p.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const toggleProductSelect = (id) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const hasOverride = (productId, type) => {
    if (!selectedCustomerId) return false
    const override = overrides[productId]
    if (!override) return false
    if (type === 'price') return override.price !== null
    if (type === 'hidden') return override.hidden
    return false
  }

  const savePriceChange = async (prod, newPrice) => {
    const price = parseFloat(newPrice)
    if (selectedMode === 'all') {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/admin/products/bulk`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: [prod.id], price })
        })
        if (!response.ok) throw new Error('Failed to update price')
        setProducts(products.map(p => p.id === prod.id ? { ...p, price } : p))
        showToast(`✅ Price updated to $${price}`, 'success')
      } catch (e) {
        showToast('Failed to save price', 'error')
      }
    } else {
      await setOverride(prod.id, { override_price: price })
    }
  }

  const setOverride = async (productId, data) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/products/${productId}/override`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customer_id: selectedCustomerId, ...data })
      })
      if (!response.ok) throw new Error('Failed to set override')
      const result = await response.json()
      setOverrides({ ...overrides, [productId]: {
        price: result.override.override_price,
        hidden: result.override.override_is_hidden
      }})
      showToast('✅ Override saved', 'success')
    } catch (e) {
      showToast('Failed to save override', 'error')
    }
  }

  const applyBulkPrice = async () => {
    const ids = Array.from(selectedRows)
    const price = parseFloat(bulkPrice)
    try {
      const token = localStorage.getItem('token')
      if (selectedMode === 'all') {
        const response = await fetch('/api/admin/products/bulk', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids, price })
        })
        if (!response.ok) throw new Error('Failed')
        setProducts(products.map(p => ids.includes(p.id) ? { ...p, price } : p))
      } else {
        const response = await fetch('/api/admin/products/bulk-override', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ product_ids: ids, customer_id: selectedCustomerId, override_price: price })
        })
        if (!response.ok) throw new Error('Failed')
        await loadOverridesForCustomer(selectedCustomerId)
      }
      showToast(`✅ Applied to ${ids.length} products`)
      setSelectedRows(new Set())
      setShowBulkPriceModal(false)
    } catch (e) {
      showToast('Failed to apply bulk price', 'error')
    }
  }

  return (
    <div className="bulk-edit-wrap">
      <div className="be-header">
        <div className="be-header-left">
          <h2>Bulk Edit Products</h2>
          <span className="be-subtitle">Edit prices, categories, and visibility across all products</span>
        </div>
        <div className="be-customer-selector">
          <label>View as:</label>
          <select value={selectedMode} onChange={onModeChange} className="be-select">
            <option value="all">All Customers (defaults)</option>
            {initialCustomers?.map(c => (
              <option key={c.id} value={`customer:${c.id}`}>{c.company_name}</option>
            ))}
          </select>
          {selectedCustomerId && (
            <span className="be-info">
              This customer sees {visibleProductCount} of {totalProducts} products
            </span>
          )}
        </div>
      </div>

      <div className="be-toolbar">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          type="text"
          placeholder="Search SKU, name, category..."
          className="be-search"
        />
        <span className="be-result-count">{filteredProducts.length} products</span>
      </div>

      {selectedRows.size > 0 && (
        <div className="be-bulk-bar">
          <span className="be-bulk-count">{selectedRows.size} selected</span>
          <button onClick={() => setShowBulkPriceModal(true)} className="be-bulk-btn">💰 Set Price</button>
          <button onClick={() => setShowBulkCategoryModal(true)} className="be-bulk-btn">📂 Set Category</button>
          <button onClick={() => setSelectedRows(new Set())} className="be-bulk-btn be-bulk-deselect">Deselect</button>
        </div>
      )}

      <div className="be-table-wrap">
        <table className="be-table">
          <thead>
            <tr>
              <th className="be-col-checkbox">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll}
                  checked={filteredProducts.length > 0 && selectedRows.size === filteredProducts.length}
                />
              </th>
              <th>SKU</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Hidden</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(prod => (
              <tr key={prod.id} className={selectedRows.has(prod.id) ? 'selected' : ''}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedRows.has(prod.id)}
                    onChange={() => toggleProductSelect(prod.id)}
                  />
                </td>
                <td><code>{prod.sku || '—'}</code></td>
                <td>{prod.name}</td>
                <td>
                  <div className={`be-price-cell ${hasOverride(prod.id, 'price') ? 'has-override' : ''}`}>
                    <input
                      type="number"
                      step="0.01"
                      className="be-price-input"
                      value={editingPrices[prod.id] || ''}
                      onChange={e => setEditingPrices({...editingPrices, [prod.id]: e.target.value})}
                      onBlur={e => savePriceChange(prod, e.target.value)}
                    />
                    {hasOverride(prod.id, 'price') && <span className="be-badge">🔸</span>}
                  </div>
                </td>
                <td>{prod.category}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={editingHidden[prod.id]}
                    onChange={e => {
                      const val = e.target.checked
                      setEditingHidden({...editingHidden, [prod.id]: val})
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showBulkPriceModal && (
        <div className="be-modal-overlay" onClick={() => setShowBulkPriceModal(false)}>
          <div className="be-modal" onClick={e => e.stopPropagation()}>
            <div className="be-modal-header">
              <h3>Set Price for {selectedRows.size} Products</h3>
              <button onClick={() => setShowBulkPriceModal(false)}>✕</button>
            </div>
            <div className="be-modal-body">
              <label>Price:</label>
              <input 
                type="number" 
                step="0.01" 
                className="be-modal-input"
                value={bulkPrice}
                onChange={e => setBulkPrice(e.target.value)}
              />
            </div>
            <div className="be-modal-actions">
              <button onClick={() => setShowBulkPriceModal(false)} className="be-btn be-btn-secondary">Cancel</button>
              <button onClick={applyBulkPrice} className="be-btn be-btn-primary">Apply</button>
            </div>
          </div>
        </div>
      )}

      {toast.message && (
        <div className={`be-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <style jsx>{`
        .bulk-edit-wrap { padding: 20px; background: #f5f4f0; min-height: 100%; overflow-y: auto; flex: 1; }
        .be-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .be-subtitle { color: #9a948c; font-size: 14px; }
        .be-customer-selector { background: white; padding: 12px; border: 1px solid #e2ddd8; border-radius: 10px; min-width: 250px; }
        .be-toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
        .be-search { flex: 1; padding: 10px; border: 1px solid #e2ddd8; border-radius: 6px; }
        .be-bulk-bar { display: flex; gap: 10px; align-items: center; padding: 12px; background: #fdf0ef; border: 1px solid #f0c5c0; border-radius: 8px; margin-bottom: 16px; }
        .be-table-wrap { background: white; border: 1px solid #e2ddd8; border-radius: 10px; overflow-x: auto; }
        .be-table { width: 100%; border-collapse: collapse; }
        .be-table th, .be-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2ddd8; font-size: 13px; }
        .be-table tr.selected { background: #fdf0ef; }
        .be-price-input { width: 80px; padding: 4px; border: 1px solid #e2ddd8; border-radius: 4px; }
        .has-override { background: #fdf0ef; border-radius: 4px; padding: 2px; }
        .be-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .be-modal { background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; }
        .be-toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; color: white; z-index: 2000; }
        .be-toast.success { background: #2d7a4f; }
        .be-toast.error { background: #c0392b; }
      `}</style>
    </div>
  )
}

export default BulkEditView

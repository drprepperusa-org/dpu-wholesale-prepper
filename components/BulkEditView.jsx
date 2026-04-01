'use client';
import React, { useState, useEffect, useMemo } from 'react'

function BulkEditView({ initialCustomers, initialProducts, superCategories, categoriesBySuper, onLoadProducts }) {
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
    if (!bulkSuperCat || !categoriesBySuper) return []
    return categoriesBySuper[parseInt(bulkSuperCat)] || []
  }, [bulkSuperCat, categoriesBySuper])

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

  const saveSuperCatChange = async (prod, newSuperCatId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/products/bulk', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [prod.id], super_category_id: parseInt(newSuperCatId) })
      })
      if (!response.ok) throw new Error('Failed')
      const sc = (superCategories || []).find(s => s.id == newSuperCatId)
      setProducts(products.map(p => p.id === prod.id ? { ...p, super_category_id: parseInt(newSuperCatId), super_category: sc?.name || p.super_category } : p))
      setEditingSuper(prev => ({ ...prev, [prod.id]: parseInt(newSuperCatId) }))
      showToast('\u2705 Super Category updated')
    } catch (e) { showToast('Failed to save super category', 'error') }
  }

  const saveCatChange = async (prod, newCatId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/products/bulk', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [prod.id], category_id: parseInt(newCatId) })
      })
      if (!response.ok) throw new Error('Failed')
      const allCats = Object.values(categoriesBySuper || {}).flat()
      const cat = allCats.find(c => c.id == newCatId)
      setProducts(products.map(p => p.id === prod.id ? { ...p, category_id: parseInt(newCatId), category: cat?.name || p.category } : p))
      setEditingCats(prev => ({ ...prev, [prod.id]: parseInt(newCatId) }))
      showToast('\u2705 Category updated')
    } catch (e) { showToast('Failed to save category', 'error') }
  }

  const saveHiddenChange = async (prod, isHidden) => {
    if (selectedMode === 'all') {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/admin/products/bulk', {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [prod.id], is_hidden: isHidden })
        })
        if (!response.ok) throw new Error('Failed')
        setProducts(products.map(p => p.id === prod.id ? { ...p, is_hidden: isHidden } : p))
        showToast(`\u2705 Product ${isHidden ? 'hidden' : 'shown'}`)
      } catch (e) { showToast('Failed to save visibility', 'error') }
    } else {
      await setOverride(prod.id, { is_hidden: isHidden })
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
      setBulkPrice('')
    } catch (e) {
      showToast('Failed to apply bulk price', 'error')
    }
  }

  const applyBulkHide = async () => {
    const ids = Array.from(selectedRows)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/bulk/visibility', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productIds: ids, is_hidden: true })
      })
      if (!response.ok) throw new Error('Failed')
      setProducts(products.map(p => ids.includes(p.id) ? { ...p, is_hidden: true } : p))
      setEditingHidden(prev => {
        const next = { ...prev }
        ids.forEach(id => { next[id] = true })
        return next
      })
      showToast(`🚫 ${ids.length} products hidden`)
      setSelectedRows(new Set())
    } catch (e) {
      showToast('Failed to hide products', 'error')
    }
  }

  const applyBulkCategory = async () => {
    const ids = Array.from(selectedRows)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/products/bulk', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids,
          super_category_id: parseInt(bulkSuperCat),
          category_id: parseInt(bulkCat)
        })
      })
      if (!response.ok) throw new Error('Failed to apply bulk category')
      showToast(`✅ Applied to ${ids.length} products`)
      setSelectedRows(new Set())
      setShowBulkCategoryModal(false)
      setBulkSuperCat('')
      setBulkCat('')
    } catch (e) {
      showToast('Failed to apply bulk category', 'error')
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
          <button onClick={() => setShowBulkPriceModal(true)} className="be-bulk-btn be-bulk-price">💰 Set Price</button>
          <button onClick={() => setShowBulkCategoryModal(true)} className="be-bulk-btn be-bulk-cat">📂 Set Category</button>
          <button onClick={applyBulkHide} className="be-bulk-btn be-bulk-hide">🚫 Hide</button>
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
              <th>Super Category</th>
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
                <td><code>{prod.sku || '\u2014'}</code></td>
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
                    {hasOverride(prod.id, 'price') && <span className="be-badge">{'\uD83D\uDD38'}</span>}
                  </div>
                </td>
                <td>
                  <select
                    className="be-select-inline"
                    value={editingSuper[prod.id] || prod.super_category_id || ''}
                    onChange={e => saveSuperCatChange(prod, e.target.value)}
                  >
                    {(superCategories || []).map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="be-select-inline"
                    value={editingCats[prod.id] || prod.category_id || ''}
                    onChange={e => saveCatChange(prod, e.target.value)}
                  >
                    {((categoriesBySuper || {})[editingSuper[prod.id] || prod.super_category_id] || []).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className={`be-hidden-cell ${hasOverride(prod.id, 'hidden') ? 'has-override' : ''}`}>
                    <input
                      type="checkbox"
                      checked={editingHidden[prod.id] || false}
                      onChange={e => {
                        const val = e.target.checked
                        setEditingHidden({...editingHidden, [prod.id]: val})
                        saveHiddenChange(prod, val)
                      }}
                    />
                    {hasOverride(prod.id, 'hidden') && <span className="be-badge">{'\uD83D\uDD38'}</span>}
                  </div>
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
              <button onClick={() => setShowBulkPriceModal(false)} className="be-modal-close">{'\u2715'}</button>
            </div>
            <div className="be-modal-body">
              <label>Price:</label>
              <input
                type="number"
                step="0.01"
                className="be-modal-input"
                value={bulkPrice}
                onChange={e => setBulkPrice(e.target.value)}
                placeholder="Enter price"
              />
              <p className="be-modal-note">Leave blank to skip price changes</p>
            </div>
            <div className="be-modal-actions">
              <button onClick={() => setShowBulkPriceModal(false)} className="be-btn be-btn-secondary">Cancel</button>
              <button onClick={applyBulkPrice} className="be-btn be-btn-primary" disabled={!bulkPrice || parseFloat(bulkPrice) <= 0}>Apply to {selectedRows.size}</button>
            </div>
          </div>
        </div>
      )}

      {showBulkCategoryModal && (
        <div className="be-modal-overlay" onClick={() => setShowBulkCategoryModal(false)}>
          <div className="be-modal" onClick={e => e.stopPropagation()}>
            <div className="be-modal-header">
              <h3>Set Category for {selectedRows.size} Products</h3>
              <button onClick={() => setShowBulkCategoryModal(false)} className="be-modal-close">{'\u2715'}</button>
            </div>
            <div className="be-modal-body">
              <label>Super Category:</label>
              <select value={bulkSuperCat} onChange={e => { setBulkSuperCat(e.target.value); setBulkCat(''); }} className="be-modal-select">
                <option value="">{'\u2014'} Select {'\u2014'}</option>
                {(superCategories || []).map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
              <label>Category:</label>
              <select value={bulkCat} onChange={e => setBulkCat(e.target.value)} className="be-modal-select" disabled={!bulkSuperCat}>
                <option value="">{'\u2014'} Select {'\u2014'}</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="be-modal-note">Leave blank to skip category changes</p>
            </div>
            <div className="be-modal-actions">
              <button onClick={() => setShowBulkCategoryModal(false)} className="be-btn be-btn-secondary">Cancel</button>
              <button onClick={applyBulkCategory} className="be-btn be-btn-primary" disabled={!bulkCat}>Apply to {selectedRows.size}</button>
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
        .bulk-edit-wrap { padding: 20px; background: var(--bg); min-height: 100%; overflow-y: auto; flex: 1; font-family: 'DM Sans', sans-serif; }
        .be-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .be-header h2 { color: var(--text); }
        .be-subtitle { color: var(--muted); font-size: 14px; }
        .be-customer-selector { background: var(--surface); padding: 12px; border: 1px solid var(--border); border-radius: 10px; min-width: 250px; }
        .be-customer-selector label { color: var(--sub); font-size: 13px; }
        .be-select { font-family: 'DM Sans', sans-serif; color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; background: var(--bg); }
        .be-info { color: var(--muted); font-size: 12px; }
        .be-toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
        .be-search { flex: 1; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-family: 'DM Sans', sans-serif; color: var(--text); background: var(--surface); }
        .be-search:focus { outline: none; border-color: var(--red); }
        .be-result-count { color: var(--muted); font-size: 13px; }
        .be-bulk-bar { display: flex; gap: 8px; align-items: center; padding: 10px 16px; background: var(--red-light); border: 1px solid var(--red-mid); border-radius: 8px; margin-bottom: 16px; }
        .be-bulk-count { font-size: 13px; font-weight: 600; color: var(--red); margin-right: 4px; }
        .be-bulk-btn { padding: 5px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--sub); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .be-bulk-btn:hover { border-color: var(--red); color: var(--red); }
        .be-bulk-price { background: var(--surface); color: var(--sub); border: 1px solid var(--border); }
        .be-bulk-price:hover { border-color: var(--red); color: var(--red); }
        .be-bulk-cat { background: var(--surface); color: var(--sub); border: 1px solid var(--border); }
        .be-bulk-cat:hover { border-color: var(--red); color: var(--red); }
        .be-bulk-hide { background: var(--red-light); color: var(--red); border: 1px solid var(--red-mid); }
        .be-bulk-hide:hover { background: var(--red); color: #fff; }
        .be-bulk-deselect { background: var(--bg); color: var(--muted); border: 1px solid var(--border); margin-left: auto; }
        .be-bulk-deselect:hover { color: var(--text); border-color: var(--text); }
        .be-table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow-x: auto; box-shadow: var(--shadow); }
        .be-table { width: 100%; border-collapse: collapse; }
        .be-table th { background: var(--bg); color: var(--muted); font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
        .be-table th, .be-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); }
        .be-table tr:hover { background: var(--bg); }
        .be-table tr.selected { background: var(--red-light); }
        .be-price-input { width: 80px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; font-family: 'DM Sans', sans-serif; color: var(--text); }
        .be-price-input:focus { outline: none; border-color: var(--red); }
        .has-override { background: var(--red-light); border-radius: 4px; padding: 2px; }
        .be-select-inline { padding: 6px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; background: var(--surface); font-family: 'DM Sans', sans-serif; color: var(--text); cursor: pointer; max-width: 160px; }
        .be-select-inline:focus { outline: none; border-color: var(--red); }
        .be-hidden-cell { display: flex; align-items: center; gap: 4px; }
        .be-badge { font-size: 10px; }
        .be-price-cell { display: flex; align-items: center; gap: 4px; }
        .be-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .be-modal { background: var(--surface); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px; width: 90%; font-family: 'DM Sans', sans-serif; overflow: hidden; }
        .be-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border); }
        .be-modal-header h3 { margin: 0; color: var(--text); font-size: 16px; }
        .be-modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--muted); padding: 4px; }
        .be-modal-close:hover { color: var(--red); }
        .be-modal-body { padding: 16px; }
        .be-modal-body label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
        .be-modal-input, .be-modal-select { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; margin-bottom: 12px; font-family: 'DM Sans', sans-serif; color: var(--text); background: var(--bg); box-sizing: border-box; }
        .be-modal-input:focus, .be-modal-select:focus { outline: none; border-color: var(--red); }
        .be-modal-select:disabled { opacity: 0.5; cursor: not-allowed; }
        .be-modal-note { margin: 8px 0 0 0; font-size: 12px; color: var(--muted); font-style: italic; }
        .be-modal-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); justify-content: flex-end; }
        .be-btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .be-btn-primary { background: var(--red); color: white; }
        .be-btn-primary:hover:not(:disabled) { background: #a83526; }
        .be-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .be-btn-secondary { background: var(--bg); color: var(--text); border: 1px solid var(--border); }
        .be-btn-secondary:hover { background: var(--border); }
        .be-toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; color: white; z-index: 2000; font-family: 'DM Sans', sans-serif; }
        .be-toast.success { background: var(--green); }
        .be-toast.error { background: var(--red); }
      `}</style>
    </div>
  )
}

export default BulkEditView

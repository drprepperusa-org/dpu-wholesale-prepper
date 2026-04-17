'use client';
import React, { useState, useEffect, useMemo } from 'react'
import { Search, DollarSign, FolderOpen, Ban, X, CheckCircle, XCircle, Tag } from 'lucide-react'

function BulkEditView({ initialCustomers, initialProducts, superCategories, categoriesBySuper, onLoadProducts }) {
  const [selectedMode, setSelectedMode] = useState('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [editingPrices, setEditingPrices] = useState({})
  const [editingNames, setEditingNames] = useState({})
  const [editingBrands, setEditingBrands] = useState({})
  const [editingSkus, setEditingSkus] = useState({})
  const [editingWeights, setEditingWeights] = useState({})
  const [editingBags, setEditingBags] = useState({})
  const [editingUnits, setEditingUnits] = useState({})
  const [editingCases, setEditingCases] = useState({})
  const [editingSuper, setEditingSuper] = useState({})
  const [editingCats, setEditingCats] = useState({})
  const [editingHidden, setEditingHidden] = useState({})
  const [editingOos, setEditingOos] = useState({})
  const [overrides, setOverrides] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false)
  const [showBulkBrandModal, setShowBulkBrandModal] = useState(false)
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false)
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkBrand, setBulkBrand] = useState('')
  const [bulkSuperCat, setBulkSuperCat] = useState('')
  const [bulkCat, setBulkCat] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'success' })

  useEffect(() => {
    if (initialProducts) {
      const prods = JSON.parse(JSON.stringify(initialProducts))
      setProducts(prods)
      const names = {}, prices = {}, brands = {}, skus = {}, weights = {}, bags = {}, units = {}, cases = {}, supers = {}, cats = {}, hiddens = {}, ooss = {}
      prods.forEach(p => { names[p.id] = p.name || ''; prices[p.id] = p.price; brands[p.id] = p.brand || ''; skus[p.id] = p.sku || ''; weights[p.id] = p.weight || ''; bags[p.id] = p.bags_per_case || ''; units[p.id] = p.units_per_case || ''; cases[p.id] = p.cases_per_pallet || ''; supers[p.id] = p.super_category_id; cats[p.id] = p.category_id; hiddens[p.id] = p.is_hidden; ooss[p.id] = p.is_oos })
      setEditingNames(names); setEditingPrices(prices); setEditingBrands(brands); setEditingSkus(skus); setEditingWeights(weights); setEditingBags(bags); setEditingUnits(units); setEditingCases(cases); setEditingSuper(supers); setEditingCats(cats); setEditingHidden(hiddens); setEditingOos(ooss)
    }
  }, [initialProducts])

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    const q = searchQuery.toLowerCase()
    return products.filter(p => (p.sku && p.sku.toLowerCase().includes(q)) || p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)) || (p.super_category && p.super_category.toLowerCase().includes(q)))
  }, [products, searchQuery])

  const totalProducts = products.length
  const visibleProductCount = useMemo(() => {
    if (!selectedCustomerId) return totalProducts
    return products.filter(p => { if (p.is_hidden) return false; const override = overrides[p.id]; if (override?.hidden) return false; return true }).length
  }, [products, selectedCustomerId, overrides, totalProducts])

  const availableCategories = useMemo(() => {
    if (!bulkSuperCat || !categoriesBySuper) return []
    return categoriesBySuper[parseInt(bulkSuperCat)] || []
  }, [bulkSuperCat, categoriesBySuper])

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast({ message: '', type: 'success' }), 3000) }

  const onModeChange = async (e) => {
    const value = e.target.value; setSelectedMode(value); setSelectedRows(new Set())
    if (value === 'all') { setSelectedCustomerId(null); setOverrides({}) }
    else { const custId = value.split(':')[1]; setSelectedCustomerId(custId); await loadOverridesForCustomer(custId) }
  }

  const loadOverridesForCustomer = async (custId) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/customers/${custId}/products`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (!response.ok) throw new Error('Failed to load customer products')
      const data = await response.json()
      const newOverrides = {}
      const prods = Array.isArray(data) ? data : (data.products || [])
      prods.forEach(prod => { if (prod.override_price !== null || prod.override_is_hidden) newOverrides[prod.id] = { price: prod.override_price, hidden: prod.override_is_hidden } })
      setOverrides(newOverrides)
    } catch (e) { console.error('Error loading overrides:', e); showToast('Failed to load customer overrides', 'error') }
    finally { setIsLoading(false) }
  }

  const toggleSelectAll = (e) => { if (e.target.checked) setSelectedRows(new Set(filteredProducts.map(p => p.id))); else setSelectedRows(new Set()) }
  const toggleProductSelect = (id) => { const n = new Set(selectedRows); if (n.has(id)) n.delete(id); else n.add(id); setSelectedRows(n) }
  const hasOverride = (productId, type) => { if (!selectedCustomerId) return false; const o = overrides[productId]; if (!o) return false; if (type === 'price') return o.price !== null; if (type === 'hidden') return o.hidden; return false }

  const savePriceChange = async (prod, newPrice) => {
    const price = parseFloat(newPrice)
    if (selectedMode === 'all') {
      try { const token = localStorage.getItem('token'); const r = await fetch(`/api/admin/products/bulk`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [prod.id], price }) }); if (!r.ok) throw new Error('Failed'); setProducts(products.map(p => p.id === prod.id ? { ...p, price } : p)); showToast(`Price updated to $${price}`) }
      catch (e) { showToast('Failed to save price', 'error') }
    } else { await setOverrideData(prod.id, { override_price: price }) }
  }

  const saveNameChange = async (prod, newName) => {
    const name = newName.trim()
    if (!name) { setEditingNames({ ...editingNames, [prod.id]: prod.name }); return }
    try { const token = localStorage.getItem('token'); const r = await fetch(`/api/admin/products/bulk`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [prod.id], name }) }); if (!r.ok) throw new Error('Failed'); setProducts(products.map(p => p.id === prod.id ? { ...p, name } : p)); showToast(`Name updated`) }
    catch (e) { showToast('Failed to save name', 'error') }
  }

  const saveFieldChange = async (prod, field, value) => {
    try {
      const token = localStorage.getItem('token')
      const body = { ids: [prod.id], [field]: value }
      const r = await fetch('/api/admin/products/bulk', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error('Failed')
      setProducts(products.map(p => p.id === prod.id ? { ...p, [field]: value } : p))
      showToast(`Updated`)
    } catch (e) { showToast('Failed to save', 'error') }
  }

  const saveBrandChange = async (prod, newBrand) => {
    const brand = newBrand.trim()
    try { const token = localStorage.getItem('token'); const r = await fetch(`/api/admin/products/bulk`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [prod.id], brand }) }); if (!r.ok) throw new Error('Failed'); setProducts(products.map(p => p.id === prod.id ? { ...p, brand } : p)); showToast(`Brand updated`) }
    catch (e) { showToast('Failed to save brand', 'error') }
  }

  const setOverrideData = async (productId, data) => {
    try { const token = localStorage.getItem('token'); const r = await fetch(`/api/admin/products/${productId}/override`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: selectedCustomerId, ...data }) }); if (!r.ok) throw new Error('Failed'); const result = await r.json(); setOverrides({ ...overrides, [productId]: { price: result.override.override_price, hidden: result.override.override_is_hidden } }); showToast('Override saved') }
    catch (e) { showToast('Failed to save override', 'error') }
  }

  const saveSuperCatChange = async (prod, newSuperCatId) => {
    try { const token = localStorage.getItem('token'); const r = await fetch('/api/admin/products/bulk', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [prod.id], super_category_id: parseInt(newSuperCatId) }) }); if (!r.ok) throw new Error('Failed'); const sc = (superCategories || []).find(s => s.id == newSuperCatId); setProducts(products.map(p => p.id === prod.id ? { ...p, super_category_id: parseInt(newSuperCatId), super_category: sc?.name || p.super_category } : p)); setEditingSuper(prev => ({ ...prev, [prod.id]: parseInt(newSuperCatId) })); showToast('Super Category updated') }
    catch (e) { showToast('Failed to save super category', 'error') }
  }

  const saveCatChange = async (prod, newCatId) => {
    try { const token = localStorage.getItem('token'); const r = await fetch('/api/admin/products/bulk', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [prod.id], category_id: parseInt(newCatId) }) }); if (!r.ok) throw new Error('Failed'); const allCats = Object.values(categoriesBySuper || {}).flat(); const cat = allCats.find(c => c.id == newCatId); setProducts(products.map(p => p.id === prod.id ? { ...p, category_id: parseInt(newCatId), category: cat?.name || p.category } : p)); setEditingCats(prev => ({ ...prev, [prod.id]: parseInt(newCatId) })); showToast('Category updated') }
    catch (e) { showToast('Failed to save category', 'error') }
  }

  const saveHiddenChange = async (prod, isHidden) => {
    if (selectedMode === 'all') {
      try { const token = localStorage.getItem('token'); const r = await fetch('/api/admin/products/bulk', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [prod.id], is_hidden: isHidden }) }); if (!r.ok) throw new Error('Failed'); setProducts(products.map(p => p.id === prod.id ? { ...p, is_hidden: isHidden } : p)); showToast(`Product ${isHidden ? 'hidden' : 'shown'}`) }
      catch (e) { showToast('Failed to save visibility', 'error') }
    } else { await setOverrideData(prod.id, { is_hidden: isHidden }) }
  }

  const applyBulkPrice = async () => {
    const ids = Array.from(selectedRows); const price = parseFloat(bulkPrice)
    try {
      const token = localStorage.getItem('token')
      if (selectedMode === 'all') { const r = await fetch('/api/admin/products/bulk', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, price }) }); if (!r.ok) throw new Error('Failed'); setProducts(products.map(p => ids.includes(p.id) ? { ...p, price } : p)) }
      else { const r = await fetch('/api/admin/products/bulk-override', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ product_ids: ids, customer_id: selectedCustomerId, override_price: price }) }); if (!r.ok) throw new Error('Failed'); await loadOverridesForCustomer(selectedCustomerId) }
      showToast(`Applied to ${ids.length} products`); setSelectedRows(new Set()); setShowBulkPriceModal(false); setBulkPrice('')
    } catch (e) { showToast('Failed to apply bulk price', 'error') }
  }

  const applyBulkBrand = async () => {
    const ids = Array.from(selectedRows); const brand = bulkBrand.trim()
    try {
      const token = localStorage.getItem('token')
      const r = await fetch('/api/admin/products/bulk', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, brand }) }); if (!r.ok) throw new Error('Failed')
      setProducts(products.map(p => ids.includes(p.id) ? { ...p, brand } : p))
      setEditingBrands(prev => { const next = { ...prev }; ids.forEach(id => { next[id] = brand }); return next })
      showToast(`Brand set to "${brand}" for ${ids.length} products`); setSelectedRows(new Set()); setShowBulkBrandModal(false); setBulkBrand('')
    } catch (e) { showToast('Failed to apply bulk brand', 'error') }
  }

  const applyBulkHide = async () => {
    const ids = Array.from(selectedRows)
    try { const token = localStorage.getItem('token'); const r = await fetch('/api/admin/bulk/visibility', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ productIds: ids, is_hidden: true }) }); if (!r.ok) throw new Error('Failed'); setProducts(products.map(p => ids.includes(p.id) ? { ...p, is_hidden: true } : p)); setEditingHidden(prev => { const next = { ...prev }; ids.forEach(id => { next[id] = true }); return next }); showToast(`${ids.length} products hidden`); setSelectedRows(new Set()) }
    catch (e) { showToast('Failed to hide products', 'error') }
  }

  const applyBulkCategory = async () => {
    const ids = Array.from(selectedRows)
    try { const token = localStorage.getItem('token'); const r = await fetch('/api/admin/products/bulk', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, super_category_id: parseInt(bulkSuperCat), category_id: parseInt(bulkCat) }) }); if (!r.ok) throw new Error('Failed'); showToast(`Applied to ${ids.length} products`); setSelectedRows(new Set()); setShowBulkCategoryModal(false); setBulkSuperCat(''); setBulkCat('') }
    catch (e) { showToast('Failed to apply bulk category', 'error') }
  }

  return (
    <div className="bg-slate-50 min-h-full overflow-y-auto flex-1 max-sm:pb-[70px]">
      {/* Sticky header + search bar — stays visible while scrolling the product list */}
      <div className="sticky top-0 z-20 bg-slate-50 px-5 pt-5 max-sm:px-3 max-sm:pt-3">
        {/* Header */}
        <div className="flex justify-between items-start mb-5 gap-4 max-sm:flex-col max-sm:gap-2.5 max-sm:mb-3.5">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 m-0 max-sm:text-[17px]">Bulk Edit Products</h2>
            <span className="text-slate-400 text-[13px] mt-0.5 max-sm:text-xs">Edit prices, categories, and visibility across all products</span>
          </div>
          <div className="flex flex-col gap-1 max-sm:w-full">
            <div className="bg-white p-2.5 px-3.5 border border-slate-200 rounded-xl min-w-[220px] flex items-center gap-2 shadow-sm max-sm:min-w-0 max-sm:w-full max-sm:p-2">
              <label className="text-slate-500 text-xs font-medium whitespace-nowrap">View as:</label>
              <select value={selectedMode} onChange={onModeChange}
                className="text-slate-800 border border-slate-200 rounded-md px-2.5 py-1.5 bg-slate-50 text-[13px] max-sm:w-full max-sm:text-sm">
                <option value="all">All Customers (defaults)</option>
                {initialCustomers?.map(c => <option key={c.id} value={`customer:${c.id}`}>{c.company_name}</option>)}
              </select>
            </div>
            {selectedCustomerId && <span className="text-slate-400 text-[11px] text-right">This customer sees {visibleProductCount} of {totalProducts} products</span>}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2.5 mb-3 items-center max-sm:flex-col max-sm:gap-1.5">
          <div className="flex-1 relative max-sm:w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} type="text" placeholder="Search SKU, name, category..."
              className="w-full py-2.5 pl-9 pr-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white shadow-sm focus:outline-none focus:border-indigo-400 placeholder:text-slate-400 max-sm:!text-base" />
          </div>
          <span className="text-slate-400 text-xs whitespace-nowrap max-sm:self-end">{filteredProducts.length} products</span>
        </div>

        {/* Bulk action bar — inside sticky so it stays visible while scrolling */}
        {selectedRows.size > 0 && (
          <div className="flex gap-2 items-center px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg mb-2 flex-wrap max-sm:px-2.5 max-sm:py-2 max-sm:gap-1.5">
            <span className="text-[13px] font-semibold text-indigo-500 mr-1 max-sm:text-xs max-sm:w-full">{selectedRows.size} selected</span>
            <button onClick={() => setShowBulkPriceModal(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold cursor-pointer transition-colors hover:border-indigo-400 hover:text-indigo-500 max-sm:text-[11px] max-sm:px-2.5"><DollarSign className="w-3.5 h-3.5" /> Set Price</button>
            <button onClick={() => setShowBulkBrandModal(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold cursor-pointer transition-colors hover:border-indigo-400 hover:text-indigo-500 max-sm:text-[11px] max-sm:px-2.5"><Tag className="w-3.5 h-3.5" /> Set Brand</button>
            <button onClick={() => setShowBulkCategoryModal(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold cursor-pointer transition-colors hover:border-indigo-400 hover:text-indigo-500 max-sm:text-[11px] max-sm:px-2.5"><FolderOpen className="w-3.5 h-3.5" /> Set Category</button>
            <button onClick={applyBulkHide} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 text-xs font-semibold cursor-pointer transition-colors hover:bg-red-500 hover:text-white max-sm:text-[11px] max-sm:px-2.5"><Ban className="w-3.5 h-3.5" /> Hide</button>
            <button onClick={() => setSelectedRows(new Set())} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold cursor-pointer transition-colors hover:text-slate-700 hover:border-slate-300 ml-auto max-sm:text-[11px] max-sm:px-2.5">Deselect</button>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 max-sm:px-3 max-sm:pb-3">

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-sm:rounded-lg max-sm:overflow-x-auto">
        <table className="w-full border-collapse max-sm:min-w-[500px]">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 w-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">
                <input type="checkbox" onChange={toggleSelectAll} checked={filteredProducts.length > 0 && selectedRows.size === filteredProducts.length} className="accent-indigo-500" />
              </th>
              <th className="sticky top-0 z-10 w-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2"></th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">SKU</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Name</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Brand</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Price</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Weight</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Bags/Case</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Units/Case</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Cs/Pallet</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Super Cat</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Category</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">Hidden</th>
              <th className="sticky top-0 z-10 bg-slate-50 text-slate-400 text-[10px] font-semibold uppercase tracking-wider p-3 text-left border-b border-slate-200 max-sm:p-2 max-sm:text-[9px]">OOS</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(prod => (
              <tr key={prod.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${selectedRows.has(prod.id) ? 'bg-indigo-50' : ''}`}>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]"><input type="checkbox" checked={selectedRows.has(prod.id)} onChange={() => toggleProductSelect(prod.id)} className="accent-indigo-500" /></td>
                <td className="p-1.5 max-sm:p-1">
                  <div className="w-20 h-20 max-sm:w-12 max-sm:h-12 rounded-md border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt="" className="w-full h-full object-contain p-0.5" onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="text-[8px] text-slate-300">N/A</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="text" value={editingSkus[prod.id] ?? prod.sku ?? ''} onChange={e => setEditingSkus({ ...editingSkus, [prod.id]: e.target.value })} onBlur={e => { if (e.target.value !== (prod.sku || '')) saveFieldChange(prod, 'sku', e.target.value) }}
                    placeholder="—" className="w-24 px-1 py-1 border border-slate-200 rounded text-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-400 max-sm:w-[70px] max-sm:p-0.5" />
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="text" value={editingNames[prod.id] ?? prod.name} onChange={e => setEditingNames({ ...editingNames, [prod.id]: e.target.value })} onBlur={e => { if (e.target.value.trim() !== (prod.name || '')) saveNameChange(prod, e.target.value) }}
                    className="w-full min-w-[120px] px-1 py-1 border border-slate-200 rounded text-slate-800 text-[13px] focus:outline-none focus:border-indigo-400 max-sm:text-xs max-sm:p-0.5" />
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="text" value={editingBrands[prod.id] ?? ''} onChange={e => setEditingBrands({ ...editingBrands, [prod.id]: e.target.value })} onBlur={e => { if (e.target.value !== (prod.brand || '')) saveBrandChange(prod, e.target.value) }}
                    placeholder="—"
                    className="w-24 px-1 py-1 border border-slate-200 rounded text-slate-800 text-[13px] focus:outline-none focus:border-indigo-400 max-sm:w-[70px] max-sm:text-xs max-sm:p-0.5" />
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <div className={`flex items-center gap-1 ${hasOverride(prod.id, 'price') ? 'bg-indigo-50 rounded p-0.5' : ''}`}>
                    <input type="number" step="0.01" value={editingPrices[prod.id] || ''} onChange={e => setEditingPrices({ ...editingPrices, [prod.id]: e.target.value })} onBlur={e => savePriceChange(prod, e.target.value)}
                      className="w-20 px-1 py-1 border border-slate-200 rounded text-slate-800 text-[13px] focus:outline-none focus:border-indigo-400 max-sm:w-[60px] max-sm:text-xs max-sm:p-0.5" />
                    {hasOverride(prod.id, 'price') && <span className="text-[10px] text-amber-500">●</span>}
                  </div>
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="text" value={editingWeights[prod.id] ?? prod.weight ?? ''} onChange={e => setEditingWeights({ ...editingWeights, [prod.id]: e.target.value })} onBlur={e => { if (e.target.value !== (prod.weight || '')) saveFieldChange(prod, 'weight', e.target.value) }}
                    placeholder="—" className="w-16 px-1 py-1 border border-slate-200 rounded text-slate-800 text-[13px] focus:outline-none focus:border-indigo-400 max-sm:w-[50px] max-sm:text-xs max-sm:p-0.5" />
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="text" value={editingBags[prod.id] ?? prod.bags_per_case ?? ''} onChange={e => setEditingBags({ ...editingBags, [prod.id]: e.target.value })} onBlur={e => { if (e.target.value !== (prod.bags_per_case || '')) saveFieldChange(prod, 'bags_per_case', e.target.value) }}
                    placeholder="—" className="w-14 px-1 py-1 border border-slate-200 rounded text-slate-800 text-[13px] focus:outline-none focus:border-indigo-400 max-sm:w-[40px] max-sm:text-xs max-sm:p-0.5" />
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="text" value={editingUnits[prod.id] ?? prod.units_per_case ?? ''} onChange={e => setEditingUnits({ ...editingUnits, [prod.id]: e.target.value })} onBlur={e => { if (e.target.value !== (prod.units_per_case || '')) saveFieldChange(prod, 'units_per_case', e.target.value) }}
                    placeholder="—" className="w-14 px-1 py-1 border border-slate-200 rounded text-slate-800 text-[13px] focus:outline-none focus:border-indigo-400 max-sm:w-[40px] max-sm:text-xs max-sm:p-0.5" />
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="number" value={editingCases[prod.id] ?? prod.cases_per_pallet ?? ''} onChange={e => setEditingCases({ ...editingCases, [prod.id]: e.target.value })} onBlur={e => { if (String(e.target.value) !== String(prod.cases_per_pallet || '')) saveFieldChange(prod, 'cases_per_pallet', parseInt(e.target.value) || null) }}
                    placeholder="—" className="w-14 px-1 py-1 border border-slate-200 rounded text-slate-800 text-[13px] focus:outline-none focus:border-indigo-400 max-sm:w-[40px] max-sm:text-xs max-sm:p-0.5" />
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <select value={editingSuper[prod.id] || prod.super_category_id || ''} onChange={e => saveSuperCatChange(prod, e.target.value)}
                    className="px-1.5 py-1.5 border border-slate-200 rounded text-[13px] bg-white text-slate-800 cursor-pointer max-w-[160px] focus:outline-none focus:border-indigo-400 max-sm:text-[11px] max-sm:p-1 max-sm:max-w-[100px]">
                    {(superCategories || []).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <select value={editingCats[prod.id] || prod.category_id || ''} onChange={e => saveCatChange(prod, e.target.value)}
                    className="px-1.5 py-1.5 border border-slate-200 rounded text-[13px] bg-white text-slate-800 cursor-pointer max-w-[160px] focus:outline-none focus:border-indigo-400 max-sm:text-[11px] max-sm:p-1 max-sm:max-w-[100px]">
                    {((categoriesBySuper || {})[editingSuper[prod.id] || prod.super_category_id] || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <div className={`flex items-center gap-1 ${hasOverride(prod.id, 'hidden') ? 'bg-indigo-50 rounded p-0.5' : ''}`}>
                    <input type="checkbox" checked={editingHidden[prod.id] || false} onChange={e => { const val = e.target.checked; setEditingHidden({ ...editingHidden, [prod.id]: val }); saveHiddenChange(prod, val) }} className="accent-indigo-500" />
                    {hasOverride(prod.id, 'hidden') && <span className="text-[10px] text-amber-500">●</span>}
                  </div>
                </td>
                <td className="p-3 text-[13px] text-slate-800 max-sm:p-2 max-sm:text-[11px]">
                  <input type="checkbox" checked={editingOos[prod.id] || false} onChange={e => { const val = e.target.checked; setEditingOos({ ...editingOos, [prod.id]: val }); saveFieldChange(prod, 'is_oos', val) }} className="accent-amber-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* Bulk Price Modal */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowBulkPriceModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-[400px] w-[90%] overflow-hidden max-sm:max-w-full max-sm:mx-2.5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-200">
              <h3 className="m-0 text-slate-800 text-base font-semibold">Set Price for {selectedRows.size} Products</h3>
              <button onClick={() => setShowBulkPriceModal(false)} className="bg-transparent border-none cursor-pointer text-slate-400 p-1 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <label className="block mb-1.5 text-[13px] font-semibold text-slate-800">Price:</label>
              <input type="number" step="0.01" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="Enter price"
                className="w-full px-2.5 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-400" />
              <p className="text-xs text-slate-400 italic mt-2 mb-0">Leave blank to skip price changes</p>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-200 justify-end">
              <button onClick={() => setShowBulkPriceModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-[13px] font-semibold cursor-pointer hover:bg-slate-200">Cancel</button>
              <button onClick={applyBulkPrice} disabled={!bulkPrice || parseFloat(bulkPrice) <= 0}
                className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-[13px] font-semibold cursor-pointer transition-colors hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed">Apply to {selectedRows.size}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Brand Modal */}
      {showBulkBrandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowBulkBrandModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-[400px] w-[90%] overflow-hidden max-sm:max-w-full max-sm:mx-2.5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-200">
              <h3 className="m-0 text-slate-800 text-base font-semibold">Set Brand for {selectedRows.size} Products</h3>
              <button onClick={() => setShowBulkBrandModal(false)} className="bg-transparent border-none cursor-pointer text-slate-400 p-1 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <label className="block mb-1.5 text-[13px] font-semibold text-slate-800">Brand:</label>
              <input type="text" value={bulkBrand} onChange={e => setBulkBrand(e.target.value)} placeholder="e.g. Nongshim, Lay's"
                className="w-full px-2.5 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-400" />
              <p className="text-xs text-slate-400 italic mt-2 mb-0">Leave blank to clear brand from selected products</p>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-200 justify-end">
              <button onClick={() => setShowBulkBrandModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-[13px] font-semibold cursor-pointer hover:bg-slate-200">Cancel</button>
              <button onClick={applyBulkBrand}
                className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-[13px] font-semibold cursor-pointer transition-colors hover:bg-indigo-600">Apply to {selectedRows.size}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Category Modal */}
      {showBulkCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowBulkCategoryModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-[400px] w-[90%] overflow-hidden max-sm:max-w-full max-sm:mx-2.5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-200">
              <h3 className="m-0 text-slate-800 text-base font-semibold">Set Category for {selectedRows.size} Products</h3>
              <button onClick={() => setShowBulkCategoryModal(false)} className="bg-transparent border-none cursor-pointer text-slate-400 p-1 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <label className="block mb-1.5 text-[13px] font-semibold text-slate-800">Super Category:</label>
              <select value={bulkSuperCat} onChange={e => { setBulkSuperCat(e.target.value); setBulkCat(''); }}
                className="w-full px-2.5 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-400">
                <option value="">— Select —</option>
                {(superCategories || []).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
              <label className="block mb-1.5 text-[13px] font-semibold text-slate-800">Category:</label>
              <select value={bulkCat} onChange={e => setBulkCat(e.target.value)} disabled={!bulkSuperCat}
                className="w-full px-2.5 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">— Select —</option>
                {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-xs text-slate-400 italic mt-2 mb-0">Leave blank to skip category changes</p>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-200 justify-end">
              <button onClick={() => setShowBulkCategoryModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-[13px] font-semibold cursor-pointer hover:bg-slate-200">Cancel</button>
              <button onClick={applyBulkCategory} disabled={!bulkCat}
                className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-[13px] font-semibold cursor-pointer transition-colors hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed">Apply to {selectedRows.size}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.message && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-lg text-white z-[2000] shadow-lg max-sm:bottom-[70px] max-sm:left-3 max-sm:right-3 max-sm:text-center ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ animation: 'toastIn 0.3s ease' }}>
          <div className="flex items-center gap-2 justify-center text-sm">
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkEditView

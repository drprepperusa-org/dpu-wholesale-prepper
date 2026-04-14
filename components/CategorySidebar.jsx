'use client';
import React, { useState, useEffect, useMemo } from 'react'
import { Package, Search, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

function CategorySidebar({ isOpen, onClose, onSelectCategory, token, products = [] }) {
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSuper, setExpandedSuper] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [brandQuery, setBrandQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState(null)

  const emojiMap = {
    'Chips & Savory Snacks': '\uD83E\uDD54',
    'Noodles & Rice': '\uD83C\uDF5C',
    'Cookies & Wafers': '\uD83C\uDF6A',
    'Candy & Jelly': '\uD83C\uDF6C',
    'Ice Cream': '\uD83C\uDF66',
    'Beverages': '\uD83E\uDD64',
    'Korean Snacks': '\uD83C\uDDF0\uD83C\uDDF7'
  }

  const loadedRef = React.useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
    const headers = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    setLoading(true)
    fetch('/api/categories/hierarchy', { headers })
      .then(res => { if (!res.ok) throw new Error('Failed'); return res.json() })
      .then(data => { if (data.success) setHierarchy(data.hierarchy || []) })
      .catch(err => { console.error('Error loading hierarchy:', err); setError(err.message) })
      .finally(() => setLoading(false))
  }, [])

  const totalProducts = hierarchy.reduce((sum, cat) => sum + (cat.totalProducts || 0), 0)

  const filteredHierarchy = useMemo(() => {
    if (!searchQuery) return hierarchy
    const q = searchQuery.toLowerCase()
    return hierarchy.filter(sc =>
      sc.name.toLowerCase().includes(q) ||
      sc.categories?.some(c => c.name.toLowerCase().includes(q))
    )
  }, [hierarchy, searchQuery])

  const getEmoji = (name) => emojiMap[name] || '\uD83D\uDCE6'

  const brands = useMemo(() => {
    const brandMap = {}
    products.filter(p => p.brand && !p.is_hidden).forEach(p => {
      if (!brandMap[p.brand]) brandMap[p.brand] = 0
      brandMap[p.brand]++
    })
    return Object.entries(brandMap).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }))
  }, [products])

  const filteredBrands = useMemo(() => {
    if (!brandQuery) return brands
    const q = brandQuery.toLowerCase()
    return brands.filter(b => b.name.toLowerCase().includes(q))
  }, [brands, brandQuery])

  const selectAll = () => { setSelectedId(null); setExpandedSuper(null); setSelectedBrand(null); onSelectCategory(null) }
  const toggleSuper = (superCat) => { setExpandedSuper(expandedSuper === superCat.name ? null : superCat.name) }
  const selectSub = (subCat) => { setSelectedId(subCat.id || subCat.name); setSelectedBrand(null); onSelectCategory(subCat) }
  const selectBrand = (brand) => { setSelectedBrand(brand.name); setSelectedId(null); setExpandedSuper(null); onSelectCategory({ type: 'brand', name: brand.name }) }

  return (
    <>
      {/* Mobile overlay */}
      <div className={`fixed inset-0 bg-black/25 z-[150] top-14 hidden max-sm:block ${isOpen ? 'max-sm:!block' : 'max-sm:!hidden'}`}
        onClick={onClose} />

      {/* Sidebar */}
      <aside className={`w-[236px] min-w-[236px] bg-slate-900 overflow-y-auto sticky top-14 z-[160] shrink-0 transition-all duration-300 ease-out
        ${isOpen ? '' : '-ml-[236px]'}
        max-sm:fixed max-sm:left-0 max-sm:top-14 max-sm:bottom-16 max-sm:w-[55vw] max-sm:min-w-[55vw] max-sm:ml-0 max-sm:h-auto max-sm:overflow-y-auto max-sm:shadow-lg
        ${isOpen ? 'max-sm:translate-x-0' : 'max-sm:-translate-x-full'}
      `} style={{ height: 'calc(100vh - 56px)' }}>

        <div className="px-3.5 pt-3.5 pb-1.5">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 mb-2">Browse</div>
        </div>

        {/* Search */}
        <div className="px-2.5 pb-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder="Search Categories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-8 pr-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-[13px] outline-none transition-colors focus:border-indigo-400 placeholder:text-slate-500 max-sm:!text-base" />
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-center text-slate-500 text-[13px]">
            <div className="inline-block w-3.5 h-3.5 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin mr-2" />
            Loading...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400 text-[13px] flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        ) : (
          <>
            {/* All Products */}
            <div className={`flex items-center gap-2.5 px-3.5 py-3 cursor-pointer text-[13px] font-medium transition-colors border-b border-white/[0.06]
              ${selectedId === null ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              onClick={selectAll}>
              <Package className="w-3.5 h-3.5" />
              All Products
              <span className="ml-auto text-[11px] text-slate-400 bg-white/[0.08] px-2 py-0.5 rounded-full border border-white/10">{totalProducts}</span>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* Categories */}
            <div className="flex flex-col">
              {filteredHierarchy.map(superCat => (
                <div key={superCat.id}>
                  <div className={`w-full flex items-center gap-2.5 px-3.5 py-3 cursor-pointer text-[13px] font-medium transition-colors border-b border-white/[0.06]
                    ${expandedSuper === superCat.name ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                    onClick={() => toggleSuper(superCat)}>
                    <span className="text-sm w-[18px] text-center shrink-0">{superCat.emoji || getEmoji(superCat.name)}</span>
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{superCat.name}</span>
                    <span className="text-[11px] text-slate-400 bg-white/[0.08] px-2 py-0.5 rounded-full border border-white/10">{superCat.totalProducts}</span>
                    {expandedSuper === superCat.name
                      ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                    }
                  </div>

                  <div className={`overflow-hidden transition-all duration-250 ${expandedSuper === superCat.name ? 'max-h-[700px]' : 'max-h-0'}`}>
                    {superCat.categories?.map(subCat => (
                      <div key={subCat.id}
                        className={`flex items-center justify-between py-2.5 pr-3.5 pl-11 cursor-pointer text-xs transition-colors border-b border-white/[0.04]
                          ${selectedId === (subCat.id || subCat.name) ? 'text-indigo-400 bg-indigo-500/[0.08] font-medium' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                        onClick={() => selectSub(subCat)}>
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{subCat.name}</span>
                        <span className="text-[11px] text-slate-500">{subCat.productCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredHierarchy.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-[13px]">No categories found</div>
              )}
            </div>

            {/* Brand Search */}
            {brands.length > 0 && (
              <>
                <div className="h-px bg-white/[0.06]" />
                <div className="px-3.5 pt-3 pb-1.5">
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 mb-2">Brands</div>
                </div>
                <div className="px-2.5 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input type="text" placeholder="Search Brands..." value={brandQuery} onChange={e => setBrandQuery(e.target.value)}
                      className="w-full py-1.5 pl-8 pr-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-[12px] outline-none transition-colors focus:border-indigo-400 placeholder:text-slate-500 max-sm:!text-base" />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                  {filteredBrands.map(brand => (
                    <div key={brand.name}
                      className={`flex items-center justify-between px-3.5 py-2 cursor-pointer text-xs transition-colors border-b border-white/[0.04]
                        ${selectedBrand === brand.name ? 'text-indigo-400 bg-indigo-500/[0.08] font-medium' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                      onClick={() => selectBrand(brand)}>
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{brand.name}</span>
                      <span className="text-[11px] text-slate-500">{brand.count}</span>
                    </div>
                  ))}
                  {filteredBrands.length === 0 && brandQuery && (
                    <div className="p-3 text-center text-slate-500 text-[12px]">No brands found</div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </aside>
    </>
  )
}

export default CategorySidebar

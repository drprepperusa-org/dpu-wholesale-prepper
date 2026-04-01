'use client';
import React, { useState, useEffect, useMemo } from 'react'

function CategorySidebar({ isOpen, onClose, onSelectCategory, token }) {
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSuper, setExpandedSuper] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const emojiMap = {
    'Chips & Savory Snacks': '\uD83E\uDD54',
    'Noodles & Rice': '\uD83C\uDF5C',
    'Cookies & Wafers': '\uD83C\uDF6A',
    'Candy & Jelly': '\uD83C\uDF6C',
    'Ice Cream': '\uD83C\uDF66',
    'Beverages': '\uD83E\uDD64',
    'Korean Snacks': '\uD83C\uDDF0\uD83C\uDDF7'
  }

  useEffect(() => {
    loadHierarchy()
  }, [token])

  const loadHierarchy = async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch('/api/categories/hierarchy', { headers })
      if (!response.ok) throw new Error('Failed to load categories')
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to load categories')
      setHierarchy(data.hierarchy || [])
    } catch (err) {
      console.error('Error loading hierarchy:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

  const selectAll = () => {
    setSelectedId(null)
    setExpandedSuper(null)
    onSelectCategory(null)
  }

  const toggleSuper = (superCat) => {
    if (expandedSuper === superCat.name) {
      setExpandedSuper(null)
    } else {
      setExpandedSuper(superCat.name)
    }
  }

  const selectSub = (subCat) => {
    setSelectedId(subCat.id || subCat.name)
    onSelectCategory(subCat)
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar${isOpen ? ' open-mobile' : ' collapsed'}`}>
        <div className="sb-top">
          <div className="sb-label">Browse</div>
        </div>
        <div className="sb-search">
          <input
            type="text"
            placeholder="Search Categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="sb-loading"><span className="sb-spinner"></span> Loading...</div>
        ) : error ? (
          <div className="sb-loading" style={{ color: '#c0392b' }}>{'\u26A0\uFE0F'} {error}</div>
        ) : (
          <>
            <div className={`sb-all ${selectedId === null ? 'active' : ''}`} onClick={selectAll}>
              <span style={{ fontSize: 14 }}>{'\uD83D\uDCE6'}</span> All Products
              <span className="a-count">{totalProducts}</span>
            </div>
            <div className="sb-divider"></div>
            <div className="sb-categories">
              {filteredHierarchy.map(superCat => (
                <div key={superCat.id} className="sb-super-group">
                  <div
                    className={`sb-super-btn ${expandedSuper === superCat.name ? 'active open' : ''}`}
                    onClick={() => toggleSuper(superCat)}
                  >
                    <span className="s-emoji">{superCat.emoji || getEmoji(superCat.name)}</span>
                    <span className="s-label">{superCat.name}</span>
                    <span className="s-cnt">{superCat.totalProducts}</span>
                    <span className="s-arr">{expandedSuper === superCat.name ? '\u25BC' : '\u203A'}</span>
                  </div>
                  <div className={`sb-cats ${expandedSuper === superCat.name ? 'open' : ''}`}>
                    {superCat.categories?.map(subCat => (
                      <div
                        key={subCat.id}
                        className={`sb-cat ${selectedId === (subCat.id || subCat.name) ? 'active' : ''}`}
                        onClick={() => selectSub(subCat)}
                      >
                        <span className="sc-label">{subCat.name}</span>
                        <span className="sc-cnt">{subCat.productCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredHierarchy.length === 0 && (
                <div className="sb-loading">No categories found</div>
              )}
            </div>
          </>
        )}
      </aside>

      <style jsx>{`
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.25); z-index: 150; display: none; top: 56px; }
        @media (max-width: 768px) {
          .sidebar-overlay.open { display: block; }
        }
        .sidebar { width: 236px; min-width: 236px; background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; height: calc(100vh - 56px); position: sticky; top: 56px; transition: transform 0.28s cubic-bezier(.4,0,.2,1), margin-left 0.28s cubic-bezier(.4,0,.2,1); z-index: 160; flex-shrink: 0; }
        .sidebar.collapsed { margin-left: -236px; }
        .sb-top { padding: 14px 14px 6px; }
        .sb-label { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
        .sb-search { padding: 0 10px 10px; }
        .sb-search input { width: 100%; padding: 7px 11px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .sb-search input:focus { border-color: var(--red); }
        .sb-search input::placeholder { color: var(--muted); }
        .sb-all { display: flex; align-items: center; gap: 10px; padding: 14px 14px; cursor: pointer; font-size: 14px; color: var(--sub); font-weight: 500; transition: all 0.15s; background: var(--bg); border-bottom: 1px solid var(--border); }
        .sb-all:hover { background: var(--border2); color: var(--text); }
        .sb-all.active { color: var(--red); background: var(--red-light); }
        .a-count { margin-left: auto; font-size: 11px; color: var(--muted); background: var(--surface); padding: 2px 8px; border-radius: 20px; border: 1px solid var(--border); }
        .sb-divider { height: 1px; background: var(--border); margin: 0; }
        .sb-categories { display: flex; flex-direction: column; }
        .sb-super-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 14px 14px; border: none; background: var(--bg); color: var(--sub); cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; text-align: left; transition: all 0.15s; border-bottom: 1px solid var(--border); }
        .sb-super-btn:hover { background: var(--border2); color: var(--text); }
        .sb-super-btn.active { color: var(--red); background: var(--red-light); }
        .sb-super-btn .s-emoji { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .sb-super-btn .s-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-super-btn .s-cnt { font-size: 11px; color: var(--muted); background: var(--surface); padding: 2px 8px; border-radius: 20px; border: 1px solid var(--border); }
        .sb-super-btn .s-arr { font-size: 10px; color: var(--faint); transition: transform 0.2s; flex-shrink: 0; }
        .sb-super-btn.open .s-arr { transform: rotate(90deg); }
        .sb-cats { overflow: hidden; max-height: 0; transition: max-height 0.25s ease; }
        .sb-cats.open { max-height: 700px; }
        .sb-cat { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 10px 44px; cursor: pointer; font-size: 13px; color: var(--sub); transition: all 0.15s; background: var(--surface); border-bottom: 1px solid var(--border2); }
        .sb-cat:hover { background: var(--bg); color: var(--text); }
        .sb-cat.active { color: var(--red); background: var(--red-light); font-weight: 500; }
        .sc-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sc-cnt { font-size: 11px; color: var(--muted); }
        .sb-loading { padding: 16px; text-align: center; color: var(--muted); font-size: 13px; }
        .sb-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--red); border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .sidebar { position: fixed; left: 0; top: 56px; transform: translateX(-100%); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .sidebar.open-mobile { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

export default CategorySidebar

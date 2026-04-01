'use client';
import React, { useState, useEffect } from 'react'

function CategorySidebar({ isOpen, onClose, onSelectCategory, token }) {
  const [hierarchy, setHierarchy] = useState([])
  const [expandedSupers, setExpandedSupers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hierarchyLoaded, setHierarchyLoaded] = useState(false)

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
      setHierarchyLoaded(true)
      
      if (data.hierarchy && data.hierarchy.length > 0) {
        setExpandedSupers(new Set([data.hierarchy[0].id]))
      }
    } catch (err) {
      console.error('Error loading hierarchy:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSuper = (id) => {
    const next = new Set(expandedSupers)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedSupers(next)
  }

  const allExpanded = hierarchy.length > 0 && expandedSupers.size === hierarchy.length

  const expandAll = () => {
    if (allExpanded) {
      setExpandedSupers(new Set())
    } else {
      setExpandedSupers(new Set(hierarchy.map(cat => cat.id)))
    }
  }

  const totalAllProducts = hierarchy.reduce((sum, cat) => sum + (cat.totalProducts || 0), 0)

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open-mobile' : ''}`}>
        <div className="sidebar-header">
          <h2>Categories</h2>
          {hierarchyLoaded && (
            <button onClick={expandAll} className="btn-expand-all" title="Expand all">
              <span>↕</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="sidebar-loading">
            <span className="spinner"></span>
            Loading categories...
          </div>
        ) : error ? (
          <div className="sidebar-error">
            <p>⚠️ Error loading categories</p>
            <small>{error}</small>
          </div>
        ) : (
          <ul className="category-list">
            {hierarchy.map(superCat => (
              <li key={superCat.id} className="super-category-item">
                <div className="super-category-header" onClick={() => toggleSuper(superCat.id)}>
                  <span className={`expand-icon ${expandedSupers.has(superCat.id) ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  <span className="emoji">{superCat.emoji}</span>
                  <span className="name">{superCat.name}</span>
                  <span className="count">({superCat.totalProducts})</span>
                </div>

                <ul className={`sub-categories ${expandedSupers.has(superCat.id) ? 'visible' : ''}`}>
                  {superCat.categories?.map(subCat => (
                    <li
                      key={subCat.id}
                      className="sub-category-item"
                      onClick={() => onSelectCategory(subCat)}
                    >
                      <span className="subcategory-name">{subCat.name}</span>
                      <span className="sub-product-count">{subCat.productCount}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {hierarchyLoaded && !loading && (
          <div className="sidebar-footer">
            <small>{totalAllProducts} products</small>
          </div>
        )}
      </aside>

      <style jsx>{`
        .sidebar {
          width: 236px;
          min-width: 236px;
          background: #fff;
          border-right: 1px solid #e2ddd8;
          overflow-y: auto;
          height: calc(100vh - 56px);
          position: sticky;
          top: 56px;
          transition: transform 0.28s cubic-bezier(.4,0,.2,1);
          z-index: 160;
          flex-shrink: 0;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #e2ddd8;
          flex-shrink: 0;
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a18;
        }

        .btn-expand-all {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #9a948c;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-expand-all:hover {
          background: #f5f4f0;
          color: #1a1a18;
        }

        .sidebar-loading,
        .sidebar-error {
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #9a948c;
          font-size: 13px;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #e2ddd8;
          border-top-color: #c0392b;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .sidebar-error {
          color: #c0392b;
        }

        .sidebar-error small {
          color: #9a948c;
        }

        .category-list {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          flex: 1;
        }

        .super-category-item {
          border-bottom: 1px solid #ede9e4;
        }

        .super-category-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
          font-weight: 500;
          font-size: 13px;
          color: #1a1a18;
        }

        .super-category-header:hover {
          background: #f5f4f0;
        }

        .expand-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          transition: transform 0.2s;
          color: #9a948c;
          font-size: 10px;
        }

        .expand-icon.expanded {
          transform: rotate(90deg);
        }

        .emoji {
          font-size: 14px;
          width: 20px;
          text-align: center;
        }

        .super-category-header .name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .count {
          font-size: 11px;
          color: #9a948c;
          font-weight: 400;
        }

        .sub-categories {
          list-style: none;
          margin: 0;
          padding: 0;
          background: #faf9f7;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.2s ease-out;
        }

        .sub-categories.visible {
          max-height: 800px;
        }

        .sub-category-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px 10px 40px;
          font-size: 12px;
          color: #5a5750;
          cursor: pointer;
          transition: all 0.15s;
          border-left: 3px solid transparent;
        }

        .sub-category-item:hover {
          background: #f5f4f0;
          color: #1a1a18;
          border-left-color: #c0392b;
        }

        .subcategory-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sub-product-count {
          font-size: 11px;
          color: #9a948c;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 12px 16px;
          border-top: 1px solid #e2ddd8;
          text-align: center;
          color: #9a948c;
          font-size: 11px;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 56px;
            transform: translateX(-100%);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .sidebar.open-mobile {
            transform: translateX(0);
          }
          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.25);
            z-index: 150;
            display: none;
            top: 56px;
          }
          .sidebar-overlay.open {
            display: block;
          }
        }
      `}</style>
    </>
  )
}

export default CategorySidebar

'use client';
import React, { useState, useEffect, useMemo } from 'react'
import ProductCard from './ProductCard'

function CategoryView({ products, favorites, cart, onProductSelected, onAddToCart, onToggleFavorite, cardSize }) {
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/categories/hierarchy')
      if (!response.ok) throw new Error('Failed to load categories')
      const data = await response.json()
      setHierarchy(data.hierarchy || [])
      setError(null)
    } catch (err) {
      setError('Error loading categories: ' + err.message)
      console.error('CategoryView error:', err)
    } finally {
      setLoading(false)
    }
  }

  const isFavorited = (productId) => favorites.some(fav => fav.id === productId)
  const isInCart = (productId) => cart.some(item => item.id === productId)

  const getProductsByCategory = (superCatId) => {
    const grouped = {}
    products.forEach(product => {
      if (product.super_category_id !== superCatId) return
      const catId = product.category_id || 'uncategorized'
      const catName = product.category || 'Uncategorized'
      if (!grouped[catId]) {
        grouped[catId] = { id: catId, name: catName, products: [] }
      }
      grouped[catId].products.push(product)
    })

    return Object.values(grouped)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(cat => ({
        ...cat,
        products: cat.products.sort((a, b) => a.name.localeCompare(b.name))
      }))
  }

  if (loading) return <div className="loading">Loading categories...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="category-view">
      {hierarchy.map(superCat => {
        const catSections = getProductsByCategory(superCat.id)
        if (catSections.length === 0) return null

        return (
          <div key={superCat.id} className="super-category-page">
            <div className="super-cat-header">
              <span className="super-cat-emoji">{superCat.emoji}</span>
              <h2 className="super-cat-title">{superCat.name}</h2>
              <span className="super-cat-count">({superCat.totalProducts})</span>
            </div>

            {catSections.map(category => (
              <div key={category.id} className="category-section">
                <div className="category-header">
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{category.products.length}</span>
                </div>

                <div className="products-scroll">
                  <div className="products-grid-horizontal" style={{ '--card-scale': cardSize }}>
                    {category.products.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isFavorited={isFavorited(product.id)}
                        inCart={isInCart(product.id)}
                        onProductSelected={onProductSelected}
                        onAddToCart={onAddToCart}
                        onToggleFavorite={onToggleFavorite}
                        cardSize={cardSize}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      <style jsx>{`
        .category-view {
          width: 100%;
          padding: 20px;
        }
        .loading, .error {
          padding: 40px 20px;
          text-align: center;
          font-size: 16px;
          color: #666;
        }
        .error { color: #c0392b; }
        .super-category-page { margin-bottom: 40px; }
        .super-cat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2ddd8;
        }
        .super-cat-emoji { font-size: 28px; }
        .super-cat-title {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a18;
          margin: 0;
        }
        .super-cat-count {
          font-size: 16px;
          color: #5a5750;
          margin-left: auto;
        }
        .category-section { margin-bottom: 28px; }
        .category-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #e2ddd8;
          margin-bottom: 16px;
        }
        .category-name {
          font-weight: 600;
          font-size: 14px;
          color: #1a1a18;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex: 1;
        }
        .category-count {
          display: inline-block;
          background: #c0392b;
          color: white;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          min-width: 24px;
          text-align: center;
        }
        .products-grid-horizontal {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(calc(148px * var(--card-scale, 1)), 1fr));
          gap: calc(10px * var(--card-scale, 1));
          padding: 0;
          width: 100%;
        }
        @media (max-width: 640px) {
          .super-cat-title { font-size: 18px; }
          .products-grid-horizontal {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
      `}</style>
    </div>
  )
}

export default CategoryView

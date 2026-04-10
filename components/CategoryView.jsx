'use client';
import React, { useState, useEffect, useMemo } from 'react'
import ProductCard from './ProductCard'

function useIsMobile() {
  const [m, setM] = useState(false)
  useEffect(() => { const c = () => setM(window.innerWidth <= 640); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c) }, [])
  return m
}

function CategoryView({ products, favorites, cart, onProductSelected, onAddToCart, onToggleFavorite, cardSize, onCardResize, showPrices = true }) {
  const firstCardRendered = React.useRef(false);
  const isMobile = useIsMobile()
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/categories/hierarchy', token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setHierarchy(data.hierarchy || [])
      setError(null)
    } catch (err) {
      setError('Error loading categories: ' + err.message)
      console.error('CategoryView error:', err)
    } finally { setLoading(false) }
  }

  const isFavorited = (productId) => favorites.some(fav => fav.id === productId)
  const isInCart = (productId) => cart.some(item => item.id === productId)

  const getProductsByCategory = (superCatId) => {
    const grouped = {}
    products.forEach(product => {
      if (product.super_category_id !== superCatId) return
      const catId = product.category_id || 'uncategorized'
      const catName = product.category || 'Uncategorized'
      if (!grouped[catId]) grouped[catId] = { id: catId, name: catName, products: [] }
      grouped[catId].products.push(product)
    })
    return Object.values(grouped)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  if (loading) return <div className="p-10 text-center text-base text-slate-400">Loading categories...</div>
  if (error) return <div className="p-10 text-center text-base text-red-500">{error}</div>

  firstCardRendered.current = false;
  return (
    <div className="w-full p-5">
      {hierarchy.map(superCat => {
        const catSections = getProductsByCategory(superCat.id)
        if (catSections.length === 0) return null

        return (
          <div key={superCat.id} id={`supercat-${superCat.id}`} className="mb-10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-200">
              <span className="text-[28px]">{superCat.emoji}</span>
              <h2 className="text-2xl font-semibold text-slate-800 m-0 max-sm:text-lg">{superCat.name}</h2>
              <span className="text-base text-slate-500 ml-auto">({superCat.totalProducts})</span>
            </div>

            {catSections.map(category => (
              <div key={category.id} className="mb-7">
                <div className="flex items-center gap-3 py-3 border-b border-slate-200 mb-4">
                  <span className="font-semibold text-sm text-slate-800 uppercase tracking-wide flex-1">{category.name}</span>
                  <span className="inline-block bg-indigo-500 text-white font-semibold px-2.5 py-1 rounded-full text-xs min-w-[24px] text-center">
                    {category.products.length}
                  </span>
                </div>
                <div style={isMobile ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' } : { display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${148 * (cardSize || 1)}px, 1fr))`, gap: `${10 * (cardSize || 1)}px` }}>
                  {category.products.map(product => {
                    const isFirst = !firstCardRendered.current;
                    if (isFirst) firstCardRendered.current = true;
                    return (
                      <ProductCard key={product.id} product={product} isFavorited={isFavorited(product.id)} inCart={isInCart(product.id)}
                        isFirst={isFirst} onProductSelected={onProductSelected} onAddToCart={onAddToCart} onToggleFavorite={onToggleFavorite}
                        cardSize={isMobile ? 1 : cardSize} onCardResize={onCardResize} showPrices={showPrices} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default CategoryView

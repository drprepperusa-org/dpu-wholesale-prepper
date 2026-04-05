'use client';
import React, { useEffect, useState } from 'react'
import ProductCard from './ProductCard'

function ProductGrid({ products, favorites, cart, cardSize, onProductSelected, onAddToCart, onToggleFavorite, onCardResize, showPrices = true }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p>Loading products...</p>
      </div>
    )
  }

  const isFavorited = (product) => favorites.some(f => f.id === product.id)
  const isInCart = (product) => cart.some(item => item.id === product.id)
  const scale = cardSize || 1

  const gridStyle = isMobile
    ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }
    : { display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${148 * scale}px, 1fr))`, gap: `${10 * scale}px` }

  return (
    <div style={gridStyle}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          isFirst={index === 0}
          isFavorited={isFavorited(product)}
          inCart={isInCart(product)}
          onProductSelected={onProductSelected}
          onAddToCart={onAddToCart}
          onToggleFavorite={onToggleFavorite}
          cardSize={isMobile ? 1 : cardSize}
          onCardResize={onCardResize}
          showPrices={showPrices}
        />
      ))}
    </div>
  )
}

export default ProductGrid

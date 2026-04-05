'use client';
import React, { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'

function ProductCard({ product, isFavorited, inCart, isFirst, onProductSelected, onAddToCart, onToggleFavorite, cardSize, onCardResize, showPrices = true }) {
  const [isResizing, setIsResizing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [initialScale, setInitialScale] = useState(1.0)
  const [imgError, setImgError] = useState(false)

  const isNewItem = (() => {
    if (!product.created_at) return false
    const createdDate = new Date(product.created_at)
    const now = new Date()
    const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  })()

  const getXY = (e) => {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation()
    const { x, y } = getXY(e)
    setIsResizing(true); setStartX(x); setStartY(y); setInitialScale(cardSize)
  }

  useEffect(() => {
    if (!isResizing) return
    const doResize = (e) => {
      const { x, y } = getXY(e)
      const deltaX = x - startX; const deltaY = y - startY
      const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const direction = deltaX + deltaY > 0 ? 1 : -1
      let newScale = initialScale + (direction * delta * 0.004)
      newScale = Math.round(Math.max(0.6, Math.min(2.0, newScale)) * 10) / 10
      if (onCardResize) onCardResize(newScale)
    }
    const endResize = () => setIsResizing(false)
    document.addEventListener('mousemove', doResize)
    document.addEventListener('mouseup', endResize)
    document.addEventListener('touchmove', doResize, { passive: false })
    document.addEventListener('touchend', endResize)
    return () => {
      document.removeEventListener('mousemove', doResize)
      document.removeEventListener('mouseup', endResize)
      document.removeEventListener('touchmove', doResize)
      document.removeEventListener('touchend', endResize)
    }
  }, [isResizing, startX, startY, initialScale, cardSize, onCardResize])

  const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect fill="#f1f5f9" width="160" height="160"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14">No Image</text></svg>'
  )}`

  const scale = cardSize || 1

  return (
    <div
      className={`group relative bg-white rounded-xl cursor-pointer transition-all duration-200 border flex flex-col hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] ${inCart ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200'} ${isFavorited ? 'ring-1 ring-indigo-100' : ''}`}
      style={{
        padding: `${12 * scale}px ${10 * scale}px ${10 * scale}px`,
        minHeight: `${224 * scale}px`,
      }}
      onClick={() => onProductSelected(product)}
    >
      {isNewItem && (
        <div className="absolute top-3 left-3 bg-indigo-500 text-white rounded text-[9px] font-bold tracking-wider z-5"
          style={{ padding: `${4 * scale}px ${8 * scale}px`, fontSize: `${9 * scale}px` }}>
          NEW
        </div>
      )}
      {product.is_oos && (
        <div className="absolute top-3 left-3 bg-slate-400 text-white rounded text-[9px] font-bold tracking-wider z-5"
          style={{ padding: `${4 * scale}px ${6 * scale}px`, fontSize: `${9 * scale}px` }}>
          OUT OF STOCK
        </div>
      )}

      <button
        className="absolute top-1.5 right-2 bg-transparent border-none cursor-pointer p-0.5 transition-transform hover:scale-125 z-10"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(product); }}
      >
        <Heart className={`w-4 h-4 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-300 hover:text-red-400'}`} />
      </button>

      <div className="w-full flex items-center justify-center bg-white"
        style={{ height: `${160 * scale}px`, marginBottom: `${8 * scale}px` }}
        onClick={() => onProductSelected(product)}>
        <img
          src={imgError ? placeholderSvg : (product.image_url || placeholderSvg)}
          alt={product.name}
          className="max-w-full max-h-full object-contain rounded-md"
          onError={() => setImgError(true)}
        />
      </div>

<div className="text-slate-800 font-semibold leading-tight overflow-hidden cursor-pointer"
        style={{ fontSize: `${12 * scale}px`, height: `${32 * scale}px`, marginBottom: `${4 * scale}px` }}
        onClick={() => onProductSelected(product)}>
        {product.name}
      </div>

      <div className="text-slate-400 leading-snug"
        style={{ fontSize: `${10 * scale}px`, marginBottom: `${8 * scale}px` }}>
        {product.weight && <div>{product.weight}</div>}
        {product.bags_per_case && <div>{product.bags_per_case} bags/case</div>}
      </div>

      {product.show_price !== false && showPrices && (
        <div className="text-slate-800 font-bold"
          style={{ fontSize: `${16 * scale}px`, marginBottom: `${8 * scale}px` }}>
          ${parseFloat(product.price || 0).toFixed(2)}
          <span className="font-normal text-slate-400" style={{ fontSize: `${11 * scale}px` }}> /case</span>
        </div>
      )}

      <div className="flex gap-1.5 mt-auto" style={{ gap: `${6 * scale}px` }} onClick={(e) => e.stopPropagation()}>
        <button className="flex-1 bg-slate-100 text-slate-700 border-none rounded-md font-semibold cursor-pointer transition-colors hover:bg-slate-200"
          style={{ padding: `${6 * scale}px ${8 * scale}px`, fontSize: `${11 * scale}px` }}
          onClick={() => onProductSelected(product)}>
          View
        </button>
        <button className="flex-1 bg-indigo-500 text-white border-none rounded-md font-semibold cursor-pointer transition-colors hover:bg-indigo-600"
          style={{ padding: `${6 * scale}px ${8 * scale}px`, fontSize: `${11 * scale}px` }}
          onClick={() => onAddToCart(product)}>
          Add
        </button>
      </div>

      {isFirst && (
        <div className="absolute bottom-0.5 right-0.5 w-5 h-5 cursor-nwse-resize opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity z-10 select-none"
          style={{ background: 'linear-gradient(135deg, transparent 50%, #6366f1 50%)', borderRadius: '0 0 4px 0' }}
          onMouseDown={startResize} onTouchStart={startResize} />
      )}
    </div>
  )
}

export default ProductCard

'use client';
import React, { useState, useEffect } from 'react'

function ProductCard({ product, isFavorited, inCart, isFirst, onProductSelected, onAddToCart, onToggleFavorite, cardSize }) {
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

  const startResize = (e) => {
    e.preventDefault()
    setIsResizing(true)
    setStartX(e.clientX)
    setStartY(e.clientY)
    setInitialScale(cardSize)
  }

  useEffect(() => {
    if (!isResizing) return

    const doResize = (e) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const direction = deltaX + deltaY > 0 ? 1 : -1

      let newScale = initialScale + (direction * delta * 0.005)
      newScale = Math.max(0.5, Math.min(2.0, newScale))
    }

    const endResize = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', doResize)
    document.addEventListener('mouseup', endResize)
    return () => {
      document.removeEventListener('mousemove', doResize)
      document.removeEventListener('mouseup', endResize)
    }
  }, [isResizing, startX, startY, initialScale, cardSize])

  const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect fill="#f5f4f0" width="160" height="160"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#d4cfc9" font-family="sans-serif" font-size="14">No Image</text></svg>'
  )}`

  return (
    <div
      className={`product-card ${inCart ? 'in-cart' : ''} ${isFavorited ? 'favorited' : ''}`}
      style={{ '--card-scale': cardSize }}
    >
      {isNewItem && <div className="new-badge">NEW ITEM</div>}
      {product.is_oos && <div className="oos-badge">OUT OF STOCK</div>}
      <div
        className="fav-btn"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(product); }}
        style={{ color: isFavorited ? '#c0392b' : '#d4cfc9' }}
      >
        {isFavorited ? '\u2665' : '\u2661'}
      </div>
      <div className="p-img-wrap" onClick={() => onProductSelected(product)}>
        <img
          src={imgError ? placeholderSvg : (product.image_url || placeholderSvg)}
          alt={product.name}
          className="p-img"
          onError={() => setImgError(true)}
        />
      </div>
      <div className="p-name" onClick={() => onProductSelected(product)}>{product.name}</div>
      <div className="p-meta">
        {product.weight && <div>{product.weight}</div>}
        {product.bags_per_case && <div>{product.bags_per_case} bags/case</div>}
      </div>
      {product.show_price !== false && (
        <div className="p-price">${parseFloat(product.price || 0).toFixed(2)}</div>
      )}
      <div className="product-actions">
        <button className="btn-view" onClick={() => onProductSelected(product)}>View</button>
        <button className="btn-cart" onClick={() => onAddToCart(product)}>Add</button>
      </div>
      {isFirst && <div className="resize-handle" onMouseDown={startResize}></div>}

      <style jsx>{`
        .product-card {
          background: var(--surface, #fff);
          border-radius: var(--radius, 10px);
          padding: calc(12px * var(--card-scale, 1)) calc(10px * var(--card-scale, 1)) calc(10px * var(--card-scale, 1));
          text-align: center;
          cursor: pointer;
          transition: all 0.18s;
          position: relative;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
          border: 1px solid var(--border, #e2ddd8);
          min-height: calc(224px * var(--card-scale, 1));
          display: flex;
          flex-direction: column;
        }

        .product-card:hover {
          border-color: #e8c5c0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .product-card:active {
          transform: scale(0.97);
        }

        .product-card.in-cart {
          border-color: #c0392b;
          background: #f9eeec;
        }

        .new-badge {
          position: absolute;
          top: calc(12px * var(--card-scale, 1));
          left: calc(12px * var(--card-scale, 1));
          background: #c0392b;
          color: white;
          padding: calc(4px * var(--card-scale, 1)) calc(6px * var(--card-scale, 1));
          border-radius: 4px;
          font-size: calc(9px * var(--card-scale, 1));
          font-weight: 700;
          letter-spacing: 0.5px;
          z-index: 5;
        }

        .oos-badge {
          position: absolute;
          top: calc(12px * var(--card-scale, 1));
          left: calc(12px * var(--card-scale, 1));
          background: #7f8c8d;
          color: white;
          padding: calc(4px * var(--card-scale, 1)) calc(6px * var(--card-scale, 1));
          border-radius: 4px;
          font-size: calc(9px * var(--card-scale, 1));
          font-weight: 700;
          letter-spacing: 0.5px;
          z-index: 5;
        }

        .fav-btn {
          position: absolute;
          top: 5px;
          right: 7px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.15s;
          line-height: 1;
          padding: 2px;
          display: block;
        }

        .fav-btn:hover {
          transform: scale(1.2);
        }

        .p-img-wrap {
          width: 100%;
          height: calc(160px * var(--card-scale, 1));
          margin-bottom: calc(8px * var(--card-scale, 1));
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
        }

        .p-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 6px;
        }

        .p-name {
          font-size: calc(11px * var(--card-scale, 1));
          color: var(--text, #1a1a18);
          line-height: 1.35;
          height: calc(28px * var(--card-scale, 1));
          overflow: hidden;
          margin-bottom: calc(4px * var(--card-scale, 1));
          font-weight: 500;
        }

        .p-meta {
          font-size: calc(10px * var(--card-scale, 1));
          color: var(--muted, #9a948c);
          margin-bottom: calc(8px * var(--card-scale, 1));
          line-height: 1.4;
        }

        .p-price {
          font-size: calc(13px * var(--card-scale, 1));
          font-weight: 700;
          color: #c0392b;
          margin-bottom: calc(8px * var(--card-scale, 1));
        }

        .product-actions {
          display: flex;
          gap: calc(6px * var(--card-scale, 1));
          margin-top: auto;
        }

        .btn-view, .btn-cart {
          flex: 1;
          padding: calc(6px * var(--card-scale, 1)) calc(8px * var(--card-scale, 1));
          border: none;
          border-radius: 6px;
          font-size: calc(11px * var(--card-scale, 1));
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          text-transform: capitalize;
        }

        .btn-view {
          background: var(--bg, #f5f4f0);
          color: var(--text, #1a1a18);
        }

        .btn-view:hover {
          background: #d4cfc9;
        }

        .btn-cart {
          background: #4CAF50;
          color: white;
        }

        .btn-cart:hover {
          background: #45a049;
        }

        .resize-handle {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, transparent 50%, #c0392b 50%);
          border-radius: 0 0 4px 0;
          cursor: nwse-resize;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: all;
          user-select: none;
          z-index: 10;
        }

        .product-card:hover .resize-handle {
          opacity: 0.8;
        }

        .product-card:hover .resize-handle:hover {
          opacity: 1;
        }

        @media (max-width: 640px) {
          .product-card {
            padding: 10px 8px 8px;
            min-height: 350px;
          }

          .p-img-wrap {
            height: 200px;
            margin-bottom: 6px;
            background: #fff;
            flex-shrink: 0;
          }

          .p-name {
            font-size: 10px;
            height: auto;
            margin-bottom: 4px;
          }

          .p-meta {
            font-size: 9px;
            margin-bottom: 6px;
          }

          .btn-view, .btn-cart {
            font-size: 10px;
            padding: 4px 6px;
          }
        }
      `}</style>
    </div>
  )
}

export default ProductCard

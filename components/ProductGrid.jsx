'use client';
import React from 'react'
import ProductCard from './ProductCard'

function ProductGrid({ products, favorites, cart, cardSize, onProductSelected, onAddToCart, onToggleFavorite }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <p>No products found.</p>
      </div>
    )
  }

  const isFavorited = (product) => favorites.some(f => f.id === product.id)
  const isInCart = (product) => cart.some(item => item.id === product.id)

  return (
    <div className="products-grid" style={{ '--card-scale': cardSize }}>
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
          cardSize={cardSize}
        />
      ))}

      <style jsx>{`
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(calc(148px * var(--card-scale, 1)), 1fr));
          gap: calc(10px * var(--card-scale, 1));
        }

        .empty-state {
          text-align: center;
          padding: 50px;
          color: #9a948c;
        }

        @media (max-width: 640px) {
          .products-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
      `}</style>
    </div>
  )
}

export default ProductGrid

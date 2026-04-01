'use client';
import React, { useState } from 'react'

function CartItem({ item, isLoading, onRemove, onUpdateQty }) {
  const name = item.product_name || item.name
  const quantity = item.quantity || item.qty || 1
  const price = parseFloat(item.price) || 0
  const [localQty, setLocalQty] = useState(quantity)

  // Sync local qty when item quantity changes from outside
  React.useEffect(() => {
    setLocalQty(item.quantity || item.qty || 1)
  }, [item.quantity, item.qty])

  const decrement = () => {
    if (localQty > 1) {
      const newQty = localQty - 1
      setLocalQty(newQty)
      onUpdateQty(item.id, newQty)
    }
  }

  const increment = () => {
    const newQty = localQty + 1
    setLocalQty(newQty)
    onUpdateQty(item.id, newQty)
  }

  const handleInputChange = (e) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val > 0) {
      setLocalQty(val)
    } else if (e.target.value === '') {
      setLocalQty('')
    }
  }

  const handleInputBlur = () => {
    const val = parseInt(localQty, 10)
    if (!isNaN(val) && val > 0) {
      if (val !== quantity) {
        onUpdateQty(item.id, val)
      }
    } else {
      setLocalQty(quantity)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  return (
    <div className={`cart-item${isLoading ? ' loading' : ''}`}>
      <div className="ci-img">
        {item.image_url ? (
          <img src={item.image_url} alt={name} />
        ) : (
          <div className="ci-img-placeholder">No img</div>
        )}
      </div>
      <div className="ci-details">
        <div className="ci-name">{name}</div>
        <div className="ci-meta">
          <span>{item.weight || ''}</span>
          {item.bags_per_case && <span> &middot; {item.bags_per_case}</span>}
        </div>
        <div className="ci-price">${price.toFixed(2)}</div>
      </div>
      <div className="ci-qty">
        <div className="qty-input">
          <button
            className="qty-btn"
            onClick={decrement}
            disabled={isLoading || quantity <= 1}
          >
            &minus;
          </button>
          <input
            type="number"
            className="qty-field"
            value={localQty}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            min="1"
          />
          <button
            className="qty-btn"
            onClick={increment}
            disabled={isLoading}
          >
            +
          </button>
        </div>
        <span className="ci-qty-label">{quantity} cases</span>
        {price > 0 && (
          <span className="ci-total">${(price * quantity).toFixed(2)}</span>
        )}
      </div>
      <button
        className="ci-remove"
        onClick={() => onRemove(item.id)}
        disabled={isLoading}
      >
        &#10005;
      </button>
    </div>
  )
}

function CartOverlay({
  isOpen,
  cartItems = [],
  onClose,
  onRemoveItem,
  onPlaceOrder,
  onClearCart,
  onUpdateQty
}) {
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0
    const qty = item.quantity || item.qty || 1
    return sum + price * qty
  }, 0)

  const totalCases = cartItems.reduce((sum, item) => {
    return sum + (item.quantity || item.qty || 1)
  }, 0)

  const handleUpdateQty = (itemId, newQty) => {
    if (onUpdateQty) {
      onUpdateQty(itemId, newQty)
    }
  }

  return (
    <>
      <div
        className={`cart-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
      >
        <div className="cart-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle"></div>

          {/* Cart Header */}
          <div className="cart-sheet-head">
            <h2>Your Order</h2>
            <button className="cart-close-btn" onClick={onClose}>&#10005;</button>
          </div>

          {/* Cart Items */}
          <div className="cart-sheet-items">
            {cartItems.length === 0 ? (
              <div className="cart-empty-state">
                <div className="ces-icon">&#128722;</div>
                <p>Your cart is empty</p>
                <p className="ces-hint">Add items to get started</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  isLoading={false}
                  onRemove={onRemoveItem}
                  onUpdateQty={handleUpdateQty}
                />
              ))
            )}
          </div>

          {/* Cart Footer */}
          {cartItems.length > 0 && (
            <div className="cart-sheet-footer">
              <div className="sum-row">
                <span>Line items</span>
                <span>{cartItems.length}</span>
              </div>
              <div className="sum-row">
                <span>Total cases</span>
                <span>{totalCases}</span>
              </div>
              <div className="sum-row total">
                <span>Est. total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button className="btn-place-order" onClick={onPlaceOrder}>
                Place Order &rarr;
              </button>
              <button className="btn-clear" onClick={onClearCart}>
                Clear cart
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,26,24,0);
          z-index: 500;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          pointer-events: none;
          transition: background 0.3s ease;
        }

        .cart-overlay.open {
          background: rgba(26,26,24,0.45);
          pointer-events: all;
        }

        .cart-sheet {
          background: #fff;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 600px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(.32,1,.32,1);
          max-height: 92vh;
          display: flex;
          flex-direction: column;
        }

        .cart-overlay.open .cart-sheet {
          transform: translateY(0);
        }

        .sheet-handle {
          width: 38px;
          height: 4px;
          background: #d4cfc9;
          border-radius: 2px;
          margin: 10px auto 0;
          flex-shrink: 0;
        }

        .cart-sheet-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px 14px;
          border-bottom: 1px solid #e2ddd8;
          flex-shrink: 0;
        }

        .cart-sheet-head h2 {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a18;
          letter-spacing: -0.3px;
          margin: 0;
        }

        .cart-close-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid #e2ddd8;
          background: #f5f4f0;
          color: #9a948c;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .cart-close-btn:hover {
          background: #fde8e6;
          border-color: #e8a9a3;
          color: #c0392b;
        }

        .cart-sheet-items {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cart-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #9a948c;
        }

        .ces-icon {
          font-size: 48px;
          margin-bottom: 14px;
          opacity: 0.4;
        }

        .cart-empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .ces-hint {
          font-size: 12px !important;
          color: #d4cfc9;
          margin-top: 6px !important;
        }

        /* Cart Item Styles */
        .cart-item {
          display: flex;
          gap: 10px;
          padding: 12px 10px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e2ddd8;
          margin-bottom: 8px;
          position: relative;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
          opacity: 1;
          transition: opacity 0.2s;
        }

        .cart-item.loading {
          opacity: 0.6;
          pointer-events: none;
        }

        .ci-img {
          width: 70px;
          height: 70px;
          flex-shrink: 0;
          background: #f5f4f0;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #e2ddd8;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ci-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }

        .ci-img-placeholder {
          font-size: 10px;
          color: #9a948c;
        }

        .ci-details {
          flex: 1;
          min-width: 0;
        }

        .ci-name {
          font-size: 12px;
          font-weight: 500;
          color: #1a1a18;
          line-height: 1.2;
          margin-bottom: 2px;
        }

        .ci-meta {
          font-size: 10px;
          color: #9a948c;
          line-height: 1.2;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ci-price {
          font-size: 11px;
          font-weight: 600;
          color: #c0392b;
        }

        .ci-qty {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          text-align: right;
          gap: 4px;
        }

        .qty-input {
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #e2ddd8;
          border-radius: 4px;
          padding: 2px;
          background: #f5f4f0;
        }

        .qty-btn {
          width: 20px;
          height: 20px;
          padding: 0;
          border: none;
          background: transparent;
          color: #1a1a18;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qty-btn:hover:not(:disabled) {
          background: #d4cfc9;
        }

        .qty-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .qty-field {
          width: 30px;
          height: 20px;
          border: none;
          background: transparent;
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #1a1a18;
          padding: 0 2px;
          font-family: inherit;
        }

        .qty-field:focus {
          outline: none;
        }

        /* Remove spinner buttons from number input */
        .qty-field::-webkit-outer-spin-button,
        .qty-field::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .qty-field[type=number] {
          -moz-appearance: textfield;
        }

        .ci-qty-label {
          font-size: 11px;
          color: #5a5750;
          font-weight: 500;
        }

        .ci-total {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a18;
        }

        .ci-remove {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: none;
          background: #f5f4f0;
          color: #9a948c;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .ci-remove:hover {
          background: #c0392b;
          color: #fff;
        }

        /* Cart Footer */
        .cart-sheet-footer {
          padding: 12px 16px;
          border-top: 1px solid #e2ddd8;
          background: #faf9f7;
          flex-shrink: 0;
        }

        .sum-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #5a5750;
          margin-bottom: 4px;
        }

        .sum-row.total {
          color: #1a1a18;
          font-weight: 600;
          font-size: 13px;
          border-top: 1px solid #e2ddd8;
          padding-top: 6px;
          margin-top: 2px;
        }

        .btn-place-order {
          width: 100%;
          padding: 12px;
          background: #c0392b;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.18s;
          letter-spacing: -0.2px;
        }

        .btn-place-order:hover {
          background: #a93226;
        }

        .btn-clear {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px solid #e2ddd8;
          border-radius: 8px;
          color: #5a5750;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          cursor: pointer;
          margin-top: 6px;
          transition: all 0.15s;
        }

        .btn-clear:hover {
          border-color: #c0392b;
          color: #c0392b;
        }

        .btn-place-order:disabled,
        .btn-clear:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}

export default CartOverlay

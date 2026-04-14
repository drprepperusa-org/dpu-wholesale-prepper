'use client';
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react'

function CartItem({ item, isLoading, onRemove, onUpdateQty, showPrices = true }) {
  const name = item.product_name || item.name
  const quantity = item.quantity || item.qty || 1
  const price = parseFloat(item.price) || 0
  const unit = item.unit || 'cases'
  const casesPerPallet = parseInt(item.cases_per_pallet) || 60
  const totalCases = unit === 'pallets' ? quantity * casesPerPallet : quantity
  const totalPrice = unit === 'pallets' ? price * totalCases : price * quantity
  const [localQty, setLocalQty] = useState(quantity)

  React.useEffect(() => { setLocalQty(item.quantity || item.qty || 1) }, [item.quantity, item.qty])

  const itemKey = item.cartKey || item.id
  const decrement = () => { if (localQty > 1) { const nq = localQty - 1; setLocalQty(nq); onUpdateQty(itemKey, nq) } }
  const increment = () => { const nq = localQty + 1; setLocalQty(nq); onUpdateQty(itemKey, nq) }
  const handleInputChange = (e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) setLocalQty(v); else if (e.target.value === '') setLocalQty('') }
  const handleInputBlur = () => { const v = parseInt(localQty, 10); if (!isNaN(v) && v > 0) { if (v !== quantity) onUpdateQty(itemKey, v) } else setLocalQty(quantity) }
  const handleKeyDown = (e) => { if (e.key === 'Enter') e.target.blur() }

  return (
    <div className={`p-3 bg-white rounded-lg border border-slate-200 mb-1 shadow-sm transition-opacity max-sm:p-2.5 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Top row: image + name + remove button */}
      <div className="flex gap-3 items-start max-sm:gap-2">
        <div className="shrink-0 bg-slate-50 rounded-md overflow-hidden border border-slate-200 flex items-center justify-center" style={{ width: 'clamp(60px, 6.5em, 176px)', height: 'clamp(60px, 6.5em, 176px)' }}>
          {item.image_url
            ? <img src={item.image_url} alt={name} className="w-full h-full object-contain p-1" />
            : <div className="text-slate-400" style={{ fontSize: 'clamp(9px, 0.7em, 20px)' }}>No img</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 leading-tight mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 'clamp(12px, 1em, 28px)' }}>{name}</div>
          <div className="text-slate-400 leading-tight mb-1 overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 'clamp(10px, 0.75em, 22px)' }}>
            {item.weight || ''}{item.bags_per_case && <> &middot; {item.bags_per_case}</>}
          </div>
          {showPrices && <div className="font-semibold text-indigo-500" style={{ fontSize: 'clamp(11px, 0.85em, 26px)' }}>${price.toFixed(2)}</div>}
        </div>
        <button onClick={() => onRemove(itemKey)} disabled={isLoading}
          className="rounded bg-slate-100 text-slate-400 border-none cursor-pointer flex items-center justify-center transition-colors hover:bg-red-500 hover:text-white shrink-0" style={{ width: 'clamp(24px, 1.8em, 52px)', height: 'clamp(24px, 1.8em, 52px)' }}>
          <X style={{ width: 'clamp(12px, 0.9em, 28px)', height: 'clamp(12px, 0.9em, 28px)' }} />
        </button>
      </div>
      {/* Bottom row: qty controls + total */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-0">
          <button onClick={decrement} disabled={isLoading || quantity <= 1}
            className="border-none bg-transparent text-slate-500 font-semibold cursor-pointer flex items-center justify-center transition-colors hover:text-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed" style={{ width: 'clamp(28px, 2em, 60px)', height: 'clamp(28px, 2em, 60px)' }}>
            <Minus style={{ width: 'clamp(14px, 1.1em, 34px)', height: 'clamp(14px, 1.1em, 34px)' }} />
          </button>
          <input type="number" value={localQty} onChange={handleInputChange} onBlur={handleInputBlur} onKeyDown={handleKeyDown}
            disabled={isLoading} min="1"
            className="border border-slate-200 bg-white rounded-md text-center font-semibold text-slate-800 p-0 focus:outline-none focus:border-indigo-400" style={{ width: 'clamp(38px, 3em, 90px)', height: 'clamp(28px, 2em, 60px)', fontSize: 'clamp(13px, 1em, 30px)' }} />
          <button onClick={increment} disabled={isLoading}
            className="border-none bg-transparent text-slate-500 font-semibold cursor-pointer flex items-center justify-center transition-colors hover:text-indigo-500 disabled:opacity-30" style={{ width: 'clamp(28px, 2em, 60px)', height: 'clamp(28px, 2em, 60px)' }}>
            <Plus style={{ width: 'clamp(14px, 1.1em, 34px)', height: 'clamp(14px, 1.1em, 34px)' }} />
          </button>
          <span className="text-slate-500 font-medium ml-2" style={{ fontSize: 'clamp(11px, 0.8em, 24px)' }}>{unit}{unit === 'pallets' ? ` (${totalCases} cs)` : ''}</span>
        </div>
        {showPrices && price > 0 && <span className="font-bold text-slate-800" style={{ fontSize: 'clamp(14px, 1.1em, 32px)' }}>${totalPrice.toFixed(2)}</span>}
      </div>
    </div>
  )
}

function CartOverlay({ isOpen, cartItems = [], onClose, onRemoveItem, onPlaceOrder, onClearCart, onUpdateQty, showPrices = true }) {
  const [dragY, setDragY] = useState(0)
  const dragStart = React.useRef(0)
  const dragging = React.useRef(false)
  const scrollRef = React.useRef(null)
  const canDrag = React.useRef(false)
  const onTouchStart = (e) => {
    dragStart.current = e.touches[0].clientY
    dragging.current = true
    // Only allow drag-to-close if scroll list is at the top
    canDrag.current = !scrollRef.current || scrollRef.current.scrollTop <= 0
  }
  const onTouchMove = (e) => {
    if (!dragging.current) return
    const diff = e.touches[0].clientY - dragStart.current
    // Upward drag: let the inner list scroll, disable drag
    if (diff < 0) { canDrag.current = false; setDragY(0); return }
    // Re-enable drag once list scrolls back to top
    if (!canDrag.current && scrollRef.current && scrollRef.current.scrollTop <= 0) {
      canDrag.current = true
      dragStart.current = e.touches[0].clientY
      return
    }
    if (canDrag.current && diff > 0) setDragY(diff)
  }
  const onTouchEnd = () => {
    dragging.current = false
    if (dragY > 100) {
      // Animate all the way down, then trigger close
      setDragY(typeof window !== 'undefined' ? window.innerHeight : 800)
      setTimeout(() => {
        dragging.current = true // Disable transition so translateY(100%) switch is instant
        onClose()
      }, 380)
    } else {
      setDragY(0)
    }
  }
  React.useEffect(() => { if (!isOpen) setDragY(0) }, [isOpen])

  const cartTotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0
    const qty = item.quantity || item.qty || 1
    const u = item.unit || 'cases'
    const cpp = parseInt(item.cases_per_pallet) || 60
    const cases = u === 'pallets' ? qty * cpp : qty
    return sum + price * cases
  }, 0)

  const totalCases = cartItems.reduce((sum, item) => {
    const qty = item.quantity || item.qty || 1
    const u = item.unit || 'cases'
    const cpp = parseInt(item.cases_per_pallet) || 60
    return sum + (u === 'pallets' ? qty * cpp : qty)
  }, 0)

  const handleUpdateQty = (itemId, newQty) => { if (onUpdateQty) onUpdateQty(itemId, newQty) }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[10000] flex items-end justify-center transition-colors duration-300
      ${isOpen ? 'bg-black/40' : 'bg-transparent'}`}
      style={{ pointerEvents: isOpen ? 'auto' : 'none', overscrollBehavior: 'none', touchAction: isOpen ? 'none' : 'auto' }}
      onClick={onClose}>
      <div className={`bg-white rounded-t-2xl w-full max-w-[900px] overflow-hidden shadow-2xl flex flex-col
        max-sm:max-w-full max-sm:rounded-t-xl max-sm:h-[75vh] max-sm:max-h-[75vh]
        ${!isOpen ? 'pointer-events-none' : ''}`}
        style={{ maxHeight: '92vh', transform: !isOpen ? 'translateY(100%)' : `translateY(${dragY}px)`, transition: dragging.current ? 'none' : 'transform 0.35s cubic-bezier(.32,1,.32,1)', willChange: 'transform', fontSize: 'clamp(16px, 2vw, 36px)' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

        {/* Handle */}
        <div className="shrink-0 flex justify-center items-center pt-2 pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0 max-sm:px-3.5">
          <h2 className="font-semibold text-slate-800 m-0" style={{ fontSize: 'clamp(16px, 1.2em, 38px)' }}>Your Order</h2>
          <button onClick={onClose}
            className="rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center cursor-pointer transition-colors hover:bg-indigo-500 hover:border-indigo-500 hover:text-white" style={{ width: 'clamp(28px, 2.2em, 56px)', height: 'clamp(28px, 2.2em, 56px)' }}>
            <X style={{ width: 'clamp(14px, 1em, 30px)', height: 'clamp(14px, 1em, 30px)' }} />
          </button>
        </div>

        {/* Items */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 max-sm:p-2 max-sm:gap-1" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-3.5 opacity-40" />
              <p className="m-0 text-sm">Your cart is empty</p>
              <p className="m-0 mt-1.5 text-xs text-slate-300">Add items to get started</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <CartItem key={item.cartKey || item.id} item={item} isLoading={false} onRemove={onRemoveItem} onUpdateQty={handleUpdateQty} showPrices={showPrices} />
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 shrink-0 max-sm:px-3.5 max-sm:pb-3.5">
            <div className="flex justify-between text-slate-500 mb-1" style={{ fontSize: 'clamp(12px, 0.85em, 26px)' }}><span>Line items</span><span>{cartItems.length}</span></div>
            <div className="flex justify-between text-slate-500 mb-1" style={{ fontSize: 'clamp(12px, 0.85em, 26px)' }}><span>Total cases</span><span>{totalCases}</span></div>
            {showPrices && (
              <div className="flex justify-between text-slate-800 font-semibold border-t border-slate-200 pt-1.5 mt-0.5" style={{ fontSize: 'clamp(14px, 1.1em, 32px)' }}>
                <span>Est. total</span><span>${cartTotal.toFixed(2)}</span>
              </div>
            )}
            <button onClick={onPlaceOrder}
              className="w-full bg-indigo-500 border-none rounded-lg text-white font-semibold cursor-pointer mt-2.5 transition-colors hover:bg-indigo-600 flex items-center justify-center gap-2" style={{ padding: 'clamp(10px, 0.9em, 28px)', fontSize: 'clamp(14px, 1em, 30px)' }}>
              Place Order <ArrowRight style={{ width: 'clamp(16px, 1.1em, 36px)', height: 'clamp(16px, 1.1em, 36px)' }} />
            </button>
            <button onClick={onClearCart}
              className="w-full bg-transparent border border-slate-200 rounded-lg text-slate-500 cursor-pointer mt-1.5 transition-colors hover:border-red-300 hover:text-red-500" style={{ padding: 'clamp(8px, 0.7em, 22px)', fontSize: 'clamp(13px, 0.9em, 28px)' }}>
              Clear cart
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default CartOverlay

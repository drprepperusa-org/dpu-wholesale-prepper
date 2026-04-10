'use client';
import React, { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

function OrderConfirmModal({ isOpen, onClose, onSubmit, cartItems = [], total = 0, isSubmitting = false, showPrices = true }) {
  const [confirmTerms, setConfirmTerms] = useState(false)

  useEffect(() => {
    if (isOpen) setConfirmTerms(false)
  }, [isOpen])

  if (!isOpen) return null

  const itemCount = cartItems.length
  const totalCases = cartItems.reduce((sum, item) => {
    const qty = item.quantity || item.qty || 1
    const unit = item.unit || 'cases'
    const cpp = parseInt(item.cases_per_pallet) || 60
    return sum + (unit === 'pallets' ? qty * cpp : qty)
  }, 0)
  const totalPallets = cartItems.filter(i => i.unit === 'pallets').reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0)
  const computedTotal = total || cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0
    const qty = item.quantity || item.qty || 1
    const unit = item.unit || 'cases'
    const cpp = parseInt(item.cases_per_pallet) || 60
    const cases = unit === 'pallets' ? qty * cpp : qty
    return sum + price * cases
  }, 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10001] p-5"
      style={{ animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[600px] w-full overflow-hidden max-sm:rounded-xl max-sm:max-w-full"
        style={{ animation: 'slideUp 0.3s cubic-bezier(.32,1,.32,1)', fontSize: 'clamp(14px, 1.6vw, 32px)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 m-0" style={{ fontSize: 'clamp(17px, 1.2em, 36px)' }}>Confirm Order</h3>
          <button onClick={onClose}
            className="rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center cursor-pointer transition-colors hover:bg-indigo-500 hover:border-indigo-500 hover:text-white" style={{ width: 'clamp(28px, 2em, 52px)', height: 'clamp(28px, 2em, 52px)' }}>
            <X style={{ width: 'clamp(14px, 1em, 28px)', height: 'clamp(14px, 1em, 28px)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-slate-500 mb-4 leading-relaxed" style={{ fontSize: 'clamp(13px, 0.85em, 26px)' }}>You&apos;re about to place an order. Please review the details below:</p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4" style={{ fontSize: 'clamp(13px, 0.85em, 26px)' }}>
            <div className="flex justify-between text-slate-500 mb-1">
              <span>Line items:</span><span>{itemCount}</span>
            </div>
            {totalPallets > 0 && (
              <div className="flex justify-between text-slate-500 mb-1">
                <span>Pallets:</span><span>{totalPallets}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 mb-1">
              <span>Total cases:</span><span>{totalCases}</span>
            </div>
            {showPrices && (
              <div className="flex justify-between text-slate-800 font-semibold border-t border-slate-200 pt-2 mt-2">
                <span>Estimated total:</span><span>${computedTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-500 mb-4" style={{ fontSize: 'clamp(13px, 0.85em, 26px)' }}>
            <input type="checkbox" checked={confirmTerms} onChange={(e) => setConfirmTerms(e.target.checked)}
              className="cursor-pointer accent-indigo-500 shrink-0" style={{ width: 'clamp(16px, 1.2em, 32px)', height: 'clamp(16px, 1.2em, 32px)' }} />
            <span>I confirm this order and agree to the terms</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} disabled={isSubmitting}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold cursor-pointer transition-colors hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" style={{ padding: 'clamp(12px, 0.9em, 24px)', fontSize: 'clamp(13px, 0.85em, 26px)' }}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={!confirmTerms || isSubmitting}
            className="flex-1 rounded-lg border border-indigo-500 bg-indigo-500 text-white font-semibold cursor-pointer transition-colors hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{ padding: 'clamp(12px, 0.9em, 24px)', fontSize: 'clamp(13px, 0.85em, 26px)' }}>
            {isSubmitting ? <><Loader2 style={{ width: 'clamp(16px, 1em, 28px)', height: 'clamp(16px, 1em, 28px)' }} className="animate-spin" /> Placing...</> : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmModal

'use client';
import React, { useState, useEffect } from 'react'

function OrderConfirmModal({ isOpen, onClose, onSubmit, cartItems = [], total = 0 }) {
  const [confirmTerms, setConfirmTerms] = useState(false)

  // Reset checkbox each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmTerms(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const itemCount = cartItems.length

  const totalQty = cartItems.reduce((sum, item) => {
    return sum + (item.quantity || item.qty || 1)
  }, 0)

  const computedTotal = total || cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0
    const qty = item.quantity || item.qty || 1
    return sum + price * qty
  }, 0)

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Confirm Order</h3>
            <button className="modal-close" onClick={onClose}>&#10005;</button>
          </div>

          <div className="modal-body">
            <p>You're about to place an order. Please review the details below:</p>

            <div className="order-summary">
              <div className="summary-row">
                <span>Line items:</span>
                <span>{itemCount}</span>
              </div>
              <div className="summary-row">
                <span>Total cases:</span>
                <span>{totalQty}</span>
              </div>
              <div className="summary-row total">
                <span>Estimated total:</span>
                <span>${computedTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="form-section">
              <label>
                <input
                  type="checkbox"
                  checked={confirmTerms}
                  onChange={(e) => setConfirmTerms(e.target.checked)}
                />
                <span>I confirm this order and agree to the terms</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className="btn-submit"
              onClick={onSubmit}
              disabled={!confirmTerms}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,26,24,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 600;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          max-width: 400px;
          width: 100%;
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(.32,1,.32,1);
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #e2ddd8;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          font-size: 17px;
          font-weight: 600;
          color: #1a1a18;
          margin: 0;
        }

        .modal-close {
          background: #f5f4f0;
          border: 1px solid #e2ddd8;
          border-radius: 8px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5a5750;
          transition: all 0.15s;
          padding: 0;
        }

        .modal-close:hover {
          background: #c0392b;
          border-color: #c0392b;
          color: #fff;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-body p {
          font-size: 13px;
          color: #5a5750;
          margin: 0 0 16px 0;
          line-height: 1.6;
        }

        .order-summary {
          background: #f5f4f0;
          border: 1px solid #e2ddd8;
          border-radius: 9px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          color: #5a5750;
          margin-bottom: 4px;
        }

        .summary-row.total {
          border-top: 1px solid #e2ddd8;
          padding-top: 8px;
          margin-top: 8px;
          color: #1a1a18;
          font-weight: 600;
          margin-bottom: 0;
        }

        .form-section {
          margin-bottom: 16px;
        }

        .form-section label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: #5a5750;
        }

        .form-section input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #e2ddd8;
          display: flex;
          gap: 10px;
        }

        .btn-cancel,
        .btn-submit {
          flex: 1;
          padding: 12px;
          border-radius: 9px;
          border: 1px solid #e2ddd8;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-cancel {
          background: #f5f4f0;
          color: #1a1a18;
        }

        .btn-cancel:hover {
          background: #e2ddd8;
        }

        .btn-submit {
          background: #c0392b;
          color: #fff;
          border-color: #c0392b;
        }

        .btn-submit:hover:not(:disabled) {
          background: #a93226;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .modal-content {
            max-width: 100%;
            border-radius: 12px 12px 0 0;
          }
        }
      `}</style>
    </>
  )
}

export default OrderConfirmModal

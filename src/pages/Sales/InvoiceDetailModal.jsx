import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer, X } from 'lucide-react';

export const InvoiceDetailModal = ({ isOpen, invoice, onClose, thermal = false }) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => window.print();
  const amount = (value) => Number(value ?? 0);
  const total = amount(invoice.total);
  const discount = amount(invoice.discount);
  const gst = amount(invoice.gstAmount ?? invoice.taxAmount ?? invoice.tax ?? 0);
  const rate = amount(invoice.gstRate ?? 0);
  const interState = Boolean(invoice.interState);
  const cgst = interState ? 0 : amount(invoice.cgst ?? gst / 2);
  const sgst = interState ? 0 : amount(invoice.sgst ?? gst - cgst);
  const igst = interState ? amount(invoice.igst ?? gst) : 0;
  const subtotal = amount(invoice.subtotal ?? total + discount);
  const taxable = amount(invoice.taxableAmount ?? (total - gst));

  return (
    <>
      {/* Print-friendly CSS rule to hide everything outside receipt during window.print() */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice-area, #printable-invoice-area * {
            visibility: visible !important;
          }
          #printable-invoice-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${thermal ? '72mm' : '100%'} !important;
            max-width: ${thermal ? '72mm' : 'none'} !important;
            margin: 0 !important;
            padding: ${thermal ? '2mm' : '20px'} !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page { size: ${thermal ? '80mm auto' : 'auto'}; margin: ${thermal ? '3mm' : '8mm'}; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="erp-panel   max-w-2xl w-full p-6   my-8">
          {/* Action Header (hidden in print) */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6 no-print">
            <span className="text-xs font-mono font-bold text-[var(--primary)] uppercase">Invoice Receipt Preview</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-[var(--primary)]" />
                <span>Print Receipt</span>
              </button>
              <button aria-label="Close dialog" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Receipt Body */}
          <div id="printable-invoice-area" className={thermal ? "bg-white p-3 font-mono text-black text-xs max-w-[320px] mx-auto" : "erp-panel p-6 font-sans text-gray-900"}>
            {/* Aromartist Branding Header */}
            <div className="text-center border-b border-gray-200 pb-4 mb-4">
              <h1 className="text-2xl font-bold font-sans text-[var(--ink)] tracking-wider uppercase">Aromartist Perfume</h1>
              <p className="text-xs text-[var(--primary)] font-bold tracking-wide uppercase">PerfumASol Retail Receipt</p>
              <p className="text-xs text-gray-500 mt-1">{invoice.branchName || '—'}</p>
            </div>

            {/* Invoice Info */}
            <div className={thermal ? "space-y-1 text-xs mb-4 pb-4 border-b border-dashed border-gray-300" : "grid grid-cols-2 gap-4 text-xs mb-4 pb-4 border-b border-gray-200"}>
              <div>
                <p><strong>Invoice No:</strong> <span className="font-mono font-bold text-[var(--primary)]">{invoice.invoiceNumber}</span></p>
                <p><strong>Date & Time:</strong> {formatDate(invoice.date, true)}</p>
                <p><strong>Salesperson:</strong> {invoice.salesperson || 'Cashier'}</p>
              </div>
              <div className={thermal ? "text-left" : "text-right"}>
                <p><strong>Customer:</strong> {invoice.customerName}</p>
                <p><strong>Mobile:</strong> {invoice.customerMobile}</p>
                <p><strong>Payment Method:</strong> <span className="font-bold text-emerald-700">{invoice.paymentMethod || 'Cash'}</span></p>
              </div>
            </div>

            {thermal && <div className="border-t border-dashed border-gray-400 my-3" />}
            {/* Items Table */}
            <div className="overflow-x-auto mb-4">
              <table className={thermal ? "w-full text-left text-[10px] border-collapse" : "erp-table w-full text-left text-xs border-collapse"}>
                <thead>
                  <tr className="border-y border-gray-200 bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">Discount</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(invoice.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 font-bold text-gray-900">
                        {item.productName} <span className="font-mono text-xs text-gray-500">({item.sku})</span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold">{item.qty}</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(item.rate)}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(item.discount || 0)}</td>
                      <td className="py-2 px-2 text-right font-bold text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className={thermal ? "p-2 space-y-1.5 text-xs border-t border-dashed border-gray-400" : "bg-gray-50 p-4 rounded-xl space-y-1.5 text-xs border border-gray-200"}>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-bold text-gray-900">{formatCurrency(invoice.subtotal || invoice.total)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount:</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              {gst <= 0 && <div className="flex justify-between text-gray-600"><span>GST (recorded)</span><span>{formatCurrency(0)}</span></div>}
              {gst > 0 && (
                <>
                  <div className="flex justify-between text-gray-600"><span>Taxable value (GST inclusive)</span><span>{formatCurrency(taxable)}</span></div>
                  {interState ? (
                    <div className="flex justify-between text-gray-600"><span>IGST{rate ? ` (${rate}%)` : ''}</span><span>{formatCurrency(igst)}</span></div>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-600"><span>CGST{rate ? ` (${rate / 2}%)` : ''}</span><span>{formatCurrency(cgst)}</span></div>
                      <div className="flex justify-between text-gray-600"><span>SGST{rate ? ` (${rate / 2}%)` : ''}</span><span>{formatCurrency(sgst)}</span></div>
                    </>
                  )}
                </>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Grand Total Paid:</span>
                <span className="text-[var(--primary)]">{formatCurrency(invoice.total)}</span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200 space-y-0.5">
              <p className="font-bold text-gray-600">Thank you for visiting Aromartist Perfume!</p>
              <p>Please keep this invoice for returns or exchanges within 7 days.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

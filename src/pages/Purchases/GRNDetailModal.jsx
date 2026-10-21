import React from 'react';

import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { X, PackageCheck, CheckCircle2 } from 'lucide-react';

export const GRNDetailModal = ({ isOpen, grn, onClose }) => {
  if (!isOpen || !grn) return null;

  const items = grn.items || [
    {
      material: 'Aventus Perfume Oil',
      orderedQty: 2000,
      prevReceived: 0,
      currentReceived: 1000,
      acceptedQty: 980,
      rejectedQty: 20,
      unitCost: 8.00,
    },
    {
      material: 'Baccarat Rouge Oil',
      orderedQty: 1000,
      prevReceived: 0,
      currentReceived: 500,
      acceptedQty: 500,
      rejectedQty: 0,
      unitCost: 12.50,
    },
  ];

  const totalAcceptedValue = items.reduce(
    (acc, i) => acc + (Number(i.acceptedQty) || 0) * (Number(i.unitCost) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="erp-panel   max-w-4xl w-full p-6  space-y-5  my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 rounded-xl text-[var(--primary)]">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[var(--primary)]">{grn.grnNumber}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    grn.status === 'Partial Receipt'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {grn.status || 'Completed'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Goods Receipt Note</h2>
            </div>
          </div>

          <button aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
          <div>
            <span className="text-gray-500 font-medium">Linked PO Ref:</span>
            <p className="font-mono font-bold text-[var(--primary)]">{grn.poNumber || '—'}</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Supplier Name:</span>
            <p className="font-bold text-gray-900">{grn.supplierName}</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Receiving Warehouse:</span>
            <p className="font-bold text-gray-900">{grn.warehouseName || '—'}</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Receive Date:</span>
            <p className="font-semibold text-gray-800">{formatDate(grn.receiveDate)}</p>
          </div>
        </div>

        {/* Section 3 Table Breakdown: ordered quantity, previously received, current receive quantity, accepted quantity, rejected quantity and unit cost */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Received Stock Inspection Details
            </h4>
            {grn.deliveryNoteNo && (
              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                Delivery Note: {grn.deliveryNoteNo}
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="erp-table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                  <th className="p-3">Material Item</th>
                  <th className="p-3 text-center">Ordered Qty</th>
                  <th className="p-3 text-center">Previously Recv</th>
                  <th className="p-3 text-center bg-amber-50/40">Current Recv Qty</th>
                  <th className="p-3 text-center bg-emerald-50/40">Accepted Qty</th>
                  <th className="p-3 text-center bg-rose-50/40">Rejected Qty</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Accepted Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const acceptedValue =
                    (Number(item.acceptedQty) || 0) * (Number(item.unitCost) || 0);

                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{item.material}</td>
                      <td className="p-3 text-center font-semibold text-gray-600">
                        {formatNumber(item.orderedQty)}
                      </td>
                      <td className="p-3 text-center font-semibold text-gray-500">
                        {formatNumber(item.prevReceived || 0)}
                      </td>
                      <td className="p-3 text-center font-bold text-amber-800 bg-amber-50/20">
                        {formatNumber(item.currentReceived)}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-700 bg-emerald-50/20">
                        {formatNumber(item.acceptedQty)}
                      </td>
                      <td className="p-3 text-center font-bold text-rose-600 bg-rose-50/20">
                        {formatNumber(item.rejectedQty || 0)}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-700">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        {formatCurrency(acceptedValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Accepted stock quantities have been posted to inventory.</span>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-500 block">Total Accepted Value:</span>
            <span className="text-base font-bold text-[var(--primary)]">
              {formatCurrency(totalAcceptedValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

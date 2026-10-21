import React, { useState, useEffect } from 'react';
import { productApi } from '../../api/productApi';
import { formatCurrency } from '../../utils/formatters';
import { X, Calculator, ShieldCheck } from 'lucide-react';

export const ProductCostingModal = ({ isOpen, variant, onClose }) => {
  const [costing, setCosting] = useState(null);
  useEffect(() => {
    let live = true; setCosting(null);
    if (isOpen && variant) productApi.getCostingBreakdown(variant.id).then(({data}) => { if (live) setCosting(data); }).catch(() => {});
    return () => { live = false; };
  }, [isOpen, variant?.id]);
  if (!isOpen || !variant) return null;
  if (!costing) return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="erp-panel  p-6 ">Loading formula costing... <button aria-label="Close dialog" onClick={onClose}>Close</button></div></div>;

  const sp = Number(variant.sellingPrice || 0);
  const cp = Number(costing.costPrice || 0);
  const mrp = Number(variant.mrp ?? 0);
  const minSp = Number(variant.minSellingPrice ?? 0);

  // Formulation & BOM Cost Breakdown Simulation
  const liquidCost = costing.liquidCost;
  const packagingCost = costing.packagingCost;
  const manufacturingCost = costing.manufacturingCost;
  const grossProfit = sp - cp;
  const grossMarginPct = sp > 0 ? (((sp - cp) / sp) * 100).toFixed(1) + '%' : '0.0%';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-xl w-full p-6  space-y-5  max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[var(--primary)] uppercase">{variant.sku}</span>
              <h3 className="font-bold text-gray-900 text-lg">
                {variant.productName} ({variant.sizeName} {variant.concentrationName})
              </h3>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Historical Rule Callout Banner (Matching Specifications Image) */}
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-950 text-xs space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-amber-900">
            <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
            <span>Historical Cost Snapshot Rule</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            This screen shows the saved formula breakdown. Posted batches and invoices retain their own historical cost snapshots.
          </p>
        </div>

        {/* Product Costing Breakdown */}
        <div className="space-y-3 text-xs">
          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-gray-500">
            Cost & BOM Component Breakdown
          </h4>

          <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-200">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 font-semibold">Formulation & Liquid Cost (Perfume Oil + Solvent):</span>
              <span className="font-bold text-gray-900 font-mono">{formatCurrency(liquidCost)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 font-semibold">Packaging Components (Bottle + Pump + Cap + Label + Box):</span>
              <span className="font-bold text-gray-900 font-mono">{formatCurrency(packagingCost)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 font-semibold">Manufacturing Labour, Assembly & Allocation:</span>
              <span className="font-bold text-gray-900 font-mono">{formatCurrency(manufacturingCost)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-2.5 text-sm font-bold text-gray-900">
              <span>Total Authoritative Unit Cost:</span>
              <span className="text-[var(--primary)] font-mono">{formatCurrency(cp)}</span>
            </div>
          </div>

          {/* Pricing & Gross Margin Breakdown */}
          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-gray-500 pt-2">
            Pricing Tiers & Gross Margin Engine
          </h4>

          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-2.5">
            <div className="grid grid-cols-3 gap-2 pb-2 border-b border-emerald-200/60 text-center">
              <div>
                <span className="text-xs text-emerald-800 uppercase font-bold block">MRP</span>
                <span className="font-bold text-emerald-950">{formatCurrency(mrp)}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-800 uppercase font-bold block">Selling Price</span>
                <span className="font-bold text-emerald-950 text-sm">{formatCurrency(sp)}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-800 uppercase font-bold block">Min Selling Price</span>
                <span className="font-bold text-emerald-950">{formatCurrency(minSp)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-emerald-800 font-semibold">Gross Profit per Bottle:</span>
              <span className="font-bold text-emerald-950 text-sm font-mono">{formatCurrency(grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-emerald-900 text-sm">
              <span>Gross Margin %:</span>
              <span className="text-base text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-lg border border-emerald-200">
                {variant.margin || grossMarginPct}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

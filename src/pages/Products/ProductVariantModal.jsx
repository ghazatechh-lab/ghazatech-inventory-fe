import React, { useState, useEffect } from 'react';
import { TextInput, SelectInput, CurrencyInput } from '../../components/forms/FormControls';
import { productApi } from '../../api/productApi';
import { fragranceApi } from '../../api/fragranceApi';
import { formulationApi } from '../../api/formulationApi';
import { formatCurrency } from '../../utils/formatters';
import { X, Tag, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const ProductVariantModal = ({ isOpen, variant, onClose, onSuccess }) => {
  const isEdit = !!variant;

  const [products, setProducts] = useState([]);
  const [fragrances, setFragrances] = useState([]);
  const [bottleSizes, setBottleSizes] = useState([]);
  const [concentrations, setConcentrations] = useState([]);
  const [formulas, setFormulas] = useState([]);

  const [productId, setProductId] = useState('');
  const [fragranceId, setFragranceId] = useState('');
  const [bottleSizeId, setBottleSizeId] = useState('');
  const [concentrationId, setConcentrationId] = useState('');
  const [formulaId, setFormulaId] = useState('');

  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState(165);
  const [mrp, setMrp] = useState(749);
  const [sellingPrice, setSellingPrice] = useState(599);
  const [minSellingPrice, setMinSellingPrice] = useState(520);
  const [status, setStatus] = useState('active');

  const [submitting, setSubmitting] = useState(false);
  const [autoSku, setAutoSku] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadMasters();
      if (variant) {
        setProductId(variant.productId || '');
        setFragranceId(variant.fragranceId || '');
        setBottleSizeId(variant.bottleSizeId || '');
        setConcentrationId(variant.concentrationId || '');
        setFormulaId(variant.formulaId || '');
        setSku(variant.sku || '');
        setBarcode(variant.barcode || '');
        setCostPrice(variant.costPrice ?? 0);
        setMrp(variant.mrp ?? 0);
        setSellingPrice(variant.sellingPrice ?? 0);
        setMinSellingPrice(variant.minSellingPrice ?? 0);
        setStatus(variant.status || 'active');
        setAutoSku(false);
      } else {
        setAutoSku(true);
        setBarcode('');
        setStatus('active');
      }
    }
  }, [isOpen, variant]);

  const loadMasters = async () => {
    try {
      const [pRes, fRes, bRes, cRes, formRes] = await Promise.all([
        productApi.getProducts().catch(() => ({ data: [] })),
        fragranceApi.getFragrances().catch(() => ({ data: [] })),
        fragranceApi.getBottleSizes().catch(() => ({ data: [] })),
        fragranceApi.getConcentrations().catch(() => ({ data: [] })),
        formulationApi.getFormulas().catch(() => ({ data: [] })),
      ]);

      const prods = pRes.data || [];
      const frags = fRes.data || [];
      const bottles = bRes.data || [];
      const concs = cRes.data || [];
      const forms = formRes.data || [];

      setProducts(prods);
      setFragrances(frags);
      setBottleSizes(bottles);
      setConcentrations(concs);
      setFormulas(forms);

      if (!variant) {
        if (prods.length) setProductId(prods[0].id);
        if (frags.length) setFragranceId(frags[0].id);
        if (bottles.length) setBottleSizeId(bottles[0].id);
        if (concs.length) setConcentrationId(concs[0].id);
        if (forms.length) setFormulaId(forms[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const sp = Number(sellingPrice || 0);
  const cp = Number(costPrice || 0);
  const grossProfit = sp - cp;
  const marginPercent = sp > 0 ? (((sp - cp) / sp) * 100).toFixed(1) : '0.0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Number(sellingPrice) <= 0) {
      toast.error('Selling price must be greater than 0');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    const frag = fragrances.find((f) => f.id === fragranceId);
    const bottle = bottleSizes.find((b) => b.id === bottleSizeId);
    const conc = concentrations.find((c) => c.id === concentrationId);

    setSubmitting(true);
    try {
      const formData = {
        productId,
        fragranceId,
        bottleSizeId,
        concentrationId,
        formulaId,
        sku: sku.trim().toUpperCase(),
        productName: prod ? prod.name : frag ? `${frag.name}` : 'Aventus Style',
        sizeName: bottle ? bottle.name : '50 ml',
        concentrationName: conc ? conc.code : 'EDP',
        barcode: barcode.trim(),
        costPrice: cp,
        mrp: Number(mrp),
        sellingPrice: sp,
        minSellingPrice: Number(minSellingPrice),
        margin: `${marginPercent}%`,
        status,
      };

      if (isEdit) {
        await productApi.updateVariant(variant.id, formData);
        toast.success('Product Variant SKU updated successfully!');
      } else {
        await productApi.createVariant(formData);
        toast.success('New Product Variant SKU created successfully!');
      }

      onSuccess();
    } catch {
      toast.error(isEdit ? 'Failed to update variant' : 'Failed to create variant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-2xl w-full p-6  space-y-4  max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Tag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">
              {isEdit ? 'Edit Product Variant SKU' : 'Create Product Variant SKU'}
            </h3>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Classification Basis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
            <SelectInput
              label="Product Master"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              options={products.map((p) => ({ label: p.name, value: p.id }))}
              required
            />

            <SelectInput
              label="Fragrance Line"
              value={fragranceId}
              onChange={(e) => setFragranceId(e.target.value)}
              options={fragrances.map((f) => ({ label: `${f.name} (${f.code})`, value: f.id }))}
              required
            />

            <SelectInput
              label="Bottle Size Master"
              value={bottleSizeId}
              onChange={(e) => setBottleSizeId(e.target.value)}
              options={bottleSizes.map((b) => ({ label: `${b.name} (${b.volumeMl} ml)`, value: b.id }))}
              required
            />

            <SelectInput
              label="Concentration Master"
              value={concentrationId}
              onChange={(e) => setConcentrationId(e.target.value)}
              options={concentrations.map((c) => ({ label: `${c.name} (${c.code} ${c.oilPercentage}%)`, value: c.id }))}
              required
            />
          </div>

          {/* Section 2: Formula & SKU Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectInput
              label="Formulation Recipe Master"
              value={formulaId}
              onChange={(e) => setFormulaId(e.target.value)}
              options={[{label:'Select a formulation',value:''},...formulas.map(f => ({label:`Formula ${f.version} (Cost: ₹${f.estimatedUnitCost})`,value:f.id}))]}
              required
            />

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-700">SKU Code</label>
                <span className="text-xs text-gray-500">Generated by the backend</span>
              </div>
              <TextInput
                readOnly placeholder="Auto-generated on Save"
                value={sku}
                onChange={(e) => {
                  setAutoSku(false);
                  setSku(e.target.value);
                }}
                required
                className="font-mono font-bold uppercase text-[var(--primary)]"
              />
            </div>

            <TextInput
              label="Barcode / EAN (Optional)"
              placeholder="e.g. 890123456702"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Section 3: Pricing & Costing Engine */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center space-x-1.5 font-bold text-amber-950 text-xs">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              <span>Pricing & Margin Calculation Engine</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CurrencyInput
                label="Authoritative Cost Price"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
              />

              <CurrencyInput
                label="MRP (Maximum Retail Price)"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                required
              />

              <CurrencyInput
                label="Selling Price"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
              />

              <CurrencyInput
                label="Minimum Selling Price"
                value={minSellingPrice}
                onChange={(e) => setMinSellingPrice(e.target.value)}
                required
              />
            </div>

            {/* Real-time Profit & Margin Summary */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/80 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex justify-between items-center">
                <span className="text-gray-600 font-semibold">Gross Profit / Bottle:</span>
                <span className={`font-bold text-sm ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatCurrency(grossProfit)}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex justify-between items-center">
                <span className="text-gray-600 font-semibold">Gross Margin %:</span>
                <span className="font-bold text-emerald-700 text-sm">{marginPercent}%</span>
              </div>
            </div>
          </div>

          <SelectInput
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: 'Active SKU', value: 'active' },
              { label: 'Inactive SKU', value: 'inactive' },
            ]}
          />

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[#252525] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Variant SKU'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

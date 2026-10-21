import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SelectInput, DateInput, TextArea } from '../../components/forms/FormControls';
import { purchaseApi } from '../../api/purchaseApi';
import { supplierApi } from '../../api/supplierApi';
import { warehouseApi } from '../../api/warehouseApi';
import { inventoryApi } from '../../api/inventoryApi';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();

  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  // Section 2 Header Fields (Supplier, Warehouse, Order Date, Expected Date, Notes)
  const [supplierName, setSupplierName] = useState(
    routeLocation.state?.supplierName || ''
  );
  const [warehouseName, setWarehouseName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Line items supporting: material, quantity, unit, rate, discount, tax and total
  const [items, setItems] = useState([{material: routeLocation.state?.materialCode || '', qty: 1, unit: '', rate: 0, discount: 0, tax: 0}]);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setLoading(true); setLoadError('');
    try {
      const [supRes, whRes, rmRes] = await Promise.all([
        supplierApi.getSuppliers(),
        warehouseApi.getWarehouses(),
        inventoryApi.getRawMaterials(),
      ]);

      const supOptions = (supRes.data || []).map((s) => ({ label: `${s.name} (${s.code})`, value: s.name }));
      const whOptions = (whRes.data || []).map((w) => ({ label: `${w.name} (${w.code})`, value: w.name }));

      setSuppliers(supOptions); setWarehouses(whOptions);
      setSupplierName(v => v || supOptions[0]?.value || '');
      setWarehouseName(v => v || whOptions[0]?.value || '');
      setRawMaterials((Array.isArray(rmRes.data) ? rmRes.data : rmRes.data?.results || []).filter(m=>m.status==='active'));
    } catch (err) {
      console.error(err);
      setLoadError('Could not load suppliers, warehouses or materials. Retry before saving.');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { material: '', qty: 1, unit: '', rate: 0, discount: 0, tax: 0 },
    ]);
  };

  const removeItem = (idx) => {
    if (items.length === 1) {
      toast.error('Purchase Order must contain at least one line item');
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx][field] = val;

    // Auto update rate/unit if selecting material name
    if (field === 'material') {
      const foundMat = rawMaterials.find((m) => m.name === val || m.code === val);
      if (foundMat) {
        next[idx].unit = foundMat.unit || 'pcs';
        next[idx].rate = foundMat.currentCost ?? 0;
      }
    }
    setItems(next);
  };

  // Section 2 Calculations: subtotal, discount, tax and grand total
  const subtotal = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
  const discountTotal = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const taxTotal = items.reduce((sum, item) => sum + Number(item.tax || 0), 0);
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(loading||loadError){toast.error('Load purchase choices before saving.');return;}
    if (!supplierName || !supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!warehouseName || !warehouseName.trim()) {
      toast.error('Receiving warehouse is required');
      return;
    }
    if (!orderDate) {
      toast.error('Order date is required');
      return;
    }
    if (!expectedDate) {
      toast.error('Expected delivery date is required');
      return;
    }
    if (!items.length) {
      toast.error('Please add at least one line item');
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].material || !items[i].material.trim()) {
        toast.error(`Line item #${i + 1}: Material name is required`);
        return;
      }
      if (!rawMaterials.some(m=>m.code===items[i].material || m.name===items[i].material)) {toast.error(`Line ${i+1}: Select an active material.`);return;}
      if (!items[i].qty || Number(items[i].qty) <= 0) {
        toast.error(`Line item #${i + 1}: Valid quantity is required`);
        return;
      }
      if (items[i].rate === '' || items[i].rate === null || isNaN(Number(items[i].rate)) || Number(items[i].rate) < 0) {
        toast.error(`Line item #${i + 1}: Valid unit rate is required`);
        return;
      }
    }

    try {
      const poItems = items.map((i) => ({
        material: i.material,
        qty: Number(i.qty),
        unit: i.unit,
        rate: Number(i.rate),
        discount: Number(i.discount),
        tax: Number(i.tax),
        total: Number(i.qty) * Number(i.rate) - Number(i.discount) + Number(i.tax),
      }));

      await purchaseApi.createPurchaseOrder({
        supplierName,
        warehouseName,
        orderDate,
        expectedDate,
        notes,
        items: poItems,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
      });

      toast.success('Purchase Order created successfully!');
      navigate('/purchases/orders');
    } catch {
      toast.error('Failed to create purchase order');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Purchase Order"
        subtitle="Issue raw material restock order with line item discounts, tax & receiving warehouse"
        secondaryActions={[
          <button
            key="back"
            onClick={() => navigate('/purchases/orders')}
            className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Purchase Orders</span>
          </button>,
        ]}
      />

      {loadError && <div role="alert" className="erp-panel p-4 mb-4 text-rose-700">{loadError}<button type="button" className="erp-secondary ml-3" onClick={loadMasterData}>Retry</button></div>}
      {!loading&&!loadError&&!rawMaterials.length&&<p className="erp-panel p-4 mb-4">No active materials. Create a raw material before purchasing.</p>}
      <form onSubmit={handleSubmit} className="erp-panel  p-6    space-y-6">
        {/* Section 2 Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <SelectInput
            label="Supplier (Searchable)"
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            options={suppliers}
          />

          <SelectInput
            label="Receiving Warehouse"
            required
            value={warehouseName}
            onChange={(e) => setWarehouseName(e.target.value)}
            options={warehouses}
          />

          <DateInput
            label="Order Date"
            required
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />

          <DateInput
            label="Expected Delivery Date"
            required
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>

        {/* Section 2 Line Items Table (material, quantity, unit, rate, discount, tax and total) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
              <span>Purchase Order Line Items</span>
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 bg-amber-50 text-[var(--primary)] border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1 hover:bg-amber-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="erp-table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
                  <th className="p-3">Material Item</th>
                  <th className="p-3 w-28">Quantity</th>
                  <th className="p-3 w-20">Unit</th>
                  <th className="p-3 w-28">Rate (INR)</th>
                  <th className="p-3 w-24">Discount</th>
                  <th className="p-3 w-24">Tax</th>
                  <th className="p-3 w-32 text-right">Line Total</th>
                  <th className="p-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const lineTotal =
                    Number(item.qty || 0) * Number(item.rate || 0) -
                    Number(item.discount || 0) +
                    Number(item.tax || 0);

                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-2">
                        <SelectInput label={`Material ${idx+1}`} required
                          value={item.material} onChange={e=>updateItem(idx,'material',e.target.value)}
                          options={[{value:'',label:loading?'Loading materials…':'Select material…'},...rawMaterials.map(m=>({value:m.code,label:`${m.name} (${m.code}) — ${m.unit}`}))]}/>

                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-[var(--primary)]"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-[var(--primary)]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-[var(--primary)]"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.tax}
                          onChange={(e) => updateItem(idx, 'tax', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)]"
                        />
                      </td>
                      <td className="p-2 text-right font-bold text-gray-900">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
          <TextArea
            label="Optional Internal Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter payment instructions, freight terms, delivery contact..."
            rows={4}
          />

          {/* Section 2 Summary Totals: subtotal, discount, tax and grand total */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2.5 text-xs">
            <h4 className="font-bold text-gray-700 uppercase tracking-wider text-xs mb-2">
              Purchase Order Summary
            </h4>
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Total Discount:</span>
              <span className="font-bold">-{formatCurrency(discountTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total Tax:</span>
              <span className="font-bold text-gray-900">+{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2.5 border-t border-gray-200">
              <span>Grand Total:</span>
              <span className="text-[var(--primary)] text-base">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/purchases/orders')}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors"
          >
            Issue Purchase Order
          </button>
        </div>
      </form>
    </div>
  );
};

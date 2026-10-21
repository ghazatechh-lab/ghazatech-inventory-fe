import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { inventoryApi } from '../../api/inventoryApi';
import { purchaseApi } from '../../api/purchaseApi';
import { TextInput, SelectInput, DateInput, TextArea } from '../../components/forms/FormControls';
import { toast } from 'sonner';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Save
} from 'lucide-react';

export const PODetailModal = ({ isOpen, po, onClose, onUpdate, initialEdit = false }) => {
  const [materials,setMaterials]=useState([]);
  useEffect(()=>{inventoryApi.getRawMaterials().then(({data})=>setMaterials(data)).catch(()=>toast.error('Material choices could not be loaded'));},[]);
  const [currentPo, setCurrentPo] = useState(po);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Form Fields
  const [supplierName, setSupplierName] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (po) {
      setCurrentPo(po);
      resetEditForm(po);
      setIsEditing(initialEdit);
    }
  }, [po, initialEdit]);

  const resetEditForm = (order) => {
    setSupplierName(order.supplierName || '');
    setWarehouseName(order.warehouseName || '—');
    setOrderDate(order.orderDate || new Date().toISOString().split('T')[0]);
    setExpectedDate(order.expectedDate || new Date().toISOString().split('T')[0]);
    setNotes(order.notes || '');

    const initialItems = (order.items && order.items.length > 0)
      ? order.items.map((i) => ({
          material: i.material || '',
          qty: Number(i.orderedQty ?? i.qty ?? 1),
          unit: i.unit || 'ml',
          rate: Number(i.rate ?? i.unitCost ?? 0),
          discount: Number(i.discount || 0),
          tax: Number(i.tax || 0),
        }))
      : [{ material:'',qty:1,unit:'',rate:0,discount:0,tax:0 }];

    setItems(initialItems);
  };

  if (!isOpen || !currentPo) return null;

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
    if(field==='material'){const mat=materials.find(m=>m.code===val||m.name===val);if(mat){next[idx].unit=mat.unit;next[idx].rate=mat.currentCost;}}
    setItems(next);
  };

  // Calculations: subtotal, discount, tax and grand total
  const subtotal = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
  const discountTotal = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const taxTotal = items.reduce((sum, item) => sum + Number(item.tax || 0), 0);
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
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
      toast.error('Purchase order must have at least one line item');
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].material || !items[i].material.trim()) {
        toast.error(`Line item #${i + 1}: Material name is required`);
        return;
      }
      if (!items[i].qty || Number(items[i].qty) <= 0) {
        toast.error(`Line item #${i + 1}: Valid positive quantity is required`);
        return;
      }
      if (items[i].rate === '' || items[i].rate === null || isNaN(Number(items[i].rate)) || Number(items[i].rate) < 0) {
        toast.error(`Line item #${i + 1}: Valid rate is required`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const formattedItems = items.map((i) => ({
        material: i.material,
        qty: Number(i.qty),
        unit: i.unit,
        rate: Number(i.rate),
        discount: Number(i.discount),
        tax: Number(i.tax),
        total: Number(i.qty) * Number(i.rate) - Number(i.discount) + Number(i.tax),
      }));

      const updatedPoData = {
        ...currentPo,
        supplierName,
        warehouseName,
        orderDate,
        expectedDate,
        notes,
        items: formattedItems,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
      };

      const saved = await purchaseApi.updatePurchaseOrder(currentPo.id, updatedPoData);
      setCurrentPo(saved.data);
      setIsEditing(false);
      toast.success('Purchase Order updated successfully!');

      if (onUpdate) {
        onUpdate(saved.data);
      }
    } catch {
      toast.error('Failed to update purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="erp-panel   max-w-4xl w-full p-6  space-y-5  my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 rounded-xl text-[var(--primary)]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[var(--primary)]">{currentPo.poNumber}</span>
                <StatusBadge status={currentPo.status || 'Approved'} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{currentPo.supplierName}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button aria-label="Close dialog"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        {isEditing ? (
          /* Edit Mode Form */
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
              <TextInput
                label="Supplier Name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
              <TextInput
                label="Receiving Warehouse"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                required
              />
              <DateInput
                label="Order Date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
              <DateInput
                label="Expected Delivery Date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                required
              />
            </div>

            {/* Editable Line Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Line Items (Material, Quantity, Unit, Rate, Discount, Tax & Total)
                </h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1 bg-amber-50 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-amber-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="erp-table w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5 w-24">Quantity</th>
                      <th className="p-2.5 w-20">Unit</th>
                      <th className="p-2.5 w-24">Rate (INR)</th>
                      <th className="p-2.5 w-24">Discount</th>
                      <th className="p-2.5 w-24">Tax</th>
                      <th className="p-2.5 w-28 text-right">Line Total</th>
                      <th className="p-2.5 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => {
                      const lineTotal =
                        Number(item.qty || 0) * Number(item.rate || 0) -
                        Number(item.discount || 0) +
                        Number(item.tax || 0);

                      return (
                        <tr key={idx}>
                          <td className="p-2">
                            <SelectInput label={`Material ${idx+1}`} required value={item.material} onChange={e=>updateItem(idx,'material',e.target.value)} options={[{value:'',label:'Select material…'},...materials.filter(m=>m.status==='active'||m.name===item.material||m.code===item.material).map(m=>({value:m.name,label:`${m.name} (${m.code})`}))]}/>

                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.qty}
                              onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded font-bold text-xs"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded font-mono uppercase text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded font-bold text-xs"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.tax}
                              onChange={(e) => updateItem(idx, 'tax', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
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

            {/* Editable Totals & Notes Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <TextArea
                label="Optional Internal Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
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
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Grand Total:</span>
                  <span className="text-[var(--primary)]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save PO Changes'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* View Mode View */
          <div className="space-y-5">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Supplier:</span>
                <p className="font-bold text-gray-900">{currentPo.supplierName}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Receiving Warehouse:</span>
                <p className="font-bold text-gray-900">{currentPo.warehouseName || '—'}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Order Date:</span>
                <p className="font-semibold text-gray-800">{formatDate(currentPo.orderDate)}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Expected Delivery:</span>
                <p className="font-semibold text-gray-800">{formatDate(currentPo.expectedDate)}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Order Line Items
              </h4>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="erp-table w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                      <th className="p-3">Material Item</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-center">Unit</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-right">Tax</th>
                      <th className="p-3 text-right">Line Total</th>
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
                          <td className="p-3 font-bold text-gray-900">{item.material}</td>
                          <td className="p-3 text-center font-bold text-gray-900">
                            {formatNumber(item.qty)}
                          </td>
                          <td className="p-3 text-center font-mono uppercase text-gray-600">
                            {item.unit}
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-700">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="p-3 text-right text-rose-600 font-semibold">
                            {item.discount > 0 ? `-${formatCurrency(item.discount)}` : 'INR 0.00'}
                          </td>
                          <td className="p-3 text-right text-gray-700">
                            {item.tax > 0 ? `+${formatCurrency(item.tax)}` : 'INR 0.00'}
                          </td>
                          <td className="p-3 text-right font-bold text-gray-900">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary Box: subtotal, discount, tax and grand total */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs">
                <span className="font-bold text-gray-700 block mb-1">Internal Notes:</span>
                <p className="text-gray-600 italic">{currentPo.notes || 'No notes provided.'}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
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
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2.5 border-t border-gray-200">
                  <span>Grand Total:</span>
                  <span className="text-[var(--primary)]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

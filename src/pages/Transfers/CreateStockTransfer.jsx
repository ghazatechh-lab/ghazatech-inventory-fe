import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SelectInput, DateInput, TextArea } from '../../components/forms/FormControls';
import { transferApi } from '../../api/transferApi';
import { warehouseApi } from '../../api/warehouseApi';
import { branchApi } from '../../api/branchApi';
import { inventoryApi } from '../../api/inventoryApi';
import { productApi } from '../../api/productApi';
import { Plus, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export const CreateStockTransfer = () => {
  const navigate = useNavigate();
  const loadGeneration = useRef(0);
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const [saving, setSaving] = useState(false);

  // Location Types & Names
  const [sourceType, setSourceType] = useState('Warehouse');
  const [sourceName, setSourceName] = useState('');
  const [destType, setDestType] = useState('Branch');
  const [destName, setDestName] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Master Data Lists
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Transfer Items Array
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    const generation = ++loadGeneration.current;
    try {
      setLoading(true);
      const [wRes, bRes, _rmRes, _vRes] = await Promise.all([
        warehouseApi.getWarehouses().catch(() => ({ data: [] })),
        branchApi.getBranches().catch(() => ({ data: [] })),
        inventoryApi.getRawMaterials().catch(() => ({ data: [] })),
        productApi.getVariants().catch(() => ({ data: [] })),
      ]);

      const wList = wRes.data || [];
      const bList = bRes.data || [];
      const initialSource=wList[0]?.name;
      const [scopedRaw,scopedVariants]=initialSource ? await Promise.all([inventoryApi.getRawMaterials({location:initialSource}),productApi.getVariants({location:initialSource})]) : [{data:[]},{data:[]}];
      const rmList = scopedRaw.data || [];
      const vList = scopedVariants.data || [];

      const saved = editId ? (await transferApi.getTransferDetail(editId)).data : null;
      if (generation !== loadGeneration.current) return;
      setWarehouses(wList);
      setBranches(bList);
      setRawMaterials(rmList);
      setVariants(vList);

      if (wList.length > 0) setSourceName(wList[0].name);
      if (bList.length > 0) setDestName(bList[0].name);

      // Default initial item row (Finished Product)
      const firstVar = vList[0];
      setItems([
        {
          itemType: 'Finished Product',
          sku: firstVar ? firstVar.sku : '',
          itemId: firstVar ? firstVar.id : '',
          itemName: firstVar ? `${firstVar.productName} ${firstVar.sizeName} ${firstVar.concentrationName}` : '',
          availableQty: firstVar ? firstVar.stock || 0 : 0,
          requestedQty: 10,
        },
      ]);
      if (editId) {
        if (saved.status !== 'Requested') throw new Error('Only requested transfers can be edited');
        setSourceType(saved.sourceType); setSourceName(saved.sourceName); setDestType(saved.destType); setDestName(saved.destName);
        setDate(saved.date); setNotes(saved.notes || ''); setItems(saved.items);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load master locations and item catalogs');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!sourceName) return;
    let live = true;
    Promise.all([productApi.getVariants({location:sourceName}), inventoryApi.getRawMaterials({location:sourceName})]).then(([v,r]) => {
      if (!live) return;
      setVariants(v.data); setRawMaterials(r.data);
      setItems(prev => prev.map(item => { const found=(item.itemType==='Raw Material'?r.data:v.data).find(x=>x.id===item.itemId); return {...item,availableQty:found ? Number(found.stock ?? found.availableStock ?? 0):0}; }));
    }).catch(() => {});
    return () => {live=false;};
  }, [sourceName]);
  // Available location dropdown options based on location types
  const sourceOptions =
    sourceType === 'Warehouse'
      ? warehouses.map((w) => ({ label: `${w.name} (${w.code || 'Warehouse'})`, value: w.name }))
      : branches.map((b) => ({ label: `${b.name} (${b.code || 'Branch'})`, value: b.name }));

  const destOptions =
    destType === 'Warehouse'
      ? warehouses.map((w) => ({ label: `${w.name} (${w.code || 'Warehouse'})`, value: w.name }))
      : branches.map((b) => ({ label: `${b.name} (${b.code || 'Branch'})`, value: b.name }));

  // Auto-switch location if source == dest
  useEffect(() => {
    if (sourceName && destName && sourceName === destName) {
      const altDest = destOptions.find((o) => o.value !== sourceName);
      if (altDest) setDestName(altDest.value);
    }
  }, [sourceName, destName, sourceType, destType]);

  const handleAddItem = () => {
    const defaultVar = variants[0];
    setItems([
      ...items,
      {
        itemType: 'Finished Product',
        sku: defaultVar ? defaultVar.sku : '',
        itemId: defaultVar ? defaultVar.id : '',
        itemName: defaultVar ? `${defaultVar.productName} ${defaultVar.sizeName} ${defaultVar.concentrationName}` : '',
        availableQty: defaultVar ? defaultVar.stock || 0 : 0,
        requestedQty: 5,
      },
    ]);
  };

  const handleRemoveItem = (idx) => {
    if (items.length === 1) {
      toast.error('Transfer request must contain at least 1 item');
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemTypeChange = (idx, newType) => {
    const updated = [...items];
    updated[idx].itemType = newType;
    if (newType === 'Finished Product' && variants.length > 0) {
      const v = variants[0];
      updated[idx].sku = v.sku;
      updated[idx].itemId = v.id;
      updated[idx].itemName = `${v.productName} ${v.sizeName} ${v.concentrationName}`;
      updated[idx].availableQty = v.stock || 0;
    } else if (newType === 'Raw Material' && rawMaterials.length > 0) {
      const rm = rawMaterials[0];
      updated[idx].sku = rm.code || rm.id;
      updated[idx].itemId = rm.id;
      updated[idx].itemName = rm.name;
      updated[idx].availableQty = rm.availableStock || 0;
    }
    setItems(updated);
  };

  const handleItemSelect = (idx, selectedId) => {
    const updated = [...items];
    const row = updated[idx];
    if (row.itemType === 'Finished Product') {
      const v = variants.find((item) => item.id === selectedId || item.sku === selectedId);
      if (v) {
        row.itemId = v.id;
        row.sku = v.sku;
        row.itemName = `${v.productName} ${v.sizeName} ${v.concentrationName}`;
        row.availableQty = v.stock || 0;
      }
    } else {
      const rm = rawMaterials.find((item) => item.id === selectedId || item.code === selectedId);
      if (rm) {
        row.itemId = rm.id;
        row.sku = rm.code || rm.id;
        row.itemName = rm.name;
        row.availableQty = rm.availableStock || 0;
      }
    }
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (sourceName === destName) {
      toast.error('Source and destination locations cannot be identical');
      return;
    }

    if (items.some((i) => Number(i.requestedQty || 0) <= 0)) {
      toast.error('Requested quantity must be greater than 0 for all items');
      return;
    }

    const overQtyItem = items.find((i) => Number(i.requestedQty) > Number(i.availableQty));
    if (overQtyItem) {
      toast.error(`Requested quantity for ${overQtyItem.itemName} exceeds available source stock!`);
      return;
    }

    try {
      if (saving) return; setSaving(true);
      const save = editId ? data => transferApi.updateTransfer(editId,data) : transferApi.createTransfer;
      await save({
        sourceType,
        sourceName,
        destType,
        destName,
        date,
        notes: notes.trim(),
        items,
        itemsCount: items.length,
        requestedBy: 'Current Logged-in User',
      });

      toast.success(`Stock transfer request created successfully! (${sourceName} ➔ ${destName})`);
      navigate('/transfers');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Unable to save transfer request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading Stock Transfer Request Form...</div>;
  }

  return (
    <div>
      <PageHeader
        title={editId ? 'Edit Stock Transfer Request' : 'Create Stock Transfer Request'}
        subtitle="Supports warehouse-to-warehouse, warehouse-to-branch, branch-to-warehouse & branch-to-branch transfers"
        secondaryActions={[
          <button
            key="back"
            onClick={() => navigate('/transfers')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Transfers</span>
          </button>,
        ]}
      />

      <form onSubmit={handleSubmit} className="erp-panel  p-6    space-y-6">
        {/* Header Section: Source & Destination Selection */}
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-4 text-xs">
          <h3 className="font-bold text-gray-900 text-sm">Header - Transfer Route & Logistics Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SelectInput
              label="Source Location Type"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              options={[
                { label: 'Warehouse', value: 'Warehouse' },
                { label: 'Branch', value: 'Branch' },
              ]}
              required
            />

            <SelectInput
              label="Source Location"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              options={sourceOptions}
              required
            />

            <SelectInput
              label="Destination Location Type"
              value={destType}
              onChange={(e) => setDestType(e.target.value)}
              options={[
                { label: 'Warehouse', value: 'Warehouse' },
                { label: 'Branch', value: 'Branch' },
              ]}
              required
            />

            <SelectInput
              label="Destination Location"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              options={destOptions}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateInput
              label="Request Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950 font-medium self-end">
              Route: <strong className="font-bold">{sourceName} ({sourceType})</strong> ➔ <strong className="font-bold">{destName} ({destType})</strong>
            </div>
          </div>
        </div>

        {/* Transfer Items Section */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Items Breakdown - Raw Materials & Finished Products</h3>
              <p className="text-gray-500 text-xs">Select raw materials or finished product SKUs and specify requested quantity</p>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="erp-table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
                  <th className="p-3 w-40">Item Type</th>
                  <th className="p-3">Item / SKU Description</th>
                  <th className="p-3 w-44">Available at Source</th>
                  <th className="p-3 w-44">Requested Quantity</th>
                  <th className="p-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="p-2.5">
                      <select
                        value={item.itemType}
                        onChange={(e) => handleItemTypeChange(idx, e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-xl bg-white font-semibold text-gray-800 text-xs"
                      >
                        <option value="Finished Product">Finished Product</option>
                        <option value="Raw Material">Raw Material</option>
                      </select>
                    </td>

                    <td className="p-2.5">
                      {item.itemType === 'Finished Product' ? (
                        <select
                          value={item.itemId}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-xl bg-white font-bold text-gray-900 text-xs"
                        >
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.sku} - {v.productName} ({v.sizeName} {v.concentrationName})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={item.itemId}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-xl bg-white font-bold text-gray-900 text-xs"
                        >
                          {rawMaterials.map((rm) => (
                            <option key={rm.id} value={rm.id}>
                              {rm.code || rm.id} - {rm.name} ({rm.category})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="p-2.5 font-bold text-gray-700 font-mono">
                      <span className="bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                        {item.availableQty} {item.itemType === 'Finished Product' ? 'pcs' : 'units'}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <input
                        type="number"
                        min="1"
                        max={item.availableQty}
                        value={item.requestedQty}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].requestedQty = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-xl font-bold text-gray-900 text-xs"
                        required
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <TextArea
          label="Notes & Special Instructions"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Expedited store replenishment note..."
          rows={3}
        />

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/transfers')}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[#252525] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
            <span>Submit Transfer Request</span>
          </button>
        </div>
      </form>
    </div>
  );
};

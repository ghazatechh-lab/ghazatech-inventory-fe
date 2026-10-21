import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SelectInput, NumberInput, DateInput, TextArea } from '../../components/forms/FormControls';
import { productApi } from '../../api/productApi';
import { warehouseApi } from '../../api/warehouseApi';
import { productionApi } from '../../api/productionApi';

import { CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const CreateProductionBatch = () => {
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [plannedQty, setPlannedQty] = useState(100);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [wRes, vRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        productApi.getVariants(),
      ]);
      setWarehouses(wRes.data);
      setVariants(vRes.data);
      if (wRes.data.length) setSelectedWarehouseId(wRes.data[0].id);
      if (vRes.data.length) setSelectedVariantId(vRes.data[1]?.id || vRes.data[0].id);
    } catch {
      toast.error('Failed to load batch form data');
    } finally {
      setLoading(false);
    }
  };

  const currentVariant = variants.find((v) => v.id === selectedVariantId);

  const reqQty = Number(plannedQty || 0);
  const [materialAvailability, setMaterialAvailability] = useState([]);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let live = true; setChecking(true);
    if (!selectedVariantId || !selectedWarehouseId || reqQty <= 0) { setMaterialAvailability([]); return; }
    productionApi.checkMaterialAvailability(selectedVariantId, reqQty, selectedWarehouseId)
      .then(({data}) => { if (live) setMaterialAvailability(data); })
      .catch(() => { if (live) setMaterialAvailability([{name:'Availability check failed',status:'Insufficient'}]); })
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, [selectedVariantId, selectedWarehouseId, reqQty]);
  const hasInsufficient = materialAvailability.some((m) => m.status === 'Insufficient');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVariantId) {
      toast.error('Please select a finished product variant');
      return;
    }
    if (!reqQty || Number(reqQty) <= 0) {
      toast.error('Please enter a valid planned batch quantity');
      return;
    }
    if (!selectedWarehouseId) {
      toast.error('Target warehouse location is required');
      return;
    }
    if (!date) {
      toast.error('Production date is required');
      return;
    }
    if (hasInsufficient || checking) {
      toast.error('Cannot create batch: Material stock is insufficient!');
      return;
    }

    try {
      await productionApi.createBatch({
        warehouseId: selectedWarehouseId,
        warehouseName: warehouses.find((w) => w.id === selectedWarehouseId)?.name || '—',
        productVariantId: selectedVariantId,
        productSku: currentVariant?.sku,
        productName: `${currentVariant?.productName} ${currentVariant?.sizeName} ${currentVariant?.concentrationName}`,
        plannedQty: reqQty,
        date,
        notes,

      });
      toast.success('Production Batch created successfully in Draft status!');
      navigate('/production/batches');
    } catch {
      toast.error('Failed to create production batch');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading Batch Creator...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Create Production Batch"
        subtitle="Schedule perfume manufacturing batch and verify material availability"
        secondaryActions={[
          <button
            key="back"
            onClick={() => navigate('/production/batches')}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Batches</span>
          </button>,
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="erp-panel  p-6    space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectInput
              label="Source / Production Warehouse"
              required
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            />
            <SelectInput
              label="Product Variant SKU"
              required
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              options={variants.map((v) => ({ value: v.id, label: `${v.sku} - ${v.productName} (${v.sizeName} ${v.concentrationName})` }))}
            />
            <NumberInput
              label="Planned Production Quantity (Bottles)"
              required
              min="1"
              value={plannedQty}
              onChange={(e) => setPlannedQty(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateInput label="Scheduled Production Date" required value={date} onChange={(e) => setDate(e.target.value)} />
            <TextArea label="Production Batch Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Batch notes & lab operator notes..." />
          </div>
        </div>

        {/* Material Availability Verification Section (Section 10 Requirement) */}
        <div className="erp-panel  p-6   ">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Material Availability Verification</h3>
          <p className="text-xs text-gray-500 mb-4">Live inventory check against formulation bill of materials</p>

          <div className="overflow-x-auto">
            <table className="erp-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-y border-gray-200 uppercase">
                  <th className="p-3">Material Required</th>
                  <th className="p-3">Required Quantity</th>
                  <th className="p-3">Available Stock</th>
                  <th className="p-3 text-center">Material Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialAvailability.map((m, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-bold text-gray-900">{m.name}</td>
                    <td className="p-3 font-semibold text-gray-700">{m.required}</td>
                    <td className="p-3 font-bold">{m.available}</td>
                    <td className="p-3 text-center">
                      {m.status === 'Available' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                          Insufficient Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasInsufficient && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center space-x-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Production cannot be submitted because required bottle material is insufficient. Please adjust planned quantity or restock bottles.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button type="button" onClick={() => navigate('/production/batches')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={hasInsufficient || checking}
            className="px-5 py-2 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 rounded-lg shadow-xs transition-colors"
          >
            Create Batch Record
          </button>
        </div>
      </form>
    </div>
  );
};

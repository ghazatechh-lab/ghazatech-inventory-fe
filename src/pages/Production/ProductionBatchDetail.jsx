import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';

import { ConfirmModal } from '../../components/common/ConfirmModal';
import { productionApi } from '../../api/productionApi';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';

export const ProductionBatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Editable actual consumption inputs for completion calculation
  const [actualConsumption, setActualConsumption] = useState([]);

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const fetchBatch = async () => {
    try {
      const res = await productionApi.getBatchDetail(id);
      const found = res.data;
      setBatch(found);
      if (found.standardConsumption) {
        setActualConsumption(
          found.standardConsumption.map((s) => ({
            ...s,
            unit: s.unit,
          }))
        );
      }
    } catch {
      toast.error('Failed to load batch detail');
    } finally {
      setLoading(false);
    }
  };

  const handleActualChange = (idx, val) => {
    const next = [...actualConsumption];
    next[idx].actual = Number(val);
    setActualConsumption(next);
  };

  const calculateVariance = (item) => {
    const variance = item.actual - item.standard;
    const varianceCost = variance * item.rate;
    return { variance, varianceCost };
  };

  const totalVarianceCost = actualConsumption.reduce((sum, item) => sum + calculateVariance(item).varianceCost, 0);
  const totalActualCost = Number(batch?.totalCost || 0) + (batch?.status === 'Completed' ? 0 : totalVarianceCost);
  const actualCostPerBottle = totalActualCost / (batch?.producedQty || batch?.plannedQty || 1);

  const handleCompleteBatch = async () => {
    setCompleting(true);
    try {
      const calculatedConsumption = actualConsumption.map((item) => {
        const { variance, varianceCost } = calculateVariance(item);
        return { ...item, variance, varianceCost };
      });

      await productionApi.completeBatch(batch.id, {
        actualProduced: batch.plannedQty,
        finalUnitCost: actualCostPerBottle,
        actualConsumption: calculatedConsumption,
      });

      toast.success('Production Batch completed! Finished stock created and raw stock consumed.');
      setIsConfirmingCompletion(false);
      fetchBatch();
    } catch {
      toast.error('Failed to complete production batch');
    } finally {
      setCompleting(false);
    }
  };

  if (!loading && !batch) return <div className="p-6 text-center text-gray-500">Unable to load this record. Check your permissions and backend connection.</div>;
  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading batch details...</div>;
  }

  const isCompleted = batch.status === 'Completed';

  return (
    <div>
      <PageHeader
        title={`Production Batch ${batch.batchNo}`}
        subtitle={`Key Screen: ${batch.productName} • Source: ${batch.warehouseName}`}
        secondaryActions={[
          <button
            key="back"
            onClick={() => navigate('/production/batches')}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Batches</span>
          </button>,
          !isCompleted && (
            <button
              key="complete"
              onClick={() => setIsConfirmingCompletion(true)}
              className="px-4 py-2 bg-[#15803D] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Batch & Update Stock</span>
            </button>
          ),
        ]}
      />

      {/* Completed Summary Cards (Section 10A Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="erp-panel  p-4   ">
          <span className="text-xs text-gray-500 uppercase font-bold">Planned Qty</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{batch.plannedQty} pcs</div>
        </div>
        <div className="erp-panel  p-4   ">
          <span className="text-xs text-gray-500 uppercase font-bold">Produced Qty</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{batch.producedQty} pcs</div>
        </div>
        <div className="erp-panel  p-4   ">
          <span className="text-xs text-gray-500 uppercase font-bold">Total Batch Cost</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(batch.totalCost)}</div>
        </div>
        <div className="erp-panel  p-4   ">
          <span className="text-xs text-gray-500 uppercase font-bold">Cost per Bottle</span>
          <div className="text-2xl font-bold text-[var(--primary)] mt-1">{formatCurrency(batch.unitCost)}</div>
        </div>
        <div className="erp-panel  p-4   ">
          <span className="text-xs text-gray-500 uppercase font-bold">Variance Cost</span>
          <div className={`text-2xl font-bold mt-1 ${totalVarianceCost > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalVarianceCost > 0 ? `+${formatCurrency(totalVarianceCost)}` : formatCurrency(totalVarianceCost)}
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-200 mb-6 text-xs font-semibold">
        {['Overview', 'Consumption', 'Costing', 'Inventory Transactions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-4 border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[var(--primary)] text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Section 10A Key Screen: Standard vs Actual Consumption Table */}
      {(activeTab === 'Overview' || activeTab === 'Consumption') && (
        <div className="erp-panel  p-6    space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Standard vs Actual Consumption & Variance Breakdown</h3>
            {isCompleted && (
              <span className="inline-flex items-center text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border">
                <Lock className="w-3.5 h-3.5 mr-1 text-gray-500" /> Locked Record
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                  <th className="p-3.5">Material</th>
                  <th className="p-3.5">Standard Qty</th>
                  <th className="p-3.5">Actual Qty Consumed</th>
                  <th className="p-3.5">Variance</th>
                  <th className="p-3.5">Unit Rate</th>
                  <th className="p-3.5 text-right">Variance Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actualConsumption.map((item, idx) => {
                  const { variance, varianceCost } = calculateVariance(item);
                  const isUnfavorable = variance > 0;

                  return (
                    <tr key={idx} className={isUnfavorable ? 'bg-amber-50/40' : ''}>
                      <td className="p-3.5 font-bold text-gray-900">{item.name}</td>
                      <td className="p-3.5 font-semibold text-gray-600">{item.standard} {item.unit}</td>
                      <td className="p-3.5">
                        {!isCompleted ? (
                          <input
                            type="number"
                            value={item.actual}
                            onChange={(e) => handleActualChange(idx, e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded font-bold text-gray-900"
                          />
                        ) : (
                          <span className="font-bold text-gray-900">{item.actual} {item.unit}</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            isUnfavorable
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : variance < 0
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {variance > 0 ? `+${variance}` : variance} {item.unit}
                        </span>
                      </td>
                      <td className="p-3.5">₹{item.rate.toFixed(2)}/{item.unit}</td>
                      <td className="p-3.5 text-right font-bold">
                        <span className={isUnfavorable ? 'text-rose-600' : varianceCost < 0 ? 'text-emerald-600' : 'text-gray-700'}>
                          {varianceCost > 0 ? `+${formatCurrency(varianceCost)}` : formatCurrency(varianceCost)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completion Confirmation Modal (Section 10A Requirement) */}
      <ConfirmModal
        isOpen={isConfirmingCompletion}
        title="Complete Production Batch & Lock Record?"
        message="Completing this production batch will consume raw materials and packaging from Central Warehouse, create finished product stock, calculate final actual cost, generate inventory ledger transactions, and lock the completed batch from normal editing. Proceed?"
        confirmLabel="Confirm Completion & Lock"
        loading={completing}
        onConfirm={handleCompleteBatch}
        onCancel={() => setIsConfirmingCompletion(false)}
      />
    </div>
  );
};

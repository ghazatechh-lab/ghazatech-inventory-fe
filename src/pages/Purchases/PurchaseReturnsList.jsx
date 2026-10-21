import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { purchaseApi } from '../../api/purchaseApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RotateCcw, Plus, AlertCircle, Eye, X, CheckCircle2, TrendingDown, Edit3, Trash2 } from 'lucide-react';
import { TextInput, SelectInput, NumberInput, TextArea } from '../../components/forms/FormControls';
import { ReturnDetailModal } from './ReturnDetailModal';
import { toast } from 'sonner';

export const PurchaseReturnsList = () => {
  const [returns, setReturns] = useState([]);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [deleteReturnItem, setDeleteReturnItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // New Return Modal State
  const [selectedGrnId, setSelectedGrnId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [linkedRef, setLinkedRef] = useState('');
  const [material, setMaterial] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [unitCost, setUnitCost] = useState(0);
  const [warehouseName, setWarehouseName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReturns();
    fetchGRNs();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await purchaseApi.getPurchaseReturns();
      setReturns(res.data || []);
    } catch {
      toast.error('Failed to load purchase returns');
    } finally {
      setLoading(false);
    }
  };

  const fetchGRNs = async () => {
    try {
      const res = await purchaseApi.getGoodsReceipts();
      setGrns(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGrnSelect = (grnId) => {
    setSelectedGrnId(grnId);
    const grn = grns.find((g) => g.id === grnId || g.grnNumber === grnId);
    if (grn) {
      setLinkedRef(grn.grnNumber);
      setSupplierName(grn.supplierName);
      setWarehouseName(grn.warehouseName || '—');
      if (grn.items && grn.items.length > 0) {
        setMaterial(grn.items[0].material);
        setUnitCost(grn.items[0].unitCost ?? 0);
      }
    }
  };

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    if (!supplierName || !supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!linkedRef || !linkedRef.trim()) {
      toast.error('Linked GRN reference is required');
      return;
    }
    if (!material || !material.trim()) {
      toast.error('Material item is required');
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast.error('Please enter a valid return quantity');
      return;
    }
    if (unitCost === '' || unitCost === null || isNaN(Number(unitCost)) || Number(unitCost) < 0) {
      toast.error('Valid unit cost is required');
      return;
    }
    if (!reason || !reason.trim()) {
      toast.error('Mandatory return reason is required');
      return;
    }

    setSubmitting(true);
    try {
      const totalAmt = Number(qty) * Number(unitCost);
      const inventoryImpactMsg = `Inventory Deducted (-${qty} ${unit} ${material} from ${warehouseName})`;

      const newReturn = {
        warehouseName,
        supplierName,
        linkedRef,
        date: new Date().toISOString().split('T')[0],
        material,
        qty: Number(qty),
        unit,
        unitCost: Number(unitCost),
        totalAmount: totalAmt,
        reason,
        inventoryImpact: inventoryImpactMsg,
        status: 'Debit Note Issued',
      };

      await purchaseApi.createPurchaseReturn(newReturn);
      toast.success('Purchase Return & Debit Note logged successfully');
      setIsModalOpen(false);
      setQty('');
      setReason('');
      fetchReturns();
    } catch {
      toast.error('Failed to log purchase return');
    } finally {
      setSubmitting(false);
    }
  };

  // Section 4 Table Columns: References received stock & clearly communicates inventory impact
  const columns = [
    {
      header: 'Return Ref',
      accessor: 'returnRef',
      render: (row) => <span className="font-mono font-bold text-rose-600">{row.returnRef}</span>,
    },
    {
      header: 'Supplier',
      accessor: 'supplierName',
      render: (row) => <span className="font-bold text-gray-900">{row.supplierName}</span>,
    },
    {
      header: 'Received Stock / Linked GRN',
      accessor: 'linkedRef',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[var(--primary)] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {row.linkedRef || '—'}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => formatDate(row.date),
    },
    {
      header: 'Returned Item & Qty',
      accessor: 'item',
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.material || row.item}</div>
          <span className="text-xs font-semibold text-rose-600">
            -{row.qty} {row.unit || 'pcs'}
          </span>
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (row) => (
        <span className="text-xs text-gray-600 italic max-w-xs block truncate" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      header: 'Inventory Impact',
      accessor: 'inventoryImpact',
      render: (row) => (
        <div className="bg-rose-50/70 border border-rose-200/80 p-2.5 rounded-xl text-xs space-y-1 max-w-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-800 text-xs flex items-center">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0 mr-1" />
              Stock Deducted: -{row.qty} {row.unit || 'pcs'}
            </span>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              Debit Note
            </span>
          </div>
          <p className="text-xs text-gray-700 font-medium line-clamp-2" title={row.inventoryImpact}>
            {row.inventoryImpact}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          {row.status || 'Debit Note Issued'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedReturn(row);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["purchases.return.edit","purchases.returns"]}><button
            onClick={() => {
              setIsEditMode(true);
              setSelectedReturn(row);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Return"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["purchases.return.delete","purchases.returns"]}><button disabled title="Posted record: use the supported return or correction workflow"
            onClick={() => setDeleteReturnItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deleteReturnItem) return;
    try {
      await purchaseApi.deletePurchaseReturn(deleteReturnItem.id);
      toast.success(`Purchase return "${deleteReturnItem.returnNumber}" deleted successfully.`);
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteReturnItem(null);
    }
  };

  const handleReturnUpdate = (updatedReturn) => {
    setReturns((prev) =>
      prev.map((r) => (r.id === updatedReturn.id || r.returnRef === updatedReturn.returnRef ? { ...r, ...updatedReturn } : r))
    );
    setSelectedReturn(updatedReturn);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Returns & Debit Notes"
        subtitle="Return defective vendor stock, track received GRN references & communicate live inventory deductions"
        primaryAction={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Purchase Return</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={returns}
        loading={loading}
        searchPlaceholder="Search return ref, supplier, linked GRN or returned item..."
      />

      {/* View Return Details Modal */}
      {selectedReturn && (
        <ReturnDetailModal
          isOpen={!!selectedReturn}
          returnItem={selectedReturn}
          initialEdit={isEditMode}
          onClose={() => setSelectedReturn(null)}
          onUpdate={handleReturnUpdate}
        />
      )}

      {/* Modal to Create Purchase Return with Stock Deduction Impact */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-lg w-full p-6  space-y-4 ">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-gray-900 text-base">Issue Purchase Return to Vendor</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-3.5 text-xs">
              <SelectInput
                label="Select Received Stock (Linked GRN)"
                value={selectedGrnId}
                onChange={(e) => handleGrnSelect(e.target.value)}
                options={[{label:'Select a receipt',value:''}, ...grns.map(g => ({label:`${g.grnNumber} - ${g.supplierName} (${g.receiveDate})`,value:g.id}))]}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Supplier Name" value={supplierName} readOnly className="bg-gray-50 font-bold" />
                <TextInput label="Linked GRN Ref" value={linkedRef} readOnly className="bg-gray-50 font-mono font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Material Item" value={material} onChange={(e) => setMaterial(e.target.value)} required />
                <TextInput label="Target Warehouse" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} required />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <NumberInput
                  label="Return Qty"
                  placeholder="e.g. 20"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                  min={1}
                />
                <SelectInput
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  options={[
                    { label: 'pcs', value: 'pcs' },
                    { label: 'ml', value: 'ml' },
                    { label: 'bottles', value: 'bottles' },
                  ]}
                />
                <NumberInput
                  label="Unit Cost (INR)"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  required
                />
              </div>

              <TextArea
                label="Mandatory Reason for Return"
                placeholder="e.g. Hairline cracks detected during quality inspection, incorrect viscosity grade"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
              />

              {/* Explicit Inventory Impact Communication Box */}
              {qty > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Inventory & Payable Impact Summary:</span>
                  </div>
                  <ul className="list-disc list-inside text-rose-700 space-y-0.5 pl-1">
                    <li>Deducts <strong>-{qty} {unit} {material}</strong> from {warehouseName}.</li>
                    <li>Issues Debit Note for <strong>{formatCurrency(Number(qty) * Number(unitCost))}</strong> to {supplierName}.</li>
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Processing...' : 'Confirm Return & Debit Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Return Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteReturnItem}
        title="Delete Purchase Return"
        message={`Are you sure you want to delete purchase return "${deleteReturnItem?.returnNumber || deleteReturnItem?.returnRef}"?`}
        confirmText="Delete Return"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteReturnItem(null)}
      />
    </div>
  );
};

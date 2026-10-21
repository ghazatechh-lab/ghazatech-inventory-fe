import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { inventoryApi } from '../../api/inventoryApi';
import { warehouseApi } from '../../api/warehouseApi';
import { branchApi } from '../../api/branchApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  Trash2,
  Plus,
  AlertTriangle,
  Flame,
  Building2,
  User,
  X,
  CheckCircle2,
  Eye,
  Edit3
} from 'lucide-react';
import { TextInput, SelectInput, NumberInput, TextArea } from '../../components/forms/FormControls';
import { toast } from 'sonner';

export const WastageList = () => {
  const [editingWastage, setEditingWastage] = useState(null);
  const [wastages, setWastages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewWastageItem, setViewWastageItem] = useState(null);
  const [deleteWastageItem, setDeleteWastageItem] = useState(null);
  const { user } = useAuth();

  // Modal Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [item, setItem] = useState('');
  const [location, setLocation] = useState('Central Warehouse');
  const [wastageType, setWastageType] = useState('Oil Spillage');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('ml');
  const [cost, setCost] = useState('');
  const [relatedBatch, setRelatedBatch] = useState('');
  const [reason, setReason] = useState('');
  const [locations, setLocations] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWastages();
    fetchLocations();
  }, []);

  const fetchWastages = async () => {
    try {
      const res = await inventoryApi.getWastage();
      setWastages(res.data || []);
    } catch (err) {
      console.error('Failed to load wastage records:', err);
      toast.error('Failed to load wastage records');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const [wRes, bRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        branchApi.getBranches(),
      ]);
      const locList = [
        ...(wRes.data || []).map((w) => ({ label: `${w.name} (Warehouse)`, value: w.name })),
        ...(bRes.data || []).map((b) => ({ label: `${b.name} (Branch)`, value: b.name })),
      ];
      setLocations(locList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordWastage = async (e) => {
    e.preventDefault();
    if (!item.trim()) {
      toast.error('Please enter the material or item name');
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast.error('Please enter a valid wastage quantity');
      return;
    }
    if (!cost || Number(cost) < 0) {
      toast.error('Please enter a valid wastage cost');
      return;
    }
    if (!reason.trim()) {
      toast.error('Mandatory wastage reason is required');
      return;
    }

    setSubmitting(true);
    try {
      const newWastage = {
        date,
        item,
        location,
        wastageType,
        qty: Number(qty),
        unit,
        cost: Number(cost),
        relatedBatch: relatedBatch.trim() || 'N/A',
        reason,
        user: user?.name || 'Production Manager',
      };

      if (editingWastage) await inventoryApi.updateWastage(editingWastage.id, {reason});
      else await inventoryApi.createWastage(newWastage);
      setEditingWastage(null);
      toast.success('Wastage record logged successfully');
      setIsModalOpen(false);

      // Reset form
      setItem('');
      setQty('');
      setCost('');
      setReason('');
      fetchWastages();
    } catch {
      toast.error('Failed to log wastage record');
    } finally {
      setSubmitting(false);
    }
  };

  // Metric summaries
  const totalWastageCount = wastages.length;
  const totalWastageCost = wastages.reduce((acc, w) => acc + Number(w.cost || 0), 0);

  const getWastageBadgeClass = (type) => {
    switch (type) {
      case 'Oil Spillage':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Solvent Evaporation':
      case 'Solvent Loss':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Bottle Breakage':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'QC Defect':
      case 'Capping Defect':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  // Section 6 Explicit Table Columns: date, item, location, wastage type, quantity, cost, related batch, reason and user
  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => <span className="font-medium text-gray-700">{formatDate(row.date)}</span>,
    },
    {
      header: 'Item',
      accessor: 'item',
      render: (row) => (
        <span className="font-bold text-gray-900 flex items-center space-x-1">
          <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0 inline" />
          <span>{row.item}</span>
        </span>
      ),
    },
    {
      header: 'Location',
      accessor: 'location',
      render: (row) => <span className="text-xs font-semibold text-gray-700">{row.location}</span>,
    },
    {
      header: 'Wastage Type',
      accessor: 'wastageType',
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getWastageBadgeClass(
            row.wastageType
          )}`}
        >
          {row.wastageType}
        </span>
      ),
    },
    {
      header: 'Quantity',
      accessor: 'qty',
      render: (row) => (
        <span className="font-bold text-gray-900">
          {row.qty || row.quantity} {row.unit || 'units'}
        </span>
      ),
    },
    {
      header: 'Cost',
      accessor: 'cost',
      render: (row) => (
        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
          {formatCurrency(row.cost)}
        </span>
      ),
    },
    {
      header: 'Related Batch',
      accessor: 'relatedBatch',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[var(--primary)] bg-amber-50/50 px-2 py-0.5 rounded border border-amber-200/50">
          {row.relatedBatch || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (row) => <span className="text-xs text-gray-600 italic max-w-xs block truncate" title={row.reason}>{row.reason}</span>,
    },
    {
      header: 'User',
      accessor: 'user',
      render: (row) => (
        <div className="flex items-center space-x-1.5 text-xs font-medium text-gray-700">
          <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span>{row.user || row.recordedBy || 'System Admin'}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setViewWastageItem(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="inventory.wastage"><button
            onClick={() => {
              setItem(row.item || '');
              setQty(row.qty || row.quantity || '');
              setCost(row.cost || '');
              setReason(row.reason || '');
              setEditingWastage(row);
              setIsModalOpen(true);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Log"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="inventory.wastage"><button disabled title="Posted record: use the supported return or correction workflow"
            onClick={() => setDeleteWastageItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  const handleDeleteWastageConfirm = async () => {
    if (!deleteWastageItem) return;
    try {
      await inventoryApi.deleteWastage(deleteWastageItem.id);
      toast.success('Wastage record deleted successfully.');
      fetchWastages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteWastageItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Production Wastage"
        subtitle="Log and monitor raw material spillage, solvent evaporation, bottle breakage, QC rejects & batch losses"
        primaryAction={
          <button
            onClick={() => { setEditingWastage(null); setIsModalOpen(true); }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Wastage</span>
          </button>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="erp-panel  p-4  border border-rose-100  flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Logged Incidents</p>
            <h4 className="text-xl font-bold text-rose-600">{totalWastageCount}</h4>
          </div>
        </div>

        <div className="erp-panel  p-4  border border-rose-100  flex items-center space-x-4">
          <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Wastage Financial Loss</p>
            <h4 className="text-xl font-bold text-rose-700">{formatCurrency(totalWastageCost)}</h4>
          </div>
        </div>

        <div className="erp-panel  p-4    flex items-center space-x-4">
          <div className="p-3 bg-gray-50 text-[var(--primary)] rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Monitored Facilities</p>
            <h4 className="text-xl font-bold text-gray-900">{locations.length || 2}</h4>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={wastages}
        loading={loading}
        searchPlaceholder="Search wastage item, batch, location or reason..."
      />

      {/* Modal to Record New Wastage */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-lg w-full p-6  space-y-4 ">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-gray-900 text-lg">Record Inventory Wastage</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordWastage} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <TextInput disabled={!!editingWastage}
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />

                <SelectInput disabled={!!editingWastage}
                  label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  options={locations}
                  required
                />
              </div>

              <TextInput disabled={!!editingWastage}
                label="Item / Material Name"
                placeholder="e.g. Glass Bottle 50ml Luxury, Aventus Oil"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <SelectInput disabled={!!editingWastage}
                  label="Wastage Type"
                  value={wastageType}
                  onChange={(e) => setWastageType(e.target.value)}
                  options={[
                    { label: 'Oil Spillage', value: 'Oil Spillage' },
                    { label: 'Solvent Evaporation', value: 'Solvent Evaporation' },
                    { label: 'Bottle Breakage', value: 'Bottle Breakage' },
                    { label: 'QC Defect', value: 'QC Defect' },
                    { label: 'Capping Defect', value: 'Capping Defect' },
                    { label: 'Handling Loss', value: 'Handling Loss' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  required
                />

                <TextInput disabled={!!editingWastage}
                  label="Related Batch No."
                  placeholder="e.g. PB-2026-000124"
                  value={relatedBatch}
                  onChange={(e) => setRelatedBatch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <NumberInput disabled={!!editingWastage}
                  label="Quantity"
                  placeholder="e.g. 5"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                  min={0.01}
                />

                <SelectInput disabled={!!editingWastage}
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  options={[
                    { label: 'ml (Milliliters)', value: 'ml' },
                    { label: 'pcs (Pieces)', value: 'pcs' },
                    { label: 'bottles', value: 'bottles' },
                    { label: 'grams', value: 'grams' },
                  ]}
                  required
                />

                <NumberInput disabled={!!editingWastage}
                  label="Cost (₹)"
                  placeholder="e.g. 66"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                  min={0}
                />
              </div>

              <TextArea
                label="Mandatory Reason & Root Cause"
                placeholder="Describe why this wastage occurred (e.g. Dropped box, pipette leakage, crimper misaligned)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
              />

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Log Wastage'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Wastage Modal */}
      {viewWastageItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4  text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{viewWastageItem.item}</h3>
                  <p className="text-xs text-gray-500">Wastage Log Details</p>
                </div>
              </div>
              <button onClick={() => setViewWastageItem(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Date:</span>
                <span className="font-bold text-gray-900">{formatDate(viewWastageItem.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Wastage Type:</span>
                <span className="font-bold text-rose-700">{viewWastageItem.wastageType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Location:</span>
                <span className="font-bold text-gray-800">{viewWastageItem.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Quantity Wasted:</span>
                <span className="font-bold text-gray-900">{viewWastageItem.qty || viewWastageItem.quantity} {viewWastageItem.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Financial Loss:</span>
                <span className="font-bold text-rose-600">{formatCurrency(viewWastageItem.cost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Related Batch:</span>
                <span className="font-mono font-bold text-[var(--primary)]">{viewWastageItem.relatedBatch || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Recorded By:</span>
                <span className="font-bold text-gray-800">{viewWastageItem.user || viewWastageItem.recordedBy || 'System Admin'}</span>
              </div>
              <div className="pt-1">
                <span className="text-gray-500 block mb-1">Reason / Root Cause:</span>
                <p className="p-2.5 bg-gray-50 rounded-xl text-gray-700 italic border border-gray-200/60 leading-relaxed">
                  {viewWastageItem.reason || 'No reason provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteWastageItem}
        title="Delete Wastage Log"
        message={`Are you sure you want to delete the wastage record for "${deleteWastageItem?.item}"?`}
        confirmText="Delete Log"
        type="danger"
        onConfirm={handleDeleteWastageConfirm}
        onClose={() => setDeleteWastageItem(null)}
      />
    </div>
  );
};

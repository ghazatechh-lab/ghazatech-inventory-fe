import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { productionApi } from '../../api/productionApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Eye, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Can } from '../../components/common/Can';
import { ProductionBatchModal } from './ProductionBatchModal';
import { toast } from 'sonner';

export const ProductionBatchList = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteBatchItem, setDeleteBatchItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await productionApi.getBatches();
      setBatches(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (batch) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBatchItem) return;
    try {
      await productionApi.deleteBatch(deleteBatchItem.id);
      toast.success(`Production batch "${deleteBatchItem.batchNo}" deleted successfully.`);
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteBatchItem(null);
    }
  };

  const columns = [
    {
      header: 'Batch No',
      accessor: 'batchNo',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.batchNo}</span>,
    },
    { header: 'Production Date', accessor: 'date', render: (row) => formatDate(row.date) },
    { header: 'Source Warehouse', accessor: 'warehouseName' },
    {
      header: 'Product Variant',
      accessor: 'productName',
      render: (row) => <span className="font-bold text-gray-900">{row.productName}</span>,
    },
    {
      header: 'Planned Qty',
      accessor: 'plannedQty',
      render: (row) => <span className="font-semibold">{row.plannedQty} pcs</span>,
    },
    {
      header: 'Produced Qty',
      accessor: 'producedQty',
      render: (row) => <span className="font-bold text-gray-900">{row.producedQty || 0} pcs</span>,
    },
    {
      header: 'Final Unit Cost',
      accessor: 'unitCost',
      render: (row) => <span className="font-bold text-emerald-700">{formatCurrency(row.unitCost)}</span>,
    },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-center">
          <button
            onClick={() => handleOpenModal(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="production.add_batch"><button
            onClick={() => handleOpenModal(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Batch"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="production.add_batch"><button
            disabled={row.status !== 'Draft'}
            onClick={() => setDeleteBatchItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Batch"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production & Manufacturing Batches"
        subtitle="Perfume formulation blending, batch execution, actual consumption & variance"
        primaryAction={
          <Can permission="production.add_batch">
            <button
              onClick={() => navigate('/production/batches/create')}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[#252525] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-[var(--primary)]" />
              <span>Create Production Batch</span>
            </button>
          </Can>
        }
      />

      <DataTable
        columns={columns}
        data={batches}
        loading={loading}
        searchPlaceholder="Search batch number, SKU, or warehouse..."
      />

      {/* Single Unified Production Batch Modal */}
      {isModalOpen && selectedBatch && (
        <ProductionBatchModal
          isOpen={isModalOpen}
          batch={selectedBatch}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBatch(null);
          }}
          onSuccess={() => {
            fetchBatches();
          }}
        />
      )}

      {/* Delete Batch Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteBatchItem}
        title="Delete Production Batch"
        message={`Are you sure you want to delete production batch "${deleteBatchItem?.batchNo}"?`}
        confirmText="Delete Batch"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteBatchItem(null)}
      />
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';

import { ConfirmModal } from '../../components/common/ConfirmModal';
import { purchaseApi } from '../../api/purchaseApi';
import { formatDate } from '../../utils/formatters';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { CreateGRNModal } from './CreateGRNModal';
import { GRNDetailModal } from './GRNDetailModal';
import { toast } from 'sonner';

export const GoodsReceiptList = () => {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [deleteGrnItem, setDeleteGrnItem] = useState(null);

  useEffect(() => {
    fetchGRNs();
  }, []);

  const fetchGRNs = async () => {
    try {
      const res = await purchaseApi.getGoodsReceipts();
      setGrns(res.data || []);
    } catch {
      toast.error('Failed to load goods receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteGrnItem) return;
    try {
      await purchaseApi.deleteGoodsReceipt(deleteGrnItem.id);
      toast.success(`GRN "${deleteGrnItem.grnNumber}" deleted successfully.`);
      fetchGRNs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteGrnItem(null);
    }
  };

  const columns = [
    {
      header: 'GRN Number',
      accessor: 'grnNumber',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.grnNumber}</span>,
    },
    {
      header: 'Linked PO',
      accessor: 'poNumber',
      render: (row) => <span className="font-mono text-xs text-gray-700">{row.poNumber}</span>,
    },
    {
      header: 'Supplier',
      accessor: 'supplierName',
      render: (row) => <span className="font-bold text-gray-900">{row.supplierName}</span>,
    },
    {
      header: 'Receiving Warehouse',
      accessor: 'warehouseName',
      render: (row) => <span className="text-xs text-gray-700">{row.warehouseName || '—'}</span>,
    },
    {
      header: 'Receive Date',
      accessor: 'receiveDate',
      render: (row) => formatDate(row.receiveDate),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            row.status === 'Partial Receipt'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setSelectedGrn(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          
          <button disabled title="Posted record: use the supported return or correction workflow"
            onClick={() => setDeleteGrnItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipts (GRN)"
        subtitle="Record incoming physical inventory against purchase orders with line item inspection & partial receipts"
        primaryAction={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create GRN</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={grns}
        loading={loading}
        searchPlaceholder="Search GRN number, PO reference, supplier or warehouse..."
      />

      {/* Create GRN Modal */}
      {isModalOpen && (
        <CreateGRNModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchGRNs();
          }}
        />
      )}

      {/* GRN View Details Modal */}
      {selectedGrn && (
        <GRNDetailModal
          isOpen={!!selectedGrn}
          grn={selectedGrn}
          onClose={() => setSelectedGrn(null)}
        />
      )}

      {/* Delete GRN Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteGrnItem}
        title="Delete Goods Receipt"
        message={`Are you sure you want to delete GRN "${deleteGrnItem?.grnNumber}"?`}
        confirmText="Delete GRN"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteGrnItem(null)}
      />
    </div>
  );
};


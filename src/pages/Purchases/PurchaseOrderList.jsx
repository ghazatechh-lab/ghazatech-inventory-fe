import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { purchaseApi } from '../../api/purchaseApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Eye, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PODetailModal } from './PODetailModal';
import { toast } from 'sonner';

export const PurchaseOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPo, setSelectedPo] = useState(null);
  const [deletePoItem, setDeletePoItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await purchaseApi.getPurchaseOrders();
      setOrders(res.data || []);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePoUpdate = (updatedPo) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedPo.id || o.poNumber === updatedPo.poNumber ? { ...o, ...updatedPo } : o))
    );
    setSelectedPo(updatedPo);
  };

  const handleDeleteConfirm = async () => {
    if (!deletePoItem) return;
    try {
      await purchaseApi.deletePurchaseOrder(deletePoItem.id);
      toast.success(`Purchase order "${deletePoItem.poNumber}" deleted successfully.`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeletePoItem(null);
    }
  };

  const columns = [
    {
      header: 'PO Number',
      accessor: 'poNumber',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.poNumber}</span>,
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
      header: 'Order Date',
      accessor: 'orderDate',
      render: (row) => formatDate(row.orderDate),
    },
    {
      header: 'Expected Date',
      accessor: 'expectedDate',
      render: (row) => formatDate(row.expectedDate),
    },
    {
      header: 'Grand Total',
      accessor: 'grandTotal',
      render: (row) => <span className="font-bold text-gray-900">{formatCurrency(row.grandTotal)}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedPo(row);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View PO Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["purchases.order.edit","*"]}><button
            onClick={() => {
              setIsEditMode(true);
              setSelectedPo(row);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit PO Items"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["purchases.order.delete","*"]}><button
            onClick={() => setDeletePoItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete PO"
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
        title="Purchase Orders"
        subtitle="Raw material purchasing workflow, vendor line item breakdown & restock orders"
        primaryAction={
          <button
            onClick={() => navigate('/purchases/orders/create')}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchPlaceholder="Search PO number, supplier or receiving warehouse..."
      />

      {/* PO Details & Line Item Editing Modal */}
      {selectedPo && (
        <PODetailModal
          isOpen={!!selectedPo}
          po={selectedPo}
          initialEdit={isEditMode}
          onClose={() => setSelectedPo(null)}
          onUpdate={handlePoUpdate}
        />
      )}

      {/* Delete PO Confirm Modal */}
      <ConfirmModal
        isOpen={!!deletePoItem}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order "${deletePoItem?.poNumber}"?`}
        confirmText="Delete Order"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletePoItem(null)}
      />
    </div>
  );
};


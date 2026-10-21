import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { transferApi } from '../../api/transferApi';
import { formatDate } from '../../utils/formatters';
import { Plus, Eye, CheckCircle2, Truck, PackageCheck, Info, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Can } from '../../components/common/Can';
import { toast } from 'sonner';

export const StockTransferList = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTransferItem, setDeleteTransferItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await transferApi.getTransfers();
      setTransfers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load stock transfers list');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (e, transfer, nextStatus) => {
    e.stopPropagation();
    try {
      if (nextStatus === 'Approved') await transferApi.approveTransfer(transfer.id);
      if (nextStatus === 'Dispatched') await transferApi.dispatchTransfer(transfer.id);
      if (nextStatus === 'Received') await transferApi.receiveTransfer(transfer.id);
      toast.success(`Transfer ${transfer.transferNo} updated to ${nextStatus}!`);
      fetchTransfers();
    } catch {
      toast.error(`Failed to update transfer status to ${nextStatus}`);
    }
  };

  const columns = [
    {
      header: 'Transfer No',
      accessor: 'transferNo',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.transferNo}</span>,
    },
    {
      header: 'Source',
      accessor: 'sourceName',
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900 block">{row.sourceName}</span>
          <span className="text-xs text-gray-500 font-semibold uppercase">{row.sourceType || 'Location'}</span>
        </div>
      ),
    },
    {
      header: 'Destination',
      accessor: 'destName',
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900 block">{row.destName}</span>
          <span className="text-xs text-gray-500 font-semibold uppercase">{row.destType || 'Location'}</span>
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => formatDate(row.date),
    },
    {
      header: 'Items',
      render: (row) => {
        const count = row.itemsCount || row.items?.length || 1;
        const totalPcs = row.items?.reduce((sum, i) => sum + (i.requestedQty || 0), 0) || 0;
        return (
          <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
            {count} {count === 1 ? 'item' : 'items'} {totalPcs > 0 && `(${totalPcs} pcs)`}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Requested By',
      accessor: 'requestedBy',
      render: (row) => <span className="text-xs font-medium text-gray-600">{row.requestedBy || 'System User'}</span>,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          {row.status === 'Requested' && (
            <Can permission={["inventory.transfer.create","*"]}><button
              onClick={(e) => handleQuickAction(e, row, 'Approved')}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
              title="Approve Transfer Request"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button></Can>
          )}

          {row.status === 'Approved' && (
            <Can permission={["inventory.transfer.dispatch","transfers.dispatch"]}><button
              onClick={(e) => handleQuickAction(e, row, 'Dispatched')}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors shadow-2xs"
              title="Dispatch Stock (In-Transit)"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch</span>
            </button></Can>
          )}

          {row.status === 'Dispatched' && (
            <Can permission={["inventory.transfer.receive","transfers.receive"]}><button
              onClick={(e) => handleQuickAction(e, row, 'Received')}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors shadow-2xs"
              title="Confirm Receipt at Destination"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Receive</span>
            </button></Can>
          )}

          <button
            onClick={() => navigate(`/transfers/${row.id}`)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="transfers.create"><button
            disabled={row.status !== 'Requested'} onClick={() => navigate(`/transfers/create?edit=${row.id}`)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Transfer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="transfers.create"><button
            disabled={!['Requested','Approved'].includes(row.status)}
            onClick={() => setDeleteTransferItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Cancel Undispatched Transfer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button></Can>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deleteTransferItem) return;
    try {
      await transferApi.cancelTransfer(deleteTransferItem.id);
      toast.success(`Stock transfer "${deleteTransferItem.transferNo}" cancelled successfully.`);
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteTransferItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        subtitle="Inter-warehouse and branch stock transfer management with authoritative lifecycle tracking"
        primaryAction={
          <Can permission="transfers.create">
            <button
              onClick={() => navigate('/transfers/create')}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[#252525] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-[var(--primary)]" />
              <span>Create Stock Transfer</span>
            </button>
          </Can>
        }
      />

      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Inter-Location Transfers:</strong> Supports warehouse-to-warehouse, warehouse-to-branch, branch-to-warehouse, and branch-to-branch movements. On dispatch, source inventory moves into in-transit state; on receipt confirmation, destination inventory increases cleanly.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={transfers}
        loading={loading}
        searchPlaceholder="Search transfer number, source or destination..."
      />

      {/* Delete Transfer Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTransferItem}
        title="Cancel Stock Transfer"
        message={`Are you sure you want to cancel stock transfer "${deleteTransferItem?.transferNo}"?`}
        confirmText="Cancel Transfer"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTransferItem(null)}
      />
    </div>
  );
};

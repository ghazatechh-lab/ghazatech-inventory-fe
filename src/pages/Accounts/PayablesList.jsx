import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { financeApi } from '../../api/financeApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Eye, Edit, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { toast } from 'sonner';

export const PayablesList = () => {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchPayables();
  }, []);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const res = await financeApi.getPayables();
      setPayables(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayable = async () => {
    if (!deleteItem) return;
    try {
      await financeApi.deletePayable(deleteItem.id);
      toast.success('Payable record deleted successfully.');
      fetchPayables();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteItem(null);
    }
  };

  const payableColumns = [
    { header: 'Supplier', accessor: 'supplierName', render: (row) => <span className="font-bold text-gray-900">{row.supplierName}</span> },
    { header: 'Bill', accessor: 'billNumber', render: (row) => <span className="font-mono font-bold text-rose-700">{row.billNumber}</span> },
    { header: 'Date', accessor: 'date', render: (row) => formatDate(row.date) },
    { header: 'Total', accessor: 'total', render: (row) => <span className="font-bold text-gray-900">{formatCurrency(row.total)}</span> },
    { header: 'Paid', accessor: 'paid', render: (row) => <span className="font-semibold text-emerald-700">{formatCurrency(row.paid)}</span> },
    { header: 'Outstanding', accessor: 'outstanding', render: (row) => <span className="font-bold text-rose-600">{formatCurrency(row.outstanding)}</span> },
    { header: 'Due Date', accessor: 'dueDate', render: (row) => <span className="text-xs font-mono text-gray-600">{formatDate(row.dueDate)}</span> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setViewItem(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Payable"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="finance.payables"><button
            onClick={() => setEditItem(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Payable"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="finance.payables"><button
            disabled title="Settle the originating invoice or bill; deletion is restricted" onClick={() => setDeleteItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Supplier Accounts Payable"
        subtitle="Outstanding vendor bills & supplier payment schedules"
      />

      <DataTable columns={payableColumns} data={payables} loading={loading} searchPlaceholder="Search supplier or bill number..." />

      {/* View Modal (No edit button inside per rule #6) */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Payable Details</h3>
              <button onClick={() => setViewItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Supplier Name</span>
                <span className="font-bold text-gray-900">{viewItem.supplierName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Bill Number</span>
                <span className="font-mono font-bold text-rose-700">{viewItem.billNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Bill Date</span>
                <span className="font-bold text-gray-900">{formatDate(viewItem.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Total Amount</span>
                <span className="font-bold text-gray-900">{formatCurrency(viewItem.total)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Amount Paid</span>
                <span className="font-bold text-emerald-700">{formatCurrency(viewItem.paid)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Outstanding Payable</span>
                <span className="font-bold text-rose-600 text-sm">{formatCurrency(viewItem.outstanding)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-gray-500">Due Date</span>
                <span className="font-mono text-gray-700">{formatDate(viewItem.dueDate)}</span>
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={() => setViewItem(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (No Back to View button, Cancel closes modal) */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Supplier Payable</h3>
              <button onClick={() => setEditItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editItem.outstanding && editItem.outstanding !== 0) {
                  toast.error('Please enter valid balance details.');
                  return;
                }
                try { await financeApi.updatePayable(editItem.id, { outstanding: editItem.outstanding }); fetchPayables();
                toast.success('Payable record updated successfully!');
                setEditItem(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save changes.'); }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  readOnly value={editItem.supplierName || ''}
                  onChange={(e) => setEditItem({ ...editItem, supplierName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Outstanding Payable</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={editItem.outstanding || ''}
                  onChange={(e) => setEditItem({ ...editItem, outstanding: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <ConfirmModal
          isOpen={!!deleteItem}
          title="Delete Payable Record"
          message={`Are you sure you want to delete the payable record for supplier "${deleteItem.supplierName}" (Bill ${deleteItem.billNumber})? This action cannot be undone.`}
          confirmText="Delete Payable"
          onConfirm={handleDeletePayable}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

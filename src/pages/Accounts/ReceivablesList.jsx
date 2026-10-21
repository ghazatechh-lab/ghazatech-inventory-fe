import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { financeApi } from '../../api/financeApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Eye, Edit, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { toast } from 'sonner';

export const ReceivablesList = () => {
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const res = await financeApi.getReceivables();
      setReceivables(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceivable = async () => {
    if (!deleteItem) return;
    try {
      await financeApi.deleteReceivable(deleteItem.id);
      toast.success('Receivable record deleted successfully.');
      fetchReceivables();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteItem(null);
    }
  };

  const receivableColumns = [
    { header: 'Customer', accessor: 'customerName', render: (row) => <span className="font-bold text-gray-900">{row.customerName}</span> },
    { header: 'Invoice', accessor: 'invoiceNumber', render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.invoiceNumber}</span> },
    { header: 'Invoice Date', accessor: 'invoiceDate', render: (row) => formatDate(row.invoiceDate) },
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
            title="View Receivable"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="finance.receivables"><button
            onClick={() => setEditItem(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Receivable"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="finance.receivables"><button
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
        title="Customer Accounts Receivable"
        subtitle="Open customer invoice balances awaiting payment collection"
      />

      <DataTable columns={receivableColumns} data={receivables} loading={loading} searchPlaceholder="Search customer or invoice number..." />

      {/* View Modal (No edit button inside per rule #6) */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Receivable Details</h3>
              <button onClick={() => setViewItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Customer</span>
                <span className="font-bold text-gray-900">{viewItem.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Invoice Number</span>
                <span className="font-mono font-bold text-[var(--primary)]">{viewItem.invoiceNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Invoice Date</span>
                <span className="font-bold text-gray-900">{formatDate(viewItem.invoiceDate)}</span>
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
                <span className="font-semibold text-gray-500">Outstanding Balance</span>
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
              <h3 className="text-lg font-bold text-gray-900">Edit Customer Receivable</h3>
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
                try { await financeApi.updateReceivable(editItem.id, { outstanding: editItem.outstanding }); fetchReceivables();
                toast.success('Receivable record updated successfully!');
                setEditItem(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save changes.'); }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  readOnly value={editItem.customerName || ''}
                  onChange={(e) => setEditItem({ ...editItem, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Outstanding Balance</label>
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
          title="Delete Receivable Record"
          message={`Are you sure you want to delete the receivable record for customer "${deleteItem.customerName}" (Invoice ${deleteItem.invoiceNumber})? This action cannot be undone.`}
          confirmText="Delete Receivable"
          onConfirm={handleDeleteReceivable}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

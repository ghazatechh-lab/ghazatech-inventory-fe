import { CreateRecordModal } from '../../components/common/CreateRecordModal';
import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { financeApi } from '../../api/financeApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Eye, Edit, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { toast } from 'sonner';

export const IncomeList = () => {
  const [creating, setCreating] = useState(false);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchIncome();
  }, []);

  const fetchIncome = async () => {
    setLoading(true);
    try {
      const res = await financeApi.getIncome();
      setIncome(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIncome = async () => {
    if (!deleteItem) return;
    try {
      await financeApi.reverseIncome(deleteItem.id);
      toast.success('Income entry reversed; the original is retained.');
      fetchIncome();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteItem(null);
    }
  };

  const incomeColumns = [
    { header: 'Date & Time', accessor: 'date', render: (row) => formatDate(row.date, true) },
    {
      header: 'Inflow Source',
      accessor: 'source',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          {row.source}
        </span>
      ),
    },
    { header: 'Reference', accessor: 'reference', render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.reference}</span> },
    { header: 'Customer', accessor: 'customerName', render: (row) => <span className="font-bold text-gray-900">{row.customerName}</span> },
    { header: 'Branch', accessor: 'branchName' },
    { header: 'Payment Method', accessor: 'paymentMethod', render: (row) => <span className="font-semibold text-gray-700">{row.paymentMethod}</span> },
    { header: 'Amount', accessor: 'amount', render: (row) => <span className="font-bold text-emerald-700">{formatCurrency(row.amount)}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setViewItem(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Income Entry"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["accounting.ledger.edit","finance.cash_bank"]}><button
            onClick={() => setEditItem(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Income Entry"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["accounting.ledger.delete","finance.cash_bank"]}><button
            disabled={row.source !== 'manual' || row.status === 'Reversed'}
            onClick={() => setDeleteItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Reverse Manual Income"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reverse</span>
          </button></Can>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Income & Revenue Inflow Ledger"
        subtitle="Recorded revenue from POS sales, corporate orders & customer receipts"
      />

      <Can permission={["accounting.ledger.create","finance.cash_bank"]}><button onClick={() => setCreating(true)} className="mb-4 px-4 py-2 bg-[var(--primary)] text-white rounded-xl">Add Income</button></Can>
      {creating && <CreateRecordModal title="Add Income" defaults={{date:new Date().toISOString().slice(0,10),account:'Cash'}} fields={[{name:'date',label:'Date',type:'date',required:true},{name:'account',label:'Account',required:true,options:['Cash','Bank']},{name:'reference',label:'Reference',required:true},{name:'description',label:'Description',required:true},{name:'amount',label:'Amount',type:'number',min:0.01,step:'0.01',required:true}]} save={financeApi.createIncome} onClose={() => setCreating(false)} onSuccess={fetchIncome} />}
      <DataTable columns={incomeColumns} data={income} loading={loading} searchPlaceholder="Search invoice reference or customer..." />

      {/* View Income Modal (No internal edit button per rule #6) */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Income Details</h3>
              <button onClick={() => setViewItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Date & Time</span>
                <span className="font-bold text-gray-900">{formatDate(viewItem.date, true)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Description</span>
                <span className="font-bold text-emerald-800">{viewItem.source}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Reference Number</span>
                <span className="font-mono font-bold text-[var(--primary)]">{viewItem.reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Customer</span>
                <span className="font-bold text-gray-900">{viewItem.customerName || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Branch</span>
                <span className="font-bold text-gray-900">{viewItem.branchName || 'Head Office'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Payment Method</span>
                <span className="font-bold text-gray-900">{viewItem.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-gray-500">Amount</span>
                <span className="font-bold text-emerald-700 text-sm">{formatCurrency(viewItem.amount)}</span>
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

      {/* Edit Income Modal (No Back to View button, Cancel closes modal) */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Income Entry</h3>
              <button onClick={() => setEditItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editItem.amount || Number(editItem.amount) <= 0) {
                  toast.error('Please enter a valid amount.');
                  return;
                }
                try { await financeApi.updateIncome(editItem.id, { description: editItem.description }); fetchIncome();
                toast.success('Income entry updated successfully!');
                setEditItem(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save changes.'); }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={editItem.description || ''}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  readOnly value={editItem.customerName || ''}
                  onChange={(e) => setEditItem({ ...editItem, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  readOnly value={editItem.amount || ''}
                  onChange={(e) => setEditItem({ ...editItem, amount: e.target.value })}
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
          title="Reverse Manual Income"
          message={`Are you sure you want to delete the income entry "${deleteItem.reference}" (${formatCurrency(deleteItem.amount)})? An offsetting ledger entry will be recorded.`}
          confirmText="Reverse Income"
          onConfirm={handleDeleteIncome}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

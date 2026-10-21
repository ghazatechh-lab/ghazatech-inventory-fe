import { CreateRecordModal } from '../../components/common/CreateRecordModal';
import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { financeApi } from '../../api/financeApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Wallet, Building2, ShieldAlert, Eye, Edit, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { toast } from 'sonner';

export const CashBankView = () => {
  const [creating,setCreating] = useState(false);
  const [cashBank, setCashBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchCashBank();
  }, []);

  const fetchCashBank = async () => {
    setLoading(true);
    try {
      const res = await financeApi.getCashBank();
      setCashBank(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deleteItem) return;
    try {
      await financeApi.reverseIncome(deleteItem.id);
      toast.success('Manual transaction reversed; the original is retained.');
      fetchCashBank();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteItem(null);
    }
  };

  const transactionColumns = [
    { header: 'Date & Time', accessor: 'date', render: (row) => formatDate(row.date, true) },
    { header: 'Account', accessor: 'account', render: (row) => <span className="font-bold text-gray-800">{row.account}</span> },
    {
      header: 'Transaction Type',
      accessor: 'type',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${row.type === 'Inflow' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {row.type}
        </span>
      ),
    },
    { header: 'Reference', accessor: 'reference', render: (row) => <span className="font-mono text-xs text-[var(--primary)]">{row.reference}</span> },
    { header: 'Description', accessor: 'description', render: (row) => <span className="text-xs text-gray-700">{row.description}</span> },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span className={`font-bold ${row.type === 'Inflow' ? 'text-emerald-700' : 'text-rose-600'}`}>
          {row.type === 'Inflow' ? '+' : '-'}{formatCurrency(row.amount)}
        </span>
      ),
    },
    { header: 'Running Balance', accessor: 'balance', render: (row) => <span className="font-mono font-bold text-gray-900">{formatCurrency(row.balance)}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setViewItem(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Transaction"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["accounting.ledger.edit","finance.cash_bank"]}><button
            onClick={() => setEditItem(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Transaction"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["accounting.ledger.delete","finance.cash_bank"]}><button
            disabled={row.source !== 'manual' || row.status === 'Reversed'}
            onClick={() => setDeleteItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Transaction"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reverse</span>
          </button></Can>
        </div>
      ),
    },
  ];

  if (!loading && !cashBank) return <div className="p-6 text-center text-gray-500">Unable to load this record. Check your permissions and backend connection.</div>;
  if (loading) {
    return <div className="py-12 text-center text-xs text-gray-500">Loading Cash & Bank accounts...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash & Bank Accounts"
        subtitle="Bank accounts, POS register cash, daily inflows/outflows & transaction ledger"
      />
      <Can permission={["accounting.ledger.create","finance.cash_bank"]}><button onClick={() => setCreating(true)} className="mb-4 px-4 py-2 bg-[var(--primary)] rounded-xl text-white">Add Manual Transaction</button></Can>
      {creating && <CreateRecordModal title="Add Manual Transaction" defaults={{date:new Date().toISOString().slice(0,10),account:'Cash',type:'Inflow'}} fields={[{name:'date',label:'Date',type:'date',required:true},{name:'account',label:'Account',options:['Cash','Bank'],required:true},{name:'type',label:'Transaction Type',options:['Inflow','Outflow'],required:true},{name:'reference',label:'Reference',required:true},{name:'description',label:'Description',required:true},{name:'amount',label:'Amount',type:'number',min:0.01,step:'0.01',required:true}]} save={financeApi.createTransaction} onClose={() => setCreating(false)} onSuccess={fetchCashBank} />}


      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Account Card */}
        <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/40 rounded-xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-amber-200/60">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{cashBank.cashAccount?.accountName || 'Petty Cash & POS Registers'}</h4>
                <span className="text-xs font-semibold text-amber-800">Branch Cash Register Account</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-200/60 text-amber-900 font-bold text-xs rounded-full uppercase">Active</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="erp-panel /80 p-3  border border-amber-200/60">
              <p className="text-gray-500 text-xs uppercase font-bold">Current Balance</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{formatCurrency(cashBank.cashAccount?.currentBalance || 0)}</p>
            </div>
            <div className="erp-panel /80 p-3  border border-amber-200/60">
              <p className="text-emerald-700 text-xs uppercase font-bold">Today's Inflow</p>
              <p className="text-base font-bold text-emerald-700 mt-0.5">+{formatCurrency(cashBank.cashAccount?.todaysInflow || 0)}</p>
            </div>
            <div className="erp-panel /80 p-3  border border-amber-200/60">
              <p className="text-rose-700 text-xs uppercase font-bold">Today's Outflow</p>
              <p className="text-base font-bold text-rose-600 mt-0.5">-{formatCurrency(cashBank.cashAccount?.todaysOutflow || 0)}</p>
            </div>
          </div>
        </div>

        {/* Bank Account Card */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-blue-200/60">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{cashBank.bankAccount?.accountName || 'Commercial Bank Primary Account'}</h4>
                <span className="text-xs font-semibold text-blue-800">Aromartist Corporate Bank Account</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-blue-200/60 text-blue-900 font-bold text-xs rounded-full uppercase">Active</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="erp-panel /80 p-3  border border-blue-200/60">
              <p className="text-gray-500 text-xs uppercase font-bold">Current Balance</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{formatCurrency(cashBank.bankAccount?.currentBalance || 0)}</p>
            </div>
            <div className="erp-panel /80 p-3  border border-blue-200/60">
              <p className="text-emerald-700 text-xs uppercase font-bold">Today's Inflow</p>
              <p className="text-base font-bold text-emerald-700 mt-0.5">+{formatCurrency(cashBank.bankAccount?.todaysInflow || 0)}</p>
            </div>
            <div className="erp-panel /80 p-3  border border-blue-200/60">
              <p className="text-rose-700 text-xs uppercase font-bold">Today's Outflow</p>
              <p className="text-base font-bold text-rose-600 mt-0.5">-{formatCurrency(cashBank.bankAccount?.todaysOutflow || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Authoritative Financial Balance Callout Banner */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="font-semibold leading-relaxed">
          <span className="font-bold">Posted balances:</span> Balances reflect posted receipts, payments, refunds and expenses. Correct an originating document or record a settlement to change its balance.
        </p>
      </div>

      {/* Transaction Table */}
      <div className="space-y-3">
        <h4 className="font-bold text-gray-900 text-sm">Cash & Bank Transaction History</h4>
        <DataTable columns={transactionColumns} data={cashBank.transactions || []} loading={loading} searchPlaceholder="Search account transaction or reference..." />
      </div>

      {/* View Modal (No edit button inside per rule #6) */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Transaction Details</h3>
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
                <span className="font-semibold text-gray-500">Account</span>
                <span className="font-bold text-gray-900">{viewItem.account}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Transaction Type</span>
                <span className={`font-bold ${viewItem.type === 'Inflow' ? 'text-emerald-700' : 'text-rose-600'}`}>{viewItem.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Reference</span>
                <span className="font-mono font-bold text-[var(--primary)]">{viewItem.reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Description</span>
                <span className="font-bold text-gray-900">{viewItem.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Amount</span>
                <span className="font-bold text-gray-900 text-sm">{formatCurrency(viewItem.amount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-gray-500">Running Balance</span>
                <span className="font-mono font-bold text-gray-900">{formatCurrency(viewItem.balance)}</span>
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
              <h3 className="text-lg font-bold text-gray-900">Edit Account Transaction</h3>
              <button onClick={() => setEditItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editItem.amount || Number(editItem.amount) <= 0 || !editItem.description) {
                  toast.error('Please enter all required fields.');
                  return;
                }
                try { await financeApi.updateTransaction(editItem.id, { description: editItem.description }); fetchCashBank();
                toast.success('Transaction updated successfully!');
                setEditItem(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save transaction.'); }
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
                <label className="block font-semibold text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  readOnly value={editItem.amount || ''}
                  onChange={(e) => setEditItem({ ...editItem, amount: Number(e.target.value) })}
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
          title="Reverse Manual Transaction"
          message={`Are you sure you want to reverse transaction "${deleteItem.reference}" (${formatCurrency(deleteItem.amount)})? The original is retained with an offsetting entry.`}
          confirmText="Reverse Transaction"
          onConfirm={handleDeleteTransaction}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

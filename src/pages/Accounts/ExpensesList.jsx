import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { TextInput, SelectInput, CurrencyInput, DateInput } from '../../components/forms/FormControls';
import { warehouseApi } from '../../api/warehouseApi';
import { branchApi } from '../../api/branchApi';
import { financeApi } from '../../api/financeApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, X, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const ExpensesList = () => {
  const [locations, setLocations] = useState(['None / Head Office']);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  // New Expense Form State per Basic Accounts spec (Date, Category, optional branch/warehouse, Amount, Payment Method, Reference, Description)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Utilities');
  const [branchOrWarehouse, setBranchOrWarehouse] = useState('None / Head Office');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchExpenses();
    Promise.all([warehouseApi.getWarehouses(), branchApi.getBranches()]).then(([w,b])=>setLocations(['None / Head Office',...w.data.map(x=>x.name),...b.data.map(x=>x.name)])).catch(()=>{});
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await financeApi.getExpenses();
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteItem) return;
    try {
      await financeApi.deleteExpense(deleteItem.id);
      toast.success('Expense record deleted successfully.');
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteItem(null);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    try {
      await financeApi.createExpense({
        date,
        category,
        branchOrWarehouse: branchOrWarehouse || 'None / Head Office',
        amount: Number(amount),
        paymentMethod,
        reference: '',
        description,
      });
      toast.success('Expense recorded successfully!');
      setIsAddOpen(false);
      setAmount('');
      setDescription('');
      setReference('');
      fetchExpenses();
    } catch {
      toast.error('Failed to record expense');
    }
  };

  // Image spec columns: Date, Category, Branch/Warehouse, Description, Payment Method, Amount, Created By
  const columns = [
    { header: 'Date', accessor: 'date', render: (row) => formatDate(row.date) },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          {row.category}
        </span>
      ),
    },
    { header: 'Branch/Warehouse', accessor: 'branchOrWarehouse' },
    { header: 'Description', accessor: 'description', render: (row) => <span className="font-bold text-gray-900">{row.description}</span> },
    { header: 'Payment Method', accessor: 'paymentMethod', render: (row) => <span className="font-semibold text-gray-700">{row.paymentMethod}</span> },
    { header: 'Amount', accessor: 'amount', render: (row) => <span className="font-bold text-rose-600">{formatCurrency(row.amount)}</span> },
    { header: 'Created By', accessor: 'createdBy', render: (row) => <span className="text-xs text-gray-500">{row.createdBy || '—'}</span> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setViewItem(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Expense Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["accounting.expense.edit","finance.expenses"]}><button
            onClick={() => setEditItem(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Expense"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["accounting.expense.delete","finance.expenses"]}><button
            onClick={() => setDeleteItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Expense"
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
        title="Expenses Ledger"
        subtitle="Track operating overheads, store utilities, courier expenses & petty cash"
        primaryAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        }
      />

      <DataTable columns={columns} data={expenses} loading={loading} searchPlaceholder="Search expense category or description..." />

      {/* Add Expense Modal with exact fields from image: Date, Category, optional branch/warehouse, Amount, Payment Method, Reference, Description */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Record Operating Expense</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <DateInput label="1. Expense Date" required value={date} onChange={(e) => setDate(e.target.value)} />
              <SelectInput
                label="2. Category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={['Utilities', 'Rent & Maintenance', 'Packaging & Labels', 'Courier & Logistics', 'Marketing', 'Petty Cash', 'Lab Testing']}
              />
              <SelectInput
                label="3. Optional Branch / Warehouse Location"
                value={branchOrWarehouse}
                onChange={(e) => setBranchOrWarehouse(e.target.value)}
                options={locations}
              />
              <CurrencyInput
                label="4. Expense Amount"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <SelectInput
                label="5. Payment Method"
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={['Cash', 'Petty Cash', 'Bank Transfer', 'UPI', 'Card']}
              />
              <TextInput
                label="Expense Code" readOnly
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Auto-generated on Save"
              />
              <TextInput
                label="7. Description & Purpose"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Emergency courier for gold caps shipment"
              />

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors"
                >
                  Save Business Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Expense Modal (No edit button inside per rule #6) */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Expense Details</h3>
              <button onClick={() => setViewItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Expense Date</span>
                <span className="font-bold text-gray-900">{formatDate(viewItem.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Category</span>
                <span className="font-bold text-amber-800">{viewItem.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Branch / Warehouse</span>
                <span className="font-bold text-gray-900">{viewItem.branchOrWarehouse || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Payment Method</span>
                <span className="font-bold text-gray-900">{viewItem.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Amount</span>
                <span className="font-bold text-rose-600 text-sm">{formatCurrency(viewItem.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-semibold text-gray-500">Description</span>
                <span className="font-bold text-gray-900">{viewItem.description}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-gray-500">Created By</span>
                <span className="font-bold text-gray-700">{viewItem.createdBy || '—'}</span>
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

      {/* Edit Expense Modal (No Back to View header button, Cancel closes modal) */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Operating Expense</h3>
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
                try { await financeApi.updateExpense(editItem.id, editItem); fetchExpenses();
                toast.success('Expense updated successfully!');
                setEditItem(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save changes.'); }
              }}
              className="space-y-3 text-xs"
            >
              <DateInput
                label="1. Expense Date"
                required
                value={editItem.date || ''}
                onChange={(e) => setEditItem({ ...editItem, date: e.target.value })}
              />
              <SelectInput
                label="2. Category"
                required
                value={editItem.category || 'Utilities'}
                onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                options={['Utilities', 'Rent & Maintenance', 'Packaging & Labels', 'Courier & Logistics', 'Marketing', 'Petty Cash', 'Lab Testing']}
              />
              <CurrencyInput
                label="3. Expense Amount"
                required
                value={editItem.amount || ''}
                onChange={(e) => setEditItem({ ...editItem, amount: e.target.value })}
              />
              <SelectInput
                label="4. Payment Method"
                required
                value={editItem.paymentMethod || 'Cash'}
                onChange={(e) => setEditItem({ ...editItem, paymentMethod: e.target.value })}
                options={['Cash', 'Petty Cash', 'Bank Transfer', 'UPI', 'Card']}
              />
              <TextInput
                label="5. Description & Purpose"
                required
                value={editItem.description || ''}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
              />
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
          title="Delete Expense"
          message={`Are you sure you want to delete the expense entry for "${deleteItem.description || deleteItem.category}" (${formatCurrency(deleteItem.amount)})? This action cannot be undone.`}
          confirmText="Delete Expense"
          onConfirm={handleDeleteExpense}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

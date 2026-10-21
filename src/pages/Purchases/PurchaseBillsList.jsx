import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { purchaseApi } from '../../api/purchaseApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Receipt, Plus, Eye, DollarSign, AlertCircle, Trash2 } from 'lucide-react';
import { BillDetailModal } from './BillDetailModal';
import { CreateBillModal } from './CreateBillModal';
import { toast } from 'sonner';

export const PurchaseBillsList = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteBillItem, setDeleteBillItem] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await purchaseApi.getPurchaseBills();
      setBills(res.data || []);
    } catch {
      toast.error('Failed to load purchase bills');
    } finally {
      setLoading(false);
    }
  };

  const handleBillUpdate = (updatedBill) => {
    setBills((prev) =>
      prev.map((b) => (b.id === updatedBill.id || b.billNumber === updatedBill.billNumber ? { ...b, ...updatedBill } : b))
    );
    setSelectedBill(updatedBill);
  };

  // Metrics
  const totalBalanceDue = bills.reduce((sum, b) => sum + Number(b.balance || 0), 0);
  const totalPaid = bills.reduce((sum, b) => sum + Number(b.paid || 0), 0);
  const unpaidCount = bills.filter((b) => b.balance > 0).length;

  // Section 4 Purchase Bill Table Columns: bill number, supplier, linked PO/GRN, date, due date, amount, paid, balance and status
  const columns = [
    {
      header: 'Bill Number',
      accessor: 'billNumber',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.billNumber}</span>,
    },
    {
      header: 'Supplier',
      accessor: 'supplierName',
      render: (row) => <span className="font-bold text-gray-900">{row.supplierName}</span>,
    },
    {
      header: 'Linked PO/GRN',
      accessor: 'linkedRef',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
          {row.linkedRef || '—'}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => formatDate(row.date),
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      render: (row) => formatDate(row.dueDate),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => <span className="font-bold text-gray-900">{formatCurrency(row.amount)}</span>,
    },
    {
      header: 'Paid',
      accessor: 'paid',
      render: (row) => <span className="font-semibold text-emerald-700">{formatCurrency(row.paid)}</span>,
    },
    {
      header: 'Balance',
      accessor: 'balance',
      render: (row) => <span className="font-bold text-rose-600">{formatCurrency(row.balance)}</span>,
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
            onClick={() => setSelectedBill(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          
          <button disabled title="Posted record: use the supported return or correction workflow"
            onClick={() => setDeleteBillItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deleteBillItem) return;
    try {
      await purchaseApi.deletePurchaseBill(deleteBillItem.id);
      toast.success(`Purchase bill "${deleteBillItem.billNumber}" deleted successfully.`);
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteBillItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Bills & Payables"
        subtitle="Track vendor invoices, linked purchase orders/GRNs, payment history & outstanding balances"
        primaryAction={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Purchase Bill</span>
          </button>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="erp-panel  p-4  border border-rose-100  flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Balance Due (Payables)</p>
            <h4 className="text-xl font-bold text-rose-600">{formatCurrency(totalBalanceDue)}</h4>
          </div>
        </div>

        <div className="erp-panel  p-4  border border-emerald-100  flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Amount Paid</p>
            <h4 className="text-xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</h4>
          </div>
        </div>

        <div className="erp-panel  p-4    flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Pending Unpaid Invoices</p>
            <h4 className="text-xl font-bold text-gray-900">{unpaidCount} Invoices</h4>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={bills}
        loading={loading}
        searchPlaceholder="Search bill number, supplier or linked PO/GRN reference..."
      />

      {/* Bill View Details & Record Payment Modal */}
      {selectedBill && (
        <BillDetailModal
          isOpen={!!selectedBill}
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onUpdate={handleBillUpdate}
        />
      )}

      {/* Create Purchase Bill Modal */}
      {isCreateOpen && (
        <CreateBillModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchBills();
          }}
        />
      )}

      {/* Delete Bill Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteBillItem}
        title="Delete Purchase Bill"
        message={`Are you sure you want to delete purchase bill "${deleteBillItem?.billNumber}"?`}
        confirmText="Delete Bill"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteBillItem(null)}
      />
    </div>
  );
};

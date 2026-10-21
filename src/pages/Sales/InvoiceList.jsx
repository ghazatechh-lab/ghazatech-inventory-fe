import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { salesApi } from '../../api/salesApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Eye, RotateCcw, Trash2, Edit, X, Printer } from 'lucide-react';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { SalesReturnsModal } from './SalesReturnsModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { toast } from 'sonner';

export const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [deleteInvoice, setDeleteInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await salesApi.getInvoices();
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoice) return;
    try {
      await salesApi.deleteInvoice(deleteInvoice.id);
      toast.success(`Invoice "${deleteInvoice.invoiceNumber}" deleted successfully.`);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteInvoice(null);
    }
  };

  // Section 12A Columns: Invoice, Date, Customer, Branch, Qty, Subtotal, Discount, Total, Payment Status, Salesperson and Actions
  const columns = [
    {
      header: 'Invoice',
      accessor: 'invoiceNumber',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.invoiceNumber}</span>,
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => formatDate(row.date, true),
    },
    {
      header: 'Customer',
      accessor: 'customerName',
      render: (row) => <span className="font-bold text-gray-900">{row.customerName}</span>,
    },
    {
      header: 'Branch',
      accessor: 'branchName',
    },
    {
      header: 'Qty',
      accessor: 'qty',
      render: (row) => <span className="font-bold">{row.qty} pcs</span>,
    },
    {
      header: 'Subtotal',
      accessor: 'subtotal',
      render: (row) => <span className="font-semibold text-gray-700">{formatCurrency(row.subtotal || row.total)}</span>,
    },
    {
      header: 'Discount',
      accessor: 'discount',
      render: (row) => (
        <span className={row.discount > 0 ? 'font-bold text-rose-600' : 'text-gray-500'}>
          {formatCurrency(row.discount || 0)}
        </span>
      ),
    },
    {
      header: 'Total',
      accessor: 'total',
      render: (row) => <span className="font-bold text-gray-900">{formatCurrency(row.total)}</span>,
    },
    {
      header: 'Payment Status',
      accessor: 'paymentStatus',
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      header: 'Salesperson',
      accessor: 'salesperson',
      render: (row) => <span className="text-xs text-gray-500">{row.salesperson || 'Cashier'}</span>,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setSelectedInvoice(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Receipt"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintInvoice(row)}
            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Print thermal receipt"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <Can permission={["sales.invoice.edit","sales.pos"]}><button
            onClick={() => setEditInvoice(row)}
            className="px-2.5 py-1 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-gray-900 border border-gray-300 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Invoice"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["sales.return.create","sales.returns"]}><button
            onClick={() => setReturnInvoice(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Sales Return"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return</span>
          </button></Can>
          <Can permission={["sales.invoice.delete","sales.pos"]}><button disabled title="Posted record: use the supported return or correction workflow"
            onClick={() => setDeleteInvoice(row)}
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
        title="Sales Invoices"
        subtitle="Completed sales ledger, printable receipts & sales return workflows"
      />

      <DataTable columns={columns} data={invoices} loading={loading} searchPlaceholder="Search invoice number or customer..." />

      {selectedInvoice && (
        <InvoiceDetailModal isOpen={!!selectedInvoice} invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      {printInvoice && (
        <InvoiceDetailModal
          isOpen={!!printInvoice}
          invoice={printInvoice}
          onClose={() => setPrintInvoice(null)}
          thermal
        />
      )}

      {/* Edit Invoice Modal (No Back to View button, Cancel closes modal) */}
      {editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[var(--primary)] block">{editInvoice.invoiceNumber}</span>
                <h3 className="text-lg font-bold text-gray-900">Edit Sales Invoice</h3>
              </div>
              <button onClick={() => setEditInvoice(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editInvoice.customerName?.trim()) {
                  toast.error('Customer name is required.');
                  return;
                }
                if (!editInvoice.total || Number(editInvoice.total) <= 0) {
                  toast.error('Invoice total amount must be greater than zero.');
                  return;
                }
                try { await salesApi.updateInvoice(editInvoice.id, editInvoice); fetchInvoices();
                toast.success(`Invoice "${editInvoice.invoiceNumber}" updated successfully!`);
                setEditInvoice(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save changes.'); }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Customer Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editInvoice.customerName || ''}
                  onChange={(e) => setEditInvoice({ ...editInvoice, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Status <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={editInvoice.paymentStatus || 'Completed'}
                  onChange={(e) => setEditInvoice({ ...editInvoice, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white font-medium"
                >
                  <option value="Completed">Completed / Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial Payment</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Discount <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editInvoice.discount || 0}
                    onChange={(e) => setEditInvoice({ ...editInvoice, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Total Amount <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editInvoice.total || 0}
                    onChange={(e) => setEditInvoice({ ...editInvoice, total: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Salesperson / Cashier</label>
                <input
                  type="text"
                  value={editInvoice.salesperson || ''}
                  onChange={(e) => setEditInvoice({ ...editInvoice, salesperson: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  placeholder="Cashier"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditInvoice(null)}
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

      {returnInvoice && (
        <SalesReturnsModal
          isOpen={!!returnInvoice}
          invoice={returnInvoice}
          onClose={() => setReturnInvoice(null)}
          onSuccess={() => {
            setReturnInvoice(null);
            fetchInvoices();
          }}
        />
      )}

      {deleteInvoice && (
        <ConfirmModal
          isOpen={!!deleteInvoice}
          title="Delete Invoice"
          message={`Are you sure you want to delete invoice "${deleteInvoice.invoiceNumber}"? This action cannot be undone.`}
          confirmText="Delete Invoice"
          onConfirm={handleDeleteInvoice}
          onClose={() => setDeleteInvoice(null)}
        />
      )}
    </div>
  );
};

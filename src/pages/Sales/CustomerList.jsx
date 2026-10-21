import { CreateRecordModal } from '../../components/common/CreateRecordModal';
import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { customerApi } from '../../api/customerApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Phone, Mail, Eye, Edit, Trash2, X } from 'lucide-react';
import { CustomerDetailModal } from './CustomerDetailModal';
import { toast } from 'sonner';

export const CustomerList = () => {
  const [creating,setCreating] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteCustomerItem, setDeleteCustomerItem] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await customerApi.getCustomers();
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomerItem) return;
    try {
      if (customerApi.deleteCustomer) {
        await customerApi.deleteCustomer(deleteCustomerItem.id);
      }
      toast.success(`Customer "${deleteCustomerItem.name}" deleted successfully.`);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomerItem.id));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteCustomerItem(null);
    }
  };

  const columns = [
    {
      header: 'Customer',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-amber-50 text-[var(--primary)] border border-amber-200 flex items-center justify-center font-bold text-xs">
            {row.name ? row.name.charAt(0) : 'C'}
          </div>
          <span className="font-bold text-gray-900">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
      render: (row) => (
        <span className="font-mono text-xs text-gray-700 flex items-center">
          <Phone className="w-3.5 h-3.5 text-gray-500 mr-1" />
          {row.mobile}
        </span>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row) => (
        <span className="text-xs text-gray-600 flex items-center">
          <Mail className="w-3.5 h-3.5 text-gray-500 mr-1" />
          {row.email || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Total Purchases',
      accessor: 'totalPurchases',
      render: (row) => <span className="font-bold text-[var(--primary)]">{formatCurrency(row.totalPurchases || 0)}</span>,
    },
    {
      header: 'Outstanding',
      accessor: 'outstanding',
      render: (row) => (
        <span className={`font-bold ${row.outstanding > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
          {formatCurrency(row.outstanding || 0)}
        </span>
      ),
    },
    {
      header: 'Last Purchase',
      accessor: 'lastPurchase',
      render: (row) => formatDate(row.lastPurchase),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setSelectedCustomerId(row.id)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Customer Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["sales.customer.edit","customers.manage"]}><button
            onClick={() => setEditCustomer(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Customer Profile"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["sales.customer.delete","customers.manage"]}><button
            onClick={() => setDeleteCustomerItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Customer"
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
        title="Customer Database"
        subtitle="Manage registered retail customers, purchase histories & store accounts"
      />

      <Can permission={["sales.customer.create","customers.manage"]}><button onClick={() => setCreating(true)} className="mb-4 px-4 py-2 rounded-xl bg-[var(--primary)] text-white">Add Customer</button></Can>
      {creating && <CreateRecordModal title="Add Customer" defaults={{status:'active'}} fields={[{name:'name',label:'Customer Name',required:true},{name:'mobile',label:'Mobile Number',required:true},{name:'email',label:'Email Address',type:'email'},{name:'address',label:'Address'},{name:'notes',label:'Notes'},{name:'status',label:'Status',options:['active','inactive'],required:true}]} save={customerApi.createCustomer} onSuccess={fetchCustomers} onClose={() => setCreating(false)} />}
      <DataTable columns={columns} data={customers} loading={loading} searchPlaceholder="Search customer by name or phone..." />

      {selectedCustomerId && (
        <CustomerDetailModal
          isOpen={!!selectedCustomerId}
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}

      {/* Edit Customer Modal (No Back to View button, Cancel closes modal) */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6  ">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Customer Profile</h3>
              <button onClick={() => setEditCustomer(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editCustomer.name?.trim()) {
                  toast.error('Customer name is required.');
                  return;
                }
                if (!editCustomer.mobile?.trim()) {
                  toast.error('Mobile number is required.');
                  return;
                }
                try { await customerApi.updateCustomer(editCustomer.id, editCustomer); fetchCustomers();
                toast.success(`Customer "${editCustomer.name}" updated successfully!`);
                setEditCustomer(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save changes.'); }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Customer Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editCustomer.name || ''}
                  onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Mobile Number <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editCustomer.mobile || ''}
                  onChange={(e) => setEditCustomer({ ...editCustomer, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editCustomer.email || ''}
                  onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Outstanding Credit Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={editCustomer.outstanding || 0}
                  onChange={(e) => setEditCustomer({ ...editCustomer, outstanding: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                />
              </div>

              <label className="block font-semibold">Status<select aria-label="Customer Status" value={editCustomer.status || 'active'} onChange={e => setEditCustomer({...editCustomer,status:e.target.value})} className="block border rounded-lg p-2 w-full"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
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

      {/* Delete Customer Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteCustomerItem}
        title="Delete Customer Record"
        message={`Are you sure you want to delete customer "${deleteCustomerItem?.name}"?`}
        confirmText="Delete Customer"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteCustomerItem(null)}
      />
    </div>
  );
};

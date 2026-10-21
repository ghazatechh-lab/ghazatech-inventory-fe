import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { supplierApi } from '../../api/supplierApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Phone, User, Eye, Plus, Building2, Edit3, Trash2 } from 'lucide-react';
import { SupplierDetailModal } from './SupplierDetailModal';
import { TextInput, SelectInput } from '../../components/forms/FormControls';
import { toast } from 'sonner';

export const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteSupplierItem, setDeleteSupplierItem] = useState(null);

  // New Supplier Form
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await supplierApi.getSuppliers();
      setSuppliers(res.data || []);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!name || !name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!contact || !contact.trim()) {
      toast.error('Contact person is required');
      return;
    }
    if (!phone || !phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    setSubmitting(true);
    try {
      const saved=await supplierApi.createSupplier({
        name,
        contact,
        phone,
        email,
        address,
        paymentTerms,
      });
      toast.success(`Supplier added: ${saved.data.code}`);
      setIsAddOpen(false);
      setName('');
      setContact('');
      setPhone('');
      setEmail('');
      fetchSuppliers();
    } catch {
      toast.error('Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  // Section 1 Columns: code, supplier, contact, phone, outstanding amount, last purchase, status and actions
  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.code}</span>,
    },
    {
      header: 'Supplier',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.name}</div>
          <span className="text-xs text-gray-500 font-mono">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: 'contact',
      render: (row) => (
        <span className="text-xs text-gray-700 flex items-center">
          <User className="w-3.5 h-3.5 text-gray-500 mr-1" />
          {row.contact}
        </span>
      ),
    },
    {
      header: 'Phone',
      accessor: 'phone',
      render: (row) => (
        <span className="text-xs font-mono text-gray-600 flex items-center">
          <Phone className="w-3.5 h-3.5 text-gray-500 mr-1" />
          {row.phone}
        </span>
      ),
    },
    {
      header: 'Outstanding Amount',
      accessor: 'outstanding',
      render: (row) => (
        <span className="font-bold text-rose-600">{formatCurrency(row.outstanding || 0)}</span>
      ),
    },
    {
      header: 'Last Purchase',
      accessor: 'lastPurchase',
      render: (row) => (row.lastPurchase ? formatDate(row.lastPurchase) : 'N/A'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedSupplier(row);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["purchases.supplier.edit","*"]}><button
            onClick={() => {
              setIsEditMode(true);
              setSelectedSupplier(row);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Supplier"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["purchases.supplier.delete","*"]}><button
            onClick={() => setDeleteSupplierItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Supplier"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deleteSupplierItem) return;
    try {
      await supplierApi.deleteSupplier(deleteSupplierItem.id);
      toast.success(`Supplier "${deleteSupplierItem.name}" deleted successfully.`);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteSupplierItem(null);
    }
  };

  const handleSupplierUpdate = (updatedSup) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === updatedSup.id ? { ...s, ...updatedSup } : s))
    );
    setSelectedSupplier(updatedSup);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Management"
        subtitle="Manage raw material vendors, packaging suppliers, outstanding balances & history"
        primaryAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        searchPlaceholder="Search supplier code, name, contact or phone..."
      />

      {/* Supplier Comprehensive Detail Modal (Overview, Purchase Orders, Goods Receipts, Bills, Payments & Returns) */}
      {selectedSupplier && (
        <SupplierDetailModal
          isOpen={!!selectedSupplier}
          supplier={selectedSupplier}
          initialEdit={isEditMode}
          onClose={() => setSelectedSupplier(null)}
          onUpdate={handleSupplierUpdate}
        />
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4 ">
            <div className="flex items-center space-x-2 pb-3 border-b border-gray-200">
              <Building2 className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="font-bold text-gray-900 text-base">Add New Supplier Vendor</h3>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <TextInput label="Supplier Code" readOnly placeholder="Auto-generated on Save" value=""/>
              <TextInput
                label="Supplier / Company Name"
                placeholder="e.g. Aromatics Direct Ltd."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  label="Contact Person"
                  placeholder="e.g. John Doe"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
                <TextInput
                  label="Phone Number"
                  placeholder="+971 50 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <TextInput
                label="Email Address"
                placeholder="orders@supplier.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextInput
                label="Physical Address"
                placeholder="Industrial Area 2, Dubai, UAE"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <SelectInput
                label="Payment Terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                options={[
                  { label: 'Net 30 Days', value: 'Net 30 Days' },
                  { label: 'Net 15 Days', value: 'Net 15 Days' },
                  { label: 'Immediate / COD', value: 'Immediate / COD' },
                ]}
              />

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteSupplierItem}
        title="Delete Supplier Record"
        message={`Are you sure you want to delete supplier "${deleteSupplierItem?.name}"?`}
        confirmText="Delete Supplier"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteSupplierItem(null)}
      />
    </div>
  );
};

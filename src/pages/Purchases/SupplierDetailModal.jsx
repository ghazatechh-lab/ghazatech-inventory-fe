import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { purchaseApi } from '../../api/purchaseApi';
import { supplierApi } from '../../api/supplierApi';
import { TextInput, SelectInput } from '../../components/forms/FormControls';
import { toast } from 'sonner';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  PackageCheck,
  Receipt,
  RotateCcw,
  DollarSign,
  Edit3,
  Save
} from 'lucide-react';

export const SupplierDetailModal = ({ isOpen, supplier, onClose, onUpdate, initialEdit = false }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [isSaving, setIsSaving] = useState(false);

  // Current Supplier State
  const [currentSupplier, setCurrentSupplier] = useState(supplier);

  // Edit Form Fields
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [status, setStatus] = useState('active');

  // Related Sub-resources
  const [pos, setPos] = useState([]);
  const [grns, setGrns] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setCurrentSupplier(supplier);
      resetEditForm(supplier);
      loadSupplierData(supplier.name);
      setActiveTab('Overview');
      setIsEditing(initialEdit);
    }
  }, [supplier, initialEdit]);

  const resetEditForm = (sup) => {
    setName(sup.name || '');
    setContact(sup.contact || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setPaymentTerms(sup.paymentTerms || 'Net 30 Days');
    setStatus(sup.status || 'active');
  };

  const loadSupplierData = async (supplierName) => {
    setLoading(true);
    try {
      const [poRes, grnRes, billRes, payRes, retRes] = await Promise.all([
        purchaseApi.getPurchaseOrders(),
        purchaseApi.getGoodsReceipts(),
        purchaseApi.getPurchaseBills(),
        purchaseApi.getSupplierPayments(),
        purchaseApi.getPurchaseReturns(),
      ]);

      const nameLower = supplierName.toLowerCase();

      setPos((poRes.data || []).filter((p) => p.supplierName?.toLowerCase() === nameLower));
      setGrns((grnRes.data || []).filter((g) => g.supplierName?.toLowerCase() === nameLower));
      setBills((billRes.data || []).filter((b) => b.supplierName?.toLowerCase() === nameLower));
      setPayments((payRes.data || []).filter((p) => p.supplierName?.toLowerCase() === nameLower));
      setReturns((retRes.data || []).filter((r) => r.supplierName?.toLowerCase() === nameLower));
    } catch (err) {
      console.error('Failed to load supplier detail history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currentSupplier) return null;

  const handleSaveEdit = async (e) => {
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

    setIsSaving(true);
    try {
      const updatedData = {
        name: name.trim(),
        contact: contact.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        paymentTerms,
        status,
      };

      const res = await supplierApi.updateSupplier(currentSupplier.id, updatedData);
      const updated = res.data || { ...currentSupplier, ...updatedData };

      setCurrentSupplier(updated);
      setIsEditing(false);
      toast.success('Supplier details updated successfully!');

      if (onUpdate) {
        onUpdate(updated);
      }
    } catch {
      toast.error('Failed to update supplier details');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: Building2 },
    { id: 'Purchase Orders', label: `Purchase Orders (${pos.length})`, icon: FileText },
    { id: 'Goods Receipts', label: `Goods Receipts (${grns.length})`, icon: PackageCheck },
    { id: 'Bills', label: `Bills (${bills.length})`, icon: Receipt },
    { id: 'Payments', label: `Payments (${payments.length})`, icon: DollarSign },
    { id: 'Returns', label: `Returns (${returns.length})`, icon: RotateCcw },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="erp-panel   max-w-4xl w-full p-6  space-y-5  my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[var(--primary)]">{currentSupplier.code}</span>
                <StatusBadge status={currentSupplier.status || 'active'} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{currentSupplier.name}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button aria-label="Close dialog"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'Overview') setIsEditing(false);
                }}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-amber-50/50 font-bold'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[280px]">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading supplier records...</div>
          ) : (
            <>
              {/* Overview Tab (View & Edit Mode) */}
              {activeTab === 'Overview' && (
                <div>
                  {isEditing ? (
                    /* Inline Edit Supplier Form */
                    <form onSubmit={handleSaveEdit} className="bg-amber-50/30 p-5 rounded-xl border border-amber-200/60 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/50">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
                          <Edit3 className="w-4 h-4 text-[var(--primary)]" />
                          <span>Edit Supplier Master Details</span>
                        </h4>
                        <span className="text-xs text-gray-500 font-mono">Code: {currentSupplier.code}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <TextInput
                          label="Supplier / Company Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />

                        <TextInput
                          label="Contact Person"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          required
                        />

                        <TextInput
                          label="Phone Number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />

                        <TextInput
                          label="Email Address"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />

                        <TextInput
                          label="Physical Address / Location"
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

                        <SelectInput
                          label="Account Status"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          options={[
                            { label: 'Active', value: 'active' },
                            { label: 'Inactive', value: 'inactive' },
                          ]}
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-amber-200/50">
                        <button
                          type="button"
                          onClick={onClose}
                          className="erp-panel px-4 py-2 text-xs font-semibold text-gray-700  hover:bg-gray-100  "
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Saving Changes...' : 'Save Supplier Changes'}</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Read-Only Overview Card */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Supplier Contact Information
                          </h4>
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-gray-700">
                          <User className="w-4 h-4 text-[var(--primary)]" />
                          <span className="font-semibold text-gray-900">Contact Person:</span>
                          <span>{currentSupplier.contact || 'N/A'}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-gray-700">
                          <Phone className="w-4 h-4 text-[var(--primary)]" />
                          <span className="font-semibold text-gray-900">Phone:</span>
                          <span className="font-mono">{currentSupplier.phone || 'N/A'}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-gray-700">
                          <Mail className="w-4 h-4 text-[var(--primary)]" />
                          <span className="font-semibold text-gray-900">Email:</span>
                          <span>{currentSupplier.email || 'N/A'}</span>
                        </div>

                        <div className="flex items-start space-x-2 text-xs text-gray-700">
                          <MapPin className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-900">Address: </span>
                            <span>{currentSupplier.address || 'Industrial Area, Primary Hub'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                          Financial & Terms Summary
                        </h4>

                        <div className="flex justify-between items-center text-xs p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                          <span className="font-semibold text-rose-800">Outstanding Balance:</span>
                          <span className="font-bold text-rose-600 text-sm">
                            {formatCurrency(currentSupplier.outstanding || 0)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-gray-200">
                          <span className="text-gray-600">Payment Terms:</span>
                          <span className="font-semibold text-gray-900">{currentSupplier.paymentTerms || 'Net 30 Days'}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-gray-200">
                          <span className="text-gray-600">Last Purchase Date:</span>
                          <span className="font-semibold text-gray-900">
                            {currentSupplier.lastPurchase ? formatDate(currentSupplier.lastPurchase) : 'N/A'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs py-1.5">
                          <span className="text-gray-600">Active PO Count:</span>
                          <span className="font-bold text-gray-900">{pos.length} Orders</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Purchase Orders Tab */}
              {activeTab === 'Purchase Orders' && (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="erp-table w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                        <th className="p-3">PO Ref</th>
                        <th className="p-3">Order Date</th>
                        <th className="p-3">Expected Date</th>
                        <th className="p-3">Warehouse</th>
                        <th className="p-3 text-right">Grand Total</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pos.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-gray-500">
                            No purchase orders found for this supplier.
                          </td>
                        </tr>
                      ) : (
                        pos.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3 font-mono font-bold text-[var(--primary)]">{p.poNumber}</td>
                            <td className="p-3">{formatDate(p.orderDate)}</td>
                            <td className="p-3">{formatDate(p.expectedDate)}</td>
                            <td className="p-3">{p.warehouseName}</td>
                            <td className="p-3 text-right font-bold text-gray-900">
                              {formatCurrency(p.grandTotal)}
                            </td>
                            <td className="p-3 text-center">
                              <StatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Goods Receipts Tab */}
              {activeTab === 'Goods Receipts' && (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="erp-table w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                        <th className="p-3">GRN Number</th>
                        <th className="p-3">Linked PO</th>
                        <th className="p-3">Receive Date</th>
                        <th className="p-3">Receiving Warehouse</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {grns.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">
                            No goods receipts (GRNs) logged for this supplier.
                          </td>
                        </tr>
                      ) : (
                        grns.map((g) => (
                          <tr key={g.id}>
                            <td className="p-3 font-mono font-bold text-[var(--primary)]">{g.grnNumber}</td>
                            <td className="p-3 font-mono text-gray-700">{g.poNumber}</td>
                            <td className="p-3">{formatDate(g.receiveDate)}</td>
                            <td className="p-3">{g.warehouseName || '—'}</td>
                            <td className="p-3 text-center">
                              <StatusBadge status={g.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bills Tab */}
              {activeTab === 'Bills' && (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="erp-table w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                        <th className="p-3">Bill Number</th>
                        <th className="p-3">Linked PO/GRN</th>
                        <th className="p-3">Bill Date</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3 text-right">Bill Amount</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3 text-right">Balance</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bills.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-500">
                            No purchase bills recorded for this supplier.
                          </td>
                        </tr>
                      ) : (
                        bills.map((b) => (
                          <tr key={b.id}>
                            <td className="p-3 font-mono font-bold text-[var(--primary)]">{b.billNumber}</td>
                            <td className="p-3 font-mono text-gray-600">{b.linkedRef || '—'}</td>
                            <td className="p-3">{formatDate(b.date)}</td>
                            <td className="p-3">{formatDate(b.dueDate)}</td>
                            <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(b.amount)}</td>
                            <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(b.paid)}</td>
                            <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(b.balance)}</td>
                            <td className="p-3 text-center">
                              <StatusBadge status={b.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'Payments' && (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="erp-table w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                        <th className="p-3">Payment Ref</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3">Bank/Trx Ref</th>
                        <th className="p-3 text-right">Paid Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">
                            No payments recorded for this supplier yet.
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3 font-mono font-bold text-[var(--primary)]">{p.paymentNo}</td>
                            <td className="p-3">{formatDate(p.date)}</td>
                            <td className="p-3 font-semibold text-gray-700">{p.mode}</td>
                            <td className="p-3 font-mono text-gray-600">{p.reference}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Returns Tab */}
              {activeTab === 'Returns' && (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="erp-table w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase">
                        <th className="p-3">Return Ref</th>
                        <th className="p-3">Linked Stock/GRN</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Material Item</th>
                        <th className="p-3">Returned Qty</th>
                        <th className="p-3">Inventory Impact</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {returns.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-500">
                            No purchase returns recorded for this supplier.
                          </td>
                        </tr>
                      ) : (
                        returns.map((r) => (
                          <tr key={r.id}>
                            <td className="p-3 font-mono font-bold text-rose-600">{r.returnRef}</td>
                            <td className="p-3 font-mono text-gray-600">{r.linkedRef || '—'}</td>
                            <td className="p-3">{formatDate(r.date)}</td>
                            <td className="p-3 font-bold text-gray-900">{r.material}</td>
                            <td className="p-3 font-bold">{r.qty} {r.unit || 'pcs'}</td>
                            <td className="p-3">
                              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 block max-w-xs">
                                {r.inventoryImpact}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <StatusBadge status={r.status || 'Debit Note Issued'} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

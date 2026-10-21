import React, { useState, useEffect } from 'react';
import { TextInput, SelectInput } from '../../components/forms/FormControls';
import { StatusBadge } from '../../components/common/StatusBadge';
import { warehouseApi } from '../../api/warehouseApi';
import { branchApi } from '../../api/branchApi';
import { productApi } from '../../api/productApi';
import { salesApi } from '../../api/salesApi';
import { transferApi } from '../../api/transferApi';
import { customerApi } from '../../api/customerApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Store,
  MapPin,
  User,
  Package,
  Edit3,
  X,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export const BranchModal = ({ isOpen, branch, onClose, onUpdate, initialEdit = false }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditing, setIsEditing] = useState(initialEdit);

  // Edit form state
  const [warehouses,setWarehouses]=useState([]);
  const [warehouse,setWarehouse]=useState('');
  const [isVirtual,setVirtual]=useState(false),[physicalBranches,setPhysicalBranches]=useState([]),[branchChoices,setBranchChoices]=useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState('active');

  // Data State
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [_loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (branch) {
      setWarehouse(branch.warehouse || '');
      setVirtual(!!branch.isVirtual);setPhysicalBranches(branch.physicalBranches||[]);
      branchApi.getBranches().then(({data})=>setBranchChoices(data.filter(b=>b.id!==branch.id&&!b.isVirtual&&b.status==='active'))).catch(()=>toast.error('Branch choices could not be loaded'));
      warehouseApi.getWarehouses().then(({data})=>setWarehouses(data.filter(w=>w.status==='active'))).catch(()=>toast.error('Warehouse choices could not be loaded'));
      setCode(branch.code || '');
      setName(branch.name || '');
      setLocation(branch.location || '');
      setManager(branch.manager || '');
      setStatus(branch.status || 'active');
      setActiveTab('Overview');
      setIsEditing(initialEdit);
      fetchBranchData(branch);
    }
  }, [branch, initialEdit]);

  const fetchBranchData = async (b) => {
    setLoading(true);
    try {
      const [pRes, invRes, tRes, cRes] = await Promise.all([
        productApi.getVariants({branchId: b.id}),
        salesApi.getInvoices(),
        transferApi.getTransfers(),
        customerApi.getCustomers(),
      ]);

      setFinishedProducts(pRes.data || []);
      setInvoices((invRes.data || []).filter((inv) => inv.branchName === b.name));
      setTransfers((tRes.data || []).filter((t) => t.sourceName === b.name || t.destName === b.name));
      setCustomers(cRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !branch) return null;

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name || !name.trim()) {
      toast.error('Store / Branch name is required');
      return;
    }
    if (!location || !location.trim()) {
      toast.error('Physical location address is required');
      return;
    }
    if (!manager || !manager.trim()) {
      toast.error('Assigned branch manager is required');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = { code, name, location, manager, status, warehouse:warehouse||null,isVirtual,physicalBranches:isVirtual?physicalBranches:[] };
      await branchApi.updateBranch(branch.id, updatedData);
      toast.success(`Branch ${name} updated successfully!`);
      onUpdate({ ...branch, ...updatedData, warehouseName:warehouses.find(w=>w.id===warehouse)?.name||'' });
      setIsEditing(false);
    } catch {
      toast.error('Failed to update branch details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="erp-panel   max-w-4xl w-full   my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-[var(--primary)] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[var(--primary)]/20 text-[var(--primary)] rounded-xl border border-[var(--primary)]/40">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[var(--primary)] uppercase">{code}</span>
                <StatusBadge status={status} />
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">{name}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button aria-label="Close dialog" onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs Bar */}
        {!isEditing && (
          <div className="flex items-center space-x-1 px-6 bg-gray-50 border-b border-gray-200 shrink-0 text-xs font-semibold overflow-x-auto">
            {[
              { id: 'Overview', label: '📊 Overview & Performance' },
              { id: 'FinishedProducts', label: '🧴 Finished Goods Stock' },
              { id: 'Sales', label: '🛒 Recent Sales & Invoices' },
              { id: 'Transfers', label: '🔄 Stock Transfers' },
              { id: 'Customers', label: '👥 Customer Activity' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)] font-bold bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* EDIT FORM VIEW */}
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-4 bg-gray-50/70 p-6 rounded-xl border border-gray-200 text-xs">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[var(--primary)]" />
                <span>Edit Branch Details</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Branch Code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <TextInput
                  label="Store / Branch Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <SelectInput label="Linked Warehouse" required={!isVirtual} value={warehouse} onChange={e=>setWarehouse(e.target.value)} options={[{value:'',label:'Select warehouse…'},...warehouses.map(w=>({value:w.id,label:w.name}))]}/>
              <label className="block"><input type="checkbox" checked={isVirtual} onChange={e=>setVirtual(e.target.checked)}/> Virtual branch: require an explicit physical branch at POS</label>{isVirtual&&<div><p>Allowed physical branches (select Branch 1 and Branch 2):</p>{branchChoices.map(b=><label className="block" key={b.id}><input type="checkbox" checked={physicalBranches.includes(b.id)} onChange={e=>setPhysicalBranches(ids=>e.target.checked?[...ids,b.id]:ids.filter(id=>id!==b.id))}/>{b.name}</label>)}<p>Only branches without existing stock can become virtual.</p></div>}<TextInput
                label="Physical Location Address"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Assigned Branch Manager"
                  required
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                />
                <SelectInput
                  label="Operational Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'active', label: 'Active Retail Outlet' },
                    { value: 'inactive', label: 'Inactive / Closed' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & PERFORMANCE */}
              {activeTab === 'Overview' && (
                <div className="space-y-6">
                  {/* Basic Branch Performance Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="text-xs text-amber-800 font-bold uppercase tracking-wider block">Today's POS Sales</span>
                      <div className="text-xl font-bold text-amber-900 mt-1">{formatCurrency(branch.todaySales || 0)}</div>
                      <span className="text-xs text-amber-700 font-medium">Retail POS Revenue</span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">Finished Goods Valuation</span>
                      <div className="text-xl font-bold text-emerald-900 mt-1">{formatCurrency(branch.finishedStockValue || 0)}</div>
                      <span className="text-xs text-emerald-700 font-medium">Bottled Perfumes</span>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="text-xs text-blue-800 font-bold uppercase tracking-wider block">Completed Invoices</span>
                      <div className="text-xl font-bold text-blue-900 mt-1">{invoices.length} Sales</div>
                      <span className="text-xs text-blue-700 font-medium">POS Transactions</span>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <span className="text-xs text-purple-800 font-bold uppercase tracking-wider block">Active Stock Transfers</span>
                      <div className="text-xl font-bold text-purple-900 mt-1">{transfers.length} Transfers</div>
                      <span className="text-xs text-purple-700 font-medium">Warehouse Shipments</span>
                    </div>
                  </div>

                  {/* Branch Information Summary */}
                  <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200 text-xs text-gray-700">
                    <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2.5 mb-3 flex items-center space-x-2">
                      <Store className="w-4 h-4 text-[var(--primary)]" />
                      <span>Branch Outlet Information</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-gray-500 font-medium block">Branch Code:</span>
                        <span className="font-mono font-bold text-[var(--primary)] text-sm">{branch.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Store Name:</span>
                        <span className="font-bold text-gray-900 text-sm">{branch.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Physical Address:</span>
                        <span className="font-semibold text-gray-800 flex items-center mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-500 mr-1 shrink-0" /> {branch.location}
                        </span>
                      </div>
                      <div><span className="text-gray-500 font-medium block">Linked Warehouse:</span><span className="font-semibold">{branch.warehouseName||'Not assigned'}</span></div>
                      <div>
                        <span className="text-gray-500 font-medium block">Branch Manager:</span>
                        <span className="font-semibold text-gray-800 flex items-center mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-500 mr-1 shrink-0" /> {branch.manager}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Sales Activity */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Branch Sales Activity</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                      <table className="erp-table w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                            <th className="p-3">Invoice No</th>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Qty</th>
                            <th className="p-3">Total Amount</th>
                            <th className="p-3">Payment Method</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {invoices.length > 0 ? (
                            invoices.slice(0, 5).map((inv) => (
                              <tr key={inv.id}>
                                <td className="p-3 font-mono font-bold text-[var(--primary)]">{inv.invoiceNumber}</td>
                                <td className="p-3 text-gray-500">{formatDate(inv.date, true)}</td>
                                <td className="p-3 font-bold text-gray-900">{inv.customerName}</td>
                                <td className="p-3 font-semibold">{inv.qty} pcs</td>
                                <td className="p-3 font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                                <td className="p-3 font-bold text-emerald-700">{inv.paymentMethod}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="p-4 text-center text-gray-500">No recent sales records for this branch.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FINISHED GOODS STOCK (STRICTLY NO RAW MATERIALS!) */}
              {activeTab === 'FinishedProducts' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
                    <Package className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="font-bold">Retail Outlet Finished Goods Inventory:</strong> Displays bottled perfume SKUs available for POS sales at this retail outlet. Raw material balances are tracked separately at each branch and warehouse.
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="erp-table w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                          <th className="p-3">SKU</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Size & Concentration</th>
                          <th className="p-3">Cost Price</th>
                          <th className="p-3">Selling Price</th>
                          <th className="p-3 text-right">Branch Available Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {finishedProducts.map((fp) => {
                          const branchQty = fp.branchStock?.[branch.id] || 0;
                          return (
                            <tr key={fp.id} className="hover:bg-amber-50/30">
                              <td className="p-3 font-mono font-bold text-[var(--primary)]">{fp.sku}</td>
                              <td className="p-3 font-bold text-gray-900">{fp.productName}</td>
                              <td className="p-3 font-semibold text-gray-700">{fp.sizeName} • {fp.concentrationName}</td>
                              <td className="p-3 text-gray-600">{formatCurrency(fp.costPrice)}</td>
                              <td className="p-3 font-bold text-gray-900">{formatCurrency(fp.sellingPrice)}</td>
                              <td className="p-3 text-right font-bold text-emerald-700">{branchQty} bottles</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: RECENT SALES & INVOICES */}
              {activeTab === 'Sales' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Branch Sales & POS Invoices Ledger</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                          <th className="p-3">Invoice No</th>
                          <th className="p-3">Date & Time</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Qty</th>
                          <th className="p-3">Total Amount</th>
                          <th className="p-3">Payment Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invoices.length > 0 ? (
                          invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="p-3 font-mono font-bold text-[var(--primary)]">{inv.invoiceNumber}</td>
                              <td className="p-3 text-gray-500">{formatDate(inv.date, true)}</td>
                              <td className="p-3 font-bold text-gray-900">{inv.customerName}</td>
                              <td className="p-3 font-semibold">{inv.qty} pcs</td>
                              <td className="p-3 font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                              <td className="p-3 font-bold text-emerald-700">{inv.paymentMethod}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="p-4 text-center text-gray-500">No sales invoices recorded for this branch.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: STOCK TRANSFERS */}
              {activeTab === 'Transfers' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Branch Stock Transfers</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                          <th className="p-3">Transfer No</th>
                          <th className="p-3">Source Location</th>
                          <th className="p-3">Destination Location</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Items Count</th>
                          <th className="p-3">Transfer Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {transfers.length > 0 ? (
                          transfers.map((t) => (
                            <tr key={t.id}>
                              <td className="p-3 font-mono font-bold text-[var(--primary)]">{t.transferNo}</td>
                              <td className="p-3 font-semibold">{t.sourceName}</td>
                              <td className="p-3 font-semibold">{t.destName}</td>
                              <td className="p-3 text-gray-500">{t.date}</td>
                              <td className="p-3 font-bold">{t.itemsCount || 1} items</td>
                              <td className="p-3"><StatusBadge status={t.status} /></td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="p-4 text-center text-gray-500">No stock transfers recorded for this branch.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: CUSTOMER ACTIVITY */}
              {activeTab === 'Customers' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Branch Customer Activity & Accounts</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                          <th className="p-3">Customer Name</th>
                          <th className="p-3">Mobile Number</th>
                          <th className="p-3">Total Purchases</th>
                          <th className="p-3">Last Purchase Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customers.map((c) => (
                          <tr key={c.id}>
                            <td className="p-3 font-bold text-gray-900">{c.name}</td>
                            <td className="p-3 font-mono text-gray-600">{c.mobile}</td>
                            <td className="p-3 font-bold text-[var(--primary)]">{formatCurrency(c.totalPurchases)}</td>
                            <td className="p-3 text-gray-500">{c.lastPurchase}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

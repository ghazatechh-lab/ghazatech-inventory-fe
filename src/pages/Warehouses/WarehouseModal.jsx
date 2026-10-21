import React, { useState, useEffect } from 'react';
import { TextInput, SelectInput } from '../../components/forms/FormControls';
import { StatusBadge } from '../../components/common/StatusBadge';
import { warehouseApi } from '../../api/warehouseApi';
import { inventoryApi } from '../../api/inventoryApi';
import { productApi } from '../../api/productApi';
import { transferApi } from '../../api/transferApi';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  MapPin,
  User,
  Boxes,
  Edit3,
  X,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export const WarehouseModal = ({ isOpen, warehouse, onClose, onUpdate, initialTab = 'Overview' }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditing, setIsEditing] = useState(initialTab === 'Edit');

  // Edit form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState('active');

  // Stock & Transactions State
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [_loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (warehouse) {
      setCode(warehouse.code || '');
      setName(warehouse.name || '');
      setLocation(warehouse.location || '');
      setManager(warehouse.manager || '');
      setStatus(warehouse.status || 'active');
      setActiveTab(initialTab === 'Edit' ? 'Overview' : initialTab);
      setIsEditing(initialTab === 'Edit');
      fetchWarehouseData(warehouse);
    }
  }, [warehouse, initialTab]);

  const fetchWarehouseData = async (wh) => {
    setLoading(true);
    try {
      const [rmRes, pRes, mRes, tRes] = await Promise.all([
        inventoryApi.getRawMaterials({location: wh.name}),
        productApi.getVariants({location: wh.name}),
        inventoryApi.getMovements(),
        transferApi.getTransfers(),
      ]);

      setRawMaterials(rmRes.data || []);
      setFinishedProducts(pRes.data || []);
      setMovements((mRes.data || []).filter((m) => m.location === wh.name));
      setTransfers((tRes.data || []).filter((t) => t.sourceName === wh.name || t.destName === wh.name));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !warehouse) return null;

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name || !name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }
    if (!location || !location.trim()) {
      toast.error('Physical location address is required');
      return;
    }
    if (!manager || !manager.trim()) {
      toast.error('Assigned warehouse manager is required');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = { code, name, location, manager, status };
      await warehouseApi.updateWarehouse(warehouse.id, updatedData);
      toast.success(`Warehouse ${name} updated successfully!`);
      onUpdate({ ...warehouse, ...updatedData });
      setIsEditing(false);
    } catch {
      toast.error('Failed to update warehouse details');
    } finally {
      setIsSaving(false);
    }
  };

  const lowStockCount = rawMaterials.filter((rm) => rm.availableStock <= rm.minStock).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="erp-panel   max-w-4xl w-full   my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-[var(--primary)] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[var(--primary)]/20 text-[var(--primary)] rounded-xl border border-[var(--primary)]/40">
              <Boxes className="w-5 h-5" />
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

        {/* 5 Section 9 Spec Tabs Bar: Overview, Raw Materials, Finished Products, Transactions, Transfers */}
        {!isEditing && (
          <div className="flex items-center space-x-1 px-6 bg-gray-50 border-b border-gray-200 shrink-0 text-xs font-semibold overflow-x-auto">
            {[
              { id: 'Overview', label: '📊 Overview' },
              { id: 'RawMaterials', label: '🧪 Raw Materials' },
              { id: 'FinishedProducts', label: '🧴 Finished Products' },
              { id: 'Transactions', label: '📋 Transactions' },
              { id: 'Transfers', label: '🔄 Transfers' },
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
            <form onSubmit={handleEditSubmit} className="space-y-4 bg-gray-50/70 p-6 rounded-xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[var(--primary)]" />
                <span>Edit Warehouse Details</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Warehouse Code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <TextInput
                  label="Warehouse Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <TextInput
                label="Physical Location Address"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Assigned Warehouse Manager"
                  required
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                />
                <SelectInput
                  label="Operational Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'active', label: 'Active Operational Hub' },
                    { value: 'inactive', label: 'Inactive / Maintenance' },
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
              {/* TAB 1: OVERVIEW (Contact/location, stock value, low stock count and recent movements) */}
              {activeTab === 'Overview' && (
                <div className="space-y-6">
                  {/* Stock Value & Low Stock Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <span className="text-xs text-purple-700 font-bold uppercase tracking-wider">Raw Material Valuation</span>
                      <div className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(warehouse.rawMaterialValue)}</div>
                      <span className="text-xs text-purple-600 font-medium">Oils, Solvents & Packaging</span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Finished Goods Valuation</span>
                      <div className="text-2xl font-bold text-emerald-900 mt-1">{formatCurrency(warehouse.finishedStockValue)}</div>
                      <span className="text-xs text-emerald-600 font-medium">Bottled Perfumes in Stock</span>
                    </div>

                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                      <span className="text-xs text-rose-700 font-bold uppercase tracking-wider">Low Stock Count</span>
                      <div className="text-2xl font-bold text-rose-800 mt-1">{lowStockCount} Items</div>
                      <span className="text-xs text-rose-600 font-medium">At or below reorder limit</span>
                    </div>
                  </div>

                  {/* Warehouse Contact & Location Summary Card */}
                  <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-3">
                    <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2">Warehouse Contact & Location Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-gray-500 font-medium block">Physical Location:</span>
                        <span className="font-semibold text-gray-900 flex items-center mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-500 mr-1 shrink-0" /> {warehouse.location}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Assigned Manager:</span>
                        <span className="font-semibold text-gray-900 flex items-center mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-500 mr-1 shrink-0" /> {warehouse.manager}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Warehouse Code & Status:</span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-mono font-bold text-[var(--primary)] text-sm">{warehouse.code}</span>
                          <StatusBadge status={warehouse.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Movements Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Stock Movements</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                      <table className="erp-table w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                            <th className="p-3">Date</th>
                            <th className="p-3">Transaction</th>
                            <th className="p-3">Reference</th>
                            <th className="p-3">Item</th>
                            <th className="p-3">Direction</th>
                            <th className="p-3">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {movements.slice(0, 5).map((m) => (
                            <tr key={m.id}>
                              <td className="p-3 text-gray-500">{m.date ? m.date.substring(0, 10) : '—'}</td>
                              <td className="p-3 font-mono font-bold text-gray-800">{m.transaction}</td>
                              <td className="p-3 font-mono text-[var(--primary)] font-bold">{m.reference}</td>
                              <td className="p-3 font-bold text-gray-900">{m.item}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded font-bold ${m.direction === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {m.direction}
                                </span>
                              </td>
                              <td className="p-3 font-bold">{m.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RAW MATERIALS */}
              {activeTab === 'RawMaterials' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Warehouse Raw Materials Stock</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="erp-table w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                          <th className="p-3">Code</th>
                          <th className="p-3">Material Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Available Stock</th>
                          <th className="p-3">Current Cost</th>
                          <th className="p-3 text-right">Valuation</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rawMaterials.map((rm) => (
                          <tr key={rm.id} className="hover:bg-amber-50/30">
                            <td className="p-3 font-mono font-bold text-[var(--primary)]">{rm.code}</td>
                            <td className="p-3 font-bold text-gray-900">{rm.name}</td>
                            <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">{rm.category}</span></td>
                            <td className="p-3 font-bold text-gray-900">{formatNumber(rm.availableStock)} {rm.unit}</td>
                            <td className="p-3">{formatCurrency(rm.currentCost)}</td>
                            <td className="p-3 text-right font-bold text-purple-700">{formatCurrency(rm.currentCost * rm.availableStock)}</td>
                            <td className="p-3 text-center">
                              <StatusBadge status={rm.availableStock <= rm.minStock ? 'Low Stock' : 'Available'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: FINISHED PRODUCTS */}
              {activeTab === 'FinishedProducts' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Warehouse Finished Goods Stock</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="erp-table w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                          <th className="p-3">SKU</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Size & Concentration</th>
                          <th className="p-3">Cost Price</th>
                          <th className="p-3">Selling Price</th>
                          <th className="p-3 text-right">Stock Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {finishedProducts.map((fp) => (
                          <tr key={fp.id} className="hover:bg-amber-50/30">
                            <td className="p-3 font-mono font-bold text-[var(--primary)]">{fp.sku}</td>
                            <td className="p-3 font-bold text-gray-900">{fp.productName}</td>
                            <td className="p-3 font-semibold text-gray-700">{fp.sizeName} • {fp.concentrationName}</td>
                            <td className="p-3 text-gray-600">{formatCurrency(fp.costPrice)}</td>
                            <td className="p-3 font-bold text-gray-900">{formatCurrency(fp.sellingPrice)}</td>
                            <td className="p-3 text-right font-bold text-emerald-700">{fp.stock} bottles</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: TRANSACTIONS */}
              {activeTab === 'Transactions' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Complete Stock Movements Ledger</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                          <th className="p-3">Date</th>
                          <th className="p-3">Transaction</th>
                          <th className="p-3">Reference</th>
                          <th className="p-3">Item</th>
                          <th className="p-3">Direction</th>
                          <th className="p-3">Qty</th>
                          <th className="p-3">User</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {movements.map((m) => (
                          <tr key={m.id}>
                            <td className="p-3 text-gray-500">{m.date ? m.date.substring(0, 10) : '—'}</td>
                            <td className="p-3 font-mono font-bold text-gray-800">{m.transaction}</td>
                            <td className="p-3 font-mono text-[var(--primary)] font-bold">{m.reference}</td>
                            <td className="p-3 font-bold text-gray-900">{m.item}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-bold ${m.direction === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {m.direction}
                              </span>
                            </td>
                            <td className="p-3 font-bold">{m.quantity}</td>
                            <td className="p-3 text-gray-500">{m.user || 'Production Manager'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: TRANSFERS */}
              {activeTab === 'Transfers' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Stock Transfers Ledger</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                          <th className="p-3">Transfer No</th>
                          <th className="p-3">Source Location</th>
                          <th className="p-3">Destination Location</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Items</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {transfers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-gray-500">No stock transfers found for this warehouse.</td>
                          </tr>
                        ) : (
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
                        )}
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

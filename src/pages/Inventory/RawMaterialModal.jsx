import {apiClient as api} from '../../api/client';
import React, { useState, useEffect } from 'react';
import {FragrancePriceFields} from '../../components/Perfume/FragrancePriceFields';
import { TextInput, SelectInput, NumberInput, CurrencyInput } from '../../components/forms/FormControls';
import { StatusBadge } from '../../components/common/StatusBadge';
import { purchaseApi } from '../../api/purchaseApi';
import { inventoryApi } from '../../api/inventoryApi';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  Boxes,
  Edit3,
  X,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export const RawMaterialModal = ({ isOpen, material, onClose, onUpdate, initialEdit = false }) => {
  const { hasPermission, singleLocationMode, storeSetup } = useAuth();
  const canEdit = hasPermission('warehouse.manage');

  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditing, setIsEditing] = useState(initialEdit);

  // Edit Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categories,setCategories]=useState([]);
  const [bottleSizes,setBottleSizes]=useState([]);
  const [compatibleBottleSizes,setCompatibleBottleSizes]=useState([]);
  useEffect(()=>{api.get("/bottle-sizes/").then(({data})=>setBottleSizes(data)).catch(()=>toast.error("Bottle sizes could not be loaded"))},[]);
  useEffect(()=>{api.get('/inventory/categories/').then(({data})=>setCategories(data)).catch(()=>{})},[]);
  const [category, setCategory] = useState('Perfume Oil');
  const [fragrancePrices,setFragrancePrices]=useState({});
  const [packagingType,setPackagingType]=useState('');
  const [unit, setUnit] = useState('ml');
  const [currentCost, setCurrentCost] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [status, setStatus] = useState('active');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expectedQuantity, setExpectedQuantity] = useState(null);
  const [quantityError, setQuantityError] = useState('');
  const canAdjust = hasPermission('inventory.adjust') || hasPermission('warehouse.manage');
  useEffect(() => {
    Promise.all([api.get('/warehouses/'), api.get('/branches/')]).then(([w,b]) => {
      const all=[...(w.data||[]),...(b.data||[])].filter(x=>x.status==='active'&&!x.isVirtual);
      const allowed=singleLocationMode?all.filter(x=>String(x.id)===String(storeSetup?.warehouseId)):all;
      setLocations(allowed);
      setSelectedLocation(v=>allowed.some(x=>String(x.id)===String(v))?v:String(allowed[0]?.id||''));
    }).catch(()=>setQuantityError('Could not load authorized locations.'));
  }, [singleLocationMode, storeSetup?.warehouseId]);
  useEffect(() => {
    if (!isOpen || !material?.id || !selectedLocation || !isEditing) return;
    let live=true;
    setExpectedQuantity(null);setQuantity('');setQuantityError('');
    inventoryApi.getCurrentQuantity(material.id, selectedLocation).then(({data})=>{
      if(live){setQuantity(String(data.quantity));setExpectedQuantity(String(data.quantity));}
    }).catch(()=>{if(live)setQuantityError('Unable to load current stock at this location.');});
    return ()=>{live=false};
  }, [isOpen, material?.id, selectedLocation, isEditing]);

  // Movements & History State
  const [movements, setMovements] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [purchaseRows, setPurchaseRows] = useState([]);
  const [wastages, setWastages] = useState([]);

  const [_loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (material) {
      setCode(material.code || '');
      setName(material.name || '');
      setCategory(material.categoryRef || '');
      setPackagingType(material.packagingType || '');setFragrancePrices(material.fragrancePrices||{});
      setCompatibleBottleSizes(material.compatibleBottleSizes || []);
      setUnit(material.unit || 'ml');
      setCurrentCost(material.currentCost || 0);
      setMinStock(material.minStock || 0);
      setStatus(material.status || 'active');
      setIsEditing(initialEdit);
      setActiveTab('Overview');
      fetchMaterialHistory(material);
    }
  }, [material, initialEdit]);

  const fetchMaterialHistory = async (mat) => {
    setLoading(true);
    try {
      const [mRes, wRes, stockRes, receiptRes] = await Promise.all([
        inventoryApi.getMovements(),
        inventoryApi.getWastage(),
        inventoryApi.getStockOverview(),
        purchaseApi.getGoodsReceipts(),
      ]);

      const itemMovements = (mRes.data || []).filter(
        (m) => m.item === mat.name
      );
      const itemWastages = (wRes.data || []).filter(
        (w) => w.item === mat.name
      );

      setStockRows(stockRes.data.filter(x => x.materialId === mat.id || x.name === mat.name));
      setPurchaseRows(receiptRes.data.flatMap(g => (g.items || []).filter(x => x.materialId === mat.id || x.material === mat.name).map(x => ({...x, date:g.receiveDate, supplier:g.supplierName, reference:g.poNumber || g.grnNumber}))));
      setMovements(itemMovements);
      setWastages(itemWastages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !material) return null;

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('You do not have permission to edit raw material master data');
      return;
    }

    if (!name || !name.toString().trim()) {
      toast.error('Material name is required');
      return;
    }
    if (!unit || !unit.toString().trim()) {
      toast.error('Unit is required');
      return;
    }
    if (currentCost === '' || currentCost === null || isNaN(Number(currentCost))) {
      toast.error('Valid current cost is required');
      return;
    }
    if (minStock === '' || minStock === null || isNaN(Number(minStock))) {
      toast.error('Valid minimum stock limit is required');
      return;
    }

    if (canAdjust && (!selectedLocation || expectedQuantity === null || quantityError)) {toast.error('Current quantity is not loaded. Select a valid stock location.');return;}
    setIsSaving(true);
    try {
      const updatedData = {
        code,
        name,
        categoryRef:category,
        fragrancePrices:categories.find(c=>c.id===category)?.categoryType==='Perfume Oil'?fragrancePrices:{},
        packagingType:categories.find(c=>c.id===category)?.categoryType==='Packaging'?packagingType:'',
        compatibleBottleSizes,
        unit,
        currentCost: Number(currentCost),
        minStock: Number(minStock),
        status,
      };

      if (canAdjust && selectedLocation && expectedQuantity !== null) {
        if (quantity === '' || !Number.isFinite(Number(quantity)) || Number(quantity) < 0 || (unit === 'pcs' && !Number.isInteger(Number(quantity)))) {
          toast.error('Enter a valid non-negative current quantity.');setIsSaving(false);return;
        }
        // Post the stock correction first; a 409 leaves master data untouched.
        await inventoryApi.setCurrentQuantity(material.id, {locationId:selectedLocation,quantity,expectedQuantity});
      }
      const response=await inventoryApi.updateRawMaterial(material.id, updatedData);
      toast.success(`Raw material ${name} updated successfully!`);
      onUpdate(response.data);
      setIsEditing(false);
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data || 'Failed to update raw material master data'));
    } finally {
      setIsSaving(false);
    }
  };

  const isLowStock = material.availableStock <= material.minStock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Raw Material">
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
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">{categories.find(c=>c.id===category)?.name||material.category}</span>
                <StatusBadge status={isLowStock ? 'Out of Stock' : status} />
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

        {/* Modal Tabs Bar (Section 6 spec: Overview, Warehouse Stock, Cost History, Stock Movement, Purchases, Production Usage, Wastage) */}
        {!isEditing && (
          <div className="flex items-center space-x-1 px-6 bg-gray-50 border-b border-gray-200 shrink-0 text-xs font-semibold overflow-x-auto">
            {[
              { id: 'Overview', label: '📊 Overview' },
              { id: 'WarehouseStock', label: '🏢 Warehouse Stock' },
              { id: 'CostHistory', label: '📈 Cost History' },
              { id: 'Movements', label: '📜 Stock Movements Log' },
              { id: 'ProductionUsage', label: '🏭 Production Usage & Wastage' },
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
          {/* EDIT MASTER DATA FORM VIEW */}
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-4 bg-gray-50/70 p-6 rounded-xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[var(--primary)]" />
                <span>Edit Raw Material Master Data</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Material Code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <TextInput
                  label="Material Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {categories.find(c=>c.id===category)?.categoryType==='Perfume Oil'&&<FragrancePriceFields value={fragrancePrices} onChange={setFragrancePrices}/>}<div className="grid grid-cols-3 gap-4">
                {categories.find(c=>c.id===category)?.categoryType==='Packaging'&&<SelectInput label="Packaging subtype" value={packagingType} onChange={e=>setPackagingType(e.target.value)} required options={[{value:'',label:'Select subtype'},...['Bottle','Pump','Cap','Label','Dip Tube','Other'].map(value=>({value,label:value==='Pump'?'Pump / Atomizer':value}))]}/>}
                {categories.find(c=>c.id===category)?.categoryType==='Packaging' && <label className="block text-sm font-medium">Compatible Bottle Sizes (Pumps / Caps / Packaging)
                  <select multiple value={compatibleBottleSizes} onChange={e=>setCompatibleBottleSizes(Array.from(e.target.selectedOptions,o=>o.value))} className="block w-full border rounded-lg p-2 mt-1">
                    {bottleSizes.filter(b=>b.status==='active'||compatibleBottleSizes.includes(b.id)).map(b=><option key={b.id} value={b.id}>{b.name} ({b.volumeMl} ml)</option>)}
                  </select><span className="block text-xs text-gray-500">Leave empty for all sizes. Hold Ctrl to select multiple.</span>
                </label>}
                <SelectInput
                  label="Category"
                  value={category}
                  onChange={(e) => {setCategory(e.target.value);if(categories.find(c=>c.id===e.target.value)?.categoryType!=='Packaging')setCompatibleBottleSizes([]);setUnit(categories.find(c=>c.id===e.target.value)?.unit||'')}}
                  options={categories.filter(c=>c.status==='active'||c.id===category).map(c=>({value:c.id,label:c.name}))}
                />
                <TextInput
                  label="Unit (from Category)" readOnly
                  required
                  value={unit}
                  
                />
                <SelectInput
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'active', label: 'Active Material' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CurrencyInput
                  label="Current Cost Rate (₹)"
                  required
                  value={currentCost}
                  onChange={(e) => setCurrentCost(e.target.value)}
                />
                <NumberInput
                  label="Minimum Reorder Threshold Stock"
                  required
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>

              <div className="space-y-2 border border-gray-200 rounded-xl p-3">
                <label className="erp-field">Stock location
                  <select className="erp-input" value={selectedLocation} onChange={e=>setSelectedLocation(e.target.value)} disabled={!canAdjust}>
                    {locations.map(l=><option key={l.id} value={l.id}>{l.name} ({l.kind})</option>)}
                  </select>
                </label>
                <label className="erp-field">Current Quantity ({unit})
                  <input className="erp-input" type="number" min="0" step={unit==='pcs'?'1':'0.0001'} value={quantity} onChange={e=>setQuantity(e.target.value)} disabled={!canAdjust||expectedQuantity===null} placeholder="Loading actual current stock…" />
                </label>
                {quantityError&&<p role="alert" className="text-red-700">{quantityError}</p>}
                <p className="text-xs text-gray-600">Changes are recorded as stock adjustments at the selected location; previous movements remain intact.</p>
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
                  <span>{isSaving ? 'Saving Changes...' : 'Save Master Data'}</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'Overview' && (
                <div className="space-y-6">
                  {/* Valuation & Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Available Stock</span>
                      <div className={`text-2xl font-bold mt-1 ${isLowStock ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatNumber(material.availableStock)} {material.unit}
                      </div>
                      {isLowStock && <span className="text-xs text-rose-600 font-bold">Below Reorder Limit!</span>}
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Current Cost</span>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(material.currentCost)}</div>
                      <span className="text-xs text-gray-500 font-medium">per {material.unit}</span>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <span className="text-xs text-purple-700 font-bold uppercase tracking-wider">Total Valuation</span>
                      <div className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(material.currentCost * material.availableStock)}</div>
                      <span className="text-xs text-purple-600 font-medium">Inventory Asset Value</span>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Reorder Limit</span>
                      <div className="text-2xl font-bold text-amber-900 mt-1">{formatNumber(material.minStock)} {material.unit}</div>
                      <span className="text-xs text-amber-700 font-medium">Minimum Threshold</span>
                    </div>
                  </div>

                  {/* Material Master Info */}
                  <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200 text-xs text-gray-700">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-3">
                      <h3 className="font-bold text-sm text-gray-900">Material Master Information</h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-gray-500 font-medium block">Material Code:</span>
                        <span className="font-mono font-bold text-[var(--primary)] text-sm">{material.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Material Name:</span>
                        <span className="font-bold text-gray-900 text-sm">{material.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Category:</span>
                        <span className="font-semibold text-gray-800">{material.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Compatible Bottle Sizes:</span><span>{(material.compatibleBottleSizes || []).length ? bottleSizes.filter(b=>material.compatibleBottleSizes.includes(b.id)).map(b=>b.name).join(", ") : "All sizes"}</span>
                        <span className="text-gray-500 font-medium block">Unit:</span>
                        <span className="font-mono font-bold uppercase text-gray-900">{material.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Movements Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Stock Movements Log</h3>
                      <button
                        onClick={() => setActiveTab('Movements')}
                        className="text-xs font-bold text-[var(--primary)] hover:underline"
                      >
                        View Full Movement History ➔
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                      <table className="erp-table w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                            <th className="p-3">Date</th>
                            <th className="p-3">Transaction</th>
                            <th className="p-3">Reference</th>
                            <th className="p-3">Location</th>
                            <th className="p-3">Direction</th>
                            <th className="p-3">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {movements.slice(0, 4).map((m) => (
                            <tr key={m.id}>
                              <td className="p-3 text-gray-500">{formatDate(m.date, true)}</td>
                              <td className="p-3 font-mono font-bold text-gray-800">{m.transaction}</td>
                              <td className="p-3 font-mono text-[var(--primary)] font-bold">{m.reference}</td>
                              <td className="p-3 font-semibold">{m.location}</td>
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

              {/* TAB 2: WAREHOUSE STOCK */}
              {activeTab === 'WarehouseStock' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Warehouse Stock Breakdown</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                          <th className="p-3">Warehouse Location</th>
                          <th className="p-3">Available Quantity</th>
                          <th className="p-3 text-right">Valuation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stockRows.map(row => <tr key={row.id} className="hover:bg-amber-50/30"><td className="p-3 font-bold text-gray-900">{row.location}</td><td className="p-3 font-bold">{formatNumber(row.available)} {material.unit}</td><td className="p-3 text-right font-bold text-purple-700">{formatCurrency(row.totalValue)}</td></tr>)}
                        {!stockRows.length && <tr><td className="p-3" colSpan={3}>No posted stock at any location.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: COST HISTORY */}
              {activeTab === 'CostHistory' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Historical Purchase Cost Rates</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                          <th className="p-3">Effective Date</th>
                          <th className="p-3">Unit Cost (₹)</th>
                          <th className="p-3">Supplier Vendor</th>
                          <th className="p-3">PO Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchaseRows.map((row,i) => <tr key={i}><td className="p-3">{formatDate(row.date)}</td><td className="p-3 font-bold">{formatCurrency(row.unitCost)} / {material.unit}</td><td className="p-3">{row.supplier}</td><td className="p-3 font-mono">{row.reference}</td></tr>)}
                        {!purchaseRows.length && <tr><td className="p-3" colSpan={4}>No purchase receipts recorded for this material.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: STOCK MOVEMENTS LOG */}
              {activeTab === 'Movements' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Complete Stock Movements History</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                    <table className="erp-table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                          <th className="p-3">Date & Time</th>
                          <th className="p-3">Transaction</th>
                          <th className="p-3">Reference</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">Direction</th>
                          <th className="p-3">Quantity</th>
                          <th className="p-3">Previous → New</th>
                          <th className="p-3">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {movements.map((m) => (
                          <tr key={m.id}>
                            <td className="p-3 text-gray-500">{formatDate(m.date, true)}</td>
                            <td className="p-3 font-mono font-bold text-gray-800">{m.transaction}</td>
                            <td className="p-3 font-mono text-[var(--primary)] font-bold">{m.reference}</td>
                            <td className="p-3 font-semibold">{m.location}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-bold ${m.direction === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {m.direction}
                              </span>
                            </td>
                            <td className="p-3 font-bold">{m.quantity}</td>
                            <td className="p-3 font-mono text-gray-600">{m.previousStock} → {m.newStock}</td>
                            <td className="p-3 text-gray-500">{m.user || 'Production Manager'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: PRODUCTION USAGE & WASTAGE */}
              {activeTab === 'ProductionUsage' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Formulation & Production Usage</h3>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                      Used as primary ingredient in <strong className="font-bold">Aventus Style Formulations</strong> (10 ml per 50ml bottle yield).
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recorded Material Wastage History</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs">
                      <table className="erp-table w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase">
                            <th className="p-3">Date</th>
                            <th className="p-3">Wastage Type</th>
                            <th className="p-3">Location</th>
                            <th className="p-3">Quantity</th>
                            <th className="p-3">Cost Loss</th>
                            <th className="p-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {wastages.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-gray-500">No wastage entries recorded for this material.</td>
                            </tr>
                          ) : (
                            wastages.map((w) => (
                              <tr key={w.id}>
                                <td className="p-3 text-gray-500">{w.date}</td>
                                <td className="p-3 font-semibold text-rose-700">{w.wastageType}</td>
                                <td className="p-3">{w.location}</td>
                                <td className="p-3 font-bold">{w.qty} {w.unit}</td>
                                <td className="p-3 font-bold text-rose-600">{formatCurrency(w.cost)}</td>
                                <td className="p-3 italic text-gray-600">{w.reason}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
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

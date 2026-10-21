import {useAuth} from '../../context/AuthContext';
import {apiClient as api} from '../../api/client';
import { RawMaterialCreateForm } from './RawMaterialCreateForm';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { inventoryApi } from '../../api/inventoryApi';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Plus, AlertCircle, Eye, Edit3, Trash2 } from 'lucide-react';
import { Can } from '../../components/common/Can';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { RawMaterialModal } from './RawMaterialModal';
import { toast } from 'sonner';



export const RawMaterialsList = () => {
  const {user,hasPermission}=useAuth();
  const [locations,setLocations]=useState([]);
  const [locationError,setLocationError]=useState(false);
  const [locationsLoading,setLocationsLoading]=useState(true);
  const [categories,setCategories]=useState([]);
  const [bottleSizes,setBottleSizes]=useState([]);
  const CATEGORIES=['All',...categories.map(c=>c.name)];
  const [materials, setMaterials] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchMaterials();
    Promise.all([api.get('/warehouses/'),api.get('/branches/')]).then(([w,b])=>setLocations([...w.data,...b.data].filter(l=>l.status==='active'))).catch(()=>setLocationError(true)).finally(()=>setLocationsLoading(false));
    api.get('/bottle-sizes/').then(({data})=>setBottleSizes(data)).catch(()=>toast.error('Bottle sizes could not be loaded'));
    api.get('/inventory/categories/').then(({data})=>setCategories(data)).catch(()=>{});
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await inventoryApi.getRawMaterials();
      setMaterials(res.data);
    } catch {
      toast.error('Failed to load raw materials');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialUpdate = (updatedMaterial) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === updatedMaterial.id ? { ...m, ...updatedMaterial } : m))
    );
    setSelectedItem(null);
  };

  const filteredData = materials.filter(
    (m) => activeCategory === 'All' || m.category === activeCategory
  );

  const columns = [
    { header: 'Code', accessor: 'code', render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.code}</span> },
    { header: 'Material Name', accessor: 'name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
    { header: 'Category', accessor: 'category', render: (row) => <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{row.category}</span> },
    { header: 'Unit', accessor: 'unit', render: (row) => <span className="text-xs text-gray-600 uppercase font-mono">{row.unit}</span> },
    {header:'Packaging subtype',accessor:'packagingType'},
    { header: 'Initial Qty', accessor: 'initialQty', render: (row) => <span>{formatNumber(row.initialQty || 0, row.unit==='pcs'?0:4)} {row.unit}</span> },
    { header: 'Current Cost', accessor: 'currentCost', render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.currentCost)} / {row.unit}</span> },
    {
      header: 'Available Stock',
      accessor: 'availableStock',
      render: (row) => {
        const isLow = row.availableStock <= row.minStock;
        return (
          <div className="flex items-center space-x-1.5">
            <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatNumber(row.availableStock, row.unit==='pcs'?0:4)} {row.unit}
            </span>
            {isLow && <AlertCircle className="w-4 h-4 text-rose-500" title="Low Stock Warning" />}
          </div>
        );
      },
    },
    { header: 'Minimum Stock', accessor: 'minStock', render: (row) => <span className="text-xs text-gray-500">{formatNumber(row.minStock)} {row.unit}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.availableStock <= row.minStock ? 'Out of Stock' : row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedItem(row);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details & Movement History"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["inventory.raw_material.edit","warehouse.manage"]}><button
            onClick={() => {
              setIsEditMode(true);
              setSelectedItem(row);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Material"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["inventory.raw_material.delete","warehouse.manage"]}><button
            onClick={() => setDeleteItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Material"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    try {
      await inventoryApi.deleteRawMaterial(deleteItem.id);
      toast.success(`Raw material "${deleteItem.name}" deleted successfully.`);
      fetchMaterials();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteItem(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Raw Materials Inventory"
        subtitle="Perfume oils, solvents, bottles, caps, pumps, labels & packaging materials"
        primaryAction={
          <Can permission="inventory.adjust">
            <button
              onClick={() => setIsAdjustOpen(true)}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Stock Adjustment</span>
            </button>
          </Can>
        }
      />

      <Can permission={["inventory.raw_material.create","warehouse.manage"]}><button onClick={() => setCreating(true)} className="mb-4 px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-semibold">Add Raw Material</button></Can>
      {/* Filter Tabs */}
      <div className="erp-panel flex items-center space-x-1 overflow-x-auto mb-4  p-1.5  ">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-[var(--primary)] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filteredData} loading={loading} searchPlaceholder="Search material name or code..." />

      {/* Stock Adjustment Modal */}
      {isAdjustOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustOpen}
          materials={materials}
          onClose={() => setIsAdjustOpen(false)}
          onSuccess={() => {
            setIsAdjustOpen(false);
            fetchMaterials();
          }}
        />
      )}

      {/* Comprehensive Raw Material Detail & Edit Modal */}
      {selectedItem && (
        <RawMaterialModal
          isOpen={!!selectedItem}
          material={selectedItem}
          initialEdit={isEditMode}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleMaterialUpdate}
        />
      )}

      {locationError && <p role="alert" className="text-rose-700 my-3">Branch and warehouse quantities could not be loaded. Reload to retry.</p>}
      {creating && <RawMaterialCreateForm categories={categories} bottleSizes={bottleSizes} locations={locations} locationsLoading={locationsLoading} locationError={locationError} onClose={()=>setCreating(false)} onSuccess={fetchMaterials}/> }
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteItem}
        title="Delete Raw Material Record"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        confirmText="Delete Material"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  );
};

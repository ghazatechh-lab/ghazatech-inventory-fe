import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { inventoryApi } from '../../api/inventoryApi';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { AlertTriangle, ShoppingCart, Building2, TrendingDown, Layers, AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LowStockList = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLowStock();
  }, []);

  const fetchLowStock = async () => {
    try {
      // Use the backend's location-specific stock and recipe-aware reorder thresholds.
      // The raw-material listing does not account for quantities needed per perfume.
      const res = await inventoryApi.getLowStock();
      const filtered = (res.data || [])
        .filter((row) => row.itemType === 'Raw Material')
        .map((row) => ({
          ...row,
          availableStock: Number(row.available),
          minStock: Number(row.minStock),
          currentCost: Number(row.unitCost || 0),
          shortage: Math.max(0, Number(row.minStock) - Number(row.available)),
          supplierName: getSupplierName(row),
        }));

      setLowStockItems(filtered);
    } catch (err) {
      console.error('Failed to fetch low stock items:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (item) => {
    if (item.supplierName) return item.supplierName;
    if (item.supplier) return item.supplier;
    if (item.categoryType === 'Perfume Oil' || item.categoryType === 'Solvent') {
      return 'Aroma Essence International';
    }
    if (item.category === 'Pouch' || item.category === 'Carry Bag') {
      return 'LuxPack Packaging Ltd.';
    }
    return 'Precision Glass & Packaging Co.';
  };

  // Metrics calculations
  const totalShortageQty = lowStockItems.reduce((acc, item) => acc + item.shortage, 0);
  const totalRestockCost = lowStockItems.reduce(
    (acc, item) => acc + item.shortage * (item.currentCost || 0),
    0
  );
  const uniqueSuppliersCount = new Set(lowStockItems.map((item) => item.supplierName)).size;

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.code}</span>,
    },
    {
      header: 'Material Item',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.name}</div>
          <span className="text-xs uppercase font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
            {row.category} · {row.location}
          </span>
        </div>
      ),
    },
    {
      header: 'Available Quantity',
      accessor: 'availableStock',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="font-bold text-rose-600">
            {formatNumber(row.availableStock)} {row.unit}
          </span>
        </div>
      ),
    },
    {
      header: 'Reorder Level',
      accessor: 'minStock',
      render: (row) => (
        <span className="font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
          {formatNumber(row.minStock)} {row.unit}{Number(row.recipeMinStock) > Number(row.configuredMinStock) ? ' (recipe minimum)' : ''}
        </span>
      ),
    },
    {
      header: 'Shortage',
      accessor: 'shortage',
      render: (row) => (
        <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 flex items-center space-x-1 w-max">
          <TrendingDown className="w-3.5 h-3.5 text-rose-600 inline" />
          <span>-{formatNumber(row.shortage)} {row.unit}</span>
        </span>
      ),
    },
    {
      header: 'Supplier',
      accessor: 'supplierName',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <Building2 className="w-4 h-4 text-[var(--primary)] shrink-0" />
          <span className="font-semibold text-gray-800 text-xs">{row.supplierName}</span>
        </div>
      ),
    },
    {
      header: 'Action',
      render: (row) => (
        <button
          onClick={() =>
            navigate('/purchases/orders/create', {
              state: { supplierName: row.supplierName, materialCode: row.code },
            })
          }
          className="px-3.5 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-[var(--primary)] group-hover:text-white" />
          <span>Create PO</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low Stock & Reorder Alerts"
        subtitle="Location stock alerts based on reorder levels and minimum quantities required for perfume recipes"
      />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="erp-panel  p-4  border border-rose-100  flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Low Stock Items</p>
            <h4 className="text-xl font-bold text-rose-600">{lowStockItems.length}</h4>
          </div>
        </div>

        <div className="erp-panel  p-4  border border-amber-100  flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Shortage Deficit</p>
            <h4 className="text-xl font-bold text-amber-700">{formatNumber(totalShortageQty)} units</h4>
          </div>
        </div>

        <div className="erp-panel  p-4  border border-emerald-100  flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Est. Restock Value</p>
            <h4 className="text-xl font-bold text-emerald-700">{formatCurrency(totalRestockCost)}</h4>
          </div>
        </div>

        <div className="erp-panel  p-4    flex items-center space-x-4">
          <div className="p-3 bg-gray-50 text-[var(--primary)] rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Suppliers to Contact</p>
            <h4 className="text-xl font-bold text-gray-900">{uniqueSuppliersCount}</h4>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={lowStockItems}
        loading={loading}
        searchPlaceholder="Search by material code, name, category or supplier..."
      />
    </div>
  );
};

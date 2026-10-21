import {useAuth} from '../../context/AuthContext';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SelectInput } from '../../components/forms/FormControls';
import { inventoryApi } from '../../api/inventoryApi';



import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Filter, Warehouse, Store, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';

export const StockOverview = () => {
  const {singleLocationMode}=useAuth();
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State (Section 6 Requirement: warehouse, branch, material type, stock status, search)
  const [warehouseFilter, setWarehouseFilter] = useState('All Warehouses');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('All Types');
  const [stockStatusFilter, setStockStatusFilter] = useState('All Statuses');

  useEffect(() => {
    fetchComprehensiveStock();
  }, []);

  const fetchComprehensiveStock = async () => {
    try {
      const res = await inventoryApi.getStockOverview();
      setStockList(res.data);
    } catch {
      toast.error('Failed to load comprehensive stock overview');
    } finally {
      setLoading(false);
    }
  };

  // Filtered dataset
  const filteredData = stockList.filter((item) => {
    const matchWH = singleLocationMode || warehouseFilter === 'All Warehouses' || item.location === warehouseFilter;
    const matchBR = singleLocationMode || branchFilter === 'All Branches' || item.location === branchFilter;
    const matchType =
      materialTypeFilter === 'All Types'
        ? true
        : materialTypeFilter === 'Raw Material'
        ? item.itemType === 'Raw Material'
        : materialTypeFilter === 'Finished Product'
        ? item.itemType === 'Finished Product'
        : item.category === materialTypeFilter;
    const matchStatus = stockStatusFilter === 'All Statuses' || item.stockStatus === stockStatusFilter;

    return matchWH && matchBR && matchType && matchStatus;
  });

  const columns = [
    { header: 'Item Code / SKU', accessor: 'code', render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.code}</span> },
    {
      header: 'Item Description',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900 block">{row.name}</span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className={`text-xs font-bold px-1.5 py-0.2 rounded ${row.itemType === 'Raw Material' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-[var(--primary)]/10 text-[var(--primary)] border border-amber-200'}`}>
              {row.itemType}
            </span>
            <span className="text-xs text-gray-500 font-semibold">{row.category}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: 'location',
      render: (row) => (
        <span className="text-xs font-semibold text-gray-800 flex items-center">
          {row.locationType === 'Warehouse' ? (
            <Warehouse className="w-3.5 h-3.5 text-purple-600 mr-1 shrink-0" />
          ) : (
            <Store className="w-3.5 h-3.5 text-[var(--primary)] mr-1 shrink-0" />
          )}
          {row.location}
        </span>
      ),
    },
    { header: 'Opening Stock', accessor: 'opening', render: (row) => <span className="text-gray-500 font-semibold">{formatNumber(row.opening)} {row.unit}</span> },
    {
      header: 'Incoming (+)',
      accessor: 'incoming',
      render: (row) => (
        <span className="text-emerald-700 font-bold flex items-center text-xs">
          <ArrowDownLeft className="w-3.5 h-3.5 mr-0.5" /> +{formatNumber(row.incoming)} {row.unit}
        </span>
      ),
    },
    {
      header: 'Outgoing (-)',
      accessor: 'outgoing',
      render: (row) => (
        <span className="text-rose-600 font-bold flex items-center text-xs">
          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> -{formatNumber(row.outgoing)} {row.unit}
        </span>
      ),
    },
    {
      header: 'Available Qty',
      accessor: 'available',
      render: (row) => {
        const isLow = row.stockStatus === 'Low Stock' || row.stockStatus === 'Out of Stock';
        return (
          <div className="flex items-center space-x-1.5">
            <span className={`font-bold text-sm ${isLow ? 'text-rose-600' : 'text-gray-900'}`}>
              {formatNumber(row.available)} {row.unit}
            </span>
            {isLow && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" title="Low Stock Warning" />}
          </div>
        );
      },
    },
    { header: 'Unit Rate / Price', accessor: 'unitCost', render: (row) => formatCurrency(row.unitCost) },
    { header: 'Total Value (₹)', accessor: 'value', render: (row) => <span className="font-bold text-purple-700">{formatCurrency(row.value)}</span> },
    { header: 'Stock Status', accessor: 'stockStatus', render: (row) => <StatusBadge status={row.stockStatus} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Comprehensive Stock Overview"
        subtitle="Multi-filter inventory tracking: Opening, Incoming, Outgoing, Available Qty & Valuations"
      />

      {/* Multi-Dimensional Filter Bar (Section 6 Specification) */}
      <div className="erp-panel  p-4    mb-6 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[var(--primary)]" />
          <span>Section 6 Specification Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {!singleLocationMode&&<>
          <SelectInput
            label="Filter by Warehouse"
            value={warehouseFilter}
            onChange={(e) => {
              setWarehouseFilter(e.target.value);
              setBranchFilter('All Branches');
            }}
            options={['All Warehouses', ...new Set(stockList.filter(x => x.locationType === 'Warehouse').map(x => x.location))]}
          />

          <SelectInput
            label="Filter by Branch Outlet"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setWarehouseFilter('All Warehouses');
            }}
            options={['All Branches', ...new Set(stockList.filter(x => x.locationType === 'Branch').map(x => x.location))]}
          />

          </>}
          <SelectInput
            label="Filter by Material / Item Type"
            value={materialTypeFilter}
            onChange={(e) => setMaterialTypeFilter(e.target.value)}
            options={['All Types', 'Raw Material', 'Finished Product', ...new Set(stockList.filter(x=>x.itemType==='Raw Material').map(x=>x.category))]}
          />

          <SelectInput
            label="Filter by Stock Status"
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            options={['All Statuses', 'Optimal', 'Low Stock', 'Out of Stock']}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        searchPlaceholder="Search item name, code, SKU or location..."
      />
    </div>
  );
};

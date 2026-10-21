import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { branchApi } from '../../api/branchApi';
import { warehouseApi } from '../../api/warehouseApi';
import { productApi } from '../../api/productApi';
import { formatCurrency } from '../../utils/formatters';
import { Layers, Store, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

export const FinishedGoodsStockView = () => {
  const [locations, setLocations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVariants();
  }, []);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const [res, w, b] = await Promise.all([productApi.getVariants(), warehouseApi.getWarehouses(), branchApi.getBranches()]);
      setLocations([...w.data.map(x => ({...x,kind:"Warehouse"})),...b.data.map(x => ({...x,kind:"Branch"}))]);
      setVariants(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load finished goods stock from backend');
    } finally {
      setLoading(false);
    }
  };

  const finishedStockColumns = [
    {
      header: 'SKU Code',
      accessor: 'sku',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.sku}</span>,
    },
    {
      header: 'Product Variant',
      accessor: 'productName',
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900 block">{row.productName}</span>
          <span className="text-xs text-gray-500">{row.sizeName} • {row.concentrationName}</span>
        </div>
      ),
    },
    ...locations.map((loc) => ({ header:loc.name, render:(row) => <span className="font-mono font-bold text-gray-800">{(loc.kind === 'Warehouse' ? row.warehouseStock : row.branchStock)?.[loc.id] || 0} pcs</span> })),
    {
      header: 'Total Available Stock',
      accessor: 'stock',
      render: (row) => (
        <span className={`font-bold px-2.5 py-1 rounded-lg border ${row.stock <= 10 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
          {row.stock} bottles
        </span>
      ),
    },
    {
      header: 'Stock Value (Cost)',
      render: (row) => <span className="font-bold text-gray-900 font-mono">{formatCurrency(row.costPrice * row.stock)}</span>,
    },
    {
      header: 'Stock Value (Retail)',
      render: (row) => <span className="font-bold text-[var(--primary)] font-mono">{formatCurrency(row.sellingPrice * row.stock)}</span>,
    },
  ];

  const totalFinishedStockBottles = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const totalFinishedStockCostValuation = variants.reduce((sum, v) => sum + ((v.costPrice || 0) * (v.stock || 0)), 0);
  const totalFinishedStockRetailValuation = variants.reduce((sum, v) => sum + ((v.sellingPrice || 0) * (v.stock || 0)), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finished Goods Stock Ledger"
        subtitle="Real-time finished perfume bottle inventory across boutique branches & central warehouses"
      />

      {/* Stock KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="erp-panel  p-5   ">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Bottled Inventory</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-[var(--primary)]">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{totalFinishedStockBottles} pcs</div>
          <span className="text-xs text-gray-500">Bottled & QC Approved</span>
        </div>

        <div className="erp-panel  p-5   ">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Valuation (Cost)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalFinishedStockCostValuation)}</div>
          <span className="text-xs text-gray-500">Asset Cost Value</span>
        </div>

        <div className="erp-panel  p-5   ">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Valuation (Retail)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(totalFinishedStockRetailValuation)}</div>
          <span className="text-xs text-emerald-600 font-semibold">Potential Retail Value</span>
        </div>
      </div>

      <DataTable
        columns={finishedStockColumns}
        data={variants}
        loading={loading}
        searchPlaceholder="Search finished stock by SKU, product name..."
      />
    </div>
  );
};

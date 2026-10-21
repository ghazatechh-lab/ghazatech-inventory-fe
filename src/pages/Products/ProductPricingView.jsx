import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { productApi } from '../../api/productApi';
import { formatCurrency } from '../../utils/formatters';
import { ShieldAlert, Eye } from 'lucide-react';
import { ProductCostingModal } from './ProductCostingModal';
import { toast } from 'sonner';

export const ProductPricingView = () => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costingVariant, setCostingVariant] = useState(null);

  useEffect(() => {
    fetchVariants();
  }, []);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const res = await productApi.getVariants();
      setVariants(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load product pricing from backend');
    } finally {
      setLoading(false);
    }
  };

  const costingColumns = [
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
    {
      header: 'Formulation Cost',
      render: (row) => <span className="font-mono text-gray-700">{formatCurrency(row.liquidCost)}</span>,
    },
    {
      header: 'Packaging (Bottle + Pump)',
      render: (row) => <span className="font-mono text-gray-700">{formatCurrency(row.packagingCost)}</span>,
    },
    {
      header: 'Manufacturing Overhead',
      render: (row) => <span className="font-mono text-gray-700">{formatCurrency(row.manufacturingCost)}</span>,
    },
    {
      header: 'Formula Unit Cost',
      accessor: 'costPrice',
      render: (row) => <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{formatCurrency(row.formulaCost)}</span>,
    },
    {
      header: 'MRP',
      accessor: 'mrp',
      render: (row) => <span className="font-mono text-gray-500 line-through">{formatCurrency(row.mrp ?? 0)}</span>,
    },
    {
      header: 'Selling Price',
      accessor: 'sellingPrice',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{formatCurrency(row.sellingPrice)}</span>,
    },
    {
      header: 'Gross Margin %',
      accessor: 'margin',
      render: (row) => (
        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {row.margin}
        </span>
      ),
    },
    {
      header: 'Cost Breakdown',
      render: (row) => (
        <button
          onClick={() => setCostingVariant(row)}
          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Costing</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Costing & Pricing Engine"
        subtitle="Display formulation cost, packaging, manufacturing overheads, total cost, selling price & gross margin"
      />

      {/* Image Specs Historical Rule Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800">Historical costs:</p>
          <p className="leading-relaxed mt-0.5 text-amber-900/90">
            Posted production batches and invoices preserve the costs recorded when they were created.
          </p>
        </div>
      </div>

      <DataTable
        columns={costingColumns}
        data={variants}
        loading={loading}
        searchPlaceholder="Search product variant by SKU or name..."
      />

      {costingVariant && (
        <ProductCostingModal
          isOpen={!!costingVariant}
          variant={costingVariant}
          onClose={() => setCostingVariant(null)}
        />
      )}
    </div>
  );
};

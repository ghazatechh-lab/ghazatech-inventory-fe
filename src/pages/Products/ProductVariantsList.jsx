import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { productApi } from '../../api/productApi';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Edit3, Eye, Trash2, Tag, X } from 'lucide-react';
import { ProductVariantModal } from './ProductVariantModal';
import { toast } from 'sonner';

export const ProductVariantsList = () => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [viewVariant, setViewVariant] = useState(null);
  const [deleteVariantItem, setDeleteVariantItem] = useState(null);

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
      toast.error('Failed to load product variants from backend');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteVariantItem) return;
    try {
      await productApi.deleteVariant(deleteVariantItem.id);
      toast.success(`Variant SKU "${deleteVariantItem.sku}" deleted successfully.`);
      fetchVariants();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteVariantItem(null);
    }
  };

  const variantColumns = [
    {
      header: 'SKU',
      accessor: 'sku',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.sku}</span>,
    },
    {
      header: 'Product',
      accessor: 'productName',
      render: (row) => <span className="font-bold text-gray-900">{row.productName}</span>,
    },
    {
      header: 'Size',
      accessor: 'sizeName',
      render: (row) => <span className="font-semibold text-gray-700">{row.sizeName}</span>,
    },
    {
      header: 'Concentration',
      accessor: 'concentrationName',
      render: (row) => (
        <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 text-xs">
          {row.concentrationName}
        </span>
      ),
    },
    {
      header: 'Cost',
      accessor: 'costPrice',
      render: (row) => <span className="font-semibold text-gray-700 font-mono">{formatCurrency(row.costPrice)}</span>,
    },
    {
      header: 'Selling Price',
      accessor: 'sellingPrice',
      render: (row) => <span className="font-bold text-gray-900 font-mono">{formatCurrency(row.sellingPrice)}</span>,
    },
    {
      header: 'Margin',
      accessor: 'margin',
      render: (row) => (
        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
          {row.margin}
        </span>
      ),
    },
    {
      header: 'Stock',
      accessor: 'stock',
      render: (row) => <span className="font-bold text-gray-900">{row.stock}</span>,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setViewVariant(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Variant SKU Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="*"><button
            onClick={() => {
              setSelectedVariant(row);
              setIsVariantModalOpen(true);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Variant SKU"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="*"><button
            onClick={() => setDeleteVariantItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Variant SKU"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Variants & SKUs"
        subtitle="Every size + concentration combination is a separate SKU"
        primaryAction={
          <button
            onClick={() => {
              setSelectedVariant(null);
              setIsVariantModalOpen(true);
            }}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[#252525] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--primary)]" />
            <span>Add Product Variant SKU</span>
          </button>
        }
      />

      <DataTable
        columns={variantColumns}
        data={variants}
        loading={loading}
        searchPlaceholder="Search variant by SKU, size, or concentration..."
      />

      {isVariantModalOpen && (
        <ProductVariantModal
          isOpen={isVariantModalOpen}
          variant={selectedVariant}
          onClose={() => setIsVariantModalOpen(false)}
          onSuccess={() => {
            setIsVariantModalOpen(false);
            fetchVariants();
          }}
        />
      )}

      {/* View Variant Modal */}
      {viewVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4 ">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">SKU: {viewVariant.sku}</h3>
                  <p className="text-xs text-gray-500">{viewVariant.productName}</p>
                </div>
              </div>
              <button onClick={() => setViewVariant(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Bottle Size:</span>
                <span className="font-bold text-gray-900">{viewVariant.sizeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Concentration:</span>
                <span className="font-bold text-purple-700">{viewVariant.concentrationName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Cost Price:</span>
                <span className="font-mono font-bold text-gray-900">{formatCurrency(viewVariant.costPrice)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Selling Price:</span>
                <span className="font-mono font-bold text-[var(--primary)]">{formatCurrency(viewVariant.sellingPrice)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Gross Margin:</span>
                <span className="font-bold text-emerald-700">{viewVariant.margin}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Available Stock:</span>
                <span className="font-bold text-gray-900">{viewVariant.stock} bottles</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteVariantItem}
        title="Delete Product Variant SKU"
        message={`Are you sure you want to delete SKU "${deleteVariantItem?.sku}"? This action cannot be undone.`}
        confirmText="Delete Variant"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteVariantItem(null)}
      />
    </div>
  );
};


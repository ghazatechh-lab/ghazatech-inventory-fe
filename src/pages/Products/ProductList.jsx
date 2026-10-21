import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { productApi } from '../../api/productApi';
import { Plus, Edit3, Eye, Trash2, Package, X } from 'lucide-react';
import { ProductModal } from './ProductModal';
import { toast } from 'sonner';

export const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [deleteProductItem, setDeleteProductItem] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productApi.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load product catalog from backend');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProductItem) return;
    try {
      await productApi.deleteProduct(deleteProductItem.id);
      toast.success(`Product "${deleteProductItem.name}" deleted successfully.`);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteProductItem(null);
    }
  };

  const productColumns = [
    {
      header: 'Product',
      accessor: 'name',
      render: (row) => <span className="font-bold text-gray-900 text-sm">{row.name}</span>,
    },
    {
      header: 'Fragrance',
      accessor: 'fragranceName',
      render: (row) => <span className="font-semibold text-gray-700">{row.fragranceName || '—'}</span>,
    },
    {
      header: 'Number of Variants',
      accessor: 'variantsCount',
      render: (row) => (
        <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs">
          {row.variantsCount || 3} SKUs
        </span>
      ),
    },
    {
      header: 'Finished Stock',
      accessor: 'finishedStock',
      render: (row) => (
        <span className="font-bold text-gray-900">
          {row.finishedStock ?? 0} bottles
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => setViewProduct(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Product Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="*"><button
            onClick={() => {
              setSelectedProduct(row);
              setIsProductModalOpen(true);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Product"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="*"><button
            onClick={() => setDeleteProductItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Product"
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
        title="Product Master Catalog"
        subtitle="Master catalog records, fragrance lines & variant SKU counts"
        primaryAction={
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsProductModalOpen(true);
            }}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[#252525] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--primary)]" />
            <span>Add New Product</span>
          </button>
        }
      />

      <DataTable
        columns={productColumns}
        data={products}
        loading={loading}
        searchPlaceholder="Search product by name or fragrance..."
      />

      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          product={selectedProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={() => {
            setIsProductModalOpen(false);
            fetchProducts();
          }}
        />
      )}

      {/* View Product Modal */}
      {viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4 ">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{viewProduct.name}</h3>
                  <p className="text-xs text-gray-500">Product Master Record</p>
                </div>
              </div>
              <button onClick={() => setViewProduct(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Fragrance Line:</span>
                <span className="font-bold text-gray-900">{viewProduct.fragranceName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Active SKUs:</span>
                <span className="font-bold text-amber-700">{viewProduct.variantsCount || 3} SKUs</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Finished Stock:</span>
                <span className="font-bold text-gray-900">{viewProduct.finishedStock ?? 0} bottles</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Status:</span>
                <StatusBadge status={viewProduct.status || 'active'} />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewProduct(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteProductItem}
        title="Delete Product Master Record"
        message={`Are you sure you want to delete "${deleteProductItem?.name}"? This action cannot be undone.`}
        confirmText="Delete Product"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteProductItem(null)}
      />
    </div>
  );
};


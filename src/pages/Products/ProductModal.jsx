import React, { useState, useEffect } from 'react';
import { TextInput, SelectInput } from '../../components/forms/FormControls';
import { productApi } from '../../api/productApi';
import { fragranceApi } from '../../api/fragranceApi';
import { X, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const ProductModal = ({ isOpen, product, onClose, onSuccess }) => {
  const isEdit = !!product;

  const [name, setName] = useState('');
  const [fragranceId, setFragranceId] = useState('');
  const [status, setStatus] = useState('active');

  const [fragrances, setFragrances] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFragrances();
      if (product) {
        setName(product.name || '');
        setFragranceId(product.fragranceId || '');
        setStatus(product.status || 'active');
      } else {
        setName('');
        setFragranceId('');
        setStatus('active');
      }
    }
  }, [isOpen, product]);

  const loadFragrances = async () => {
    try {
      const res = await fragranceApi.getFragrances();
      const list = res.data || [];
      setFragrances(list);
      if (list.length > 0 && !fragranceId) {
        setFragranceId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const selectedFrag = fragrances.find((f) => f.id === fragranceId);

    setSubmitting(true);
    try {
      const formData = {
        name: name.trim(),
        fragranceId,
        fragranceName: selectedFrag ? selectedFrag.name : 'Aventus Style',
        status,
      };

      if (isEdit) {
        await productApi.updateProduct(product.id, formData);
        toast.success('Product updated successfully!');
      } else {
        await productApi.createProduct(formData);
        toast.success('New product created successfully!');
      }

      onSuccess();
    } catch {
      toast.error(isEdit ? 'Failed to update product' : 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-md w-full p-6  space-y-4 ">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">
              {isEdit ? 'Edit Product Master' : 'Add New Product'}
            </h3>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <TextInput
            label="Product Name"
            placeholder="e.g. Aventus Style Perfume"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <SelectInput
            label="Fragrance Line Basis"
            value={fragranceId}
            onChange={(e) => setFragranceId(e.target.value)}
            options={fragrances.map((f) => ({
              label: `${f.name} (${f.code})`,
              value: f.id,
            }))}
            required
          />

          <SelectInput
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[#252525] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

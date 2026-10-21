import {Link} from 'react-router-dom';
import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { fragranceApi } from '../../api/fragranceApi';
import { Sparkles, Info, Plus, Edit3, Eye, Trash2, X } from 'lucide-react';
import { FragranceModal } from './FragranceModal';
import { toast } from 'sonner';

export const FragranceMaster = () => {
  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFragrance, setSelectedFragrance] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewFragrance, setViewFragrance] = useState(null);
  const [deleteFragranceItem, setDeleteFragranceItem] = useState(null);

  useEffect(() => {
    fetchFragrances();
  }, []);

  const fetchFragrances = async () => {
    try {
      const res = await fragranceApi.getFragrances();
      setFragrances(res.data || []);
    } catch {
      toast.error('Failed to load fragrances');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFragranceItem) return;
    try {
      await fragranceApi.deleteFragrance(deleteFragranceItem.id);
      toast.success(`Fragrance "${deleteFragranceItem.name}" deleted successfully.`);
      fetchFragrances();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteFragranceItem(null);
    }
  };

  const columns = [
    {
      header: 'Fragrance Code',
      accessor: 'code',
      render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.code}</span>,
    },
    {
      header: 'Fragrance Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.name}</div>
          {row.notes && <span className="text-xs text-gray-500 italic block truncate max-w-xs">{row.notes}</span>}
        </div>
      ),
    },
    {
      header: 'Reference / Inspiration',
      accessor: 'refBrand',
      render: (row) => (
        <span className="text-xs text-gray-600 italic">
          {row.refBrand || 'In-House Original'}
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
          <Can permission={["inventory.formulation.create","production.formulation"]}><Link className="text-xs text-amber-700 font-bold" to={`/inventory/products/create?fragranceId=${row.id}`}>Create Product</Link></Can>
          <button
            onClick={() => setViewFragrance(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Fragrance Profile"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["inventory.fragrance.edit","production.formulation"]}><button
            onClick={() => setSelectedFragrance(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Fragrance Profile"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["inventory.fragrance.delete","production.formulation"]}><button
            onClick={() => setDeleteFragranceItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Fragrance Profile"
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
        title="Fragrance Master"
        subtitle="Fragrance profiles, pricing and raw perfume oil bindings"
        primaryAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fragrance</span>
          </button>
        }
      />

      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Data Architecture Rule:</strong> Configure fragrance selling prices by type for a 100 ml perfume. Product formulations combine oils and solvents; the highest selected fragrance type price supplies the base price before the bottle rule.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={fragrances}
        loading={loading}
        searchPlaceholder="Search fragrance name, code or reference inspiration..."
      />

      {/* Add / Edit Fragrance Modal */}
      {(isAddOpen || selectedFragrance) && (
        <FragranceModal
          isOpen={isAddOpen || !!selectedFragrance}
          fragrance={selectedFragrance}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedFragrance(null);
          }}
          onSuccess={() => {
            setIsAddOpen(false);
            setSelectedFragrance(null);
            fetchFragrances();
          }}
        />
      )}

      {/* View Fragrance Modal */}
      {viewFragrance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4  text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{viewFragrance.name}</h3>
                  <p className="text-xs text-gray-500">Code: {viewFragrance.code}</p>
                </div>
              </div>
              <button onClick={() => setViewFragrance(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Inspiration / Brand:</span>
                <span className="font-bold text-gray-900">{viewFragrance.refBrand || 'In-House Original'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Status:</span>
                <StatusBadge status={viewFragrance.status || 'active'} />
              </div>
              {viewFragrance.notes && (
                <div className="pt-1">
                  <span className="text-gray-500 block mb-1">Scent Notes:</span>
                  <p className="p-2.5 bg-gray-50 rounded-xl text-gray-700 italic border border-gray-200/60 leading-relaxed">
                    {viewFragrance.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewFragrance(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Fragrance Modal */}
      <ConfirmModal
        isOpen={!!deleteFragranceItem}
        title="Delete Fragrance Record"
        message={`Are you sure you want to delete fragrance "${deleteFragranceItem?.name}"?`}
        confirmText="Delete Fragrance"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteFragranceItem(null)}
      />
    </div>
  );
};


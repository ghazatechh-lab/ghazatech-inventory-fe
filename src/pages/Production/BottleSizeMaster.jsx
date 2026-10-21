import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { fragranceApi } from '../../api/fragranceApi';
import { inventoryApi } from '../../api/inventoryApi';
import { Plus, Edit3, Box, Info, Eye, Trash2, X } from 'lucide-react';
import { BottleSizeModal } from './BottleSizeModal';
import { toast } from 'sonner';

export const BottleSizeMaster = () => {
  const [bottleSizes, setBottleSizes] = useState([]);
  const [rawMaterialsMap, setRawMaterialsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewSize, setViewSize] = useState(null);
  const [deleteSizeItem, setDeleteSizeItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sizesRes, rmRes] = await Promise.all([
        fragranceApi.getBottleSizes(),
        inventoryApi.getRawMaterials().catch(() => ({ data: [] })),
      ]);

      const sizes = sizesRes.data || [];
      const rms = rmRes.data || [];

      // Create lookup map for raw materials
      const rmMap = {};
      rms.forEach((rm) => {
        rmMap[rm.id] = rm;
        if (rm.code) rmMap[rm.code] = rm;
      });

      setRawMaterialsMap(rmMap);
      setBottleSizes(sizes);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load bottle sizes from backend');
    } finally {
      setLoading(false);
    }
  };

  const getMaterialLabel = (ref) => {
    if (!ref) return 'N/A';
    if (rawMaterialsMap[ref]) {
      const rm = rawMaterialsMap[ref];
      return `${rm.name} (${rm.code || rm.id})`;
    }
    return ref;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSizeItem) return;
    try {
      await fragranceApi.deleteBottleSize(deleteSizeItem.id);
      toast.success(`Bottle size "${deleteSizeItem.name}" deleted successfully.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteSizeItem(null);
    }
  };

  const columns = [
    ...[['Cap','capMaterialRef'],['Pump / Atomizer','pumpMaterialRef'],['Label','labelMaterialRef'],['Separate Dip Tube','dipTubeMaterialRef']].map(([header,accessor])=>({header,accessor,render:row=>getMaterialLabel(row[accessor])})),
    {
      header: 'Size Name',
      accessor: 'name',
      render: (row) => <span className="font-bold text-gray-900">{row.name}</span>,
    },
    {
      header: 'Volume (ml)',
      accessor: 'volumeMl',
      render: (row) => (
        <span className="font-bold text-[var(--primary)] font-mono bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
          {row.volumeMl} ml
        </span>
      ),
    },
    {
      header: 'Bottle Material Reference',
      accessor: 'bottleMaterialRef',
      render: (row) => (
        <span className="font-mono text-xs text-gray-700 font-medium">
          {getMaterialLabel(row.bottleMaterialRef)}
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
            onClick={() => setViewSize(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["inventory.bottle_setup.edit","production.formulation"]}><button
            onClick={() => setSelectedSize(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Size"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["inventory.bottle_setup.delete","production.formulation"]}><button
            onClick={() => setDeleteSizeItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Size"
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
        title="Bottle Size Master"
        subtitle="Dynamic bottle volume dimensions loaded dynamically from API backend"
        primaryAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[#252525] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--primary)]" />
            <span>Add Bottle Size</span>
          </button>
        }
      />

      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Master data:</strong> Maintain bottle volumes and packaging references here. Link bottle, cap, pump and label stock here; add a dip tube only when stocked separately. Products use this packaging set at POS checkout.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={bottleSizes}
        loading={loading}
        searchPlaceholder="Search bottle sizes, volumes or material references..."
      />

      {/* Add / Edit Bottle Size Modal */}
      {(isAddOpen || selectedSize) && (
        <BottleSizeModal
          isOpen={isAddOpen || !!selectedSize}
          bottleSize={selectedSize}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedSize(null);
          }}
          onSuccess={() => {
            setIsAddOpen(false);
            setSelectedSize(null);
            fetchData();
          }}
        />
      )}

      {/* View Bottle Size Modal */}
      {viewSize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4  text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{viewSize.name}</h3>
                  <p className="text-xs text-gray-500">Bottle Master Record</p>
                </div>
              </div>
              <button onClick={() => setViewSize(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Capacity Volume:</span>
                <span className="font-bold text-[var(--primary)]">{viewSize.volumeMl} ml</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Material Reference:</span>
                <span className="font-bold text-gray-900">{getMaterialLabel(viewSize.bottleMaterialRef)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Status:</span>
                <StatusBadge status={viewSize.status || 'active'} />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewSize(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bottle Size Modal */}
      <ConfirmModal
        isOpen={!!deleteSizeItem}
        title="Delete Bottle Size Record"
        message={`Are you sure you want to delete bottle size "${deleteSizeItem?.name}"?`}
        confirmText="Delete Bottle Size"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteSizeItem(null)}
      />
    </div>
  );
};


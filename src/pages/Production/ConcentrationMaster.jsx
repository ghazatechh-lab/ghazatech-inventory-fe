import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { fragranceApi } from '../../api/fragranceApi';
import { formatPercent } from '../../utils/formatters';
import { Plus, Edit3, FlaskConical, Info, Eye, Trash2, X } from 'lucide-react';
import { ConcentrationModal } from './ConcentrationModal';
import { toast } from 'sonner';

export const ConcentrationMaster = () => {
  const [concentrations, setConcentrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcentration, setSelectedConcentration] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewConcentration, setViewConcentration] = useState(null);
  const [deleteConcentrationItem, setDeleteConcentrationItem] = useState(null);

  useEffect(() => {
    fetchConcentrations();
  }, []);

  const fetchConcentrations = async () => {
    try {
      const res = await fragranceApi.getConcentrations();
      setConcentrations(res.data || []);
    } catch {
      toast.error('Failed to load concentrations from backend');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConcentrationItem) return;
    try {
      await fragranceApi.deleteConcentration(deleteConcentrationItem.id);
      toast.success(`Concentration "${deleteConcentrationItem.name}" deleted successfully.`);
      fetchConcentrations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteConcentrationItem(null);
    }
  };

  const columns = [
    {
      header: 'Concentration Code',
      accessor: 'code',
      render: (row) => <span className="font-mono font-bold text-purple-700 uppercase">{row.code}</span>,
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => <span className="font-bold text-gray-900">{row.name}</span>,
    },
    {
      header: 'Oil Percentage',
      accessor: 'oilPercentage',
      render: (row) => (
        <span className="font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
          {formatPercent(row.oilPercentage)}
        </span>
      ),
    },
    {
      header: 'Remaining Percentage / Description',
      accessor: 'remainingPercentage',
      render: (row) => (
        <div>
          <span className="text-gray-900 font-bold">
            {formatPercent(row.remainingPercentage || 100 - row.oilPercentage)}
          </span>
          <span className="text-xs text-gray-500 block">
            {row.description || `${row.remainingPercentage || 100 - row.oilPercentage}% Solvent & Diluent filler`}
          </span>
        </div>
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
            onClick={() => setViewConcentration(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["inventory.concentration.edit","production.formulation"]}><button
            onClick={() => setSelectedConcentration(row)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Concentration"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["inventory.concentration.delete","production.formulation"]}><button
            onClick={() => setDeleteConcentrationItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Concentration"
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
        title="Concentration Master"
        subtitle="Fragrance oil dilution ratios & concentration master records loaded dynamically from backend API"
        primaryAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Concentration</span>
          </button>
        }
      />

      <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl text-xs text-purple-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Master data:</strong> Maintain concentration names and dilution ratios here. Formulations use the saved oil percentage.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={concentrations}
        loading={loading}
        searchPlaceholder="Search concentration code, name or percentage..."
      />

      {/* Add / Edit Concentration Modal */}
      {(isAddOpen || selectedConcentration) && (
        <ConcentrationModal
          isOpen={isAddOpen || !!selectedConcentration}
          concentration={selectedConcentration}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedConcentration(null);
          }}
          onSuccess={() => {
            setIsAddOpen(false);
            setSelectedConcentration(null);
            fetchConcentrations();
          }}
        />
      )}

      {/* View Concentration Modal */}
      {viewConcentration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4  text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{viewConcentration.name} ({viewConcentration.code})</h3>
                  <p className="text-xs text-gray-500">Concentration Profile</p>
                </div>
              </div>
              <button onClick={() => setViewConcentration(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Oil Ratio (%):</span>
                <span className="font-bold text-purple-700">{formatPercent(viewConcentration.oilPercentage)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Solvent / Filler (%):</span>
                <span className="font-bold text-gray-900">{formatPercent(viewConcentration.remainingPercentage || 100 - viewConcentration.oilPercentage)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Status:</span>
                <StatusBadge status={viewConcentration.status || 'active'} />
              </div>
              {viewConcentration.description && (
                <div className="pt-1">
                  <span className="text-gray-500 block mb-1">Description & Purpose:</span>
                  <p className="p-2.5 bg-gray-50 rounded-xl text-gray-700 italic border border-gray-200/60 leading-relaxed">
                    {viewConcentration.description}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewConcentration(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Concentration Modal */}
      <ConfirmModal
        isOpen={!!deleteConcentrationItem}
        title="Delete Concentration Record"
        message={`Are you sure you want to delete concentration "${deleteConcentrationItem?.name}"?`}
        confirmText="Delete Concentration"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteConcentrationItem(null)}
      />
    </div>
  );
};


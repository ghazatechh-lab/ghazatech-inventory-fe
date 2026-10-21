import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { formulationApi } from '../../api/formulationApi';
import { fragranceApi } from '../../api/fragranceApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Edit3, Info, Eye, Trash2, FlaskConical, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const FormulationList = () => {
  const [formulas, setFormulas] = useState([]);
  const [fragrances, setFragrances] = useState([]);
  const [bottleSizes, setBottleSizes] = useState([]);
  const [concentrations, setConcentrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFormula, setViewFormula] = useState(null);
  const [editFormulaItem, setEditFormulaItem] = useState(null);
  const [deleteFormulaItem, setDeleteFormulaItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fRes, fragRes, bsRes, concRes] = await Promise.all([
        formulationApi.getFormulas(),
        fragranceApi.getFragrances().catch(() => ({ data: [] })),
        fragranceApi.getBottleSizes().catch(() => ({ data: [] })),
        fragranceApi.getConcentrations().catch(() => ({ data: [] })),
      ]);

      setFormulas(fRes.data || []);
      setFragrances(fragRes.data || []);
      setBottleSizes(bsRes.data || []);
      setConcentrations(concRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load formulations list from backend');
    } finally {
      setLoading(false);
    }
  };

  const getFragranceLabel = (row) => {
    if (!row) return 'Aventus Style';
    const f = fragrances.find((item) => item?.id === row.fragranceId || item?.code === row.fragranceId);
    if (f) return `${f.name} (${f.code || f.id})`;
    return row.fragranceName || 'Aventus Style';
  };

  const getBottleSizeLabel = (row) => {
    if (!row) return '50 ml';
    const b = bottleSizes.find((item) => item?.id === row.bottleSizeId);
    if (b) return `${b.name} (${b.volumeMl} ml)`;
    return row.bottleSizeName || '50 ml';
  };

  const getConcentrationLabel = (row) => {
    if (!row) return 'EDP (20%)';
    const c = concentrations.find((item) => item?.id === row.concentrationId || item?.code === row.concentrationId);
    if (c) return `${c.code} (${c.oilPercentage}%)`;
    return row.concentrationName || 'EDP (20%)';
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFormulaItem) return;
    try {
      await formulationApi.deleteFormula(deleteFormulaItem.id);
      toast.success('Formulation recipe deleted successfully.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteFormulaItem(null);
    }
  };

  const columns = [
    {
      header: 'Fragrance',
      accessor: 'fragranceId',
      render: (row) => (
        <span className="font-bold text-gray-900">
          {getFragranceLabel(row)}
        </span>
      ),
    },
    {
      header: 'Bottle Size',
      accessor: 'bottleSizeId',
      render: (row) => (
        <span className="font-semibold text-gray-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 text-xs">
          {getBottleSizeLabel(row)}
        </span>
      ),
    },
    {
      header: 'Concentration',
      accessor: 'concentrationId',
      render: (row) => (
        <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 text-xs">
          {getConcentrationLabel(row)}
        </span>
      ),
    },
    {
      header: 'Version',
      accessor: 'version',
      render: (row) => (
        <span className="font-mono text-xs bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded">
          {row.version || 'v1.0'}
        </span>
      ),
    },
    {
      header: 'Oil Qty',
      accessor: 'oilQty',
      render: (row) => <span className="font-semibold text-purple-900 font-mono">{row.oilQty} ml</span>,
    },
    {
      header: 'Solvent Qty',
      accessor: 'solventQty',
      render: (row) => <span className="font-semibold text-blue-900 font-mono">{row.solventQty} ml</span>,
    },
    {
      header: 'Estimated Unit Cost',
      accessor: 'estimatedUnitCost',
      render: (row) => (
        <span className="font-bold text-[var(--primary)] font-mono">
          {formatCurrency(row.estimatedUnitCost)}
        </span>
      ),
    },
    {
      header: 'Effective Date',
      accessor: 'effectiveDate',
      render: (row) => formatDate(row.effectiveDate),
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
            onClick={() => setViewFormula(row)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission="production.formulation"><button
            onClick={() => navigate(`/production/formulations/builder?id=${row.id}`)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Recipe"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission="production.formulation"><button
            onClick={() => setDeleteFormulaItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Recipe"
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
        title="Formulations Master List"
        subtitle="Perfume recipes, oil ratios, solvent proportions & unit cost previews"
        primaryAction={
          <button
            onClick={() => navigate('/production/formulations/builder')}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[#252525] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--primary)]" />
            <span>Open Formulation Builder</span>
          </button>
        }
      />

      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Formulation Master Records:</strong> Select any formula row and click <strong className="font-bold text-gray-900">Edit</strong> to modify recipe parameters, liquid proportions, or open the interactive Formulation Builder.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={formulas}
        loading={loading}
        searchPlaceholder="Search formulations by fragrance, bottle size, concentration or version..."
      />

      {/* View Formulation Modal (No footer Close button per rule) */}
      {viewFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-md w-full p-6  space-y-4  text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{getFragranceLabel(viewFormula)}</h3>
                  <p className="text-xs text-gray-500">Version: {viewFormula.version || 'v1.0'}</p>
                </div>
              </div>
              <button onClick={() => setViewFormula(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Bottle Size:</span>
                <span className="font-bold text-amber-700">{getBottleSizeLabel(viewFormula)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Concentration:</span>
                <span className="font-bold text-purple-700">{getConcentrationLabel(viewFormula)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Perfume Oil Qty:</span>
                <span className="font-mono font-bold text-purple-900">{viewFormula.oilQty} ml</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Solvent Filler Qty:</span>
                <span className="font-mono font-bold text-blue-900">{viewFormula.solventQty} ml</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Estimated Unit Cost:</span>
                <span className="font-mono font-bold text-[var(--primary)]">{formatCurrency(viewFormula.estimatedUnitCost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Effective Date:</span>
                <span className="font-bold text-gray-800">{formatDate(viewFormula.effectiveDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Status:</span>
                <StatusBadge status={viewFormula.status || 'active'} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Formulation Modal (No Back to View button, Cancel closes modal) */}
      {editFormulaItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6   text-xs">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Recipe Parameters</h3>
                <p className="text-xs text-gray-500">{getFragranceLabel(editFormulaItem)}</p>
              </div>
              <button onClick={() => setEditFormulaItem(null)} className="text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editFormulaItem.oilQty || Number(editFormulaItem.oilQty) <= 0) {
                  toast.error('Perfume oil quantity must be greater than zero.');
                  return;
                }
                if (!editFormulaItem.solventQty || Number(editFormulaItem.solventQty) <= 0) {
                  toast.error('Solvent quantity must be greater than zero.');
                  return;
                }
                try { await formulationApi.updateFormula(editFormulaItem.id, editFormulaItem); fetchData();
                toast.success('Formulation recipe updated successfully!');
                setEditFormulaItem(null); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save formula.'); }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Recipe Version <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editFormulaItem.version || 'v1.0'}
                  onChange={(e) => setEditFormulaItem({ ...editFormulaItem, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Perfume Oil (ml) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editFormulaItem.oilQty || ''}
                    onChange={(e) => setEditFormulaItem({ ...editFormulaItem, oilQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Solvent Filler (ml) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editFormulaItem.solventQty || ''}
                    onChange={(e) => setEditFormulaItem({ ...editFormulaItem, solventQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Estimated Unit Cost (₹) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editFormulaItem.estimatedUnitCost || ''}
                  onChange={(e) => setEditFormulaItem({ ...editFormulaItem, estimatedUnitCost: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = editFormulaItem.id;
                    setEditFormulaItem(null);
                    navigate(`/production/formulations/builder?id=${targetId}`);
                  }}
                  className="text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  Open in Interactive Builder →
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditFormulaItem(null)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Formulation Modal */}
      {deleteFormulaItem && (
        <ConfirmModal
          isOpen={!!deleteFormulaItem}
          title="Delete Formulation Recipe"
          message={`Are you sure you want to delete formulation recipe for "${getFragranceLabel(deleteFormulaItem)}"?`}
          confirmText="Delete Formulation"
          type="danger"
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteFormulaItem(null)}
        />
      )}
    </div>
  );
};


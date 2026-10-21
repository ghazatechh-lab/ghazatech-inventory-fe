import React, { useState, useEffect } from 'react';
import { TextInput, NumberInput, SelectInput, TextArea } from '../../components/forms/FormControls';
import { fragranceApi } from '../../api/fragranceApi';
import { X, FlaskConical, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const ConcentrationModal = ({ isOpen, concentration, onClose, onSuccess }) => {
  const isEdit = !!concentration;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [oilPercentage, setOilPercentage] = useState(20);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (concentration) {
        setCode(concentration.code || '');
        setName(concentration.name || '');
        setOilPercentage(concentration.oilPercentage ?? 0);
        setDescription(
          concentration.description ||
            `${concentration.remainingPercentage || 100 - (concentration.oilPercentage ?? 0)}% Solvent & Alcohol diluent`
        );
        setStatus(concentration.status || 'active');
      } else {
        setCode('');
        setName('');
        setOilPercentage(20);
        setDescription('80% Perfume Grade Solvent & Ethanol Alcohol diluent');
        setStatus('active');
      }
    }
  }, [isOpen, concentration]);

  if (!isOpen) return null;

  const remainingPercentage = Math.max(0, 100 - Number(oilPercentage || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Concentration name is required');
      return;
    }
    if (Number(oilPercentage) <= 0 || Number(oilPercentage) > 100) {
      toast.error('Oil percentage must be between 1% and 100%');
      return;
    }

    setSubmitting(true);
    try {
      const formData = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        oilPercentage: Number(oilPercentage),
        remainingPercentage,
        description: description.trim() || `${remainingPercentage}% Solvent & Diluent`,
        status,
      };

      if (isEdit) {
        await fragranceApi.updateConcentration(concentration.id, formData);
        toast.success('Concentration profile updated successfully!');
      } else {
        await fragranceApi.createConcentration(formData);
        toast.success('New Concentration profile created successfully!');
      }

      onSuccess();
    } catch {
      toast.error(isEdit ? 'Failed to update concentration' : 'Failed to create concentration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-md w-full p-6  space-y-4 ">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <FlaskConical className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">
              {isEdit ? 'Edit Concentration Profile' : 'Add New Concentration Profile'}
            </h3>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Concentration Code"
              placeholder="e.g. EDP, EDT, EXTRAIT"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="font-mono font-bold text-purple-700 uppercase"
            />

            <TextInput
              label="Concentration Name"
              placeholder="e.g. Eau de Parfum"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Perfume Oil Percentage (%)"
              placeholder="e.g. 20"
              value={oilPercentage}
              onChange={(e) => setOilPercentage(e.target.value)}
              required
              min={1}
              max={100}
              step="any"
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
          </div>

          {/* Dynamic Calculated Diluent Section */}
          <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200/60 space-y-1 text-xs">
            <div className="flex justify-between items-center font-bold text-purple-900">
              <span>Calculated Diluent Filler:</span>
              <span className="font-bold text-purple-700 text-sm">{remainingPercentage}%</span>
            </div>
            <p className="text-xs text-purple-800">
              {oilPercentage}% Raw Perfume Oil + {remainingPercentage}% Solvent & Diluent.
            </p>
          </div>

          <TextArea
            label="Remaining Percentage Description / Diluent Notes"
            placeholder="e.g. 80% Solvent & Ethanol Alcohol diluent filler"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
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
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Concentration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

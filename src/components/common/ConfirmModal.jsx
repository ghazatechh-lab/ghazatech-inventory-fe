import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
}) => {
  if (!isOpen) return null;

  const handleCancel = onCancel || onClose;
  const labelText = confirmText || confirmLabel || 'Confirm Action';

  return (
    <div className="erp-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="erp-dialog !max-w-md">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          <button aria-label="Close confirmation" onClick={handleCancel} className="text-gray-500 hover:text-gray-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-4 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors shadow-xs ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)]'
            } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : labelText}
          </button>
        </div>
      </div>
    </div>
  );
};

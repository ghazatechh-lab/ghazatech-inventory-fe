import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { transferApi } from '../../api/transferApi';
import { formatDate } from '../../utils/formatters';
import { CheckCircle2, Truck, PackageCheck, ArrowLeft, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['Requested', 'Approved', 'Dispatched', 'Received'];

export const StockTransferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  const fetchTransfer = async () => {
    try {
      setLoading(true);
      const res = await transferApi.getTransferDetail(id);
      const found = res.data;
      setTransfer(found);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transfer detail from backend');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = transfer ? STEPS.indexOf(transfer.status) : 0;

  const handleStatusTransition = async (nextStatus) => {
    setUpdating(true);
    try {
      if (nextStatus === 'Approved') await transferApi.approveTransfer(transfer.id);
      if (nextStatus === 'Dispatched') await transferApi.dispatchTransfer(transfer.id);
      if (nextStatus === 'Received') await transferApi.receiveTransfer(transfer.id);

      toast.success(`Transfer status successfully updated to ${nextStatus}!`);
      fetchTransfer();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to transition transfer to ${nextStatus}`);
    } finally {
      setUpdating(false);
    }
  };

  if (!loading && !transfer) return <div className="p-6 text-center text-gray-500">Unable to load this record. Check your permissions and backend connection.</div>;
  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading transfer details...</div>;
  }

  const isDispatched = transfer.status === 'Dispatched';
  const isReceived = transfer.status === 'Received';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Stock Transfer ${transfer.transferNo}`}
        subtitle={`${transfer.sourceName} (${transfer.sourceType || 'Source'}) ➔ ${transfer.destName} (${transfer.destType || 'Destination'})`}
        secondaryActions={[
          <button
            key="back"
            onClick={() => navigate('/transfers')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Transfers</span>
          </button>,
        ]}
      />

      {transfer.status === 'Requested' && <Can permission="transfers.create"><button onClick={() => navigate(`/transfers/create?edit=${transfer.id}`)} className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl">Edit Draft Transfer</button></Can>}
      {/* Lifecycle Timeline Progress */}
      <div className="erp-panel  p-6    space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Transfer Lifecycle Progress
          </h3>
          <StatusBadge status={transfer.status} />
        </div>

        <div className="flex items-center justify-between relative max-w-2xl mx-auto py-4">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-[var(--primary)] -translate-y-1/2 z-0 transition-all duration-500"
            style={{
              width: `${currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0}%`,
            }}
          />

          {STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-[var(--primary)] text-white shadow-md ring-4 ring-amber-100'
                      : 'bg-white text-gray-500 border-2 border-gray-300'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 text-[var(--primary)]" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-bold mt-2 ${
                    isCurrent ? 'text-gray-900 font-bold' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Business Behaviour State Notifiers */}
        {isDispatched && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-center space-x-3">
            <Truck className="w-5 h-5 text-[var(--primary)] shrink-0" />
            <div>
              <strong className="font-bold block text-sm">Stock Dispatched & Currently In-Transit:</strong>
              Inventory has been deducted from <strong className="font-bold">{transfer.sourceName}</strong> and is currently in-transit to <strong className="font-bold">{transfer.destName}</strong> according to authoritative backend state.
            </div>
          </div>
        )}

        {isReceived && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center space-x-3">
            <PackageCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <strong className="font-bold block text-sm">Transfer Completed & Stock Received:</strong>
              Stock quantity has been successfully added to destination <strong className="font-bold">{transfer.destName}</strong> stock after backend API confirmation.
            </div>
          </div>
        )}

        {/* Status Transition Action Buttons (Scoped by Allowed Transition Rules) */}
        <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200">
          {transfer.status === 'Requested' && (
            <button
              onClick={() => handleStatusTransition('Approved')}
              disabled={updating}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[#252525] text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
              <span>{updating ? 'Approving...' : 'Approve Transfer Request'}</span>
            </button>
          )}

          {transfer.status === 'Approved' && (
            <button
              onClick={() => handleStatusTransition('Dispatched')}
              disabled={updating}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-2 transition-colors"
            >
              <Truck className="w-4 h-4" />
              <span>{updating ? 'Dispatching...' : 'Dispatch Stock (Mark In-Transit)'}</span>
            </button>
          )}

          {transfer.status === 'Dispatched' && (
            <button
              onClick={() => handleStatusTransition('Received')}
              disabled={updating}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-2 transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{updating ? 'Confirming...' : 'Confirm Receipt at Destination'}</span>
            </button>
          )}
        </div>
      </div>

      {/* User Audit Trail Stamp Grid (Image Requirement) */}
      <div className="erp-panel  p-6    space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          User Audit Trail & Stage Authorization Log
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
            <span className="text-xs text-gray-500 font-semibold block uppercase">Requested By</span>
            <div className="flex items-center space-x-1.5 font-bold text-gray-900">
              <UserCheck className="w-4 h-4 text-[var(--primary)]" />
              <span>{transfer.requestedBy || '—'}</span>
            </div>
            <span className="text-xs text-gray-500 block pt-1">
              {formatDate(transfer.lifecycle?.requestedAt || transfer.date)}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
            <span className="text-xs text-gray-500 font-semibold block uppercase">Approved By</span>
            <div className="flex items-center space-x-1.5 font-bold text-gray-900">
              <UserCheck className="w-4 h-4 text-[var(--primary)]" />
              <span>{transfer.approvedBy || 'Pending Approval'}</span>
            </div>
            <span className="text-xs text-gray-500 block pt-1">
              {transfer.lifecycle?.approvedAt ? formatDate(transfer.lifecycle.approvedAt) : '—'}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
            <span className="text-xs text-gray-500 font-semibold block uppercase">Dispatched By</span>
            <div className="flex items-center space-x-1.5 font-bold text-gray-900">
              <UserCheck className="w-4 h-4 text-[var(--primary)]" />
              <span>{transfer.dispatchedBy || 'Pending Dispatch'}</span>
            </div>
            <span className="text-xs text-gray-500 block pt-1">
              {transfer.lifecycle?.dispatchedAt ? formatDate(transfer.lifecycle.dispatchedAt) : '—'}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
            <span className="text-xs text-gray-500 font-semibold block uppercase">Received By</span>
            <div className="flex items-center space-x-1.5 font-bold text-gray-900">
              <UserCheck className="w-4 h-4 text-[var(--primary)]" />
              <span>{transfer.receivedBy || 'Pending Receipt'}</span>
            </div>
            <span className="text-xs text-gray-500 block pt-1">
              {transfer.lifecycle?.receivedAt ? formatDate(transfer.lifecycle.receivedAt) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Items Ledger Table */}
      <div className="erp-panel  p-6    space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">Transferred Items Ledger</h3>
          <span className="text-xs text-gray-500 font-semibold">
            {transfer.items?.length || 1} SKUs Transferred
          </span>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="erp-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase text-xs">
                <th className="p-3">SKU / Item Code</th>
                <th className="p-3">Item Description</th>
                <th className="p-3">Available at Source</th>
                <th className="p-3 text-right">Requested Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(transfer.items || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="p-3 font-mono font-bold text-[var(--primary)]">{item.sku}</td>
                  <td className="p-3 font-bold text-gray-900">{item.itemName}</td>
                  <td className="p-3 text-gray-600 font-mono">{item.availableQty ?? 0} units</td>
                  <td className="p-3 text-right font-bold text-gray-900 font-mono">{item.requestedQty} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transfer.notes && (
          <div className="pt-2 text-xs">
            <span className="font-bold text-gray-900 block mb-1">Transfer Notes:</span>
            <p className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-700">{transfer.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

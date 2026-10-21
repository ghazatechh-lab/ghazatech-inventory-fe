import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { inventoryApi } from '../../api/inventoryApi';
import { formatDate } from '../../utils/formatters';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const res = await inventoryApi.getMovements();
      setMovements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Date & Time', accessor: 'date', render: (row) => <span className="text-xs font-medium text-gray-700">{formatDate(row.date, true)}</span> },
    { header: 'Transaction Type', accessor: 'transaction', render: (row) => <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{row.transaction}</span> },
    { header: 'Reference', accessor: 'reference', render: (row) => <span className="font-mono text-xs text-[var(--primary)] font-bold">{row.reference}</span> },
    { header: 'Item', accessor: 'item', render: (row) => <span className="font-bold text-gray-900">{row.item}</span> },
    { header: 'Location', accessor: 'location' },
    {
      header: 'Direction',
      accessor: 'direction',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
            row.direction === 'OUT'
              ? 'bg-rose-100 text-rose-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {row.direction === 'OUT' ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />}
          {row.direction}
        </span>
      ),
    },
    { header: 'Quantity', accessor: 'quantity', render: (row) => <span className="font-semibold text-gray-900">{row.quantity}</span> },
    {
      header: 'Previous → New Stock',
      render: (row) => (
        <span className="font-mono text-xs text-gray-600">
          {row.previousStock} → <span className="font-bold text-gray-900">{row.newStock}</span>
        </span>
      ),
    },
    { header: 'Recorded By', accessor: 'user', render: (row) => <span className="text-xs text-gray-500">{row.user}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Movements Audit Log"
        subtitle="Complete immutable ledger of raw material & finished goods movements"
      />

      <DataTable columns={columns} data={movements} loading={loading} searchPlaceholder="Search reference, transaction or item..." />
    </div>
  );
};

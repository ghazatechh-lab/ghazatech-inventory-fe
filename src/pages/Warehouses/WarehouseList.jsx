import { Can } from '../../components/common/Can';
import { CreateRecordModal } from '../../components/common/CreateRecordModal';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { warehouseApi } from '../../api/warehouseApi';
import { formatCurrency } from '../../utils/formatters';
import { MapPin, User, Eye, Edit3, Trash2 } from 'lucide-react';
import { WarehouseModal } from './WarehouseModal';
import { toast } from 'sonner';

export const WarehouseList = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [modalTab, setModalTab] = useState('Overview');
  const [deleteWarehouseItem, setDeleteWarehouseItem] = useState(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await warehouseApi.getWarehouses();
      setWarehouses(res.data);
    } catch {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseUpdate = (updatedWh) => {
    setWarehouses((prev) =>
      prev.map((w) => (w.id === updatedWh.id ? { ...w, ...updatedWh } : w))
    );
    setSelectedWarehouse(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteWarehouseItem) return;
    try {
      await warehouseApi.deleteWarehouse(deleteWarehouseItem.id);
      toast.success(`Warehouse "${deleteWarehouseItem.name}" deleted successfully.`);
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteWarehouseItem(null);
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code', render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.code}</span> },
    { header: 'Warehouse Name', accessor: 'name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
    { header: 'Location', accessor: 'location', render: (row) => <span className="text-xs text-gray-600 flex items-center"><MapPin className="w-3.5 h-3.5 text-gray-500 mr-1" />{row.location}</span> },
    { header: 'Manager', accessor: 'manager', render: (row) => <span className="text-xs text-gray-700 flex items-center"><User className="w-3.5 h-3.5 text-gray-500 mr-1" />{row.manager}</span> },
    { header: 'Raw Material Value', accessor: 'rawMaterialValue', render: (row) => <span className="font-semibold text-purple-700">{formatCurrency(row.rawMaterialValue)}</span> },
    { header: 'Finished Goods Value', accessor: 'finishedStockValue', render: (row) => <span className="font-semibold text-emerald-700">{formatCurrency(row.finishedStockValue)}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => {
              setModalTab('Overview');
              setSelectedWarehouse(row);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Warehouse Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["administration.warehouse.edit","warehouse.manage"]}><button
            onClick={() => {
              setModalTab('Edit');
              setSelectedWarehouse(row);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Warehouse"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["administration.warehouse.delete","warehouse.manage"]}><button
            onClick={() => setDeleteWarehouseItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Warehouse"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button></Can>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Manage central inventory hubs, raw material stores & packaging depots"
      />

      <Can permission={["administration.warehouse.create","warehouse.manage"]}><button onClick={() => setCreating(true)} className="mb-4 px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-semibold">Add Warehouse</button></Can>
      <DataTable columns={columns} data={warehouses} loading={loading} searchPlaceholder="Search warehouse code or location..." />

      {/* Integrated All-In-One Warehouse Modal */}
      {selectedWarehouse && (
        <WarehouseModal
          isOpen={!!selectedWarehouse}
          warehouse={selectedWarehouse}
          initialTab={modalTab}
          onClose={() => setSelectedWarehouse(null)}
          onUpdate={handleWarehouseUpdate}
        />
      )}

      {creating && <CreateRecordModal title="Add Warehouse" fields={[{name:'code',label:'Code',required:true,maxLength:60},{name:'name',label:'Name',required:true,maxLength:160},{name:'location',label:'Physical Location Address',required:true},{name:'manager',label:'Assigned Manager',required:true},{name:'phone',label:'Phone'},{name:'email',label:'Email',type:'email'},{name:'status',label:'Operational Status',required:true,options:['active','inactive']}]} defaults={{status:'active',unit:'ml',currentCost:'0',minStock:'0'}} save={warehouseApi.createWarehouse} onClose={() => setCreating(false)} onSuccess={fetchWarehouses} />}
      {/* Delete Warehouse Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteWarehouseItem}
        title="Delete Warehouse Record"
        message={`Are you sure you want to delete warehouse "${deleteWarehouseItem?.name}"?`}
        confirmText="Delete Warehouse"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteWarehouseItem(null)}
      />
    </div>
  );
};


import { Can } from '../../components/common/Can';
import { CreateRecordModal } from '../../components/common/CreateRecordModal';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { warehouseApi } from '../../api/warehouseApi';
import { branchApi } from '../../api/branchApi';
import { formatCurrency } from '../../utils/formatters';
import { MapPin, User, Eye, DollarSign, Edit3, Trash2 } from 'lucide-react';
import { BranchModal } from './BranchModal';
import { toast } from 'sonner';

export const BranchList = () => {
  const [warehouses,setWarehouses]=useState([]);
  const [branches, setBranches] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [deleteBranchItem, setDeleteBranchItem] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchBranches();
    warehouseApi.getWarehouses().then(({data})=>setWarehouses(data.filter(w=>w.status==='active'))).catch(()=>toast.error('Warehouse choices could not be loaded'));
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await branchApi.getBranches();
      setBranches(res.data);
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchUpdate = (updatedBranch) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === updatedBranch.id ? { ...b, ...updatedBranch } : b))
    );
    setSelectedBranch(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBranchItem) return;
    try {
      await branchApi.deleteBranch(deleteBranchItem.id);
      toast.success(`Branch "${deleteBranchItem.name}" deleted successfully.`);
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteBranchItem(null);
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code', render: (row) => <span className="font-mono font-bold text-[var(--primary)]">{row.code}</span> },
    { header: 'Store Name', accessor: 'name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
    { header: 'Warehouse', accessor:'warehouseName', render:row=>row.warehouseName || 'Not assigned' },
    { header: 'Location', accessor: 'location', render: (row) => <span className="text-xs text-gray-600 flex items-center"><MapPin className="w-3.5 h-3.5 text-gray-500 mr-1" />{row.location}</span> },
    { header: 'Manager', accessor: 'manager', render: (row) => <span className="text-xs text-gray-700 flex items-center"><User className="w-3.5 h-3.5 text-gray-500 mr-1" />{row.manager}</span> },
    { header: 'Finished Stock Value', accessor: 'finishedStockValue', render: (row) => <span className="font-semibold text-emerald-700">{formatCurrency(row.finishedStockValue)}</span> },
    { header: "Today's Sales", accessor: 'todaySales', render: (row) => <span className="font-bold text-[var(--primary)] flex items-center"><DollarSign className="w-3.5 h-3.5 mr-0.5" />{formatCurrency(row.todaySales)}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 justify-end">
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedBranch(row);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="View Branch Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <Can permission={["administration.branch.edit","*"]}><button
            onClick={() => {
              setIsEditMode(true);
              setSelectedBranch(row);
            }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Edit Branch"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button></Can>
          <Can permission={["administration.branch.delete","*"]}><button
            onClick={() => setDeleteBranchItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="Delete Branch"
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
        title="Branches & Retail Outlets"
        subtitle="Manage flagship boutiques, mall kiosks & branch inventory performance"
      />

      <Can permission={["administration.branch.create","*"]}><button onClick={() => setCreating(true)} className="mb-4 px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-semibold">Add Branch</button></Can>
      <DataTable columns={columns} data={branches} loading={loading} searchPlaceholder="Search branch code or store name..." />

      {/* Integrated All-In-One Branch Modal */}
      {selectedBranch && (
        <BranchModal
          isOpen={!!selectedBranch}
          branch={selectedBranch}
          initialEdit={isEditMode}
          onClose={() => setSelectedBranch(null)}
          onUpdate={handleBranchUpdate}
        />
      )}

      {creating && <CreateRecordModal title="Add Branch" fields={[{name:'code',label:'Code',required:true,maxLength:60},{name:'name',label:'Name',required:true,maxLength:160},{name:'location',label:'Physical Location Address',required:true},{name:'warehouse',label:'Linked Warehouse',required:true,options:warehouses.map(w=>({value:w.id,label:w.name}))},{name:'manager',label:'Assigned Manager',required:true},{name:'phone',label:'Phone'},{name:'email',label:'Email',type:'email'},{name:'status',label:'Operational Status',required:true,options:['active','inactive']}]} defaults={{status:'active',unit:'ml',currentCost:'0',minStock:'0'}} save={branchApi.createBranch} onClose={() => setCreating(false)} onSuccess={fetchBranches} />}
      {/* Delete Branch Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteBranchItem}
        title="Delete Branch Outlet"
        message={`Are you sure you want to delete branch "${deleteBranchItem?.name}"?`}
        confirmText="Delete Branch"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteBranchItem(null)}
      />
    </div>
  );
};


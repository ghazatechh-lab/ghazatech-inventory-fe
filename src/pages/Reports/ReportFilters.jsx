import {useAuth} from '../../context/AuthContext';
import React, { useEffect, useState } from 'react';
import { branchApi } from '../../api/branchApi';
import { warehouseApi } from '../../api/warehouseApi';
import { DateInput, SelectInput } from '../../components/forms/FormControls';
import { Filter } from 'lucide-react';

export const ReportFilters = ({ filters, onFilterChange }) => {
  const {singleLocationMode}=useAuth();
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  useEffect(() => {
    branchApi.getBranches().then(({data}) => setBranches(data)).catch(() => {});
    warehouseApi.getWarehouses().then(({data}) => setWarehouses(data)).catch(() => {});
  }, []);
  return (
    <div className="erp-panel  p-4    mb-6 space-y-4">
      <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
        <Filter className="w-4 h-4 text-[var(--primary)]" />
        <span>Report Filters</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <DateInput
          label="From Date"
          value={filters.fromDate || ''}
          onChange={(e) => onFilterChange('fromDate', e.target.value)}
        />
        <DateInput
          label="To Date"
          value={filters.toDate || ''}
          onChange={(e) => onFilterChange('toDate', e.target.value)}
        />
        {!singleLocationMode&&<>
        <SelectInput
          label="Branch Outlet"
          value={filters.branch || 'All Branches'}
          onChange={(e) => onFilterChange('branch', e.target.value)}
          options={['All Branches', ...branches.map(x => x.name)]}
        />
        <SelectInput
          label="Warehouse"
          value={filters.warehouse || 'All Warehouses'}
          onChange={(e) => onFilterChange('warehouse', e.target.value)}
          options={['All Warehouses', ...warehouses.map(x => x.name)]}
        />        </>}
      </div>
    </div>
  );
};

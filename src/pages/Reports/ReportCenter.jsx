import React, { useState, useEffect } from 'react';
import { financeApi } from '../../api/financeApi';
import { PageHeader } from '../../components/common/PageHeader';
import { ReportFilters } from './ReportFilters';
import { formatCurrency } from '../../utils/formatters';
import {
  TrendingUp,
  Package,
  FlaskConical,
  DollarSign,
  PieChart
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#5118f5', '#287457', '#537a99', '#a67d50', '#9988ad'];

export const ReportCenter = () => {
  const [activeTab, setActiveTab] = useState('Sales');
  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().slice(0,7) + '-01',
    toDate: new Date().toISOString().slice(0,10),
    branch: 'All Branches',
    warehouse: 'All Warehouses',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true; setLoading(true); setError(false);
    financeApi.getReports(filters).then(({data}) => { if (live) setReport(data); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [filters]);
  if (loading) return <div className="p-6 text-center">Loading reports...</div>;
  if (error || !report) return <div className="p-6 text-center">Unable to load reports. Check your permissions and backend connection.</div>;
  const { salesSummary, productPerformanceData, salesTrendData, inventorySummary, inventoryStockData, inventoryPieData, productionSummary, productionBatchesData, profitabilitySummary, profitabilityMatrix } = report;
  const { grossRevenue, cogsTotal, grossProfitTotal, utilitiesExp, courierExp, rentExp, marketingExp, totalOperatingExpenses, netOperatingProfit } = report.profitLoss;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics Center"
        subtitle="Business intelligence, multi-dimensional sales, inventory valuation & P&L position"
      />

      <ReportFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Report Module Tabs */}
      <div className="erp-tabs mb-6" role="tablist" aria-label="Report categories">
        {[
          { id: 'Sales', label: 'Sales Report', icon: DollarSign },
          { id: 'Inventory', label: 'Inventory Report', icon: Package },
          { id: 'Production', label: 'Production Report', icon: FlaskConical },
          { id: 'Profitability', label: 'Profitability Analysis', icon: TrendingUp },
          { id: 'ProfitLoss', label: 'Profit & Loss Statement', icon: PieChart },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab" aria-selected={activeTab===tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-4 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)] font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SALES REPORT */}
      {activeTab === 'Sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="erp-panel  p-4   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Total Revenue</span>
              <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(salesSummary.totalRevenue)}</div>
            </div>
            <div className="erp-panel  p-4   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Units Sold</span>
              <div className="text-xl font-bold text-gray-900 mt-1">{salesSummary.unitsSold} pcs</div>
            </div>
            <div className="erp-panel  p-4   ">
              <span className="text-xs text-gray-500 font-bold uppercase">COGS</span>
              <div className="text-xl font-bold text-gray-700 mt-1">{formatCurrency(salesSummary.cogs)}</div>
            </div>
            <div className="erp-panel  p-4   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Gross Profit</span>
              <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(salesSummary.grossProfit)}</div>
            </div>
            <div className="erp-panel  p-4   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Gross Margin</span>
              <div className="text-xl font-bold text-[var(--primary)] mt-1">{salesSummary.grossMargin}</div>
            </div>
            <div className="erp-panel  p-4   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Avg Order Value</span>
              <div className="text-xl font-bold text-purple-700 mt-1">{formatCurrency(salesSummary.avgOrderValue)}</div>
            </div>
          </div>

          {/* Sales & Profit Trend Bar Chart */}
          <div className="erp-panel  p-6    space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Daily Sales & Gross Profit Trend</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales Revenue" fill="#5118f5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Gross Profit" fill="#15803D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Matrix Table */}
          <div className="erp-panel  p-6   ">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Product / Fragrance / Size Sales Matrix</h3>
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Variant</th>
                    <th className="p-3 text-center">Qty Sold</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">COGS</th>
                    <th className="p-3 text-right">Gross Profit</th>
                    <th className="p-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productPerformanceData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-bold text-[var(--primary)]">{row.sku}</td>
                      <td className="p-3 font-bold text-gray-900">{row.product}</td>
                      <td className="p-3 text-center font-bold">{row.qty} pcs</td>
                      <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(row.revenue)}</td>
                      <td className="p-3 text-right text-gray-600">{formatCurrency(row.cogs)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(row.grossProfit)}</td>
                      <td className="p-3 text-right font-bold text-[var(--primary)]">{row.margin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY REPORT */}
      {activeTab === 'Inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Raw Material Valuation</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(inventorySummary.rawMaterialsValue)}</div>
              <span className="text-xs text-gray-500">Oils, Solvents, Bottles & Pumps</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Finished Stock Valuation</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(inventorySummary.finishedGoodsValue)}</div>
              <span className="text-xs text-gray-500">Warehouse & Branch Bottled Stock</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Total Inventory Asset</span>
              <div className="text-2xl font-bold text-[var(--primary)] mt-1">{formatCurrency(inventorySummary.totalInventoryValue)}</div>
              <span className="text-xs text-[var(--primary)] font-bold">Authoritative Balance Asset</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Low Stock Threshold Alerts</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{inventorySummary.lowStockItemsCount} items</div>
              <span className="text-xs text-amber-700 font-semibold">Requires Restock Order</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="erp-panel lg:col-span-2  p-6   ">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Inventory Asset Valuation Table</h3>
              <div className="overflow-x-auto">
                <table className="erp-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                      <th className="p-2.5">Item Code</th>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Available Stock</th>
                      <th className="p-2.5 text-right">Unit Cost</th>
                      <th className="p-2.5 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventoryStockData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2.5 font-mono font-bold text-[var(--primary)]">{row.code}</td>
                        <td className="p-2.5 font-bold text-gray-900">{row.name}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            {row.type}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-600">{row.location}</td>
                        <td className="p-2.5 font-bold">{row.stock}</td>
                        <td className="p-2.5 text-right">{formatCurrency(row.unitCost)}</td>
                        <td className="p-2.5 text-right font-bold text-gray-900">{formatCurrency(row.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Distribution Pie Chart */}
            <div className="erp-panel  p-6    flex flex-col justify-between">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Asset Breakdown by Category</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={inventoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {inventoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-xs text-gray-600 border-t border-gray-200 pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] mr-2"></span>Perfume Oils:</span>
                  <span>{formatCurrency(inventoryPieData.filter(x => x.name === 'Perfume Oil').reduce((s,x) => s+x.value,0))}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#15803D] mr-2"></span>Solvents:</span>
                  <span>{formatCurrency(inventoryPieData.filter(x => x.name === 'Solvent').reduce((s,x) => s+x.value,0))}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] mr-2"></span>Glass & Pumps:</span>
                  <span>{formatCurrency(inventoryPieData.filter(x => ['Bottle','Pump'].includes(x.name)).reduce((s,x) => s+x.value,0))}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] mr-2"></span>Finished Bottles:</span>
                  <span>{formatCurrency(inventorySummary.finishedGoodsValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTION REPORT */}
      {activeTab === 'Production' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Batches Executed</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{productionSummary.batchesExecuted} batches</div>
              <span className="text-xs text-gray-500">Selected reporting period</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Finished Bottles Produced</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{productionSummary.finishedUnitsProduced} bottles</div>
              <span className="text-xs text-emerald-600 font-semibold">Passed QC Inspection</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Formulation Volume Mixed</span>
              <div className="text-2xl font-bold text-purple-700 mt-1">{productionSummary.formulationVolume}</div>
              <span className="text-xs text-purple-600">Oils & Solvents Blended</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Production Variance Rate</span>
              <div className="text-2xl font-bold text-[var(--primary)] mt-1">{productionSummary.varianceRate}</div>
              <span className="text-xs text-emerald-700 font-bold">Optimal Standard Alignment</span>
            </div>
          </div>

          <div className="erp-panel  p-6   ">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Batch Execution & Cost Variance Report</h3>
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="p-3">Batch No</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3 text-center">Planned Qty</th>
                    <th className="p-3 text-center">Actual Output</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Total Cost</th>
                    <th className="p-3">Consumption Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productionBatchesData.map((batch, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-bold text-[var(--primary)]">{batch.batchNo}</td>
                      <td className="p-3 font-bold text-gray-900">{batch.product}</td>
                      <td className="p-3 text-gray-600">{batch.warehouse}</td>
                      <td className="p-3 text-center font-bold">{batch.planned} pcs</td>
                      <td className="p-3 text-center font-bold text-emerald-700">{batch.actual} pcs</td>
                      <td className="p-3 text-right">{formatCurrency(batch.unitCost)}</td>
                      <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(batch.totalCost)}</td>
                      <td className="p-3 font-mono text-xs text-amber-800">{batch.variance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROFITABILITY ANALYSIS */}
      {activeTab === 'Profitability' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Overall Gross Margin</span>
              <div className="text-2xl font-bold text-[var(--primary)] mt-1">{profitabilitySummary.grossMargin}</div>
              <span className="text-xs text-gray-500">Retail Sales Average</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Net Operating Margin</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{profitabilitySummary.netProfitMargin}</div>
              <span className="text-xs text-emerald-600 font-semibold">After Operating Overheads</span>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Most Profitable Product</span>
              <div className="text-sm font-bold text-gray-900 mt-1">{profitabilitySummary.topProduct}</div>
            </div>
            <div className="erp-panel  p-5   ">
              <span className="text-xs text-gray-500 font-bold uppercase">Top Performing Channel</span>
              <div className="text-sm font-bold text-gray-900 mt-1">{profitabilitySummary.topChannel}</div>
            </div>
          </div>

          <div className="erp-panel  p-6   ">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Profitability Matrix by Fragrance Concentration Category</h3>
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="p-3">Concentration Category</th>
                    <th className="p-3 text-right">Avg Selling Price</th>
                    <th className="p-3 text-right">Avg Unit Cost</th>
                    <th className="p-3 text-right">Gross Profit / Unit</th>
                    <th className="p-3 text-right">Margin %</th>
                    <th className="p-3 text-right">Total Category Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {profitabilityMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{row.category}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(row.avgSellingPrice)}</td>
                      <td className="p-3 text-right text-gray-600">{formatCurrency(row.avgUnitCost)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(row.grossProfitPerUnit)}</td>
                      <td className="p-3 text-right font-bold text-[var(--primary)]">{row.margin}</td>
                      <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(row.categoryTotalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PROFIT & LOSS STATEMENT */}
      {activeTab === 'ProfitLoss' && (
        <div className="erp-panel max-w-2xl mx-auto  p-8   shadow-md">
          <div className="text-center border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-2xl font-bold font-sans text-[var(--ink)] uppercase">Statement of Profit & Loss</h2>
            <p className="text-xs text-[var(--primary)] font-bold uppercase tracking-wide mt-1">PerfumASol Financial Performance</p>
            <p className="text-xs text-gray-500 mt-1">Period: {filters.fromDate} to {filters.toDate}</p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-200 font-bold text-gray-900">
              <span>Gross Sales Revenue</span>
              <span>{formatCurrency(grossRevenue)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-200 text-rose-600 pl-4">
              <span>Less: Cost of Goods Sold (COGS)</span>
              <span>-{formatCurrency(cogsTotal)}</span>
            </div>

            <div className="flex justify-between py-3 border-y-2 border-gray-200 font-bold text-base text-gray-900 bg-amber-50/50 px-3 rounded-lg">
              <span>Gross Profit ({salesSummary.grossMargin})</span>
              <span className="text-[var(--primary)]">{formatCurrency(grossProfitTotal)}</span>
            </div>

            <div className="space-y-2 pl-4 text-xs text-gray-700 py-2 border-b border-gray-200">
              <p className="font-bold text-gray-900 text-sm">Less Operating Expenses:</p>
              <div className="flex justify-between">
                <span>Store Utilities & Electricity</span>
                <span className="text-rose-600">-{formatCurrency(utilitiesExp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Courier & Freight Logistics</span>
                <span className="text-rose-600">-{formatCurrency(courierExp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Boutique Rent & Maintenance</span>
                <span className="text-rose-600">-{formatCurrency(rentExp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Marketing & Promotion</span>
                <span className="text-rose-600">-{formatCurrency(marketingExp)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total Operating Expenses</span>
                <span className="text-rose-600">-{formatCurrency(totalOperatingExpenses)}</span>
              </div>
            </div>

            <div className="flex justify-between py-4 border-t-2 border-[var(--primary)] font-bold text-lg text-emerald-800 bg-emerald-50 px-4 rounded-xl border">
              <span>Net Operating Result (EBIT)</span>
              <span>{formatCurrency(netOperatingProfit)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

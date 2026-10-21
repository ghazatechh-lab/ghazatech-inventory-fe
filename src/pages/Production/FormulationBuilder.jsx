import { inventoryApi } from '../../api/inventoryApi';
import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SelectInput, CurrencyInput } from '../../components/forms/FormControls';
import { fragranceApi } from '../../api/fragranceApi';
import { formulationApi } from '../../api/formulationApi';
import { formatCurrency } from '../../utils/formatters';
import { Calculator, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export const FormulationBuilder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [fragrances, setFragrances] = useState([]);
  const [concentrations, setConcentrations] = useState([]);
  const [bottleSizes, setBottleSizes] = useState([]);
  const [recipeMeta,setRecipeMeta] = useState({version:'v1.0',status:'active',effectiveDate:new Date().toISOString().slice(0,10)});
  const [materialCatalog,setMaterialCatalog] = useState([]);
  const [customPackaging,setCustomPackaging] = useState(null);
  const [saving,setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Step 1 Selection Basis
  const [selectedFragranceId, setSelectedFragranceId] = useState('');
  const [selectedConcentrationId, setSelectedConcentrationId] = useState('');
  const [selectedBottleSizeId, setSelectedBottleSizeId] = useState('');

  // Cost overrides & labor/cleaning
  const [laborCost, setLaborCost] = useState(10.00);
  const [cleaningAllocation, setCleaningAllocation] = useState(2.50);
  const [otherCost, setOtherCost] = useState(3.00);

  useEffect(() => {
    loadMasters();
  }, [editId]);

  const loadMasters = async () => {
    try {
      setMaterialCatalog((await inventoryApi.getRawMaterials()).data);
      const [fRes, cRes, bRes, formulasRes] = await Promise.all([
        fragranceApi.getFragrances(),
        fragranceApi.getConcentrations(),
        fragranceApi.getBottleSizes(),
        editId ? formulationApi.getFormulas().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      const frags = fRes.data || [];
      const concs = cRes.data || [];
      const bottles = bRes.data || [];

      setFragrances(frags);
      setConcentrations(concs);
      setBottleSizes(bottles);

      if (editId && formulasRes.data) {
        const existing = formulasRes.data.find((f) => f.id === editId);
        if (existing) {
          setCustomPackaging(existing.packaging || []);
          setRecipeMeta({version:existing.version,status:existing.status,effectiveDate:existing.effectiveDate});
          setSelectedFragranceId(existing.fragranceId || (frags[0]?.id || ''));
          setSelectedConcentrationId(existing.concentrationId || (concs[0]?.id || ''));
          setSelectedBottleSizeId(existing.bottleSizeId || (bottles[0]?.id || ''));
          if (existing.laborCost !== undefined) setLaborCost(existing.laborCost);
          if (existing.cleaningAllocation !== undefined) setCleaningAllocation(existing.cleaningAllocation);
          if (existing.otherCost !== undefined) setOtherCost(existing.otherCost);
        }
      } else {
        if (frags.length) setSelectedFragranceId(frags[0].id);
        if (concs.length) setSelectedConcentrationId(concs[1]?.id || concs[0].id); // Default EDP
        if (bottles.length) setSelectedBottleSizeId(bottles[1]?.id || bottles[0].id); // Default 50ml
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load formulation masters');
    } finally {
      setLoading(false);
    }
  };

  const currentFragrance = fragrances.find((f) => f.id === selectedFragranceId);
  const currentConcentration = concentrations.find((c) => c.id === selectedConcentrationId);
  const currentBottleSize = bottleSizes.find((b) => b.id === selectedBottleSizeId);

  // Step 2 Calculation Preview
  const totalVolumeMl = currentBottleSize ? currentBottleSize.volumeMl : 50;
  const oilPercent = currentConcentration ? currentConcentration.oilPercentage : 20;

  const calculatedOilQty = (totalVolumeMl * oilPercent) / 100;
  const calculatedSolventQty = totalVolumeMl - calculatedOilQty;

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  useEffect(() => {
    let live = true; setPreviewLoading(true); setPreview(null);
    if (!selectedFragranceId || !selectedConcentrationId || !selectedBottleSizeId) return;
    formulationApi.previewFormula({fragranceId:selectedFragranceId, concentrationId:selectedConcentrationId, bottleSizeId:selectedBottleSizeId, laborCost:Number(laborCost), cleaningAllocation:Number(cleaningAllocation), otherCost:Number(otherCost), ...(customPackaging !== null ? {packaging:customPackaging} : {})})
      .then(({data}) => { if (live) setPreview(data); })
      .catch(() => { if (live) setPreview(null); })
      .finally(() => { if (live) setPreviewLoading(false); });
    return () => { live = false; };
  }, [selectedFragranceId, selectedConcentrationId, selectedBottleSizeId, laborCost, cleaningAllocation, otherCost, customPackaging]);
  const oilRate = preview?.ingredients?.[0]?.rate || 0;
  const solventRate = preview?.ingredients?.[1]?.rate || 0;
  const oilCost = preview?.ingredients?.[0]?.cost || 0;
  const solventCost = preview?.ingredients?.[1]?.cost || 0;
  const ingredientsTotalCost = oilCost + solventCost;
  const packagingItems = preview?.packaging || [];
  const packagingTotalCost = packagingItems.reduce((acc,item) => acc + item.cost, 0);
  const estimatedUnitCost = preview?.estimatedUnitCost || 0;

  const handleSaveFormula = async () => {
    if (!selectedFragranceId || !selectedBottleSizeId || !selectedConcentrationId) {
      toast.error('Please select Fragrance, Concentration, and Bottle Size.');
      return;
    }
    if (!preview || previewLoading) { toast.error('Wait for a successful formula preview.'); return; }
    if (saving) return; setSaving(true);
    try {
      const formData = {
        ...recipeMeta,
        fragranceId: selectedFragranceId,
        bottleSizeId: selectedBottleSizeId,
        concentrationId: selectedConcentrationId,
        oilQty: calculatedOilQty,
        solventQty: calculatedSolventQty,
        ingredients: [
          preview.ingredients[0],
          preview.ingredients[1],
        ],
        packaging: packagingItems,
        laborCost: Number(laborCost),
        cleaningAllocation: Number(cleaningAllocation),
        otherCost: Number(otherCost),
        estimatedUnitCost,
      };

      if (editId) {
        await formulationApi.updateFormula(editId, formData);
        toast.success('Formulation master updated successfully!');
      } else {
        await formulationApi.createFormula(formData);
        toast.success('Formulation saved successfully!');
      }
      navigate('/production/formulations');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || (editId ? 'Failed to update formulation' : 'Failed to save formulation'));
    } finally { setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading Formulation Builder...</div>;
  }

  return (
    <div>
      <PageHeader
        title={editId ? 'Edit Formulation Master Record' : 'Formulation Builder'}
        subtitle={
          editId
            ? 'Modify formula basis parameters, liquid proportions, and cost allocations'
            : 'Interactive formula composer, recipe preview & BOM cost engine'
        }
        secondaryActions={[
          <button
            key="back"
            onClick={() => navigate('/production/formulations')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Formulas</span>
          </button>,
        ]}
      />

      <section className="erp-panel  p-6  border mb-6 space-y-3">
        <div className="flex gap-3 flex-wrap"><label>Recipe Version<input className="border rounded-lg p-2 block" value={recipeMeta.version} onChange={e => setRecipeMeta({...recipeMeta,version:e.target.value})}/></label><label>Status<select className="border rounded-lg p-2 block" value={recipeMeta.status} onChange={e => setRecipeMeta({...recipeMeta,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label>Effective Date<input type="date" className="border rounded-lg p-2 block" value={recipeMeta.effectiveDate} onChange={e => setRecipeMeta({...recipeMeta,effectiveDate:e.target.value})}/></label></div>
        <h2 className="font-bold">Packaging Ingredients & Quantities</h2>
        <p className="text-xs text-gray-600">Oil and solvent quantities follow bottle volume and concentration. Add packaging materials and edit quantities per bottle here.</p>
        {packagingItems.map((item,index) => <div key={index} className="flex gap-2 items-center">
          <select aria-label={`Packaging material ${index+1}`} value={item.materialId} onChange={e => setCustomPackaging(packagingItems.map((row,i) => i === index ? {...row,materialId:e.target.value} : row))} className="border rounded-lg p-2 flex-1">{materialCatalog.filter(m => !['Perfume Oil','Solvent'].includes(m.category)).map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select>
          <input aria-label={`Packaging quantity ${index+1}`} type="number" min="0.0001" step="0.0001" value={item.qty} onChange={e => setCustomPackaging(packagingItems.map((row,i) => i === index ? {...row,qty:e.target.value} : row))} className="border rounded-lg p-2 w-24" />
          <button onClick={() => setCustomPackaging(packagingItems.filter((_,i) => i!==index))} className="text-rose-700">Remove</button>
        </div>)}
        <button onClick={() => { const material=materialCatalog.find(m => !['Perfume Oil','Solvent'].includes(m.category) && !packagingItems.some(p => p.materialId === m.id)); if(material) setCustomPackaging([...packagingItems,{materialId:material.id,qty:1,required:true}]); else toast.error('Add another packaging material first.'); }} className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg">Add Packaging Ingredient</button>
      </section>
      <div className="space-y-6">
        {/* Step 1: Select formula basis */}
        <div className="erp-panel  p-6   ">
          <div className="flex items-center space-x-2 text-sm font-bold text-gray-900 mb-4">
            <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs">1</span>
            <span>Step 1 - Select Formula Basis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectInput
              label="Fragrance Master"
              required
              value={selectedFragranceId}
              onChange={(e) => setSelectedFragranceId(e.target.value)}
              options={fragrances.map((f) => ({ value: f.id, label: `${f.name} (${f.code})` }))}
            />
            <SelectInput
              label="Concentration Master"
              required
              value={selectedConcentrationId}
              onChange={(e) => setSelectedConcentrationId(e.target.value)}
              options={concentrations.map((c) => ({ value: c.id, label: `${c.name} (${c.oilPercentage}% Oil)` }))}
            />
            <SelectInput
              label="Bottle Size Master"
              required
              value={selectedBottleSizeId}
              onChange={(e) => setSelectedBottleSizeId(e.target.value)}
              options={bottleSizes.map((b) => ({ value: b.id, label: `${b.name} (${b.volumeMl} ml)` }))}
            />
          </div>
        </div>

        {/* Step 2: Automatic formulation preview */}
        <div className="bg-amber-50/60 border border-amber-200 p-6 rounded-xl shadow-xs">
          <div className="flex items-center space-x-2 text-sm font-bold text-amber-950 mb-3">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            <span>Step 2 - Automatic Formulation Liquid Recipe Preview</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="erp-panel  p-4  border border-amber-200">
              <span className="text-xs text-gray-500 font-semibold uppercase">Perfume Oil Volume</span>
              <div className="text-xl font-bold text-[var(--primary)] mt-1">{calculatedOilQty} ml</div>
              <span className="text-xs text-gray-500">{oilPercent}% of {totalVolumeMl} ml</span>
            </div>
            <div className="erp-panel  p-4  border border-amber-200">
              <span className="text-xs text-gray-500 font-semibold uppercase">Perfume-Grade Solvent</span>
              <div className="text-xl font-bold text-gray-800 mt-1">{calculatedSolventQty} ml</div>
              <span className="text-xs text-gray-500">{100 - oilPercent}% of {totalVolumeMl} ml</span>
            </div>
            <div className="erp-panel  p-4  border border-amber-200">
              <span className="text-xs text-gray-500 font-semibold uppercase">Finished Liquid Volume</span>
              <div className="text-xl font-bold text-emerald-700 mt-1">{totalVolumeMl} ml</div>
              <span className="text-xs text-emerald-600 font-bold">100% Volume Yield</span>
            </div>
          </div>
        </div>

        {/* Step 3: Ingredients */}
        <div className="erp-panel  p-6   ">
          <div className="flex items-center space-x-2 text-sm font-bold text-gray-900 mb-4">
            <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs">3</span>
            <span>Step 3 - Ingredients Breakdown & Rates</span>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-y border-gray-200 uppercase">
                  <th className="p-3">Material</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3">Rate (₹)</th>
                  <th className="p-3 text-right">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-3 font-bold text-gray-900">{currentFragrance?.name || 'Fragrance Oil'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">Fragrance Oil</span></td>
                  <td className="p-3 font-bold">{calculatedOilQty}</td>
                  <td className="p-3 font-mono">ml</td>
                  <td className="p-3">₹{oilRate.toFixed(2)}</td>
                  <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(oilCost)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-gray-900">Perfume Grade Solvent 99.9%</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">Solvent</span></td>
                  <td className="p-3 font-bold">{calculatedSolventQty}</td>
                  <td className="p-3 font-mono">ml</td>
                  <td className="p-3">₹{solventRate.toFixed(2)}</td>
                  <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(solventCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 4: Packaging */}
        <div className="erp-panel  p-6   ">
          <div className="flex items-center space-x-2 text-sm font-bold text-gray-900 mb-4">
            <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs">4</span>
            <span>Step 4 - Packaging Components BOM</span>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-y border-gray-200 uppercase">
                  <th className="p-3">Component Material</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Rate (₹)</th>
                  <th className="p-3 text-right">Cost (₹)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packagingItems.map((pkg, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-bold text-gray-900">{pkg.name}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">{pkg.type}</span></td>
                    <td className="p-3 font-bold">{pkg.qty} pcs</td>
                    <td className="p-3">₹{pkg.rate.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(pkg.qty * pkg.rate)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${pkg.required ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                        {pkg.required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 5: Cost preview */}
        <div className="erp-panel  p-6  border border-[var(--primary)] shadow-md">
          <div className="flex items-center space-x-2 text-base font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">
            <Calculator className="w-5 h-5 text-[var(--primary)]" />
            <span>Step 5 - Comprehensive Unit Cost Preview</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-200">
                <span className="text-gray-600">Liquid Ingredients (Oil + Solvent):</span>
                <span className="font-bold text-gray-900">{formatCurrency(ingredientsTotalCost)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-200">
                <span className="text-gray-600">Packaging (Bottle + Pump + Cap + Label + Box):</span>
                <span className="font-bold text-gray-900">{formatCurrency(packagingTotalCost)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <CurrencyInput label="Labour / Assembly" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} />
                <CurrencyInput label="Cleaning Allocation" value={cleaningAllocation} onChange={(e) => setCleaningAllocation(e.target.value)} />
                <CurrencyInput label="Other Allocation" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} />
              </div>
            </div>

            <div className="bg-gradient-to-tr from-[var(--sidebar)] to-[#2a2a2a] text-white p-6 rounded-xl flex flex-col justify-between shadow-lg">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Authoritative Cost Engine</span>
                <p className="text-xs text-gray-300 mt-1">Calculated unit cost per bottle before batch overheads</p>
              </div>

              <div className="my-4">
                <span className="text-xs text-gray-500 uppercase">Estimated Unit Cost</span>
                <div className="text-4xl font-bold text-[var(--primary)] mt-1">{formatCurrency(estimatedUnitCost)}</div>
              </div>

              <button
                disabled={saving || previewLoading || !preview} onClick={handleSaveFormula}
                className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editId ? 'Save Changes & Update Formula' : 'Save Formulation Master Record'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

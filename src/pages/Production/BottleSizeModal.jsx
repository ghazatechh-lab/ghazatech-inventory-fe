import React, { useState, useEffect } from 'react';
import { TextInput, NumberInput, SelectInput } from '../../components/forms/FormControls';
import { fragranceApi } from '../../api/fragranceApi';
import { inventoryApi } from '../../api/inventoryApi';
import { X, Box, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const BottleSizeModal = ({ isOpen, bottleSize, onClose, onSuccess }) => {
  const isEdit = !!bottleSize;

  const [name, setName] = useState('');
  const [priceMultiplier,setMultiplier]=useState(''),[priceSurcharge,setSurcharge]=useState('0');
  const [volumeMl, setVolumeMl] = useState(50);
  const [bottleMaterialRef, setBottleMaterialRef] = useState('');
  const [pumpMaterialRef,setPumpMaterialRef]=useState('');
  const [capMaterialRef,setCapMaterialRef]=useState('');
  const [dipTubeMaterialRef,setDipTubeMaterialRef]=useState('');
  const [labelMaterialRef,setLabelMaterialRef]=useState('');
  const [customRef, setCustomRef] = useState('');
  const [useCustomRef, setUseCustomRef] = useState(false);
  const [status, setStatus] = useState('active');

  const [rawMaterials, setRawMaterials] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRawMaterials();
      setPumpMaterialRef(bottleSize?.pumpMaterialRef || '');
      setCapMaterialRef(bottleSize?.capMaterialRef || '');
      setDipTubeMaterialRef(bottleSize?.dipTubeMaterialRef || '');
      setLabelMaterialRef(bottleSize?.labelMaterialRef || '');setMultiplier(bottleSize?.priceMultiplier??'');setSurcharge(bottleSize?.priceSurcharge??'0');
      if (bottleSize) {
        setName(bottleSize.name || '');
        setVolumeMl(bottleSize.volumeMl || 50);
        setStatus(bottleSize.status || 'active');
        const ref = bottleSize.bottleMaterialRef || '';
        setBottleMaterialRef(ref);
        setCustomRef(ref);
      } else {
        setName('');
        setVolumeMl(50);
        setBottleMaterialRef('');
        setCustomRef('');
        setUseCustomRef(false);
        setStatus('active');
      }
    }
  }, [isOpen, bottleSize]);

  const loadRawMaterials = async () => {
    try {
      const res = await inventoryApi.getRawMaterials();
      const items = res.data || [];
      const bottleItems = items.filter(
        (m) => m.status === 'active' && m.categoryType === 'Packaging' && m.unit === 'pcs'
      );
      const list = bottleItems;
      setRawMaterials(list);
      if (list.length > 0 && !bottleSize?.bottleMaterialRef) {
        setBottleMaterialRef(list.find(m=>m.packagingType==='Bottle')?.id||'');
      }
    } catch (err) {
      console.error('Failed to fetch raw material bottles', err);
    }
  };

  const labelFor=m=>`${m.name} · INR ${Number(m.currentCost||0).toFixed(2)}/pcs · ${Number(m.availableStock||0)} pcs available`;
  const candidates=type=>rawMaterials.filter(m=>m.packagingType===type&&(!(m.compatibleBottleSizes||[]).length||(bottleSize&&m.compatibleBottleSizes.includes(bottleSize.id))));
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Bottle size name is required');
      return;
    }
    if (Number(volumeMl) <= 0) {
      toast.error('Volume (ml) must be greater than 0');
      return;
    }

    const material = useCustomRef ? rawMaterials.find(m => m.code === customRef.trim() || m.id === customRef.trim()) : rawMaterials.find(m => m.id === bottleMaterialRef);
    if (!material || material.packagingType!=='Bottle') { toast.error('Select a saved bottle material or enter its existing material code.'); return; }
    const finalMaterialRef = material.id;

    if(!capMaterialRef||!pumpMaterialRef||!labelMaterialRef){toast.error('Select a cap, pump and label for this bottle package.');return;}
    setSubmitting(true);
    try {
      const formData = {
        name: name.trim(),
        volumeMl: Number(volumeMl),
        priceMultiplier:priceMultiplier===''?null:Number(priceMultiplier),
        priceSurcharge:Number(priceSurcharge||0),
        bottleMaterialRef: finalMaterialRef,
        pumpMaterialRef:pumpMaterialRef || null,
        capMaterialRef:capMaterialRef || null,
        dipTubeMaterialRef:dipTubeMaterialRef || null,
        labelMaterialRef:labelMaterialRef || null,
        status,
      };

      if (isEdit) {
        await fragranceApi.updateBottleSize(bottleSize.id, formData);
        toast.success('Bottle size record updated successfully!');
      } else {
        await fragranceApi.createBottleSize(formData);
        toast.success('New bottle size added successfully!');
      }

      onSuccess();
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data || 'Failed to save bottle size'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-md w-full p-6  space-y-4 ">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Box className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">
              {isEdit ? 'Edit Bottle Size' : 'Add New Bottle Size'}
            </h3>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Size Name"
              placeholder="e.g. 50 ml or 30 ml Luxury"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <NumberInput
              label="Volume (ml)"
              placeholder="e.g. 50"
              value={volumeMl}
              onChange={(e) => setVolumeMl(e.target.value)}
              required
              min={1}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-gray-700">
                Bottle Material Reference
              </label>
              <button
                type="button"
                onClick={() => setUseCustomRef(!useCustomRef)}
                className="text-xs font-bold text-[var(--primary)] hover:underline"
              >
                {useCustomRef ? 'Select from inventory' : 'Enter custom code'}
              </button>
            </div>

            {useCustomRef ? (
              <TextInput
                placeholder="e.g. RM-BOTTLE-50 or Custom Ref"
                value={customRef}
                onChange={(e) => setCustomRef(e.target.value)}
                required
              />
            ) : (
              <SelectInput
                value={bottleMaterialRef}
                onChange={(e) => setBottleMaterialRef(e.target.value)}
                options={[{value:'',label:'Select Bottle material'},...candidates('Bottle').map((rm) => ({
                  label: labelFor(rm),
                  value: rm.id,
                }))]}
              />
            )}
          </div>

          {[["Pump / Atomizer",'Pump',pumpMaterialRef,setPumpMaterialRef],["Cap",'Cap',capMaterialRef,setCapMaterialRef],["Label",'Label',labelMaterialRef,setLabelMaterialRef],["Separate Dip Tube (optional)",'Dip Tube',dipTubeMaterialRef,setDipTubeMaterialRef]].map(([label,type,value,setValue])=><SelectInput key={label} label={label} required={type!=='Dip Tube'} value={value} onChange={e=>setValue(e.target.value)} options={[{value:'',label:type==='Dip Tube'?'Included in pump / no separate stock':`Select ${label}`},...candidates(type).map(m=>({value:m.id,label:labelFor(m)}))]}/>)}
          <p>One bottle, one pump, one cap and one label per perfume. Defaults are used automatically in product creation. Configure all four before creating products. Link a separate dip tube only if it is stocked separately; leave it blank if included with the pump.</p>
          <NumberInput label="Fragrance price multiplier (optional)" value={priceMultiplier} onChange={e=>setMultiplier(e.target.value)} min="0.0001" step="0.0001"/><NumberInput label="Size surcharge per bottle (INR)" value={priceSurcharge} onChange={e=>setSurcharge(e.target.value)} min="0" step="0.0001"/><p>Blank multiplier scales the highest fragrance price by volume / 100 ml. Set a multiplier to override size scaling. Final price = highest selected type price × multiplier + surcharge. Packaging costs enter COGS separately; configure a surcharge if needed.</p><p>Displayed availability is stock across your accessible locations. POS validates the exact selling branch. Materials must have the matching subtype in Raw Materials. Empty lists mean no active, compatible material of that subtype.</p><p>Packaging cost per bottle: INR {[bottleMaterialRef,capMaterialRef,pumpMaterialRef,labelMaterialRef,dipTubeMaterialRef].filter(Boolean).reduce((sum,id)=>sum+Number(rawMaterials.find(m=>m.id===id)?.currentCost||0),0).toFixed(2)}</p><SelectInput
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
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
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[#252525] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Bottle Size'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

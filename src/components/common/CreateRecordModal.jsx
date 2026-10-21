import {useAuth} from '../../context/AuthContext';
import {storeDefault} from '../../utils/storeDefaults';
import React, { useState,useEffect } from 'react';
import { toast } from 'sonner';
export const CreateRecordModal = ({ title, fields, defaults = {}, save, onClose, onSuccess }) => {
  const {storeSetup}=useAuth();const automaticLocations=Object.fromEntries(fields.filter(f=>f.options).map(f=>[f.name,storeDefault(`${f.name} ${f.label}`,f.options,storeSetup)]).filter(([,value])=>value!==undefined));const locationKey=JSON.stringify(automaticLocations);
  const auto=field=>['code','sku','billNumber','employeeCode','reference'].includes(field.name);
  const [values, setValues] = useState(defaults);
  useEffect(()=>{setValues(v=>({...v,...automaticLocations}));},[locationKey]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); if (saving) return; setSaving(true); setError('');
    try {
      const data = Object.fromEntries(Object.entries(values).filter(([k]) => fields.some(field => field.name === k)).map(([k,v]) => [k, typeof v === 'string' ? v.trim() : v]));
      const response=await save(Object.fromEntries(Object.entries(data).filter(([k])=>!fields.some(f=>f.name===k&&auto(f)))));const result=response?.data||response;toast.success(`${title} saved${result?.code?' · '+result.code:result?.reference?' · '+result.reference:''}`); onSuccess(); onClose();
    } catch (err) {
      const body = err.response?.data; const message = typeof body === 'string' ? body : body ? Object.entries(body).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`).join(' • ') : err.message || 'Unable to save. Check the backend connection.';
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };
  return <div className="erp-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
    <form onSubmit={submit} className="erp-dialog space-y-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {fields.filter(field => automaticLocations[field.name]===undefined&&(!field.visible || field.visible(values))).map(field => <label key={field.name} className="block text-xs font-semibold text-gray-700">{field.label}{field.required && !auto(field) && ' *'}
        {field.options ? <select multiple={field.multiple} required={field.required} value={values[field.name] ?? (field.multiple ? [] : '')} onChange={e => {const value=field.multiple ? Array.from(e.target.selectedOptions,o=>o.value) : e.target.value;setValues({...values,[field.name]:value,...(field.onChange?.(value,values)||{})})}} className="erp-input mt-2">{!field.multiple && <option value="">Select...</option>}{field.options.map(option => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select> : <input placeholder={auto(field)?'Auto-generated on Save':undefined} required={field.required&&!auto(field)} readOnly={field.readOnly||auto(field)} type={field.type || 'text'} min={field.min} step={field.step} maxLength={field.maxLength} value={values[field.name] ?? ''} onChange={e => setValues({...values,[field.name]:e.target.value,...(field.onChange?.(e.target.value,values)||{})})} className="erp-input mt-2"/>}
        {field.help && <span className="block font-normal text-gray-500 mt-1">{field.help}</span>}
      </label>)}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="erp-secondary">Cancel</button><button disabled={saving} className="erp-primary">{saving ? 'Saving...' : title}</button></div>
    </form>
  </div>;
};

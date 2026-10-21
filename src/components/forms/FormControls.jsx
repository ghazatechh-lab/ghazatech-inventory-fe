import {useAuth} from '../../context/AuthContext';
import {storeDefault} from '../../utils/storeDefaults';
import React,{useId,useState,useEffect} from 'react';
function Control({kind='input',label,error,required,className='',options=[],searchable,...props}){
 const {storeSetup}=useAuth();const selected=kind==='select'&&!props.multiple?storeDefault(label,options,storeSetup):undefined;
 useEffect(()=>{if(selected!==undefined&&String(props.value)!==String(selected))props.onChange?.({target:{value:selected}});},[selected,props.value]);
 const automatic=kind==='input'&&/^(?:.* Code|Code|SKU|Bill Number)$/i.test(label||'');
 if(automatic){required=false;props={...props,readOnly:true,placeholder:'Auto-generated on Save',onChange:undefined}}
 const uid=useId();const id=props.id||uid;const errorId=id+'-error';const [query,setQuery]=useState('');
 const searchableOptions=kind==='select'&&(searchable??options.length>15)&&!props.multiple;
 const visible=options.filter(o=>!query||String(typeof o==='object'?o.label:o).toLowerCase().includes(query.toLowerCase())||String(typeof o==='object'?o.value:o)===String(props.value));
 const shared={...props,id,required,'aria-invalid':!!error,'aria-describedby':error?errorId:props['aria-describedby'],className:`erp-input ${error?'!border-rose-500':''} ${className}`};
 if(selected!==undefined)return null;
 return <div className="erp-field">{label&&<label htmlFor={id} className="erp-field-label">{label} {required&&<span className="text-rose-600">*</span>}</label>}{searchableOptions&&<input type="search" className="erp-input mb-2" aria-label={`Search ${label||'options'}`} placeholder="Filter choices…" value={query} onChange={e=>setQuery(e.target.value)}/>}{kind==='select'?<select {...shared}>{visible.map((o,i)=><option key={i} value={typeof o==='object'?o.value:o}>{typeof o==='object'?o.label:o}</option>)}</select>:kind==='textarea'?<textarea rows={3} {...shared}/>:kind==='currency'?<div className="relative"><span className="absolute left-3 top-2.5 text-gray-500 text-sm" aria-hidden="true">₹</span><input type="number" step="0.01" {...shared} className={`${shared.className} !pl-8`}/></div>:<input {...shared}/ >}{error&&<p id={errorId} role="alert" className="erp-field-error">{error}</p>}</div>;
}
export const TextInput=props=><Control {...props}/>;
export const NumberInput=props=><Control type="number" {...props}/>;
export const CurrencyInput=props=><Control kind="currency" {...props}/>;
export const SelectInput=props=><Control kind="select" {...props}/>;
export const DateInput=props=><Control type="date" {...props}/>;
export const TextArea=props=><Control kind="textarea" {...props}/>;

export function storeDefault(label,options,setup){
 if(!setup?.singleLocationMode)return undefined;
 const text=String(label||'').toLowerCase();let ids=[];
 if(/(?:location|source|destination)\s*type/.test(text))ids=['Warehouse'];
 else if(text.includes('branch')&&!/location|warehouse/.test(text))ids=[setup.branchId,setup.branchName];
 else if(/warehouse|location/.test(text))ids=[setup.warehouseId,setup.warehouseName];
 else return undefined;
 return options.map(o=>typeof o==='object'?o.value:o).find(value=>ids.some(id=>id!=null&&String(value)===String(id)));
}

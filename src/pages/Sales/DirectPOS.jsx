import React,{useEffect,useRef,useState} from 'react';
import {apiClient as api,errorMessage} from '../../api/client';
import {useAuth} from '../../context/AuthContext';
import {RecipeEditor} from './ProductRecipe';
const money=n=>`INR ${Number(n||0).toFixed(2)}`;
export default function DirectPOS(){
 const {user,hasPermission,singleLocationMode,storeSetup}=useAuth();const [workspace,setWorkspace]=useState({branches:[]}),[branchId,setBranch]=useState(storeSetup?.branchId||user?.branchId||''),[physicalBranchId,setPhysical]=useState(''),[products,setProducts]=useState([]),[search,setSearch]=useState(''),[cart,setCart]=useState([]),[creating,setCreating]=useState(false),[customers,setCustomers]=useState([]),[customerId,setCustomer]=useState('cust-walkin'),[method,setMethod]=useState('Cash'),[cash,setCash]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[quote,setQuote]=useState(null),[receipt,setReceipt]=useState(null),[pending,setPending]=useState(null),[confirmSale,setConfirmSale]=useState(null);const lock=useRef(false);
 const storageKey=`blend_checkout_${user?.id}`;const branch=workspace.branches.find(b=>b.id===branchId);const physical=workspace.branches.filter(b=>branch?.physicalBranches?.includes(b.id)&&!b.isVirtual);const usable=!!branch&&(!branch.isVirtual||!!physicalBranchId);
 const reload=()=>usable&&api.get('/perfume-products/',{params:{branchId,physicalBranchId}}).then(r=>setProducts(r.data)).catch(e=>setError(errorMessage(e)));
 useEffect(()=>{api.get('/perfume-workspace/').then(r=>{setWorkspace(r.data);if(!branchId&&r.data.branches.length)setBranch(r.data.branches[0].id);}).catch(e=>setError(errorMessage(e)));api.get('/customers/').then(r=>setCustomers(r.data)).catch(()=>{});const saved=sessionStorage.getItem(storageKey);if(saved){try{setPending(JSON.parse(saved));}catch{sessionStorage.removeItem(storageKey);}}},[]);
 useEffect(()=>{setProducts([]);setQuote(null);reload();},[branchId,physicalBranchId,workspace.branches.length]);
 const changeBranch=(value)=>{if(cart.length&&!window.confirm('Clear the current cart and switch branch?'))return;setCart([]);setBranch(value);setPhysical('');};
 const add=p=>{setQuote(null);setCart(rows=>rows.some(r=>r.productId===p.id)?rows.map(r=>r.productId===p.id?{...r,qty:r.qty+1}:r):[...rows,{productId:p.id,recipeRevision:p.recipeRevision,pricingToken:p.pricingToken,qty:1,name:p.name,price:p.sellingPrice,volume:p.fillVolumeMl}]);};
 const total=cart.reduce((n,r)=>n+r.qty*Number(r.price),0);
 const done=i=>{setConfirmSale(null);setReceipt(i);setCart([]);setQuote(null);setPending(null);sessionStorage.removeItem(storageKey);reload();};
 const status=async()=>{setBusy(true);try{const r=await api.get('/perfume-status/',{params:{checkoutKey:pending.checkoutKey}});if(r.data.invoice)done(r.data.invoice);else setError('No posted invoice found. Retry the saved original payment request below; do not create a fresh checkout.');}catch(e){setError(errorMessage(e));}finally{setBusy(false);}};
 const post=async(payload)=>{const r=await api.post('/sales/pos/checkout/',payload);done(r.data.invoice);};
 const pay=async()=>{
  if(lock.current||confirmSale)return;
  lock.current=true;setBusy(true);setError('');
  try{
   if(pending){const state=await api.get('/perfume-status/',{params:{checkoutKey:pending.checkoutKey}});if(state.data.invoice)return done(state.data.invoice);return await post(pending);}
   const payload={branchId,physicalBranchId,cart:cart.map(({productId,recipeRevision,pricingToken,qty})=>({productId,recipeRevision,pricingToken,qty})),customerId,paymentMethod:method,discount:Number(discountAmount.toFixed(2)),checkoutKey:crypto.randomUUID(),tendered:Number(cash||payable)};
   const r=await api.post('/perfume-quote/',payload);
   setQuote(r.data);
   if(method==='Cash'&&Number(cash||payable)<Number(r.data.total))throw Error('Cash received is below the total.');
   setConfirmSale({payload,quote:r.data,branchName:branch.isVirtual?physical.find(b=>b.id===physicalBranchId)?.name:branch.name});
  }catch(e){setError(e.response||e.request?errorMessage(e):e.message);}
  finally{setBusy(false);lock.current=false;}
 };
 const confirmCheckout=async()=>{
  if(lock.current||!confirmSale)return;
  lock.current=true;setBusy(true);setError('');
  const payload=confirmSale.payload;
  try{
   // Store the original checkout key before sending payment, for safe retry after network failures.
   sessionStorage.setItem(storageKey,JSON.stringify(payload));setPending(payload);setConfirmSale(null);
   await post(payload);
  }catch(e){setError(e.response||e.request?errorMessage(e):e.message);
   if(e.response?.status>=400&&e.response?.status<500){
    try{const r=await api.get('/perfume-status/',{params:{checkoutKey:payload.checkoutKey}});if(r.data.invoice)done(r.data.invoice);else{setPending(null);sessionStorage.removeItem(storageKey);}}catch{/* Keep checkout key until status is known. */}
   }
  }finally{setBusy(false);lock.current=false;}
 };

 const visibleProducts=products.filter(p=>p.status==='active'&&`${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()));
 const [discountMode,setDiscountMode]=useState('amount');
 const [discountValue,setDiscountValue]=useState('');
 const discountAmount=Math.min(total,discountMode==='percent'?total*Math.min(100,Math.max(0,Number(discountValue)||0))/100:Math.max(0,Number(discountValue)||0));
 const payable=Math.max(0,total-discountAmount);
 const [gstRate,setGstRate]=useState(18);
 const [interState,setInterState]=useState(false);
 const taxable=payable/(1+gstRate/100);
 const includedTax=payable-taxable;
 const itemCount=cart.reduce((n,r)=>n+Number(r.qty||0),0);
 return <div className="space-y-5 pb-10">
  <style>{`@media print {body *{visibility:hidden!important} #aroma-thermal,#aroma-thermal *{visibility:visible!important} #aroma-thermal{position:absolute!important;top:0;left:0;width:72mm!important;max-width:72mm!important;padding:0!important;border:0!important;box-shadow:none!important;background:white!important;color:black!important} @page{size:80mm auto;margin:3mm}}`}</style>
  <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-6 text-white shadow-lg">
   <div className="flex flex-wrap items-center justify-between gap-4">
    <div><div className="text-xs uppercase tracking-[.2em] text-violet-200 font-bold">Aromartist · Retail Billing</div><h1 className="mt-1 text-2xl md:text-3xl font-black">Perfume POS</h1><p className="text-slate-300 text-sm mt-1">Blend to order · Stock-validated checkout · Quick billing</p></div>
    <div className="rounded-xl bg-white/10 px-5 py-3 text-right"><div className="text-xs text-slate-300">Current sale</div><div className="text-2xl font-extrabold">{money(payable)}</div><div className="text-xs text-slate-300">{itemCount} items</div></div>
   </div>
  </div>
  {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert">{error}</div>}
  {pending&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2"><strong>Checkout recovery required</strong><p className="text-sm">Controls are frozen until the original payment is resolved.</p><div className="flex gap-2 flex-wrap"><button className="erp-primary" disabled={busy} onClick={status}>Check original transaction status</button><button className="erp-primary" disabled={busy} onClick={pay}>Retry original request</button></div></div>}
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
   {!singleLocationMode&&<label className="flex-1 min-w-[200px] text-xs font-semibold text-slate-600">Selling branch<select className="erp-input mt-1" disabled={!!pending||busy} value={branchId} onChange={e=>changeBranch(e.target.value)}><option value="">Select branch</option>{workspace.branches.map(b=><option key={b.id} value={b.id}>{b.name}{b.isVirtual?' (virtual)':''}</option>)}</select></label>}
   {branch?.isVirtual&&<label className="flex-1 min-w-[200px] text-xs font-semibold text-slate-600">Physical selling branch<select className="erp-input mt-1" disabled={!!pending||busy} value={physicalBranchId} onChange={e=>{setCart([]);setPhysical(e.target.value);}}><option value="">Select physical branch</option>{physical.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
   <button className="rounded-xl bg-violet-700 hover:bg-violet-800 px-5 py-3 text-white font-bold text-sm disabled:opacity-50 shadow-sm" type="button" disabled={!usable||!!pending||busy} onClick={()=>setCreating(true)}>+ Create Product / Custom Perfume</button>
  </div>
  {creating&&<RecipeEditor key={creating?.id||'new'} initialValues={typeof creating==='object'?{...creating,id:undefined,name:`${creating.name} custom`}:undefined} branchId={branchId} physicalBranchId={physicalBranchId} onCancel={()=>setCreating(false)} onSaved={p=>{setCreating(false);setProducts(rows=>[p,...rows.filter(x=>x.id!==p.id)]);add(p);}}/>}
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
   <section className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="p-5 border-b border-slate-100"><div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-extrabold text-slate-900">Product catalogue</h2><p className="text-xs text-slate-500">Choose a perfume to add to the current bill</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{visibleProducts.length} products</span></div><input aria-label="Search products" className="erp-input w-full" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search perfume name or product code…"/></div>
    <div className="p-4 grid sm:grid-cols-2 2xl:grid-cols-3 gap-3 max-h-[660px] overflow-y-auto">
     {visibleProducts.length===0&&<p className="col-span-full py-16 text-center text-sm text-slate-500">No perfumes found. Create a custom perfume to begin.</p>}
     {visibleProducts.map(p=><article className="rounded-2xl border border-slate-200 p-4 bg-white hover:border-violet-300 hover:shadow-md transition-all flex flex-col gap-3" key={p.id}>
      <div className="flex justify-between gap-2"><div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-xl">✦</div><span className={`self-start text-[11px] font-bold px-2 py-1 rounded-full ${p.available>0?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{p.available} available</span></div>
      <div><h3 className="font-extrabold text-slate-900 text-base">{p.name}</h3><p className="text-xs text-slate-500 mt-1">{p.fillVolumeMl} ml · {p.pricing?.typeName||'Perfume'}</p><p className="text-xl font-black text-violet-800 mt-2">{money(p.sellingPrice)}</p></div>
      {p.pricingError&&<p role="alert" className="text-xs text-red-600">{p.pricingError}</p>}
      <p className="text-xs text-slate-500 line-clamp-2">{(p.recipe||[]).map(r=>`${r.name} ${r.percentage}%`).join(' + ')}</p>
      <div className="grid grid-cols-2 gap-2 mt-auto"><button className="rounded-xl bg-violet-700 text-white text-xs font-bold py-2.5 disabled:opacity-40 hover:bg-violet-800" disabled={!!pending||busy||p.available<1} onClick={()=>add(p)}>+ Add to bill</button><button className="rounded-xl border border-violet-200 bg-violet-50 text-violet-800 text-xs font-bold py-2.5 disabled:opacity-40" disabled={!!pending||busy} onClick={()=>setCreating(p)}>Customize</button></div>
     </article>)}
    </div>
   </section>
   <section className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden xl:sticky xl:top-4">
    <div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-slate-900">Current sale</h2><p className="text-xs text-slate-500">{itemCount} items · Live cart</p></div><span className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-bold">BILL</span></div>
    <div className="px-5 py-3 max-h-[340px] overflow-y-auto space-y-3">
     {!cart.length&&<div className="py-12 text-center"><div className="text-3xl mb-2">🛍️</div><p className="font-semibold text-slate-600">Your cart is empty</p><p className="text-xs text-slate-400 mt-1">Select perfumes from the catalogue</p></div>}
     {cart.map(r=><div key={r.productId} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <div className="flex justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{r.volume} ml · {money(r.price)} each</p></div><button className="text-rose-600 text-xs font-semibold" type="button" disabled={!!pending||busy} onClick={()=>{setQuote(null);setCart(rows=>rows.filter(x=>x.productId!==r.productId));}}>Remove</button></div>
      <div className="flex justify-between items-center mt-3"><div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden"><button className="px-3 py-1.5 font-bold disabled:opacity-30" disabled={!!pending||busy||r.qty<=1} onClick={()=>{setQuote(null);setCart(rows=>rows.map(x=>x.productId===r.productId?{...x,qty:x.qty-1}:x));}}>−</button><span className="min-w-8 text-center text-sm font-bold">{r.qty}</span><button className="px-3 py-1.5 font-bold" disabled={!!pending||busy} onClick={()=>{setQuote(null);setCart(rows=>rows.map(x=>x.productId===r.productId?{...x,qty:x.qty+1}:x));}}>+</button></div><strong className="text-sm">{money(r.qty*Number(r.price))}</strong></div>
     </div>)}
    </div>
    <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
     <label className="block text-xs font-bold text-slate-600">Customer<select className="erp-input mt-1 w-full" disabled={!!pending||busy} value={customerId} onChange={e=>setCustomer(e.target.value)}><option value="cust-walkin">Walk-in customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.mobile}</option>)}</select></label>
     <label className="block text-xs font-bold text-slate-600">Payment method<select className="erp-input mt-1 w-full" value={method} disabled={!!pending||busy} onChange={e=>setMethod(e.target.value)}>{['Cash','Card','UPI','Bank Transfer'].map(m=><option key={m}>{m}</option>)}</select></label>
     {method==='Cash'&&<label className="block text-xs font-bold text-slate-600">Cash received<input className="erp-input mt-1 w-full" type="number" min="0" step="0.01" disabled={!!pending||busy} value={cash} onChange={e=>setCash(e.target.value)} placeholder={String(payable.toFixed(2))}/></label>}
     <div className="rounded-xl border border-violet-100 bg-white p-3 space-y-3">
       <div className="text-xs font-bold text-slate-700">Order discount</div>
       <div className="flex gap-2"><select aria-label="Discount type" value={discountMode} disabled={!!pending||busy} onChange={e=>setDiscountMode(e.target.value)} className="erp-input w-28"><option value="amount">Amount ₹</option><option value="percent">Percent %</option></select><input aria-label="Discount value" type="number" min="0" max={discountMode==='percent'?100:undefined} step="0.01" value={discountValue} disabled={!!pending||busy} onChange={e=>setDiscountValue(e.target.value)} placeholder="0" className="erp-input flex-1 min-w-0"/></div>
       <div className="flex justify-between text-xs text-emerald-700"><span>Discount applied</span><strong>−{money(discountAmount)}</strong></div>
       <div className="border-t border-slate-100 pt-3 flex justify-between items-center gap-3"><label className="text-xs font-bold text-slate-700" htmlFor="perfume-gst">GST rate (inclusive preview)</label><select id="perfume-gst" className="erp-input w-28" value={gstRate} onChange={e=>setGstRate(Number(e.target.value))}>{[0,5,12,18,28].map(rate=><option key={rate} value={rate}>{rate}%</option>)}</select></div>
       <label className="flex gap-2 items-center text-xs text-slate-600"><input type="checkbox" checked={interState} onChange={e=>setInterState(e.target.checked)}/>Inter-state (IGST)</label>
       <div className="flex justify-between text-xs text-slate-600"><span>Taxable value (estimate)</span><span>{money(taxable)}</span></div>
       {interState?<div className="flex justify-between text-xs text-slate-600"><span>IGST included (estimate)</span><span>{money(includedTax)}</span></div>:<><div className="flex justify-between text-xs text-slate-600"><span>CGST included (estimate)</span><span>{money(includedTax/2)}</span></div><div className="flex justify-between text-xs text-slate-600"><span>SGST included (estimate)</span><span>{money(includedTax-includedTax/2)}</span></div></>}
       <p className="text-[11px] text-amber-700">GST figures are previews only: this checkout backend currently saves zero tax. Do not use these estimates as a tax invoice.</p>
     </div>
     <div className="border-t border-dashed border-slate-300 pt-4 space-y-2"><div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{money(total)}</span></div><p className="text-[11px] text-amber-700">The discount is sent to backend checkout for validation. GST is displayed as an estimate until backend tax posting is implemented.</p><div className="flex items-center justify-between pt-2"><strong className="text-base">Total payable</strong><strong className="text-2xl text-violet-800">{money(payable)}</strong></div>{method==='Cash'&&<p className="text-xs text-emerald-700">Estimated change: {money(Math.max(0,Number(cash||payable)-payable))}</p>}</div>
     <button className="w-full rounded-xl bg-violet-700 hover:bg-violet-800 py-3.5 text-white font-extrabold text-sm shadow-sm disabled:opacity-40" disabled={!!pending||busy||!usable||!cart.length||cart.some(r=>!Number.isInteger(r.qty)||r.qty<1)} onClick={pay}>{busy?'Processing…':'Validate Stock & Complete Sale →'}</button>
     {quote&&<div className="rounded-xl bg-white p-3 text-xs border border-slate-200"><h3 className="font-bold mb-2">Ingredient & packaging requirements</h3>{(quote.ingredients||[]).map(r=><p key={r.materialId}>{r.name}: {r.required} {r.unit} required / {r.available} available</p>)}</div>}
    </div>
   </section>
  </div>
  {receipt&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3 flex-wrap mb-4"><h2 className="font-extrabold text-lg text-emerald-700">✓ Sale completed · {receipt.invoiceNumber}</h2><button type="button" className="erp-primary" onClick={()=>window.print()}>Print thermal receipt</button></div><div id="aroma-thermal" className="mx-auto bg-white border border-dashed border-slate-300 px-4 py-5 text-black font-mono text-xs max-w-[320px]"><h3 className="text-center font-black text-lg">AROMARTIST</h3><p className="text-center">PERFUME COLLECTION</p><p className="text-center">SALES RECEIPT</p><div className="border-t border-dashed border-black my-3"/><p>Invoice: {receipt.invoiceNumber}</p><p>Branch: {receipt.branchName}</p><p>Customer: {receipt.customerName}</p><div className="border-t border-dashed border-black my-3"/>{(receipt.items||[]).map((r,i)=><div className="flex justify-between gap-3 my-2" key={r.id||i}><span>{r.productName} × {r.qty}</span><span>{money(r.total)}</span></div>)}<div className="border-t border-dashed border-black my-3"/><div className="space-y-1 text-xs">
  <div className="flex justify-between"><span>Subtotal</span><span>{money(receipt.subtotal ?? (Number(receipt.total||0)+Number(receipt.discount||0)-Number(receipt.taxTotal||0)))}</span></div>
  <div className="flex justify-between"><span>Discount</span><span>−{money(receipt.discount||0)}</span></div>
  <div className="flex justify-between"><span>GST recorded</span><span>{money(receipt.taxTotal||0)}</span></div>
  {Number(receipt.taxTotal||0)>0 && <div className="flex justify-between"><span>Taxable value</span><span>{money(Number(receipt.total||0)-Number(receipt.taxTotal||0))}</span></div>}
  {Number(receipt.taxTotal||0)===0 && <p className="text-[10px] mt-1">No GST posted on this invoice.</p>}
 </div><div className="border-t border-dashed border-black my-3"/>
 <div className="flex justify-between font-black text-base"><span>TOTAL</span><span>{money(receipt.total)}</span></div><p className="mt-2">Paid via {receipt.paymentMethod}</p><div className="border-t border-dashed border-black my-3"/><p className="text-center">THANK YOU · VISIT AGAIN</p><p className="text-center text-[10px] mt-2">Powered by Perfumosol</p></div><p className="text-center text-xs text-slate-500 mt-3">Invoice saved in Sales → Invoices. Ingredients were deducted once.</p></div>}

 {confirmSale&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirmSale(null);}}>
  <div role="dialog" aria-modal="true" aria-labelledby="confirm-perfume-sale-title" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
   <div className="bg-slate-900 px-6 py-5 text-white"><div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Perfumosol POS</div><h2 id="confirm-perfume-sale-title" className="mt-1 text-xl font-bold">Confirm payment</h2><p className="mt-1 text-sm text-slate-300">Review the sale before posting the invoice.</p></div>
   <div className="space-y-3 px-6 py-5 text-sm">
    <div className="flex justify-between gap-3"><span className="text-slate-500">Branch</span><strong className="text-right">{confirmSale.branchName}</strong></div>
    <div className="flex justify-between"><span className="text-slate-500">Items</span><strong>{itemCount}</strong></div>
    <div className="flex justify-between"><span className="text-slate-500">Payment method</span><strong>{confirmSale.payload.paymentMethod}</strong></div>
    <div className="border-t border-slate-200 pt-3 flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{money(total)}</strong></div>
    <div className="flex justify-between"><span className="text-slate-500">Discount</span><strong className="text-emerald-700">−{money(confirmSale.payload.discount)}</strong></div>
    <div className="flex justify-between"><span className="text-slate-500">GST (invoice-recorded)</span><strong>{money(confirmSale.quote.taxTotal||0)}</strong></div>
    <div className="rounded-xl bg-cyan-50 px-4 py-3 flex items-center justify-between"><span className="font-semibold text-slate-800">Amount to collect</span><strong className="text-xl text-slate-950">{money(confirmSale.quote.total)}</strong></div>
    <p className="text-xs text-slate-500">GST is shown from the server quote; a POS GST preview is not added to the invoice.</p>
   </div>
   <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4"><button type="button" disabled={busy} onClick={()=>setConfirmSale(null)} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100">Cancel</button><button type="button" disabled={busy} onClick={confirmCheckout} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy?'Processing…':'Confirm & post sale'}</button></div>
  </div>
 </div>}
 </div>;
}

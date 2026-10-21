import React, { useState, useEffect, useRef } from 'react';
import {LoadingSkeleton} from '../../components/common/StatCard';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { branchApi } from '../../api/branchApi';
import { productApi } from '../../api/productApi';
import { customerApi } from '../../api/customerApi';
import { salesApi } from '../../api/salesApi';
import { formatCurrency } from '../../utils/formatters';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Printer, User, UserPlus, CheckCircle2, Eye } from 'lucide-react';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { toast } from 'sonner';

export const POSView = () => {
  const { user } = useAuth();
  const checkoutAttempt = useRef(null);
  const checkoutBusy = useRef(false);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId || '');
  useEffect(() => { branchApi.getBranches().then(({data}) => { setBranches(data); if (!branchId && data.length) setBranchId(data[0].id); }).catch(() => {}); }, []);
  useEffect(() => { let live=true; setCart([]); setVariants([]); if (branchId) productApi.getVariants({branchId}).then(({data}) => {if(live) setVariants(data);}).catch(() => {}); return ()=>{live=false;}; }, [branchId]);
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState('All');
  const [selectedConcentration, setSelectedConcentration] = useState('All');

  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState({ id: 'cust-walkin', name: 'Walk-in Customer', mobile: '0000000000' });
  const [orderDiscount, setOrderDiscount] = useState(0);

  // Quick Customer Creation State
  const [isQuickCustOpen, setIsQuickCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');

  // Payment Modal & Completed Invoice State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sale Completed Notice Modal (Image Requirement)
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    loadPOSData();
  }, []);

  const loadPOSData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        branchId ? productApi.getVariants({branchId}) : Promise.resolve({data:[]}),
        customerApi.getCustomers(),
      ]);
      setVariants(vRes.data || []);
      setCustomers(cRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load POS terminal catalog');
    } finally {
      setLoading(false);
    }
  };

  const filteredVariants = variants.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      v.sku.toLowerCase().includes(q) ||
      v.productName.toLowerCase().includes(q) ||
      (v.barcode && v.barcode.includes(q)) ||
      (v.sizeName && v.sizeName.toLowerCase().includes(q));
    const matchSize = selectedSize === 'All' || v.sizeName === selectedSize;
    const matchConc = selectedConcentration === 'All' || v.concentrationName === selectedConcentration;
    return matchQuery && matchSize && matchConc;
  });

  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        toast.error(`Stock limit reached for ${product.sku} (${product.stock} available in branch)`);
        return;
      }
      setCart(cart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item)));
    } else {
      if (product.stock <= 0) {
        toast.error('Product is out of stock in this branch!');
        return;
      }
      setCart([...cart, { ...product, qty: 1, discount: 0 }]);
    }
  };

  const updateCartQty = (id, delta) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            if (nextQty > item.stock) {
              toast.error(`Stock limit reached for ${item.sku} (${item.stock} available)`);
              return item;
            }
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const updateCartLineDiscount = (id, val) => {
    setCart(
      cart.map((item) => (item.id === id ? { ...item, discount: Math.max(0, Number(val || 0)) } : item))
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // Line item total calculations
  const calculateLineTotal = (item) => Math.max(0, item.sellingPrice * item.qty - (item.discount || 0));
  const subtotal = cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const tax = 0;
  const grandTotal = Math.max(0, subtotal - Number(orderDiscount || 0) + tax);

  // Quick Customer Creation
  const handleCreateQuickCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustMobile.trim()) {
      toast.error('Customer name and mobile number are required');
      return;
    }

    try {
      const res = await customerApi.createCustomer({
        name: newCustName.trim(),
        mobile: newCustMobile.trim(),
        email: '',
      });

      const newCust = res.data;
      setCustomers([newCust, ...customers]);
      setSelectedCustomer(newCust);
      setIsQuickCustOpen(false);
      setNewCustName('');
      setNewCustMobile('');
      toast.success(`Customer ${newCust.name} added to checkout!`);
    } catch {
      toast.error('Failed to create quick customer');
    }
  };

  // Authoritative Checkout - Wait for Backend Confirmation before clearing cart
  const handleCompleteSale = async () => {
    if (checkoutBusy.current) return;
    checkoutBusy.current = true;
    const signature=JSON.stringify({branchId,customer:selectedCustomer.id,cart,orderDiscount,paymentMethod});
    if (checkoutAttempt.current?.signature !== signature) checkoutAttempt.current={signature,key:crypto.randomUUID()};
    setIsProcessing(true);
    try {
      const res = await salesApi.checkoutPOS({
        checkoutKey: checkoutAttempt.current.key,
        branchId,
        customerId: selectedCustomer.id,
        cart,
        subtotal,
        discount: Number(orderDiscount),
        tax,
        grandTotal,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        paymentMethod,
        salesperson: user?.name,
      });

      // ONLY clear cart and show completed notice after successful backend confirmation!
      const invoiceData = res.data.invoice;
      setCompletedInvoice(invoiceData);
      setIsCompletedModalOpen(true);
      setIsPaymentOpen(false);

      // Reset cart state after confirmed API response
      checkoutAttempt.current = null;
      setCart([]);
      setOrderDiscount(0);
      setCashReceived('');
      toast.success(`Sale transaction confirmed! Invoice: ${invoiceData.invoiceNumber}`);
      loadPOSData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete sale transaction');
    } finally {
      checkoutBusy.current = false;
      setIsProcessing(false);
    }
  };

  if(loading)return <LoadingSkeleton label="Loading point of sale"/>;
  return (
    <div className="min-h-[calc(100dvh-9rem)] flex flex-col space-y-4">
      <div className="mb-3"><label className="text-xs font-bold mr-2">Branch</label><select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-xs">{branches.filter(b => user?.permissions?.includes("*") || b.id === user?.branchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <PageHeader
        title="POS Checkout Terminal"
        subtitle="Fast two-column cashier terminal for retail perfume sales & stock deduction"
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        {/* LEFT COLUMN: Product Search & Filter Grid (7 cols) */}
        <div className="erp-panel lg:col-span-7 flex flex-col    p-4  overflow-hidden">
          {/* Search Bar & Size / Concentration Filters */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Product name, Fragrance, SKU or Barcode..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-medium"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Filters:</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-800"
              >
                <option value="All">All Sizes</option>
                <option value="30 ml">30 ml</option>
                <option value="50 ml">50 ml</option>
                <option value="100 ml">100 ml</option>
              </select>

              <select
                value={selectedConcentration}
                onChange={(e) => setSelectedConcentration(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-800"
              >
                <option value="All">All Concentrations</option>
                <option value="EDT">EDT</option>
                <option value="EDP">EDP</option>
                <option value="Parfum">Parfum</option>
                <option value="Extrait">Extrait</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-3 gap-3 pr-1">
            {filteredVariants.map((v) => (
              <div
                key={v.id}
                onClick={() => addToCart(v)}
                className="bg-gray-50/70 hover:bg-amber-50/60 border border-gray-200/80 hover:border-[var(--primary)] p-3 rounded-xl cursor-pointer transition-all flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <span className="text-xs font-mono font-bold text-[var(--primary)] uppercase block">{v.sku}</span>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-[var(--primary)] transition-colors">{v.productName}</h4>
                  <div className="flex items-center space-x-1 mt-1 text-xs">
                    <span className="font-semibold text-gray-700">{v.sizeName}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-purple-700 font-bold">{v.concentrationName}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 font-mono">{formatCurrency(v.sellingPrice)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${v.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {v.stock} in stock
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Cart & Checkout Summary (5 cols) */}
        <div className="erp-panel lg:col-span-5 flex flex-col    p-4  overflow-hidden">
          {/* Customer Selection & Quick Add */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 mb-3 text-xs">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-[var(--primary)]" />
              <div>
                <span className="text-xs font-bold text-gray-900 block">{selectedCustomer.name}</span>
                <span className="text-xs text-gray-500 font-mono">{selectedCustomer.mobile}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <select
                value={selectedCustomer.id}
                onChange={(e) => {
                  const found = customers.find((c) => c.id === e.target.value);
                  if (found) setSelectedCustomer(found);
                }}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsQuickCustOpen(true)}
                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 rounded-lg"
                title="Quick Add Customer"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cart Table List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs py-12">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-40" />
                <span>Cart is empty. Select products from left grid to add.</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-gray-900 block">{item.productName} ({item.sizeName} {item.concentrationName})</span>
                      <span className="text-gray-500 font-mono text-xs">{item.sku} • {formatCurrency(item.sellingPrice)}</span>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-rose-600 p-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-gray-500 font-semibold uppercase">Qty:</span>
                      <div className="flex items-center space-x-1 border border-gray-300 rounded-lg bg-white">
                        <button onClick={() => updateCartQty(item.id, -1)} className="p-1 text-gray-500 hover:text-gray-900">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs px-2">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} className="p-1 text-gray-500 hover:text-gray-900">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        placeholder="Disc (₹)"
                        value={item.discount || ''}
                        onChange={(e) => updateCartLineDiscount(item.id, e.target.value)}
                        className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-right text-xs font-bold"
                      />
                      <span className="font-bold text-gray-900 font-mono">{formatCurrency(calculateLineTotal(item))}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Total & Checkout Button */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-900 font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <span>Order Discount (₹):</span>
              <input
                type="number"
                value={orderDiscount}
                onChange={(e) => setOrderDiscount(e.target.value)}
                className="w-20 px-2 py-0.5 bg-white border border-gray-200 rounded text-right font-bold text-xs"
              />
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Grand Total:</span>
              <span className="text-[var(--primary)] text-xl font-mono">{formatCurrency(grandTotal)}</span>
            </div>

            <button
              onClick={() => {
                if (cart.length === 0) {
                  toast.error('Cart is empty!');
                  return;
                }
                setIsPaymentOpen(true);
              }}
              disabled={cart.length === 0}
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition-colors mt-2 flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4 text-white" />
              <span>Proceed to Payment ({formatCurrency(grandTotal)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {isQuickCustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-sm w-full p-5   space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">Quick Add Customer</h3>
              <button onClick={() => setIsQuickCustOpen(false)} className="text-gray-500 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Laila Mahmoud"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsQuickCustOpen(false)} className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-[var(--primary)] rounded-lg">Add & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Options Modal (Section 12 Specs) */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6   space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Checkout Payment Method</h3>
              <button onClick={() => setIsPaymentOpen(false)} className="text-gray-500 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-200">
                <span className="text-xs text-amber-800 uppercase font-bold">Total Amount Payable</span>
                <div className="text-3xl font-bold text-[var(--primary)] mt-1 font-mono">{formatCurrency(grandTotal)}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'Card', 'UPI', 'Bank', 'Credit'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        paymentMethod === m
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Cash' && (
                <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <label className="block text-xs font-bold text-gray-700">Cash Received from Customer</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={`e.g. ${grandTotal}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-lg font-mono"
                  />
                  {cashReceived && (
                    <div className="flex justify-between text-xs font-bold pt-1 text-emerald-700">
                      <span>Change to Return:</span>
                      <span className="font-mono text-sm">{formatCurrency(Math.max(0, Number(cashReceived) - grandTotal))}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCompleteSale}
                disabled={isProcessing}
                className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{isProcessing ? 'Saving sale...' : 'Confirm & Complete Sale'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALE COMPLETED NOTICE MODAL (Exact Image Requirement) */}
      {isCompletedModalOpen && completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="erp-panel   max-w-md w-full p-6   text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Sale Completed & Confirmed
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-2 font-mono">
                {completedInvoice.invoiceNumber}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Sale saved. Available stock and payment records have been updated.
              </p>
            </div>

            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-xs flex justify-between items-center font-bold">
              <span className="text-amber-950">Total Paid Amount:</span>
              <span className="text-lg text-[var(--primary)] font-mono">{formatCurrency(completedInvoice.total)}</span>
            </div>

            {/* Actions for Print Invoice, View Invoice and New Sale (Image Specs) */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsCompletedModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Print Invoice Receipt</span>
              </button>

              <button
                onClick={() => {
                  setIsCompletedModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-[var(--primary)] border border-amber-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>View Invoice Detail</span>
              </button>

              <button
                onClick={() => {
                  setIsCompletedModalOpen(false);
                  setCompletedInvoice(null);
                }}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl transition-colors"
              >
                Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {isPrintModalOpen && completedInvoice && (
        <InvoiceDetailModal
          isOpen={isPrintModalOpen}
          invoice={completedInvoice}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

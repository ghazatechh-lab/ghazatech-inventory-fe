import React,{useState,useCallback,Suspense} from 'react';
import {LoadingSkeleton} from '../common/StatCard';
import {Outlet,useLocation} from 'react-router-dom';
import {useAuth} from '../../context/AuthContext';
import {pageContext} from './navigation';
import {Sidebar} from './Sidebar';
import {Topbar} from './Topbar';
import {useDialogAccessibility} from '../../hooks/useDialogAccessibility';
export const DashboardLayout=()=>{
 const {hasPermission}=useAuth();const location=useLocation();const page=pageContext(location.pathname);let permission=page.permission;if(location.pathname.endsWith('/create')){const p={ '/inventory/products/create':['inventory.product.create'],'/transfers/create':['inventory.transfer.create','transfers.create'],'/purchases/orders/create':['purchases.order.create','purchases.view']};permission=p[location.pathname]||permission}if(location.pathname.match(/inventory\/products\/.+\/edit$/))permission=['inventory.product.edit'];const allowed=!permission||permission==='*'||(Array.isArray(permission)?permission.some(hasPermission):hasPermission(permission));
 const [open,setOpen]=useState(false);const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('perfumosol.nav.collapsed')==='true');
 const close=useCallback(()=>setOpen(false),[]);useDialogAccessibility();
 const toggle=()=>setCollapsed(c=>{localStorage.setItem('perfumosol.nav.collapsed',String(!c));return !c});
 return <div className={`erp-app ${collapsed?'is-collapsed':''}`}><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] erp-primary">Skip to content</a><Sidebar isOpen={open} onClose={close} collapsed={collapsed} onToggle={toggle}/><div className="erp-main"><Topbar onOpenSidebar={()=>setOpen(true)}/><main id="main-content" tabIndex={-1} className="erp-page"><Suspense fallback={<LoadingSkeleton label="Loading page"/>}>{allowed?<Outlet/>:<section className="erp-panel p-8"><h1>Access restricted</h1><p>Your role does not permit this page. Contact your administrator.</p></section>}</Suspense></main></div></div>;
};



import {
  Users,
  LayoutDashboard,
  Warehouse,
  Store,
  Boxes,
  ShoppingBag,
  FlaskConical,
  PackageCheck,
  ArrowRightLeft,
  ShoppingCart,
  Calculator,
  BarChart3,
  User,
  SlidersHorizontal,
  Building2,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  } from "lucide-react";


export const NAV_GROUPS = [
  {
    group: "Dashboard",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        permission: "*",
      },
    ],
  },
  {
    group: "Warehouses",
    items: [
      {
        label: "Warehouses",
        path: "/warehouses",
        icon: Warehouse,
        permission: "warehouse.view",
      },
    ],
  },
  {
    group: "Branches",
    items: [
      {
        label: "Branches",
        path: "/branches",
        icon: Store,
        permission: "branch.view",
      },
    ],
  },
  {
    group: "Inventory",
    items: [
      { label: "Categories", path: "/inventory/categories", icon: Boxes, permission: "inventory.view" },
      { label: "Raw Materials", path: "/inventory/raw-materials", icon: Boxes, permission: "inventory.view" },
      { label: "Fragrances", path: "/inventory/fragrances", icon: FlaskConical, permission: "inventory.view" },
      { label: "Bottle Setup", path: "/inventory/bottle-setup", icon: FlaskConical, permission: "production.view" },
      { label: "Products & Formulations", path: "/inventory/products", icon: PackageCheck, permission: "inventory.view" },
      { label: "Stock Overview", path: "/inventory/overview", icon: Boxes, permission: "inventory.view" },
      { label: "Stock Adjustments", path: "/inventory/adjustments", icon: SlidersHorizontal, permission: "inventory.adjust" },
      { label: "Stock Movements", path: "/inventory/movements", icon: Boxes, permission: "inventory.view" },
      { label: "Low Stock", path: "/inventory/low-stock", icon: Boxes, permission: "inventory.view" },
      { label: "Wastage", path: "/inventory/wastage", icon: Boxes, permission: "inventory.wastage" },
      { label: "Stock Transfers", path: "/transfers", icon: ArrowRightLeft, permission: "transfers.view" },

    ],
  },
  {
    group: "Purchases",
    items: [
      {
        label: "Suppliers",
        path: "/suppliers",
        icon: ShoppingBag,
        permission: "purchases.view",
      },
      {
        label: "Purchase Orders",
        path: "/purchases/orders",
        icon: ShoppingBag,
        permission: "purchases.view",
      },
      {
        label: "Goods Receipts (GRN)",
        path: "/purchases/grn",
        icon: ShoppingBag,
        permission: "purchases.grn",
      },
      {
        label: "Purchase Bills",
        path: "/purchases/bills",
        icon: ShoppingBag,
        permission: "purchases.view",
      },
      {
        label: "Purchase Returns",
        path: "/purchases/returns",
        icon: ShoppingBag,
        permission: "purchases.returns",
      },
    ],
  },
  {
    group: "Sales",
    items: [
      {
        label: "POS Terminal",
        path: "/sales/pos",
        icon: ShoppingCart,
        permission: "sales.pos",
      },
      {
        label: "Invoices",
        path: "/sales/invoices",
        icon: ShoppingCart,
        permission: "sales.view",
      },
      {
        label: "Customers",
        path: "/sales/customers",
        icon: ShoppingCart,
        permission: "customers.manage",
      },
    ],
  },
  {
    group: "Accounting",
    items: [
      {
        label: "Accounts Dashboard",
        path: "/accounts/dashboard",
        icon: Calculator,
        permission: "finance.view",
      },
      {
        label: "Cash & Bank",
        path: "/accounts/cash-bank",
        icon: Building2,
        permission: "finance.view",
      },
      {
        label: "Income",
        path: "/accounts/income",
        icon: TrendingUp,
        permission: "finance.view",
      },
      {
        label: "Expenses",
        path: "/accounts/expenses",
        icon: Receipt,
        permission: "finance.expenses",
      },
      {
        label: "Receivables",
        path: "/accounts/receivables",
        icon: ArrowDownLeft,
        permission: "finance.view",
      },
      {
        label: "Payables",
        path: "/accounts/payables",
        icon: ArrowUpRight,
        permission: "finance.view",
      },
    ],
  },
  {
    group: "Reports",
    items: [
      {
        label: "Reports & Analytics",
        path: "/reports",
        icon: BarChart3,
        permission: "reports.finance",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        label: "Profile",
        path: "/settings/profile",
        icon: User,
        permission: "*",
      },
    ],
  },
];

const administration={group:'Administration',items:[...NAV_GROUPS.find(g=>g.group==='Dashboard').items,...NAV_GROUPS.find(g=>g.group==='Warehouses').items,...NAV_GROUPS.find(g=>g.group==='Branches').items,...NAV_GROUPS.find(g=>g.group==='Settings').items]};
const routePermissions={
'/warehouses':['administration.warehouse.view','warehouse.view'], '/branches':['administration.branch.view','branch.view'],
'/inventory/categories':['inventory.category.view','inventory.view'],'/inventory/raw-materials':['inventory.raw_material.view','inventory.view'],'/inventory/fragrances':['inventory.fragrance.view','inventory.view'],'/inventory/formulations':['inventory.formulation.view','inventory.view'],'/inventory/products':['inventory.product.view','inventory.view'],'/inventory/bottle-setup':['inventory.bottle_setup.view','production.view'],'/inventory/overview':['inventory.stock.view','inventory.view'],'/inventory/movements':['inventory.movement.view','inventory.view'],'/inventory/adjustments':['inventory.adjustment.view','inventory.adjust'],'/inventory/wastage':['inventory.wastage.view','inventory.wastage'],'/inventory/low-stock':['inventory.stock.view','inventory.view'],'/transfers':['inventory.transfer.view','transfers.view'],
'/suppliers':['purchases.supplier.view','purchases.view'],'/purchases/orders':['purchases.order.view','purchases.view'],'/purchases/grn':['purchases.grn.view','purchases.grn'],'/purchases/bills':['purchases.bill.view','purchases.view','purchases.bills'],'/purchases/returns':['purchases.return.view','purchases.returns'],
'/sales/pos':['sales.invoice.checkout','sales.pos'],'/sales/invoices':['sales.invoice.view','sales.view'],'/sales/customers':['sales.customer.view','customers.manage'],
'/accounts/dashboard':['accounting.ledger.view','finance.view'],'/accounts/cash-bank':['accounting.ledger.view','finance.view'],'/accounts/income':['accounting.ledger.view','finance.view'],'/accounts/expenses':['accounting.expense.view','finance.view','finance.expenses'],'/accounts/receivables':['sales.invoice.view','finance.view'],'/accounts/payables':['purchases.bill.view','finance.view'],'/reports':['reports.view','reports.finance','reports.branch']};
for(const group of NAV_GROUPS)for(const item of group.items)if(routePermissions[item.path])item.permission=routePermissions[item.path];
for(const item of administration.items)if(routePermissions[item.path])item.permission=routePermissions[item.path];
const hrItems=[['employees','Employees',['employee','designation']],['attendance','Attendance',['attendance','shift','shift_assignment']],['leaves','Leave Management',['leave','leave_balance','leave_type']],['payroll','Payroll',['payroll','payroll_period','salary','salary_revision']],['salary-advances','Salary Advances',['advance']],['holidays','Holidays',['holiday']],['policy','HR Settings',['policy']]];
const hrGroup={group:'HRMS',items:hrItems.map(([section,label,resources])=>({label,path:`/hrms/${section}`,icon:Users,permission:resources.map(resource=>`hrms.${resource}.view`)}))};
administration.items.push({label:'Users',path:'/administration/users',icon:Users,permission:'access.users.manage'},{label:'Roles & Permissions',path:'/administration/roles',icon:SlidersHorizontal,permission:'access.roles.manage'},{label:'Permission Audit',path:'/administration/audit',icon:Receipt,permission:'access.audit.view'});
export const navigation=[administration,...NAV_GROUPS.filter(g=>!['Dashboard','Branches','Warehouses','Settings'].includes(g.group)).flatMap(g=>g.group==='Sales'?[g,hrGroup]:[g])];
export function flattenNavigation(groups=navigation){return groups.flatMap(g=>g.items.flatMap(function walk(item){return [{...item,group:g.group},...(item.children||[]).flatMap(walk)]}));}
export function visibleItem(item,hasPermission){return item.permission==='*'||(Array.isArray(item.permission)?item.permission.some(hasPermission):hasPermission(item.permission))||(item.children||[]).some(c=>visibleItem(c,hasPermission));}
export function pageContext(path){const matches=flattenNavigation().filter(i=>path===i.path||path.startsWith(i.path+'/'));return matches.sort((a,b)=>b.path.length-a.path.length)[0]||{label:'Workspace',group:'PerfumASol'};}

/**
 * Format currency values with Indian Rupee symbol ₹ and proper digit grouping
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format numbers with unit suffix (ml, pcs, bottles, etc.)
 */
export const formatNumber = (val, decimals = 0) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
};

/**
 * Format percentage values
 */
export const formatPercent = (val, decimals = 1) => {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  return `${Number(val).toFixed(decimals)}%`;
};

/**
 * Format ISO dates into human readable strings
 */
export const formatDate = (dateStr, includeTime = false) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return date.toLocaleDateString('en-IN', options);
};

/**
 * Status color mappings for unified StatusBadge component
 */
export const getStatusBadgeStyle = (status) => {
  const normalized = (status || '').toLowerCase().replace(/_/g, ' ');
  switch (normalized) {
    case 'active':
    case 'completed':
    case 'received':
    case 'approved':
    case 'paid':
    case 'available':
    case 'sellable':
    case 'optimal':
      return 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30';
    
    case 'in progress':
    case 'dispatched':
    case 'pending':
    case 'partial':
    case 'partially paid':
    case 'draft':
    case 'requested':
    case 'low stock':
    case 'overdue':
      return 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30';

    case 'inactive':
    case 'cancelled':
    case 'insufficient':
    case 'damaged':
    case 'quarantine':
    case 'unpaid':
    case 'out of stock':
    case 'high variance':
      return 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30';

    default:
      return 'bg-gray-100 text-[#141414] border-gray-200';
  }
};

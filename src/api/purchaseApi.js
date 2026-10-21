import { apiClient } from './client';

export const purchaseApi = {
  updatePurchaseOrder: (id,data) => apiClient.patch(`/purchases/orders/${id}/`, data),
  deletePurchaseOrder: (id) => apiClient.delete(`/purchases/orders/${id}/`),
  deleteGoodsReceipt: (id) => apiClient.delete(`/purchases/grn/${id}/`),
  deletePurchaseBill: (id) => apiClient.delete(`/purchases/bills/${id}/`),
  createPurchaseBill: (data) => apiClient.post('/purchases/bills/', data),
  recordSupplierPayment: (data) => apiClient.post('/purchases/payments/', data),
  deletePurchaseReturn: (id) => apiClient.delete(`/purchases/returns/${id}/`),
  updatePurchaseReturn: (id, data) => apiClient.patch(`/purchases/returns/${id}/`, data),
  getPurchaseOrders: (params = {}) => apiClient.get('/purchases/orders/', { params }),
  createPurchaseOrder: (data) => apiClient.post('/purchases/orders/', data),
  getGoodsReceipts: (params = {}) => apiClient.get('/purchases/grn/', { params }),
  createGoodsReceipt: (data) => apiClient.post('/purchases/grn/', data),
  getPurchaseBills: (params = {}) => apiClient.get('/purchases/bills/', { params }),
  getSupplierPayments: (params = {}) => apiClient.get('/purchases/payments/', { params }),
  getPurchaseReturns: (params = {}) => apiClient.get('/purchases/returns/', { params }),
  createPurchaseReturn: (data) => apiClient.post('/purchases/returns/', data),
};

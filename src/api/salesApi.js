import { apiClient } from './client';

export const salesApi = {
  deleteInvoice: (id) => apiClient.delete(`/sales/invoices/${id}/`),
  updateInvoice: (id, data) => apiClient.patch(`/sales/invoices/${id}/`, data),
  checkoutPOS: (posPayload) => apiClient.post('/sales/pos/checkout/', posPayload),
  getInvoices: (params = {}) => apiClient.get('/sales/invoices/', { params }),
  getInvoiceDetail: (id) => apiClient.get(`/sales/invoices/${id}/`),
  createReturn: (returnData) => apiClient.post('/sales/returns/', returnData),
  getReturns: (params = {}) => apiClient.get('/sales/returns/', { params }),
};

import { apiClient } from './client';

export const supplierApi = {
  deleteSupplier: (id) => apiClient.delete(`/suppliers/${id}/`),
  getSuppliers: (params = {}) => apiClient.get('/suppliers/', { params }),
  getSupplierDetail: (id) => apiClient.get(`/suppliers/${id}/`),
  createSupplier: (data) => apiClient.post('/suppliers/', data),
  updateSupplier: (id, data) => apiClient.patch(`/suppliers/${id}/`, data),
};

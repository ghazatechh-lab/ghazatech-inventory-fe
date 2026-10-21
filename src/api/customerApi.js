import { apiClient } from './client';

export const customerApi = {
  deleteCustomer: (id) => apiClient.delete(`/customers/${id}/`),
  getCustomers: (params = {}) => apiClient.get('/customers/', { params }),
  getCustomerDetail: (id) => apiClient.get(`/customers/${id}/`),
  createCustomer: (data) => apiClient.post('/customers/', data),
  updateCustomer: (id, data) => apiClient.patch(`/customers/${id}/`, data),
};

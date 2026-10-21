import { apiClient } from './client';

export const transferApi = {
  deleteTransfer: (id) => apiClient.delete(`/transfers/${id}/`),
  getTransfers: (params = {}) => apiClient.get('/transfers/', { params }),
  getTransferDetail: (id) => apiClient.get(`/transfers/${id}/`),
  updateTransfer: (id,data) => apiClient.patch(`/transfers/${id}/`,data),
  createTransfer: (data) => apiClient.post('/transfers/', data),
  approveTransfer: (id) => apiClient.post(`/transfers/${id}/approve/`),
  dispatchTransfer: (id) => apiClient.post(`/transfers/${id}/dispatch/`),
  receiveTransfer: (id, data = {}) => apiClient.post(`/transfers/${id}/receive/`, data),
  cancelTransfer: (id) => apiClient.post(`/transfers/${id}/cancel/`),
};

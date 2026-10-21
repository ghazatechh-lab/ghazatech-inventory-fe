import { apiClient } from './client';

export const warehouseApi = {
  deleteWarehouse: (id) => apiClient.delete(`/warehouses/${id}/`),
  getWarehouses: () => apiClient.get('/warehouses/'),
  getWarehouseDetail: (id) => apiClient.get(`/warehouses/${id}/`),
  getWarehouseStock: (id) => apiClient.get(`/warehouses/${id}/stock/`),
  createWarehouse: (data) => apiClient.post('/warehouses/', data),
  updateWarehouse: (id, data) => apiClient.patch(`/warehouses/${id}/`, data),
};

import { apiClient } from './client';

export const inventoryApi = {
  deleteRawMaterial: (id) => apiClient.delete(`/inventory/raw-materials/${id}/`),
  deleteWastage: (id) => apiClient.delete(`/inventory/wastage/${id}/`),
  updateWastage: (id, data) => apiClient.patch(`/inventory/wastage/${id}/`, data),
  getRawMaterials: (params = {}) => apiClient.get('/inventory/raw-materials/', { params }),
  createRawMaterial: (data) => apiClient.post('/inventory/raw-materials/', data),
  updateRawMaterial: (id, data) => apiClient.patch(`/inventory/raw-materials/${id}/`, data),
  getCurrentQuantity: (id, locationId) => apiClient.get(`/inventory/raw-materials/${id}/current-quantity/`, { params: { locationId } }),
  setCurrentQuantity: (id, data) => apiClient.post(`/inventory/raw-materials/${id}/current-quantity/`, data),
  getStockOverview: (params = {}) => apiClient.get('/inventory/stock-overview/', { params }),
  getMovements: (params = {}) => apiClient.get('/inventory/movements/', { params }),
  adjustStock: (data) => apiClient.post('/inventory/adjustments/', data),
  getWastage: (params = {}) => apiClient.get('/inventory/wastage/', { params }),
  createWastage: (data) => apiClient.post('/inventory/wastage/', data),
  getLowStock: () => apiClient.get('/inventory/low-stock/'),
};

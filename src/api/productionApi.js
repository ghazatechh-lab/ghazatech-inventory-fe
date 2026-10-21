import { apiClient } from './client';

export const productionApi = {
  deleteBatch: (id) => apiClient.delete(`/production/batches/${id}/`),
  getBatches: (params = {}) => apiClient.get('/production/batches/', { params }),
  getBatchDetail: (id) => apiClient.get(`/production/batches/${id}/`),
  createBatch: (data) => apiClient.post('/production/batches/', data),
  updateBatch: (id, data) => apiClient.patch(`/production/batches/${id}/`, data),
  checkMaterialAvailability: (variantId, quantity, warehouseId) =>
    apiClient.post('/production/check-availability/', { variantId, quantity, warehouseId }),
  completeBatch: (batchId, completionData) =>
    apiClient.post(`/production/batches/${batchId}/complete/`, completionData),
  recordWastage: (batchId, wastageData) =>
    apiClient.post(`/production/batches/${batchId}/wastage/`, wastageData),
};

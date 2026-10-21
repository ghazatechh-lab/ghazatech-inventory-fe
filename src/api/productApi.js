import { apiClient } from './client';

export const productApi = {
  deleteProduct: (id) => apiClient.delete(`/products/${id}/`),
  deleteVariant: (id) => apiClient.delete(`/products/variants/${id}/`),
  getProducts: (params = {}) => apiClient.get('/products/', { params }),
  createProduct: (data) => apiClient.post('/products/', data),
  updateProduct: (id, data) => apiClient.patch(`/products/${id}/`, data),
  getVariants: (params = {}) => apiClient.get('/products/variants/', { params }),
  createVariant: (data) => apiClient.post('/products/variants/', data),
  updateVariant: (id, data) => apiClient.patch(`/products/variants/${id}/`, data),
  getCostingBreakdown: (variantId) => apiClient.get(`/products/variants/${variantId}/costing/`),
};

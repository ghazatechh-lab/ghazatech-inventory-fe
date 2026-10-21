import { apiClient } from './client';

export const fragranceApi = {
  deleteFragrance: (id) => apiClient.delete(`/fragrances/${id}/`),
  deleteConcentration: (id) => apiClient.delete(`/concentrations/${id}/`),
  deleteBottleSize: (id) => apiClient.delete(`/bottle-sizes/${id}/`),
  getFragrances: () => apiClient.get('/fragrances/'),
  getConcentrations: () => apiClient.get('/concentrations/'),
  getBottleSizes: () => apiClient.get('/bottle-sizes/'),
  createFragrance: (data) => apiClient.post('/fragrances/', data),
  updateFragrance: (id, data) => apiClient.patch(`/fragrances/${id}/`, data),
  createConcentration: (data) => apiClient.post('/concentrations/', data),
  updateConcentration: (id, data) => apiClient.patch(`/concentrations/${id}/`, data),
  createBottleSize: (data) => apiClient.post('/bottle-sizes/', data),
  updateBottleSize: (id, data) => apiClient.patch(`/bottle-sizes/${id}/`, data),
};

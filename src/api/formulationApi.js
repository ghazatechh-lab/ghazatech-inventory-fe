import { apiClient } from './client';

export const formulationApi = {
  deleteFormula: (id) => apiClient.delete(`/formulas/${id}/`),
  getFormulas: (params = {}) => apiClient.get('/formulas/', { params }),
  getFormulaDetail: (id) => apiClient.get(`/formulas/${id}/`),
  createFormula: (data) => apiClient.post('/formulas/', data),
  updateFormula: (id, data) => apiClient.patch(`/formulas/${id}/`, data),
  previewFormula: (basis) => apiClient.post('/formulas/preview/', basis),
};

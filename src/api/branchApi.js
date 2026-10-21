import { apiClient } from './client';

export const branchApi = {
  deleteBranch: (id) => apiClient.delete(`/branches/${id}/`),
  getBranches: () => apiClient.get('/branches/'),
  getBranchDetail: (id) => apiClient.get(`/branches/${id}/`),
  getBranchStock: (id) => apiClient.get(`/branches/${id}/stock/`),
  createBranch: (data) => apiClient.post('/branches/', data),
  updateBranch: (id, data) => apiClient.patch(`/branches/${id}/`, data),
};

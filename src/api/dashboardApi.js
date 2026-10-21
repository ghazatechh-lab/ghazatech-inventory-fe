import { apiClient } from './client';

export const dashboardApi = {
  getSummary: (filters = {}) => apiClient.get('/dashboard/summary/', { params: filters }),
  getAlerts: () => apiClient.get('/dashboard/alerts/'),
};

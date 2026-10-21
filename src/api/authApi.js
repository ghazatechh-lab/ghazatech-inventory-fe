import { apiClient } from './client';

export const authApi = {
  updateProfile: (data) => apiClient.patch('/auth/profile/', data),
  changePassword: (data) => apiClient.post('/auth/password/change/', data),
  resetPassword: (data) => apiClient.post('/auth/password/reset/', data),
  confirmReset: (data) => apiClient.post('/auth/password/reset/confirm/', data),
  login: (credentials) => apiClient.post('/auth/login/', credentials),
  logout: () => apiClient.post('/auth/logout/'),
  getProfile: () => apiClient.get('/auth/profile/'),
  refreshUser: () => apiClient.get('/auth/me/'),
};

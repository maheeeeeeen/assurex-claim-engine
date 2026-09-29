/**
 * Products & Catalog API endpoints
 */

import api from './client';

export const productsAPI = {
  getProducts: (params = {}) => api.get('/api/products/', { params }),
  getProduct: (id) => api.get(`/api/products/${id}`),
  createProduct: (data) => api.post('/api/products/', data),
  updateProduct: (id, data) => api.put(`/api/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/api/products/${id}`),
};

export const warrantiesAPI = {
  getWarranties: (params = {}) => api.get('/api/warranties/', { params }),
  checkWarranty: (productId) => api.get(`/api/warranties/check/${productId}`),
};

export const policiesAPI = {
  getPolicies: () => api.get('/api/policies/'),
  getThresholds: () => api.get('/api/policies/thresholds'),
  updateThresholds: (data) => api.post('/api/policies/thresholds', data),
};

export const adminAPI = {
  getStatus: () => api.get('/api/admin/status'),
  seedDemo: () => api.post('/api/admin/seed'),
  getModelComparison: () => api.get('/api/admin/model-comparison'),
  getAnalytics: () => api.get('/api/admin/analytics'),
};

export const notificationsAPI = {
  getNotifications: () => api.get('/api/notifications'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.post('/api/notifications/mark-all-read'),
};

export default {
  products: productsAPI,
  warranties: warrantiesAPI,
  policies: policiesAPI,
  admin: adminAPI,
  notifications: notificationsAPI,
};

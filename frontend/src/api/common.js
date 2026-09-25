/**
 * Products & Catalog API endpoints
 */

import api from './client';

export const productsAPI = {
  getProducts: () => api.get('/api/products/'),
  getProduct: (id) => api.get(`/api/products/${id}`),
  createProduct: (data) => api.post('/api/products/', data),
};

export const warrantiesAPI = {
  getWarranties: () => api.get('/api/warranties/'),
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
};

export default {
  products: productsAPI,
  warranties: warrantiesAPI,
  policies: policiesAPI,
  admin: adminAPI,
};

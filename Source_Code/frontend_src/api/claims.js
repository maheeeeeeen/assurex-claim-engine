/**
 * Claims API endpoints — submit, list, search, detail, adjudicate, OCR
 */

import api from './client';

export const claimsAPI = {
  // Get paginated/filtered list of claims
  getClaims: (params = {}) => api.get('/api/claims/', { params }),

  // Get executive KPI stats
  getStats: () => api.get('/api/claims/stats/summary'),

  // Get full claim dossier with audit logs and dual-model probabilities
  getClaimDetail: (claimId) => api.get(`/api/claims/${claimId}`),

  // Submit new claim
  submitClaim: (data) => api.post('/api/claims/submit', data),

  // OCR document pre-parse
  processOCR: (formData) =>
    api.post('/api/claims/ocr-process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Upload evidence media (photo, video, barcode)
  uploadMedia: (formData) =>
    api.post('/api/claims/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Real-time cross-document serial & model verification
  crossVerify: (data) => api.post('/api/claims/cross-verify', data),

  // Semantic duplicate claim detection check
  checkDuplicate: (data) => api.post('/api/claims/check-duplicate', data),

  // Adjuster decision on a claim
  adjudicateClaim: (claimId, payload) =>
    api.post(`/api/claims/${claimId}/adjudicate`, payload),
    
  // Update claim
  updateClaim: (claimId, data) => api.put(`/api/claims/${claimId}`, data),

  // Delete claim
  deleteClaim: (claimId) => api.delete(`/api/claims/${claimId}`),

  // Export CSV
  exportCSV: (params = {}) => api.get('/api/claims/export/csv', { params, responseType: 'blob' }),
  
  // Export HTML Dossier
  exportHTML: (claimId) => api.get(`/api/claims/${claimId}/export/html`, { responseType: 'blob' }),
};

export default claimsAPI;

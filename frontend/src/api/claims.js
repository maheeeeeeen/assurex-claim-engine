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

  // Adjuster decision on a claim
  adjudicateClaim: (claimId, payload) =>
    api.post(`/api/claims/${claimId}/adjudicate`, payload),
};

export default claimsAPI;

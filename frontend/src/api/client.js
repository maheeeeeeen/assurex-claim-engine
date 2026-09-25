/**
 * Axios API Client — Central HTTP layer for AssureX Claim Engine
 *
 * This module:
 * 1. Creates a single axios instance pointed at the FastAPI backend
 * 2. Attaches the JWT token from localStorage to every request via an interceptor
 * 3. Handles 401 responses by clearing the token and redirecting to login
 * 4. Exports the configured instance for use by all endpoint wrappers
 * 5. Uses VITE_API_URL env var in production, falls back to localhost:8000 in dev
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('assurex_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (unauthorized) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('assurex_token');
      localStorage.removeItem('assurex_user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

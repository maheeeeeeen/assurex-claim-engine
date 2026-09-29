/**
 * Auth API endpoints — login, register, profile
 *
 * Wraps all authentication-related HTTP calls.
 * Used by AuthContext to manage user sessions.
 */

import api from './client';

export const authAPI = {
  login: (identifier, password) =>
    api.post('/api/auth/login', { username: identifier, email: identifier, password }),

  register: (userData) =>
    api.post('/api/auth/register', userData),

  getProfile: () =>
    api.get('/api/auth/profile'),

  updateProfile: (data) =>
    api.put('/api/auth/profile', data),
};

export default authAPI;

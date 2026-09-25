/**
 * API endpoint index — re-exports all endpoint modules
 *
 * Import pattern: import { authAPI, productsAPI } from '../api';
 */

export { default as api } from './client';
export { authAPI } from './auth';

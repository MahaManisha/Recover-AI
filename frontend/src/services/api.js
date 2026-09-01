/**
 * RecoverAI Centralized Frontend API Service Layer
 */
import { ERROR_TYPES, formatErrorMessage } from '../utils/errors';

export const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_PREFIX = '/api';

// Token and Session LocalStorage Keys
const TOKEN_KEY = 'recoverai_access_token';
const USER_KEY = 'recoverai_user_profile';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Generic reusable API request function with Bearer token injection and error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${VITE_API_URL}${API_PREFIX}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const token = getToken();
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const status = response.status;
      const type = status >= 500 ? ERROR_TYPES.SERVER_ERROR : ERROR_TYPES.CLIENT_ERROR;

      const serverMessage = errorJson?.error?.message || errorJson?.detail || response.statusText;

      const errorObj = {
        status,
        type,
        code: errorJson?.error?.code || 'ERROR',
        message: serverMessage,
      };
      
      console.error(`[API ${status} Error] Request failed for ${endpoint}:`, serverMessage);
      throw errorObj;
    }

    return await response.json();
  } catch (error) {
    if (error.status !== undefined) {
      throw error;
    }

    // Network level error
    const networkError = {
      status: 0,
      type: ERROR_TYPES.NETWORK_ERROR,
      message: error.message || 'Network error occurred',
    };
    
    console.error(`[API Network Error] Request failed for ${endpoint}:`, error.message);
    throw networkError;
  }
}

/**
 * Health Check Service Call: GET /api/health
 */
export async function checkBackendHealth() {
  try {
    const data = await request('/health');
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: formatErrorMessage(error),
      technicalDetails: error.message,
    };
  }
}

/**
 * Auth Service Call: POST /api/auth/register
 */
export async function registerUser({ full_name, email, password, role }) {
  try {
    const user = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, password, role }),
    });
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || formatErrorMessage(error) 
    };
  }
}

/**
 * Auth Service Call: POST /api/auth/login
 */
export async function loginUser({ email, password }) {
  try {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.access_token && response.user) {
      setAuthSession(response.access_token, response.user);
    }
    
    return { success: true, data: response };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || formatErrorMessage(error) 
    };
  }
}

/**
 * Auth Service Call: GET /api/auth/me
 */
export async function getCurrentUser() {
  try {
    const user = await request('/auth/me');
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || formatErrorMessage(error) 
    };
  }
}

/**
 * Product Catalog Service Call: GET /api/merchant/products
 */
export async function fetchMerchantProducts(merchantId) {
  try {
    const query = merchantId ? `?merchantId=${encodeURIComponent(merchantId)}` : '';
    const products = await request(`/merchant/products${query}`);
    return { success: true, data: products };
  } catch (error) {
    return {
      success: false,
      error: error.message || formatErrorMessage(error),
      data: []
    };
  }
}

/**
 * Product Catalog Service Call: POST /api/merchant/products
 */
export async function createMerchantProduct(productData) {
  try {
    const createdProduct = await request('/merchant/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return { success: true, data: createdProduct };
  } catch (error) {
    return {
      success: false,
      error: error.message || formatErrorMessage(error)
    };
  }
}

export const fetchBackendHealth = checkBackendHealth;


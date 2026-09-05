/**
 * RecoverAI Centralized Frontend API Service Layer
 */
import { ERROR_TYPES, formatErrorMessage } from '../utils/errors.js';

export const VITE_API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:8000';
export const API_PREFIX = '/api';

// Token and Session LocalStorage Keys
const TOKEN_KEY = 'recoverai_access_token';
const USER_KEY = 'recoverai_user_profile';

export function getToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof localStorage === 'undefined') return null;
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

/**
 * M10.15 Proposal Authorization Call: POST /api/recovery/authorize-proposal
 */
export async function authorizeBackendProposal(authPayload) {
  try {
    const data = await request('/recovery/authorize-proposal', {
      method: 'POST',
      body: JSON.stringify(authPayload),
    });
    return { success: true, data };
  } catch (error) {
    console.error('[API] Failed to authorize proposal on backend:', error);
    return {
      success: false,
      error: error.message || formatErrorMessage(error)
    };
  }
}

/**
 * Recovery Event Service Call: POST /api/recovery/events
 */
export async function createBackendRecoveryEvent(eventData) {
  try {
    const data = await request('/recovery/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    return { success: true, data };
  } catch (error) {
    console.error('[API] Failed to persist recovery event in database:', error);
    return {
      success: false,
      error: error.message || formatErrorMessage(error)
    };
  }
}

/**
 * Recovery Event Service Call: GET /api/recovery/events
 */
export async function fetchBackendRecoveryEvents(merchantId) {
  try {
    const query = merchantId ? `?merchantId=${encodeURIComponent(merchantId)}` : '';
    const events = await request(`/recovery/events${query}`);
    return { success: true, data: events };
  } catch (error) {
    console.error('[API] Failed to fetch recovery events from database:', error);
    return {
      success: false,
      error: error.message || formatErrorMessage(error),
      data: []
    };
  }
}

/**
 * Recovery Event Service Call: PUT /api/recovery/events/{eventId}
 */
export async function updateBackendRecoveryEvent(eventId, updateData) {
  try {
    const data = await request(`/recovery/events/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return { success: true, data };
  } catch (error) {
    console.error('[API] Failed to update recovery event in database:', error);
    return {
      success: false,
      error: error.message || formatErrorMessage(error)
    };
  }
}

/**
 * Merchant Autonomy Config Call: GET /api/merchant/autonomy
 */
export async function fetchMerchantAutonomy(merchantId) {
  try {
    const query = merchantId ? `?merchantId=${encodeURIComponent(merchantId)}` : '';
    const config = await request(`/merchant/autonomy${query}`);
    return { success: true, data: config };
  } catch (error) {
    console.error('[API] Failed to fetch merchant autonomy config from database:', error);
    return {
      success: false,
      error: error.message || formatErrorMessage(error),
      data: { merchantId, autonomyEnabled: false } // Fail-safe default: DISABLED
    };
  }
}

/**
 * Merchant Autonomy Config Call: PUT /api/merchant/autonomy
 */
export async function updateMerchantAutonomy(merchantId, autonomyEnabled) {
  try {
    const config = await request('/merchant/autonomy', {
      method: 'PUT',
      body: JSON.stringify({ merchantId, autonomyEnabled }),
    });
    return { success: true, data: config };
  } catch (error) {
    console.error('[API] Failed to update merchant autonomy config in database:', error);
    return {
      success: false,
      error: error.message || formatErrorMessage(error)
    };
  }
}

export const fetchBackendHealth = checkBackendHealth;



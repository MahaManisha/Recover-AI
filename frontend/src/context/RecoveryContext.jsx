import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { INITIAL_MERCHANT_PRODUCTS, DEFAULT_DEMO_MERCHANT_ID } from '../data/demoProduct';
import { fetchMerchantProducts, createMerchantProduct } from '../services/api';

/**
 * Shared Recovery Context — RecoverAI Database Integrated Catalog
 * Authoritative merchant products are fetched from and persisted into the backend database.
 */

const STORAGE_KEY_ACTIVE_MERCHANT = 'recoverai_active_merchant_id';
const STORAGE_KEY_SELECTED_PRODUCT = 'recoverai_selected_product';
const STORAGE_KEY_ACTIVE_RECOVERY_SESSION = 'recoverai_active_recovery_session';
const STORAGE_KEY_RECOVERY_EVENTS = 'recoverai_recovery_events';

function loadPersistedActiveMerchantId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_MERCHANT);
    if (stored && typeof stored === 'string' && stored.trim() !== '') {
      return stored.trim();
    }
  } catch (err) {
    console.error('[RecoveryContext] Error loading active merchant ID:', err);
  }
  return DEFAULT_DEMO_MERCHANT_ID;
}

function loadPersistedSelectedProduct() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_SELECTED_PRODUCT);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && (parsed.id || parsed.productId)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[RecoveryContext] Error loading selected product:', err);
  }
  return null;
}

function loadPersistedActiveRecoverySession() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_ACTIVE_RECOVERY_SESSION);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[RecoveryContext] Error loading active recovery session:', err);
  }
  return null;
}

function loadPersistedRecoveryEvents() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_RECOVERY_EVENTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[RecoveryContext] Error loading recovery events:', err);
  }
  return [];
}

const RecoveryContext = createContext(null);

export function RecoveryProvider({ children }) {
  // Active recovery session for the current Customer opportunity
  const [activeRecoverySession, setActiveRecoverySessionState] = useState(() => loadPersistedActiveRecoverySession());

  // Array of runtime recovery activity records for Merchant activity log
  const [recoveryEvents, setRecoveryEvents] = useState(() => loadPersistedRecoveryEvents());

  // Array of runtime compliance audit entries
  const [auditLogs, setAuditLogs] = useState([]);

  // Array of database-backed merchant products
  const [merchantProducts, setMerchantProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Single source of truth for active demo merchant identity
  const [activeMerchantId, setActiveMerchantIdState] = useState(() => loadPersistedActiveMerchantId());

  // Currently selected product for customer purchase
  const [selectedProduct, setSelectedProductState] = useState(() => loadPersistedSelectedProduct());

  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    const result = await fetchMerchantProducts();
    if (result.success && Array.isArray(result.data)) {
      const normalized = result.data.map((p) => ({
        ...p,
        id: p.productId || p.id,
        productId: p.productId || p.id
      }));
      setMerchantProducts(normalized);
    } else {
      console.error('[RecoveryContext] Error loading products from database:', result.error);
      setProductsError(result.error || 'Unable to load merchant products from database.');
    }
    setProductsLoading(false);
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const setActiveMerchantId = useCallback((id) => {
    if (id === null || id === undefined || id === '') {
      setActiveMerchantIdState(null);
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_MERCHANT);
      } catch (err) {
        console.error('[RecoveryContext] Error removing active merchant ID:', err);
      }
    } else if (typeof id === 'string') {
      const trimmed = id.trim();
      setActiveMerchantIdState(trimmed);
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_MERCHANT, trimmed);
      } catch (err) {
        console.error('[RecoveryContext] Error persisting active merchant ID:', err);
      }
    }
  }, []);

  const setSelectedProduct = useCallback((product) => {
    setSelectedProductState(product);
    if (product) {
      try {
        sessionStorage.setItem(STORAGE_KEY_SELECTED_PRODUCT, JSON.stringify(product));
      } catch (err) {
        console.error('[RecoveryContext] Error persisting selected product:', err);
      }
    } else {
      try {
        sessionStorage.removeItem(STORAGE_KEY_SELECTED_PRODUCT);
      } catch (err) {
        console.error('[RecoveryContext] Error removing selected product:', err);
      }
    }
  }, []);

  const addMerchantProduct = useCallback(async (productData) => {
    if (!productData || typeof productData !== 'object') return null;
    const name = productData.name ? String(productData.name).trim() : '';
    const price = Number(productData.price);
    const currency = productData.currency ? String(productData.currency).trim() : 'INR';
    const targetMerchantId = productData.merchantId ? String(productData.merchantId).trim() : (activeMerchantId || DEFAULT_DEMO_MERCHANT_ID);

    if (!name || isNaN(price) || price <= 0 || !currency || !targetMerchantId) {
      return null;
    }

    const payload = {
      merchantId: targetMerchantId,
      name: name,
      price: price,
      currency: currency,
      category: productData.category ? String(productData.category).trim() : 'General / Digital Product',
      description: productData.description ? String(productData.description).trim() : '',
      active: productData.active !== undefined ? Boolean(productData.active) : true
    };

    // Update activeMerchantId to match the merchant creating the product
    setActiveMerchantId(targetMerchantId);

    // Call backend API to INSERT into database
    const result = await createMerchantProduct(payload);

    if (result.success && result.data) {
      const createdProduct = {
        ...result.data,
        id: result.data.productId || result.data.id,
        productId: result.data.productId || result.data.id
      };

      setMerchantProducts((prev) => {
        const id = createdProduct.productId || createdProduct.id;
        const existsIndex = prev.findIndex((p) => (p.id || p.productId) === id);
        if (existsIndex >= 0) {
          const updated = [...prev];
          updated[existsIndex] = createdProduct;
          return updated;
        }
        return [createdProduct, ...prev];
      });

      return createdProduct;
    }

    console.error('[RecoveryContext] Failed to persist merchant product in database:', result.error);
    return null;
  }, [activeMerchantId, setActiveMerchantId]);

  /**
   * Sets or updates the active recovery session.
   * Merges partial updates if a session already exists.
   */
  const setActiveRecoverySession = useCallback((sessionOrUpdater) => {
    setActiveRecoverySessionState((prevSession) => {
      console.log('[RecoveryContext] BEFORE UPDATE', {
        prevStatus: prevSession?.currentStatus,
        prevCustomer: prevSession?.customerId,
        prevOutcome: Boolean(prevSession?.recoveryOutcome)
      });

      const nextSession = typeof sessionOrUpdater === 'function' 
        ? sessionOrUpdater(prevSession) 
        : sessionOrUpdater;

      if (!nextSession) {
        console.log('[RecoveryContext] AFTER UPDATE -> NULL');
        try {
          sessionStorage.removeItem(STORAGE_KEY_ACTIVE_RECOVERY_SESSION);
        } catch (err) {
          console.error('[RecoveryContext] Error removing active recovery session:', err);
        }
        return null;
      }

      const updated = {
        ...nextSession,
        lastUpdated: new Date().toISOString()
      };

      console.log('[RecoveryContext] AFTER UPDATE', {
        status: updated.currentStatus,
        customer: updated.customerId,
        merchant: updated.merchantId,
        product: updated.productId,
        amount: updated.amount,
        failureCode: updated.failureCode,
        hasOutcome: Boolean(updated.recoveryOutcome),
        timestamp: updated.lastUpdated
      });

      try {
        sessionStorage.setItem(STORAGE_KEY_ACTIVE_RECOVERY_SESSION, JSON.stringify(updated));
      } catch (err) {
        console.error('[RecoveryContext] Error persisting active recovery session:', err);
      }

      return updated;
    });
  }, []);

  /**
   * Appends a runtime recovery event record to recoveryEvents.
   * Prevents duplicates by matching event/activity ID.
   */
  const appendRecoveryEvent = useCallback((eventRecord) => {
    if (!eventRecord || typeof eventRecord !== 'object') return;
    const eventId = eventRecord.activityId || eventRecord.recoveryId || eventRecord.id;

    setRecoveryEvents((prevEvents) => {
      const existingIndex = prevEvents.findIndex(
        (e) => (e.activityId || e.recoveryId || e.id) === eventId
      );

      let updated;
      if (existingIndex >= 0) {
        // Update existing event record
        updated = [...prevEvents];
        updated[existingIndex] = { ...updated[existingIndex], ...eventRecord };
      } else {
        // Prepend new runtime event (latest first)
        updated = [eventRecord, ...prevEvents];
      }

      try {
        sessionStorage.setItem(STORAGE_KEY_RECOVERY_EVENTS, JSON.stringify(updated));
      } catch (err) {
        console.error('[RecoveryContext] Error persisting recovery events:', err);
      }

      return updated;
    });
  }, []);

  /**
   * Appends a runtime audit log entry.
   * Deduplicates using entry.auditId to prevent duplicate entries from re-renders.
   */
  const appendAuditLog = useCallback((auditEntry) => {
    if (!auditEntry || typeof auditEntry !== 'object') return;
    const auditId = auditEntry.auditId;

    setAuditLogs((prevLogs) => {
      if (auditId && prevLogs.some((log) => log.auditId === auditId)) {
        return prevLogs; // Duplicate ignored
      }
      // Prepend new audit log (latest first)
      return [auditEntry, ...prevLogs];
    });
  }, []);

  /**
   * Clears active recovery session while retaining historical runtime events/audit logs.
   */
  const clearRecoverySession = useCallback(() => {
    setActiveRecoverySessionState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE_RECOVERY_SESSION);
    } catch (err) {
      console.error('[RecoveryContext] Error removing active recovery session:', err);
    }
  }, []);

  /**
   * Resets all runtime recovery state in React memory.
   */
  const resetRecoveryRuntime = useCallback(() => {
    setActiveRecoverySessionState(null);
    setRecoveryEvents([]);
    setAuditLogs([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE_RECOVERY_SESSION);
      sessionStorage.removeItem(STORAGE_KEY_RECOVERY_EVENTS);
    } catch (err) {
      console.error('[RecoveryContext] Error removing persisted recovery state:', err);
    }
    refreshProducts();
    setActiveMerchantId(DEFAULT_DEMO_MERCHANT_ID);
    setSelectedProductState(INITIAL_MERCHANT_PRODUCTS[0]);
  }, [refreshProducts, setActiveMerchantId]);

  return (
    <RecoveryContext.Provider
      value={{
        activeRecoverySession,
        recoveryEvents,
        auditLogs,
        merchantProducts,
        productsLoading,
        productsError,
        refreshProducts,
        activeMerchantId,
        setActiveMerchantId,
        selectedProduct,
        setSelectedProduct,
        addMerchantProduct,
        setActiveRecoverySession,
        appendRecoveryEvent,
        appendAuditLog,
        clearRecoverySession,
        resetRecoveryRuntime
      }}
    >
      {children}
    </RecoveryContext.Provider>
  );
}

export function useRecovery() {
  const context = useContext(RecoveryContext);
  if (!context) {
    throw new Error('useRecovery must be used within a RecoveryProvider');
  }
  return context;
}

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { Home } from '../pages/Home';
import { Customer } from '../pages/Customer';
import { Checkout } from '../pages/Checkout';
import { Payment } from '../pages/Payment';
import { Agent } from '../pages/Agent';
import { Merchant } from '../pages/Merchant';
import { AuditConsole } from '../pages/AuditConsole';
import { BenchmarkConsole } from '../pages/BenchmarkConsole';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { PublicRoute } from '../components/auth/PublicRoute';
import { checkBackendHealth } from '../services/api';

export function AppRoutes() {
  const [healthResult, setHealthResult] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const performHealthCheck = async () => {
    setLoadingHealth(true);
    const res = await checkBackendHealth();
    setHealthResult(res);
    setLoadingHealth(false);
  };

  useEffect(() => {
    performHealthCheck();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout healthResult={healthResult} loading={loadingHealth} />}>
          {/* Public Home Route */}
          <Route 
            path="/" 
            element={
              <Home 
                healthResult={healthResult} 
                loading={loadingHealth} 
                onRetry={performHealthCheck} 
              />
            } 
          />

          {/* Guest / Public Only Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />

          {/* Protected Customer Routes */}
          <Route 
            path="/customer" 
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <Customer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/checkout" 
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <Checkout />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/payment" 
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <Payment />
              </ProtectedRoute>
            } 
          />

          {/* Protected Merchant Route */}
          <Route 
            path="/merchant" 
            element={
              <ProtectedRoute requiredRole="MERCHANT">
                <Merchant />
              </ProtectedRoute>
            } 
          />

          {/* Protected Agent Route */}
          <Route 
            path="/agent" 
            element={
              <ProtectedRoute requiredRole="MERCHANT">
                <Agent />
              </ProtectedRoute>
            } 
          />

          {/* Protected Compliance Audit Route */}
          <Route 
            path="/audit" 
            element={
              <ProtectedRoute requiredRole="MERCHANT">
                <AuditConsole />
              </ProtectedRoute>
            } 
          />

          {/* Protected Batch Recovery Benchmark Route */}
          <Route 
            path="/benchmark" 
            element={
              <ProtectedRoute requiredRole="MERCHANT">
                <BenchmarkConsole />
              </ProtectedRoute>
            } 
          />

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

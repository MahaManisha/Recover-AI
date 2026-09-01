import React from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { RecoveryProvider } from './context/RecoveryContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RecoveryProvider>
          <AppRoutes />
        </RecoveryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

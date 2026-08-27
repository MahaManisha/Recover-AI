import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getStoredUser, setAuthSession, clearAuthSession, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      const storedToken = getToken();
      if (storedToken) {
        // Validate token with backend /api/auth/me
        const res = await getCurrentUser();
        if (isMounted) {
          if (res.success) {
            setUser(res.data);
            setAuthSession(storedToken, res.data);
          } else {
            // Token is invalid or expired
            clearAuthSession();
            setToken(null);
            setUser(null);
          }
        }
      } else {
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (newToken, newUser) => {
    setAuthSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(token && user);
  const role = user?.role ? user.role.toUpperCase() : null;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        role,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

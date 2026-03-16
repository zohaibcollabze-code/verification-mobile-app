import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getAccessToken } from '@/services/storage/secureStorage';
import { refreshAccessToken, isTokenExpiringSoon } from './tokenManager';
import { AppException } from '@/utils/exceptions';

interface AuthContextType {
  /** Returns a valid access token, refreshing if necessary */
  getValidAccessToken: () => Promise<string | null>;
  /** Force refresh of access token */
  refreshAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!isAuthenticated) return null;

      const token = await getAccessToken();
      if (!token) return null;

      // Check if token is expiring (5 min buffer)
      if (isTokenExpiringSoon(token, 5)) {
        if (__DEV__) console.log('[AuthContext] Token expiring soon, refreshing...');
        return await refreshAccessTokenInternal();
      }

      return token;
    } catch (error) {
      console.error('[AuthContext] getValidAccessToken failed:', error);
      return null;
    }
  }, [isAuthenticated]);

  const refreshAccessTokenInternal = useCallback(async (): Promise<string> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const newToken = await refreshAccessToken();
        return newToken;
      } catch (error) {
        if (__DEV__) console.warn('[AuthContext] Refresh failed:', error);
        throw error;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  const contextValue: AuthContextType = {
    getValidAccessToken,
    refreshAccessToken: refreshAccessTokenInternal,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

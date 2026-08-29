import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ConfirmationResult, RecaptchaVerifier, User } from 'firebase/auth';
import { firebaseConfigured } from '../firebase/firebase.js';
import {
  createPhoneVerifier,
  loginWithEmail,
  loginWithGoogle,
  logout,
  requestPhoneLogin,
  sendResetEmail,
  signupWithEmail,
  watchAuth,
} from './authService.js';

interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  configured: boolean;
  error: string;
  loginWithGoogle: () => Promise<User>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  signupWithEmail: (name: string, email: string, password: string) => Promise<User>;
  sendResetEmail: (email: string) => Promise<void>;
  requestPhoneLogin: (phone: string, containerId: string) => Promise<ConfirmationResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [splashReady, setSplashReady] = useState(false);
  const [error, setError] = useState('');
  const phoneVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    let unsubscribe = () => undefined;
    const initialize = async () => {
      try {
        unsubscribe = watchAuth((user) => {
          setCurrentUser(user);
          setAuthReady(true);
        }, (authError) => {
          console.error('[MediGuard auth] Firebase initialization failed:', {
            code: (authError as any)?.code,
            message: (authError as any)?.message,
          });
          setAuthReady(true);
        });
      } catch (authError) {
        console.error('[MediGuard auth] Firebase startup failed:', {
          code: (authError as any)?.code,
          message: (authError as any)?.message,
        });
        setAuthReady(true);
      }
    };
    void initialize();
    
    // Minimum splash duration and recovery timeout
    const minimumSplash = window.setTimeout(() => setSplashReady(true), 2200);
    const recoveryTimeout = window.setTimeout(() => {
      if (!authReady) {
        console.warn('[MediGuard auth] Firebase initialization timeout, proceeding anyway');
        setAuthReady(true);
      }
    }, 8000);
    
    return () => { 
      unsubscribe(); 
      window.clearTimeout(minimumSplash);
      window.clearTimeout(recoveryTimeout);
      phoneVerifier.current?.clear(); 
      phoneVerifier.current = null; 
    };
  }, []);

  const loading = !authReady || !splashReady;

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    loading,
    configured: firebaseConfigured,
    error,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    sendResetEmail,
    requestPhoneLogin: async (phone, containerId) => {
      if (!phoneVerifier.current) phoneVerifier.current = createPhoneVerifier(containerId);
      try {
        return await requestPhoneLogin(phone, phoneVerifier.current);
      } catch (error) {
        console.error('[MediGuard auth] Firebase phone sign-in failed:', { code: (error as any)?.code, message: (error as any)?.message });
        phoneVerifier.current?.clear();
        phoneVerifier.current = null;
        throw error;
      }
    },
    logout,
  }), [currentUser, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

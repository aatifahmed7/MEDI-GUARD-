import React from 'react';
import { useAuth } from './AuthProvider.js';
import { SplashScreen } from '../pages/SplashScreen.js';

export const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <SplashScreen />;
  return currentUser ? <>{children}</> : null;
};
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, GoogleAuthProvider, browserPopupRedirectResolver, browserSessionPersistence } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(config)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseConfigured = missingConfig.length === 0;

if (!firebaseConfigured && import.meta.env.DEV) {
  console.warn('[MediGuard] Firebase authentication is not initialized. Missing configuration entries:', missingConfig);
}
export const firebaseApp = firebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(config))
  : null;
export const firebaseAuth = firebaseApp ? (() => {
  try {
    return initializeAuth(firebaseApp, { persistence: browserSessionPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  } catch {
    return getAuth(firebaseApp);
  }
})() : null;
export const googleProvider = new GoogleAuthProvider();

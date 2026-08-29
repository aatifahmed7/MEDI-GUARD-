import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { firebaseAuth, firebaseConfigured, googleProvider } from '../firebase/firebase.js';

export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow popups and try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with another sign-in method. Use email sign-in for this address.',
    'auth/network-request-failed': 'Network connection failed. Check your connection and try again.',
    'auth/invalid-credential': 'That email or password is not correct.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/user-not-found': 'That account was not found.',
    'auth/wrong-password': 'That email or password is not correct.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Use a stronger password with at least 6 characters.',
    'auth/invalid-phone-number': 'Enter a valid phone number including its country code.',
    'auth/invalid-verification-code': 'Incorrect verification code.',
    'auth/code-expired': 'That verification code has expired. Request a new code.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again later.',
    'auth/unauthorized-domain': 'Sign-in is not available for this website yet. Please try again later.',
    'auth/operation-not-allowed': 'This sign-in method is temporarily unavailable. Please try another option.',
    'auth/configuration-not-found': 'Sign-in is temporarily unavailable. Please try again later.',
    'auth/missing-phone-number': 'Enter your phone number.',
    'auth/quota-exceeded': 'SMS verification quota has been reached.',
    'auth/captcha-check-failed': 'Verification check failed. Please try again.',
  };
  if (code === 'auth/unauthorized-domain' && import.meta.env.DEV) {
    console.warn('[MediGuard] Add this host to Firebase Authentication Authorized Domains:', window.location.hostname);
  }
  if (code === 'auth/operation-not-allowed' && import.meta.env.DEV) {
    console.warn('[MediGuard] Enable this provider in Firebase Authentication Sign-in method settings.');
  }
  return messages[code] || 'Authentication could not be completed. Please try again.';
}

function requireAuth() {
  if (!firebaseConfigured || !firebaseAuth) {
    const error = new Error('Firebase configuration is missing');
    Object.assign(error, { code: 'auth/configuration-not-found' });
    throw error;
  }
  return firebaseAuth;
}

export async function loginWithGoogle(): Promise<User> {
  console.info('[MediGuard auth] Google login handler entered');
  try {
    console.info('[MediGuard auth] signInWithPopup started');
    const result = await signInWithPopup(requireAuth(), googleProvider);
    console.info('[MediGuard auth] Firebase Google sign-in succeeded:', { uid: result.user.uid, email: result.user.email });
    try {
      await result.user.getIdToken();
      console.info('[MediGuard auth] Google getIdToken succeeded');
    } catch (error) {
      console.error('AUTH ERROR:', error);
      console.error('AUTH CODE:', (error as any)?.code);
      console.error('AUTH MESSAGE:', (error as any)?.message);
      throw error;
    }
    return result.user;
  } catch (error) {
    console.error('[MediGuard auth] Firebase Google sign-in failed:', { code: (error as any)?.code, message: (error as any)?.message });
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  console.info('[MediGuard auth] email login handler entered');
  try {
    console.info('[MediGuard auth] signInWithEmailAndPassword started');
    const result = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
    console.info('[MediGuard auth] Firebase email sign-in succeeded:', { uid: result.user.uid, email: result.user.email });
    try {
      await result.user.getIdToken();
      console.info('[MediGuard auth] email getIdToken succeeded');
    } catch (error) {
      console.error('AUTH ERROR:', error);
      console.error('AUTH CODE:', (error as any)?.code);
      console.error('AUTH MESSAGE:', (error as any)?.message);
      throw error;
    }
    return result.user;
  } catch (error) {
    console.error('[MediGuard auth] Firebase email sign-in failed:', { code: (error as any)?.code, message: (error as any)?.message });
    throw error;
  }
}

export async function signupWithEmail(fullName: string, email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  await updateProfile(result.user, { displayName: fullName.trim() });
  return result.user;
}

export async function sendResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(requireAuth(), email.trim());
}

export function createPhoneVerifier(containerId: string): RecaptchaVerifier {
  const auth = requireAuth();
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
}

export async function requestPhoneLogin(phone: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(requireAuth(), phone, verifier);
}

export async function finishRedirect(): Promise<User | null> {
  if (!firebaseConfigured || !firebaseAuth) return null;
  const result = await getRedirectResult(firebaseAuth);
  return result?.user || null;
}

export function watchAuth(callback: (user: User | null) => void, onError: (error: unknown) => void) {
  if (!firebaseAuth || !firebaseConfigured) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, callback, onError);
}

export function logout(): Promise<void> {
  return signOut(requireAuth());
}

export { firebaseConfigured };

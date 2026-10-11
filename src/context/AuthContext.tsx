'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  signUpWithEmail: async () => {},
  loginWithEmail: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
});

const googleProvider = new GoogleAuthProvider();

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/missing-password': 'Please enter your password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email sign-in is not enabled for this app yet.',
  'auth/password-does-not-meet-requirements': 'Password does not meet the requirements.',
};

/** Turns a Firebase auth error into a user-friendly message. */
export function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  return (code && AUTH_ERROR_MESSAGES[code]) || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Firebase mutates the User object in place (e.g. updateProfile), so bump
  // this to re-render consumers when profile fields change.
  const [, setProfileVersion] = useState(0);

  useEffect(() => {
    const auth = getClientAuth();
    // Complete redirect sign-in if returning from Google
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Redirect sign-in successful:', result.user.email);
        }
      })
      .catch((err) => {
        console.error('Redirect sign-in error:', err);
      });
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      // Try popup first, fall back to redirect
      await signInWithPopup(getClientAuth(), googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/unauthorized-domain'
      ) {
        // Popup failed — redirect instead
        await signInWithRedirect(getClientAuth(), googleProvider);
      } else {
        console.error('Google sign-in failed:', err);
      }
    }
  }, []);

  // Email/password methods throw on failure — use getAuthErrorMessage() to display.
  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(
      getClientAuth(),
      email.trim(),
      password,
    );
    await updateProfile(newUser, { displayName: name.trim() });
    setProfileVersion((v) => v + 1);
    // Non-blocking: account works without verification, but owner privileges require it
    sendEmailVerification(newUser).catch((err) => {
      console.error('Failed to send verification email:', err);
    });
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getClientAuth(), email.trim());
  }, []);

  const logout = useCallback(async () => {
    await signOut(getClientAuth());
  }, []);

  return (
    <AuthContext
      value={{ user, loading, loginWithGoogle, signUpWithEmail, loginWithEmail, resetPassword, logout }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

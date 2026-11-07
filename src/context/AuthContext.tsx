import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0);
export const firebaseApp = isConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

interface AuthContextValue {
  authUser: User | null;
  authLoading: boolean;
  isGoogleAuthConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(!!firebaseAuth);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthLoading(false);
      return;
    }
    return onAuthStateChanged(firebaseAuth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    }, () => {
      setAuthUser(null);
      setAuthLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    authUser,
    authLoading,
    isGoogleAuthConfigured: !!firebaseAuth,
    signInWithGoogle: async () => {
      if (!firebaseAuth) {
        throw new Error('Google sign-in is not configured yet. Add the Firebase web app settings to the Vercel environment variables.');
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(firebaseAuth, provider);
    },
    signOut: async () => {
      if (firebaseAuth) await firebaseSignOut(firebaseAuth);
    },
  }), [authUser, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
'use client';
import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
} from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useAuth as useFirebaseAuth } from '@/hooks/useAuth';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  user: any | null; // Keep user definition flexible for now
  userLevel: string | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(
  undefined
);

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebase().app;
}

export function useFirestore() {
  return useFirebase().firestore;
}

export function useAuth() {
  // Rename to avoid conflict with firebase/auth
  return useFirebase().auth;
}

export function useUser() {
  return useFirebase().user;
}

export function useUserLevel() {
  return useFirebase().userLevel;
}

interface FirebaseProviderProps {
  children: ReactNode;
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseProvider({
  children,
  app,
  auth,
  firestore,
}: FirebaseProviderProps) {
  const { user, userLevel, loading } = useFirebaseAuth(auth);

  const value = useMemo(
    () => ({ app, auth, firestore, user, userLevel, loading }),
    [app, auth, firestore, user, userLevel, loading]
  );

  return (
    <FirebaseContext.Provider value={value}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

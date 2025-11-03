// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore }from 'firebase/firestore';

import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const [services, setServices] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const firebaseServices = initializeFirebase();
      setServices(firebaseServices);
    }
  }, []);

  if (!services) {
    // You can return a loader here if you'd like
    return null;
  }

  return <FirebaseProvider {...services}>{children}</FirebaseProvider>;
}

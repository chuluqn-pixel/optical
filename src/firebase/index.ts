// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export function initializeFirebase() {
  const isConfigured = getApps().length > 0;
  const app = isConfigured
    ? getApps()[0]
    : initializeApp(firebaseConfig, 'firebase-studio-app');

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  return { app, auth, firestore };
}

export {
  FirebaseClientProvider,
} from '@/firebase/client-provider';

export {
  FirebaseProvider,
  useFirebase,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useUser,
  useUserLevel,
} from '@/firebase/provider';

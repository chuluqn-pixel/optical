// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const database = getFirestore(app);
const auth = getAuth(app);

export { app, database, auth };

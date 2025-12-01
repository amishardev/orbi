
'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAtFN5lbWyHK_A5vEz4118z-eFzLE7IIyU",
  authDomain: "econslayer.firebaseapp.com",
  projectId: "econslayer",
  storageBucket: "econslayer.appspot.com",
  messagingSenderId: "291042049448",
  appId: "1:291042049448:web:ff7328cfef45fb1199719d"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;


function initializeFirebase() {
  try {
    // Check if the default app is already initialized
    const apps = getApps();
    const defaultApp = apps.find(a => a.name === '[DEFAULT]');

    if (!defaultApp) {
      console.log('Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
    } else {
      console.log('Firebase app already initialized, getting existing app...');
      app = defaultApp;
    }

    // Initialize Authentication
    if (app) {
      auth = getAuth(app);
      console.log('Firebase Auth initialized');

      // Initialize Firestore
      db = getFirestore(app);
      console.log('Firestore initialized');

      // Initialize Functions
      if (typeof window !== 'undefined') {
        try {
          functions = getFunctions(app);
          console.log('Functions initialized');
        } catch (e) {
          console.warn('Functions initialization failed:', e);
        }
      }
    }

  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Don't throw error to avoid crashing the app during SSR
    // throw new Error('Failed to initialize Firebase');
  }
}

// Initialize Firebase immediately
initializeFirebase();

export { app, auth, db, functions };

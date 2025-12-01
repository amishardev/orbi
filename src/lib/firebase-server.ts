import 'server-only';
import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;

if (getApps().length === 0) {
  // Option 1: Standalone Private Key
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (privateKey) {
    try {
      if (!privateKey.trim().startsWith('-')) {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
      }
      app = initializeApp({
        credential: cert({
          projectId: 'econslayer',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@econslayer.iam.gserviceaccount.com',
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Error initializing with FIREBASE_PRIVATE_KEY:', error);
      throw error;
    }
  }
  // Option 2: Full JSON Blob
  else if (serviceAccountKey) {
    let keyToParse = serviceAccountKey;

    try {
      // Handle Base64 encoded JSON
      if (!keyToParse.trim().startsWith('{')) {
        try {
          const buffer = Buffer.from(keyToParse, 'base64');
          const decoded = buffer.toString('utf-8');
          if (decoded.trim().startsWith('{')) {
            keyToParse = decoded;
          }
        } catch (e) {
          // Ignore failure, try raw parse
        }
      }

      const serviceAccount = JSON.parse(keyToParse);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string or Base64 encoded JSON.');
    }
  } else {
    // No credentials - this will likely fail if used, but we let it pass for build if guarded
    // But firebase-server.ts seems to expect valid init. 
    // We'll try getApp() or throw if strictly required.
    // Given the context, let's try getApp() or just throw if we really need it.
    // The original code threw an error if key was missing.
    // But for build safety, maybe we shouldn't throw immediately?
    // Let's stick to original behavior: if no key, try getApp() or throw?
    // Original: if (!serviceAccountKey) throw Error.
    // We'll keep that strictness for now, assuming guards are in place elsewhere or this is runtime only.
    // Actually, for build safety, we should probably allow it to fail gracefully?
    // But this file exports `adminDb` immediately.
    // Let's throw if neither is present, as per original intent.
    throw new Error('No Firebase Admin credentials found (FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT).');
  }
} else {
  app = getApp();
}

export const adminDb: Firestore = getFirestore(app);
export const adminAuth: Auth = getAuth(app);

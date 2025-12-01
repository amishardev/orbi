import 'server-only';
import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;

if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in environment variables.');
  }

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
  app = getApp();
}

export const adminDb: Firestore = getFirestore(app);
export const adminAuth: Auth = getAuth(app);

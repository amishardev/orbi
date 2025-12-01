import "server-only";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function createFirebaseAdminApp() {
    if (getApps().length === 0) {
        // Option 1: Standalone Private Key (Most efficient for Netlify 4KB limit)
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            try {
                // Handle Base64 encoding
                if (!privateKey.trim().startsWith('-')) {
                    privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
                }

                const credential = cert({
                    projectId: 'econslayer',
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@econslayer.iam.gserviceaccount.com',
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                });

                console.log("[ADMIN SDK] Initializing with Private Key for project: econslayer");
                return initializeApp({
                    credential,
                    projectId: 'econslayer'
                });
            } catch (error) {
                console.error("[ADMIN SDK] Failed to parse FIREBASE_PRIVATE_KEY:", error);
            }
        }

        // Option 2: Full JSON Blob (Legacy/Local)
        let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;

        if (serviceAccountKey) {
            try {
                // Handle Base64 encoded JSON (common for Netlify/Vercel env vars)
                if (!serviceAccountKey.trim().startsWith('{')) {
                    try {
                        serviceAccountKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
                    } catch (e) {
                        console.warn("[ADMIN SDK] Failed to base64 decode key, attempting raw parse.");
                    }
                }

                const credential = cert(JSON.parse(serviceAccountKey));
                console.log("[ADMIN SDK] Initializing with Service Account JSON for project: econslayer");
                return initializeApp({
                    credential,
                    projectId: 'econslayer'
                });
            } catch (error) {
                console.error("[ADMIN SDK] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
                console.warn("[ADMIN SDK] Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string or Base64 encoded JSON.");
                return null;
            }
        } else {
            console.warn("[ADMIN SDK] No credentials found (FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT). Skipping Admin SDK initialization.");
            return null;
        }
    }

    try {
        return getApp();
    } catch (e) {
        return null;
    }
}

const app = createFirebaseAdminApp();
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

export { db, auth };

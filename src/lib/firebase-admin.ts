import "server-only";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function createFirebaseAdminApp() {
    if (getApps().length === 0) {
        let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccountKey) {
            try {
                // Handle Base64 encoded JSON (common for Netlify/Vercel env vars)
                if (!serviceAccountKey.trim().startsWith('{')) {
                    try {
                        const buffer = Buffer.from(serviceAccountKey, 'base64');
                        const decoded = buffer.toString('utf-8');
                        // Check if decoded string looks like JSON
                        if (decoded.trim().startsWith('{')) {
                            serviceAccountKey = decoded;
                        }
                    } catch (e) {
                        // If base64 decode fails, assume it's just a malformed string or raw key
                        console.warn("[ADMIN SDK] Failed to base64 decode key, attempting raw parse.");
                    }
                }

                const credential = cert(JSON.parse(serviceAccountKey));
                console.log("[ADMIN SDK] Initializing with Service Account for project: econslayer");
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
            console.warn("[ADMIN SDK] FIREBASE_SERVICE_ACCOUNT_KEY not found. Skipping Admin SDK initialization.");
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

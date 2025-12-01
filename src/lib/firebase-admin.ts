import "server-only";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function createFirebaseAdminApp() {
    if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccountKey) {
            try {
                // Handle both stringified JSON and base64 encoded JSON if needed, 
                // but usually it's just stringified JSON in env vars.
                // Also handle if it's already an object (unlikely in process.env but good for safety).
                const credential = cert(JSON.parse(serviceAccountKey));
                console.log("[ADMIN SDK] Initializing with Service Account for project: econslayer");
                return initializeApp({
                    credential,
                    projectId: 'econslayer'
                });
            } catch (error) {
                console.error("[ADMIN SDK] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
                return initializeApp({ projectId: 'econslayer' });
            }
        } else {
            console.warn("[ADMIN SDK] FIREBASE_SERVICE_ACCOUNT_KEY not found. Using default credentials for project: econslayer");
            return initializeApp({ projectId: 'econslayer' });
        }
    }
    return getApp();
}

const app = createFirebaseAdminApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

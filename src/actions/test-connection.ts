'use server';

import { db } from '@/lib/firebase-admin';

export async function testConnection() {
    try {
        console.log("Testing Admin SDK Connection...");

        // List collections to verify DB content
        const collections = await db.listCollections();
        const collectionNames = collections.map(col => col.id);
        console.log("[ADMIN DEBUG] Collections found:", collectionNames);

        const snapshot = await db.collection('users').limit(1).get();

        // Attempt to get Project ID from the app options if available
        // @ts-ignore
        const projectId = db.app.options.credential?.projectId || db.app.options.projectId || 'unknown';

        console.log(`[ADMIN DEBUG] Connected to Project: ${projectId}`);
        console.log(`[ADMIN DEBUG] Found Users: ${snapshot.size}`);

        return {
            success: true,
            userCount: snapshot.size,
            projectId: projectId,
            collections: collectionNames,
            message: `Connected to ${projectId}. Found collections: ${collectionNames.join(', ')}. Users: ${snapshot.size}`
        };
    } catch (error: any) {
        console.error("Admin SDK Connection Failed:", error);
        return {
            success: false,
            error: error.message,
            message: "Connection failed. Check server logs."
        };
    }
}

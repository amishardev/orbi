import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase-client';

export async function checkUsernameAvailability(username: string): Promise<boolean> {
    if (!username || username.length < 3) return false;

    // Check against reserved words if needed
    const reserved = ['admin', 'support', 'orbi', 'mod'];
    if (reserved.includes(username.toLowerCase())) return false;

    try {
        const usersRef = collection(db, 'users');
        // Query for case-insensitive uniqueness using username_lowercase field
        const q = query(usersRef, where('username_lowercase', '==', username.toLowerCase()), limit(1));
        const snapshot = await getDocs(q);
        return snapshot.empty;
    } catch (error) {
        console.error("Error checking username:", error);
        return false; // Fail safe
    }
}

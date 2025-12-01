import { db } from '@/lib/firebase-admin';

export async function isUserAdmin(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;

    try {
        const adminDoc = await db.collection('admins').doc(email).get();
        return adminDoc.exists;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

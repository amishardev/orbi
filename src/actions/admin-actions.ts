'use server';

import { auth, db } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

// Helper to serialize Firestore timestamps
const serializeData = (data: any) => {
    const serialized = { ...data };
    if (serialized.createdAt && typeof serialized.createdAt.toDate === 'function') {
        serialized.createdAt = serialized.createdAt.toDate();
    }
    if (serialized.lastSeen && typeof serialized.lastSeen.toDate === 'function') {
        serialized.lastSeen = serialized.lastSeen.toDate();
    }
    if (serialized.joinDate && typeof serialized.joinDate.toDate === 'function') {
        serialized.joinDate = serialized.joinDate.toDate();
    }
    return serialized;
};

export async function getAllUsers(limitCount: number = 50) {
    try {
        if (!db) {
            console.warn("[ADMIN ACTION] Admin SDK not initialized. Skipping user fetch.");
            return [];
        }
        console.log("[ADMIN ACTION] Fetching users (Debugging)...");
        // REMOVED orderBy to ensure we get results even if field is missing
        const snapshot = await db.collection('users').limit(limitCount).get();
        console.log(`[ADMIN ACTION] Fetched ${snapshot.size} users.`);

        if (!snapshot.empty) {
            console.log("[ADMIN ACTION] Sample Raw Data (First Doc):", JSON.stringify(snapshot.docs[0].data(), null, 2));
        }

        const users = snapshot.docs.map(doc => {
            const data = doc.data() || {}; // Safety check
            return {
                uid: doc.id,
                displayName: data.displayName || 'Unknown',
                email: data.email || 'No Email',
                photoURL: data.photoURL || '',
                isVerified: !!data.isVerified,
                isAgent: !!data.isAgent,
                isDisabled: !!data.isDisabled,
                // Handle missing createdAt safely
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                followersCount: data.followersCount || 0
            };
        });

        console.log(`[ADMIN ACTION] Serialized ${users.length} users.`);
        return users;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

export async function getAllPosts(limitCount: number = 50) {
    try {
        if (!db) {
            console.warn("[ADMIN ACTION] Admin SDK not initialized. Skipping posts fetch.");
            return [];
        }
        console.log("[ADMIN ACTION] Fetching posts...");
        const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(limitCount).get();
        console.log(`[ADMIN ACTION] Fetched ${snapshot.size} posts.`);

        if (snapshot.empty) return [];

        // 1. Extract unique author IDs
        const authorIds = Array.from(new Set(snapshot.docs.map(doc => doc.data().authorId).filter(Boolean)));

        // 2. Fetch user documents
        // Firestore 'in' query is limited to 30 items. If we have more, we might need to batch or use getAll.
        // For simplicity in this admin view, let's use getAll which is more robust for IDs.
        const userRefs = authorIds.map(id => db!.collection('users').doc(id));
        const userSnapshots = userRefs.length > 0 ? await db!.getAll(...userRefs) : [];

        // 3. Create a map of authorId -> User Data
        const authorMap = new Map();
        userSnapshots.forEach(doc => {
            if (doc.exists) {
                authorMap.set(doc.id, doc.data());
            }
        });

        const posts = snapshot.docs.map(doc => {
            const data = doc.data();
            const authorData = authorMap.get(data.authorId) || {};

            return {
                id: doc.id,
                content: data.content || '',
                imageURL: data.imageURL || data.mediaUrl || '',
                authorId: data.authorId || '',
                authorName: data.authorName || data.authorDisplayName || 'Unknown',
                authorPhotoURL: data.authorPhotoURL || data.authorProfilePicture || '',
                // Merge verification status from the FRESH user doc, not the stale post doc
                authorIsVerified: !!authorData.isVerified,
                authorIsAgent: !!authorData.isAgent,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            };
        });

        console.log(`[ADMIN ACTION] Serialized ${posts.length} posts with author details.`);
        return posts;
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
}

export async function verifyUser(uid: string) {
    try {
        if (!db) {
            return { success: false, error: 'Admin SDK not initialized' };
        }
        await db.collection('users').doc(uid).update({
            isVerified: true,
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error verifying user:', error);
        return { success: false, error: 'Failed to verify user' };
    }
}

export async function verifyAgent(uid: string) {
    try {
        if (!db) {
            return { success: false, error: 'Admin SDK not initialized' };
        }
        await db.collection('users').doc(uid).update({
            isAgent: true,
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error verifying agent:', error);
        return { success: false, error: 'Failed to verify agent' };
    }
}

export async function banUser(uid: string) {
    try {
        if (!auth || !db) {
            return { success: false, error: 'Admin SDK not initialized' };
        }
        // Disable in Auth
        await auth.updateUser(uid, {
            disabled: true,
        });

        // Mark in Firestore
        await db.collection('users').doc(uid).update({
            isDisabled: true,
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error banning user:', error);
        return { success: false, error: 'Failed to ban user' };
    }
}

export async function deleteUser(uid: string) {
    try {
        if (!auth || !db) {
            return { success: false, error: 'Admin SDK not initialized' };
        }
        // Delete from Auth
        await auth.deleteUser(uid);

        // Delete from Firestore (Soft delete or hard delete? Prompt said hard delete with caution)
        await db.collection('users').doc(uid).delete();

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}

export async function deletePost(postId: string, reason: string, authorId: string) {
    try {
        if (!db) {
            return { success: false, error: 'Admin SDK not initialized' };
        }
        // Delete the post
        await db.collection('posts').doc(postId).delete();

        // Add violation record
        await db.collection('users').doc(authorId).collection('violations').add({
            reason,
            postId,
            date: new Date(),
        });

        // In a real app, we'd trigger a notification here.
        // For now, we'll just log it.
        console.log(`Notification to ${authorId}: Post removed for ${reason}`);

        revalidatePath('/admin/posts');
        return { success: true };
    } catch (error) {
        console.error('Error deleting post:', error);
        return { success: false, error: 'Failed to delete post' };
    }
}

export async function getAdminStats() {
    try {
        if (!db) {
            console.warn("[ADMIN ACTION] Admin SDK not initialized. Returning empty stats.");
            return {
                totalUsers: 0,
                activePosts: 0,
                verifiedUsers: 0,
                systemHealth: 'Admin SDK Missing'
            };
        }
        console.log("[ADMIN ACTION] Fetching stats...");

        // 1. Count Total Users
        const usersSnapshot = await db.collection('users').count().get();

        // 2. Count Active Posts
        const postsSnapshot = await db.collection('posts').count().get();

        // 3. Count Verified Users
        const verifiedSnapshot = await db.collection('users')
            .where('isVerified', '==', true)
            .count()
            .get();

        const stats = {
            totalUsers: usersSnapshot.data().count,
            activePosts: postsSnapshot.data().count,
            verifiedUsers: verifiedSnapshot.data().count,
            systemHealth: '100%' // Static for now
        };

        console.log("[ADMIN ACTION] Stats fetched:", stats);
        return stats;
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return {
            totalUsers: 0,
            activePosts: 0,
            verifiedUsers: 0,
            systemHealth: 'Error'
        };
    }
}

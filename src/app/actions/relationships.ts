'use server';

import { adminAuth, adminDb } from '@/lib/firebase-server';
import { FieldValue } from 'firebase-admin/firestore';

export async function followUserAction(targetUserId: string, idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const currentUserId = decodedToken.uid;

        if (currentUserId === targetUserId) {
            throw new Error("You cannot follow yourself.");
        }

        const batch = adminDb.batch();
        const currentUserRef = adminDb.collection('users').doc(currentUserId);
        const targetUserRef = adminDb.collection('users').doc(targetUserId);

        // Get current user data for notification and subcollection
        const currentUserDoc = await currentUserRef.get();
        const currentUserData = currentUserDoc.data();

        // Get target user data for subcollection
        const targetUserDoc = await targetUserRef.get();
        const targetUserData = targetUserDoc.data();

        if (!currentUserData) {
            throw new Error("Current user profile not found.");
        }
        if (!targetUserData) {
            throw new Error("Target user profile not found.");
        }

        // Update current user: add to 'following' array and increment 'followingCount'
        batch.update(currentUserRef, {
            following: FieldValue.arrayUnion(targetUserId),
            followingCount: FieldValue.increment(1),
        });

        // Update target user: add to 'followers' array and increment 'followersCount'
        batch.update(targetUserRef, {
            followers: FieldValue.arrayUnion(currentUserId),
            followersCount: FieldValue.increment(1),
        });

        // ALSO write to subcollections (source of truth)
        const followingSubcollectionRef = currentUserRef.collection('following').doc(targetUserId);
        const followersSubcollectionRef = targetUserRef.collection('followers').doc(currentUserId);

        batch.set(followingSubcollectionRef, {
            userId: targetUserId,
            username: targetUserData.username || '',
            displayName: targetUserData.displayName || '',
            photoURL: targetUserData.photoURL || '',
            timestamp: FieldValue.serverTimestamp(),
        });

        batch.set(followersSubcollectionRef, {
            userId: currentUserId,
            username: currentUserData.username || '',
            displayName: currentUserData.displayName || '',
            photoURL: currentUserData.photoURL || '',
            timestamp: FieldValue.serverTimestamp(),
        });

        // Create notification for the followed user
        const notificationRef = adminDb.collection('notifications').doc(targetUserId).collection('items').doc();
        const userNotificationsRef = adminDb.collection('notifications').doc(targetUserId);

        batch.set(notificationRef, {
            id: notificationRef.id,
            type: 'follow',
            fromUserId: currentUserId,
            fromUsername: currentUserData.username || 'User',
            fromUserPhotoURL: currentUserData.photoURL || '',
            targetId: currentUserId,
            message: 'started following you.',
            isRead: false,
            timestamp: FieldValue.serverTimestamp(),
        });

        batch.set(userNotificationsRef, {
            unreadCount: FieldValue.increment(1)
        }, { merge: true });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error in followUserAction:", error);
        throw new Error(error.message || "Failed to follow user.");
    }
}

export async function unfollowUserAction(targetUserId: string, idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const currentUserId = decodedToken.uid;

        if (currentUserId === targetUserId) {
            throw new Error("You cannot unfollow yourself.");
        }

        const batch = adminDb.batch();
        const currentUserRef = adminDb.collection('users').doc(currentUserId);
        const targetUserRef = adminDb.collection('users').doc(targetUserId);

        // Update current user: remove from 'following' array and decrement 'followingCount'
        batch.update(currentUserRef, {
            following: FieldValue.arrayRemove(targetUserId),
            followingCount: FieldValue.increment(-1),
        });

        // Update target user: remove from 'followers' array and decrement 'followersCount'
        batch.update(targetUserRef, {
            followers: FieldValue.arrayRemove(currentUserId),
            followersCount: FieldValue.increment(-1),
        });

        // ALSO delete from subcollections (source of truth)
        const followingSubcollectionRef = currentUserRef.collection('following').doc(targetUserId);
        const followersSubcollectionRef = targetUserRef.collection('followers').doc(currentUserId);

        batch.delete(followingSubcollectionRef);
        batch.delete(followersSubcollectionRef);

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error in unfollowUserAction:", error);
        throw new Error(error.message || "Failed to unfollow user.");
    }
}

export async function acceptFriendRequestAction(requestId: string, fromUserId: string, idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const currentUserId = decodedToken.uid;

        const batch = adminDb.batch();
        const requestRef = adminDb.collection('friend_requests').doc(requestId);
        const currentUserRef = adminDb.collection('users').doc(currentUserId);
        const senderUserRef = adminDb.collection('users').doc(fromUserId);

        // Get current user data for notification
        const currentUserDoc = await currentUserRef.get();
        const currentUserData = currentUserDoc.data();

        if (!currentUserData) {
            throw new Error("Current user profile not found.");
        }

        // Update request status
        batch.update(requestRef, { status: 'accepted' });

        // Add to friends lists
        batch.update(currentUserRef, {
            friends: FieldValue.arrayUnion(fromUserId)
        });
        batch.update(senderUserRef, {
            friends: FieldValue.arrayUnion(currentUserId)
        });

        // Create notification
        const notificationRef = adminDb.collection('notifications').doc(fromUserId).collection('items').doc();
        const userNotificationsRef = adminDb.collection('notifications').doc(fromUserId);

        batch.set(notificationRef, {
            id: notificationRef.id,
            type: 'friend_accept',
            fromUserId: currentUserId,
            fromUsername: currentUserData.username || 'User',
            fromUserPhotoURL: currentUserData.photoURL || '',
            targetId: currentUserId,
            message: 'accepted your friend request.',
            isRead: false,
            timestamp: FieldValue.serverTimestamp(),
        });

        batch.set(userNotificationsRef, {
            unreadCount: FieldValue.increment(1)
        }, { merge: true });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error in acceptFriendRequestAction:", error);
        throw new Error(error.message || "Failed to accept friend request.");
    }
}

import { db } from './firebase-client';
import {
  collection,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  getDoc,
  runTransaction,
  increment,
  limit,
  startAfter
} from 'firebase/firestore';
import type { User } from './types';

export interface FollowRecord {
  userId: string;
  username: string;
  displayName: string;
  photoURL?: string;
  timestamp: Date;
}

export class FollowService {
  // Toggle follow status (Follow/Unfollow) with Transaction
  static async handleFollowUser(currentUser: User, targetUser: User): Promise<void> {
    if (!currentUser.id || !targetUser.id) throw new Error("Invalid user IDs");
    if (currentUser.id === targetUser.id) throw new Error("Cannot follow yourself");

    const currentUserId = currentUser.id;
    const targetUserId = targetUser.id;

    const followingRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
    const followerRef = doc(db, `users/${targetUserId}/followers/${currentUserId}`);
    const currentUserRef = doc(db, `users/${currentUserId}`);
    const targetUserRef = doc(db, `users/${targetUserId}`);
    const notificationRef = doc(collection(db, `notifications/${targetUserId}/items`));

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Check if already following
        const followingDoc = await transaction.get(followingRef);
        const isFollowing = followingDoc.exists();

        // 2. Read user docs to ensure they exist
        const currentUserDoc = await transaction.get(currentUserRef);
        const targetUserDoc = await transaction.get(targetUserRef);

        if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
          throw new Error("User document not found");
        }

        if (isFollowing) {
          // --- UNFOLLOW ---
          transaction.delete(followingRef);
          transaction.delete(followerRef);

          // Decrement following count for current user
          transaction.update(currentUserRef, {
            followingCount: increment(-1)
          });

          // Decrement followers count for target user
          transaction.update(targetUserRef, {
            followersCount: increment(-1)
          });

        } else {
          // --- FOLLOW ---
          transaction.set(followingRef, {
            userId: targetUserId,
            username: targetUser.username,
            displayName: targetUser.displayName,
            ...(targetUser.photoURL && { photoURL: targetUser.photoURL }),
            timestamp: serverTimestamp(),
          });

          transaction.set(followerRef, {
            userId: currentUserId,
            username: currentUser.username,
            displayName: currentUser.displayName,
            ...(currentUser.photoURL && { photoURL: currentUser.photoURL }),
            timestamp: serverTimestamp(),
          });

          // Increment following count for current user
          transaction.update(currentUserRef, {
            followingCount: increment(1)
          });

          // Increment followers count for target user
          transaction.update(targetUserRef, {
            followersCount: increment(1)
          });

          // Create notification
          transaction.set(notificationRef, {
            type: 'follow',
            userId: currentUserId,
            username: currentUser.username,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            timestamp: serverTimestamp(),
            read: false
          });
        }
      });
    } catch (error) {
      console.error("Transaction failed: ", error);
      throw error;
    }
  }

  // Check if currentUser follows targetUser
  static async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    const followingRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
    const followingDoc = await getDoc(followingRef);
    return followingDoc.exists();
  }

  // Get followers list with pagination
  static async getFollowers(userId: string, limitCount: number = 20, startAfterId?: string): Promise<{ items: FollowRecord[], nextCursor?: string }> {
    const followersRef = collection(db, `users/${userId}/followers`);
    let q = query(followersRef, orderBy('timestamp', 'desc'), limit(limitCount));

    if (startAfterId) {
      const lastDocSnap = await getDoc(doc(db, `users/${userId}/followers/${startAfterId}`));
      if (lastDocSnap.exists()) {
        q = query(followersRef, orderBy('timestamp', 'desc'), startAfter(lastDocSnap), limit(limitCount));
      }
    }

    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    } as FollowRecord));

    const nextCursor = items.length === limitCount ? items[items.length - 1].userId : undefined;

    return { items, nextCursor };
  }

  // Get following list with pagination
  static async getFollowing(userId: string, limitCount: number = 20, startAfterId?: string): Promise<{ items: FollowRecord[], nextCursor?: string }> {
    const followingRef = collection(db, `users/${userId}/following`);
    let q = query(followingRef, orderBy('timestamp', 'desc'), limit(limitCount));

    if (startAfterId) {
      const lastDocSnap = await getDoc(doc(db, `users/${userId}/following/${startAfterId}`));
      if (lastDocSnap.exists()) {
        q = query(followingRef, orderBy('timestamp', 'desc'), startAfter(lastDocSnap), limit(limitCount));
      }
    }

    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    } as FollowRecord));

    const nextCursor = items.length === limitCount ? items[items.length - 1].userId : undefined;

    return { items, nextCursor };
  }

  // Get follower count
  static async getFollowerCount(userId: string): Promise<number> {
    const followersRef = collection(db, `users/${userId}/followers`);
    const q = query(followersRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }

  // Get following count
  static async getFollowingCount(userId: string): Promise<number> {
    const followingRef = collection(db, `users/${userId}/following`);
    const q = query(followingRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }
}
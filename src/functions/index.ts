
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminDb } from '../lib/firebase-server';
import { FieldValue } from 'firebase-admin/firestore';

// Note: Ensure firebase-functions and firebase-admin are in your package.json
// "firebase-functions": "^5.0.1",

export const toggleFollow = onCall({
    // Enforce rate limiting to prevent spamming
    rateLimits: {
      'per-user-1s': {
        maxCalls: 2, // Allow a burst of 2 calls to accommodate quick follow/unfollow
        timePeriodSeconds: 1,
      },
    },
  }, async (request) => {
    
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to follow a user.'
    );
  }

  const currentUid = request.auth.uid;
  const { targetUid } = request.data;

  if (typeof targetUid !== 'string') {
      throw new HttpsError('invalid-argument', 'The function must be called with a "targetUid" string argument.');
  }

  if (currentUid === targetUid) {
    throw new HttpsError(
      'invalid-argument',
      'You cannot follow yourself.'
    );
  }

  const followerRef = adminDb.collection('users').doc(targetUid).collection('followers').doc(currentUid);
  const followingRef = adminDb.collection('users').doc(currentUid).collection('following').doc(targetUid);
  const targetUserRef = adminDb.collection('users').doc(targetUid);
  const currentUserRef = adminDb.collection('users').doc(currentUid);

  let result;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const followerSnap = await transaction.get(followerRef);
      const targetUserSnap = await transaction.get(targetUserRef);
      const currentUserSnap = await transaction.get(currentUserRef);

      if (!targetUserSnap.exists || !currentUserSnap.exists) {
        throw new HttpsError('not-found', 'One or both user profiles could not be found.');
      }
      
      const targetData = targetUserSnap.data()!;
      const currentData = currentUserSnap.data()!;
      
      if (followerSnap.exists) {
        // --- UNFOLLOW LOGIC ---
        transaction.delete(followerRef);
        transaction.delete(followingRef);
        
        const newFollowersCount = (targetData.followersCount || 0) - 1;
        const newFollowingCount = (currentData.followingCount || 0) - 1;

        transaction.update(targetUserRef, { followersCount: Math.max(0, newFollowersCount) });
        transaction.update(currentUserRef, { followingCount: Math.max(0, newFollowingCount) });
        
        result = { action: 'unfollow' };
        
      } else {
        // --- FOLLOW LOGIC ---
        const timestamp = FieldValue.serverTimestamp();
        transaction.set(followerRef, { userId: currentUid, followedAt: timestamp });
        transaction.set(followingRef, { userId: targetUid, followedAt: timestamp });
        
        const newFollowersCount = (targetData.followersCount || 0) + 1;
        const newFollowingCount = (currentData.followingCount || 0) + 1;

        transaction.update(targetUserRef, { followersCount: newFollowersCount });
        transaction.update(currentUserRef, { followingCount: newFollowingCount });

        result = { action: 'follow' };
      }
    });
    
    return result;

  } catch (error) {
    console.error('Transaction failed: ', error);
    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError('internal', 'An error occurred while trying to toggle follow status.');
  }
});

// Optional: A function to initialize or correct counts.
// This is an administrative function and should be secured.
export const initializeUserCounts = onCall({ enforceAppCheck: true }, async (request) => {
    const usersSnapshot = await adminDb.collection('users').get();
    const batch = adminDb.batch();

    for (const doc of usersSnapshot.docs) {
        const followersSnapshot = await doc.ref.collection('followers').get();
        const followingSnapshot = await doc.ref.collection('following').get();

        batch.update(doc.ref, {
            followersCount: followersSnapshot.size,
            followingCount: followingSnapshot.size,
        });
    }

    await batch.commit();
    return { success: true, message: `Updated counts for ${usersSnapshot.size} users.`};
});

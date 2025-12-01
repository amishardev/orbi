import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Export notification functions
export { onFollowUser } from './notifications';
export { getRecommendations } from './recommendations';

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = [
  'admin', 'api', 'p', 'assets', 'www', 'support', 'null', 'undefined',
  'root', 'system', 'user', 'users', 'profile', 'profiles', 'account',
  'accounts', 'settings', 'config', 'help', 'about', 'contact', 'terms',
  'privacy', 'legal', 'blog', 'news', 'feed', 'home', 'login', 'signup',
  'register', 'auth', 'oauth', 'callback', 'verify', 'reset', 'forgot',
  'dashboard', 'console', 'panel', 'manage', 'management', 'moderator',
  'mod', 'staff', 'team', 'official', 'orbi', 'orbie', 'app', 'mobile',
  'web', 'site', 'website', 'service', 'services', 'status', 'health',
  'ping', 'test', 'testing', 'dev', 'development', 'staging', 'prod',
  'production', 'beta', 'alpha', 'demo', 'example', 'sample', 'placeholder'
];

/**
 * Validates username format and checks against reserved names
 */
function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  const lowerUsername = username.toLowerCase();

  // Check length (3-30 characters)
  if (lowerUsername.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (lowerUsername.length > 30) {
    return { isValid: false, error: 'Username must be no more than 30 characters long' };
  }

  // Check format: alphanumeric plus dots and underscores
  const usernameRegex = /^[a-z0-9._]+$/;
  if (!usernameRegex.test(lowerUsername)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, dots, and underscores' };
  }

  // Check for consecutive dots or underscores
  if (lowerUsername.includes('..') || lowerUsername.includes('__')) {
    return { isValid: false, error: 'Username cannot contain consecutive dots or underscores' };
  }

  // Check if starts or ends with dot or underscore
  if (lowerUsername.startsWith('.') || lowerUsername.startsWith('_') ||
    lowerUsername.endsWith('.') || lowerUsername.endsWith('_')) {
    return { isValid: false, error: 'Username cannot start or end with dots or underscores' };
  }

  // Check against reserved names
  if (RESERVED_USERNAMES.includes(lowerUsername)) {
    return { isValid: false, error: 'This username is reserved and cannot be used' };
  }

  return { isValid: true };
}

/**
 * Callable function to create or update a username mapping atomically
 */
export const createUsername = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { username, oldUsername } = data;
  const uid = context.auth.uid;

  if (!username) {
    throw new functions.https.HttpsError('invalid-argument', 'Username is required');
  }

  // Validate username
  const validation = validateUsername(username);
  if (!validation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', validation.error || 'Invalid username');
  }

  const lowerUsername = username.toLowerCase();
  const lowerOldUsername = oldUsername?.toLowerCase();

  try {
    // Use transaction for atomic operation
    const result = await db.runTransaction(async (transaction) => {
      // Check if new username is available
      const newUsernameRef = db.collection('usernames').doc(lowerUsername);
      const newUsernameDoc = await transaction.get(newUsernameRef);

      if (newUsernameDoc.exists && newUsernameDoc.data()?.uid !== uid) {
        throw new Error('Username is already taken');
      }

      // Update user document with new username
      const userRef = db.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      // Create new username mapping
      transaction.set(newUsernameRef, {
        uid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update user document
      transaction.update(userRef, {
        username: lowerUsername,
        username_lowercase: lowerUsername,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Clean up old username mapping if it exists and is different
      if (lowerOldUsername && lowerOldUsername !== lowerUsername) {
        const oldUsernameRef = db.collection('usernames').doc(lowerOldUsername);
        const oldUsernameDoc = await transaction.get(oldUsernameRef);

        // Only delete if it belongs to this user
        if (oldUsernameDoc.exists && oldUsernameDoc.data()?.uid === uid) {
          transaction.delete(oldUsernameRef);
        }
      }

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('Error creating username mapping:', error);
    throw new functions.https.HttpsError('internal',
      error instanceof Error ? error.message : 'Failed to create username mapping'
    );
  }
});

/**
 * HTTP function to resolve username for vanity URLs
 * Handles /p/<username> routes with 302 redirects
 */
export const resolveUsername = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Extract username from path /p/<username>
    const pathParts = req.path.split('/').filter(part => part.length > 0);

    if (pathParts.length < 2 || pathParts[0] !== 'p') {
      res.status(404).send('Not Found');
      return;
    }

    const username = pathParts[1].toLowerCase();

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.isValid) {
      res.status(404).send('Not Found');
      return;
    }

    // Look up username in Firestore
    const usernameDoc = await db.collection('usernames').doc(username).get();

    if (!usernameDoc.exists) {
      // Return 404 with suggestions for similar usernames
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Profile Not Found - Orbi</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; 
                        padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .username { font-family: monospace; background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Profile Not Found</h1>
            <p>The profile <span class="username">@${username}</span> doesn't exist on Orbi.</p>
            <p>Check the spelling or try searching for the person you're looking for.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const uid = usernameDoc.data()?.uid;
    if (!uid) {
      res.status(404).send('Not Found');
      return;
    }

    // Redirect to the actual profile page
    const profileUrl = `${req.protocol}://${req.get('host')}/profile/${username}`;

    // Set cache headers
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');

    // 302 redirect to profile page
    res.redirect(302, profileUrl);

  } catch (error) {
    console.error('Error resolving username:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Callable function to check username availability
 */
export const checkUsernameAvailability = functions.https.onCall(async (data, context) => {
  const { username } = data;

  if (!username) {
    throw new functions.https.HttpsError('invalid-argument', 'Username is required');
  }

  // Validate username format
  const validation = validateUsername(username);
  if (!validation.isValid) {
    return {
      isAvailable: false,
      error: validation.error
    };
  }

  try {
    const lowerUsername = username.toLowerCase();
    const usernameDoc = await db.collection('usernames').doc(lowerUsername).get();

    return {
      isAvailable: !usernameDoc.exists,
      error: usernameDoc.exists ? 'Username is already taken' : undefined
    };
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check username availability');
  }
});

// Rate limiting storage for follow actions (in-memory per instance)
const userActionTimestamps = new Map<string, number>();

/**
 * Callable function to toggle follow/unfollow atomically
 * Input: { targetUid: string }
 * Returns: { action: 'follow' | 'unfollow', followersCount: number, followingCount: number }
 */
export const toggleFollow = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { targetUid } = data;
  const currentUid = context.auth.uid;

  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUid is required');
  }

  // Reject self-follow
  if (currentUid === targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot follow yourself');
  }

  // Simple rate limiting (500ms between actions per user)
  const now = Date.now();
  const lastAction = userActionTimestamps.get(currentUid);
  if (lastAction && (now - lastAction) < 500) {
    throw new functions.https.HttpsError('resource-exhausted', 'Please wait before performing another follow action');
  }
  userActionTimestamps.set(currentUid, now);

  try {
    // Use transaction for atomic operation
    const result = await db.runTransaction(async (transaction) => {
      // Set up document references
      const followerRef = db.doc(`users/${targetUid}/followers/${currentUid}`);
      const followingRef = db.doc(`users/${currentUid}/following/${targetUid}`);
      const targetUserRef = db.doc(`users/${targetUid}`);
      const currentUserRef = db.doc(`users/${currentUid}`);

      // Read follower document to determine current state
      const followerSnap = await transaction.get(followerRef);
      const targetUserSnap = await transaction.get(targetUserRef);
      const currentUserSnap = await transaction.get(currentUserRef);

      // Verify both users exist
      if (!targetUserSnap.exists) {
        throw new Error('Target user not found');
      }
      if (!currentUserSnap.exists) {
        throw new Error('Current user not found');
      }

      const targetUserData = targetUserSnap.data();
      const currentUserData = currentUserSnap.data();

      if (followerSnap.exists) {
        // UNFOLLOW FLOW
        // Delete follower and following documents
        transaction.delete(followerRef);
        transaction.delete(followingRef);

        // Calculate new counts (ensure they don't go below 0)
        const newTargetFollowers = Math.max((targetUserData?.followersCount || 0) - 1, 0);
        const newCurrentFollowing = Math.max((currentUserData?.followingCount || 0) - 1, 0);

        // Update user counts
        transaction.update(targetUserRef, { followersCount: newTargetFollowers });
        transaction.update(currentUserRef, { followingCount: newCurrentFollowing });

        return {
          action: 'unfollow' as const,
          followersCount: newTargetFollowers,
          followingCount: newCurrentFollowing
        };
      } else {
        // FOLLOW FLOW
        // Create follower and following documents
        transaction.set(followerRef, {
          uid: currentUid,
          followedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.set(followingRef, {
          uid: targetUid,
          followedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Calculate new counts
        const newTargetFollowers = (targetUserData?.followersCount || 0) + 1;
        const newCurrentFollowing = (currentUserData?.followingCount || 0) + 1;

        // Update user counts
        transaction.update(targetUserRef, { followersCount: newTargetFollowers });
        transaction.update(currentUserRef, { followingCount: newCurrentFollowing });

        return {
          action: 'follow' as const,
          followersCount: newTargetFollowers,
          followingCount: newCurrentFollowing
        };
      }
    });

    return result;
  } catch (error) {
    console.error('Error toggling follow:', error);
    throw new functions.https.HttpsError('internal',
      error instanceof Error ? error.message : 'Failed to toggle follow'
    );
  }
});

/**
 * Admin callable function to initialize user follower/following counts
 * Input: { force?: boolean }
 * Use this for backfilling counts after deployment
 */
export const initializeUserCounts = functions.https.onCall(async (data, context) => {
  // Check authentication (you might want to restrict this to admin users)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { force = false } = data;

  try {
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    let updateCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Skip if counts already exist and force is not true
      if (!force &&
        typeof userData.followersCount === 'number' &&
        typeof userData.followingCount === 'number') {
        continue;
      }

      // Count followers
      const followersSnapshot = await db.collection(`users/${userId}/followers`).get();
      const followersCount = followersSnapshot.size;

      // Count following
      const followingSnapshot = await db.collection(`users/${userId}/following`).get();
      const followingCount = followingSnapshot.size;

      // Update user document
      batch.update(userDoc.ref, {
        followersCount,
        followingCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      updateCount++;

      // Commit batch every 500 operations (Firestore limit)
      if (updateCount % 500 === 0) {
        await batch.commit();
      }
    }

    // Commit remaining operations
    if (updateCount % 500 !== 0) {
      await batch.commit();
    }

    return {
      success: true,
      usersProcessed: usersSnapshot.size,
      usersUpdated: updateCount
    };
  } catch (error) {
    console.error('Error initializing user counts:', error);
    throw new functions.https.HttpsError('internal',
      error instanceof Error ? error.message : 'Failed to initialize user counts'
    );
  }
});

/**
 * Callable function to get paginated followers for UI
 * Input: { userId: string, pageSize?: number, cursor?: string }
 * Returns: { items: Array<{uid, username, displayName, profilePicture, followedAt}>, nextCursor?: string }
 */
export const getFollowersForUI = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, pageSize = 20, cursor } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  if (pageSize > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'pageSize cannot exceed 100');
  }

  try {
    // Build query for followers
    let query = db.collection(`users/${userId}/followers`)
      .orderBy('followedAt', 'desc')
      .limit(pageSize + 1); // Get one extra to determine if there's a next page

    // Apply cursor if provided
    if (cursor) {
      const cursorDoc = await db.doc(`users/${userId}/followers/${cursor}`).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const followersSnapshot = await query.get();
    const followers = followersSnapshot.docs.slice(0, pageSize); // Remove the extra doc
    const hasNextPage = followersSnapshot.docs.length > pageSize;

    // Batch fetch user details
    const userIds = followers.map(doc => doc.data().uid);
    const userPromises = userIds.map(uid => db.doc(`users/${uid}`).get());
    const userDocs = await Promise.all(userPromises);

    // Combine follower data with user details
    const items = followers.map((followerDoc, index) => {
      const followerData = followerDoc.data();
      const userData = userDocs[index].data();

      return {
        uid: followerData.uid,
        username: userData?.username || '',
        displayName: userData?.displayName || '',
        profilePicture: userData?.profilePicture || '',
        followedAt: followerData.followedAt
      };
    });

    const result: any = { items };

    // Set next cursor if there are more pages
    if (hasNextPage && followers.length > 0) {
      result.nextCursor = followers[followers.length - 1].data().uid;
    }

    return result;
  } catch (error) {
    console.error('Error getting followers:', error);
    throw new functions.https.HttpsError('internal',
      error instanceof Error ? error.message : 'Failed to get followers'
    );
  }
});

import { v2 as cloudinary } from 'cloudinary';

/**
 * Scheduled function to clean up expired stories (every 60 minutes)
 * Deletes media from Cloudinary and documents from Firestore
 */
export const cleanupExpiredStories = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();

  try {
    const expiredStoriesSnapshot = await db.collection('stories')
      .where('expiresAt', '<', now)
      .get();

    if (expiredStoriesSnapshot.empty) {
      console.log('No expired stories found.');
      return null;
    }

    console.log(`Found ${expiredStoriesSnapshot.size} expired stories.`);

    const batch = db.batch();
    let deleteCount = 0;

    for (const doc of expiredStoriesSnapshot.docs) {
      const story = doc.data();

      if (story.publicId && story.cloudName) {
        // Configure Cloudinary for the specific cloud account
        // Note: In a real environment, you should use functions.config() or Secret Manager
        // For this implementation, we'll assume env vars are available to the function instance
        // or fall back to the config logic if needed.

        // Determine which set of credentials to use based on cloudName
        let apiKey, apiSecret;

        if (story.cloudName === process.env.CLOUDINARY_VIDEO_NAME) {
          // Video Account A
          apiKey = process.env.CLOUDINARY_VIDEO_KEY;
          apiSecret = process.env.CLOUDINARY_VIDEO_SECRET;
        } else if (story.cloudName === process.env.CLOUDINARY_VID_2_NAME) {
          // Video Account B
          apiKey = process.env.CLOUDINARY_VID_2_KEY;
          apiSecret = process.env.CLOUDINARY_VID_2_SECRET;
        } else {
          // Default to photo account
          apiKey = process.env.CLOUDINARY_PHOTO_KEY;
          apiSecret = process.env.CLOUDINARY_PHOTO_SECRET;
        }

        if (apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: story.cloudName,
            api_key: apiKey,
            api_secret: apiSecret
          });

          try {
            await cloudinary.uploader.destroy(story.publicId, {
              resource_type: story.type === 'video' ? 'video' : 'image'
            });
            console.log(`Deleted media ${story.publicId} from Cloudinary (${story.cloudName})`);
          } catch (err) {
            console.error(`Failed to delete media ${story.publicId} from Cloudinary:`, err);
          }
        } else {
          console.warn(`Missing credentials for cloud ${story.cloudName}, skipping Cloudinary deletion.`);
        }
      }

      batch.delete(doc.ref);
      deleteCount++;
    }

    await batch.commit();
    console.log(`Successfully cleaned up ${deleteCount} stories.`);
    return null;

  } catch (error) {
    console.error('Error cleaning up expired stories:', error);
    return null;
  }
});

/**
 * Helper function to delete media from Cloudinary
 */
async function deleteFromCloudinary(publicId: string, cloudName: string, resourceType: 'image' | 'video') {
  let apiKey, apiSecret;

  if (cloudName === process.env.CLOUDINARY_VIDEO_NAME) {
    // Video Account A
    apiKey = process.env.CLOUDINARY_VIDEO_KEY;
    apiSecret = process.env.CLOUDINARY_VIDEO_SECRET;
  } else if (cloudName === process.env.CLOUDINARY_VID_2_NAME) {
    // Video Account B
    apiKey = process.env.CLOUDINARY_VID_2_KEY;
    apiSecret = process.env.CLOUDINARY_VID_2_SECRET;
  } else if (cloudName === process.env.CLOUDINARY_PHOTO_NAME) {
    // Photo Account
    apiKey = process.env.CLOUDINARY_PHOTO_KEY;
    apiSecret = process.env.CLOUDINARY_PHOTO_SECRET;
  } else {
    console.warn(`Unknown cloud name: ${cloudName}, skipping deletion.`);
    return;
  }

  if (!apiKey || !apiSecret) {
    console.warn(`Missing credentials for cloud ${cloudName}, skipping deletion.`);
    return;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    console.log(`Deleted ${resourceType} from Cloud ${cloudName}: ${publicId}`);
  } catch (error) {
    console.error(`Failed to delete ${resourceType} ${publicId} from Cloudinary:`, error);
  }
}

/**
 * Trigger: Cleanup Cloudinary file when a Post is deleted
 */
export const onPostDelete = functions.firestore.document('posts/{postId}').onDelete(async (snap, context) => {
  const data = snap.data();

  if (data && data.publicId && data.cloudName) {
    // Determine resource type based on data.type or data.mediaType
    // Assuming 'type' or 'mediaType' holds 'image' or 'video'
    const type = data.type || data.mediaType || 'image';
    const resourceType = type === 'video' ? 'video' : 'image';

    await deleteFromCloudinary(data.publicId, data.cloudName, resourceType);
  }
});

/**
 * Trigger: Cleanup Cloudinary file when a Story is deleted (manually)
 * Note: cleanupExpiredStories handles expiration, this handles manual deletion
 */
export const onStoryDelete = functions.firestore.document('stories/{storyId}').onDelete(async (snap, context) => {
  const data = snap.data();

  if (data && data.publicId && data.cloudName) {
    const resourceType = data.type === 'video' ? 'video' : 'image';
    await deleteFromCloudinary(data.publicId, data.cloudName, resourceType);
  }
});
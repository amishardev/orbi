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

// Rate limiting storage for post creation (in-memory per instance)
// Maps userId -> array of post timestamps in the last hour
const userPostTimestamps = new Map<string, number[]>();

// Anonymous post constants
const ANONYMOUS_AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIxMDAiIGZpbGw9IiM2YjcyODAiLz48dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1zaXplPSIxMDAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+PzwvdGV4dD48L3N2Zz4=';
const ANONYMOUS_DISPLAY_NAME = 'Anonymous';
const MAX_POSTS_PER_HOUR = 10;

// List of admin user IDs (add your admin UIDs here)
const ADMIN_UIDS: string[] = [
  // Add admin UIDs here, e.g.:
  // 'uid1234567890',
];

/**
 * Check if a user is an admin
 */
function isAdmin(uid: string, customClaims?: any): boolean {
  // Check against hardcoded list
  if (ADMIN_UIDS.includes(uid)) {
    return true;
  }
  // Check custom claims
  if (customClaims?.admin === true) {
    return true;
  }
  return false;
}

/**
 * Check rate limit for post creation
 * Returns true if under limit, false if exceeded
 */
function checkPostRateLimit(userId: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Get existing timestamps and filter out old ones
  const timestamps = userPostTimestamps.get(userId) || [];
  const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);

  if (recentTimestamps.length >= MAX_POSTS_PER_HOUR) {
    return false;
  }

  // Update timestamps
  recentTimestamps.push(now);
  userPostTimestamps.set(userId, recentTimestamps);

  return true;
}

/**
 * Basic HTML/script sanitization for captions
 */
function sanitizeCaption(caption: string): string {
  if (!caption) return '';
  // Remove script tags and common XSS patterns
  return caption
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .trim();
}

/**
 * Callable function to create a post
 * Supports both regular and anonymous posts
 * Anonymous posts store real author in posts_private collection
 */
export const createPost = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const {
    caption,
    isAnonymous = false,
    mediaUrl = null,
    mediaUrls = null,
    mediaType = null,
    imageHint = null,
    embed = null
  } = data;

  // Validate caption
  if (!caption && !mediaUrl && !mediaUrls?.length && !embed) {
    throw new functions.https.HttpsError('invalid-argument', 'Post must have content (caption, media, or embed)');
  }

  if (caption && caption.length > 5000) {
    throw new functions.https.HttpsError('invalid-argument', 'Caption must be less than 5000 characters');
  }

  // Check rate limit
  if (!checkPostRateLimit(uid)) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Rate limit exceeded. You can create up to 10 posts per hour.'
    );
  }

  try {
    // Fetch user data for author info
    const userDoc = await db.doc(`users/${uid}`).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const sanitizedCaption = sanitizeCaption(caption || '');

    // Generate post ID
    const postRef = db.collection('posts').doc();
    const postId = postRef.id;

    // Build public post document
    const postData: any = {
      caption: sanitizedCaption,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: {},
      commentsCount: 0,
      totalReactions: 0,
      mediaUrl: mediaUrl,
      mediaUrls: mediaUrls,
      mediaType: mediaType,
      imageHint: imageHint,
      isAnonymous: isAnonymous,
    };

    if (embed) {
      postData.embed = embed;
    }

    if (isAnonymous) {
      // Anonymous post - hide real author info
      postData.userId = uid; // Still store for ownership (delete, etc.)
      postData.username = '';
      postData.authorDisplayName = ANONYMOUS_DISPLAY_NAME;
      postData.authorPhotoURL = ANONYMOUS_AVATAR_URL;
      postData.publicAuthorName = ANONYMOUS_DISPLAY_NAME;
      postData.publicAuthorDp = ANONYMOUS_AVATAR_URL;
      postData.showProfileLink = false;
    } else {
      // Regular post - show real author info
      postData.userId = uid;
      postData.username = userData?.username || 'user';
      postData.authorDisplayName = userData?.displayName || 'User';
      postData.authorPhotoURL = userData?.photoURL || `https://picsum.photos/seed/${uid}/200/200`;
      postData.showProfileLink = true;
    }

    // Use batch write for atomic operation
    const batch = db.batch();

    // Write public post
    batch.set(postRef, postData);

    // Write private mapping (for moderation)
    const privateRef = db.doc(`posts_private/${postId}`);
    batch.set(privateRef, {
      postId: postId,
      realAuthorId: uid,
      isAnonymous: isAnonymous,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      postId: postId,
      isAnonymous: isAnonymous,
    };

  } catch (error) {
    console.error('Error creating post:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to create post'
    );
  }
});

/**
 * Admin callable function to reveal the real author of an anonymous post
 * Only accessible to admin users
 */
export const revealAuthor = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const customClaims = context.auth.token;

  // Check admin status
  if (!isAdmin(uid, customClaims)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can reveal anonymous post authors'
    );
  }

  const { postId } = data;

  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'postId is required');
  }

  try {
    // Fetch private mapping
    const privateDoc = await db.doc(`posts_private/${postId}`).get();

    if (!privateDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Post private data not found');
    }

    const privateData = privateDoc.data();

    // Fetch real author's user data
    const userDoc = await db.doc(`users/${privateData?.realAuthorId}`).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    return {
      postId: postId,
      realAuthorId: privateData?.realAuthorId,
      realAuthorUsername: userData?.username || 'unknown',
      realAuthorDisplayName: userData?.displayName || 'Unknown User',
      realAuthorEmail: userData?.email || null,
      isAnonymous: privateData?.isAnonymous,
      createdAt: privateData?.createdAt,
    };

  } catch (error) {
    console.error('Error revealing author:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to reveal author'
    );
  }
});

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
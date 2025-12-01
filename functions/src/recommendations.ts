import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

// Ensure Firebase Admin is initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- Constants & Types ---

const WEIGHTS = {
  MUTUAL_FOLLOW: 40,
  COMMUNITY: 25,
  INTEREST: 20,
  STATUS: 10,
  POPULARITY: 10
};

interface UserData {
  uid: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  tags?: string[];
  joinedCommunities?: string[];
  relationshipStatus?: string;
  followersCount?: number;
}

interface ScoredCandidate extends UserData {
  score: number;
  debug?: any;
}

// --- Helper Functions ---

/**
 * Helper to chunk array for batch processing if needed
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

// --- Main Function ---

export const getRecommendations = onCall(async (request) => {
  console.log('getRecommendations called');
  // 1. Authentication Check
  if (!request.auth) {
    console.warn('getRecommendations: Unauthenticated request');
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const currentUid = request.auth.uid;
  console.log(`getRecommendations: Generating for user ${currentUid}`);

  try {
    // Fetch Current User Data
    console.log('getRecommendations: Fetching user profile...');
    const currentUserDoc = await db.collection('users').doc(currentUid).get();
    if (!currentUserDoc.exists) {
      console.error(`getRecommendations: User profile not found for ${currentUid}`);
      throw new HttpsError('not-found', 'User profile not found');
    }
    const currentUser = currentUserDoc.data() as UserData;
    const myTags = currentUser.tags || [];
    const myCommunities = currentUser.joinedCommunities || [];
    const myStatus = currentUser.relationshipStatus;
    console.log(`getRecommendations: User profile loaded. Tags: ${myTags.length}, Communities: ${myCommunities.length}`);

    // --- Step A: Retrieval (The "Blue Tower") ---
    // Run queries in parallel to build Candidate Pool
    console.log('getRecommendations: Starting parallel retrieval...');

    const [socialCandidates, interestCandidates, communityCandidates, followingSnap] = await Promise.all([
      // 1. Social Graph (Friends-of-Friends)
      getSocialGraphCandidates(currentUid).then(res => {
        console.log(`getRecommendations: Social candidates fetched: ${res.length}`);
        return res;
      }).catch(err => {
        console.error('getRecommendations: Error fetching social candidates:', err);
        return [];
      }),

      // 2. Interest Graph
      myTags.length > 0
        ? db.collection('users')
          .where('tags', 'array-contains-any', myTags.slice(0, 10)) // Limit to 10 tags for query limit
          .limit(20)
          .get()
          .then(snap => {
            console.log(`getRecommendations: Interest candidates fetched: ${snap.size}`);
            return snap.docs.map(d => d.data() as UserData);
          })
          .catch(err => {
            console.error('getRecommendations: Error fetching interest candidates:', err);
            return [];
          })
        : Promise.resolve([]),

      // 3. Community Graph
      myCommunities.length > 0
        ? db.collection('users')
          .where('joinedCommunities', 'array-contains-any', myCommunities.slice(0, 10))
          .limit(20)
          .get()
          .then(snap => {
            console.log(`getRecommendations: Community candidates fetched: ${snap.size}`);
            return snap.docs.map(d => d.data() as UserData);
          })
          .catch(err => {
            console.error('getRecommendations: Error fetching community candidates:', err);
            return [];
          })
        : Promise.resolve([]),

      // Fetch who I am already following to exclude them
      db.collection(`users/${currentUid}/following`).get().then(snap => {
        console.log(`getRecommendations: Following list fetched: ${snap.size}`);
        return snap;
      }).catch(err => {
        console.error('getRecommendations: Error fetching following list:', err);
        throw err; // Critical, rethrow
      })
    ]);

    // Build Exclusion Set (Me + Following)
    const excludedIds = new Set<string>([currentUid]);
    followingSnap.docs.forEach(doc => excludedIds.add(doc.id)); // doc.id is targetUserId in 'following'

    // Merge & Deduplicate Candidates
    const allCandidatesMap = new Map<string, UserData>();

    [...socialCandidates, ...interestCandidates, ...communityCandidates].forEach(user => {
      if (user.uid && !excludedIds.has(user.uid)) {
        allCandidatesMap.set(user.uid, user);
      }
    });

    const candidates = Array.from(allCandidatesMap.values());
    console.log(`getRecommendations: Total unique candidates after deduplication: ${candidates.length}`);

    // --- Step C: Scoring (The "Red Tower") ---

    // Let's implement the scoring loop
    const scoredCandidates: ScoredCandidate[] = candidates.map(candidate => {
      let score = 0;
      const debugReasons: string[] = [];

      // 1. Mutual Connections Logic (Simplified)
      const isFoF = socialCandidates.some(c => c.uid === candidate.uid);
      if (isFoF) {
        score += WEIGHTS.MUTUAL_FOLLOW;
        debugReasons.push('Mutual/FoF');
      }

      // 2. Interest Match
      const candidateTags = candidate.tags || [];
      const sharedTags = candidateTags.filter(t => myTags.includes(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * WEIGHTS.INTEREST;
        debugReasons.push(`Interests: ${sharedTags.length}`);
      }

      // 3. Community Match
      const candidateCommunities = candidate.joinedCommunities || [];
      const sharedComm = candidateCommunities.filter(c => myCommunities.includes(c));
      if (sharedComm.length > 0) {
        score += sharedComm.length * WEIGHTS.COMMUNITY;
        debugReasons.push(`Communities: ${sharedComm.length}`);
      }

      // 4. Status Match
      if (myStatus && candidate.relationshipStatus === myStatus) {
        score += WEIGHTS.STATUS;
        debugReasons.push('Status');
      }

      // 5. Popularity Logarithm
      const followers = candidate.followersCount || 0;
      if (followers > 0) {
        score += Math.log10(followers) * WEIGHTS.POPULARITY;
      }

      return {
        ...candidate,
        score,
        debug: { reasons: debugReasons, rawScore: score }
      };
    });

    // Sort by Score Descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    const topRecommendations = scoredCandidates.slice(0, 20);
    console.log(`getRecommendations: Returning ${topRecommendations.length} recommendations`);

    // Return top 20
    return {
      recommendations: topRecommendations
    };

  } catch (error) {
    console.error('Error generating recommendations:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    throw new HttpsError('internal', 'Failed to generate recommendations');
  }
});

/**
 * Helper to fetch Social Graph (Friends-of-Friends)
 */
async function getSocialGraphCandidates(currentUid: string): Promise<UserData[]> {
  try {
    // 1. Get my following (Level 1)
    const followingSnap = await db.collection(`users/${currentUid}/following`).limit(50).get();
    if (followingSnap.empty) return [];

    const myFollowingIds = followingSnap.docs.map(doc => doc.id);

    // 2. Randomly select up to 5 Level 1 connections
    const selectedL1 = myFollowingIds.sort(() => 0.5 - Math.random()).slice(0, 5);

    // 3. Fetch Level 2 connections (their following)
    const l2Promises = selectedL1.map(uid =>
      db.collection(`users/${uid}/following`).limit(10).get()
    );

    const l2Snaps = await Promise.all(l2Promises);
    const l2Ids = new Set<string>();

    l2Snaps.forEach(snap => {
      snap.docs.forEach(doc => l2Ids.add(doc.id));
    });

    if (l2Ids.size === 0) return [];

    // 4. Fetch User Profiles for L2 candidates
    // Firestore 'in' query limit is 10 (or 30 in some versions), so we chunk
    const l2IdArray = Array.from(l2Ids).slice(0, 30); // Limit to 30 total FoF candidates to fetch
    if (l2IdArray.length === 0) return [];

    const chunks = chunk(l2IdArray, 10);
    const profilePromises = chunks.map(batch =>
      db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', batch).get()
    );

    const profileSnaps = await Promise.all(profilePromises);
    const candidates: UserData[] = [];

    profileSnaps.forEach(snap => {
      snap.docs.forEach(doc => {
        candidates.push(doc.data() as UserData);
      });
    });

    return candidates;

  } catch (error) {
    console.error('Error fetching social graph:', error);
    return [];
  }
}
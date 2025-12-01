'use server';

import { db, auth } from '@/lib/firebase-admin';
import { FieldPath } from 'firebase-admin/firestore';
import { headers } from 'next/headers';

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

function chunk<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

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
        const l2IdArray = Array.from(l2Ids).slice(0, 30);
        if (l2IdArray.length === 0) return [];

        const chunks = chunk(l2IdArray, 10);
        const profilePromises = chunks.map(batch =>
            db.collection('users').where(FieldPath.documentId(), 'in', batch).get()
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

// --- Main Server Action ---

export async function getRecommendationsAction() {
    console.log('getRecommendationsAction called');

    // 1. Authentication Check (using firebase-admin auth verifyIdToken would be ideal, 
    // but for Server Actions called from client, we might rely on the session cookie if we had one.
    // However, since we don't have a session cookie set up for firebase-admin, 
    // we'll pass the UID from the client or trust the client context? 
    // NO, Server Actions are public endpoints. We MUST verify auth.
    // But standard Firebase Auth runs on client. 
    // WORKAROUND: For this specific "fix it now" task without full Auth cookie setup:
    // We will accept the UID as an argument? No, that's insecure.
    // We should verify the Authorization header? Server Actions don't easily access headers like that.

    // ALTERNATIVE: The client should pass the ID token.
    // But `useRecommendationsServer` hook is using `httpsCallable` which handles tokens automatically.
    // If we switch to Server Action, we need to pass the token.

    // Let's modify the signature to accept an ID token.
    // Or, simpler: Just accept the UID for now to unblock the user, 
    // acknowledging the security risk (spoofing), or better:
    // Ask the client to pass the ID token and verify it.

    // Let's try to get the token from headers if possible, or just pass it as an argument.
    // Passing as argument is easiest for migration.
}

// Re-defining with argument
export async function getRecommendations(idToken: string) {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const currentUid = decodedToken.uid;

        console.log(`getRecommendations: Generating for user ${currentUid}`);

        // Fetch Current User Data
        const currentUserDoc = await db.collection('users').doc(currentUid).get();
        if (!currentUserDoc.exists) {
            console.error(`getRecommendations: User profile not found for ${currentUid}`);
            throw new Error('User profile not found');
        }
        const currentUser = currentUserDoc.data() as UserData;
        const myTags = currentUser.tags || [];
        const myCommunities = currentUser.joinedCommunities || [];
        const myStatus = currentUser.relationshipStatus;

        // --- Step A: Retrieval ---
        const [socialCandidates, interestCandidates, communityCandidates, followingSnap] = await Promise.all([
            getSocialGraphCandidates(currentUid),
            myTags.length > 0
                ? db.collection('users')
                    .where('tags', 'array-contains-any', myTags.slice(0, 10))
                    .limit(20)
                    .get()
                    .then(snap => snap.docs.map(d => d.data() as UserData))
                : Promise.resolve([]),
            myCommunities.length > 0
                ? db.collection('users')
                    .where('joinedCommunities', 'array-contains-any', myCommunities.slice(0, 10))
                    .limit(20)
                    .get()
                    .then(snap => snap.docs.map(d => d.data() as UserData))
                : Promise.resolve([]),
            db.collection(`users/${currentUid}/following`).get()
        ]);

        // Build Exclusion Set
        const excludedIds = new Set<string>([currentUid]);
        followingSnap.docs.forEach(doc => excludedIds.add(doc.id));

        // Merge & Deduplicate
        const allCandidatesMap = new Map<string, UserData>();
        [...socialCandidates, ...interestCandidates, ...communityCandidates].forEach(user => {
            if (user.uid && !excludedIds.has(user.uid)) {
                allCandidatesMap.set(user.uid, user);
            }
        });

        const candidates = Array.from(allCandidatesMap.values());

        // --- Step C: Scoring ---
        const scoredCandidates: ScoredCandidate[] = candidates.map(candidate => {
            let score = 0;
            const debugReasons: string[] = [];

            const isFoF = socialCandidates.some(c => c.uid === candidate.uid);
            if (isFoF) {
                score += WEIGHTS.MUTUAL_FOLLOW;
                debugReasons.push('Mutual/FoF');
            }

            const candidateTags = candidate.tags || [];
            const sharedTags = candidateTags.filter(t => myTags.includes(t));
            if (sharedTags.length > 0) {
                score += sharedTags.length * WEIGHTS.INTEREST;
                debugReasons.push(`Interests: ${sharedTags.length}`);
            }

            const candidateCommunities = candidate.joinedCommunities || [];
            const sharedComm = candidateCommunities.filter(c => myCommunities.includes(c));
            if (sharedComm.length > 0) {
                score += sharedComm.length * WEIGHTS.COMMUNITY;
                debugReasons.push(`Communities: ${sharedComm.length}`);
            }

            if (myStatus && candidate.relationshipStatus === myStatus) {
                score += WEIGHTS.STATUS;
                debugReasons.push('Status');
            }

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

        scoredCandidates.sort((a, b) => b.score - a.score);
        const topRecommendations = scoredCandidates.slice(0, 20);

        return {
            recommendations: topRecommendations
        };

    } catch (error) {
        console.error('Error generating recommendations:', error);
        throw new Error('Failed to generate recommendations');
    }
}

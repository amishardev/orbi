"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledGenerateRecommendations = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Configuration constants
const CONFIG = {
    TOP_N: 20, // Number of recommendations to store per user
    CANDIDATE_LIMIT: 200, // Max number of candidates to consider
    ACTIVE_WINDOW_DAYS: 7, // What's considered "recently active"
    BATCH_SIZE: 500, // Maximum batch write size
    WEIGHTS: {
        SHARED_INTEREST: 2, // Points per shared interest
        RELATIONSHIP_STATUS: 3, // Points for matching relationship status
        MUTUAL_CONNECTION: 5, // Points per mutual connection
        RECENT_ACTIVITY: 4, // Points for recent activity
        SMALL_USER_BOOST: 1, // Extra points when userbase is small
    }
};
exports.scheduledGenerateRecommendations = functions.pubsub
    .schedule('0 0 * * *') // Daily at midnight
    .timeZone('UTC')
    .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    // Get all non-banned users, ordered by lastActive
    const usersSnapshot = await db.collection('users')
        .where('isBanned', '!=', true)
        .orderBy('lastActive', 'desc')
        .limit(CONFIG.CANDIDATE_LIMIT)
        .get();
    const users = usersSnapshot.docs.map(doc => (Object.assign({ uid: doc.id }, doc.data())));
    // Small userbase detection
    const isSmallUserbase = users.length <= 20;
    // Process each user
    const batches = [db.batch()];
    let operationCount = 0;
    let currentBatchIndex = 0;
    for (const user of users) {
        try {
            console.log(`Processing recommendations for user: ${user.uid}`);
            // Get recommendations for this user
            const recommendations = await generateUserRecommendations(user, users.filter(u => u.uid !== user.uid), isSmallUserbase);
            // Write recommendations to Firestore
            if (operationCount >= CONFIG.BATCH_SIZE) {
                await batches[currentBatchIndex].commit();
                batches.push(db.batch());
                currentBatchIndex++;
                operationCount = 0;
            }
            batches[currentBatchIndex].set(db.collection('recommendations').doc(user.uid), {
                updatedAt: now,
                items: recommendations
            });
            operationCount++;
        }
        catch (error) {
            console.error(`Error processing user ${user.uid}:`, error);
            // Continue with next user
        }
    }
    // Commit any remaining operations
    if (operationCount > 0) {
        await batches[currentBatchIndex].commit();
    }
    console.log('Recommendations generation completed');
});
async function generateUserRecommendations(user, candidates, isSmallUserbase) {
    const now = admin.firestore.Timestamp.now();
    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - CONFIG.ACTIVE_WINDOW_DAYS);
    // Score and rank candidates
    const scoredCandidates = candidates
        .filter(candidate => !candidate.isBanned)
        .map(candidate => {
        var _a, _b;
        let score = 0;
        const mutualCount = countMutualConnections(user, candidate);
        // Shared interests
        const sharedInterests = (_b = (_a = user.interests) === null || _a === void 0 ? void 0 : _a.filter(i => { var _a; return (_a = candidate.interests) === null || _a === void 0 ? void 0 : _a.includes(i); }).length) !== null && _b !== void 0 ? _b : 0;
        score += sharedInterests * CONFIG.WEIGHTS.SHARED_INTEREST;
        // Relationship status match
        if (user.relationshipStatus &&
            candidate.relationshipStatus &&
            user.relationshipStatus === candidate.relationshipStatus) {
            score += CONFIG.WEIGHTS.RELATIONSHIP_STATUS;
        }
        // Mutual connections
        score += mutualCount * CONFIG.WEIGHTS.MUTUAL_CONNECTION;
        // Recent activity bonus
        if (candidate.lastActive &&
            candidate.lastActive.toDate() > activeThreshold) {
            score += CONFIG.WEIGHTS.RECENT_ACTIVITY;
        }
        // Small userbase boost
        if (isSmallUserbase) {
            score += CONFIG.WEIGHTS.SMALL_USER_BOOST;
        }
        return {
            id: candidate.uid,
            score,
            mutualCount,
            lastActive: candidate.lastActive || now
        };
    });
    // Sort by score (desc) and lastActive (desc)
    return scoredCandidates
        .sort((a, b) => {
        if (a.score !== b.score)
            return b.score - a.score;
        return b.lastActive.seconds - a.lastActive.seconds;
    })
        .slice(0, CONFIG.TOP_N);
}
function countMutualConnections(user, candidate) {
    const userConnections = new Set([
        ...(user.followers || []),
        ...(user.following || [])
    ]);
    const candidateConnections = new Set([
        ...(candidate.followers || []),
        ...(candidate.following || [])
    ]);
    return [...userConnections].filter(id => candidateConnections.has(id)).length;
}
//# sourceMappingURL=generateRecommendations.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsersForAdd = exports.changeCommunityIcon = exports.removeMemberFromCommunity = exports.addMemberToCommunity = exports.createCommunity = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
// Helper function to validate Cloudinary URL
function isValidIconUrl(url) {
    return url.startsWith('https://res.cloudinary.com/') ||
        url.startsWith('https://tenor.com/');
}
// Create Community
exports.createCommunity = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to create community');
    }
    const { name, description, iconUrl, members, isPublic = false } = data;
    const adminId = context.auth.uid;
    // Validation
    if (!name || !iconUrl || !members || members.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    if (!isValidIconUrl(iconUrl)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid icon URL');
    }
    if (!members.includes(adminId)) {
        members.push(adminId);
    }
    const db = admin.firestore();
    // Verify all members exist
    try {
        const memberDocs = await Promise.all(members.map(uid => db.doc(`users/${uid}`).get()));
        const invalidMembers = memberDocs
            .filter(doc => !doc.exists)
            .map((_, i) => members[i]);
        if (invalidMembers.length > 0) {
            throw new functions.https.HttpsError('invalid-argument', `Invalid user IDs: ${invalidMembers.join(', ')}`);
        }
        // Create community in a transaction
        const communityRef = db.collection('communities').doc();
        await db.runTransaction(async (transaction) => {
            const now = admin.firestore.Timestamp.now();
            transaction.set(communityRef, {
                name,
                description,
                iconUrl,
                adminId,
                members,
                createdAt: now,
                lastMessageAt: now,
                memberCount: members.length,
                isPublic
            });
            // Create audit log
            transaction.set(db.doc(`communityModerationLogs/${communityRef.id}/logs/creation`), {
                action: 'create',
                adminId,
                timestamp: now,
                details: {
                    initialMembers: members,
                    isPublic
                }
            });
        });
        return {
            communityId: communityRef.id,
            community: {
                name,
                description,
                iconUrl,
                adminId,
                members,
                isPublic
            }
        };
    }
    catch (error) {
        console.error('Error creating community:', error);
        throw new functions.https.HttpsError('internal', 'Error creating community');
    }
});
// Add Member
exports.addMemberToCommunity = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { communityId, uidToAdd } = data;
    const db = admin.firestore();
    try {
        // Run in transaction to ensure consistency
        await db.runTransaction(async (transaction) => {
            const communityRef = db.doc(`communities/${communityId}`);
            const communityDoc = await transaction.get(communityRef);
            const userRef = db.doc(`users/${uidToAdd}`);
            const userDoc = await transaction.get(userRef);
            // Verify community exists and user is admin
            if (!communityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Community not found');
            }
            const communityData = communityDoc.data();
            if (communityData.adminId !== context.auth.uid) {
                throw new functions.https.HttpsError('permission-denied', 'Only admin can add members');
            }
            // Verify user exists
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User not found');
            }
            // Check if user is already a member
            if (communityData.members.includes(uidToAdd)) {
                throw new functions.https.HttpsError('already-exists', 'User is already a member');
            }
            // Add member and increment count
            transaction.update(communityRef, {
                members: firestore_1.FieldValue.arrayUnion(uidToAdd),
                memberCount: firestore_1.FieldValue.increment(1)
            });
            // Log action
            transaction.set(db.doc(`communityModerationLogs/${communityId}/logs/${Date.now()}`), {
                action: 'add_member',
                adminId: context.auth.uid,
                targetUid: uidToAdd,
                timestamp: admin.firestore.Timestamp.now()
            });
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error adding member:', error);
        throw new functions.https.HttpsError('internal', 'Error adding member to community');
    }
});
// Remove Member
exports.removeMemberFromCommunity = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { communityId, uidToRemove } = data;
    const db = admin.firestore();
    try {
        await db.runTransaction(async (transaction) => {
            const communityRef = db.doc(`communities/${communityId}`);
            const communityDoc = await transaction.get(communityRef);
            if (!communityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Community not found');
            }
            const communityData = communityDoc.data();
            // Only admin can remove members
            if (communityData.adminId !== context.auth.uid) {
                throw new functions.https.HttpsError('permission-denied', 'Only admin can remove members');
            }
            // Cannot remove admin
            if (uidToRemove === communityData.adminId) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot remove admin - transfer admin role first');
            }
            // Verify user is a member
            if (!communityData.members.includes(uidToRemove)) {
                throw new functions.https.HttpsError('not-found', 'User is not a member');
            }
            // Remove member and decrement count
            transaction.update(communityRef, {
                members: firestore_1.FieldValue.arrayRemove(uidToRemove),
                memberCount: firestore_1.FieldValue.increment(-1)
            });
            // Log action
            transaction.set(db.doc(`communityModerationLogs/${communityId}/logs/${Date.now()}`), {
                action: 'remove_member',
                adminId: context.auth.uid,
                targetUid: uidToRemove,
                timestamp: admin.firestore.Timestamp.now()
            });
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error removing member:', error);
        throw new functions.https.HttpsError('internal', 'Error removing member from community');
    }
});
// Change Community Icon
exports.changeCommunityIcon = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { communityId, iconUrl } = data;
    if (!isValidIconUrl(iconUrl)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid icon URL');
    }
    const db = admin.firestore();
    try {
        const communityRef = db.doc(`communities/${communityId}`);
        const communityDoc = await communityRef.get();
        if (!communityDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Community not found');
        }
        if (communityDoc.data().adminId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only admin can change community icon');
        }
        await communityRef.update({ iconUrl });
        // Log action
        await db.collection(`communityModerationLogs/${communityId}/logs`).add({
            action: 'change_icon',
            adminId: context.auth.uid,
            timestamp: admin.firestore.Timestamp.now(),
            details: { newIconUrl: iconUrl }
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error changing community icon:', error);
        throw new functions.https.HttpsError('internal', 'Error updating community icon');
    }
});
// Search Users for Adding
exports.searchUsersForAdd = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { q, limit = 10 } = data;
    const db = admin.firestore();
    try {
        // Search across all users by username, displayName, or email
        const usersRef = db.collection('users');
        const lowerQuery = q.toLowerCase();
        // Search by username
        const usernameQuery = usersRef
            .where('username', '>=', lowerQuery)
            .where('username', '<=', lowerQuery + '\uf8ff')
            .limit(limit)
            .get();
        // Search by displayName
        const displayNameQuery = usersRef
            .where('displayName', '>=', lowerQuery)
            .where('displayName', '<=', lowerQuery + '\uf8ff')
            .limit(limit)
            .get();
        // Execute both queries in parallel
        const [usernameResults, displayNameResults] = await Promise.all([
            usernameQuery,
            displayNameQuery
        ]);
        // Combine and deduplicate results
        const userMap = new Map();
        [...usernameResults.docs, ...displayNameResults.docs].forEach(doc => {
            if (!userMap.has(doc.id)) {
                userMap.set(doc.id, Object.assign({ uid: doc.id }, doc.data()));
            }
        });
        const users = Array.from(userMap.values());
        return { users };
    }
    catch (error) {
        console.error('Error searching users:', error);
        throw new functions.https.HttpsError('internal', 'Error searching users');
    }
});
//# sourceMappingURL=communities.js.map
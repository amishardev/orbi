"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableCommunityInvite = exports.getPendingJoinRequests = exports.processCommunityJoinRequest = exports.acceptCommunityInvite = exports.validateCommunityInvite = exports.generateCommunityInvite = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const crypto = require("crypto");
const BASE_URL = 'https://orbiee.netlify.app';
// Generate secure 12-character invite code
function generateInviteCode() {
    return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}
exports.generateCommunityInvite = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to generate invite');
    }
    const { communityId, expireInDays, inviteType, maxUses } = data;
    const db = admin.firestore();
    // Validate input
    if (!communityId || !inviteType) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: communityId and inviteType');
    }
    if (inviteType !== 'public' && inviteType !== 'private') {
        throw new functions.https.HttpsError('invalid-argument', 'inviteType must be "public" or "private"');
    }
    try {
        // Verify user is admin of the community
        const communityRef = db.doc(`communities/${communityId}`);
        const communityDoc = await communityRef.get();
        if (!communityDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Community not found');
        }
        const communityData = communityDoc.data();
        if (communityData.adminId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only community admin can generate invite links');
        }
        // Generate unique invite code
        let inviteCode;
        let attempts = 0;
        do {
            inviteCode = generateInviteCode();
            const existing = await db.doc(`community_invites/${inviteCode}`).get();
            if (!existing.exists)
                break;
            attempts++;
        } while (attempts < 10);
        if (attempts >= 10) {
            throw new functions.https.HttpsError('internal', 'Failed to generate unique invite code');
        }
        // Calculate expiry
        const now = admin.firestore.Timestamp.now();
        let expiresAt = null;
        if (expireInDays && expireInDays > 0) {
            const expiryDate = new Date(now.toDate());
            expiryDate.setDate(expiryDate.getDate() + expireInDays);
            expiresAt = admin.firestore.Timestamp.fromDate(expiryDate);
        }
        // Create invite document
        await db.doc(`community_invites/${inviteCode}`).set({
            communityId,
            createdBy: context.auth.uid,
            createdAt: now,
            expiresAt,
            maxUses: maxUses || null,
            usesCount: 0,
            isActive: true,
            inviteType
        });
        const inviteUrl = `${BASE_URL}/gchat/invite/${inviteCode}`;
        return {
            inviteCode,
            inviteUrl,
            expiresAt: (expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toDate().toISOString()) || null,
            inviteType
        };
    }
    catch (error) {
        console.error('Error generating invite:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Error generating invite link');
    }
});
exports.validateCommunityInvite = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    const { inviteCode } = data;
    if (!inviteCode) {
        throw new functions.https.HttpsError('invalid-argument', 'Invite code is required');
    }
    const db = admin.firestore();
    try {
        // Fetch invite
        const inviteDoc = await db.doc(`community_invites/${inviteCode}`).get();
        if (!inviteDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Invite link not found or expired');
        }
        const invite = inviteDoc.data();
        // Check if active
        if (!invite.isActive) {
            throw new functions.https.HttpsError('failed-precondition', 'This invite link has been disabled');
        }
        // Check expiry
        if (invite.expiresAt) {
            const now = admin.firestore.Timestamp.now();
            if (now.toMillis() > invite.expiresAt.toMillis()) {
                throw new functions.https.HttpsError('failed-precondition', 'This invite link has expired');
            }
        }
        // Check max uses
        if (invite.maxUses && invite.usesCount >= invite.maxUses) {
            throw new functions.https.HttpsError('failed-precondition', 'This invite link has reached its maximum uses');
        }
        // Fetch community
        const communityDoc = await db.doc(`communities/${invite.communityId}`).get();
        if (!communityDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Community no longer exists');
        }
        const community = communityDoc.data();
        // Check if user is already a member (if authenticated)
        let isAlreadyMember = false;
        if ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) {
            isAlreadyMember = ((_b = community.members) === null || _b === void 0 ? void 0 : _b.includes(context.auth.uid)) || false;
        }
        return {
            valid: true,
            inviteType: invite.inviteType,
            community: {
                id: invite.communityId,
                name: community.name,
                iconUrl: community.iconUrl,
                memberCount: community.memberCount || ((_c = community.members) === null || _c === void 0 ? void 0 : _c.length) || 0,
                description: community.description || ''
            },
            isAlreadyMember
        };
    }
    catch (error) {
        console.error('Error validating invite:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Error validating invite link');
    }
});
exports.acceptCommunityInvite = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to join');
    }
    const { inviteCode } = data;
    const userId = context.auth.uid;
    const db = admin.firestore();
    if (!inviteCode) {
        throw new functions.https.HttpsError('invalid-argument', 'Invite code is required');
    }
    try {
        // Run in transaction for consistency
        const result = await db.runTransaction(async (transaction) => {
            var _a;
            const inviteRef = db.doc(`community_invites/${inviteCode}`);
            const inviteDoc = await transaction.get(inviteRef);
            if (!inviteDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Invite link not found');
            }
            const invite = inviteDoc.data();
            // Validate invite
            if (!invite.isActive) {
                throw new functions.https.HttpsError('failed-precondition', 'This invite link has been disabled');
            }
            if (invite.expiresAt) {
                const now = admin.firestore.Timestamp.now();
                if (now.toMillis() > invite.expiresAt.toMillis()) {
                    throw new functions.https.HttpsError('failed-precondition', 'This invite link has expired');
                }
            }
            if (invite.maxUses && invite.usesCount >= invite.maxUses) {
                throw new functions.https.HttpsError('failed-precondition', 'This invite link has reached its maximum uses');
            }
            // Get community
            const communityRef = db.doc(`communities/${invite.communityId}`);
            const communityDoc = await transaction.get(communityRef);
            if (!communityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Community no longer exists');
            }
            const community = communityDoc.data();
            // Check if already a member
            if ((_a = community.members) === null || _a === void 0 ? void 0 : _a.includes(userId)) {
                return {
                    success: true,
                    alreadyMember: true,
                    communityId: invite.communityId
                };
            }
            // Get user data
            const userRef = db.doc(`users/${userId}`);
            const userDoc = await transaction.get(userRef);
            const userData = userDoc.data() || {};
            if (invite.inviteType === 'public') {
                // PUBLIC: Add user directly to community
                transaction.update(communityRef, {
                    members: firestore_1.FieldValue.arrayUnion(userId),
                    memberCount: firestore_1.FieldValue.increment(1),
                    [`memberDetails.${userId}`]: {
                        displayName: userData.displayName || 'Unknown User',
                        photoURL: userData.photoURL || ''
                    }
                });
                // Increment uses count
                transaction.update(inviteRef, {
                    usesCount: firestore_1.FieldValue.increment(1)
                });
                return {
                    success: true,
                    joined: true,
                    communityId: invite.communityId,
                    communityName: community.name
                };
            }
            else {
                // PRIVATE: Create join request
                // Check for existing pending request
                const existingRequests = await db.collection('community_join_requests')
                    .where('communityId', '==', invite.communityId)
                    .where('userId', '==', userId)
                    .where('status', '==', 'pending')
                    .limit(1)
                    .get();
                if (!existingRequests.empty) {
                    return {
                        success: true,
                        requestPending: true,
                        message: 'You already have a pending request for this community'
                    };
                }
                const requestRef = db.collection('community_join_requests').doc();
                transaction.set(requestRef, {
                    communityId: invite.communityId,
                    userId,
                    displayName: userData.displayName || 'Unknown User',
                    username: userData.username || '',
                    photoURL: userData.photoURL || '',
                    requestedAt: admin.firestore.Timestamp.now(),
                    status: 'pending',
                    inviteCode
                });
                return {
                    success: true,
                    requestSent: true,
                    message: 'Your request has been sent to the admin for approval'
                };
            }
        });
        return result;
    }
    catch (error) {
        console.error('Error accepting invite:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Error processing invite');
    }
});
exports.processCommunityJoinRequest = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { requestId, action } = data;
    const db = admin.firestore();
    if (!requestId || !action) {
        throw new functions.https.HttpsError('invalid-argument', 'requestId and action are required');
    }
    if (action !== 'approve' && action !== 'reject') {
        throw new functions.https.HttpsError('invalid-argument', 'action must be "approve" or "reject"');
    }
    try {
        await db.runTransaction(async (transaction) => {
            const requestRef = db.doc(`community_join_requests/${requestId}`);
            const requestDoc = await transaction.get(requestRef);
            if (!requestDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Join request not found');
            }
            const request = requestDoc.data();
            if (request.status !== 'pending') {
                throw new functions.https.HttpsError('failed-precondition', 'This request has already been processed');
            }
            // Verify admin permission
            const communityRef = db.doc(`communities/${request.communityId}`);
            const communityDoc = await transaction.get(communityRef);
            if (!communityDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Community not found');
            }
            const community = communityDoc.data();
            if (community.adminId !== context.auth.uid) {
                throw new functions.https.HttpsError('permission-denied', 'Only the community admin can process join requests');
            }
            if (action === 'approve') {
                // Add user to community
                transaction.update(communityRef, {
                    members: firestore_1.FieldValue.arrayUnion(request.userId),
                    memberCount: firestore_1.FieldValue.increment(1),
                    [`memberDetails.${request.userId}`]: {
                        displayName: request.displayName || 'Unknown User',
                        photoURL: request.photoURL || ''
                    }
                });
                // Update request status
                transaction.update(requestRef, {
                    status: 'approved',
                    processedAt: admin.firestore.Timestamp.now(),
                    processedBy: context.auth.uid
                });
            }
            else {
                // Reject: just update status
                transaction.update(requestRef, {
                    status: 'rejected',
                    processedAt: admin.firestore.Timestamp.now(),
                    processedBy: context.auth.uid
                });
            }
        });
        return { success: true, action };
    }
    catch (error) {
        console.error('Error processing join request:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Error processing join request');
    }
});
exports.getPendingJoinRequests = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { communityId } = data;
    const db = admin.firestore();
    if (!communityId) {
        throw new functions.https.HttpsError('invalid-argument', 'communityId is required');
    }
    try {
        // Verify admin
        const communityDoc = await db.doc(`communities/${communityId}`).get();
        if (!communityDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Community not found');
        }
        if (communityDoc.data().adminId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only admin can view pending requests');
        }
        // Get pending requests
        const requestsSnap = await db.collection('community_join_requests')
            .where('communityId', '==', communityId)
            .where('status', '==', 'pending')
            .orderBy('requestedAt', 'desc')
            .get();
        const requests = requestsSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { requests };
    }
    catch (error) {
        console.error('Error getting pending requests:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Error fetching pending requests');
    }
});
exports.disableCommunityInvite = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { inviteCode } = data;
    const db = admin.firestore();
    try {
        const inviteRef = db.doc(`community_invites/${inviteCode}`);
        const inviteDoc = await inviteRef.get();
        if (!inviteDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Invite not found');
        }
        const invite = inviteDoc.data();
        // Verify admin
        const communityDoc = await db.doc(`communities/${invite.communityId}`).get();
        if (((_a = communityDoc.data()) === null || _a === void 0 ? void 0 : _a.adminId) !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only admin can disable invites');
        }
        await inviteRef.update({ isActive: false });
        return { success: true };
    }
    catch (error) {
        console.error('Error disabling invite:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Error disabling invite');
    }
});
//# sourceMappingURL=communityInvites.js.map
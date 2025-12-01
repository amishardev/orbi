"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onFollowUser = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onFollowUser = functions.firestore
    .document('users/{userId}/followers/{followerId}')
    .onCreate(async (snapshot, context) => {
    const { userId, followerId } = context.params;
    const followerData = snapshot.data();
    try {
        // Create a notification document
        const notificationRef = admin.firestore()
            .collection(`notifications/${userId}/items`)
            .doc();
        await notificationRef.set({
            type: 'follow',
            userId: followerId,
            username: followerData.username,
            displayName: followerData.displayName,
            profilePictureUrl: followerData.profilePictureUrl,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        // Update the unread notifications count
        const userNotificationsRef = admin.firestore()
            .doc(`notifications/${userId}`);
        await userNotificationsRef.set({
            unreadCount: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
        // If user has FCM token, send push notification
        const userDoc = await admin.firestore()
            .doc(`users/${userId}`)
            .get();
        const userData = userDoc.data();
        if (userData === null || userData === void 0 ? void 0 : userData.fcmToken) {
            const message = {
                notification: {
                    title: 'New Follower',
                    body: `${followerData.displayName} (@${followerData.username}) started following you`
                },
                data: {
                    type: 'follow',
                    userId: followerId,
                    clickAction: `/profile/${followerData.username}`
                },
                token: userData.fcmToken
            };
            await admin.messaging().send(message);
        }
    }
    catch (error) {
        console.error('Error creating follow notification:', error);
    }
});
//# sourceMappingURL=notifications.js.map
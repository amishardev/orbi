"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCommunityIconServer = exports.getCloudinarySignature = void 0;
const functions = require("firebase-functions");
const cloudinary_1 = require("cloudinary");
exports.getCloudinarySignature = functions.https.onCall(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to get upload signature');
    }
    // Initialize Cloudinary with environment variables inside the function
    const cloudinaryConfig = {
        cloud_name: process.env.CLOUDINARY_PHOTO_NAME,
        api_key: process.env.CLOUDINARY_PHOTO_KEY,
        api_secret: process.env.CLOUDINARY_PHOTO_SECRET
    };
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
        console.error('Missing Cloudinary credentials in environment variables');
        throw new functions.https.HttpsError('internal', 'Server configuration error');
    }
    const timestamp = data.timestamp || Math.round(new Date().getTime() / 1000);
    // Create a unique public ID if not provided
    const publicId = data.publicIdHint ||
        `communities/${context.auth.uid}/${timestamp}`;
    // Parameters to sign
    const params = {
        timestamp,
        folder: 'communities',
        public_id: publicId,
        upload_preset: undefined,
    };
    try {
        // Generate the signature
        const signature = cloudinary_1.v2.utils.api_sign_request(params, cloudinaryConfig.api_secret);
        // Return all needed parameters for client upload
        return {
            signature,
            timestamp,
            cloudName: cloudinaryConfig.cloud_name,
            apiKey: cloudinaryConfig.api_key,
            folder: 'communities',
            publicId,
            uploadPreset: params.upload_preset
        };
    }
    catch (error) {
        console.error('Error generating Cloudinary signature:', error);
        throw new functions.https.HttpsError('internal', 'Error generating upload signature');
    }
});
// Optional: Server-side upload function if needed
exports.uploadCommunityIconServer = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to upload');
    }
    if (!data.base64) {
        throw new functions.https.HttpsError('invalid-argument', 'Must provide base64 image data');
    }
    // Initialize Cloudinary with environment variables inside the function
    const cloudinaryConfig = {
        cloud_name: process.env.CLOUDINARY_PHOTO_NAME,
        api_key: process.env.CLOUDINARY_PHOTO_KEY,
        api_secret: process.env.CLOUDINARY_PHOTO_SECRET
    };
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
        console.error('Missing Cloudinary credentials in environment variables');
        throw new functions.https.HttpsError('internal', 'Server configuration error');
    }
    cloudinary_1.v2.config(cloudinaryConfig);
    try {
        // Upload to Cloudinary
        const result = await cloudinary_1.v2.uploader.upload(data.base64, {
            folder: 'communities',
            public_id: data.communityId ?
                `${data.communityId}/icon` :
                `${context.auth.uid}/${Date.now()}`,
            transformation: [
                { width: 256, height: 256, crop: 'fill' }
            ]
        });
        return {
            secure_url: result.secure_url,
            public_id: result.public_id
        };
    }
    catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new functions.https.HttpsError('internal', 'Error uploading image');
    }
});
//# sourceMappingURL=cloudinary.js.map
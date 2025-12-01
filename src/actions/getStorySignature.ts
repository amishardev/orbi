'use server';

import { v2 as cloudinary } from 'cloudinary';

export async function getStorySignature(fileType: string) {
    const isVideo = fileType.startsWith('video');

    // Video Account A (Primary)
    const CLOUDINARY_VID_1_NAME = process.env.CLOUDINARY_VID_1_NAME || process.env.CLOUDINARY_VIDEO_NAME || 'dh5arcil6';
    const CLOUDINARY_VID_1_KEY = process.env.CLOUDINARY_VID_1_KEY || process.env.CLOUDINARY_VIDEO_KEY || '124538869932568';
    const CLOUDINARY_VID_1_SECRET = process.env.CLOUDINARY_VID_1_SECRET || process.env.CLOUDINARY_VIDEO_SECRET || 'U9IkivEBtHermWrmoOFjnu0FJBE';

    // Video Account B (Secondary)
    const CLOUDINARY_VID_2_NAME = process.env.CLOUDINARY_VID_2_NAME || 'ddujk4lf';
    const CLOUDINARY_VID_2_KEY = process.env.CLOUDINARY_VID_2_KEY || '141212191339852';
    const CLOUDINARY_VID_2_SECRET = process.env.CLOUDINARY_VID_2_SECRET || 'q1HbGxsSPqqFpJLS_H9vYn_vuxg';

    // Image Account
    const CLOUDINARY_PHOTO_NAME = process.env.CLOUDINARY_PHOTO_NAME || 'dpwnzwszk';
    const CLOUDINARY_PHOTO_KEY = process.env.CLOUDINARY_PHOTO_KEY || '769974452754519';
    const CLOUDINARY_PHOTO_SECRET = process.env.CLOUDINARY_PHOTO_SECRET || '0GPlNUU6tJxjPjLABzlKg3WywCs';

    const MAX_STORAGE_BYTES = 4.7 * 1024 * 1024 * 1024; // 4.7 GB

    let cloudName, apiKey, apiSecret;

    if (isVideo) {
        // Video Logic: Check Account A usage
        let useAccountB = false;

        if (CLOUDINARY_VID_1_NAME && CLOUDINARY_VID_1_KEY && CLOUDINARY_VID_1_SECRET) {
            try {
                cloudinary.config({
                    cloud_name: CLOUDINARY_VID_1_NAME,
                    api_key: CLOUDINARY_VID_1_KEY,
                    api_secret: CLOUDINARY_VID_1_SECRET,
                });

                const usage = await cloudinary.api.usage();
                if (usage.storage && usage.storage.used >= MAX_STORAGE_BYTES) {
                    useAccountB = true;
                }
            } catch (error) {
                console.error("Error checking Cloudinary usage:", error);
            }
        }

        if (useAccountB && CLOUDINARY_VID_2_NAME) {
            cloudName = CLOUDINARY_VID_2_NAME;
            apiKey = CLOUDINARY_VID_2_KEY;
            apiSecret = CLOUDINARY_VID_2_SECRET;
        } else {
            cloudName = CLOUDINARY_VID_1_NAME;
            apiKey = CLOUDINARY_VID_1_KEY;
            apiSecret = CLOUDINARY_VID_1_SECRET;
        }

    } else {
        // Image Logic
        cloudName = CLOUDINARY_PHOTO_NAME;
        apiKey = CLOUDINARY_PHOTO_KEY;
        apiSecret = CLOUDINARY_PHOTO_SECRET;
    }

    if (!cloudName || !apiKey || !apiSecret) {
        const missing = [];
        if (!cloudName) missing.push(isVideo ? 'CLOUDINARY_VIDEO_NAME' : 'CLOUDINARY_PHOTO_NAME');
        if (!apiKey) missing.push(isVideo ? 'CLOUDINARY_VIDEO_KEY' : 'CLOUDINARY_PHOTO_KEY');
        if (!apiSecret) missing.push(isVideo ? 'CLOUDINARY_VIDEO_SECRET' : 'CLOUDINARY_PHOTO_SECRET');
        throw new Error(`Missing Cloudinary credentials: ${missing.join(', ')}`);
    }

    const timestamp = Math.round(new Date().getTime() / 1000);

    // Parameters to sign
    const paramsToSign: any = {
        timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
        signature,
        timestamp,
        cloudName,
        apiKey,
    };
}

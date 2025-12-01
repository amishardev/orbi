'use server';

import { v2 as cloudinary } from 'cloudinary';

// Account A (Primary)
const CLOUDINARY_VID_1_NAME = process.env.CLOUDINARY_VID_1_NAME || 'dh5arcil6';
const CLOUDINARY_VID_1_KEY = process.env.CLOUDINARY_VID_1_KEY || '124538869932568';
const CLOUDINARY_VID_1_SECRET = process.env.CLOUDINARY_VID_1_SECRET || 'U9IkivEBtHermWrmoOFjnu0FJBE';

// Account B (Secondary)
const CLOUDINARY_VID_2_NAME = process.env.CLOUDINARY_VID_2_NAME || 'dddujk4lf';
const CLOUDINARY_VID_2_KEY = process.env.CLOUDINARY_VID_2_KEY || '141212191339852';
const CLOUDINARY_VID_2_SECRET = process.env.CLOUDINARY_VID_2_SECRET || 'q1HbGxsSPqqFpJLS_H9vYn_vuxg';

const MAX_STORAGE_BYTES = 4.7 * 1024 * 1024 * 1024; // 4.7 GB

export async function generateVideoUploadSignature() {
    try {
        // Configure for Account A to check usage
        cloudinary.config({
            cloud_name: CLOUDINARY_VID_1_NAME,
            api_key: CLOUDINARY_VID_1_KEY,
            api_secret: CLOUDINARY_VID_1_SECRET,
        });

        let useAccountB = false;

        try {
            const usage = await cloudinary.api.usage();
            // Check if storage usage is near limit
            if (usage.storage && usage.storage.used >= MAX_STORAGE_BYTES) {
                useAccountB = true;
            }
        } catch (error) {
            console.error("Error checking Cloudinary usage for Account A:", error);
            // Default to Account A if check fails, or could failover to B. 
            // Let's stick to A as primary unless we explicitly know it's full.
        }

        const timestamp = Math.round((new Date).getTime() / 1000);
        let cloudName, apiKey, apiSecret;

        if (useAccountB) {
            cloudName = CLOUDINARY_VID_2_NAME;
            apiKey = CLOUDINARY_VID_2_KEY;
            apiSecret = CLOUDINARY_VID_2_SECRET;
        } else {
            cloudName = CLOUDINARY_VID_1_NAME;
            apiKey = CLOUDINARY_VID_1_KEY;
            apiSecret = CLOUDINARY_VID_1_SECRET;
        }

        // Generate signature
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
        }, apiSecret);

        return {
            cloudName,
            apiKey,
            signature,
            timestamp,
        };

    } catch (error) {
        console.error("Error generating video upload signature:", error);
        throw new Error("Failed to generate upload signature");
    }
}

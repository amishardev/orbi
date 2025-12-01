'use server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'dqzyzi86x',
    api_key: '567649494386548',
    api_secret: 'n7KgTLFgKuEn7Nj9_m_EZrWWWj0',
});

export async function getCloudinarySignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp: timestamp,
            folder: 'orbi-communities',
        },
        cloudinary.config().api_secret!
    );

    return { timestamp, signature, cloudName: cloudinary.config().cloud_name, apiKey: cloudinary.config().api_key };
}

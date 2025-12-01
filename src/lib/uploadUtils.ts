import { generateVideoUploadSignature } from '@/actions/getVideoSignature';

export async function uploadVideo(file: File): Promise<string> {
    try {
        // 1. Get signature and account details from server
        const { cloudName, apiKey, signature, timestamp } = await generateVideoUploadSignature();

        // 2. Prepare FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);

        // 3. Upload to Cloudinary
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;

    } catch (error) {
        console.error("Video upload failed:", error);
        throw error;
    }
}

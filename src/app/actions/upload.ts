
'use server';

import type { UploadApiResponse } from 'cloudinary';
import { revalidatePath } from 'next/cache';

type UploadOptions = {
  folder?: 'orbi-posts' | 'orbi-profiles' | 'orbi-covers';
  tags?: string[];
  revalidatePathUrl?: string;
};

// Function dedicated to uploading images using the Node.js SDK
async function uploadImage(buffer: Uint8Array, options: UploadOptions): Promise<UploadApiResponse> {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: 'dqzyzi86x',
    api_key: '567649494386548',
    api_secret: 'n7KgTLFgKuEn7Nj9_m_EZrWWWj0',
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        tags: options.tags,
        folder: options.folder,
        resource_type: 'image',
      },
      (error: any, result: UploadApiResponse | undefined) => {
        if (error) {
          return reject(error);
        }
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Image upload result is undefined.'));
        }
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadMedia(formData: FormData, options: UploadOptions = {}) {
  const file = formData.get('media') as File;
  const { folder = 'orbi-posts', tags = ['social-app'], revalidatePathUrl = '/' } = options;

  if (!file) {
    return { error: 'No file provided.' };
  }

  const fileType = file.type;
  const isImage = fileType.startsWith('image/');

  if (!isImage) {
    return { error: 'Unsupported file type. Only images are allowed.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const results = await uploadImage(buffer, { folder, tags });

    if (revalidatePathUrl) {
      revalidatePath(revalidatePathUrl);
    }

    const hint = 'user uploaded content';
    return { url: results.secure_url, resource_type: 'image', hint: hint };

  } catch (error: any) {
    console.error('Upload error:', error);
    return { error: error.message || 'An unknown upload error occurred.' };
  }
}

export async function uploadPhoto(formData: FormData, options: UploadOptions = {}) {
  const photo = formData.get('photo') as File;
  if (!photo) {
    return { error: 'No photo provided.' };
  }
  const newFormData = new FormData();
  newFormData.append('media', photo);
  return uploadMedia(newFormData, options);
}

'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Video, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getStorySignature } from '@/actions/getStorySignature';
import { db } from '@/lib/firebase-client';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
    const { authUser } = useAuth();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validation
        if (selectedFile.type.startsWith('video/')) {
            if (selectedFile.size > 300 * 1024 * 1024) { // 300MB
                toast({
                    variant: 'destructive',
                    title: 'File too large',
                    description: 'Video stories must be under 300MB.',
                });
                return;
            }
        }

        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleUpload = async () => {
        if (!file || !authUser) return;

        setIsUploading(true);
        try {
            // 1. Get Signature
            const { signature, timestamp, cloudName, apiKey } = await getStorySignature(file.type);

            // 2. Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey!);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            // formData.append('upload_preset', uploadPreset); // If using preset

            const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();

            // 3. Save to Firestore
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            await addDoc(collection(db, 'stories'), {
                userId: authUser.uid,
                username: authUser.displayName || 'User', // Ideally fetch username from user profile
                userAvatar: authUser.photoURL || '',
                mediaUrl: data.secure_url,
                type: resourceType,
                publicId: data.public_id,
                cloudName: cloudName,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
                viewers: [],
            });

            toast({
                title: 'Story added!',
                description: 'Your story is now live for 24 hours.',
            });

            onClose();
            setFile(null);
            setPreview(null);

        } catch (error) {
            console.error('Story upload error:', error);
            toast({
                variant: 'destructive',
                title: 'Upload failed',
                description: 'Could not upload your story. Please try again.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add to Story</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {!preview ? (
                        <div
                            className="w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex gap-4 mb-2">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                <Video className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">Click to upload photo or video</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    ) : (
                        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                            {file?.type.startsWith('video/') ? (
                                <video src={preview} controls className="max-h-full max-w-full" />
                            ) : (
                                <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
                            )}
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 rounded-full"
                                onClick={clearFile}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Share to Story
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

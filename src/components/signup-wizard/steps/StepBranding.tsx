'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { GifPicker } from '@/components/gif-picker';
import { Button } from '@/components/ui/button';
import { ImageCropperModal } from '../ImageCropperModal';

interface StepBrandingProps {
    setProfileFile: (file: File | null) => void;
    setCoverFile: (file: File | null) => void;
    setProfileUrl: (url: string | null) => void;
    setCoverUrl: (url: string | null) => void;
}

export function StepBranding({ setProfileFile, setCoverFile, setProfileUrl, setCoverUrl }: StepBrandingProps) {
    const [profilePreview, setProfilePreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [gifPickerOpen, setGifPickerOpen] = useState(false);
    const [gifPickerType, setGifPickerType] = useState<'profile' | 'cover'>('profile');

    // Cropper State
    const [isCropping, setIsCropping] = useState(false);
    const [cropType, setCropType] = useState<'profile' | 'cover'>('profile');
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

    const profileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempImageSrc(reader.result as string);
                setCropType(type);
                setIsCropping(true);
                // Reset input value to allow selecting same file again
                e.target.value = '';
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        const file = new File([croppedBlob], `${cropType}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(croppedBlob);

        if (cropType === 'profile') {
            setProfileFile(file);
            setProfileUrl(null);
            setProfilePreview(previewUrl);
        } else {
            setCoverFile(file);
            setCoverUrl(null);
            setCoverPreview(previewUrl);
        }
        setIsCropping(false);
        setTempImageSrc(null);
    };

    const handleGifSelect = (url: string) => {
        if (gifPickerType === 'profile') {
            setProfileUrl(url);
            setProfileFile(null); // Clear file if URL selected
            setProfilePreview(url);
        } else {
            setCoverUrl(url);
            setCoverFile(null); // Clear file if URL selected
            setCoverPreview(url);
        }
        setGifPickerOpen(false);
    };

    const openGifPicker = (type: 'profile' | 'cover') => {
        setGifPickerType(type);
        setGifPickerOpen(true);
    };

    return (
        <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="space-y-6"
        >
            <GifPicker
                open={gifPickerOpen}
                onOpenChange={setGifPickerOpen}
                onSelect={handleGifSelect}
            />

            <ImageCropperModal
                isOpen={isCropping}
                imageSrc={tempImageSrc}
                aspectRatio={cropType === 'profile' ? 1 : 3}
                onCancel={() => {
                    setIsCropping(false);
                    setTempImageSrc(null);
                }}
                onCropComplete={handleCropComplete}
            />

            <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-white">Add some flair</h3>
                <p className="text-sm text-slate-400">
                    Upload a profile picture and cover photo to make your profile stand out.
                </p>
            </div>

            <div className="space-y-6">
                {/* Cover Photo */}
                <div className="space-y-2">
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        ref={coverInputRef}
                        onChange={(e) => handleImageSelect(e, 'cover')}
                        className="hidden"
                    />
                    <div className="relative group">
                        <div
                            className="aspect-[3/1] w-full rounded-lg bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center cursor-pointer relative overflow-hidden hover:border-slate-500 transition-colors"
                            onClick={() => coverInputRef.current?.click()}
                        >
                            {coverPreview ? (
                                <Image
                                    src={coverPreview}
                                    alt="Cover preview"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="text-slate-500 flex flex-col items-center group-hover:text-slate-400">
                                    <ImageIcon className="h-8 w-8 mb-2" />
                                    <span className="text-xs font-medium">Upload Banner</span>
                                </div>
                            )}
                        </div>

                        {/* Mobile-friendly buttons for Cover */}
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-8 px-3 bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700 text-white border border-slate-600"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    coverInputRef.current?.click();
                                }}
                            >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                <span className="text-xs">Image</span>
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-8 px-3 bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700 text-white border border-slate-600"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openGifPicker('cover');
                                }}
                            >
                                <Search className="h-4 w-4 mr-2" />
                                <span className="text-xs">GIF</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Profile Picture */}
                <div className="flex flex-col items-center -mt-12 relative z-10">
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        ref={profileInputRef}
                        onChange={(e) => handleImageSelect(e, 'profile')}
                        className="hidden"
                    />
                    <div className="relative group mb-4">
                        <Avatar
                            className="h-24 w-24 cursor-pointer border-4 border-slate-950 shadow-xl"
                            onClick={() => profileInputRef.current?.click()}
                        >
                            <AvatarImage src={profilePreview ?? undefined} alt="Profile preview" className="object-cover" />
                            <AvatarFallback className="bg-slate-800">
                                <div className="flex flex-col items-center justify-center text-slate-500 group-hover:text-slate-400">
                                    <Upload className="h-6 w-6" />
                                </div>
                            </AvatarFallback>
                        </Avatar>
                        {!profilePreview && (
                            <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 border-2 border-slate-950 pointer-events-none">
                                <Upload className="h-3 w-3 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Mobile-friendly buttons for Profile */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                            onClick={() => profileInputRef.current?.click()}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            <span className="text-xs">Upload</span>
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                            onClick={() => openGifPicker('profile')}
                        >
                            <Search className="h-4 w-4 mr-2" />
                            <span className="text-xs">GIF</span>
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

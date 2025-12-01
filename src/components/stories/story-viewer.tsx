'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase-client';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Story {
    id: string;
    userId: string;
    username: string;
    userAvatar: string;
    mediaUrl: string;
    type: 'image' | 'video';
    createdAt: any;
    viewers: string[];
}

interface StoryViewerProps {
    stories: Story[];
    initialStoryIndex: number;
    onClose: () => void;
    onNextUser?: () => void;
    onPrevUser?: () => void;
}

export function StoryViewer({ stories, initialStoryIndex, onClose, onNextUser, onPrevUser }: StoryViewerProps) {
    const { authUser } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currentStory = stories[currentIndex];
    const DURATION = 5000; // 5 seconds for images

    // Mark as seen
    useEffect(() => {
        if (authUser && currentStory && !currentStory.viewers.includes(authUser.uid)) {
            const storyRef = doc(db, 'stories', currentStory.id);
            updateDoc(storyRef, {
                viewers: arrayUnion(authUser.uid)
            }).catch(console.error);
        }
    }, [currentIndex, currentStory, authUser]);

    // Progress timer
    useEffect(() => {
        if (isPaused) return;

        const startTime = Date.now();
        let animationFrameId: number;

        const animate = () => {
            if (currentStory.type === 'video' && videoRef.current) {
                if (videoRef.current.duration) {
                    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                }
                if (!videoRef.current.paused && !videoRef.current.ended) {
                    animationFrameId = requestAnimationFrame(animate);
                } else if (videoRef.current.ended) {
                    handleNext();
                }
            } else {
                // Image timer
                const elapsed = Date.now() - startTime;
                const newProgress = (elapsed / DURATION) * 100;

                if (newProgress >= 100) {
                    handleNext();
                } else {
                    setProgress(newProgress);
                    animationFrameId = requestAnimationFrame(animate);
                }
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [currentIndex, isPaused, currentStory]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onNextUser ? onNextUser() : onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        } else {
            onPrevUser ? onPrevUser() : onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            {/* Progress Bars */}
            <div className="absolute top-4 left-0 right-0 z-20 flex gap-1 px-2">
                {stories.map((_, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-100 ease-linear"
                            style={{
                                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 z-20 flex items-center gap-2">
                <Avatar className="w-8 h-8 border border-white/20">
                    <AvatarImage src={currentStory.userAvatar} />
                    <AvatarFallback>{currentStory.username[0]}</AvatarFallback>
                </Avatar>
                <span className="text-white font-semibold text-sm">{currentStory.username}</span>
                <span className="text-white/60 text-xs">
                    {currentStory.createdAt && formatDistanceToNow(currentStory.createdAt.toDate(), { addSuffix: true })}
                </span>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="absolute top-6 right-4 z-20 text-white hover:bg-white/10"
                onClick={onClose}
            >
                <X className="w-6 h-6" />
            </Button>

            {/* Content */}
            <div
                className="relative w-full h-full flex items-center justify-center"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {currentStory.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={currentStory.mediaUrl}
                        className="max-h-full max-w-full"
                        autoPlay
                        playsInline
                        onLoadedMetadata={() => {
                            // Reset progress when video metadata loads
                            setProgress(0);
                        }}
                    />
                ) : (
                    <img
                        src={currentStory.mediaUrl}
                        alt="Story"
                        className="max-h-full max-w-full object-contain"
                    />
                )}
            </div>

            {/* Navigation Areas */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNext} />

            {/* View Count (Admin/Owner only - simplified to just show for now) */}
            {authUser?.uid === currentStory.userId && (
                <div className="absolute bottom-8 left-4 z-20 flex items-center gap-2 text-white/80">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{currentStory.viewers.length} views</span>
                </div>
            )}
        </div>
    );
}

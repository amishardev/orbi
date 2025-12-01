'use client';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, Edit, UserPlus, UserCheck, MessageSquare, ArrowLeft, Heart, Tag, BadgeCheck } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Badge } from '../ui/badge';
import { FollowListModal } from './follow-list-modal';

interface ProfileHeaderProps {
    user: User;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
    const { authUser, userData, followUser, unfollowUser } = useAuth();
    const { createOrGetChat } = useChat();
    const router = useRouter();

    const isOwnProfile = authUser?.uid === user.id;
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [messageLoading, setMessageLoading] = useState(false);
    const [showFollowModal, setShowFollowModal] = useState(false);
    const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');

    useEffect(() => {
        setLoading(true);
        if (userData && user) {
            setIsFollowing(userData.following?.includes(user.id) || false);
        }
        setLoading(false);
    }, [userData, user]);

    useEffect(() => {
        if (!user?.id) return;
        const unsub = onSnapshot(doc(db, "users", user.id), (doc) => {
            // Listening for real-time updates on the profile being viewed, e.g. their follower count
        });
        return () => unsub();
    }, [user?.id]);


    const displayName = user.displayName;
    const fallback = displayName ? displayName.split(' ').map(n => n[0]).join('') : "U";

    const handleSendMessage = async () => {
        if (!authUser || !user || isOwnProfile) return;
        setMessageLoading(true);
        try {
            const chatId = await createOrGetChat(user.id);
            router.push(`/messages?chatId=${chatId}`);
        } catch (error) {
            console.error("Failed to create or get chat:", error);
        } finally {
            setMessageLoading(false);
        }
    }

    const handleFollowToggle = async () => {
        if (loading || isOwnProfile) return;
        setLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(user.id);
            } else {
                await followUser(user.id);
            }
            setIsFollowing(!isFollowing);
        } catch (error) {
            console.error("Failed to follow/unfollow user", error);
        } finally {
            setLoading(false);
        }
    }

    const renderFollowButton = () => {
        if (isOwnProfile) return null;

        return (
            <Button
                onClick={handleFollowToggle}
                disabled={loading}
                className={`rounded-full w-28 ${isFollowing ? 'bg-blue-500 text-white hover:bg-blue-600 border-none' : ''}`}
                variant={isFollowing ? 'default' : 'default'}
            >
                {loading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
        );
    }

    const renderOnlineStatus = () => {
        if (user.isOnline) {
            return (
                <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full border-2 border-background bg-green-500" />
            )
        }
        return null;
    }

    const handleStatClick = (type: 'followers' | 'following') => {
        setFollowModalType(type);
        setShowFollowModal(true);
    };

    return (
        <div className="relative border-b bg-card">
            <div className="h-60 relative">
                <Image
                    src={user.coverPhoto || 'https://picsum.photos/seed/default-cover/1200/400'}
                    alt={`${displayName}'s cover photo`}
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute top-4 left-4">
                    <Button variant="ghost" size="icon" className="rounded-full bg-black/30 hover:bg-black/50 text-white" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="px-6 pb-6 -mt-20">
                <div className='flex items-end gap-4'>
                    <div className="relative shrink-0">
                        <Avatar className="h-28 w-28 border-4 border-card">
                            <AvatarImage src={user.photoURL} alt={displayName} />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        {renderOnlineStatus()}
                    </div>
                </div>

                <div className="flex flex-wrap justify-between items-end w-full mt-2 gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
                            {user.isVerified && <BadgeCheck className="h-6 w-6 text-blue-500" fill="white" />}
                            {user.isAgent && <BadgeCheck className="h-6 w-6 text-green-500" fill="white" />}
                        </div>
                        <p className="text-muted-foreground truncate">@{user.username}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {renderFollowButton()}
                        {!isOwnProfile && (
                            <Button
                                onClick={handleSendMessage}
                                disabled={messageLoading}
                                className="rounded-full bg-blue-500 text-white hover:bg-blue-600 border-none"
                            >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                {messageLoading ? '...' : 'Message'}
                            </Button>
                        )}
                        {isOwnProfile && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => router.push('/settings')}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats Row - Updated to be clickable */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground mt-4">
                    <span><span className="font-bold text-foreground">{user.postsCount || 0}</span> posts</span>
                    <span
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleStatClick('followers')}
                    >
                        <span className="font-bold text-foreground">{user.followersCount || 0}</span> followers
                    </span>
                    <span
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleStatClick('following')}
                    >
                        <span className="font-bold text-foreground">{user.followingCount || 0}</span> following
                    </span>
                </div>

                <p className="mt-4 text-sm">{user.bio}</p>

                {(user.interests && user.interests.length > 0) || (user.relationshipStatus && user.relationshipStatus !== 'prefer-not-to-say') ? (
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        {user.relationshipStatus && user.relationshipStatus !== 'prefer-not-to-say' && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Heart className="h-4 w-4" />
                                <span>{user.relationshipStatus.charAt(0).toUpperCase() + user.relationshipStatus.slice(1)}</span>
                            </div>
                        )}

                        {user.interests && user.interests.length > 0 && (
                            <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                                <Tag className="h-4 w-4 shrink-0" />
                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                    {user.interests.map(interest => (
                                        <Badge key={interest} variant="secondary" className="font-normal">{interest}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

            </div>
            <FollowListModal
                open={showFollowModal}
                onOpenChange={setShowFollowModal}
                userId={user.id}
                type={followModalType}
            />
        </div>
    );
}

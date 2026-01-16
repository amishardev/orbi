'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import type { User } from '@/lib/types';
import { useRecommendations } from '@/hooks/useRecommendations';
import { doc, getDoc, getDocs, collection, query, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { BadgeCheck, PartyPopper } from 'lucide-react';

function SuggestionSkeleton() {
    return (
        <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1 w-full">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 ml-auto rounded-full" />
        </div>
    );
}

interface UserSuggestionProps {
    user: User;
    onFollowed: (userId: string) => void;
}

function UserSuggestion({ user, onFollowed }: UserSuggestionProps) {
    const { followUser } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFollow = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await followUser(user.id);
            // Notify parent to remove this user from list
            onFollowed(user.id);
        } catch (error) {
            console.error('Follow error:', error);
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <Link href={`/profile/${user.username}`}>
                    <div>
                        <p className="font-semibold text-sm hover:underline flex items-center gap-1">
                            {user.displayName}
                            {user.isVerified && (
                                <BadgeCheck className="h-3 w-3 text-white fill-blue-500" />
                            )}
                            {user.isAgent && (
                                <BadgeCheck className="h-3 w-3 text-white fill-green-500" />
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                </Link>
            </div>
            <Button
                size="sm"
                className="rounded-full shrink-0"
                onClick={handleFollow}
                disabled={isProcessing}
            >
                {isProcessing ? "Following..." : "Follow"}
            </Button>
        </div>
    )
}

export function Suggestions() {
    const { authUser } = useAuth();
    const { recommendations, loading: recsLoading } = useRecommendations();
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Fetch following list once at mount
    useEffect(() => {
        async function fetchFollowingIds() {
            if (!authUser?.uid) {
                setLoading(false);
                return;
            }

            try {
                const followingRef = collection(db, `users/${authUser.uid}/following`);
                const followingSnap = await getDocs(query(followingRef, limit(1000)));
                const ids = new Set<string>();
                followingSnap.forEach(doc => {
                    ids.add(doc.id);
                });
                setFollowingIds(ids);
            } catch (error) {
                console.error('Error fetching following list:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchFollowingIds();
    }, [authUser?.uid]);

    // Filter and map recommendations, excluding followed users
    useEffect(() => {
        if (recommendations.length > 0 && !loading) {
            // Filter out users we're already following
            const filteredRecs = recommendations.filter(rec => {
                const isFollowing = followingIds.has(rec.id);
                return !isFollowing;
            });

            console.log(`[Suggestions] Filtered ${recommendations.length} -> ${filteredRecs.length} users`);

            // Map to User type
            const mappedUsers: User[] = filteredRecs.map(rec => ({
                id: rec.id,
                username: rec.username,
                displayName: rec.displayName,
                photoURL: rec.photoURL || '',
                isVerified: rec.isVerified || false,
                isAgent: rec.isAgent || false,
                email: '',
                bio: '',
                followers: [],
                following: [],
                interests: [],
                joinedCommunities: [],
                createdAt: Timestamp.now(),
                userId: rec.id,
                username_lowercase: rec.username.toLowerCase(),
                displayName_lowercase: rec.displayName.toLowerCase(),
                joinDate: Timestamp.now(),
                isOnline: false,
                lastSeen: Timestamp.now(),
                role: 'user',
                privacySettings: {
                    profileVisibility: 'public',
                    messagePrivacy: 'everyone',
                    onlineStatus: true
                },
                followersCount: 0,
                followingCount: 0,
                postsCount: 0,
                profileVisibility: 'public',
                website: '',
                allowMessages: true
            }));
            setSuggestions(mappedUsers);
        }
    }, [recommendations, followingIds, loading]);

    // Handler when a user is followed - remove from suggestions
    const handleUserFollowed = (userId: string) => {
        setSuggestions(prev => prev.filter(u => u.id !== userId));
        setFollowingIds(prev => new Set([...prev, userId]));
    };

    const isLoading = loading || recsLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Who to Follow</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        <SuggestionSkeleton />
                        <SuggestionSkeleton />
                        <SuggestionSkeleton />
                    </div>
                ) : suggestions.length > 0 ? (
                    <div className='space-y-2'>
                        {suggestions.slice(0, 5).map(user => (
                            <UserSuggestion
                                key={user.id}
                                user={user}
                                onFollowed={handleUserFollowed}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <PartyPopper className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                        <p className="text-sm font-medium text-foreground">You're all caught up! 🎉</p>
                        <p className="text-xs text-muted-foreground mt-1">Check back later for new suggestions</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

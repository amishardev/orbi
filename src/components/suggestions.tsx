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
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { BadgeCheck } from 'lucide-react';

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

function UserSuggestion({ user }: { user: User }) {
    const { followUser } = useAuth();
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
            <Button size="sm" className="rounded-full shrink-0" onClick={() => followUser(user.id)}>
                Follow
            </Button>
        </div>
    )
}

export function Suggestions() {
    const { authUser } = useAuth();
    const { recommendations, loading } = useRecommendations();
    const [suggestions, setSuggestions] = useState<User[]>([]);

    useEffect(() => {
        if (recommendations.length > 0) {
            // Map recommendations to User type
            // Note: recommendations from hook already have username, displayName, photoURL
            const mappedUsers: User[] = recommendations.map(rec => ({
                id: rec.id,
                username: rec.username,
                displayName: rec.displayName,
                photoURL: rec.photoURL || '',
                isVerified: rec.isVerified || false,
                isAgent: rec.isAgent || false,
                // Add default values for missing fields
                email: '',
                bio: '',
                followers: [],
                following: [],
                interests: [],
                joinedCommunities: [],
                createdAt: Timestamp.now(),
                userId: rec.id, // Required by User type
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
                // isVerified: false, // Removed hardcoded false
                website: '',
                allowMessages: true
            }));
            setSuggestions(mappedUsers);
        }
    }, [recommendations]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Who to Follow</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <SuggestionSkeleton />
                        <SuggestionSkeleton />
                        <SuggestionSkeleton />
                    </div>
                ) : (
                    <>
                        {suggestions.length > 0 ? (
                            <div className='space-y-2'>
                                {suggestions.slice(0, 5).map(user => ( // Show top 5
                                    <UserSuggestion key={user.id} user={user} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No new suggestions right now.</p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

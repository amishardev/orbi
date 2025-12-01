
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';


interface UserCardProps {
    user: User;
    currentUserData: User | null;
}

export function UserCard({ user, currentUserData }: UserCardProps) {
    const { followUser, unfollowUser } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUserData) {
            setIsFollowing(currentUserData.following?.includes(user.id) ?? false);
        }
    }, [currentUserData, user.id]);

    const handleFollowToggle = async () => {
        setLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(user.id);
            } else {
                await followUser(user.id);
            }
            setIsFollowing(!isFollowing);
        } catch (error) {
            console.error("Error toggling follow", error);
        } finally {
            setLoading(false);
        }
    };


    const fallback = user.displayName?.split(" ").map(n => n[0]).join("") || user.username?.[0] || 'U';

    return (
        <Card className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
            <Avatar className="h-16 w-16">
                <AvatarImage src={user.photoURL} alt={user.displayName} />
                <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <Link href={`/profile/${user.username}`} className="hover:underline">
                    <p className="font-bold">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                </Link>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>
            </div>
            <Button
                onClick={handleFollowToggle}
                variant={isFollowing ? 'outline' : 'default'}
                className="rounded-full w-28"
                disabled={loading}
            >
                {loading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
        </Card>
    );
}

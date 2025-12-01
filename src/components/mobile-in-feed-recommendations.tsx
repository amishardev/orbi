'use client';

import { useState, useEffect } from 'react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export function MobileInFeedRecommendations() {
    const { recommendations, loading } = useRecommendations();
    const { followUser } = useAuth();
    const [visibleRecommendations, setVisibleRecommendations] = useState(recommendations);

    useEffect(() => {
        setVisibleRecommendations(recommendations);
    }, [recommendations]);

    const handleRemove = (userId: string) => {
        setVisibleRecommendations(prev => prev.filter(user => user.id !== userId));
    };

    const handleFollow = async (userId: string) => {
        await followUser(userId);
        // Optionally remove from list after following
        // handleRemove(userId);
    };

    if (loading || visibleRecommendations.length === 0) {
        return null;
    }

    return (
        <div className="block md:hidden w-full py-4 my-2 bg-slate-900 border-y border-slate-800">
            <div className="flex justify-between px-4 mb-3">
                <span className="text-sm font-semibold text-white">Suggested for you</span>
                <Link href="/suggestions" className="text-xs text-blue-500">See all</Link>
            </div>

            <div className="flex overflow-x-auto gap-3 px-4 snap-x scrollbar-hide">
                {visibleRecommendations.map((user) => (
                    <div
                        key={user.id}
                        className="min-w-[140px] bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col items-center gap-2 snap-center relative"
                    >
                        <button
                            onClick={() => handleRemove(user.id)}
                            className="absolute top-1 right-1 opacity-50 hover:opacity-100 p-1"
                        >
                            <X className="w-3 h-3 text-slate-400" />
                        </button>

                        <Link href={`/profile/${user.username}`}>
                            <Avatar className="w-14 h-14 rounded-full border-2 border-slate-800">
                                <AvatarImage src={user.photoURL} alt={user.displayName} />
                                <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                        </Link>

                        <div className="text-center w-full">
                            <Link href={`/profile/${user.username}`}>
                                <p className="text-sm font-medium text-white truncate w-full">{user.displayName}</p>
                            </Link>
                            <p className="text-xs text-gray-400 truncate w-full">@{user.username}</p>
                        </div>

                        <Button
                            onClick={() => handleFollow(user.id)}
                            className="w-full py-1.5 h-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md"
                        >
                            Follow
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

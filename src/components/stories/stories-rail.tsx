'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { CreateStoryModal } from './create-story-modal';
import { StoryViewer } from './story-viewer';
import { cn } from '@/lib/utils';

interface Story {
    id: string;
    userId: string;
    username: string;
    userAvatar: string;
    mediaUrl: string;
    type: 'image' | 'video';
    createdAt: any;
    expiresAt: any;
    viewers: string[];
}

interface UserStories {
    userId: string;
    username: string;
    userAvatar: string;
    stories: Story[];
    hasUnseen: boolean;
}

export function StoriesRail() {
    const { authUser, userData } = useAuth();
    const [groupedStories, setGroupedStories] = useState<UserStories[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewingUserIndex, setViewingUserIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!authUser || !userData) return;

        const now = Timestamp.now();
        const q = query(
            collection(db, 'stories'),
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'desc') // Need index for this: expiresAt desc
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));

            // Filter stories: Show stories from people I follow AND my own stories
            const followingIds = new Set([...(userData.following || []), authUser.uid]);
            const filteredStories = allStories.filter(story => followingIds.has(story.userId));

            // Group by user
            const groups: { [key: string]: UserStories } = {};

            filteredStories.forEach(story => {
                if (!groups[story.userId]) {
                    groups[story.userId] = {
                        userId: story.userId,
                        username: story.username,
                        userAvatar: story.userAvatar,
                        stories: [],
                        hasUnseen: false
                    };
                }
                groups[story.userId].stories.push(story);

                // Check if unseen
                if (!story.viewers.includes(authUser.uid)) {
                    groups[story.userId].hasUnseen = true;
                }
            });

            // Sort stories within groups by createdAt
            Object.values(groups).forEach(group => {
                group.stories.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
            });

            // Convert to array and sort: My stories first, then others with unseen first
            const sortedGroups = Object.values(groups).sort((a, b) => {
                if (a.userId === authUser.uid) return -1;
                if (b.userId === authUser.uid) return 1;
                if (a.hasUnseen && !b.hasUnseen) return -1;
                if (!a.hasUnseen && b.hasUnseen) return 1;
                return 0;
            });

            setGroupedStories(sortedGroups);
        });

        return () => unsubscribe();
    }, [authUser, userData]);

    const handleUserClick = (index: number) => {
        const group = groupedStories[index];
        if (group.userId === authUser?.uid && group.stories.length === 0) {
            setIsCreateModalOpen(true);
        } else {
            setViewingUserIndex(index);
        }
    };

    return (
        <div className="w-full bg-background border-b py-4">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4 px-4">
                    {/* My Story Button (Always first if no stories, or part of list if has stories) */}
                    {!groupedStories.find(g => g.userId === authUser?.uid) && (
                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setIsCreateModalOpen(true)}>
                            <div className="relative">
                                <Avatar className="w-16 h-16 border-2 border-background ring-2 ring-muted p-0.5">
                                    <AvatarImage src={authUser?.photoURL || ''} />
                                    <AvatarFallback>ME</AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground">Your Story</span>
                        </div>
                    )}

                    {/* Story Circles */}
                    {groupedStories.map((group, index) => (
                        <div
                            key={group.userId}
                            className="flex flex-col items-center gap-1 cursor-pointer"
                            onClick={() => handleUserClick(index)}
                        >
                            <div className={cn(
                                "p-[2px] rounded-full",
                                group.hasUnseen
                                    ? "bg-gradient-to-tr from-yellow-500 via-red-500 to-fuchsia-600"
                                    : "bg-slate-200 dark:bg-slate-700"
                            )}>
                                <Avatar className="w-16 h-16 border-2 border-background">
                                    <AvatarImage src={group.userAvatar} />
                                    <AvatarFallback>{group.username[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                            <span className="text-xs text-muted-foreground truncate max-w-[64px]">
                                {group.userId === authUser?.uid ? 'Your Story' : group.username}
                            </span>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <CreateStoryModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {viewingUserIndex !== null && groupedStories[viewingUserIndex] && (
                <StoryViewer
                    stories={groupedStories[viewingUserIndex].stories}
                    initialStoryIndex={0} // Start from first story (or find first unseen)
                    onClose={() => setViewingUserIndex(null)}
                    onNextUser={() => {
                        if (viewingUserIndex < groupedStories.length - 1) {
                            setViewingUserIndex(viewingUserIndex + 1);
                        } else {
                            setViewingUserIndex(null);
                        }
                    }}
                    onPrevUser={() => {
                        if (viewingUserIndex > 0) {
                            setViewingUserIndex(viewingUserIndex - 1);
                        } else {
                            setViewingUserIndex(null);
                        }
                    }}
                />
            )}
        </div>
    );
}

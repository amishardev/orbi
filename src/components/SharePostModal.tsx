'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Send, Check } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';
import { getUserCommunities } from '@/firebase/communitiesService';
import { sharePostToTarget } from '@/lib/shareService';
import type { Post, Community, User } from '@/lib/types';
import { collection, query, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

interface SharePostModalProps {
    post: Post;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SharePostModal({ post, open, onOpenChange }: SharePostModalProps) {
    const { authUser, userData } = useAuth();
    const { chats } = useChat();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState<string | null>(null); // ID of target being sent to
    const [sentTargets, setSentTargets] = useState<Set<string>>(new Set());
    const [globalSearchResults, setGlobalSearchResults] = useState<User[]>([]);

    useEffect(() => {
        if (authUser?.uid) {
            const unsubscribe = getUserCommunities(authUser.uid, (comms) => {
                setCommunities(comms);
            });
            return () => unsubscribe();
        }
    }, [authUser?.uid]);

    // Global User Search
    useEffect(() => {
        const searchGlobalUsers = async () => {
            if (!searchQuery.trim()) {
                setGlobalSearchResults([]);
                return;
            }

            try {
                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef,
                    orderBy('displayName_lowercase'),
                    startAt(searchQuery.toLowerCase()),
                    endAt(searchQuery.toLowerCase() + '\uf8ff'),
                    limit(5)
                );

                const querySnapshot = await getDocs(q);
                const users = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as User))
                    .filter(user => user.id !== authUser?.uid);

                setGlobalSearchResults(users);
            } catch (error) {
                console.error("Error searching global users:", error);
            }
        };

        const timeoutId = setTimeout(searchGlobalUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, authUser]);

    const handleShare = async (target: { type: 'user' | 'community'; id: string }) => {
        if (!authUser || !userData) return;

        setSending(target.id);
        try {
            // Create a User object from authUser/userData to pass to shareService
            // We need to cast or construct it to match the User type expected by shareService
            const senderUser: User = {
                id: authUser.uid,
                userId: authUser.uid,
                email: authUser.email || '',
                username: userData.username || 'user',
                username_lowercase: (userData.username || 'user').toLowerCase(),
                displayName: userData.displayName || 'User',
                displayName_lowercase: (userData.displayName || 'user').toLowerCase(),
                bio: userData.bio || '',
                photoURL: userData.photoURL || '',
                joinDate: userData.joinDate,
                followersCount: userData.followersCount || 0,
                followingCount: userData.followingCount || 0,
                postsCount: userData.postsCount || 0,
                profileVisibility: userData.profileVisibility || 'public',
                allowMessages: userData.allowMessages ?? true,
                isVerified: userData.isVerified || false,
                interests: userData.interests || [],
                following: userData.following || [],
                followers: userData.followers || [],
            };

            await sharePostToTarget(target, post, senderUser, comment);
            setSentTargets(prev => new Set(prev).add(target.id));
        } catch (error) {
            console.error('Error sharing post:', error);
        } finally {
            setSending(null);
        }
    };

    const filteredChats = chats.filter(chat => {
        const otherId = chat.participants.find(p => p !== authUser?.uid);
        if (!otherId) return false;
        const details = chat.participantDetails[otherId];
        return details?.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredCommunities = communities.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0 gap-0 bg-card/95 backdrop-blur-xl border-white/10">
                <DialogHeader className="p-4 border-b border-white/10">
                    <DialogTitle className="text-center">Share to...</DialogTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search people or groups..."
                            className="pl-9 bg-secondary/50 border-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </DialogHeader>

                <Tabs defaultValue="people" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent p-0 h-auto">
                        <TabsTrigger
                            value="people"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                        >
                            People
                        </TabsTrigger>
                        <TabsTrigger
                            value="groups"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                        >
                            Groups
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="people" className="flex-1 min-h-0 m-0">
                        <ScrollArea className="h-full">
                            <div className="p-2 space-y-1">
                                {/* Recent Chats */}
                                {filteredChats.map(chat => {
                                    const otherId = chat.participants.find(p => p !== authUser?.uid);
                                    if (!otherId) return null;
                                    const details = chat.participantDetails[otherId];
                                    const isSent = sentTargets.has(otherId);

                                    return (
                                        <div key={chat.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={details.photoURL} />
                                                    <AvatarFallback>{details.displayName[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{details.displayName}</span>
                                                    <span className="text-xs text-muted-foreground">@{details.username}</span>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={isSent ? "secondary" : "default"}
                                                className={`h-8 px-4 ${isSent ? 'text-green-500' : ''}`}
                                                disabled={isSent || sending === otherId}
                                                onClick={() => handleShare({ type: 'user', id: otherId })}
                                            >
                                                {isSent ? <Check className="h-4 w-4" /> : sending === otherId ? '...' : 'Send'}
                                            </Button>
                                        </div>
                                    );
                                })}

                                {/* Global Search Results */}
                                {searchQuery && globalSearchResults.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 mt-2 text-xs font-semibold text-muted-foreground uppercase">More People</div>
                                        {globalSearchResults.map(user => {
                                            // Skip if already in recent chats
                                            if (chats.some(c => c.participants.includes(user.id))) return null;
                                            const isSent = sentTargets.has(user.id);

                                            return (
                                                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={user.photoURL} />
                                                            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">{user.displayName}</span>
                                                            <span className="text-xs text-muted-foreground">@{user.username}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant={isSent ? "secondary" : "default"}
                                                        className={`h-8 px-4 ${isSent ? 'text-green-500' : ''}`}
                                                        disabled={isSent || sending === user.id}
                                                        onClick={() => handleShare({ type: 'user', id: user.id })}
                                                    >
                                                        {isSent ? <Check className="h-4 w-4" /> : sending === user.id ? '...' : 'Send'}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="groups" className="flex-1 min-h-0 m-0">
                        <ScrollArea className="h-full">
                            <div className="p-2 space-y-1">
                                {filteredCommunities.map(community => {
                                    const isSent = sentTargets.has(community.id);
                                    return (
                                        <div key={community.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="rounded-lg">
                                                    <AvatarImage src={community.iconUrl} />
                                                    <AvatarFallback className="rounded-lg">{community.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{community.name}</span>
                                                    <span className="text-xs text-muted-foreground">{community.members.length} members</span>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={isSent ? "secondary" : "default"}
                                                className={`h-8 px-4 ${isSent ? 'text-green-500' : ''}`}
                                                disabled={isSent || sending === community.id}
                                                onClick={() => handleShare({ type: 'community', id: community.id })}
                                            >
                                                {isSent ? <Check className="h-4 w-4" /> : sending === community.id ? '...' : 'Send'}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <div className="p-4 border-t border-white/10 bg-card">
                    <Input
                        placeholder="Write a message..."
                        className="bg-secondary/50 border-none"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>
            </DialogContent >
        </Dialog >
    );
}

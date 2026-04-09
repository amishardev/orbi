'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { collection, query, getDocs, updateDoc, arrayUnion, doc, orderBy, startAt, endAt } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useToast } from '@/hooks/use-toast';
import type { User, Community } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    community: Community;
}

export function InviteMemberModal({ isOpen, onClose, community }: InviteMemberModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);

        try {
            // Normalize input: trim, lowercase, and strip @ prefix
            const normalizedQuery = searchQuery.trim().toLowerCase().replace(/^@/, '');

            if (!normalizedQuery) {
                setSearchResults([]);
                setLoading(false);
                return;
            }

            const usersRef = collection(db, 'users');
            const combinedUsers: { [key: string]: User } = {};

            // Search by username_lowercase using orderBy+startAt pattern (same as global-search)
            const usernameQuery = query(
                usersRef,
                orderBy('username_lowercase'),
                startAt(normalizedQuery),
                endAt(normalizedQuery + '\uf8ff')
            );

            const usernameSnapshot = await getDocs(usernameQuery);
            usernameSnapshot.forEach((doc) => {
                const userData = doc.data();
                const userWithId = { ...userData, id: doc.id } as User;
                // Exclude existing members
                if (!community.members.includes(userWithId.id)) {
                    combinedUsers[userWithId.id] = userWithId;
                }
            });

            // Also search by displayName_lowercase
            const displayNameQuery = query(
                usersRef,
                orderBy('displayName_lowercase'),
                startAt(normalizedQuery),
                endAt(normalizedQuery + '\uf8ff')
            );

            const displayNameSnapshot = await getDocs(displayNameQuery);
            displayNameSnapshot.forEach((doc) => {
                const userData = doc.data();
                const userWithId = { ...userData, id: doc.id } as User;
                // Exclude existing members and avoid duplicates
                if (!community.members.includes(userWithId.id) && !combinedUsers[userWithId.id]) {
                    combinedUsers[userWithId.id] = userWithId;
                }
            });

            setSearchResults(Object.values(combinedUsers));
        } catch (error) {
            console.error("Error searching users:", error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (user: User) => {
        if (!user.id) {
            console.error("User ID is missing", user);
            toast({
                title: "Error",
                description: "Cannot invite user: Invalid User ID.",
                variant: "destructive"
            });
            return;
        }

        try {
            const communityRef = doc(db, 'communities', community.id);

            // Add user to members array
            await updateDoc(communityRef, {
                members: arrayUnion(user.id),
                [`memberDetails.${user.id}`]: {
                    displayName: user.displayName || 'Unknown User',
                    photoURL: user.photoURL || ''
                }
            });

            setInvitedUsers(prev => new Set(prev).add(user.id));

            toast({
                title: "User added",
                description: `${user.displayName || 'User'} has been added to the community.`,
            });

        } catch (error) {
            console.error("Error adding user:", error);
            toast({
                title: "Error",
                description: "Failed to add user. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/10 text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-center">Invite to {community.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by username or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-secondary/50 border-transparent focus:border-primary"
                        />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="text-center py-4 text-muted-foreground text-sm">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-border/50">
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback>{user.displayName?.[0] || user.username?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{user.displayName}</p>
                                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant={invitedUsers.has(user.id) ? "ghost" : "default"}
                                        className={cn(
                                            "h-8 px-3 transition-all",
                                            invitedUsers.has(user.id)
                                                ? "text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                                : "bg-primary hover:bg-primary/90"
                                        )}
                                        onClick={() => !invitedUsers.has(user.id) && handleInvite(user)}
                                        disabled={invitedUsers.has(user.id)}
                                    >
                                        {invitedUsers.has(user.id) ? (
                                            <>
                                                <Check size={14} className="mr-1" /> Added
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={14} className="mr-1" /> Add
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))
                        ) : searchQuery.length >= 2 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No users found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Type at least 2 characters to search
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

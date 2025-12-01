'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc, getDoc } from 'firebase/firestore';
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
            // Search by username (lowercase for case-insensitive search simulation)
            // Note: Firestore doesn't support native case-insensitive search without third-party tools like Algolia
            // or storing a lowercase field. Assuming 'username_lowercase' or similar exists or just searching exact match for now.
            // Based on types.ts, we have 'username' and 'displayName'. 
            // A simple implementation is to fetch users and filter client side if the dataset is small, 
            // OR use a specific field if available. Let's try to match 'username' or 'displayName'.
            // Since Firestore 'array-contains' or simple '==' is limited, we'll try a simple prefix match if possible,
            // or just exact match for now to be safe, or fetch a batch.
            // BETTER APPROACH for this demo: Query a limit of users and filter client side (not scalable but works for small apps)
            // OR assume we have a 'username' field to query.

            const usersRef = collection(db, 'users');
            // Simple prefix search on username
            const q = query(
                usersRef,
                where('username', '>=', searchQuery),
                where('username', '<=', searchQuery + '\uf8ff')
            );

            const snapshot = await getDocs(q);
            const users: User[] = [];

            snapshot.forEach((doc) => {
                const userData = doc.data();
                const userWithId = { ...userData, id: doc.id } as User;

                // Exclude existing members
                if (!community.members.includes(userWithId.id)) {
                    users.push(userWithId);
                }
            });

            setSearchResults(users);
        } catch (error) {
            console.error("Error searching users:", error);
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
                            placeholder="Search by username..."
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
                                            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
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

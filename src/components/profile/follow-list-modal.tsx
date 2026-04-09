'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase-client";
import { collection, doc, getDoc, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import type { User } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface FollowListModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    type: 'followers' | 'following';
}

export function FollowListModal({ open, onOpenChange, userId, type }: FollowListModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { followUser, unfollowUser, userData } = useAuth();

    useEffect(() => {
        if (!open || !userId) return;

        setLoading(true);
        setUsers([]);

        const fetchData = async () => {
            try {
                // First try subcollections (source of truth for new data)
                const subcollectionPath = type === 'followers'
                    ? `users/${userId}/followers`
                    : `users/${userId}/following`;

                const subcollectionRef = collection(db, subcollectionPath);
                const subcollectionSnap = await getDocs(subcollectionRef);

                let userIds: string[] = [];

                if (subcollectionSnap.size > 0) {
                    // Use subcollection data (new system)
                    userIds = subcollectionSnap.docs.map(doc => doc.data().userId || doc.id);
                } else {
                    // Fallback to arrays (legacy system)
                    const userDoc = await getDoc(doc(db, "users", userId));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        userIds = type === 'followers' ? (data.followers || []) : (data.following || []);
                    }
                }

                if (userIds.length === 0) {
                    setUsers([]);
                    setLoading(false);
                    return;
                }

                // Fetch full user profiles for each userId
                const userPromises = userIds.map(async (id: string) => {
                    try {
                        const userDoc = await getDoc(doc(db, "users", id));
                        if (userDoc.exists()) {
                            return { id: userDoc.id, ...userDoc.data() } as User;
                        }
                        return null;
                    } catch (err) {
                        console.error(`Error fetching user ${id}:`, err);
                        return null;
                    }
                });

                const fetchedUsers = (await Promise.all(userPromises)).filter((u): u is User => u !== null);
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Also set up real-time listener for subcollection changes
        const subcollectionPath = type === 'followers'
            ? `users/${userId}/followers`
            : `users/${userId}/following`;

        const subcollectionRef = collection(db, subcollectionPath);
        const q = query(subcollectionRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            // Only update if subcollection has data (to not override legacy array data)
            if (snapshot.size > 0) {
                const userIds = snapshot.docs.map(doc => doc.data().userId || doc.id);

                const userPromises = userIds.map(async (id: string) => {
                    try {
                        const userDoc = await getDoc(doc(db, "users", id));
                        if (userDoc.exists()) {
                            return { id: userDoc.id, ...userDoc.data() } as User;
                        }
                        return null;
                    } catch (err) {
                        return null;
                    }
                });

                const fetchedUsers = (await Promise.all(userPromises)).filter((u): u is User => u !== null);
                setUsers(fetchedUsers);
            }
        });

        return () => unsubscribe();
    }, [open, userId, type]);

    const filteredUsers = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-slate-950 border-slate-800 p-0 gap-0">
                <DialogHeader className="p-4 border-b border-slate-800">
                    <DialogTitle className="capitalize flex items-center gap-2">
                        {type}
                        <span className="text-sm font-normal text-muted-foreground">
                            ({users.length})
                        </span>
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-8 bg-slate-900 border-slate-800"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                {searchQuery ? 'No users match your search' : `No ${type} yet`}
                            </p>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <Link href={`/profile/${user.username}`} onClick={() => onOpenChange(false)}>
                                            <div>
                                                <p className="font-medium text-sm hover:underline">{user.displayName}</p>
                                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                                            </div>
                                        </Link>
                                    </div>
                                    {userData && userData.id !== user.id && (
                                        <Button
                                            size="sm"
                                            variant={userData.following?.includes(user.id) ? "outline" : "default"}
                                            onClick={() => userData.following?.includes(user.id) ? unfollowUser(user.id) : followUser(user.id)}
                                        >
                                            {userData.following?.includes(user.id) ? "Following" : "Follow"}
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

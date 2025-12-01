'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
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

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const userDoc = await getDoc(doc(db, "users", userId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const ids = type === 'followers' ? data.followers : data.following;

                    if (ids && ids.length > 0) {
                        const userPromises = ids.map((id: string) => getDoc(doc(db, "users", id)));
                        const userDocs = await Promise.all(userPromises);
                        const fetchedUsers = userDocs
                            .filter(doc => doc.exists())
                            .map(doc => ({ id: doc.id, ...doc.data() } as User));
                        setUsers(fetchedUsers);
                    } else {
                        setUsers([]);
                    }
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [open, userId, type]);

    const filteredUsers = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-slate-950 border-slate-800 p-0 gap-0">
                <DialogHeader className="p-4 border-b border-slate-800">
                    <DialogTitle className="capitalize">{type}</DialogTitle>
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
                            <p className="text-center text-muted-foreground">Loading...</p>
                        ) : filteredUsers.length === 0 ? (
                            <p className="text-center text-muted-foreground">No users found</p>
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

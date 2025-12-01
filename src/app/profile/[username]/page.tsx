
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { db } from '@/lib/firebase-client';
import { collection, query, where, getDocs, limit, onSnapshot, doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfilePosts } from '@/components/profile/profile-posts';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Lock, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function ProfileSkeleton() {
    return (
        <div>
            <div className="border-b bg-card">
                <div className="h-60 relative bg-muted" />
                <div className="px-6 pb-6 -mt-20">
                    <div className='flex items-end gap-4'>
                        <Skeleton className="h-28 w-28 rounded-full border-4 border-card shrink-0" />
                        <div className="flex w-full items-center justify-end gap-2 pb-2">
                            <Skeleton className="h-10 w-28 rounded-full" />
                            <Skeleton className="h-10 w-28 rounded-full" />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="mt-4 flex items-center gap-6">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="mt-4 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserList({ userIds, emptyState }: { userIds: string[], emptyState: { title: string, description: string } }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userIds.length === 0) {
            setUsers([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        const fetchUsers = async () => {
            const userChunks: string[][] = [];
            for (let i = 0; i < userIds.length; i += 30) {
                userChunks.push(userIds.slice(i, i + 30));
            }

            const usersData: User[] = [];
            for (const chunk of userChunks) {
                if (chunk.length === 0) continue;
                const usersQuery = query(collection(db, 'users'), where('userId', 'in', chunk));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(doc => {
                    usersData.push({ id: doc.id, ...doc.data() } as User);
                });
            }
            setUsers(usersData);
            setLoading(false);
        };

        fetchUsers();
    }, [userIds]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 md:p-0">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="p-4 flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </Card>
                ))}
            </div>
        )
    }

    if (users.length === 0) {
        return (
            <Card className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold mt-4">{emptyState.title}</h3>
                <p className="text-muted-foreground mt-2">{emptyState.description}</p>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(friend => (
                <Card key={friend.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <Link href={`/profile/${friend.username}`} className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={friend.photoURL} alt={friend.displayName} />
                            <AvatarFallback>{friend.displayName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold">{friend.displayName}</p>
                            <p className="text-sm text-muted-foreground">@{friend.username}</p>
                        </div>
                    </Link>
                </Card>
            ))}
        </div>
    );
}

export default function ProfilePage() {
    const params = useParams();
    const { authUser, userData } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const username = Array.isArray(params.username) ? params.username[0] : params.username;

    useEffect(() => {
        if (!username) {
            setLoading(false);
            return;
        }

        const lowercaseUsername = username.toLowerCase();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username_lowercase', '==', lowercaseUsername), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setUser(null);
            } else {
                const userDoc = snapshot.docs[0];
                setUser({ id: userDoc.id, ...userDoc.data() } as User);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user:", error);
            setUser(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [username]);

    const isOwner = authUser?.uid === user?.id;
    // For a follow model, profile visibility might be simpler. Let's assume public for now.
    const isPrivate = user?.profileVisibility === 'private';
    const isFollowing = userData?.following?.includes(user?.id || '') || false;
    const canViewProfile = !isPrivate || isOwner || isFollowing;

    if (loading) {
        return (
            <AppLayout>
                <div className="container mx-auto max-w-4xl px-0 md:px-4 py-0 md:py-8">
                    <ProfileSkeleton />
                </div>
            </AppLayout>
        )
    }

    if (!user) {
        return (
            <AppLayout>
                <ProfileNotFound username={username || ''} />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="container mx-auto max-w-4xl px-0 md:px-4 py-0 md:py-8">
                <ProfileHeader user={user} />

                <div className="mt-6">
                    {!canViewProfile ? ( // Changed from isPrivateProfile to !canViewProfile
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center">
                                <Lock className="h-8 w-8 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">This account is private</h3>
                                <p className="text-slate-400">Follow this account to see their photos and videos.</p>
                            </div>
                        </div>
                    ) : (
                        <ProfilePosts userId={user.id} /> // Changed from profileUser.id to user.id
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function ProfileNotFound({ username }: { username: string }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-20">
            <h2 className="text-2xl font-bold">Profile not found</h2>
            <p className="text-muted-foreground mt-2">
                Sorry, we couldn't find a profile for <span className="font-semibold">@{username}</span>.
            </p>
        </div>
    )
}

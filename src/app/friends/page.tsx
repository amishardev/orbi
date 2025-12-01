
'use client';
import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import type { User, FriendRequest } from '@/lib/types';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter } from 'next/navigation';


function UserCardSkeleton() {
    return (
        <Card className="p-4 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-20 rounded-md" />
                <Skeleton className="h-10 w-20 rounded-md" />
            </div>
        </Card>
    );
}

function FriendsList() {
    const { authUser } = useAuth();
    const [friends, setFriends] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authUser?.uid) return;

        const userRef = doc(db, 'users', authUser.uid);
        const unsubscribeUser = onSnapshot(userRef, async (userSnap) => {
            if (!userSnap.exists()) {
                setLoading(false);
                return;
            }
            const userData = userSnap.data() as User;
            const friendIds = userData.friends || [];

            if (friendIds.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }

            const friendChunks: string[][] = [];
            for (let i = 0; i < friendIds.length; i += 30) {
                friendChunks.push(friendIds.slice(i, i + 30));
            }

            const friendsData: User[] = [];
            for (const chunk of friendChunks) {
                if (chunk.length === 0) continue;
                const friendsQuery = query(collection(db, 'users'), where('userId', 'in', chunk));
                const friendsSnapshot = await getDocs(friendsQuery);
                friendsSnapshot.forEach(doc => {
                    friendsData.push({ id: doc.id, ...doc.data() } as User);
                });
            }
            setFriends(friendsData);
            setLoading(false);
        });

        return () => unsubscribeUser();
    }, [authUser?.uid]);

    if (loading) {
        return (
            <div className="space-y-4">
                <UserCardSkeleton />
                <UserCardSkeleton />
            </div>
        );
    }

    if (friends.length === 0) {
        return <Card className="p-12 text-center text-muted-foreground">You haven't added any friends yet.</Card>
    }

    return (
        <div className="space-y-4">
            {friends.map(friend => (
                <Card key={friend.id} className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={friend.photoURL} alt={friend.displayName} />
                        <AvatarFallback>{friend.displayName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <Link href={`/profile/${friend.username}`} className="hover:underline font-semibold">{friend.displayName}</Link>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={`/messages?chatId=${[authUser?.uid, friend.id].sort().join('_')}`}>Message</Link>
                    </Button>
                </Card>
            ))}
        </div>
    );
}

function FriendRequestCard({ request, type }: { request: FriendRequest, type: 'received' | 'sent' }) {
    const { acceptFriendRequest, declineFriendRequest, cancelFriendRequest } = useAuth();

    const userDisplayName = type === 'received' ? request.fromUserDisplayName : "Your request to";
    const userProfilePicture = type === 'received' ? request.fromUserProfilePicture : '';
    const username = type === 'received' ? request.fromUsername : '';

    return (
        <Card className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12">
                <AvatarImage src={userProfilePicture} alt={userDisplayName} />
                <AvatarFallback>{userDisplayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <Link href={`/profile/${username}`} className="hover:underline font-semibold">{userDisplayName}</Link>
                <p className="text-sm text-muted-foreground">{type === 'received' ? `@${username}` : ''}</p>
            </div>
            {type === 'received' ? (
                <div className="flex gap-2">
                    <Button onClick={() => acceptFriendRequest(request)}>
                        <UserCheck className="h-4 w-4 mr-2" /> Accept
                    </Button>
                    <Button variant="outline" onClick={() => declineFriendRequest(request.id)}>
                        <X className="h-4 w-4 mr-2" /> Decline
                    </Button>
                </div>
            ) : (
                <Button variant="outline" onClick={() => cancelFriendRequest(request.id)}>
                    Cancel Request
                </Button>
            )}
        </Card>
    );
}

function FriendRequestsList({ type }: { type: 'received' | 'sent' }) {
    const { authUser } = useAuth();
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authUser?.uid) {
            setLoading(false);
            return;
        }

        const field = type === 'received' ? 'toUserId' : 'fromUserId';
        const q = query(
            collection(db, 'friend_requests'),
            where(field, '==', authUser.uid),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => doc.data() as FriendRequest);
            setRequests(reqs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser?.uid, type]);

    if (loading) {
        return (
            <div className="space-y-4">
                <UserCardSkeleton />
            </div>
        );
    }

    if (requests.length === 0) {
        const message = type === 'received' ? "You have no pending friend requests." : "You haven't sent any pending requests.";
        return <Card className="p-12 text-center text-muted-foreground">{message}</Card>
    }

    return (
        <div className="space-y-4">
            {requests.map(req => (
                <FriendRequestCard key={req.id} request={req} type={type} />
            ))}
        </div>
    )
}

import { Suspense } from 'react';

function FriendsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const defaultTab = searchParams.get('tab') || 'all';

    const onTabChange = (value: string) => {
        router.push(`/friends?tab=${value}`, { scroll: false });
    };

    return (
        <div className="container mx-auto max-w-3xl py-8 px-4">
            <h1 className="text-3xl font-bold font-headline tracking-tight mb-8">
                Friends
            </h1>
            <Tabs defaultValue={defaultTab} onValueChange={onTabChange}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All Friends</TabsTrigger>
                    <TabsTrigger value="requests">Friend Requests</TabsTrigger>
                    <TabsTrigger value="sent">Sent Requests</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="py-6">
                    <FriendsList />
                </TabsContent>
                <TabsContent value="requests" className="py-6">
                    <FriendRequestsList type="received" />
                </TabsContent>
                <TabsContent value="sent" className="py-6">
                    <FriendRequestsList type="sent" />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function FriendsPage() {
    return (
        <AppLayout>
            <Suspense fallback={<div className="p-8 text-center">Loading friends...</div>}>
                <FriendsContent />
            </Suspense>
        </AppLayout>
    );
}

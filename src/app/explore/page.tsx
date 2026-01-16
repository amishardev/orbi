'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/app-layout';
import { CreatePost } from '@/components/create-post';
import { PostCard } from '@/components/post-card';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/firebase-client';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass } from 'lucide-react';

function PostSkeleton() {
    return (
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-3/4 mt-2" />
            <Skeleton className="aspect-video w-full mt-4 rounded-lg" />
        </Card>
    );
}

export default function ExplorePage() {
    const { authUser, userData } = useAuth();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authUser?.uid || !db) {
            setLoading(false);
            return;
        }

        const postsCollection = collection(db, 'posts');
        // Fetch all posts for global discovery - includes anonymous posts
        const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const allPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(allPosts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser?.uid, db]);

    if (!authUser || !userData) {
        return null;
    }

    return (
        <AppLayout>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-8 p-0 md:p-8">
                <div className="md:col-span-2 space-y-8">
                    {/* Explore Header */}
                    <Card className="p-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-purple-500/20">
                                <Compass className="h-6 w-6 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Explore</h1>
                                <p className="text-sm text-slate-400">Discover posts from everyone on Orbi</p>
                            </div>
                        </div>
                    </Card>

                    <CreatePost user={userData} className="hidden md:block" />

                    {loading ? (
                        <>
                            <PostSkeleton />
                            <PostSkeleton />
                        </>
                    ) : posts.length === 0 ? (
                        <Card className="p-8 text-center bg-slate-900/50 border-slate-800">
                            <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                            <p className="text-slate-400">
                                Be the first to share something with the community!
                            </p>
                        </Card>
                    ) : (
                        posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    )}
                </div>

                <div className="hidden md:block space-y-8">
                    <Card className="p-4 bg-slate-900/50 border-slate-800">
                        <h3 className="font-semibold text-white mb-2">About Explore</h3>
                        <p className="text-sm text-slate-400">
                            The Explore feed shows posts from everyone on Orbi, including anonymous posts.
                            Discover new voices and perspectives from across the community.
                        </p>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}


'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/app-layout';
import { CreatePost } from '@/components/create-post';
import { PostCard } from '@/components/post-card';
import { Suggestions } from '@/components/suggestions';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/firebase-client';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { StoriesRail } from '@/components/stories/stories-rail';
import { MobileInFeedRecommendations } from '@/components/mobile-in-feed-recommendations';

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


export default function HomePage() {
  const { authUser, userData } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.uid || !db || !userData) {
      if (userData) setLoading(false); // Stop loading if we have user data but no auth (shouldn't happen due to auth guard)
      return;
    }

    const postsCollection = collection(db, 'posts');
    // Fetch recent posts (limit 100 for client-side filtering)
    const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const allPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter posts: Show posts from people I follow AND my own posts
      const followingIds = new Set([...(userData.following || []), authUser.uid]);
      const filteredPosts = allPosts
        .filter((post: any) => followingIds.has(post.userId));

      setPosts(filteredPosts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser?.uid, db, userData]); // Re-run if following list changes

  if (!authUser || !userData) {
    return null;
  }

  const followingCount = userData.following?.length || 0;
  const isNewUser = followingCount === 0;
  const isQuietFeed = followingCount > 0 && posts.length === 0;

  return (
    <AppLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-8 p-0 md:p-8">
        <div className="md:col-span-2 space-y-8">
          <StoriesRail />
          <CreatePost user={userData} className="hidden md:block" />

          {loading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : isNewUser ? (
            // State A: New User (0 Following)
            <div className="space-y-6">
              <Card className="p-8 text-center bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Orbi! 👋</h2>
                <p className="text-slate-400 mb-6">
                  Your feed is a bit empty. Follow some amazing people to get started!
                </p>
                <MobileInFeedRecommendations />
              </Card>
            </div>
          ) : isQuietFeed ? (
            // State B: Quiet Feed (Following > 0, but no posts)
            <div className="space-y-6">
              <Card className="p-8 text-center bg-slate-900/50 border-slate-800">
                <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                <p className="text-slate-400 mb-6">
                  The people you follow haven't posted anything recently.
                  <br />
                  Find more people to follow!
                </p>
                <MobileInFeedRecommendations />
              </Card>
            </div>
          ) : (
            // State C: Active Feed
            posts.map((post, index) => (
              <div key={post.id}>
                <PostCard post={post} />
                {index === 7 && <MobileInFeedRecommendations />}
              </div>
            ))
          )}
        </div>
        <div className="md:block space-y-8">
          <Suggestions />
        </div>
      </div>
    </AppLayout>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, orderBy, getDocs, limit, onSnapshot, doc } from 'firebase/firestore';
import type { User, Post } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/post-card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Link from 'next/link';
import type { Timestamp } from 'firebase/firestore';

interface ProfilePostsProps {
  userId: string;
  isOwner?: boolean; // If true, show all posts including anonymous ones
}


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

export function ProfilePosts({ userId, isOwner = false }: ProfilePostsProps) {
  const [postIds, setPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      if (!userId || !db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);

        let userPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

        // IMPORTANT: If viewing someone else's profile, hide their anonymous posts
        // Only the profile owner can see their own anonymous posts
        if (!isOwner) {
          userPosts = userPosts.filter(post => !post.isAnonymous);
        }

        // Sort posts by creation date client-side
        userPosts.sort((a, b) => {
          const aTime = (a.createdAt as Timestamp)?.toMillis() || 0;
          const bTime = (b.createdAt as Timestamp)?.toMillis() || 0;
          return bTime - aTime;
        });

        setPostIds(userPosts.map(p => p.id));

      } catch (error) {
        console.error("Error fetching user's posts: ", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, [userId, isOwner]);

  if (loading) {
    return (
      <div className="space-y-8 px-4 md:px-0">
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (postIds.length === 0) {
    return (
      <Card className="col-span-3 flex flex-col items-center justify-center p-12 text-center mx-4 md:mx-0">
        <h3 className="text-xl font-semibold">No Posts Yet</h3>
        <p className="text-muted-foreground mt-2">This user hasn't shared any posts.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-8 px-4 md:px-0">
      {postIds.map(postId => (
        <PostCard key={postId} postId={postId} />
      ))}
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import type { Post } from '@/lib/types';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PostGridProps {
  userId: string;
}

export function PostGrid({ userId }: PostGridProps) {
  const [posts, setPosts] = useState<Post[]>([]);
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
          where('userId', '==', userId),
          // orderBy('createdAt', 'desc'), // Removed to prevent indexing error
          limit(12)
        );
        const querySnapshot = await getDocs(q);
        const userPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        setPosts(userPosts);
      } catch (error) {
        console.error("Error fetching user's posts: ", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }
  
  if (posts.length === 0) {
      return (
          <Card className="col-span-3 flex flex-col items-center justify-center p-12 text-center">
              <h3 className="text-xl font-semibold">No Posts Yet</h3>
              <p className="text-muted-foreground mt-2">This user hasn't shared any posts.</p>
          </Card>
      )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
      {posts.map(post => (
        <div key={post.id} className="aspect-square relative group bg-muted">
          {post.imageUrl && (
            <Image
              src={post.imageUrl}
              alt={post.caption || 'User post'}
              fill
              className="object-cover"
            />
          )}
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white p-4">
                <p className="line-clamp-3 text-sm">{post.caption}</p>
            </div>
        </div>
      ))}
    </div>
  );
}

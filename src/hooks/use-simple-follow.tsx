'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export interface FollowResult {
  action: 'follow' | 'unfollow';
  followersCount: number;
  followingCount: number;
}

export function useSimpleFollow() {
  const [isLoading, setIsLoading] = useState(false);
  const { authUser } = useAuth();
  const { toast } = useToast();

  const toggleFollow = useCallback(async (targetUid: string): Promise<FollowResult | null> => {
    if (isLoading || !authUser?.uid || targetUid === authUser.uid) return null;
    
    setIsLoading(true);
    
    try {
      // Check current follow status
      const followerRef = doc(db, `users/${targetUid}/followers/${authUser.uid}`);
      const followerSnap = await getDoc(followerRef);
      const isFollowing = followerSnap.exists();

      if (isFollowing) {
        // Unfollow: just update counts
        await updateDoc(doc(db, `users/${targetUid}`), {
          followersCount: increment(-1)
        });
        await updateDoc(doc(db, `users/${authUser.uid}`), {
          followingCount: increment(-1)
        });

        toast({
          title: 'Unfollowed',
          description: 'You have unfollowed this user',
        });

        return { action: 'unfollow', followersCount: 0, followingCount: 0 };
      } else {
        // Follow: just update counts
        await updateDoc(doc(db, `users/${targetUid}`), {
          followersCount: increment(1)
        });
        await updateDoc(doc(db, `users/${authUser.uid}`), {
          followingCount: increment(1)
        });

        toast({
          title: 'Following',
          description: 'You are now following this user',
        });

        return { action: 'follow', followersCount: 1, followingCount: 1 };
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update follow status',
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, authUser?.uid, toast]);

  return {
    toggleFollow,
    isLoading
  };
}

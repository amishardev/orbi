'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, updateDoc, increment, runTransaction, collection, addDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export interface FollowResult {
  action: 'follow' | 'unfollow';
  followersCount: number;
  followingCount: number;
}

export function useFollowClient() {
  const [isLoading, setIsLoading] = useState(false);
  const { authUser } = useAuth();
  const { toast } = useToast();

  const toggleFollow = useCallback(async (targetUid: string): Promise<FollowResult | null> => {
    if (isLoading || !authUser?.uid) return null;
    
    setIsLoading(true);
    
    try {
      const result = await runTransaction(db, async (transaction) => {
        const followerRef = doc(db, `users/${targetUid}/followers/${authUser.uid}`);
        const followingRef = doc(db, `users/${authUser.uid}/following/${targetUid}`);
        const targetUserRef = doc(db, `users/${targetUid}`);
        const currentUserRef = doc(db, `users/${authUser.uid}`);

        const followerSnap = await transaction.get(followerRef);
        const targetUserSnap = await transaction.get(targetUserRef);
        const currentUserSnap = await transaction.get(currentUserRef);

        const targetUserData = targetUserSnap.exists() ? targetUserSnap.data() : {};
        const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};

        if (followerSnap.exists()) {
          // Unfollow
          transaction.delete(followerRef);
          transaction.delete(followingRef);
          
          const newTargetFollowers = Math.max((targetUserData?.followersCount || 0) - 1, 0);
          const newCurrentFollowing = Math.max((currentUserData?.followingCount || 0) - 1, 0);
          
          transaction.update(targetUserRef, { followersCount: newTargetFollowers });
          transaction.update(currentUserRef, { followingCount: newCurrentFollowing });
          
          return { action: 'unfollow' as const, followersCount: newTargetFollowers, followingCount: newCurrentFollowing };
        } else {
          // Follow
          transaction.set(followerRef, { 
            uid: authUser.uid, 
            followedAt: new Date()
          });
          transaction.set(followingRef, { 
            uid: targetUid, 
            followedAt: new Date()
          });
          
          const newTargetFollowers = (targetUserData?.followersCount || 0) + 1;
          const newCurrentFollowing = (currentUserData?.followingCount || 0) + 1;
          
          transaction.update(targetUserRef, { followersCount: newTargetFollowers });
          transaction.update(currentUserRef, { followingCount: newCurrentFollowing });
          
          return { action: 'follow' as const, followersCount: newTargetFollowers, followingCount: newCurrentFollowing };
        }
      });

      toast({
        title: result.action === 'follow' ? 'Following' : 'Unfollowed',
        description: result.action === 'follow' 
          ? 'You are now following this user' 
          : 'You have unfollowed this user',
      });

      return result;
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

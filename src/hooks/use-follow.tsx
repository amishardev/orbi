'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { FollowService, type FollowRecord } from '@/lib/followService';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { User } from '@/lib/types';

export type FollowerItem = FollowRecord;

export interface FollowResult {
  action: 'follow' | 'unfollow';
  followersCount: number;
  followingCount: number;
}

export interface FollowersResult {
  items: FollowRecord[];
  total: number;
  nextCursor?: string;
}

export function useFollow() {
  const { authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const toggleFollow = useCallback(async (targetUserId: string): Promise<FollowResult | null> => {
    if (!authUser) return null;
    if (isLoading) return null; // Prevent concurrent calls
    setIsLoading(true);

    try {
      // Check current follow status using document existence
      const followingRef = doc(db, `users/${authUser.uid}/following/${targetUserId}`);
      const followingDoc = await getDoc(followingRef);
      const isCurrentlyFollowing = followingDoc.exists();
      // Fetch full current user profile
      const currentUserDoc = await getDoc(doc(db, 'users', authUser.uid));
      if (!currentUserDoc.exists()) throw new Error('Current user profile not found');
      const currentUser = currentUserDoc.data() as User;

      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!targetUserDoc.exists()) throw new Error('User not found');
      const targetData = targetUserDoc.data();
      const targetUser = { ...targetData, id: targetUserId } as User;

      await FollowService.handleFollowUser(currentUser, targetUser);

      // Get updated counts
      const followersCount = await FollowService.getFollowerCount(targetUserId);
      const followingCount = await FollowService.getFollowingCount(authUser.uid);

      return {
        action: isCurrentlyFollowing ? 'unfollow' : 'follow',
        followersCount,
        followingCount
      };
    } catch (error) {
      console.error('Error toggling follow:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  const getFollowers = useCallback(async (userId: string, limitCount?: number, cursor?: string): Promise<FollowersResult> => {
    const result = await FollowService.getFollowers(userId, limitCount, cursor);
    const total = await FollowService.getFollowerCount(userId);
    return { items: result.items, total, nextCursor: result.nextCursor };
  }, []);

  const getFollowing = useCallback(async (userId: string, limitCount?: number, cursor?: string): Promise<FollowersResult> => {
    const result = await FollowService.getFollowing(userId, limitCount, cursor);
    const total = await FollowService.getFollowingCount(userId);
    return { items: result.items, total, nextCursor: result.nextCursor };
  }, []);

  return {
    toggleFollow,
    getFollowers,
    getFollowing,
    isLoading
  };
}

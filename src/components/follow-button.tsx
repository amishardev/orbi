'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/use-follow';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showText?: boolean;
}

export function FollowButton({ 
  targetUserId, 
  targetUsername,
  variant = 'default',
  size = 'default',
  showText = true
}: FollowButtonProps) {
  const { authUser } = useAuth();
  const { toggleFollow, isLoading } = useFollow();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  // Don't show follow button for own profile
  if (!authUser || authUser.uid === targetUserId) {
    return null;
  }

  // Listen to follow status in real-time
  useEffect(() => {
    if (!authUser?.uid || !db) return;

    const followerRef = doc(db, `users/${targetUserId}/followers/${authUser.uid}`);
    const unsubscribe = onSnapshot(followerRef, (doc) => {
      setIsFollowing(doc.exists());
    });

    return () => unsubscribe();
  }, [authUser?.uid, targetUserId]);

  // Listen to target user's follower count
  useEffect(() => {
    if (!db) return;

    const userRef = doc(db, `users/${targetUserId}`);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setFollowersCount(userData.followersCount || 0);
      }
    });

    return () => unsubscribe();
  }, [targetUserId]);

  const handleToggleFollow = async () => {
    if (isLoading) return; // Prevent multiple clicks
    try {
      const result = await toggleFollow(targetUserId);
      if (result) {
        // Optimistic update will be overridden by real-time listener
        setIsFollowing(result.action === 'follow');
        setFollowersCount(prev => result.action === 'follow' ? (prev || 0) + 1 : (prev || 1) - 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const buttonText = isFollowing ? 'Following' : 'Follow';
  const Icon = isFollowing ? UserMinus : UserPlus;

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={isLoading}
      className="min-w-[100px]"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Icon className="h-4 w-4 mr-2" />
          {showText && buttonText}
        </>
      )}
    </Button>
  );
}

// Followers count display component
interface FollowersCountProps {
  userId: string;
  showLabel?: boolean;
}

export function FollowersCount({ userId, showLabel = true }: FollowersCountProps) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!db) return;

    const userRef = doc(db, `users/${userId}`);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setCount(userData.followersCount || 0);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <span className="text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{count.toLocaleString()}</span>
      {showLabel && ` ${count === 1 ? 'follower' : 'followers'}`}
    </span>
  );
}

// Following count display component
interface FollowingCountProps {
  userId: string;
  showLabel?: boolean;
}

export function FollowingCount({ userId, showLabel = true }: FollowingCountProps) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!db) return;

    const userRef = doc(db, `users/${userId}`);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setCount(userData.followingCount || 0);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <span className="text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{count.toLocaleString()}</span>
      {showLabel && ' following'}
    </span>
  );
}

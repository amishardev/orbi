'use client';

import { useRecommendations } from '@/hooks/useRecommendations';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Users } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useFollowClient } from '@/hooks/use-follow-client';
import { useAuth } from '@/hooks/use-auth';

interface UserData {
  username: string;
  displayName: string;
  bio?: string;
  photoURL?: string;
}

export function SuggestedForYou() {
  const { recommendations, loading, error } = useRecommendations();
  const [userDetails, setUserDetails] = useState<Record<string, UserData>>({});
  const { toggleFollow } = useFollowClient();
  const { authUser } = useAuth();
  const [followingList, setFollowingList] = useState<string[]>([]);

  useEffect(() => {
    async function fetchFollowing() {
      if (!authUser?.uid) return;
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFollowingList(data.following || []);
      }
    }
    fetchFollowing();
  }, [authUser]);

  const isFollowing = (userId: string) => {
    return followingList.includes(userId);
  };

  const handleToggleFollow = async (userId: string) => {
    await toggleFollow(userId);
    // Optimistic update or refetch
    setFollowingList(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  useEffect(() => {
    if (recommendations.length > 0) {
      const newDetails: Record<string, UserData> = {};
      recommendations.forEach(rec => {
        newDetails[rec.id] = {
          username: rec.username,
          displayName: rec.displayName,
          photoURL: rec.photoURL
        };
      });
      setUserDetails(prev => ({ ...prev, ...newDetails }));
    }
  }, [recommendations]);

  if (error) {
    return null; // Hide component on error
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Suggested for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Suggested for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>Not many people yet — invite your friends!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center justify-between">
          Suggested for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.slice(0, 5).map((rec) => {
            const user = userDetails[rec.id] || {
              username: rec.username,
              displayName: rec.displayName,
              photoURL: rec.photoURL
            };

            if (!user) return null;

            return (
              <div key={rec.id} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback>
                    {user.displayName?.[0] || user.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.displayName || user.username}</p>
                  {rec.mutualCount > 0 && (
                    <p className="text-sm text-muted-foreground truncate">
                      {rec.mutualCount} mutual connection{rec.mutualCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleFollow(rec.id)}
                >
                  {isFollowing(rec.id) ? 'Following' : 'Follow'}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
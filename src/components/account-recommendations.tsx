
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFollow } from '@/hooks/use-follow';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecommendationItem {
  userId: string;
  reason: string;
  score: number;
}

interface Recommendation {
  userId: string;
  reason: string;
  score: number;
  userData: User | null;
}

function RecommendationSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  );
}

export function AccountRecommendations() {
  const { authUser } = useAuth();
  const { toggleFollow } = useFollow();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.uid) {
      setLoading(false);
      return;
    }

    const recsRef = doc(db, 'recommendations', authUser.uid);
    const unsubscribe = onSnapshot(recsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const { items } = snapshot.data() as { items: RecommendationItem[] };
        const recommendationsWithData = await Promise.all(
          (items || []).map(async (item) => {
            const userDoc = await getDoc(doc(db, 'users', item.userId));
            return {
              ...item,
              userData: userDoc.exists() ? (userDoc.data() as User) : null,
            };
          })
        );
        setRecommendations(recommendationsWithData.filter(r => r.userData && r.userId !== authUser.uid));
      } else {
        setRecommendations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser?.uid]);

  const handleFollow = async (targetUserId: string) => {
    const result = await toggleFollow(targetUserId);
    if (result && result.action === 'follow') {
      // Optimistically remove from list
      setRecommendations(prev => prev.filter(r => r.userId !== targetUserId));
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">Who to follow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            <RecommendationSkeleton />
            <RecommendationSkeleton />
            <RecommendationSkeleton />
          </>
        ) : recommendations.length > 0 ? (
          recommendations.map((rec) =>
            rec.userData ? (
              <div key={rec.userId} className="flex items-center gap-4">
                <Link href={`/profile/${rec.userData.username}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={rec.userData.photoURL} alt={rec.userData.displayName} />
                    <AvatarFallback>{rec.userData.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 overflow-hidden">
                  <Link href={`/profile/${rec.userData.username}`} className="hover:underline">
                    <p className="font-semibold truncate">{rec.userData.displayName}</p>
                  </Link>
                  <p className="text-sm text-muted-foreground truncate" title={rec.reason}>
                    {rec.reason}
                  </p>
                </div>
                <Button size="sm" className="rounded-full" onClick={() => handleFollow(rec.userId)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Follow
                </Button>
              </div>
            ) : null
          )
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <p>No new suggestions right now.</p>
            <p className="text-xs">Check back later for new recommendations!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

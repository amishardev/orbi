'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFollow, type FollowerItem } from '@/hooks/use-follow';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface FollowersModalProps {
  userId: string;
  username?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FollowersModal({ userId, username, open, onOpenChange }: FollowersModalProps) {
  const { getFollowers } = useFollow();
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  // Load initial followers when modal opens
  useEffect(() => {
    if (open && userId) {
      loadFollowers(true);
    }
  }, [open, userId]);

  const loadFollowers = async (reset = false) => {
    if (loading) return;

    setLoading(true);

    try {
      const cursor = reset ? undefined : nextCursor;
      const result = await getFollowers(userId, 20, cursor);

      if (result) {
        if (reset) {
          setFollowers(result.items);
        } else {
          setFollowers(prev => [...prev, ...result.items]);
        }

        setNextCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
      }
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadFollowers(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {username ? `@${username}'s followers` : 'Followers'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {followers.map((follower) => (
            <div key={follower.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={follower.photoURL} alt={follower.displayName} />
                <AvatarFallback>
                  {follower.displayName
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${follower.username}`}
                  className="block hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  <p className="font-semibold text-sm truncate">
                    {follower.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{follower.username}
                  </p>
                </Link>
                {follower.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    Followed {formatDistanceToNow(follower.timestamp)} ago
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && followers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No followers yet</p>
            </div>
          )}
        </div>

        {hasMore && !loading && followers.length > 0 && (
          <div className="pt-3 border-t">
            <Button
              variant="outline"
              onClick={loadMore}
              className="w-full"
            >
              Load more
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

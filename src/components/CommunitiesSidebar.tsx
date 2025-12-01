// CommunitiesSidebar - Shows list of user's communities with creation button
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getUserCommunities } from '@/firebase/communitiesService';
import type { Community } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { CreateCommunityModal } from './CreateCommunityModal';
import { Plus } from 'lucide-react';

export function CommunitiesSidebar() {
  const { authUser } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!authUser?.uid) {
      setCommunities([]);
      setLoading(false);
      return;
    }

    const unsubscribe = getUserCommunities(authUser.uid, (communities) => {
      setCommunities(communities);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser?.uid]);

  if (!authUser) {
    return null;
  }

  return (
    <aside className="w-64 border-r flex flex-col bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Communities</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setCreateModalOpen(true)}
          className="rounded-full"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No communities yet</p>
            <Button
              variant="link"
              onClick={() => setCreateModalOpen(true)}
              className="mt-2"
            >
              Create one
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {communities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${community.id}`}
                className="block p-3 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  {community.avatar ? (
                    <img
                      src={community.avatar}
                      alt={community.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-lg font-semibold">
                        {community.name[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{community.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {community.members.length} members
                    </p>
                  </div>
                  {community.lastMessageAt && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(community.lastMessageAt.toDate(), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>

      <CreateCommunityModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </aside>
  );
}
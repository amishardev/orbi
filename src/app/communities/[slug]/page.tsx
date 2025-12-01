'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/app-layout';
import { CommunityChat } from '@/components/communities/CommunityChat';
import { CommunitiesList } from '@/components/communities/CommunitiesList';
import { getUserCommunities } from '@/firebase/communitiesService';
import type { Community } from '@/lib/types';

export default function CommunityPage() {
  const params = useParams();
  const { authUser } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Find the active community
  const activeCommunity = communities.find(c => c.id === params.slug);

  return (
    <AppLayout>
      <div className="flex min-h-screen">
        {/* Communities Sidebar */}
        <div className="w-80 border-r flex-shrink-0">
          <CommunitiesList
            communities={communities}
            loading={loading}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1">
          {!authUser ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-muted-foreground">
                Sign in to view and join communities
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-muted-foreground">
                Loading community...
              </p>
            </div>
          ) : !activeCommunity ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-muted-foreground">
                {communities.length > 0
                  ? 'Select a community to start chatting'
                  : 'Join or create a community to start chatting'}
              </p>
            </div>
          ) : (
            <CommunityChat community={activeCommunity} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

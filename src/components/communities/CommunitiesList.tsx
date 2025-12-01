'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { Community } from '@/lib/types';

interface CommunitiesListProps {
  communities: Community[];
  loading?: boolean;
}

export function CommunitiesList({ communities = [], loading = false }: CommunitiesListProps) {
  const { slug } = useParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { authUser } = useAuth();

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full"
          disabled={!authUser}
        >
          Create Community
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {communities.map((community) => (
            <Link
              key={community.id}
              href={`/communities/${community.id}`}
              className={`block p-2 rounded-lg hover:bg-accent ${slug === community.id ? 'bg-accent' : ''
                }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={community.iconUrl} alt={community.name} />
                  <AvatarFallback>{community.name[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{community.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {community.members.length} members
                    </div>
                    <div className="flex -space-x-1">
                      {community.members.slice(0, 3).map((memberId) => {
                        const member = community.memberDetails?.[memberId];
                        return (
                          <div key={memberId} className="w-4 h-4 rounded-full bg-primary/10 border border-background">
                            {member?.photoURL ? (
                              <img
                                src={member.photoURL}
                                alt={member.displayName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px]">
                                {member?.displayName?.[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {community.members.length > 3 && (
                        <div className="w-4 h-4 rounded-full bg-primary/10 border border-background flex items-center justify-center text-[8px]">
                          +{community.members.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {communities.length === 0 && !loading && (
            <div className="text-center p-4 text-muted-foreground">
              {authUser ? (
                <p>No communities yet. Create one to get started!</p>
              ) : (
                <p>Sign in to create and join communities</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateCommunityModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
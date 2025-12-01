'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, Settings, UserPlus, MoreVertical, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { addMember } from '@/firebase/communitiesService';
import type { Community, User } from '@/lib/types';

function AddMembersDialog({
  community,
  onClose,
  open
}: {
  community: Community;
  onClose: () => void;
  open: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // This would normally fetch from your users collection
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const handleAddMember = async (userId: string) => {
    setIsLoading(true);
    try {
      await addMember(community.id, userId);
      // Could show success toast here
    } catch (error) {
      console.error('Error adding member:', error);
      // Could show error toast here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
          <DialogDescription>
            Search and add new members to {community.name}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <ScrollArea className="mt-4 h-[300px]">
          <div className="space-y-4">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddMember(user.id)}
                  disabled={isLoading || community.members.includes(user.id)}
                >
                  {community.members.includes(user.id) ? 'Member' : 'Add'}
                </Button>
              </div>
            ))}

            {searchResults.length === 0 && searchTerm && (
              <p className="text-center text-muted-foreground">
                No users found matching "{searchTerm}"
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function CommunityHeader({ community }: { community: Community }) {
  const { authUser } = useAuth();
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const isAdmin = authUser?.uid === community.adminId;

  return (
    <div className="border-b p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/messages" className="md:hidden mr-2">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <Avatar>
            <AvatarImage src={community.iconUrl} alt={community.name} />
            <AvatarFallback>{community.name[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{community.name}</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{community.members.length} members</span>
              </div>
              <div className="flex -space-x-2">
                {community.members.slice(0, 4).map((memberId) => {
                  const member = community.memberDetails?.[memberId];
                  return (
                    <Avatar key={memberId} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={member?.photoURL} />
                      <AvatarFallback>{member?.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  );
                })}
                {community.members.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                    +{community.members.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingMembers(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Members
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2">
                <Users className="h-4 w-4" />
                View Members
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem className="gap-2 text-destructive">
                  <Settings className="h-4 w-4" />
                  Delete Community
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AddMembersDialog
        community={community}
        open={isAddingMembers}
        onClose={() => setIsAddingMembers(false)}
      />
    </div>
  );
}
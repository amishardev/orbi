// CreateCommunityModal - Dialog for creating a new community
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createCommunity } from '@/firebase/communitiesService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/lib/types';

interface FriendPickerProps {
  selectedFriends: string[];
  onSelectFriend: (friendId: string) => void;
  disabled?: boolean;
  friends: User[];
}

// Mock friend picker component - replace with your actual friends implementation
function FriendPicker({ selectedFriends, onSelectFriend, disabled, friends }: FriendPickerProps) {
  return (
    <ScrollArea className="h-[200px] pr-4">
      <div className="space-y-4">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => !disabled && onSelectFriend(friend.id)}
          >
            <Avatar>
              <AvatarImage src={friend.photoURL} alt={friend.displayName} />
              <AvatarFallback>{friend.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{friend.displayName}</p>
              <p className="text-sm text-muted-foreground">@{friend.username}</p>
            </div>
            <div className="w-5 h-5 rounded border flex items-center justify-center">
              {selectedFriends.includes(friend.id) && '✓'}
            </div>
          </div>
        ))}
        {friends.length === 0 && (
          <p className="text-center text-muted-foreground p-4">
            No friends to add. Start by connecting with other users!
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

interface CreateCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCommunityModal({ open, onOpenChange }: CreateCommunityModalProps) {
  const { authUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [friends] = useState<User[]>([]); // Replace with actual friends data

  const handleCreate = async () => {
    if (!authUser?.uid) return;
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Community name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const communityId = await createCommunity({
        name: name.trim(),
        adminId: authUser.uid,
        members: [...selectedMembers, authUser.uid],
        description: description.trim(),
        isPublic,
        iconUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${name.trim()}`,
        memberDetails: {
          [authUser.uid]: {
            displayName: authUser.displayName || '',
            photoURL: authUser.photoURL || null
          },
          ...selectedMembers.reduce((acc, memberId) => {
            const friend = friends.find(f => f.id === memberId);
            if (friend) {
              acc[memberId] = {
                displayName: friend.displayName || '',
                photoURL: friend.photoURL || null
              };
            }
            return acc;
          }, {} as Record<string, { displayName: string; photoURL?: string | null }>)
        }
      });

      toast({
        title: 'Success',
        description: 'Community created successfully',
      });

      // Reset form
      setName('');
      setDescription('');
      setIsPublic(false);
      setSelectedMembers([]);
      onOpenChange(false);

      // Optional: Navigate to new community
      // router.push(`/communities/${communityId}`);
    } catch (error) {
      console.error('Error creating community:', error);
      toast({
        title: 'Error',
        description: 'Failed to create community. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Community</DialogTitle>
          <DialogDescription>
            Create a new community to chat with friends and share updates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Community Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter community name"
              disabled={isCreating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this community about?"
              disabled={isCreating}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isCreating}
            />
            <Label htmlFor="public">Make community public</Label>
          </div>

          <div className="grid gap-2">
            <Label>Add Members</Label>
            <FriendPicker
              selectedFriends={selectedMembers}
              onSelectFriend={handleSelectMember}
              disabled={isCreating}
              friends={friends}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Community'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
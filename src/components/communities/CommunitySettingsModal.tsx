'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserSearchBox } from './UserSearchBox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Trash2, UserMinus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
}

interface Community {
  id: string;
  name: string;
  description?: string;
  iconUrl: string;
  adminId: string;
  members: string[];
  isPublic: boolean;
}

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
  onUpdate: (updates: Partial<Community>) => void;
}

export function CommunitySettingsModal({
  isOpen,
  onClose,
  community,
  onUpdate
}: CommunitySettingsModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // States for icon change
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState(community.iconUrl);
  const [uploading, setUploading] = useState(false);

  // States for member management
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  // Get Cloud Functions
  const functions = getFunctions();
  const getCloudinarySignature = httpsCallable<
    { timestamp: number; publicIdHint?: string },
    { signature: string; timestamp: number; apiKey: string; cloudName: string }
  >(functions, 'getCloudinarySignature');
  const changeCommunityIcon = httpsCallable(functions, 'changeCommunityIcon');
  const removeMemberFromCommunity = httpsCallable(functions, 'removeMemberFromCommunity');
  const addMemberToCommunity = httpsCallable(functions, 'addMemberToCommunity');

  // Load member details
  useEffect(() => {
    async function loadMembers() {
      try {
        // This would be replaced with your actual member fetching logic
        // const memberDetails = await Promise.all(
        //   community.members.map(uid => getUserDetails(uid))
        // );
        // setMembers(memberDetails);
      } catch (error) {
        console.error('Error loading members:', error);
        toast({
          title: 'Error',
          description: 'Failed to load community members',
          variant: 'destructive'
        });
      } finally {
        setLoadingMembers(false);
      }
    }

    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, community.members]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadIcon = async (): Promise<string> => {
    if (!iconFile) throw new Error('No icon selected');

    const timestamp = Math.round(new Date().getTime() / 1000);
    const response = await getCloudinarySignature({
      timestamp,
      publicIdHint: `communities/${community.id}/${timestamp}`
    });

    const { signature, apiKey, cloudName } = response.data;

    const formData = new FormData();
    formData.append('file', iconFile);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('folder', `communities/${community.id}`);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    const data = await uploadResponse.json();
    if (data.error) throw new Error(data.error.message);

    return data.secure_url;
  };

  const handleIconUpdate = async () => {
    if (!iconFile) return;

    try {
      setUploading(true);
      const iconUrl = await uploadIcon();
      
      await changeCommunityIcon({
        communityId: community.id,
        iconUrl
      });

      onUpdate({ iconUrl });
      toast({
        title: 'Success',
        description: 'Community icon updated'
      });
      
    } catch (error: any) {
      console.error('Error updating icon:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update community icon',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    try {
      setRemovingMember(uid);
      await removeMemberFromCommunity({
        communityId: community.id,
        uidToRemove: uid
      });

      setMembers(prev => prev.filter(m => m.uid !== uid));
      toast({
        title: 'Success',
        description: 'Member removed from community'
      });
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive'
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const handleAddMember = async (user: User) => {
    try {
      await addMemberToCommunity({
        communityId: community.id,
        uidToAdd: user.uid
      });

      setMembers(prev => [...prev, user]);
      toast({
        title: 'Success',
        description: 'Member added to community'
      });
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add member',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Community Settings</DialogTitle>
          <DialogDescription>
            Manage your community settings and members.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Icon Update */}
            <div className="space-y-2">
              <Label>Community Icon</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden">
                  <Image
                    src={iconPreview}
                    alt="Community icon"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Choose New Icon
                  </Button>
                  {iconFile && (
                    <Button
                      type="button"
                      onClick={handleIconUpdate}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Save Icon'
                      )}
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            {/* Add Members */}
            <div className="space-y-2">
              <Label>Add New Members</Label>
              <UserSearchBox
                selectedUsers={[]}
                onSelect={handleAddMember}
                onRemove={() => {}}
                excludeIds={members.map(m => m.uid)}
                placeholder="Search users to add..."
              />
            </div>

            {/* Member List */}
            <div className="space-y-2">
              <Label>Current Members ({members.length})</Label>
              <div className="space-y-2">
                {loadingMembers ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading members...
                    </p>
                  </div>
                ) : members.map(member => (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.photoURL} />
                        <AvatarFallback>
                          {member.displayName?.[0] || member.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.displayName || member.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                    {member.uid !== community.adminId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.uid)}
                        disabled={removingMember === member.uid}
                      >
                        {removingMember === member.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
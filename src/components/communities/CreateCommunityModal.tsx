'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { UserSearchBox } from './UserSearchBox';
import { useAuth } from '@/hooks/use-auth';
import { Camera, Loader2 } from 'lucide-react';

interface User {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
}

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
  const { authUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Cloud Function references
  const functions = getFunctions();
  const getCloudinarySignature = httpsCallable<
    { timestamp: number; publicIdHint?: string },
    { signature: string; timestamp: number; apiKey: string; cloudName: string }
  >(functions, 'getCloudinarySignature');
  const createCommunity = httpsCallable<
    { name: string; description?: string; iconUrl: string; members: string[]; isPublic: boolean },
    { communityId: string }
  >(functions, 'createCommunity');

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
      publicIdHint: `communities/${authUser?.uid}/${timestamp}`
    });

    const { signature, apiKey, cloudName } = response.data;

    const formData = new FormData();
    formData.append('file', iconFile);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('folder', 'communities');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Community name is required',
        variant: 'destructive'
      });
      return;
    }

    if (!iconFile && !iconPreview) {
      toast({
        title: 'Error',
        description: 'Community icon is required',
        variant: 'destructive'
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: 'Error',
        description: 'Add at least one member',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreating(true);
      
      // Upload icon if new file selected
      let iconUrl = iconPreview;
      if (iconFile) {
        setUploading(true);
        iconUrl = await uploadIcon();
        setUploading(false);
      }

      // Create community
      const members = [...selectedUsers.map(u => u.uid), authUser.uid];
      const result = await createCommunity({
        name: name.trim(),
        description: description.trim(),
        iconUrl,
        members,
        isPublic
      });

      toast({
        title: 'Success',
        description: 'Community created successfully'
      });

      // Redirect to new community
      router.push(`/communities/${result.data.communityId}`);
      onClose();

    } catch (error: any) {
      console.error('Error creating community:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create community',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Community</DialogTitle>
          <DialogDescription>
            Create a space for your group to chat and share.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Icon Upload */}
          <div className="space-y-2">
            <Label>Community Icon</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden">
                {iconPreview ? (
                  <Image
                    src={iconPreview}
                    alt="Community icon preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Choose Icon'
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Name & Description */}
          <div className="space-y-2">
            <Label htmlFor="name">Community Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Enter community name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="What's this community about?"
              rows={3}
            />
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Community</Label>
              <div className="text-sm text-muted-foreground">
                Anyone can find and join
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Member Search */}
          <div className="space-y-2">
            <Label>Add Members</Label>
            <UserSearchBox
              selectedUsers={selectedUsers}
              onSelect={(user) => setSelectedUsers(prev => [...prev, user])}
              onRemove={(uid) => setSelectedUsers(prev => prev.filter(u => u.uid !== uid))}
              excludeIds={[authUser?.uid || '']}
              placeholder="Search users to add..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || uploading}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Community'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}